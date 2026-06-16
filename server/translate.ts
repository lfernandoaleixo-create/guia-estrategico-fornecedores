// =============================================================================
// translate — serviço de tradução de documentos (qualquer idioma estrangeiro
// → português do Brasil) via LLM, com OCR multimodal para imagens/páginas
// escaneadas.
//
// Usado pelo visualizador de documentos (planilhas / PDF / imagens):
//   - translateTexts(texts): traduz uma lista de strings preservando ordem.
//       Itens que já parecem português (ou sem letras) voltam inalterados.
//   - ocrTranslateImage({ imageUrl, mimeType }): faz OCR + tradução de uma
//       imagem (logo, catálogo escaneado, página de PDF rasterizada) e devolve
//       o texto extraído (original) + a tradução em PT.
//
// O retorno de translateTexts mantém EXATAMENTE o mesmo tamanho/ordem da
// entrada para o cliente fazer um map posicional direto.
// =============================================================================
import { invokeLLM } from "./_core/llm";

/** Detecta presença de caracteres chineses (Han) numa string. */
export function hasChinese(text: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text);
}

/** Detecta caracteres CJK + outros scripts não-latinos comuns no comércio. */
function hasNonLatinScript(text: string): boolean {
  // Han, Hiragana/Katakana, Hangul, Cirílico, Árabe, Tailandês, Hebraico.
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u0e00-\u0e7f\u0590-\u05ff]/.test(
    text,
  );
}

// Conjunto de "stopwords" exclusivas do português/idiomas latinos que NÃO
// aparecem em inglês — usadas para evitar retraduzir o que já está em PT.
const PT_HINTS =
  /\b(de|da|do|das|dos|para|com|sem|não|são|é|às|ção|ões|ário|você|preço|fornecedor|produto|modelo|cor|tamanho|peso|quantidade|unidade|caixa|frete|pagamento|entrega|observa)/i;

// Palavras/al­fabeto que indicam inglês (idioma estrangeiro a traduzir).
const EN_HINTS =
  /\b(the|and|with|without|price|model|name|color|size|weight|qty|quantity|unit|box|carton|series|new|switch|plug|timer|heater|pump|filter|light|product|supplier|payment|delivery|shipping|description|material|package|packing|min|order|sample)\b/i;

/**
 * Heurística: o texto precisa ser traduzido (para PT)?
 * - Vazio ou sem letras → não.
 * - Contém script não-latino (chinês, japonês, etc.) → sim.
 * - Contém palavras claramente em inglês E não parece português → sim.
 */
export function isTranslatable(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 2) return false;
  // Precisa ter pelo menos uma letra (evita "RS-01A", "12.5", "$4.13").
  if (!/[a-zA-Z\u00c0-\u024f\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(t)) return false;

  if (hasNonLatinScript(t)) return true;

  // Caminho latino: traduzir inglês, mas preservar português.
  const looksPt = PT_HINTS.test(t);
  if (looksPt) return false;
  const looksEn = EN_HINTS.test(t);
  if (looksEn) return true;

  // Texto latino curto sem pistas (ex.: "Enclosures", "Resin series"): se tem
  // ao menos uma palavra com 3+ letras e não parece PT, tentamos traduzir.
  const words = t.match(/[a-zA-Z]{3,}/g) ?? [];
  return words.length > 0 && !looksPt;
}

// Cache simples em memória: textoOriginal -> português. Vive enquanto o processo
// estiver de pé; suficiente para acelerar reaberturas do mesmo documento.
const cache = new Map<string, string>();
const MAX_CACHE = 8000;

function cacheGet(key: string): string | undefined {
  return cache.get(key);
}
function cacheSet(key: string, value: string): void {
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
}

/**
 * Traduz uma lista de textos para português. Retorna um array do MESMO tamanho,
 * na MESMA ordem. Itens não-traduzíveis (vazios / já em PT / só números) são
 * devolvidos sem alteração.
 */
export async function translateTexts(texts: string[]): Promise<string[]> {
  const result = [...texts];

  const toTranslate: string[] = [];
  const seen = new Set<string>();
  for (const t of texts) {
    if (!isTranslatable(t)) continue;
    if (cacheGet(t) !== undefined) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    toTranslate.push(t);
  }

  if (toTranslate.length > 0) {
    const CHUNK = 80;
    for (let i = 0; i < toTranslate.length; i += CHUNK) {
      const chunk = toTranslate.slice(i, i + CHUNK);
      const translated = await translateChunk(chunk);
      chunk.forEach((src, idx) => {
        const pt = translated[idx];
        if (typeof pt === "string" && pt.length > 0) {
          cacheSet(src, pt);
        }
      });
    }
  }

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    if (isTranslatable(t)) {
      const pt = cacheGet(t);
      if (pt !== undefined) result[i] = pt;
    }
  }
  return result;
}

/** Traduz um bloco de textos chamando o LLM com saída JSON estruturada. */
async function translateChunk(chunk: string[]): Promise<string[]> {
  const payload = chunk.map((text, index) => ({ index, text }));

  const completion = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Você é um tradutor profissional especializado em comércio exterior (China/Ásia–Brasil). " +
          "Traduza para o português do Brasil cada item recebido, qualquer que seja o idioma de origem " +
          "(chinês, inglês, etc.). Regras: " +
          "mantenha números, códigos de modelo (ex.: RS-01A, NR-18, R-600), unidades, medidas, preços e moedas EXATAMENTE como estão; " +
          "se um item já estiver em português, devolva-o sem alterações; " +
          "use termos técnicos de importação/produtos pet/utensílios quando aplicável; " +
          "seja conciso (são rótulos de planilha/catálogo, não frases longas); " +
          "preserve o índice de cada item. Responda SOMENTE com o JSON pedido.",
      },
      {
        role: "user",
        content: JSON.stringify({ items: payload }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "translations",
        strict: true,
        schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer" },
                  pt: { type: "string", description: "Tradução em português do Brasil" },
                },
                required: ["index", "pt"],
                additionalProperties: false,
              },
            },
          },
          required: ["items"],
          additionalProperties: false,
        },
      },
    },
  });

  const out = new Array<string>(chunk.length).fill("");
  try {
    const raw = completion?.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw : "";
    const parsed = JSON.parse(text) as { items?: Array<{ index: number; pt: string }> };
    if (parsed?.items) {
      for (const it of parsed.items) {
        if (typeof it.index === "number" && it.index >= 0 && it.index < chunk.length) {
          out[it.index] = it.pt ?? "";
        }
      }
    }
  } catch {
    return chunk;
  }
  return out.map((v, i) => (v && v.length > 0 ? v : chunk[i]));
}

// =============================================================================
// OCR + tradução de imagem (multimodal)
// =============================================================================

export type OcrTranslateResult = {
  /** Texto extraído da imagem, no idioma original (linhas separadas por \n). */
  original: string;
  /** Tradução do texto para o português do Brasil. */
  pt: string;
  /** true se a imagem aparenta não conter texto algum. */
  empty: boolean;
};

// Cache de OCR por chave (geralmente a URL/stream da imagem).
const ocrCache = new Map<string, OcrTranslateResult>();

/**
 * Faz OCR de uma imagem e traduz o conteúdo para PT em uma única chamada
 * multimodal. Aceita uma URL pública/assinada OU um data URL (base64).
 */
export async function ocrTranslateImage(params: {
  imageUrl: string;
  cacheKey?: string;
}): Promise<OcrTranslateResult> {
  const key = params.cacheKey ?? params.imageUrl;
  const cached = ocrCache.get(key);
  if (cached) return cached;

  const completion = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Você é um sistema de OCR + tradução para comércio exterior. Receberá UMA imagem " +
          "(logo, catálogo, página escaneada, tabela). Tarefas: (1) extraia TODO o texto legível " +
          "preservando a ordem de leitura e quebras de linha; (2) traduza esse texto para o português " +
          "do Brasil, mantendo números, códigos, unidades e nomes próprios/marcas. " +
          "Se a imagem não tiver texto legível, marque empty=true e devolva strings vazias. " +
          "Responda SOMENTE com o JSON pedido.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extraia e traduza o texto desta imagem." },
          { type: "image_url", image_url: { url: params.imageUrl, detail: "high" } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ocr_translation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            empty: { type: "boolean", description: "true se não houver texto legível" },
            original: { type: "string", description: "Texto extraído no idioma original" },
            pt: { type: "string", description: "Tradução do texto para português do Brasil" },
          },
          required: ["empty", "original", "pt"],
          additionalProperties: false,
        },
      },
    },
  });

  let res: OcrTranslateResult = { original: "", pt: "", empty: true };
  try {
    const raw = completion?.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw : "";
    const parsed = JSON.parse(text) as Partial<OcrTranslateResult>;
    res = {
      original: typeof parsed.original === "string" ? parsed.original : "",
      pt: typeof parsed.pt === "string" ? parsed.pt : "",
      empty: parsed.empty === true || (!parsed.original && !parsed.pt),
    };
  } catch {
    res = { original: "", pt: "", empty: true };
  }

  ocrCache.set(key, res);
  return res;
}
