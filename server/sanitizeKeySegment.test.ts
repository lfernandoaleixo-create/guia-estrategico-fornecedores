import { describe, it, expect } from "vitest";
import { sanitizeKeySegment } from "./storage";

describe("sanitizeKeySegment", () => {
  it("troca espaços por hífen (evita key com espaço no S3)", () => {
    expect(sanitizeKeySegment("JIANGSU DEZHU CHINA")).toBe("JIANGSU-DEZHU-CHINA");
  });

  it("remove acentos", () => {
    expect(sanitizeKeySegment("Tapete Higiênico Pet")).toBe("Tapete-Higienico-Pet");
  });

  it("colapsa múltiplos espaços/símbolos em um único hífen", () => {
    expect(sanitizeKeySegment("a   b///c")).toBe("a-b-c");
  });

  it("descarta caracteres não permitidos mantendo ._-", () => {
    expect(sanitizeKeySegment("file_name.v1-2")).toBe("file_name.v1-2");
  });

  it("apara hífens e pontos das bordas", () => {
    expect(sanitizeKeySegment("  --foo--  ")).toBe("foo");
  });

  it("nunca retorna vazio", () => {
    expect(sanitizeKeySegment("   ")).toBe("x");
    expect(sanitizeKeySegment("!!!")).toBe("x");
  });

  it("não contém espaço no resultado para qualquer entrada com espaço", () => {
    const out = sanitizeKeySegment("Fornecedor 99 Gold Data Vietnã");
    expect(out).not.toMatch(/\s/);
    expect(out).toBe("Fornecedor-99-Gold-Data-Vietna");
  });

  it("limita o tamanho do segmento", () => {
    const long = "a".repeat(200);
    expect(sanitizeKeySegment(long).length).toBeLessThanOrEqual(100);
  });
});
