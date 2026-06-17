// =============================================================================
// managedPartners.test.ts — testes da lógica de parceiros avulsos (managed).
//
// Cobre:
//  - parseManagedPartners: parsing robusto do valor de settings (JSON array,
//    valores corrompidos, dedup por forma normalizada, preservação de grafia).
//  - união de parceiros derivados (de fornecedores) + avulsos, sem duplicar.
//  - regra de exclusão: só pode excluir quem NÃO tem vínculo.
// =============================================================================
import { describe, it, expect } from "vitest";
import { parseManagedPartners } from "../client/src/shared/supplier-notes/useManagedPartners";
import { normalizePartner, dedupePartners } from "../client/src/shared/supplier-notes/partners";

describe("parseManagedPartners", () => {
  it("retorna [] para valores vazios/nulos", () => {
    expect(parseManagedPartners(null)).toEqual([]);
    expect(parseManagedPartners(undefined)).toEqual([]);
    expect(parseManagedPartners("")).toEqual([]);
  });

  it("faz parse de um JSON array de strings", () => {
    expect(parseManagedPartners(JSON.stringify(["Betty", "Lilly"]))).toEqual([
      "Betty",
      "Lilly",
    ]);
  });

  it("ignora valores não-string dentro do array", () => {
    expect(parseManagedPartners(JSON.stringify(["Betty", 42, null, "Lilly"]))).toEqual([
      "Betty",
      "Lilly",
    ]);
  });

  it("trata valor corrompido (não-JSON) como vazio", () => {
    expect(parseManagedPartners("{nao eh json")).toEqual([]);
  });

  it("remove duplicados por forma normalizada, preservando a 1ª grafia", () => {
    expect(parseManagedPartners(JSON.stringify(["Betty", " betty ", "BETTY"]))).toEqual([
      "Betty",
    ]);
  });

  it("descarta strings vazias após trim", () => {
    expect(parseManagedPartners(JSON.stringify(["Betty", "   ", ""]))).toEqual(["Betty"]);
  });
});

// Replica a união feita no PartnerFilterPanel (derivados + avulsos), para
// garantir que a regra de "preservar primeira ocorrência" seja estável.
function unifyPartners(derived: string[], managed: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const s of derived) {
    const k = normalizePartner(s);
    if (k && !byKey.has(k)) byKey.set(k, s);
  }
  for (const m of managed) {
    const k = normalizePartner(m);
    if (k && !byKey.has(k)) byKey.set(k, m);
  }
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

describe("união de parceiros derivados + avulsos", () => {
  it("inclui avulsos que não existem nos fornecedores", () => {
    const result = unifyPartners(["Ana"], ["Betty"]);
    expect(result).toEqual(["Ana", "Betty"]);
  });

  it("não duplica quando o avulso já é derivado (mesmo normalizado)", () => {
    const result = unifyPartners(["Betty"], ["betty"]);
    expect(result).toEqual(["Betty"]);
  });

  it("ordena alfabeticamente em pt-BR", () => {
    const result = unifyPartners(["Zé"], ["Ana", "Bia"]);
    expect(result).toEqual(["Ana", "Bia", "Zé"]);
  });
});

describe("regra de exclusão de parceiro", () => {
  // canDelete = true quando NÃO há vínculo (supplierCount===0 e sem macros).
  function canDelete(supplierCount: number, macros: unknown[]): boolean {
    return !(supplierCount > 0 || macros.length > 0);
  }

  it("permite excluir parceiro sem fornecedores e sem macros", () => {
    expect(canDelete(0, [])).toBe(true);
  });

  it("bloqueia exclusão quando há fornecedores vinculados", () => {
    expect(canDelete(2, [])).toBe(false);
  });

  it("bloqueia exclusão quando há macros vinculados", () => {
    expect(canDelete(0, [{}])).toBe(false);
  });
});

describe("dedupePartners (reuso)", () => {
  it("preserva a primeira grafia ignorando acentos/caixa", () => {
    expect(dedupePartners(["José", "jose", "JOSE"])).toEqual(["José"]);
  });
});
