import { describe, it, expect } from "vitest";
import {
  SUBTIPO_CONFIG,
  SUBTIPO_ORDER,
  type SubtipoAquario,
} from "../client/src/shared/supplier-notes/useSupplierNotes";

// Replica a lógica de toggle mutuamente exclusivo usada no painel:
// clicar no mesmo subtipo desmarca; clicar no outro troca.
function applySubtipoToggle(
  fields: Record<string, string>,
  clicked: SubtipoAquario,
): Record<string, string> {
  const next = { ...fields };
  if (next.subtipoAquario === clicked) {
    delete next.subtipoAquario;
  } else {
    next.subtipoAquario = clicked;
  }
  return next;
}

describe("SUBTIPO_CONFIG (Especialidade Aquário x Terrário)", () => {
  it("define exatamente as duas opções na ordem esperada", () => {
    expect(SUBTIPO_ORDER).toEqual(["aquario", "terrario"]);
  });

  it("possui label e emoji para cada subtipo", () => {
    expect(SUBTIPO_CONFIG.aquario.label).toBe("Aquário");
    expect(SUBTIPO_CONFIG.aquario.emoji).toBe("🐟");
    expect(SUBTIPO_CONFIG.terrario.label).toBe("Terrário");
    expect(SUBTIPO_CONFIG.terrario.emoji).toBe("🦎");
  });

  it("possui cores (color/bg/border) para cada subtipo", () => {
    for (const key of SUBTIPO_ORDER) {
      const cfg = SUBTIPO_CONFIG[key];
      expect(cfg.color).toMatch(/^#/);
      expect(cfg.bg).toMatch(/^#/);
      expect(cfg.border).toMatch(/^#/);
    }
  });
});

describe("toggle de especialidade (mutuamente exclusivo)", () => {
  it("marca aquário quando não havia nada", () => {
    const result = applySubtipoToggle({}, "aquario");
    expect(result.subtipoAquario).toBe("aquario");
  });

  it("troca de aquário para terrário (mutuamente exclusivo)", () => {
    const result = applySubtipoToggle({ subtipoAquario: "aquario" }, "terrario");
    expect(result.subtipoAquario).toBe("terrario");
  });

  it("desmarca ao clicar no subtipo já selecionado", () => {
    const result = applySubtipoToggle({ subtipoAquario: "terrario" }, "terrario");
    expect(result.subtipoAquario).toBeUndefined();
  });

  it("preserva outros campos da nota ao alterar o subtipo", () => {
    const result = applySubtipoToggle(
      { tipoFornecedor: "direto", precoClassificacao: "competitivo" },
      "aquario",
    );
    expect(result.tipoFornecedor).toBe("direto");
    expect(result.precoClassificacao).toBe("competitivo");
    expect(result.subtipoAquario).toBe("aquario");
  });
});
