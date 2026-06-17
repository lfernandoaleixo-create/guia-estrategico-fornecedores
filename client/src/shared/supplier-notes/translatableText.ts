// =============================================================================
// translatableText.ts — heurística PURA para decidir se um texto deve ser
// traduzido para PT (espelha server/translate.ts:isTranslatable).
//
// Extraído do attachmentViewer para poder ser reutilizado pelo núcleo de
// tradução de Word (docxTranslate.ts) e testado fora do ambiente do browser.
// =============================================================================

/** Detecta caracteres chineses (Han) numa string. */
export function hasChinese(text: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text);
}

/** Detecta scripts não-latinos (CJK, cirílico, árabe, hebraico, tailandês). */
export function hasNonLatinScript(text: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u0e00-\u0e7f\u0590-\u05ff]/.test(
    text,
  );
}

const PT_HINTS_RE =
  /\b(de|da|do|das|dos|para|com|sem|n\u00e3o|s\u00e3o|\u00e9|\u00e0s|c\u00e3o|\u00f5es|\u00e1rio|voc\u00ea|pre\u00e7o|fornecedor|produto|modelo|cor|tamanho|peso|quantidade|unidade|caixa|frete|pagamento|entrega|observa)/i;
const EN_HINTS_RE =
  /\b(the|and|with|without|price|model|name|color|size|weight|qty|quantity|unit|box|carton|series|new|switch|plug|timer|heater|pump|filter|light|product|supplier|payment|delivery|shipping|description|material|package|packing|min|order|sample)\b/i;

/**
 * Decide se um texto precisa ser traduzido para PT. Cobre chinês/CJK e inglês,
 * e preserva o que já está em português.
 */
export function isTranslatableText(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 2) return false;
  if (!/[a-zA-Z\u00c0-\u024f\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(t)) return false;
  if (hasNonLatinScript(t)) return true;
  if (PT_HINTS_RE.test(t)) return false;
  if (EN_HINTS_RE.test(t)) return true;
  const words = t.match(/[a-zA-Z]{3,}/g) ?? [];
  return words.length > 0;
}
