import { describe, expect, it } from "vitest";

/**
 * Regressão da feature de tradução de documentos (AttachmentLightbox):
 *
 * 1) O toggle Original/PT deve aparecer SEMPRE para imagens, PDFs e planilhas
 *    (não depende de detecção frágil de idioma). Vídeos e tipos não previsíveis
 *    não mostram o toggle.
 * 2) O formato do download traduzido depende do tipo:
 *    - planilha  → .xlsx
 *    - PDF/imagem → .txt
 *
 * Estes testes replicam de forma pura os classificadores de tipo do cliente
 * (client/src/shared/supplier-notes/attachmentViewer.tsx) e as duas regras de
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

// Regra de negócio: o toggle de tradução aparece para imagem/pdf/planilha.
function showsTranslateToggle(att: Att): boolean {
  return isImageAtt(att) || isPdfAtt(att) || isSheetAtt(att);
}

// Regra de negócio: extensão do arquivo traduzido para download.
function translatedDownloadFormat(att: Att): ".xlsx" | ".txt" | null {
  if (isSheetAtt(att)) return ".xlsx";
  if (isPdfAtt(att) || isImageAtt(att)) return ".txt";
  return null;
}

describe("toggle de tradução por tipo de anexo", () => {
  it("aparece para planilhas (.xlsx/.csv/.ods e mimetypes)", () => {
    expect(showsTranslateToggle({ name: "NOMOYPET_price_list.xlsx" })).toBe(true);
    expect(showsTranslateToggle({ name: "cotacao.csv" })).toBe(true);
    expect(showsTranslateToggle({ name: "x", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })).toBe(true);
  });

  it("aparece para PDFs", () => {
    expect(showsTranslateToggle({ name: "2025 Quotation of Mclanzoo.pdf" })).toBe(true);
    expect(showsTranslateToggle({ name: "x", type: "application/pdf" })).toBe(true);
  });

  it("aparece para imagens", () => {
    expect(showsTranslateToggle({ name: "Cota_o.jpg" })).toBe(true);
    expect(showsTranslateToggle({ name: "foto.png" })).toBe(true);
    expect(showsTranslateToggle({ name: "x", type: "image/webp" })).toBe(true);
  });

  it("NÃO aparece para vídeos ou tipos não previsíveis", () => {
    expect(showsTranslateToggle({ name: "demo.mp4" })).toBe(false);
    expect(showsTranslateToggle({ name: "contrato.zip" })).toBe(false);
    expect(showsTranslateToggle({ name: "audio.m4a" })).toBe(false);
  });
});

describe("formato do download traduzido por tipo", () => {
  it("planilha → .xlsx", () => {
    expect(translatedDownloadFormat({ name: "tabela.xlsx" })).toBe(".xlsx");
    expect(translatedDownloadFormat({ name: "lista.csv" })).toBe(".xlsx");
  });

  it("PDF e imagem → .txt", () => {
    expect(translatedDownloadFormat({ name: "doc.pdf" })).toBe(".txt");
    expect(translatedDownloadFormat({ name: "foto.jpg" })).toBe(".txt");
  });

  it("tipos sem tradução → null", () => {
    expect(translatedDownloadFormat({ name: "video.mp4" })).toBeNull();
    expect(translatedDownloadFormat({ name: "pacote.zip" })).toBeNull();
  });
});
