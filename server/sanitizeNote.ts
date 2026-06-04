// =============================================================================
// sanitizeNote.ts
// -----------------------------------------------------------------------------
// Blindagem do upsert de supplier_notes: nenhum dado base64 (dataUrl) pode ser
// gravado nas colunas `attachments` / `quoteRows`. Em MySQL/TiDB, um anexo em
// base64 dentro do JSON estoura o tamanho do documento/coluna e faz o INSERT
// inteiro falhar — o que, no fluxo do usuário, apagava status/observações/campos.
//
// Aqui, antes de gravar, qualquer `dataUrl` (data:<mime>;base64,<conteúdo>) é
// enviado ao S3 (storagePut) e substituído por { url, fileKey }, mantendo o
// restante do anexo intacto. Funciona tanto para anexos novos quanto para
// registros legados que ainda carregam base64.
// =============================================================================

import { storagePut } from "./storage";

const DATA_URL_RE = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/;

function extFromMime(mime: string | undefined): string {
  if (!mime) return "bin";
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/csv": "csv",
  };
  return map[mime] ?? "bin";
}

function safeName(name: string | undefined): string {
  const base = (name ?? "arquivo").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  return base || "arquivo";
}

/**
 * Se o objeto for um anexo com dataUrl base64, sobe para o S3 e devolve uma
 * cópia com { url, fileKey } e sem dataUrl. Caso contrário, devolve como está.
 */
async function migrateAttachmentObject(
  scope: string,
  supplierId: string,
  obj: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // Já migrado (tem url e não tem dataUrl): nada a fazer.
  const dataUrl = obj.dataUrl;
  if (typeof dataUrl !== "string") return obj;

  const m = DATA_URL_RE.exec(dataUrl);
  if (!m) {
    // dataUrl inválido / não-base64: remove para não estourar o INSERT.
    const { dataUrl: _drop, ...rest } = obj;
    return rest;
  }

  const mime = (typeof obj.type === "string" && obj.type) || m[1] || "application/octet-stream";
  const isBase64 = !!m[2];
  const payload = m[3] ?? "";

  let buffer: Buffer;
  try {
    buffer = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf-8");
  } catch {
    const { dataUrl: _drop, ...rest } = obj;
    return rest;
  }

  const ext = extFromMime(mime);
  const nameBase = safeName(obj.name as string | undefined);
  const relKey = `notes/${scope}/${supplierId}/${nameBase}.${ext}`;

  const { key, url } = await storagePut(relKey, buffer, mime);

  // Remove o base64 e injeta a referência S3.
  const { dataUrl: _drop, ...rest } = obj;
  return {
    ...rest,
    url,
    fileKey: key,
    size: typeof obj.size === "number" ? obj.size : buffer.length,
    type: mime,
  };
}

async function migrateArrayOfAttachments(
  scope: string,
  supplierId: string,
  arr: unknown[],
): Promise<unknown[]> {
  const out: unknown[] = [];
  for (const item of arr) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      out.push(await migrateAttachmentObject(scope, supplierId, item as Record<string, unknown>));
    } else {
      out.push(item);
    }
  }
  return out;
}

/**
 * Sanitiza o campo `attachments` (string JSON) movendo base64 para o S3.
 * Retorna nova string JSON pronta para gravar.
 */
export async function sanitizeAttachmentsJson(
  scope: string,
  supplierId: string,
  attachmentsJson: string | null | undefined,
): Promise<string> {
  if (!attachmentsJson) return "[]";
  let parsed: unknown;
  try {
    parsed = JSON.parse(attachmentsJson);
  } catch {
    return "[]";
  }
  if (!Array.isArray(parsed)) return "[]";
  const migrated = await migrateArrayOfAttachments(scope, supplierId, parsed);
  return JSON.stringify(migrated);
}

/**
 * Sanitiza `quoteRows`, percorrendo recursivamente qualquer dataUrl embutido
 * (ex.: anexos de cotação serializados dentro das linhas). Mantém os campos de
 * texto da cotação intactos.
 */
export async function sanitizeQuoteRows(
  scope: string,
  supplierId: string,
  quoteRows: unknown,
): Promise<unknown> {
  if (quoteRows == null) return quoteRows;

  const walk = async (value: unknown): Promise<unknown> => {
    if (typeof value === "string") {
      // String solta contendo um dataUrl base64 grande: sobe ao S3 e troca pela URL.
      if (value.startsWith("data:") && value.length > 256) {
        const m = DATA_URL_RE.exec(value);
        if (m) {
          const mime = m[1] || "application/octet-stream";
          const isBase64 = !!m[2];
          try {
            const buffer = isBase64
              ? Buffer.from(m[3] ?? "", "base64")
              : Buffer.from(decodeURIComponent(m[3] ?? ""), "utf-8");
            const { url } = await storagePut(
              `notes/${scope}/${supplierId}/cotacao.${extFromMime(mime)}`,
              buffer,
              mime,
            );
            return url;
          } catch {
            return "";
          }
        }
      }
      return value;
    }
    if (Array.isArray(value)) {
      const out: unknown[] = [];
      for (const v of value) out.push(await walk(v));
      return out;
    }
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      // Objeto que parece um anexo (tem dataUrl): migra para S3.
      if (typeof obj.dataUrl === "string") {
        return await migrateAttachmentObject(scope, supplierId, obj);
      }
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) out[k] = await walk(v);
      return out;
    }
    return value;
  };

  return walk(quoteRows);
}
