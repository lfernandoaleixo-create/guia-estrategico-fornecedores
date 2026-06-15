import { describe, it, expect } from "vitest";
import {
  SUBTIPO_CONFIG,
  SUBTIPO_ORDER,
  type SubtipoAquario,
} from "../client/src/shared/supplier-notes/useSupplierNotes";

// Replica a lógica de toggle mutuamente exclusivo usada no painel:
// clicar no mesmo subtipo DESMARCA (gravando string vazia, nunca delete);
// clicar no outro TROCA. A string vazia é necessária porque o upsertEntry faz
// merge dos campos ({...base.fields, ...patch.fields}); um delete não removeria
// a chave já persistida no banco, então o selo voltaria após o reload.
function applySubtipoToggle(
  fields: Record<string, string>,
  clicked: SubtipoAquario,
): Record<string, string> {
  const raw = fields.subtipoAquario ?? "";
  const current: SubtipoAquario | undefined =
    raw === "aquario" || raw === "terrario" ? raw : undefined;
  const next = { ...fields };
  if (current === clicked) {
    next.subtipoAquario = "";
  } else {
    next.subtipoAquario = clicked;
  }
  return next;
}

// Replica o merge do upsertEntry (fields mesclados, não substituídos).
function mergeFields(
  base: Record<string, string>,
  patch: Record<string, string>,
): Record<string, string> {
  return { ...base, ...patch };
}

// Replica a leitura da especialidade efetiva (string vazia = sem especialidade).
function readSubtipo(fields: Record<string, string>): SubtipoAquario | undefined {
  const raw = fields.subtipoAquario ?? "";
  return raw === "aquario" || raw === "terrario" ? raw : undefined;
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

  it("desmarca ao clicar no subtipo já selecionado (string vazia, não delete)", () => {
    const result = applySubtipoToggle({ subtipoAquario: "terrario" }, "terrario");
    // A chave precisa CONTINUAR presente como string vazia para o merge
    // persistir a remoção; um undefined/delete seria ignorado pelo upsert.
    expect(result).toHaveProperty("subtipoAquario");
    expect(result.subtipoAquario).toBe("");
    expect(readSubtipo(result)).toBeUndefined();
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

describe("persistência do desmarque através do merge do upsertEntry", () => {
  it("o desmarque (string vazia) sobrescreve o valor antigo após o merge", () => {
    const base = { subtipoAquario: "aquario", status: "visitado" };
    const patch = applySubtipoToggle(base, "aquario"); // desmarca
    const merged = mergeFields(base, patch);
    expect(merged.subtipoAquario).toBe("");
    expect(readSubtipo(merged)).toBeUndefined();
  });

  it("REGRESSÃO: um delete não persistiria através do merge (selo voltaria)", () => {
    const base = { subtipoAquario: "aquario" };
    const patchComDelete: Record<string, string> = { ...base };
    delete patchComDelete.subtipoAquario; // abordagem antiga (bug)
    const merged = mergeFields(base, patchComDelete);
    // Com delete, o merge mantém o valor antigo -> bug original.
    expect(merged.subtipoAquario).toBe("aquario");
  });
});
