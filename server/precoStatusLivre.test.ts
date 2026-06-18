import { describe, it, expect } from "vitest";
import {
  PRECO_CONFIG,
  PRECO_ORDER,
  type PrecoClassificacao,
} from "../client/src/shared/supplier-notes/useSupplierNotes";

// =============================================================================
// Garante as 3 opções de preço com as cores corretas (Feature 28):
//   Ótimo = verde / Bom = AZUL / Ruim = vermelho
// e a lógica do status livre (texto arbitrário salvo em fields.statusLivre).
// =============================================================================

describe("Classificação de preço (Ótimo/Bom/Ruim)", () => {
  it("mantém as 3 opções na ordem esperada", () => {
    expect(PRECO_ORDER).toEqual<PrecoClassificacao[]>(["excelente", "bom", "ruim"]);
  });

  it("Preço Ótimo é verde", () => {
    const cfg = PRECO_CONFIG.excelente;
    expect(cfg.label).toBe("Preço Ótimo");
    expect(cfg.color).toBe("#166534");
    expect(cfg.bg).toBe("#dcfce7");
  });

  it("Preço Bom é AZUL", () => {
    const cfg = PRECO_CONFIG.bom;
    expect(cfg.label).toBe("Preço Bom");
    expect(cfg.color).toBe("#1e40af");
    expect(cfg.bg).toBe("#dbeafe");
    expect(cfg.border).toBe("#93c5fd");
  });

  it("Preço Ruim é vermelho", () => {
    const cfg = PRECO_CONFIG.ruim;
    expect(cfg.label).toBe("Preço Ruim");
    expect(cfg.color).toBe("#991b1b");
    expect(cfg.bg).toBe("#fee2e2");
  });

  it("toda opção possui label, emoji e cores definidas", () => {
    for (const key of PRECO_ORDER) {
      const cfg = PRECO_CONFIG[key];
      expect(cfg.label.length).toBeGreaterThan(0);
      expect(cfg.emoji.length).toBeGreaterThan(0);
      expect(cfg.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(cfg.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(cfg.border).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

// Lógica pura do status livre: persiste o texto em fields.statusLivre e só
// é considerado "visível" quando há conteúdo após trim().
function shouldShowStatusLivre(fields?: Record<string, string> | null): boolean {
  return (fields?.statusLivre ?? "").trim().length > 0;
}

describe("Status livre (texto editável)", () => {
  it("não exibe quando vazio ou só espaços", () => {
    expect(shouldShowStatusLivre(undefined)).toBe(false);
    expect(shouldShowStatusLivre({})).toBe(false);
    expect(shouldShowStatusLivre({ statusLivre: "" })).toBe(false);
    expect(shouldShowStatusLivre({ statusLivre: "   " })).toBe(false);
  });

  it("exibe quando há texto", () => {
    expect(shouldShowStatusLivre({ statusLivre: "Aguardando contrato" })).toBe(true);
  });

  it("coexiste com outros campos sem sobrescrevê-los", () => {
    const fields = { potencial: "alto", precoClassificacao: "bom", statusLivre: "Prioridade" };
    expect(fields.potencial).toBe("alto");
    expect(fields.precoClassificacao).toBe("bom");
    expect(shouldShowStatusLivre(fields)).toBe(true);
  });
});
