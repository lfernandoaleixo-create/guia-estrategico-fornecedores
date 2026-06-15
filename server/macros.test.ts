import { describe, it, expect } from "vitest";
import {
  FIXED_MACRO_ITEMS,
  buildCatalog,
  groupMacroItem,
} from "../client/src/shared/supplier-notes/macroCatalog";
import type { Macro, MacroItem } from "../client/src/shared/supplier-notes/useMacros";

// ---------------------------------------------------------------------------
// Helper que replica a lógica do useSubtipoHierLabel: descobre o prefixo
// hierárquico (ex.: "1.1") de uma key a partir dos macros e da ordem dos itens.
// ---------------------------------------------------------------------------
function prefixForKey(macros: Macro[], key: string): string {
  for (const m of macros) {
    const idx = m.items.findIndex((it) => it.key === key);
    if (idx >= 0) return `${m.number}.${idx + 1}`;
  }
  return "";
}

// Replica a ordenação dos macros por número (igual ao hook useMacros).
function sortMacros(macros: Macro[]): Macro[] {
  return [...macros].sort((a, b) => a.number - b.number);
}

function makeMacro(number: number, name: string, items: MacroItem[]): Macro {
  return {
    id: `macro_${number}`,
    number,
    name,
    color: "#8b5cf6",
    items,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("Catálogo de itens de macro", () => {
  it("inclui os dois subgrupos do Aquário (Terrário e Aquário) apontando para a mesma rota com filtro", () => {
    const terrario = FIXED_MACRO_ITEMS.find((i) => i.key === "subgroup:aquario:terrario");
    const aquario = FIXED_MACRO_ITEMS.find((i) => i.key === "subgroup:aquario:aquario");
    expect(terrario?.refId).toBe("aquario");
    expect(terrario?.href).toBe("/aquario?subtipo=terrario");
    expect(aquario?.refId).toBe("aquario");
    expect(aquario?.href).toBe("/aquario?subtipo=aquario");
  });

  it("inclui Tapete e Yiwu como dashboards atribuíveis", () => {
    const keys = FIXED_MACRO_ITEMS.map((i) => i.key);
    expect(keys).toContain("dashboard:tapete");
    expect(keys).toContain("dashboard:yiwu");
  });

  it("buildCatalog acrescenta grupos promovidos e oculta o grupo nº 0", () => {
    const catalog = buildCatalog([
      { id: "g1", name: "Fornecedores de Jóias", number: 5 },
      { id: "g0", name: "Central de Documentos", number: 0 },
    ]);
    const keys = catalog.map((i) => i.key);
    expect(keys).toContain("group:g1");
    expect(keys).not.toContain("group:g0");
  });

  it("groupMacroItem gera key e href estáveis", () => {
    const item = groupMacroItem({ id: "abc", name: "Meu Grupo" });
    expect(item.key).toBe("group:abc");
    expect(item.href).toBe("/grupo/abc");
    expect(item.kind).toBe("group");
  });
});

describe("Numeração hierárquica (prefixo do macro)", () => {
  const pet = makeMacro(1, "PET", [
    FIXED_MACRO_ITEMS[0], // terrário
    FIXED_MACRO_ITEMS[1], // aquário
    FIXED_MACRO_ITEMS[2], // tapete
  ]);

  it("gera 1.1 para Terrário, 1.2 para Aquário e 1.3 para Tapete na ordem definida", () => {
    expect(prefixForKey([pet], "subgroup:aquario:terrario")).toBe("1.1");
    expect(prefixForKey([pet], "subgroup:aquario:aquario")).toBe("1.2");
    expect(prefixForKey([pet], "dashboard:tapete")).toBe("1.3");
  });

  it("reflete a reordenação dos itens (trocar a ordem muda o sufixo)", () => {
    const reordered = makeMacro(1, "PET", [
      FIXED_MACRO_ITEMS[1], // aquário primeiro
      FIXED_MACRO_ITEMS[0], // terrário depois
    ]);
    expect(prefixForKey([reordered], "subgroup:aquario:aquario")).toBe("1.1");
    expect(prefixForKey([reordered], "subgroup:aquario:terrario")).toBe("1.2");
  });

  it("usa o número do macro como prefixo maior (macro 2 → 2.1)", () => {
    const outro = makeMacro(2, "Casa", [FIXED_MACRO_ITEMS[3]]); // yiwu
    expect(prefixForKey([pet, outro], "dashboard:yiwu")).toBe("2.1");
  });

  it("retorna string vazia quando o item não está em macro algum", () => {
    expect(prefixForKey([pet], "dashboard:yiwu")).toBe("");
  });

  it("ordena os macros por número antes de derivar o prefixo", () => {
    const m2 = makeMacro(2, "Casa", [FIXED_MACRO_ITEMS[3]]);
    const m1 = makeMacro(1, "PET", [FIXED_MACRO_ITEMS[0]]);
    const sorted = sortMacros([m2, m1]);
    expect(sorted[0].number).toBe(1);
    expect(sorted[1].number).toBe(2);
  });
});

describe("Vínculo único (um item pertence a no máximo um macro)", () => {
  it("ao reatribuir um item, ele deve sair do macro anterior", () => {
    // Estado inicial: tapete no macro 1.
    let pet = makeMacro(1, "PET", [FIXED_MACRO_ITEMS[2]]);
    let casa = makeMacro(2, "Casa", []);

    // Simula assignItem(casa, tapete): remove do PET, adiciona em Casa.
    pet = { ...pet, items: pet.items.filter((i) => i.key !== "dashboard:tapete") };
    casa = { ...casa, items: [...casa.items, FIXED_MACRO_ITEMS[2]] };

    expect(prefixForKey([pet, casa], "dashboard:tapete")).toBe("2.1");
    // Não deve continuar no PET.
    expect(pet.items.some((i) => i.key === "dashboard:tapete")).toBe(false);
  });
});
