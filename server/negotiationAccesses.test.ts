import { describe, it, expect } from "vitest";
import { buildAccesses } from "../client/src/shared/supplier-notes/negotiationAccesses";
import type { Macro } from "../client/src/shared/supplier-notes/useMacros";
import type { Subgroup } from "../client/src/shared/supplier-notes/useSubgroups";

function makeMacro(partial: Partial<Macro>): Macro {
  return {
    id: "macro_x",
    number: 1,
    orderIndex: 1,
    name: "Macro",
    color: "#3b82f6",
    items: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function makeSubgroup(partial: Partial<Subgroup>): Subgroup {
  return {
    id: "sg_x",
    macroNumber: 1,
    sub: 1,
    name: "Subgrupo",
    subtitle: "",
    color: "#10b981",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("buildAccesses", () => {
  it("inclui os acessos vindos de macro.items quando não há subgrupos numerados (caso PET)", () => {
    const pet = makeMacro({
      number: 1,
      name: "PET",
      items: [
        {
          key: "subgroup:aquario:terrario",
          kind: "subgroup",
          refId: "aquario",
          label: "Terrário",
          href: "/aquario?subtipo=terrario",
          subtipo: "terrario",
        },
        {
          key: "subgroup:aquario:aquario",
          kind: "subgroup",
          refId: "aquario",
          label: "Aquário",
          href: "/aquario?subtipo=aquario",
          subtipo: "aquario",
        },
        {
          key: "dashboard:tapete",
          kind: "dashboard",
          refId: "tapete",
          label: "Tapete Higiênico Pet",
          href: "/tapete",
          subtipo: null,
        },
      ],
    });

    const accesses = buildAccesses(pet, []);
    expect(accesses).toHaveLength(3);
    expect(accesses.map((a) => a.label)).toEqual([
      "Terrário",
      "Aquário",
      "Tapete Higiênico Pet",
    ]);
    // Items não numerados não têm badge (usam ícone do kind).
    expect(accesses.every((a) => a.badge === null)).toBe(true);
    expect(accesses[2].kind).toBe("dashboard");
  });

  it("inclui subgrupos numerados da tabela com o número x.y formatado (caso Marmita)", () => {
    const macro = makeMacro({ number: 2, name: "Utensílios", items: [] });
    const accesses = buildAccesses(macro, [
      makeSubgroup({ id: "sg1", macroNumber: 2, sub: 1, name: "Marmita Plástica" }),
    ]);
    expect(accesses).toHaveLength(1);
    expect(accesses[0].label).toBe("Marmita Plástica");
    expect(accesses[0].badge).toBe("2.1");
    expect(accesses[0].kind).toBe("subgroup");
  });

  it("une as duas fontes: items primeiro, depois subgrupos numerados", () => {
    const macro = makeMacro({
      number: 2,
      items: [
        {
          key: "group:abc",
          kind: "group",
          refId: "abc",
          label: "Fibra fora da China",
          href: "/grupo/abc",
          subtipo: null,
        },
      ],
    });
    const accesses = buildAccesses(macro, [
      makeSubgroup({ id: "sg1", macroNumber: 2, sub: 1, name: "Marmita Plástica" }),
    ]);
    expect(accesses.map((a) => a.label)).toEqual([
      "Fibra fora da China",
      "Marmita Plástica",
    ]);
    expect(accesses[0].kind).toBe("group");
    expect(accesses[1].badge).toBe("2.1");
  });

  it("deduplica: item de macro.items com mesmo nome de um subgrupo numerado é descartado", () => {
    const macro = makeMacro({
      number: 2,
      items: [
        {
          key: "group:abc",
          kind: "group",
          refId: "abc",
          label: "Marmita Plástica",
          href: "/grupo/abc",
          subtipo: null,
        },
      ],
    });
    const accesses = buildAccesses(macro, [
      makeSubgroup({ id: "sg1", macroNumber: 2, sub: 1, name: "Marmita Plástica" }),
    ]);
    // Apenas a versão numerada (subgrupo) deve permanecer.
    expect(accesses).toHaveLength(1);
    expect(accesses[0].badge).toBe("2.1");
    expect(accesses[0].kind).toBe("subgroup");
  });

  it("retorna lista vazia quando não há items nem subgrupos", () => {
    expect(buildAccesses(makeMacro({ items: [] }), [])).toEqual([]);
  });

  it("propaga o subtitle do subgrupo quando presente", () => {
    const macro = makeMacro({ number: 1, items: [] });
    const accesses = buildAccesses(macro, [
      makeSubgroup({ id: "sg1", sub: 2, name: "Coleira", subtitle: "Linha pet" }),
    ]);
    expect(accesses[0].subtitle).toBe("Linha pet");
  });
});
