// =============================================================================
// Testes da lógica de cor dos cards: derivação de tons (deriveAccent) e parse
// do mapa de overrides (parseCardColors). Lógica pura, sem rede/DOM.
// =============================================================================
import { describe, it, expect } from "vitest";
import {
  deriveAccent,
  isHexColor,
  CARD_COLOR_PALETTE,
} from "../client/src/shared/supplier-notes/cardAccent";
import { parseCardColors } from "../client/src/shared/supplier-notes/useCardColors";

describe("isHexColor", () => {
  it("aceita hex de 3, 6 e 8 dígitos", () => {
    expect(isHexColor("#abc")).toBe(true);
    expect(isHexColor("#a1b2c3")).toBe(true);
    expect(isHexColor("#a1b2c3ff")).toBe(true);
  });

  it("rejeita strings não-hex (OKLCH, vazias, lixo)", () => {
    expect(isHexColor("oklch(0.72 0.18 28)")).toBe(false);
    expect(isHexColor("")).toBe(false);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("#xyz")).toBe(false);
  });
});

describe("deriveAccent — hex", () => {
  it("expande hex curto e gera os 4 tons com sufixos de alfa", () => {
    const a = deriveAccent("#abc");
    expect(a.accent).toBe("#aabbcc");
    expect(a.accentSoft).toBe("#aabbcc");
    expect(a.accentBg).toBe("#aabbcc1f");
    expect(a.accentBorder).toBe("#aabbcc88");
  });

  it("mantém hex longo e adiciona os sufixos esperados", () => {
    const a = deriveAccent("#ef4444");
    expect(a.accent).toBe("#ef4444");
    expect(a.accentBg).toBe("#ef44441f");
    expect(a.accentBorder).toBe("#ef444488");
  });

  it("descarta o alfa de um hex de 8 dígitos para a base", () => {
    const a = deriveAccent("#11223344");
    expect(a.accent).toBe("#112233");
    expect(a.accentBg).toBe("#1122331f");
  });
});

describe("deriveAccent — OKLCH e fallback", () => {
  it("usa color-mix para strings CSS genéricas (OKLCH)", () => {
    const a = deriveAccent("oklch(0.72 0.18 28)");
    expect(a.accent).toBe("oklch(0.72 0.18 28)");
    expect(a.accentBg).toContain("color-mix");
    expect(a.accentBorder).toContain("color-mix");
    expect(a.accentSoft).toContain("color-mix");
  });

  it("cai no fallback âmbar quando vazio", () => {
    const a = deriveAccent("");
    expect(a.accent).toBe("#f59e0b");
  });
});

describe("CARD_COLOR_PALETTE", () => {
  it("oferece uma paleta ampla (>= 40 cores), todas hex válido e únicas", () => {
    expect(CARD_COLOR_PALETTE.length).toBeGreaterThanOrEqual(40);
    const values = CARD_COLOR_PALETTE.map((c) => c.value);
    for (const v of values) expect(isHexColor(v)).toBe(true);
    expect(new Set(values).size).toBe(values.length);
  });

  it("todas as cores possuem rótulo não-vazio", () => {
    for (const c of CARD_COLOR_PALETTE) {
      expect(typeof c.label).toBe("string");
      expect(c.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("deriveAccent gera tons válidos para todas as cores da paleta", () => {
    for (const c of CARD_COLOR_PALETTE) {
      const a = deriveAccent(c.value);
      expect(a.accent.toLowerCase()).toBe(c.value.toLowerCase());
      expect(a.accentBg).toContain(c.value);
      expect(a.accentBorder).toContain(c.value);
    }
  });
});

describe("parseCardColors", () => {
  it("retorna vazio para null/undefined/string inválida", () => {
    expect(parseCardColors(null)).toEqual({});
    expect(parseCardColors(undefined)).toEqual({});
    expect(parseCardColors("não é json")).toEqual({});
  });

  it("ignora arrays e mantém apenas pares string->string", () => {
    expect(parseCardColors("[1,2,3]")).toEqual({});
    expect(
      parseCardColors(
        JSON.stringify({ a: "#fff", b: 123, c: "#000", d: null }),
      ),
    ).toEqual({ a: "#fff", c: "#000" });
  });

  it("faz round-trip de um mapa válido", () => {
    const map = { "subgroup:aquario:terrario": "#3b82f6", "group:x": "#10b981" };
    expect(parseCardColors(JSON.stringify(map))).toEqual(map);
  });
});
