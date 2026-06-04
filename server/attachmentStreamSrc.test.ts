import { describe, it, expect } from "vitest";

// Reimplementação isolada da lógica de attachmentStreamSrc (client) para teste
// de unidade. Mantém paridade com a função em SupplierNotesPanel.tsx.
//
// Por que testar: essa lógica é o que garante que o pdf.js leia os bytes na
// MESMA ORIGEM (via /api/attachment-file), evitando o bloqueio de CORS do
// redirect 307 do /manus-storage para a S3 — causa do "Não foi possível
// renderizar o PDF".
type Att = {
  url?: string;
  dataUrl?: string;
  fileKey?: string;
};

function attachmentStreamSrc(att: Att): string {
  if (att.fileKey) {
    return `/api/attachment-file?key=${encodeURIComponent(att.fileKey)}`;
  }
  if (att.url && att.url.startsWith("/manus-storage/")) {
    const key = att.url.slice("/manus-storage/".length);
    return `/api/attachment-file?key=${encodeURIComponent(key)}`;
  }
  return att.url ?? att.dataUrl ?? "";
}

describe("attachmentStreamSrc", () => {
  it("usa /api/attachment-file quando há fileKey (preferencial)", () => {
    const att = {
      fileKey: "notes/grupo-x/sup-1/Dossie_abcd1234.pdf",
      url: "/manus-storage/notes/grupo-x/sup-1/Dossie_abcd1234.pdf",
    };
    expect(attachmentStreamSrc(att)).toBe(
      "/api/attachment-file?key=notes%2Fgrupo-x%2Fsup-1%2FDossie_abcd1234.pdf",
    );
  });

  it("deriva a key a partir de uma url /manus-storage quando não há fileKey", () => {
    const att = {
      url: "/manus-storage/supplier-notes/scope/sup/123-arquivo.pdf",
    };
    expect(attachmentStreamSrc(att)).toBe(
      "/api/attachment-file?key=supplier-notes%2Fscope%2Fsup%2F123-arquivo.pdf",
    );
  });

  it("mantém data URL legado (base64) inalterado", () => {
    const att = { dataUrl: "data:application/pdf;base64,JVBERi0xLjQ=" };
    expect(attachmentStreamSrc(att)).toBe(
      "data:application/pdf;base64,JVBERi0xLjQ=",
    );
  });

  it("retorna string vazia quando não há fonte", () => {
    expect(attachmentStreamSrc({})).toBe("");
  });

  it("não trata urls externas (http) como /manus-storage", () => {
    const att = { url: "https://example.com/x.pdf" };
    expect(attachmentStreamSrc(att)).toBe("https://example.com/x.pdf");
  });
});
