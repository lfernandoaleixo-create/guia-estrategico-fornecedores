// Preconfigured storage helpers for Manus WebDev templates
// Uploads via Forge Server presigned URL to S3 (PUT direct).
// Downloads return /manus-storage/{key} paths served via 307 redirect.

import { ENV } from "./_core/env";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Sanitiza um SEGMENTO de caminho (scope/supplierId/pasta) para uso seguro como
 * key do S3: remove acentos, troca espaços por "-" e descarta caracteres que
 * historicamente quebraram a assinatura do presign (espaços viravam "+" no
 * objeto gravado, gerando 403 na leitura). Preserva ASCII alfanumérico, ".",
 * "_" e "-". Nunca retorna vazio.
 */
export function sanitizeKeySegment(seg: string): string {
  const noAccents = seg
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const cleaned = noAccents
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100);
  return cleaned || "x";
}

/**
 * Gera variantes de uma key para tentativa de LEITURA de anexos legados. Alguns
 * objetos antigos foram gravados com o espaço codificado como "+" no S3 (o
 * presign do espaço literal devolve 403). Tentamos, em ordem: a key original e
 * a variante com espaço->"+".
 */
function keyReadVariants(key: string): string[] {
  const variants = [key];
  if (key.includes(" ")) variants.push(key.replace(/ /g, "+"));
  return variants;
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

/** Faz o presign/get de UMA key e retorna a URL assinada (ou lança). */
async function presignGetOne(forgeUrl: string, forgeKey: string, key: string): Promise<string> {
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = (await resp.json()) as { url: string };
  if (!url) throw new Error("Forge returned empty signed URL");
  return url;
}

/**
 * Retorna uma URL assinada de LEITURA que aponta para um objeto REALMENTE
 * acessível. Como o presign devolve 200 mesmo para keys inexistentes, validamos
 * o objeto com um GET leve (Range: bytes=0-0). Tenta as variantes de key
 * (original e espaço->"+") para recuperar anexos legados gravados com "+".
 */
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);
  const variants = keyReadVariants(key);

  let lastErr: unknown = null;
  let firstSignedUrl: string | null = null;

  for (const variant of variants) {
    try {
      const signed = await presignGetOne(forgeUrl, forgeKey, variant);
      if (firstSignedUrl === null) firstSignedUrl = signed;
      // Quando há mais de uma variante, confirmamos qual objeto existe de fato.
      if (variants.length === 1) return signed;
      const probe = await fetch(signed, { headers: { Range: "bytes=0-0" } });
      if (probe.ok || probe.status === 206) return signed;
    } catch (err) {
      lastErr = err;
    }
  }

  // Nenhuma variante confirmada acessível: retorna a 1ª URL assinada (melhor
  // esforço) ou propaga o erro de presign.
  if (firstSignedUrl) return firstSignedUrl;
  throw lastErr instanceof Error ? lastErr : new Error("Storage signed URL failed");
}
