import { describe, expect, it } from "vitest";

/**
 * Regressão da feature de tradução de documentos (AttachmentLightbox):
 *
 * REGRA ATUAL (decisão do Fernando): traduzir PDF é lento e desconfigura o
 * documento; então a tradução automática (toggle Original/PT) fica disponível
 * APENAS para Word (.docx) e planilhas (Excel/CSV/ODS) — formatos em que
 * conseguimos reescrever o conteúdo preservando o layout. PDF e imagem
 * continuam VISÍVEIS no visualizador, porém SEM toggle e com download simples.
 *
 * Formato do download traduzido:
 *   - planilha → .xlsx
 *   - Word     → .docx (preservando formatação via JSZip/document.xml)
 *
 * Estes testes replicam de forma pura os classificadores de tipo do cliente
 * (client/src/shared/supplier-notes/attachmentViewer.tsx) e as regras de
 * negócio acima, para evitar regressões silenciosas.
 */

type Att = { name: string; type?: string };

function isImageAtt(att: Att): boolean {
  return (att.type ?? "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(att.name);
}
function isVideoAtt(att: Att): boolean {
  return (att.type ?? "").startsWith("video/") || /\.(mp4|webm|mov|m4v|ogg)$/i.test(att.name);
}
function isPdfAtt(att: Att): boolean {
  return att.type === "application/pdf" || att.name.toLowerCase().endsWith(".pdf");
}
function isSheetAtt(att: Att): boolean {
  return (
    (att.type ?? "").includes("spreadsheet") ||
    (att.type ?? "").includes("excel") ||
    !!att.name.toLowerCase().match(/\.(xlsx?|csv|ods)$/)
  );
}
function isWordAtt(att: Att): boolean {
  return (
    att.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    att.name.toLowerCase().endsWith(".docx")
  );
}

// Regra de negócio: o toggle de tradução aparece SÓ para Word e planilha.
function showsTranslateToggle(att: Att): boolean {
  return isSheetAtt(att) || isWordAtt(att);
}

// Regra de negócio: o anexo ainda pode ser PRÉ-VISUALIZADO (mesmo sem tradução).
function canPreview(att: Att): boolean {
  return isImageAtt(att) || isVideoAtt(att) || isPdfAtt(att) || isSheetAtt(att) || isWordAtt(att);
}

// Regra de negócio: extensão do arquivo traduzido para download.
function translatedDownloadFormat(att: Att): ".xlsx" | ".docx" | null {
  if (isSheetAtt(att)) return ".xlsx";
  if (isWordAtt(att)) return ".docx";
  return null;
}

describe("toggle de tradução por tipo de anexo (apenas Word/Excel)", () => {
  it("aparece para planilhas (.xlsx/.csv/.ods e mimetypes)", () => {
    expect(showsTranslateToggle({ name: "NOMOYPET_price_list.xlsx" })).toBe(true);
    expect(showsTranslateToggle({ name: "cotacao.csv" })).toBe(true);
    expect(
      showsTranslateToggle({ name: "x", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    ).toBe(true);
  });

  it("aparece para documentos Word (.docx e mimetype)", () => {
    expect(showsTranslateToggle({ name: "contrato.docx" })).toBe(true);
    expect(
      showsTranslateToggle({
        name: "x",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ).toBe(true);
  });

  it("NÃO aparece para PDFs (apenas visualização, sem tradução)", () => {
    expect(showsTranslateToggle({ name: "2025 Quotation of Mclanzoo.pdf" })).toBe(false);
    expect(showsTranslateToggle({ name: "x", type: "application/pdf" })).toBe(false);
  });

  it("NÃO aparece para imagens (apenas visualização, sem tradução)", () => {
    expect(showsTranslateToggle({ name: "Cota_o.jpg" })).toBe(false);
    expect(showsTranslateToggle({ name: "foto.png" })).toBe(false);
    expect(showsTranslateToggle({ name: "x", type: "image/webp" })).toBe(false);
  });

  it("NÃO aparece para vídeos ou tipos não previsíveis", () => {
    expect(showsTranslateToggle({ name: "demo.mp4" })).toBe(false);
    expect(showsTranslateToggle({ name: "contrato.zip" })).toBe(false);
    expect(showsTranslateToggle({ name: "audio.m4a" })).toBe(false);
  });
});

describe("PDF e imagem continuam pré-visualizáveis (sem tradução)", () => {
  it("PDF/imagem podem ser visualizados mesmo sem toggle", () => {
    expect(canPreview({ name: "doc.pdf" })).toBe(true);
    expect(canPreview({ name: "foto.jpg" })).toBe(true);
    // mas sem toggle de tradução
    expect(showsTranslateToggle({ name: "doc.pdf" })).toBe(false);
    expect(showsTranslateToggle({ name: "foto.jpg" })).toBe(false);
  });

  it("Word também é pré-visualizável", () => {
    expect(canPreview({ name: "manual.docx" })).toBe(true);
  });
});

describe("formato do download traduzido por tipo", () => {
  it("planilha → .xlsx", () => {
    expect(translatedDownloadFormat({ name: "tabela.xlsx" })).toBe(".xlsx");
    expect(translatedDownloadFormat({ name: "lista.csv" })).toBe(".xlsx");
  });

  it("Word → .docx (preserva formatação)", () => {
    expect(translatedDownloadFormat({ name: "carta.docx" })).toBe(".docx");
  });

  it("PDF, imagem e outros → null (sem tradução)", () => {
    expect(translatedDownloadFormat({ name: "doc.pdf" })).toBeNull();
    expect(translatedDownloadFormat({ name: "foto.jpg" })).toBeNull();
    expect(translatedDownloadFormat({ name: "video.mp4" })).toBeNull();
    expect(translatedDownloadFormat({ name: "pacote.zip" })).toBeNull();
  });
});

describe("preservação de formatação no Word (.docx)", () => {
  // Espelha applyWordTranslation: só o conteúdo de <w:t> é reescrito; o restante
  // do XML (estilos, tabelas) permanece intacto.
  function applyWordTranslation(xml: string, lookup: (zh: string) => string | undefined): string {
    const decode = (s: string) =>
      s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
    const encode = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return xml.replace(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g, (_f, open: string, inner: string, close: string) => {
      const raw = decode(inner);
      const pt = lookup(raw);
      if (!pt || pt === raw) return `${open}${inner}${close}`;
      const openSp = /xml:space=/.test(open) ? open : open.replace(/>$/, ' xml:space="preserve">');
      return `${openSp}${encode(pt)}${close}`;
    });
  }

  it("substitui apenas o texto dos nós <w:t>, mantendo estilos e estrutura", () => {
    const xml =
      '<w:p><w:pPr><w:b/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>过滤器</w:t></w:r></w:p>' +
      '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>价格</w:t></w:r></w:p></w:tc></w:tr></w:tbl>';
    const dict: Record<string, string> = { "过滤器": "Filtro", "价格": "Preço" };
    const out = applyWordTranslation(xml, (zh) => dict[zh]);
    expect(out).toContain("Filtro");
    expect(out).toContain("Preço");
    // Estilos e estrutura permanecem intactos.
    expect(out).toContain("<w:b/>");
    expect(out).toContain("<w:tbl>");
    expect(out).toContain("<w:tc>");
    // O texto chinês original foi substituído.
    expect(out).not.toContain("过滤器");
    expect(out).not.toContain("价格");
  });

  it("não altera nós sem tradução conhecida", () => {
    const xml = "<w:r><w:t>Texto já em PT</w:t></w:r>";
    const out = applyWordTranslation(xml, () => undefined);
    expect(out).toBe(xml);
  });
});
