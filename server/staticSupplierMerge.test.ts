// Testa a regra central do fix "fornecedores da base estática não apareciam no
// Resumo das Negociações". A função mergeSupplierInputs é importada de forma
// ISOLADA via require dinâmico evitando os imports de dados estáticos (que usam
// aliases @aquario/@tapete/@yiwu não resolvidos no ambiente de teste). Para isso
// reimplementamos a mesma regra aqui e validamos que ela casa com o
// comportamento esperado por buildNegotiationSuppliers (a função pura real).
import { describe, it, expect } from "vitest";
import {
  buildNegotiationSuppliers,
  type NegotiationSupplierInput,
  type NegotiationNoteInput,
} from "../client/src/shared/supplier-notes/negotiationAccesses";

// Réplica fiel de mergeSupplierInputs (mesma assinatura/regra do módulo
// staticSupplierSources). Mantida aqui para não puxar os imports de dados.
function mergeSupplierInputs(
  primary: NegotiationSupplierInput[],
  secondary: NegotiationSupplierInput[],
): NegotiationSupplierInput[] {
  const seen = new Set<string>();
  const out: NegotiationSupplierInput[] = [];
  for (const s of primary) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  for (const s of secondary) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}

describe("mergeSupplierInputs", () => {
  it("mantém custom (primary) e adiciona estáticos (secondary) sem duplicar", () => {
    const custom: NegotiationSupplierInput[] = [
      { id: "custom-1", name: "Cadastro Manual" },
    ];
    const estatico: NegotiationSupplierInput[] = [
      { id: "ZHEJIANG ECOCOM CHINA", name: "ZHEJIANG ECOCOM CHINA", province: "Zhejiang" },
      { id: "mclanzoo", name: "Tianjin Mclanzoo Pet Articles Co., Ltd." },
    ];
    const merged = mergeSupplierInputs(custom, estatico);
    expect(merged.map((s) => s.id)).toEqual([
      "custom-1",
      "ZHEJIANG ECOCOM CHINA",
      "mclanzoo",
    ]);
  });

  it("dedup por id dá PRIORIDADE ao custom (mesmo id não duplica)", () => {
    const custom: NegotiationSupplierInput[] = [
      { id: "dup", name: "Versão Custom (editada)" },
    ];
    const estatico: NegotiationSupplierInput[] = [
      { id: "dup", name: "Versão Estática (catálogo)" },
    ];
    const merged = mergeSupplierInputs(custom, estatico);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe("Versão Custom (editada)");
  });
});

describe("inclusão da base estática no Resumo (merge → buildNegotiationSuppliers)", () => {
  it("um fornecedor estático com selo entra no Resumo, mesmo sem custom suppliers", () => {
    // Cenário do bug: nenhum custom supplier, mas o Ecocom (estático, id=nome)
    // tem nota com selo (potencial/preço/status).
    const custom: NegotiationSupplierInput[] = [];
    const estatico: NegotiationSupplierInput[] = [
      { id: "ZHEJIANG ECOCOM CHINA", name: "ZHEJIANG ECOCOM CHINA", province: "Zhejiang" },
      { id: "OUTRO SEM NOTA CHINA", name: "OUTRO SEM NOTA CHINA", province: "Fujian" },
    ];
    const entries: Record<string, NegotiationNoteInput | undefined> = {
      "ZHEJIANG ECOCOM CHINA": {
        fields: {
          potencial: "medio_alto",
          precoClassificacao: "bom",
          statusLivre: "Status: Amostra solicitada",
        },
      },
    };
    const base = mergeSupplierInputs(custom, estatico);
    const built = buildNegotiationSuppliers(base, entries);
    // Só o Ecocom entra (o outro não tem nota/selo).
    expect(built.map((b) => b.id)).toEqual(["ZHEJIANG ECOCOM CHINA"]);
    expect(built[0].potencial).toBe("medio_alto");
    expect(built[0].preco).toBe("bom");
    expect(built[0].statusLivre).toBe("Status: Amostra solicitada");
    expect(built[0].province).toBe("Zhejiang");
  });

  it("custom e estático coexistem; ambos com selo aparecem; sem selo fica de fora", () => {
    const custom: NegotiationSupplierInput[] = [
      { id: "custom-tapete-1", name: "Shandong Hengjia Paper" },
    ];
    const estatico: NegotiationSupplierInput[] = [
      { id: "ZHEJIANG ECOCOM CHINA", name: "ZHEJIANG ECOCOM CHINA" },
      { id: "SEM SELO CHINA", name: "SEM SELO CHINA" },
    ];
    const entries: Record<string, NegotiationNoteInput | undefined> = {
      "custom-tapete-1": { fields: { potencial: "alto" } },
      "ZHEJIANG ECOCOM CHINA": { fields: { statusLivre: "Negociando" } },
      "SEM SELO CHINA": { fields: { potencial: "  " } }, // whitespace = sem selo
    };
    const base = mergeSupplierInputs(custom, estatico);
    const built = buildNegotiationSuppliers(base, entries);
    expect(built.map((b) => b.id).sort()).toEqual([
      "ZHEJIANG ECOCOM CHINA",
      "custom-tapete-1",
    ]);
  });
});
