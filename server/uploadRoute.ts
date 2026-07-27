// =============================================================================
// Rota REST de upload de anexo para S3.
//
// Por que REST (e não tRPC)?
//   - Permite upload multipart/form-data com UM arquivo por requisição, sem
//     reenviar os anexos já existentes (o que estourava o limite de payload e
//     fazia o funcionário perder os dados já preenchidos no 2º upload).
//   - Permite ao cliente capturar progresso real via XMLHttpRequest.upload.
//
// Fluxo:
//   1. Recebe multipart com: scope, supplierId, category + o arquivo.
//   2. Envia os bytes para o S3 via storagePut → { key, url }.
//   3. Anexa SOMENTE a referência (key/url/nome/tipo/tamanho) ao registro da
//      nota no próprio servidor (append, sem sobrescrever o resto).
//   4. Retorna o anexo criado em JSON.
// =============================================================================

import type { Express, Request, Response } from "express";
import Busboy from "busboy";
import { storagePut, storageGetSignedUrl, sanitizeKeySegment } from "./storage";
import { appendAttachmentToNote } from "./db";

const MAX_FILE_BYTES = 99 * 1024 * 1024; // 99 MB por arquivo

function nowDateBR(): string {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "arquivo";
}

export function registerUploadRoute(app: Express) {
  // ---------------------------------------------------------------------------
  // Stream de anexo na MESMA ORIGEM.
  //
  // Por que existe (e não usar direto /manus-storage)?
  //   - /manus-storage faz redirect 307 para a S3 (cross-origin). Isso funciona
  //     para <img>, mas o pdf.js precisa LER os bytes via fetch().arrayBuffer(),
  //     e a S3 não envia cabeçalhos CORS → o navegador bloqueia ("Failed to fetch").
  //   - Aqui o servidor busca a URL assinada, baixa os bytes e os repassa na
  //     mesma origem, sem redirect e sem CORS. Serve PDFs e qualquer binário.
  // ---------------------------------------------------------------------------
  app.get("/api/attachment-file", async (req: Request, res: Response) => {
    const key = typeof req.query.key === "string" ? req.query.key : "";
    if (!key) {
      res.status(400).send("Missing key");
      return;
    }
    // ?download=1 → força o navegador a salvar (Content-Disposition: attachment).
    const forceDownload = req.query.download === "1";
    const downloadName =
      typeof req.query.name === "string" ? sanitizeFilename(req.query.name) : "";
    try {
      const signedUrl = await storageGetSignedUrl(key);

      // Encaminha o cabeçalho Range (permite o navegador pedir só um pedaço do
      // PDF e começar a renderizar antes de baixar tudo).
      const range = req.headers.range;
      const upstream = await fetch(signedUrl, {
        headers: range ? { Range: range } : undefined,
      });
      if (!upstream.ok || !upstream.body) {
        res.status(502).send("Storage backend error");
        return;
      }

      const contentType =
        upstream.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader("Accept-Ranges", "bytes");
      const len = upstream.headers.get("content-length");
      if (len) res.setHeader("Content-Length", len);
      const cr = upstream.headers.get("content-range");
      if (cr) res.setHeader("Content-Range", cr);
      res.setHeader(
        "Content-Disposition",
        forceDownload
          ? `attachment${downloadName ? `; filename="${downloadName}"` : ""}`
          : "inline",
      );
      // 206 quando a S3 respondeu parcial (Range atendido).
      res.status(upstream.status === 206 ? 206 : 200);

      // STREAMING: encaminha os bytes assim que chegam, sem segurar o arquivo
      // inteiro em memória. Reduz drasticamente o tempo até o 1º byte.
      const reader = upstream.body.getReader();
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        if (!res.write(Buffer.from(value))) {
          await new Promise<void>((resolve) => res.once("drain", resolve));
        }
        return pump();
      };
      req.on("close", () => void reader.cancel().catch(() => {}));
      await pump();
    } catch (err) {
      console.error("[attachment-file] erro:", err);
      if (!res.headersSent) res.status(502).send("Storage proxy error");
      else res.end();
    }
  });

  app.post("/api/upload-attachment", (req: Request, res: Response) => {
    let busboy: ReturnType<typeof Busboy>;
    try {
      busboy = Busboy({
        headers: req.headers,
        limits: { files: 1, fileSize: MAX_FILE_BYTES },
      });
    } catch {
      res.status(400).json({ error: "Requisição multipart inválida" });
      return;
    }

    const fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let fileName = "arquivo";
    let mimeType = "application/octet-stream";
    let tooLarge = false;
    let handledError = false;

    const fail = (status: number, message: string) => {
      if (handledError) return;
      handledError = true;
      try {
        req.unpipe(busboy);
      } catch {
        /* noop */
      }
      res.status(status).json({ error: message });
    };

    busboy.on("field", (name, val) => {
      fields[name] = val;
    });

    busboy.on("file", (_name, stream, info) => {
      fileName = sanitizeFilename(info.filename || "arquivo");
      mimeType = info.mimeType || "application/octet-stream";
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      stream.on("limit", () => {
        tooLarge = true;
        // Drena o restante para encerrar o stream com segurança.
        stream.resume();
      });
      stream.on("close", () => {
        if (!tooLarge) fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("error", () => fail(400, "Falha ao processar o upload"));

    busboy.on("finish", async () => {
      if (handledError) return;
      if (tooLarge) {
        fail(413, "Arquivo maior que 99 MB. Compacte ou reduza antes de anexar.");
        return;
      }
      const { scope, supplierId, category, folder } = fields;
      if (!scope || !supplierId) {
        fail(400, "scope e supplierId são obrigatórios");
        return;
      }
      if (!fileBuffer || fileBuffer.length === 0) {
        fail(400, "Nenhum arquivo recebido");
        return;
      }

      try {
        const safeCategory = ["catalogos", "fotos", "cotacoes", "outros"].includes(
          category,
        )
          ? category
          : "outros";
        // Nome da pasta (opcional). Mantém livre, apenas apara espaços e limita
        // o tamanho para evitar abuso. Pasta vazia => anexo avulso.
        const safeFolder =
          typeof folder === "string" && folder.trim()
            ? folder.trim().slice(0, 120)
            : undefined;
        // IMPORTANTE: sanitiza scope/supplierId no CAMINHO do S3 (sem espaços/
        // acentos). Espaços na key faziam o objeto ser gravado com "+" e o
        // presign de leitura retornava 403 (fotos não abriam). O scope/supplierId
        // "de negócio" continuam intactos no banco; só o caminho físico muda.
        const safeScope = sanitizeKeySegment(scope);
        const safeSupplier = sanitizeKeySegment(supplierId);
        const relKey = `supplier-notes/${safeScope}/${safeSupplier}/${Date.now()}-${fileName}`;
        const { key, url } = await storagePut(relKey, fileBuffer, mimeType);

        const attachment = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: fileName,
          type: mimeType,
          size: fileBuffer.length,
          // Novo modelo: referência ao S3 (sem base64 no banco).
          fileKey: key,
          url,
          addedAt: nowDateBR(),
          category: safeCategory,
          ...(safeFolder ? { folder: safeFolder } : {}),
        };

        await appendAttachmentToNote(scope, supplierId, attachment, nowDateBR());

        res.status(200).json({ attachment });
      } catch (err) {
        console.error("[upload-attachment] erro:", err);
        fail(500, err instanceof Error ? err.message : "Erro ao salvar o anexo");
      }
    });

    req.pipe(busboy);
  });
}
