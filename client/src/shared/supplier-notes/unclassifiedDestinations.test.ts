// =============================================================================
// Testes para a derivação dos destinos "Sem classificação macro" usados no
// modal MigrateToMacroButton (opção A: migrar contatos de volta para destinos
// que não pertencem a nenhum macro, como o dashboard Yiwu).
//
// A função pura abaixo replica exatamente o filtro de `unclassifiedItems`
// definido em MigrateToMacroButton.tsx, para garantir cobertura sem depender
// de hooks React.
// =============================================================================
import { describe, it, expect } from "vitest";
import { buildCatalog } from "./macroCatalog";
import type { MacroItem } from "./useMacros";

/** Replica do filtro de unclassifiedItems (mantido em sincronia com o componente). */
function deriveUnclassified(args: {
  promotedGroups: { id: string; name: string; number: number }[];
  assignedKeys: Set<string>;
  fromScope: string;
}): MacroItem[] {
  const { promotedGroups, assignedKeys, fromScope } = args;
  const catalog = buildCatalog(promotedGroups);
  return catalog.filter((it) => {
    if (assignedKeys.has(it.key)) return false;
    if (it.kind === "group" && fromScope === `grupo-${it.refId}`) return false;
    if (it.kind !== "group" && fromScope === it.refId) return false;
    return true;
  });
}

describe("destinos sem classificação macro", () => {
  // Estado real do projeto: Aquário (terrário/aquário) + Tapete + 3 grupos
  // estão atribuídos a macros; apenas o dashboard:yiwu fica sem macro.
  const assignedKeys = new Set<string>([
    "subgroup:aquario:terrario",
    "subgroup:aquario:aquario",
    "dashboard:tapete",
    "group:cgrp_a",
    "group:cgrp_b",
    "group:cgrp_c",
  ]);
  const promotedGroups = [
    { id: "cgrp_a", name: "Grupo A", number: 1 },
    { id: "cgrp_b", name: "Grupo B", number: 2 },
    { id: "cgrp_c", name: "Grupo C", number: 3 },
  ];

  it("não oferece nenhum destino quando a origem é o próprio Yiwu", () => {
    const items = deriveUnclassified({
      promotedGroups,
      assignedKeys,
      fromScope: "yiwu",
    });
    expect(items).toHaveLength(0);
  });

  it("oferece o Yiwu como destino quando a origem é o Tapete", () => {
    const items = deriveUnclassified({
      promotedGroups,
      assignedKeys,
      fromScope: "tapete",
    });
    expect(items).toHaveLength(1);
    expect(items[0].refId).toBe("yiwu");
    expect(items[0].kind).toBe("dashboard");
  });

  it("oferece o Yiwu como destino quando a origem é o Aquário", () => {
    const items = deriveUnclassified({
      promotedGroups,
      assignedKeys,
      fromScope: "aquario",
    });
    expect(items.map((i) => i.refId)).toContain("yiwu");
  });

  it("inclui um dashboard recém-desatribuído de macro como destino sem classificação", () => {
    // Se o Tapete for removido de seu macro, ele também vira destino sem macro.
    const partial = new Set(assignedKeys);
    partial.delete("dashboard:tapete");
    const items = deriveUnclassified({
      promotedGroups,
      assignedKeys: partial,
      fromScope: "aquario",
    });
    const refs = items.map((i) => i.refId);
    expect(refs).toContain("yiwu");
    expect(refs).toContain("tapete");
  });

  it("exclui a própria origem mesmo entre vários destinos sem macro", () => {
    const partial = new Set(assignedKeys);
    partial.delete("dashboard:tapete");
    const items = deriveUnclassified({
      promotedGroups,
      assignedKeys: partial,
      fromScope: "tapete",
    });
    const refs = items.map((i) => i.refId);
    expect(refs).toContain("yiwu");
    expect(refs).not.toContain("tapete"); // origem excluída
  });
});
