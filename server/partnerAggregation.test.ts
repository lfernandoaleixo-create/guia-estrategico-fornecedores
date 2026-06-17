// =============================================================================
// Testes da agregação por "Parceiro Chinês Responsável" e dos helpers de parceiros.
// Funções puras → testáveis sem DOM/React.
// =============================================================================
import { describe, it, expect } from "vitest";
import {
  parsePartners,
  serializePartners,
  normalizePartner,
  dedupePartners,
  PARTNERS_FIELD_KEY,
} from "../client/src/shared/supplier-notes/partners";
import {
  aggregateByPartner,
  collectPartnerNames,
  relatedPartnersOf,
  type AggNote,
  type AggSupplier,
  type AggExtraSupplier,
  type AggSubgroup,
  type AggMacro,
} from "../client/src/shared/supplier-notes/partnerAggregation";

// ----- partners.ts ------------------------------------------------------------

describe("partners helpers", () => {
  it("parse retorna [] quando vazio/ausente", () => {
    expect(parsePartners(undefined)).toEqual([]);
    expect(parsePartners(null)).toEqual([]);
    expect(parsePartners({})).toEqual([]);
    expect(parsePartners({ [PARTNERS_FIELD_KEY]: "" })).toEqual([]);
  });

  it("parse lê JSON array e remove duplicados (normalizados)", () => {
    const fields = { [PARTNERS_FIELD_KEY]: JSON.stringify(["Betty", " betty ", "Ana"]) };
    expect(parsePartners(fields)).toEqual(["Betty", "Ana"]);
  });

  it("parse aceita fallback legado separado por vírgula/;", () => {
    expect(parsePartners({ [PARTNERS_FIELD_KEY]: "Betty, Ana; João" })).toEqual([
      "Betty",
      "Ana",
      "João",
    ]);
  });

  it("serialize gera JSON array sem duplicados/vazios", () => {
    expect(serializePartners([" Betty ", "betty", "", "Ana"])).toBe(
      JSON.stringify(["Betty", "Ana"]),
    );
  });

  it("normalize remove acentos, espaços e caixa", () => {
    expect(normalizePartner("  BÉtty   Wu ")).toBe("betty wu");
    expect(normalizePartner("João")).toBe("joao");
  });

  it("dedupe preserva a primeira grafia", () => {
    expect(dedupePartners(["Betty", "BETTY", "bétty"])).toEqual(["Betty"]);
  });
});

// ----- partnerAggregation.ts --------------------------------------------------

const macros: AggMacro[] = [
  {
    id: "m1",
    number: 1,
    name: "PET",
    color: "#10b981",
    items: [
      { key: "dashboard:aquario", refId: "aquario", label: "Aquário", href: "/aquario" },
      {
        key: "subgroup:aquario:aquario",
        refId: "sg-aquario",
        label: "Aquário",
        href: "/aquario#sg-aquario",
      },
    ],
  },
  {
    id: "m2",
    number: 2,
    name: "CASA",
    color: "#8b5cf6",
    items: [{ key: "group:g-tapete", refId: "g-tapete", label: "Tapetes", href: "/grupo-g-tapete" }],
  },
];

const subgroups: AggSubgroup[] = [
  { id: "sg-aquario", macroNumber: 1, sub: 2, name: "Aquário", color: "#0ea5e9" },
];

const customSuppliers: AggSupplier[] = [
  { id: "sup-ghanzhou", scope: "aquario", name: "Ghanzhou" },
];

const extraSuppliers: AggExtraSupplier[] = [
  { id: "extra-1", groupId: "g-tapete", name: "Tapete Co" },
];

function noteWith(partners: string[], extra: Partial<AggNote> = {}): AggNote {
  return {
    scope: "aquario",
    supplierId: "sup-ghanzhou",
    fields: {
      subgroupId: "sg-aquario",
      [PARTNERS_FIELD_KEY]: JSON.stringify(partners),
    },
    attachments: [],
    ...extra,
  };
}

describe("aggregateByPartner", () => {
  it("agrupa um fornecedor sob o macro/subgrupo correto", () => {
    const notes = [noteWith(["Betty"], { attachments: [{ id: "a1", name: "catalogo.pdf" }] })];
    const res = aggregateByPartner({ notes, customSuppliers, extraSuppliers, subgroups, macros });
    expect(res).toHaveLength(1);
    const betty = res[0];
    expect(betty.displayName).toBe("Betty");
    expect(betty.supplierCount).toBe(1);
    expect(betty.attachmentCount).toBe(1);
    expect(betty.macros[0].macroNumber).toBe(1);
    expect(betty.macros[0].subgroups[0].label).toBe("1.2 · Aquário");
    expect(betty.macros[0].subgroups[0].suppliers[0].supplierName).toBe("Ghanzhou");
  });

  it("co-parceiros aparecem na entrada de cada parceiro", () => {
    const notes = [noteWith(["Betty", "Ana"])];
    const res = aggregateByPartner({ notes, customSuppliers, extraSuppliers, subgroups, macros });
    const betty = res.find((r) => r.key === "betty")!;
    const ana = res.find((r) => r.key === "ana")!;
    expect(betty.macros[0].subgroups[0].suppliers[0].coPartners).toEqual(["Ana"]);
    expect(ana.macros[0].subgroups[0].suppliers[0].coPartners).toEqual(["Betty"]);
  });

  it("resolve fornecedor de aquário por subtipo promovido a card (subgroup:aquario:terrario)", () => {
    const petMacro: AggMacro[] = [
      {
        id: "m-pet",
        number: 1,
        name: "PET",
        color: "#10b981",
        items: [
          {
            key: "subgroup:aquario:terrario",
            refId: "aquario",
            label: "Terrário",
            href: "/aquario?subtipo=terrario",
          },
        ],
      },
    ];
    const terrSupplier: AggSupplier[] = [{ id: "sup-terr", scope: "aquario", name: "Terra Co" }];
    const notes: AggNote[] = [
      {
        scope: "aquario",
        supplierId: "sup-terr",
        fields: {
          subgroupId: "",
          subtipoAquario: "terrario",
          [PARTNERS_FIELD_KEY]: JSON.stringify(["Betty", "Lilly"]),
        },
        attachments: [],
      },
    ];
    const res = aggregateByPartner({
      notes,
      customSuppliers: terrSupplier,
      extraSuppliers: [],
      subgroups: [],
      macros: petMacro,
    });
    const betty = res.find((r) => r.key === "betty")!;
    expect(betty.macros[0].macroName).toBe("PET");
    expect(betty.macros[0].subgroups[0].label).toBe("Terrário");
    expect(betty.macros[0].subgroups[0].suppliers[0].supplierName).toBe("Terra Co");
    // E a relação de co-parceiro se forma a partir desse fornecedor.
    expect(relatedPartnersOf(betty)).toEqual(["Lilly"]);
    const lilly = res.find((r) => r.key === "lilly")!;
    expect(relatedPartnersOf(lilly)).toEqual(["Betty"]);
  });

  it("resolve fornecedor extra via grupo promovido (sem subgrupo)", () => {
    const notes: AggNote[] = [
      {
        scope: "grupo-g-tapete",
        supplierId: "extra-1",
        fields: { [PARTNERS_FIELD_KEY]: JSON.stringify(["Betty"]) },
        attachments: [],
      },
    ];
    const res = aggregateByPartner({ notes, customSuppliers, extraSuppliers, subgroups, macros });
    const betty = res[0];
    expect(betty.macros[0].macroNumber).toBe(2);
    expect(betty.macros[0].subgroups[0].label).toBe("Sem subgrupo");
    expect(betty.macros[0].subgroups[0].suppliers[0].supplierName).toBe("Tapete Co");
  });

  it("ignora notas sem parceiros", () => {
    const notes: AggNote[] = [
      { scope: "aquario", supplierId: "sup-ghanzhou", fields: { subgroupId: "sg-aquario" }, attachments: [] },
    ];
    expect(aggregateByPartner({ notes, customSuppliers, extraSuppliers, subgroups, macros })).toEqual(
      [],
    );
  });

  it("não duplica o mesmo fornecedor no mesmo subgrupo", () => {
    const notes = [noteWith(["Betty"]), noteWith(["Betty"])];
    const res = aggregateByPartner({ notes, customSuppliers, extraSuppliers, subgroups, macros });
    expect(res[0].supplierCount).toBe(1);
  });

  it("collectPartnerNames retorna nomes distintos ordenados", () => {
    const notes = [noteWith(["Betty", "Ana"]), noteWith(["betty", "Carlos"])];
    expect(collectPartnerNames(notes)).toEqual(["Ana", "Betty", "Carlos"]);
  });
});

// ----- relatedPartnersOf -------------------------------------------------------

describe("relatedPartnersOf", () => {
  it("retorna [] para resultado nulo/indefinido", () => {
    expect(relatedPartnersOf(null)).toEqual([]);
    expect(relatedPartnersOf(undefined)).toEqual([]);
  });

  it("Betty e Lilly se relacionam quando dividem o mesmo fornecedor", () => {
    const notes = [noteWith(["Betty", "Lilly"])];
    const res = aggregateByPartner({ notes, customSuppliers, extraSuppliers, subgroups, macros });
    const betty = res.find((r) => r.key === "betty")!;
    const lilly = res.find((r) => r.key === "lilly")!;
    expect(relatedPartnersOf(betty)).toEqual(["Lilly"]);
    expect(relatedPartnersOf(lilly)).toEqual(["Betty"]);
  });

  it("não inclui o próprio parceiro e remove duplicados (ordem A→Z)", () => {
    const notes = [noteWith(["Betty", "Lilly", "Ana"])];
    const res = aggregateByPartner({ notes, customSuppliers, extraSuppliers, subgroups, macros });
    const betty = res.find((r) => r.key === "betty")!;
    expect(relatedPartnersOf(betty)).toEqual(["Ana", "Lilly"]);
  });

  it("retorna [] quando o parceiro não divide fornecedor com ninguém", () => {
    const notes = [noteWith(["Betty"])];
    const res = aggregateByPartner({ notes, customSuppliers, extraSuppliers, subgroups, macros });
    const betty = res.find((r) => r.key === "betty")!;
    expect(relatedPartnersOf(betty)).toEqual([]);
  });
});
