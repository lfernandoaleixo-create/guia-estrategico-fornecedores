import { describe, it, expect } from "vitest";
import {
  parseSubgroupNumber,
  formatSubgroupNumber,
  formatSubgroupLabel,
  validateSubgroupNumber,
  subgroupErrorMessage,
  sortSubgroups,
  nextSubForMacro,
} from "../client/src/shared/supplier-notes/subgroupNumber";

describe("parseSubgroupNumber", () => {
  it("faz parse de '1.4'", () => {
    expect(parseSubgroupNumber("1.4")).toEqual({ macroNumber: 1, sub: 4 });
  });
  it("aceita espaços ao redor", () => {
    expect(parseSubgroupNumber("  3.2  ")).toEqual({ macroNumber: 3, sub: 2 });
  });
  it("rejeita formato sem ponto", () => {
    expect(parseSubgroupNumber("14")).toBeNull();
  });
  it("rejeita três níveis (1.4.2)", () => {
    expect(parseSubgroupNumber("1.4.2")).toBeNull();
  });
  it("aceita macro 0 (ex.: macro 'Documentos') e sub 0", () => {
    expect(parseSubgroupNumber("0.1")).toEqual({ macroNumber: 0, sub: 1 });
    expect(parseSubgroupNumber("0.3")).toEqual({ macroNumber: 0, sub: 3 });
    expect(parseSubgroupNumber("1.0")).toEqual({ macroNumber: 1, sub: 0 });
  });
  it("rejeita negativos", () => {
    expect(parseSubgroupNumber("-1.2")).toBeNull();
    expect(parseSubgroupNumber("1.-2")).toBeNull();
  });
  it("rejeita string vazia", () => {
    expect(parseSubgroupNumber("")).toBeNull();
    expect(parseSubgroupNumber("   ")).toBeNull();
  });
});

describe("formatSubgroupNumber / Label", () => {
  it("formata número", () => {
    expect(formatSubgroupNumber(1, 4)).toBe("1.4");
  });
  it("formata label com nome", () => {
    expect(formatSubgroupLabel(1, 1, "Terrário")).toBe("1.1 - Terrário");
  });
  it("label sem nome retorna só número", () => {
    expect(formatSubgroupLabel(1, 2, "  ")).toBe("1.2");
  });
});

describe("validateSubgroupNumber", () => {
  const existingMacroNumbers = [1, 3, 5];
  const existingSubgroups = [
    { macroNumber: 1, sub: 1, id: "a" },
    { macroNumber: 1, sub: 2, id: "b" },
  ];

  it("ok para macro existente e número livre", () => {
    const r = validateSubgroupNumber({ raw: "1.4", existingMacroNumbers, existingSubgroups });
    expect(r.ok).toBe(true);
    expect(r.parsed).toEqual({ macroNumber: 1, sub: 4 });
  });

  it("erro empty para vazio", () => {
    const r = validateSubgroupNumber({ raw: "", existingMacroNumbers, existingSubgroups });
    expect(r.error).toBe("empty");
  });

  it("erro format para formato ruim", () => {
    const r = validateSubgroupNumber({ raw: "abc", existingMacroNumbers, existingSubgroups });
    expect(r.error).toBe("format");
  });

  it("BLOQUEIA quando macro não existe", () => {
    const r = validateSubgroupNumber({ raw: "9.1", existingMacroNumbers, existingSubgroups });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("macro-not-found");
  });

  it("erro duplicate para macro.sub já existente", () => {
    const r = validateSubgroupNumber({ raw: "1.1", existingMacroNumbers, existingSubgroups });
    expect(r.error).toBe("duplicate");
  });

  it("não acusa duplicidade contra si mesmo ao editar", () => {
    const r = validateSubgroupNumber({
      raw: "1.1",
      existingMacroNumbers,
      existingSubgroups,
      editingId: "a",
    });
    expect(r.ok).toBe(true);
  });

  it("mensagem de macro-not-found cita o número do macro", () => {
    expect(subgroupErrorMessage("macro-not-found", 9)).toContain("Nº 9");
  });

  it("PERMITE criar subgrupos no macro 0 (ex.: 0.1, 0.2, 0.3)", () => {
    const macros0 = [0, 1, 3];
    const subs0 = [{ macroNumber: 0, sub: 1, id: "d1" }];
    const r1 = validateSubgroupNumber({
      raw: "0.2",
      existingMacroNumbers: macros0,
      existingSubgroups: subs0,
    });
    expect(r1.ok).toBe(true);
    expect(r1.parsed).toEqual({ macroNumber: 0, sub: 2 });

    // 0.1 já existe → duplicado
    const r2 = validateSubgroupNumber({
      raw: "0.1",
      existingMacroNumbers: macros0,
      existingSubgroups: subs0,
    });
    expect(r2.error).toBe("duplicate");
  });
});

describe("sortSubgroups / nextSubForMacro", () => {
  it("ordena por macro e depois por sub", () => {
    const sorted = sortSubgroups([
      { macroNumber: 3, sub: 2 },
      { macroNumber: 1, sub: 4 },
      { macroNumber: 1, sub: 1 },
    ]);
    expect(sorted.map((s) => `${s.macroNumber}.${s.sub}`)).toEqual(["1.1", "1.4", "3.2"]);
  });

  it("sugere próximo sub livre", () => {
    const subs = [
      { macroNumber: 1, sub: 1 },
      { macroNumber: 1, sub: 2 },
      { macroNumber: 3, sub: 7 },
    ];
    expect(nextSubForMacro(1, subs)).toBe(3);
    expect(nextSubForMacro(3, subs)).toBe(8);
    expect(nextSubForMacro(5, subs)).toBe(1); // macro sem subgrupos
  });
});

// =============================================================================
// Caminho "macro fixo" (botão "Adicionar fornecedor" dentro de um macro na Home):
// o SubgroupPicker monta o raw como `${fixedMacroNumber}.${sub}` e reaproveita
// validateSubgroupNumber. Estes testes garantem que a montagem + validação se
// comportam como esperado quando o usuário digita SÓ a 2ª parte (o sub).
// =============================================================================
describe("modo macro fixo (raw = `${macro}.${sub}`)", () => {
  const existingMacroNumbers = [1, 2];
  const existingSubgroups = [
    { macroNumber: 1, sub: 1, id: "a" },
    { macroNumber: 1, sub: 2, id: "b" },
  ];

  function buildFixedRaw(macroNumber: number, subTyped: string): string {
    // Réplica exata da lógica do SubgroupPicker em modo macro fixo.
    return `${macroNumber}.${subTyped.trim()}`;
  }

  it("monta o raw correto a partir do sub isolado", () => {
    expect(buildFixedRaw(1, "3")).toBe("1.3");
    expect(buildFixedRaw(2, " 5 ")).toBe("2.5");
  });

  it("valida ok ao criar 1.3 com macro 1 fixo", () => {
    const r = validateSubgroupNumber({
      raw: buildFixedRaw(1, "3"),
      existingMacroNumbers,
      existingSubgroups,
    });
    expect(r.ok).toBe(true);
    expect(r.parsed).toEqual({ macroNumber: 1, sub: 3 });
  });

  it("bloqueia duplicado mesmo com macro fixo (1.1 já existe)", () => {
    const r = validateSubgroupNumber({
      raw: buildFixedRaw(1, "1"),
      existingMacroNumbers,
      existingSubgroups,
    });
    expect(r.error).toBe("duplicate");
  });

  it("sub vazio resulta em formato inválido", () => {
    const r = validateSubgroupNumber({
      raw: buildFixedRaw(1, ""),
      existingMacroNumbers,
      existingSubgroups,
    });
    expect(r.error).toBe("format");
  });

  it("sugere a 2ª parte (sub) inicial para o macro fixo", () => {
    expect(nextSubForMacro(1, existingSubgroups)).toBe(3);
    expect(nextSubForMacro(2, existingSubgroups)).toBe(1);
  });
});
