import { describe, expect, it } from "vitest";
import {
  mimeForName,
  blobWithCorrectType,
} from "../client/src/shared/supplier-notes/attachmentViewer";

/**
 * Feature 22 (Bug 2): ao baixar um PDF, o arquivo precisa ser salvo como
 * binário .pdf no computador (não aberto como link). A causa comum é o Blob vir
 * sem o MIME correto (ex.: application/octet-stream), fazendo o navegador tratá-lo
 * como recurso genérico. Estes testes garantem que o MIME é derivado da extensão
 * e que o Blob é reembalado com `application/pdf` quando necessário.
 */

describe("mimeForName", () => {
  it("mapeia .pdf para application/pdf", () => {
    expect(mimeForName("Mclanzoo.pdf")).toBe("application/pdf");
    expect(mimeForName("COTACAO.PDF")).toBe("application/pdf");
  });
  it("mapeia planilhas e documentos corretamente", () => {
    expect(mimeForName("NOMOYPET.xlsx")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(mimeForName("contrato.docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(mimeForName("dados.csv")).toBe("text/csv");
  });
  it("retorna null para extensões desconhecidas", () => {
    expect(mimeForName("arquivo.xyz")).toBeNull();
    expect(mimeForName("semextensao")).toBeNull();
  });
});

describe("blobWithCorrectType", () => {
  it("reembala um blob genérico de PDF com application/pdf", () => {
    const generic = new Blob([new Uint8Array([1, 2, 3])], {
      type: "application/octet-stream",
    });
    const fixed = blobWithCorrectType(generic, "cotacao.pdf");
    expect(fixed.type).toBe("application/pdf");
  });
  it("reembala blob sem type usando a extensão", () => {
    const noType = new Blob([new Uint8Array([1, 2, 3])]);
    const fixed = blobWithCorrectType(noType, "cotacao.pdf");
    expect(fixed.type).toBe("application/pdf");
  });
  it("preserva um blob que já tem o type correto", () => {
    const ok = new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" });
    const fixed = blobWithCorrectType(ok, "cotacao.pdf");
    expect(fixed.type).toBe("application/pdf");
  });
  it("usa o fallback mime quando a extensão é desconhecida", () => {
    const generic = new Blob([new Uint8Array([1, 2, 3])], {
      type: "application/octet-stream",
    });
    const fixed = blobWithCorrectType(generic, "arquivo.bin", "application/pdf");
    expect(fixed.type).toBe("application/pdf");
  });
});
