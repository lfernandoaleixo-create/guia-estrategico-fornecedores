import { describe, it, expect } from "vitest";
import {
  subgroupIdOf,
  suppliersForSubgroup,
  countSuppliersBySubgroup,
  searchSuppliers,
  normalizeSearch,
  type NotesEntries,
  type SubgroupFilterable,
} from "../client/src/shared/supplier-notes/subgroupFilter";

// Cenário base: 4 fornecedores, alguns vinculados a subgrupos, outros sem.
const suppliers: SubgroupFilterable[] = [
  { id: "a", name: "Zé Coleiras", city: "Yiwu", contactName: "Mr. Wang" },
  { id: "b", name: "Aquário Premium", city: "Jiaxing" },
  { id: "c", name: "Coleira Pet Brasil", province: "São Paulo" },
  { id: "d", name: "Sem Vínculo Co." },
];

const entries: NotesEntries = {
  a: { fields: { subgroupId: "sg_coleira" } },
  b: { fields: { subgroupId: "sg_aquario" } },
  c: { fields: { subgroupId: "sg_coleira" } },
  // d: sem nota / sem subgrupo
};

describe("subgroupIdOf", () => {
  it("retorna o subgroupId vinculado na nota", () => {
    expect(subgroupIdOf(entries, "a")).toBe("sg_coleira");
    expect(subgroupIdOf(entries, "b")).toBe("sg_aquario");
  });

  it("retorna string vazia quando não há nota ou subgrupo", () => {
    expect(subgroupIdOf(entries, "d")).toBe("");
    expect(subgroupIdOf(entries, "inexistente")).toBe("");
  });

  it("trata null/undefined em fields.subgroupId como vazio", () => {
    const e: NotesEntries = {
      x: { fields: { subgroupId: null } },
      y: { fields: {} },
      z: undefined,
    };
    expect(subgroupIdOf(e, "x")).toBe("");
    expect(subgroupIdOf(e, "y")).toBe("");
    expect(subgroupIdOf(e, "z")).toBe("");
  });
});

describe("suppliersForSubgroup", () => {
  it("retorna apenas os fornecedores do subgrupo informado", () => {
    const coleira = suppliersForSubgroup(suppliers, entries, "sg_coleira");
    expect(coleira.map((s) => s.id).sort()).toEqual(["a", "c"]);
  });

  it("retorna fornecedor único quando só há um vínculo", () => {
    const aquario = suppliersForSubgroup(suppliers, entries, "sg_aquario");
    expect(aquario.map((s) => s.id)).toEqual(["b"]);
  });

  it("não inclui fornecedores sem vínculo (evita o bug do 'sumiço')", () => {
    const all = suppliersForSubgroup(suppliers, entries, "sg_coleira");
    expect(all.some((s) => s.id === "d")).toBe(false);
  });

  it("retorna lista vazia para subgroupId inexistente ou vazio", () => {
    expect(suppliersForSubgroup(suppliers, entries, "nao_existe")).toEqual([]);
    expect(suppliersForSubgroup(suppliers, entries, "")).toEqual([]);
  });
});

describe("countSuppliersBySubgroup", () => {
  it("conta corretamente os fornecedores por subgrupo", () => {
    const counts = countSuppliersBySubgroup(suppliers, entries);
    expect(counts["sg_coleira"]).toBe(2);
    expect(counts["sg_aquario"]).toBe(1);
  });

  it("não cria chave para fornecedores sem vínculo", () => {
    const counts = countSuppliersBySubgroup(suppliers, entries);
    expect(Object.keys(counts).sort()).toEqual(["sg_aquario", "sg_coleira"]);
  });

  it("retorna objeto vazio quando nenhum fornecedor tem vínculo", () => {
    const counts = countSuppliersBySubgroup(suppliers, {});
    expect(counts).toEqual({});
  });
});

describe("normalizeSearch / searchSuppliers", () => {
  it("normaliza acentos e caixa", () => {
    expect(normalizeSearch("Aquário PREMIUM")).toBe("aquario premium");
  });

  it("busca insensível a acento e caixa por vários campos", () => {
    const r = searchSuppliers(suppliers, "ze coleiras");
    expect(r.map((s) => s.id)).toEqual(["a"]);
  });

  it("encontra por cidade e por contato", () => {
    expect(searchSuppliers(suppliers, "jiaxing").map((s) => s.id)).toEqual(["b"]);
    expect(searchSuppliers(suppliers, "wang").map((s) => s.id)).toEqual(["a"]);
  });

  it("retorna a lista inteira quando a busca é vazia", () => {
    expect(searchSuppliers(suppliers, "   ").length).toBe(suppliers.length);
  });
});
