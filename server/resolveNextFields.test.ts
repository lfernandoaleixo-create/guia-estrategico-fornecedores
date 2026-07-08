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

  it("replaceFields com objeto vazio limpa fields NÃO-estruturais, preserva subgroupId", () => {
    const base = { potencial: "alto", precoClassificacao: "ruim", statusLivre: "x", subgroupId: "sg99" };
    const result = resolveNextFields(base, {}, true);
    // Campos não-estruturais foram removidos; subgroupId preservado.
    expect(result.potencial).toBeUndefined();
    expect(result.subgroupId).toBe("sg99");
  });

  it("PROTEGE subgroupId: replaceFields=true sem subgroupId no patch preserva o da base", () => {
    const base = { potencial: "alto", subgroupId: "sg_abc", subtipoAquario: "terrario" };
    const patch = { potencial: "medio", resumoNegociacao: "teste" };
    const result = resolveNextFields(base, patch, true);
    expect(result.potencial).toBe("medio");
    expect(result.subgroupId).toBe("sg_abc");
    expect(result.subtipoAquario).toBe("terrario");
    expect(result.resumoNegociacao).toBe("teste");
  });

  it("PROTEGE subgroupId: se o patch INCLUI subgroupId explicitamente, usa o do patch", () => {
    const base = { subgroupId: "sg_old" };
    const patch = { subgroupId: "sg_new", potencial: "alto" };
    const result = resolveNextFields(base, patch, true);
    expect(result.subgroupId).toBe("sg_new");
  });

  it("NÃO protege subgroupId vazio na base", () => {
    const base = { potencial: "alto", subgroupId: "" };
    const patch = { potencial: "medio" };
    const result = resolveNextFields(base, patch, true);
    expect(result.subgroupId).toBeUndefined();
  });
});
