import { describe, it, expect } from "vitest";
import {
  POTENCIAL_CONFIG,
  POTENCIAL_ORDER,
  filterEntriesByPotencial,
  type Potencial,
} from "../client/src/shared/supplier-notes/useSupplierNotes";

// =============================================================================
// Feature 26 — Potencial do fornecedor (Alto/Médio/Baixo) + Resumo da negociação
// Cobre a configuração de cores/ordem, o filtro por potencial e a convenção de
// persistência do resumo dentro de fields.resumoNegociacao.
// =============================================================================

describe("POTENCIAL_CONFIG", () => {
  it("define as quatro classificações na ordem Alto > Médio/Alto > Médio > Baixo", () => {
    expect(POTENCIAL_ORDER).toEqual(["alto", "medio_alto", "medio", "baixo"]);
  });

  it("usa verde para alto, azul para médio/alto, laranja para médio e vermelho para baixo", () => {
    // Alto = verde
    expect(POTENCIAL_CONFIG.alto.color).toBe("#166534");
    expect(POTENCIAL_CONFIG.alto.bg).toBe("#dcfce7");
    // Médio/Alto = azul
    expect(POTENCIAL_CONFIG.medio_alto.color).toBe("#1e40af");
    expect(POTENCIAL_CONFIG.medio_alto.bg).toBe("#dbeafe");
    // Médio = laranja
    expect(POTENCIAL_CONFIG.medio.color).toBe("#9a3412");
    expect(POTENCIAL_CONFIG.medio.bg).toBe("#ffedd5");
    // Baixo = vermelho
    expect(POTENCIAL_CONFIG.baixo.color).toBe("#991b1b");
    expect(POTENCIAL_CONFIG.baixo.bg).toBe("#fee2e2");
  });

  it("tem label e shortLabel para cada potencial", () => {
    for (const p of POTENCIAL_ORDER) {
      expect(POTENCIAL_CONFIG[p].label.length).toBeGreaterThan(0);
      expect(POTENCIAL_CONFIG[p].shortLabel.length).toBeGreaterThan(0);
    }
  });
});

describe("filterEntriesByPotencial", () => {
  const entries = [
    { id: "a", fields: { potencial: "alto" } },
    { id: "b", fields: { potencial: "medio" } },
    { id: "c", fields: { potencial: "baixo" } },
    { id: "d", fields: {} },
    { id: "e", fields: null },
    { id: "f", fields: { potencial: "medio_alto" } },
  ];

  it("retorna todas as entradas quando o filtro é null", () => {
    expect(filterEntriesByPotencial(entries, null)).toHaveLength(6);
  });

  it("filtra apenas as entradas do potencial escolhido", () => {
    const altos = filterEntriesByPotencial(entries, "alto" as Potencial);
    expect(altos.map((e) => e.id)).toEqual(["a"]);
    const baixos = filterEntriesByPotencial(entries, "baixo" as Potencial);
    expect(baixos.map((e) => e.id)).toEqual(["c"]);
    const medioAlto = filterEntriesByPotencial(entries, "medio_alto" as Potencial);
    expect(medioAlto.map((e) => e.id)).toEqual(["f"]);
  });

  it("não inclui entradas sem potencial marcado", () => {
    const medios = filterEntriesByPotencial(entries, "medio" as Potencial);
    expect(medios.find((e) => e.id === "d")).toBeUndefined();
    expect(medios.find((e) => e.id === "e")).toBeUndefined();
  });
});

describe("Resumo da negociação — convenção de persistência", () => {
  // O resumo é guardado dentro de fields.resumoNegociacao (sem migração de schema).
  // Simula o merge feito no handleSave do painel.
  function mergeResumo(
    fields: Record<string, string>,
    resumo: string,
  ): Record<string, string> {
    return { ...fields, resumoNegociacao: resumo };
  }

  it("grava o resumo preservando os demais campos", () => {
    const fields = { potencial: "alto", tipoFornecedor: "direto" };
    const next = mergeResumo(fields, "Negociando preço FOB, aguardando amostra.");
    expect(next.potencial).toBe("alto");
    expect(next.tipoFornecedor).toBe("direto");
    expect(next.resumoNegociacao).toBe("Negociando preço FOB, aguardando amostra.");
  });

  it("permite limpar o resumo sem afetar outros campos", () => {
    const fields = { potencial: "medio", resumoNegociacao: "texto antigo" };
    const next = mergeResumo(fields, "");
    expect(next.resumoNegociacao).toBe("");
    expect(next.potencial).toBe("medio");
  });
});
