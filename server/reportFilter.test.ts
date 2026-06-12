import { describe, it, expect } from "vitest";
import {
  filterEntriesByStatus,
  type SupplierStatus,
} from "../client/src/shared/supplier-notes/useSupplierNotes";

// Lista mínima de entradas fake apenas com o campo `status` (suficiente para o helper).
type FakeEntry = { id: string; status: SupplierStatus };

const entries: FakeEntry[] = [
  { id: "a", status: "nao-visitado" },
  { id: "b", status: "contato-feito" },
  { id: "c", status: "contato-feito" },
  { id: "d", status: "amostra-solicitada" },
  { id: "e", status: "fornecedor-aprovado" },
  { id: "f", status: "descartado" },
];

describe("filterEntriesByStatus (filtro por clique nos cards de status)", () => {
  it("retorna todas as entradas quando o filtro é null (nenhum card ativo)", () => {
    const result = filterEntriesByStatus(entries, null);
    expect(result).toHaveLength(entries.length);
    expect(result).toEqual(entries);
  });

  it("filtra apenas as entradas do status selecionado", () => {
    const result = filterEntriesByStatus(entries, "contato-feito");
    expect(result.map((e) => e.id)).toEqual(["b", "c"]);
  });

  it("retorna uma única entrada quando só há um item do status", () => {
    const result = filterEntriesByStatus(entries, "amostra-solicitada");
    expect(result.map((e) => e.id)).toEqual(["d"]);
  });

  it("retorna lista vazia quando nenhum item tem o status (ex.: negociando)", () => {
    const result = filterEntriesByStatus(entries, "negociando");
    expect(result).toHaveLength(0);
  });

  it("não muta a lista original", () => {
    const snapshot = [...entries];
    filterEntriesByStatus(entries, "descartado");
    expect(entries).toEqual(snapshot);
  });

  it("alternar para null novamente (desticar o card) volta a mostrar todas", () => {
    const filtered = filterEntriesByStatus(entries, "fornecedor-aprovado");
    expect(filtered.map((e) => e.id)).toEqual(["e"]);
    const all = filterEntriesByStatus(entries, null);
    expect(all).toHaveLength(entries.length);
  });
});
