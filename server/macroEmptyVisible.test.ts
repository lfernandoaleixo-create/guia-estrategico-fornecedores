import { describe, it, expect } from "vitest";

// Regra de exibição de macros na Home (Feature 24):
// Um macro DEVE aparecer na lista mesmo quando não tem itens nem subgrupos.
// Antes, a Home fazia `if (totalAcessos === 0) return null;`, o que escondia
// macros recém-criados (ex.: "Documentos") e dava a impressão de que não
// haviam sido salvos. Esta função pura espelha a regra atual.

export function shouldRenderMacro(itemsCount: number, subgroupCount: number): boolean {
  // Sempre renderiza; o número de acessos só controla o estado vazio interno.
  return itemsCount >= 0 && subgroupCount >= 0;
}

export function isEmptyMacro(itemsCount: number, subgroupCount: number): boolean {
  return itemsCount + subgroupCount === 0;
}

describe("Feature 24 — exibição de macros vazios", () => {
  it("renderiza macro com itens", () => {
    expect(shouldRenderMacro(3, 0)).toBe(true);
    expect(isEmptyMacro(3, 0)).toBe(false);
  });

  it("renderiza macro com subgrupos", () => {
    expect(shouldRenderMacro(0, 2)).toBe(true);
    expect(isEmptyMacro(0, 2)).toBe(false);
  });

  it("renderiza macro recém-criado SEM itens nem subgrupos (regressão Documentos)", () => {
    expect(shouldRenderMacro(0, 0)).toBe(true);
    expect(isEmptyMacro(0, 0)).toBe(true);
  });
});
