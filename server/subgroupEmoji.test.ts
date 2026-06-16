import { describe, it, expect } from "vitest";
import { subgroupEmoji } from "../client/src/shared/supplier-notes/subgroupEmoji";

describe("subgroupEmoji", () => {
  it("mapeia terrário/répteis para 🦎 (com e sem acento)", () => {
    expect(subgroupEmoji("Terrário")).toBe("🦎");
    expect(subgroupEmoji("terrario")).toBe("🦎");
    expect(subgroupEmoji("Répteis para terrário")).toBe("🦎");
  });

  it("mapeia aquário/peixe para 🐟", () => {
    expect(subgroupEmoji("Aquário")).toBe("🐟");
    expect(subgroupEmoji("Peixe Ornamental")).toBe("🐟");
  });

  it("mapeia tapete higiênico para 🧻", () => {
    expect(subgroupEmoji("Tapete Higiênico")).toBe("🧻");
  });

  it("mapeia coleira/cachorro para 🐶", () => {
    expect(subgroupEmoji("Coleira de Cachorro")).toBe("🐶");
  });

  it("usa fallback pet 🐾 quando só há 'pet' no nome", () => {
    expect(subgroupEmoji("Pet Shop Geral")).toBe("🐾");
  });

  it("retorna string vazia quando nada casa", () => {
    expect(subgroupEmoji("Algo Genérico")).toBe("");
    expect(subgroupEmoji("")).toBe("");
    expect(subgroupEmoji(null)).toBe("");
    expect(subgroupEmoji(undefined)).toBe("");
  });

  it("prioriza regra mais específica (terrário antes de pet)", () => {
    expect(subgroupEmoji("Pet Terrário")).toBe("🦎");
  });
});
