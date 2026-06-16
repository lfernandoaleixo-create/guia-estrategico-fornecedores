// =============================================================================
// translate — tradução em lote de textos (foco chinês → português) via LLM.
//
// Usado pelo visualizador de documentos (planilhas/PDF) para alternar o idioma
// das células/textos. A estratégia:
//   - recebe uma lista de strings (deduplicadas pelo cliente quando possível)
//   - filtra apenas as que contêm caracteres CJK (Han) — o resto retorna igual
//   - consulta um cache em memória (processo) para evitar reprocessar
//   - chama o LLM uma vez com saída JSON estruturada preservando a ordem
//
// Importante: o retorno mantém EXATAMENTE o mesmo tamanho/ordem da entrada,
// para o cliente fazer um map posicional direto.
// =============================================================================
import { invokeLLM } from "./_core/llm";

/** Detecta presença de caracteres chineses (Han) numa string. */
export function hasChinese(text: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text);
}

// Cache simples em memória: chineseText -> portuguese. Vive enquanto o processo
// estiver de pé; suficiente para acelerar reaberturas do mesmo documento.
const cache = new Map<string, string>();
const MAX_CACHE = 5000;

function cacheGet(key: string): string | undefined {
  return cache.get(key);
}
function cacheSet(key: string, value: string): void {
  if (cache.size >= MAX_CACHE) {
    // descarta o item mais antigo (Map mantém ordem de inserção)
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
}

/**
 * Traduz uma lista de textos para português. Retorna um array do MESMO tamanho,
 * na MESMA ordem. Itens sem chinês (ou vazios) são devolvidos sem alteração.
 */
export async function translateTexts(texts: string[]): Promise<string[]> {
  // Resultado inicial = cópia da entrada (itens sem chinês ficam como estão).
  const result = [...texts];

  // Coleta os textos únicos que precisam de tradução e ainda não estão no cache.
  const toTranslate: string[] = [];
  const seen = new Set<string>();
  for (const t of texts) {
    if (!t || !hasChinese(t)) continue;
    if (cacheGet(t) !== undefined) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    toTranslate.push(t);
  }

  if (toTranslate.length > 0) {
    // Processa em blocos para não estourar o contexto do modelo.
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

  // Monta a saída final aplicando cache (posicional).
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    if (t && hasChinese(t)) {
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
          "Você é um tradutor especializado em comércio exterior China–Brasil. " +
          "Traduza do chinês para o português do Brasil cada item recebido. " +
          "Regras: mantenha números, códigos de modelo (ex.: RS-01A, R-600), unidades e medidas EXATAMENTE como estão; " +
          "traduza apenas o texto em chinês; use termos técnicos de importação/produtos pet quando aplicável; " +
          "seja conciso (rótulos de planilha, não frases longas); " +
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
    // Em caso de falha de parsing, devolve os originais (sem quebrar o fluxo).
    return chunk;
  }
  // Para qualquer item que o modelo não retornou, mantém o original.
  return out.map((v, i) => (v && v.length > 0 ? v : chunk[i]));
}
