// =============================================================================
// macroCatalog — define o CATÁLOGO de itens que podem ser atribuídos a um macro.
//
// Um item de macro pode ser:
//  - "dashboard": um dos 3 dashboards fixos sem subdivisão (tapete, yiwu)
//  - "subgroup":  uma especialidade dentro de um dashboard (aquario → terrário/aquário)
//  - "group":     um grupo personalizado promovido a dashboard
//
// A `key` é estável e única — é o identificador usado para garantir que um item
// pertence a no máximo um macro.
// =============================================================================
import type { MacroItem } from "./useMacros";

/**
 * Itens fixos derivados dos 3 dashboards principais.
 * O dashboard de Aquários & Terrários é dividido em DOIS subgrupos atribuíveis
 * (Terrário e Aquário), ambos apontando para a MESMA rota /aquario com filtro.
 */
export const FIXED_MACRO_ITEMS: MacroItem[] = [
  {
    key: "subgroup:aquario:terrario",
    kind: "subgroup",
    refId: "aquario",
    label: "Terrário",
    href: "/aquario?subtipo=terrario",
    subtipo: "terrario",
  },
  {
    key: "subgroup:aquario:aquario",
    kind: "subgroup",
    refId: "aquario",
    label: "Aquário",
    href: "/aquario?subtipo=aquario",
    subtipo: "aquario",
  },
  {
    key: "dashboard:tapete",
    kind: "dashboard",
    refId: "tapete",
    label: "Tapete Higiênico Pet",
    href: "/tapete",
    subtipo: null,
  },
  {
    key: "dashboard:yiwu",
    kind: "dashboard",
    refId: "yiwu",
    label: "Yiwu Intel",
    href: "/yiwu",
    subtipo: null,
  },
];

/** Constrói o item de macro para um grupo personalizado promovido. */
export function groupMacroItem(group: {
  id: string;
  name: string;
}): MacroItem {
  return {
    key: `group:${group.id}`,
    kind: "group",
    refId: group.id,
    label: group.name,
    href: `/grupo/${group.id}`,
    subtipo: null,
  };
}

/**
 * Monta a lista completa de itens atribuíveis a partir dos grupos promovidos.
 * Mantém os itens fixos primeiro, depois os grupos promovidos (exceto o nº 0,
 * que está oculto da Home por enquanto).
 */
export function buildCatalog(
  promotedGroups: { id: string; name: string; number: number }[],
): MacroItem[] {
  const promotedItems = promotedGroups
    .filter((g) => g.number !== 0)
    .map((g) => groupMacroItem(g));
  return [...FIXED_MACRO_ITEMS, ...promotedItems];
}
