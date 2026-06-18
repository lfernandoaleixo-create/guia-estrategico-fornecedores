import { describe, it, expect } from "vitest";
import {
  buildNegotiationSuppliers,
  composeAddress,
  hasAnyTick,
  applyNegotiationFilter,
  EMPTY_FILTER,
  type NegotiationSupplierInput,
  type NegotiationNoteInput,
  type NegotiationSupplier,
} from "../client/src/shared/supplier-notes/negotiationAccesses";

const suppliers: NegotiationSupplierInput[] = [
  {
    id: "s1",
    name: "Ningbo Pet Co.",
    city: "Ningbo",
    province: "Zhejiang",
    address: "Rua A, 123",
  },
  { id: "s2", name: "Alpha Aqua", city: "Guangzhou", province: "Guangdong" },
  { id: "s3", name: "Beta Glass", city: null, province: null, address: null },
  { id: "s4", name: "Sem Ticagem", city: "Yiwu", province: "Zhejiang" },
];

const entries: Record<string, NegotiationNoteInput | undefined> = {
  // ticado: potencial alto + preço bom + status livre + resumo
  s1: {
    fields: {
      potencial: "alto",
      precoClassificacao: "bom",
      statusLivre: "Aguardando contrato",
      resumoNegociacao: "Boa conversa, enviou catálogo.",
    },
  },
  // ticado só por preço excelente, sem resumo
  s2: { fields: { precoClassificacao: "excelente" } },
  // ticado só por status livre
  s3: { fields: { statusLivre: "Visitar de novo" } },
  // NÃO ticado (campos vazios/whitespace)
  s4: { fields: { potencial: "  ", precoClassificacao: "", statusLivre: "" } },
};

describe("hasAnyTick", () => {
  it("considera ticado quem tem qualquer um dos três selos", () => {
    expect(hasAnyTick(entries.s1)).toBe(true);
    expect(hasAnyTick(entries.s2)).toBe(true);
    expect(hasAnyTick(entries.s3)).toBe(true);
  });
  it("ignora whitespace e undefined", () => {
    expect(hasAnyTick(entries.s4)).toBe(false);
    expect(hasAnyTick(undefined)).toBe(false);
  });
});

describe("composeAddress", () => {
  it("junta endereço, cidade e província sem duplicar", () => {
    expect(composeAddress(suppliers[0])).toBe("Rua A, 123, Ningbo, Zhejiang");
  });
  it("monta só com cidade/província quando não há address", () => {
    expect(composeAddress(suppliers[1])).toBe("Guangzhou, Guangdong");
  });
  it("retorna vazio quando não há nenhuma parte", () => {
    expect(composeAddress(suppliers[2])).toBe("");
  });
});

describe("buildNegotiationSuppliers", () => {
  const built = buildNegotiationSuppliers(suppliers, entries);

  it("inclui apenas os ticados (exclui s4)", () => {
    expect(built.map((b) => b.id).sort()).toEqual(["s1", "s2", "s3"]);
  });

  it("ordena por nome (acento-insensitive)", () => {
    expect(built.map((b) => b.name)).toEqual([
      "Alpha Aqua",
      "Beta Glass",
      "Ningbo Pet Co.",
    ]);
  });

  it("traz resumo só quando há texto", () => {
    const s1 = built.find((b) => b.id === "s1")!;
    const s2 = built.find((b) => b.id === "s2")!;
    expect(s1.resumo).toBe("Boa conversa, enviou catálogo.");
    expect(s2.resumo).toBeNull();
  });

  it("mapeia potencial, preço e status livre corretamente", () => {
    const s1 = built.find((b) => b.id === "s1")!;
    expect(s1.potencial).toBe("alto");
    expect(s1.preco).toBe("bom");
    expect(s1.statusLivre).toBe("Aguardando contrato");
  });
});

describe("applyNegotiationFilter", () => {
  const items: NegotiationSupplier[] = buildNegotiationSuppliers(
    suppliers,
    entries,
  );

  it("sem filtro retorna tudo", () => {
    expect(applyNegotiationFilter(items, EMPTY_FILTER)).toHaveLength(3);
  });

  it("filtra por potencial (alto)", () => {
    const res = applyNegotiationFilter(items, {
      ...EMPTY_FILTER,
      potencial: ["alto"],
    });
    expect(res.map((r) => r.id)).toEqual(["s1"]);
  });

  it("filtra por preço (excelente OU bom = OU dentro da dimensão)", () => {
    const res = applyNegotiationFilter(items, {
      ...EMPTY_FILTER,
      preco: ["excelente", "bom"],
    });
    expect(res.map((r) => r.id).sort()).toEqual(["s1", "s2"]);
  });

  it("filtra por status preenchido", () => {
    const res = applyNegotiationFilter(items, {
      ...EMPTY_FILTER,
      statusLivre: "com",
    });
    expect(res.map((r) => r.id).sort()).toEqual(["s1", "s3"]);
  });

  it("combina dimensões com AND (potencial alto E preço bom)", () => {
    const res = applyNegotiationFilter(items, {
      ...EMPTY_FILTER,
      potencial: ["alto"],
      preco: ["bom"],
    });
    expect(res.map((r) => r.id)).toEqual(["s1"]);
  });

  it("AND sem interseção retorna vazio (potencial alto E preço excelente)", () => {
    const res = applyNegotiationFilter(items, {
      ...EMPTY_FILTER,
      potencial: ["alto"],
      preco: ["excelente"],
    });
    expect(res).toHaveLength(0);
  });
});
