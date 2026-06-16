import { describe, it, expect } from "vitest";

// =============================================================================
// Testa a lógica pura de manipulação da lista de "cards ocultos" persistida
// como JSON na chave de settings "hiddenCards". Espelha exatamente o que o
// hook useHiddenCards e a Home fazem (parse, add, remove, filtro de cards).
// =============================================================================

const SETTING_KEY = "hiddenCards";

function parseKeys(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((k): k is string => typeof k === "string");
    }
  } catch {
    // valor corrompido → vazio
  }
  return [];
}

function hide(raw: string | null, key: string): string {
  const keys = parseKeys(raw);
  if (keys.includes(key)) return JSON.stringify(keys);
  return JSON.stringify([...keys, key]);
}

function show(raw: string | null, key: string): string {
  const keys = parseKeys(raw);
  return JSON.stringify(keys.filter((k) => k !== key));
}

/** Replica o filtro de allCards: remove do índice as keys ocultas. */
function visibleCards(
  cards: Record<string, { title: string }>,
  hiddenRaw: string | null,
): string[] {
  const hidden = new Set(parseKeys(hiddenRaw));
  return Object.keys(cards).filter((k) => !hidden.has(k));
}

describe("hiddenCards — parse", () => {
  it("trata null/undefined/'' como lista vazia", () => {
    expect(parseKeys(null)).toEqual([]);
    expect(parseKeys(undefined)).toEqual([]);
    expect(parseKeys("")).toEqual([]);
  });

  it("trata JSON corrompido como lista vazia", () => {
    expect(parseKeys("{not json")).toEqual([]);
    expect(parseKeys("123")).toEqual([]);
    expect(parseKeys('{"a":1}')).toEqual([]);
  });

  it("filtra entradas não-string", () => {
    expect(parseKeys('["aquario", 5, null, "tapete"]')).toEqual(["aquario", "tapete"]);
  });
});

describe("hiddenCards — hide/show", () => {
  it("oculta uma key e é idempotente", () => {
    const after = hide(null, "aquario");
    expect(parseKeys(after)).toEqual(["aquario"]);
    // ocultar de novo não duplica
    expect(parseKeys(hide(after, "aquario"))).toEqual(["aquario"]);
  });

  it("acumula múltiplas keys preservando ordem de inserção", () => {
    let raw: string | null = null;
    raw = hide(raw, "terrario");
    raw = hide(raw, "tapete");
    expect(parseKeys(raw)).toEqual(["terrario", "tapete"]);
  });

  it("restaura (remove) uma key específica sem afetar as demais", () => {
    let raw: string | null = JSON.stringify(["terrario", "aquario", "tapete"]);
    raw = show(raw, "aquario");
    expect(parseKeys(raw)).toEqual(["terrario", "tapete"]);
  });

  it("remover key inexistente não altera a lista", () => {
    const raw = JSON.stringify(["terrario"]);
    expect(parseKeys(show(raw, "yiwu"))).toEqual(["terrario"]);
  });
});

describe("hiddenCards — filtro de cards visíveis", () => {
  const cards = {
    terrario: { title: "Fornecedores de Terrário" },
    aquario: { title: "Fornecedores de Aquário" },
    tapete: { title: "Tapete Higiênico" },
    yiwu: { title: "Yiwu Intel" },
  };

  it("sem ocultos → todos visíveis", () => {
    expect(visibleCards(cards, null).sort()).toEqual(
      ["aquario", "tapete", "terrario", "yiwu"].sort(),
    );
  });

  it("oculta remove apenas o card escolhido", () => {
    const raw = hide(null, "aquario");
    expect(visibleCards(cards, raw).sort()).toEqual(
      ["tapete", "terrario", "yiwu"].sort(),
    );
  });

  it("restaurar traz o card de volta", () => {
    let raw: string | null = hide(null, "yiwu");
    expect(visibleCards(cards, raw)).not.toContain("yiwu");
    raw = show(raw, "yiwu");
    expect(visibleCards(cards, raw)).toContain("yiwu");
  });

  it("a chave de settings é a esperada", () => {
    expect(SETTING_KEY).toBe("hiddenCards");
  });
});
