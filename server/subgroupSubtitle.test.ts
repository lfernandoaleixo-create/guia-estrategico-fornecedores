import { describe, it, expect } from "vitest";

/**
 * Regra do subtítulo editável do subgrupo (card da Home e topo do dashboard):
 * - Se houver `subtitle` com texto não-vazio (após trim), usa ele.
 * - Caso contrário, usa o fallback "Subgrupo do macro".
 *
 * Regra do eyebrow (rótulo pequeno do topo):
 * - Passa a exibir o NOME do dashboard (subgroup.name), não mais "SUBGRUPO {n}".
 */
function resolveSubgroupSubtitle(subtitle?: string | null): string {
  const trimmed = (subtitle ?? "").trim();
  return trimmed.length > 0 ? trimmed : "Subgrupo do macro";
}

function resolveSubgroupEyebrow(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? trimmed : "Subgrupo";
}

describe("subtítulo editável do subgrupo", () => {
  it("usa o subtítulo quando preenchido", () => {
    expect(resolveSubgroupSubtitle("Coleiras premium · foco em exportação")).toBe(
      "Coleiras premium · foco em exportação",
    );
  });

  it("faz fallback quando vazio", () => {
    expect(resolveSubgroupSubtitle("")).toBe("Subgrupo do macro");
  });

  it("faz fallback quando só espaços", () => {
    expect(resolveSubgroupSubtitle("   ")).toBe("Subgrupo do macro");
  });

  it("faz fallback quando null/undefined", () => {
    expect(resolveSubgroupSubtitle(null)).toBe("Subgrupo do macro");
    expect(resolveSubgroupSubtitle(undefined)).toBe("Subgrupo do macro");
  });

  it("preserva acentos e separadores", () => {
    expect(resolveSubgroupSubtitle("Foco em exportação · Ásia")).toBe(
      "Foco em exportação · Ásia",
    );
  });
});

describe("eyebrow do subgrupo = nome do dashboard", () => {
  it("usa o nome do dashboard", () => {
    expect(resolveSubgroupEyebrow("Coleiras pra cachorro")).toBe(
      "Coleiras pra cachorro",
    );
  });

  it("faz fallback quando nome vazio", () => {
    expect(resolveSubgroupEyebrow("")).toBe("Subgrupo");
    expect(resolveSubgroupEyebrow(null)).toBe("Subgrupo");
  });
});
