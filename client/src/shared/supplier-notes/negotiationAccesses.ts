// =============================================================================
// negotiationAccesses — lógica PURA de agregação de "acessos" de um macro para o
// painel "Resumo das Negociações" (NegotiationSummaryPanel).
//
// Um macro expõe seus acessos por DUAS fontes distintas e complementares:
//   1) macro.items  — dashboards/subgrupos/grupos atribuídos ao macro
//                     (ex.: PET → Terrário, Aquário, Tapete Higiênico Pet).
//   2) tabela subgroups (byMacro) — subgrupos numerados "macro.sub"
//                     (ex.: Utensílios → Marmita Plástica = 2.1).
//
// O painel precisa mostrar a UNIÃO das duas, senão macros cujos acessos vivem
// apenas em macro.items (como o PET) apareceriam vazios.
//
// Mantida sem dependências de UI para permitir testes de unidade.
// =============================================================================
import type { Macro, MacroItem } from "./useMacros";
import type { Subgroup } from "./useSubgroups";
import { formatSubgroupNumber } from "./subgroupNumber";

export interface MacroAccess {
  id: string;
  /** Rótulo curto exibido no chip (ex.: "2.1"); null = usar ícone do kind. */
  badge: string | null;
  label: string;
  subtitle?: string | null;
  color: string;
  kind: MacroItem["kind"];
  /**
   * URL de uma imagem (fotinha) a exibir no chip no lugar do badge/ícone.
   * Quando presente, tem prioridade sobre `badge` e o ícone do kind.
   */
  iconUrl?: string | null;
}

// Imagens customizadas por acesso, casadas pelo NOME normalizado do rótulo.
// Permite trocar o número/ícone padrão do chip por uma "fotinha" específica.
const ACCESS_ICON_BY_LABEL: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ["marmita"],
    url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GDUDarDhqx4BsWngn4hyvG/marmita-icon-nAzMyvbXovHYNNfvCjfEu8.webp",
  },
];

function iconUrlForLabel(label: string): string | null {
  const n = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const rule of ACCESS_ICON_BY_LABEL) {
    if (rule.keywords.some((k) => n.includes(k))) return rule.url;
  }
  return null;
}

/**
 * Constrói a lista ordenada de acessos de um macro unindo macro.items e os
 * subgrupos numerados (tabela `subgroups`).
 *
 * Dedup por rótulo normalizado: se um item de macro.items referencia algo que
 * também é um subgrupo numerado (mesmo nome), mantemos o subgrupo numerado
 * (mais informativo, pois traz o número x.y).
 */
export function buildAccesses(
  macro: Macro,
  subgroups: Subgroup[],
): MacroAccess[] {
  const fromSubgroups: MacroAccess[] = subgroups.map((sg) => ({
    id: sg.id,
    badge: formatSubgroupNumber(macro.number, sg.sub),
    label: sg.name,
    subtitle: sg.subtitle || null,
    color: sg.color,
    kind: "subgroup" as const,
    iconUrl: iconUrlForLabel(sg.name),
  }));

  const seen = new Set(fromSubgroups.map((s) => s.label.trim().toLowerCase()));

  const fromItems: MacroAccess[] = (macro.items ?? [])
    .filter((it) => !seen.has(it.label.trim().toLowerCase()))
    .map((it, idx) => ({
      id: it.key || `item-${idx}`,
      badge: null,
      label: it.label,
      subtitle: null,
      color: macro.color,
      kind: it.kind,
      iconUrl: iconUrlForLabel(it.label),
    }));

  return [...fromItems, ...fromSubgroups];
}
