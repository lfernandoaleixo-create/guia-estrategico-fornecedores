import { describe, it, expect } from "vitest";
import {
  filterEntriesByTipo,
  type TipoFornecedor,
} from "../client/src/shared/supplier-notes/useSupplierNotes";

// Entradas fake apenas com o campo `fields` (suficiente para o helper).
type FakeEntry = { id: string; fields?: Record<string, string> | null };

const entries: FakeEntry[] = [
  { id: "a", fields: { tipoFornecedor: "direto" } },
  { id: "b", fields: { tipoFornecedor: "trader" } },
  { id: "c", fields: { tipoFornecedor: "direto" } },
  { id: "d", fields: {} }, // sem tipo definido
  { id: "e" }, // sem fields
  { id: "f", fields: null }, // fields nulo
];

describe("filterEntriesByTipo (filtro Fabricante Direto x Trader)", () => {
  it("retorna todas as entradas quando o filtro é null (sem filtro ativo)", () => {
    const result = filterEntriesByTipo(entries, null);
    expect(result).toHaveLength(entries.length);
    expect(result).toEqual(entries);
  });

  it("filtra apenas os fornecedores marcados como 'direto'", () => {
    const result = filterEntriesByTipo(entries, "direto");
    expect(result.map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("filtra apenas os fornecedores marcados como 'trader'", () => {
    const result = filterEntriesByTipo(entries, "trader");
    expect(result.map((e) => e.id)).toEqual(["b"]);
  });

  it("exclui entradas sem tipoFornecedor quando há filtro ativo", () => {
    const direto = filterEntriesByTipo(entries, "direto");
    const trader = filterEntriesByTipo(entries, "trader");
    // d (fields vazio), e (sem fields) e f (fields null) nunca aparecem com filtro ativo
    expect(direto.map((e) => e.id)).not.toContain("d");
    expect(direto.map((e) => e.id)).not.toContain("e");
    expect(direto.map((e) => e.id)).not.toContain("f");
    expect(trader.map((e) => e.id)).not.toContain("d");
    expect(trader.map((e) => e.id)).not.toContain("e");
    expect(trader.map((e) => e.id)).not.toContain("f");
  });

  it("não muta a lista original", () => {
    const snapshot = [...entries];
    filterEntriesByTipo(entries, "direto");
    expect(entries).toEqual(snapshot);
  });

  it("alternar de volta para null mostra todas novamente", () => {
    const filtered = filterEntriesByTipo(entries, "trader");
    expect(filtered.map((e) => e.id)).toEqual(["b"]);
    const all = filterEntriesByTipo(entries, null);
    expect(all).toHaveLength(entries.length);
  });
});

// -----------------------------------------------------------------------------
// Regra de toggle mutuamente exclusivo usada nos checkboxes (card expandido)
// e nos botões de filtro (ReportPanel): clicar no tipo já ativo desmarca (null);
// clicar em outro tipo substitui a seleção.
// -----------------------------------------------------------------------------
function toggleTipo(
  prev: TipoFornecedor | null,
  clicked: TipoFornecedor,
): TipoFornecedor | null {
  return prev === clicked ? null : clicked;
}

describe("toggleTipo (seleção mutuamente exclusiva com toggle)", () => {
  it("marca 'direto' partindo de nada selecionado", () => {
    expect(toggleTipo(null, "direto")).toBe("direto");
  });

  it("clicar novamente em 'direto' desmarca (volta a null)", () => {
    expect(toggleTipo("direto", "direto")).toBeNull();
  });

  it("clicar em 'trader' com 'direto' ativo substitui por 'trader'", () => {
    expect(toggleTipo("direto", "trader")).toBe("trader");
  });

  it("clicar novamente em 'trader' desmarca (volta a null)", () => {
    expect(toggleTipo("trader", "trader")).toBeNull();
  });

  it("nunca permite os dois ativos ao mesmo tempo (sempre 1 ou nenhum)", () => {
    let state: TipoFornecedor | null = null;
    state = toggleTipo(state, "direto");
    expect(state).toBe("direto");
    state = toggleTipo(state, "trader");
    expect(state).toBe("trader");
    state = toggleTipo(state, "trader");
    expect(state).toBeNull();
  });
});
