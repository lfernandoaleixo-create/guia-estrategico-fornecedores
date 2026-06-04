import { describe, it, expect } from "vitest";

// Replica a lógica de normalização/busca usada na barra de pesquisa do diário
// (client/src/shared/supplier-notes/ReportPanel.tsx). Mantém o comportamento
// testável de forma isolada: minúsculas + remoção de acentos + includes.
function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function filterByName(
  names: string[],
  term: string
): string[] {
  const q = normalizeSearch(term.trim());
  if (!q) return names;
  return names.filter((n) => normalizeSearch(n).includes(q));
}

describe("busca de fornecedor por nome no diário", () => {
  const fornecedores = [
    "99 Gold Data",
    "Shenzhen Aquário Glass Co.",
    "Yiwu Réptil Trading",
    "Guangzhou Tapetes Ltda",
    "Ningbo Equipamentos",
  ];

  it("retorna todos quando a busca está vazia", () => {
    expect(filterByName(fornecedores, "")).toHaveLength(5);
    expect(filterByName(fornecedores, "   ")).toHaveLength(5);
  });

  it("filtra por correspondência parcial, ignorando maiúsculas", () => {
    expect(filterByName(fornecedores, "gold")).toEqual(["99 Gold Data"]);
    expect(filterByName(fornecedores, "GOLD")).toEqual(["99 Gold Data"]);
  });

  it("ignora acentos na busca e no nome", () => {
    // termo sem acento encontra nome com acento
    expect(filterByName(fornecedores, "aquario")).toEqual([
      "Shenzhen Aquário Glass Co.",
    ]);
    // termo com acento encontra nome com acento
    expect(filterByName(fornecedores, "réptil")).toEqual([
      "Yiwu Réptil Trading",
    ]);
    // termo com acento encontra nome (normalização nos dois lados)
    expect(filterByName(fornecedores, "reptil")).toEqual([
      "Yiwu Réptil Trading",
    ]);
  });

  it("retorna vazio quando nenhum nome casa", () => {
    expect(filterByName(fornecedores, "inexistente")).toEqual([]);
  });

  it("busca por número também funciona", () => {
    expect(filterByName(fornecedores, "99")).toEqual(["99 Gold Data"]);
  });
});
