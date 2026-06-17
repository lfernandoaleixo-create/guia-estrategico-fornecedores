// =============================================================================
// docxTranslate.ts — núcleo PURO da tradução de Word (.docx) preservando layout.
//
// Um .docx é um ZIP cujo texto vive em `word/document.xml` (e em headers/footers)
// dentro de nós <w:t>...</w:t> (cada "run" de texto). Para traduzir SEM mexer na
// formatação, reescrevemos apenas o conteúdo desses nós, mantendo todo o resto do
// XML intacto (estilos, tabelas, imagens, numeração, etc.).
//
// Estas funções são puras (string → string) e por isso testáveis fora do browser.
// O attachmentViewer apenas as combina com JSZip + o tradutor (cache CN/EN→PT).
// =============================================================================

import { isTranslatableText } from "./translatableText";

/** Decodifica as 5 entidades XML básicas para obter o texto "humano". */
export function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Reaplica o escape mínimo necessário para inserir texto em um nó XML. */
export function encodeXmlEntities(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Extrai os trechos de texto de cada nó <w:t> de um document.xml do Word.
 * Útil tanto para detecção de idioma quanto para alimentar o tradutor em lote.
 */
export function collectWordRunTexts(documentXml: string): string[] {
  const texts: string[] = [];
  const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(documentXml)) !== null) {
    texts.push(decodeXmlEntities(m[1]));
  }
  return texts;
}

/**
 * Reescreve cada <w:t> usando o `lookup` (zh/en → pt). Preserva atributos do nó
 * (ex.: xml:space="preserve") e adiciona esse atributo quando ausente, para que
 * espaços ao redor da tradução não sejam colapsados pelo Word.
 *
 * Tudo o que não for texto de run (tags, estilos, tabelas, imagens) permanece
 * byte-a-byte como no original.
 */
export function applyWordTranslation(
  documentXml: string,
  lookup: (text: string) => string | undefined,
): string {
  return documentXml.replace(
    /(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g,
    (_full, open: string, inner: string, close: string) => {
      const raw = decodeXmlEntities(inner);
      if (!isTranslatableText(raw)) return `${open}${inner}${close}`;
      const pt = lookup(raw) ?? lookup(raw.trim());
      if (!pt || pt === raw) return `${open}${inner}${close}`;
      const openWithSpace = /xml:space=/.test(open)
        ? open
        : open.replace(/>$/, ' xml:space="preserve">');
      return `${openWithSpace}${encodeXmlEntities(pt)}${close}`;
    },
  );
}
