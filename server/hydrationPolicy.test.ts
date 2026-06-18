import { describe, it, expect } from "vitest";
import { shouldHydrate, type HydrationState } from "../client/src/shared/supplier-notes/hydrationPolicy";

// Regra de ouro: NADA que o operador digitou pode ser sobrescrito por um
// refetch/polling do servidor. Estes testes blindam o comportamento.

const base: HydrationState = {
  currentSupplierId: "sup-1",
  hydratedFor: "sup-1",
  dirty: false,
  hydratedFromEntry: false,
  hasEntry: true,
};

describe("shouldHydrate", () => {
  it("reidrata ao trocar de fornecedor (mesmo se sujo)", () => {
    expect(
      shouldHydrate({ ...base, currentSupplierId: "sup-2", hydratedFor: "sup-1", dirty: true }),
    ).toBe(true);
  });

  it("reidrata na 1ª chegada dos dados quando o painel está limpo", () => {
    expect(
      shouldHydrate({ ...base, dirty: false, hydratedFromEntry: false, hasEntry: true }),
    ).toBe(true);
  });

  it("NUNCA reidrata enquanto o operador está editando (dirty) — anti-perda", () => {
    expect(
      shouldHydrate({ ...base, dirty: true, hydratedFromEntry: true, hasEntry: true }),
    ).toBe(false);
  });

  it("NUNCA reidrata por causa de polling após já ter populado (mesmo limpo)", () => {
    // Já hidratou a partir do entry; um novo refetch não deve repopular.
    expect(
      shouldHydrate({ ...base, dirty: false, hydratedFromEntry: true, hasEntry: true }),
    ).toBe(false);
  });

  it("cenário do bug: digitar (dirty) e chegar versão antiga do servidor → mantém edição", () => {
    // O operador digitou (dirty=true). O polling traz o entry antigo.
    // shouldHydrate deve retornar false, preservando o texto digitado.
    const result = shouldHydrate({
      currentSupplierId: "sup-1",
      hydratedFor: "sup-1",
      dirty: true,
      hydratedFromEntry: true,
      hasEntry: true,
    });
    expect(result).toBe(false);
  });

  it("primeiro acesso a fornecedor SEM dados ainda não força hidratação por entry (mas troca de supplier sim)", () => {
    // Sem entry e mesmo supplier: nada a popular.
    expect(
      shouldHydrate({ ...base, hasEntry: false, hydratedFromEntry: false, dirty: false }),
    ).toBe(false);
    // Troca de supplier sempre reidrata (limpa o painel para o novo).
    expect(
      shouldHydrate({ ...base, currentSupplierId: "novo", hydratedFor: "sup-1", hasEntry: false }),
    ).toBe(true);
  });
});
