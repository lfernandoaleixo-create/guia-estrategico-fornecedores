// =============================================================================
// partnerChips.test.ts
//
// Cobre a LÓGICA usada pelo componente <PartnerChips/> que exibe os parceiros
// chineses no cabeçalho RECOLHIDO de um card de fornecedor:
//   - lê a lista a partir de fields.parceirosChineses (parsePartners);
//   - não exibe nada quando não há parceiros;
//   - dedup case/acento-insensível;
//   - limita a `max` chips e gera contagem de excedente "+N".
//
// O componente é uma camada fina de apresentação sobre estas regras, então
// testamos as regras puras (parsePartners + a divisão shown/extra), que é a
// parte com risco de regressão.
// =============================================================================

import { describe, it, expect } from "vitest";
import { parsePartners, serializePartners } from "../client/src/shared/supplier-notes/partners";

/** Reproduz a divisão feita pelo componente: chips visíveis + excedente. */
function splitChips(fields: Record<string, string> | undefined | null, max = 4) {
  const partners = parsePartners(fields);
  const shown = partners.slice(0, max);
  const extra = partners.length - shown.length;
  return { partners, shown, extra };
}

describe("PartnerChips — regras de exibição", () => {
  it("não renderiza nada quando não há parceiros", () => {
    expect(splitChips(undefined).partners).toEqual([]);
    expect(splitChips({}).partners).toEqual([]);
    expect(splitChips({ parceirosChineses: "[]" }).partners).toEqual([]);
    expect(splitChips({ parceirosChineses: "" }).partners).toEqual([]);
  });

  it("exibe um único parceiro (caso do TAISHAN · Betty)", () => {
    const fields = { parceirosChineses: serializePartners(["Betty"]) };
    const { shown, extra } = splitChips(fields);
    expect(shown).toEqual(["Betty"]);
    expect(extra).toBe(0);
  });

  it("preserva a ordem e a grafia original de múltiplos parceiros", () => {
    const fields = { parceirosChineses: serializePartners(["Betty", "Lilly"]) };
    const { shown, extra } = splitChips(fields);
    expect(shown).toEqual(["Betty", "Lilly"]);
    expect(extra).toBe(0);
  });

  it("dedup case/acento-insensível, mantendo a primeira grafia", () => {
    const fields = { parceirosChineses: serializePartners(["Betty", " betty ", "BETTY"]) };
    const { partners } = splitChips(fields);
    expect(partners).toEqual(["Betty"]);
  });

  it("limita a `max` chips e calcula o excedente +N", () => {
    const fields = {
      parceirosChineses: serializePartners(["A", "B", "C", "D", "E", "F"]),
    };
    const { shown, extra } = splitChips(fields, 4);
    expect(shown).toEqual(["A", "B", "C", "D"]);
    expect(extra).toBe(2);
  });

  it("aceita formato legado (string separada por vírgula)", () => {
    const fields = { parceirosChineses: "Betty, Lilly" };
    const { shown, extra } = splitChips(fields);
    expect(shown).toEqual(["Betty", "Lilly"]);
    expect(extra).toBe(0);
  });
});
