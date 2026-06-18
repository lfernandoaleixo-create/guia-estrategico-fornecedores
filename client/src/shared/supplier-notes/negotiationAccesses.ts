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
    }));

  return [...fromItems, ...fromSubgroups];
}
