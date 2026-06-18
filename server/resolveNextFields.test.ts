import { describe, it, expect } from "vitest";
import { resolveNextFields } from "../client/src/shared/supplier-notes/useSupplierNotes";

describe("resolveNextFields", () => {
  it("DESMARCAR: com replaceFields=true, a chave removida NÃO reaparece (bug do selo voltando)", () => {
    const base = { potencial: "alto", precoClassificacao: "bom" };
    // O painel desmarca o potencial e envia o conjunto completo SEM a chave.
    const patch = { precoClassificacao: "bom" };
    const result = resolveNextFields(base, patch, true);
    expect(result.potencial).toBeUndefined();
    expect(result.precoClassificacao).toBe("bom");
  });

  it("DESMARCAR preço: com replaceFields=true remove precoClassificacao", () => {
    const base = { potencial: "alto", precoClassificacao: "bom" };
    const patch = { potencial: "alto" };
    const result = resolveNextFields(base, patch, true);
    expect(result.precoClassificacao).toBeUndefined();
    expect(result.potencial).toBe("alto");
  });

  it("MERGE (padrão): sem replaceFields, um patch parcial preserva as outras chaves", () => {
    const base = { potencial: "alto", precoClassificacao: "bom" };
    // Chamada parcial típica (ex.: vincular subgrupo) não deve apagar o resto.
    const patch = { subgroupId: "sg13" };
    const result = resolveNextFields(base, patch, false);
    expect(result.potencial).toBe("alto");
    expect(result.precoClassificacao).toBe("bom");
    expect(result.subgroupId).toBe("sg13");
  });

  it("MERGE preserva a chave antiga (comportamento que causava o bug quando usado para desmarcar)", () => {
    const base = { potencial: "alto" };
    const patch = {}; // tentar 'desmarcar' via merge NÃO remove
    const result = resolveNextFields(base, patch, false);
    expect(result.potencial).toBe("alto");
  });

  it("sem patch.fields: mantém a base inalterada", () => {
    const base = { potencial: "medio" };
    const result = resolveNextFields(base, undefined, true);
    expect(result).toEqual(base);
  });

  it("replaceFields com objeto vazio limpa TODOS os fields", () => {
    const base = { potencial: "alto", precoClassificacao: "ruim", statusLivre: "x" };
    const result = resolveNextFields(base, {}, true);
    expect(result).toEqual({});
  });
});
