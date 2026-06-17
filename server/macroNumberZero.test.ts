import { describe, it, expect } from "vitest";

// Feature 25 — permitir número 0 no macro.
// Espelha a regra de createMacro (useMacros.ts): um número fornecido (inclusive 0)
// é respeitado; quando ausente/NaN, calcula o menor número inteiro >= 1 livre.

export function resolveMacroNumber(
  existing: number[],
  provided?: number,
): number {
  const used = new Set(existing.filter((n) => Number.isFinite(n)));
  let auto = 1;
  while (used.has(auto)) auto += 1;
  return typeof provided === "number" && Number.isFinite(provided) && provided >= 0
    ? Math.floor(provided)
    : auto;
}

describe("Feature 25 — número 0 no macro", () => {
  it("respeita o 0 explícito fornecido", () => {
    expect(resolveMacroNumber([1, 2, 3], 0)).toBe(0);
  });

  it("respeita números positivos fornecidos", () => {
    expect(resolveMacroNumber([1, 2], 5)).toBe(5);
  });

  it("usa automático quando o número é omitido", () => {
    expect(resolveMacroNumber([1, 2, 3])).toBe(4);
    expect(resolveMacroNumber([2, 3])).toBe(1);
  });

  it("ignora valores negativos e cai no automático", () => {
    expect(resolveMacroNumber([1], -3)).toBe(2);
  });

  it("trunca números decimais fornecidos", () => {
    expect(resolveMacroNumber([], 0.9)).toBe(0);
    expect(resolveMacroNumber([], 2.7)).toBe(2);
  });

  it("não reutiliza o 0 já usado ao calcular automático", () => {
    // 0 está em uso; o automático começa em 1 (não colide com 0)
    expect(resolveMacroNumber([0, 1, 2])).toBe(3);
  });
});
