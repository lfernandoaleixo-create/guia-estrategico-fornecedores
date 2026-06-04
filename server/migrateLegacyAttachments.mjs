// =============================================================================
// migrateLegacyAttachments.mjs
// -----------------------------------------------------------------------------
// Migração ÚNICA: percorre todas as linhas de supplier_notes e, para qualquer
// anexo legado em base64 (dataUrl) em `attachments` ou `quoteRows`, faz upload
// ao S3 e substitui pela referência { url, fileKey }. Depois reescreve a linha
// SEM base64. Assim, registros antigos param de estourar o INSERT ao salvar.
//
// Uso: carregado via tsx para reaproveitar o ENV/sanitizador do projeto.
//   pnpm exec tsx server/migrateLegacyAttachments.mjs
// =============================================================================

import "dotenv/config";
import mysql from "mysql2/promise";
import { sanitizeAttachmentsJson, sanitizeQuoteRows } from "./sanitizeNote.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL ausente. Abortando.");
  process.exit(1);
}

const conn = await mysql.createConnection(url);
console.log("[migração] Conectado ao banco. Lendo supplier_notes…");

const [rows] = await conn.execute("SELECT * FROM supplier_notes");
console.log(`[migração] ${rows.length} registro(s) encontrado(s).`);

let changed = 0;
for (const row of rows) {
  const scope = row.scope;
  const supplierId = row.supplierId;

  const beforeAtt = typeof row.attachments === "string" ? row.attachments : JSON.stringify(row.attachments ?? []);
  const hadBase64Att = beforeAtt.includes("base64,");

  const quoteRaw = row.quoteRows;
  const quoteParsed =
    typeof quoteRaw === "string" ? safeParse(quoteRaw) : quoteRaw ?? null;
  const quoteStr = JSON.stringify(quoteParsed ?? null);
  const hadBase64Quote = quoteStr.includes("base64,");

  if (!hadBase64Att && !hadBase64Quote) continue;

  console.log(`[migração] Saneando ${scope} / ${supplierId} …`);

  const safeAttachments = await sanitizeAttachmentsJson(scope, supplierId, beforeAtt);
  const safeQuotes = await sanitizeQuoteRows(scope, supplierId, quoteParsed);

  // Rastreabilidade: registra as chaves S3 geradas (para auditoria/recuperação).
  try {
    const parsedSafe = JSON.parse(safeAttachments);
    for (const a of Array.isArray(parsedSafe) ? parsedSafe : []) {
      if (a && a.fileKey) console.log(`[migração]   anexo "${a.name}" -> ${a.fileKey}`);
    }
  } catch {}

  await conn.execute(
    "UPDATE supplier_notes SET attachments = ?, quoteRows = ?, updatedAt = ? WHERE scope = ? AND supplierId = ?",
    [
      safeAttachments,
      safeQuotes == null ? null : JSON.stringify(safeQuotes),
      new Date().toISOString(),
      scope,
      supplierId,
    ],
  );
  changed += 1;
}

console.log(`[migração] Concluído. ${changed} registro(s) saneado(s).`);
await conn.end();
process.exit(0);

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
