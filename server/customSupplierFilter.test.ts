import { describe, it, expect } from "vitest";
import { filterSuppliersBySubtipo } from "../client/src/shared/supplier-notes/customSupplierFilter";

interface Item {
  id: string;
  name: string;
}

const itemA: Item = { id: "a", name: "Water-Cleaner (aquario)" };
const itemT: Item = { id: "t", name: "Jiarong (terrario)" };
const itemX: Item = { id: "x", name: "Sem especialidade" };

const all: Item[] = [itemA, itemT, itemX];
const specialty: Record<string, "aquario" | "terrario"> = {
  a: "aquario",
  t: "terrario",
};

describe("filterSuppliersBySubtipo", () => {
  it("retorna todos quando filtro é null (visão geral)", () => {
    expect(filterSuppliersBySubtipo(all, null, specialty)).toEqual(all);
  });

  it("retorna todos quando filtro é undefined", () => {
    expect(filterSuppliersBySubtipo(all, undefined, specialty)).toEqual(all);
  });

  it("mostra somente os marcados como aquario", () => {
    const res = filterSuppliersBySubtipo(all, "aquario", specialty);
    expect(res).toEqual([itemA]);
  });

  it("mostra somente os marcados como terrario", () => {
    const res = filterSuppliersBySubtipo(all, "terrario", specialty);
    expect(res).toEqual([itemT]);
  });

  it("esconde fornecedores sem especialidade nas visões filtradas", () => {
    const aquario = filterSuppliersBySubtipo(all, "aquario", specialty);
    const terrario = filterSuppliersBySubtipo(all, "terrario", specialty);
    expect(aquario.find((s) => s.id === "x")).toBeUndefined();
    expect(terrario.find((s) => s.id === "x")).toBeUndefined();
  });

  it("um fornecedor de terrario NÃO aparece na visão aquario (caso do bug relatado)", () => {
    const aquario = filterSuppliersBySubtipo(all, "aquario", specialty);
    expect(aquario.find((s) => s.id === "t")).toBeUndefined();
  });

  it("retorna lista vazia quando nenhum item corresponde", () => {
    const res = filterSuppliersBySubtipo([itemX], "aquario", specialty);
    expect(res).toEqual([]);
  });

  it("não muta a lista original", () => {
    const copy = [...all];
    filterSuppliersBySubtipo(all, "aquario", specialty);
    expect(all).toEqual(copy);
  });
});
