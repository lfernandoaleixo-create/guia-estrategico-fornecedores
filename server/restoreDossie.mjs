// Restaura o anexo "Dossie_Fornecedor_99GoldData_Vietna.pdf" no registro correto.
// Envia o PDF ao S3 (presign PUT) e adiciona a referência { url, fileKey } ao
// campo attachments do supplier_notes, sem tocar nos demais dados.
import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";
import mysql from "mysql2/promise";

const SCOPE = "grupo-cgrp_mpy6ul29_2z9r2c";
const SUPPLIER_ID = "extra_mpy78fo0_rb0tz1";
const FILE = "/home/ubuntu/upload/Dossie_Fornecedor_99GoldData_Vietna.pdf";
const NAME = "Dossie_Fornecedor_99GoldData_Vietna.pdf";
const MIME = "application/pdf";

const forgeUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
if (!forgeUrl || !forgeKey) {
  console.error("Faltam BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY");
  process.exit(1);
}

function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

async function storagePut(relKey, buffer, contentType) {
  const key = appendHashSuffix(relKey.replace(/^\/+/, ""));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!presignResp.ok) throw new Error(`presign failed ${presignResp.status}`);
  const { url: s3Url } = await presignResp.json();
  const up = await fetch(s3Url, { method: "PUT", headers: { "Content-Type": contentType }, body: new Blob([buffer], { type: contentType }) });
  if (!up.ok) throw new Error(`upload failed ${up.status}`);
  return { key, url: `/manus-storage/${key}` };
}

const buffer = fs.readFileSync(FILE);
console.log(`Lendo ${FILE} (${buffer.length} bytes)…`);

const relKey = `notes/${SCOPE}/${SUPPLIER_ID}/${NAME}`;
const { key, url } = await storagePut(relKey, buffer, MIME);
console.log(`Enviado ao S3 -> key=${key}`);
console.log(`URL=${url}`);

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT attachments FROM supplier_notes WHERE scope = ? AND supplierId = ?",
  [SCOPE, SUPPLIER_ID],
);

if (rows.length === 0) {
  console.error("Registro não encontrado — não havia nota para este fornecedor.");
  await conn.end();
  process.exit(2);
}

let current = rows[0].attachments;
if (typeof current === "string") {
  try { current = JSON.parse(current); } catch { current = []; }
}
if (!Array.isArray(current)) current = [];

// Evita duplicar se já existir
const exists = current.some((a) => a && a.name === NAME && a.fileKey);
if (exists) {
  console.log("Anexo já presente — nada a fazer.");
  await conn.end();
  process.exit(0);
}

const now = new Date();
const dd = String(now.getDate()).padStart(2, "0");
const mm = String(now.getMonth() + 1).padStart(2, "0");
const yyyy = now.getFullYear();
const attachment = {
  id: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
  name: NAME,
  type: MIME,
  size: buffer.length,
  url,
  fileKey: key,
  addedAt: `${dd}/${mm}/${yyyy}`,
  category: "outros",
};

current.push(attachment);

await conn.execute(
  "UPDATE supplier_notes SET attachments = ?, updatedAt = ? WHERE scope = ? AND supplierId = ?",
  [JSON.stringify(current), Date.now(), SCOPE, SUPPLIER_ID],
);

console.log(`Reanexado com sucesso. Total de anexos agora: ${current.length}`);
await conn.end();
