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
import type { AttachmentCategory, SupplierAttachment } from "./useSupplierNotes";
import { parsePartners } from "./partners";

/**
 * Origem dos fornecedores de um acesso. Define QUAL fonte o Nível 3 deve
 * consultar e COMO filtrar:
 *  - "aquario-subtipo": scope "aquario", filtrar por fields.subtipoAquario.
 *  - "aquario-subgroup": scope "aquario", filtrar por fields.subgroupId.
 *  - "dashboard": scope = refId (tapete/yiwu/aquario), todos os custom suppliers.
 *  - "group": ExtraSuppliers com groupId === refId, notas no scope "grupo-<refId>".
 */
export type AccessSource =
  | "aquario-subtipo"
  | "aquario-subgroup"
  | "dashboard"
  | "group";

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

  // ── Resolução da fonte de fornecedores (Nível 3) ──────────────────────────
  /** De onde vêm os fornecedores deste acesso. */
  source: AccessSource;
  /** Slug do dashboard/recurso (ex.: "aquario", "tapete", "yiwu", id do grupo). */
  refId: string;
  /** Para source "aquario-subtipo": "terrario" | "aquario". */
  subtipo?: string | null;
  /** Para source "aquario-subgroup": id do subgrupo numerado na tabela. */
  subgroupId?: string | null;
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
 * Deriva a fonte de fornecedores a partir de um MacroItem (macro.items).
 * Usa a `key` (estável) e o `kind`/`subtipo`/`refId` definidos no macroCatalog.
 */
function sourceFromItem(it: MacroItem): {
  source: AccessSource;
  subtipo?: string | null;
} {
  // Aquário dividido por subtipo (Terrário/Aquário) — key "subgroup:aquario:*".
  if (it.refId === "aquario" && it.subtipo) {
    return { source: "aquario-subtipo", subtipo: it.subtipo };
  }
  if (it.kind === "group") return { source: "group" };
  // tapete / yiwu / aquario (sem subtipo)
  return { source: "dashboard" };
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
  // Indexa subgrupos numerados pelo nome normalizado para casar com itens.
  const norm = (s: string) => s.trim().toLowerCase();
  const subgroupByLabel = new Map<string, Subgroup>();
  for (const sg of subgroups) subgroupByLabel.set(norm(sg.name), sg);
  const usedSubgroupIds = new Set<string>();

  // 1) Itens do macro (macro.items) PRESERVAM sua posição e seu ícone/kind.
  //    Se um item coincide com um subgrupo numerado (mesmo nome), apenas
  //    AGREGAMOS o vínculo do subgrupo (filtro por subgroupId), SEM trocar o
  //    ícone, sem virar "badge numérico" e sem reordenar.
  const fromItems: MacroAccess[] = (macro.items ?? []).map((it, idx) => {
    const { source, subtipo } = sourceFromItem(it);
    const matchSg = subgroupByLabel.get(norm(it.label));
    if (matchSg) usedSubgroupIds.add(matchSg.id);
    return {
      id: it.key || `item-${idx}`,
      // Mantém o ícone/kind do item; o número do subgrupo NÃO vira o chip.
      badge: null,
      label: it.label,
      subtitle: it.label === matchSg?.name ? matchSg?.subtitle || null : null,
      color: macro.color,
      kind: it.kind,
      iconUrl: iconUrlForLabel(it.label),
      source: matchSg ? ("aquario-subgroup" as const) : source,
      refId: matchSg ? "aquario" : it.refId,
      subtipo: subtipo ?? null,
      subgroupId: matchSg ? matchSg.id : null,
    };
  });

  // 2) Subgrupos numerados que NÃO casam com nenhum item entram como acesso
  //    próprio (chip com o número x.y), ao fim da lista.
  const fromSubgroups: MacroAccess[] = subgroups
    .filter((sg) => !usedSubgroupIds.has(sg.id))
    .map((sg) => ({
      id: sg.id,
      badge: formatSubgroupNumber(macro.number, sg.sub),
      label: sg.name,
      subtitle: sg.subtitle || null,
      color: sg.color,
      kind: "subgroup" as const,
      iconUrl: iconUrlForLabel(sg.name),
      source: "aquario-subgroup" as const,
      refId: "aquario",
      subgroupId: sg.id,
    }));

  return [...fromItems, ...fromSubgroups];
}

// =============================================================================
// Nível 3 — seleção e filtragem de fornecedores "ticados" de um acesso.
//
// Um fornecedor entra na lista do Nível 3 quando tem AO MENOS UM dos selos
// preenchidos: potencial, preço (precoClass) OU status livre (statusLivre).
// Os campos vivem em entry.fields. Mantido puro para testes de unidade.
// =============================================================================

/** Forma mínima de um fornecedor para o Nível 3 (nome + endereço). */
export interface NegotiationSupplierInput {
  id: string;
  name: string;
  city?: string | null;
  province?: string | null;
  district?: string | null;
  address?: string | null;
}

/** Forma mínima de uma nota (entry) para o Nível 3. */
export interface NegotiationNoteInput {
  fields?: Record<string, string> | null;
  attachments?: SupplierAttachment[] | null;
}

/**
 * Anexos agrupados por categoria. Guarda os OBJETOS completos (não só os nomes)
 * para que o card consiga visualizar (lightbox) e baixar cada arquivo.
 */
export type AnexosPorCategoria = Record<AttachmentCategory, SupplierAttachment[]>;

function emptyAnexos(): AnexosPorCategoria {
  return { catalogos: [], fotos: [], cotacoes: [], outros: [] };
}

/** Agrupa os anexos de uma nota por categoria, preservando os objetos completos. */
export function groupAttachmentsByCategory(
  attachments: SupplierAttachment[] | null | undefined,
): AnexosPorCategoria {
  const out = emptyAnexos();
  for (const a of attachments ?? []) {
    const cat: AttachmentCategory = a.category ?? "outros";
    const name = (a.name ?? "").trim();
    if (name) out[cat].push(a);
  }
  return out;
}

/** Item resultante exibido no Nível 3. */
export interface NegotiationSupplier {
  id: string;
  name: string;
  /** Endereço composto para exibição/mapa (cidade, província, endereço). */
  addressText: string;
  /** Partes de endereço separadas, para o mapa exibir cidade/distrito. */
  address: string | null;
  city: string | null;
  province: string | null;
  district: string | null;
  potencial: string | null;
  preco: string | null;
  statusLivre: string | null;
  /** Resumo da negociação (observacoes), só quando houver texto. */
  resumo: string | null;
  /** Tipo do fornecedor: "direto" | "trader" | null (não marcado). */
  tipoFornecedor: string | null;
  /** Lista completa de parceiros chineses responsáveis. */
  parceiros: string[];
  /** Anexos agrupados por categoria, com nomes completos dos arquivos. */
  anexos: AnexosPorCategoria;
}

/** Monta o texto de endereço a partir das partes disponíveis. */
export function composeAddress(s: NegotiationSupplierInput): string {
  const parts = [s.address, s.city, s.province]
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0);
  // Remove duplicatas mantendo ordem (ex.: cidade repetida no address).
  const seen = new Set<string>();
  const uniq = parts.filter((p) => {
    const k = p.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return uniq.join(", ");
}

/**
 * Decide se um fornecedor está "ticado" (tem ao menos um selo preenchido).
 * Vazio/whitespace conta como NÃO preenchido.
 */
export function hasAnyTick(note: NegotiationNoteInput | undefined): boolean {
  const f = note?.fields ?? {};
  const potencial = (f.potencial ?? "").trim();
  const preco = (f.precoClassificacao ?? "").trim();
  const statusLivre = (f.statusLivre ?? "").trim();
  return potencial !== "" || preco !== "" || statusLivre !== "";
}

/**
 * Constrói a lista de fornecedores ticados de um acesso, juntando os dados de
 * cadastro (nome/endereço) com a respectiva nota (selos + resumo).
 * `entries` é o mapa supplierId -> nota do scope correspondente.
 */
export function buildNegotiationSuppliers(
  suppliers: NegotiationSupplierInput[],
  entries: Record<string, NegotiationNoteInput | undefined>,
): NegotiationSupplier[] {
  const out: NegotiationSupplier[] = [];
  for (const s of suppliers) {
    const note = entries[s.id];
    if (!hasAnyTick(note)) continue;
    const f = note?.fields ?? {};
    const resumoRaw = (f.resumoNegociacao ?? "").trim();
    out.push({
      id: s.id,
      name: s.name,
      addressText: composeAddress(s),
      address: (s.address ?? "").trim() || null,
      city: (s.city ?? "").trim() || null,
      province: (s.province ?? "").trim() || null,
      district: (s.district ?? "").trim() || null,
      potencial: (f.potencial ?? "").trim() || null,
      preco: (f.precoClassificacao ?? "").trim() || null,
      statusLivre: (f.statusLivre ?? "").trim() || null,
      resumo: resumoRaw || null,
      tipoFornecedor: (f.tipoFornecedor ?? "").trim() || null,
      parceiros: parsePartners(f),
      anexos: groupAttachmentsByCategory(note?.attachments),
    });
  }
  // Ordena por nome (case/acento-insensitive) para leitura estável.
  out.sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  );
  return out;
}

/** Critérios de filtro combináveis do Nível 3 (múltiplos ao mesmo tempo). */
export interface NegotiationFilter {
  potencial: string[];
  preco: string[];
  /** Filtro de status: "com" exige statusLivre preenchido; vazio = sem filtro. */
  statusLivre: "any" | "com";
}

export const EMPTY_FILTER: NegotiationFilter = {
  potencial: [],
  preco: [],
  statusLivre: "any",
};

/**
 * Aplica os filtros combináveis. Dentro de uma dimensão (ex.: potencial) o
 * critério é OU; entre dimensões diferentes é E (AND).
 */
export function applyNegotiationFilter(
  items: NegotiationSupplier[],
  filter: NegotiationFilter,
): NegotiationSupplier[] {
  return items.filter((it) => {
    if (filter.potencial.length > 0) {
      if (!it.potencial || !filter.potencial.includes(it.potencial))
        return false;
    }
    if (filter.preco.length > 0) {
      if (!it.preco || !filter.preco.includes(it.preco)) return false;
    }
    if (filter.statusLivre === "com") {
      if (!it.statusLivre) return false;
    }
    return true;
  });
}
