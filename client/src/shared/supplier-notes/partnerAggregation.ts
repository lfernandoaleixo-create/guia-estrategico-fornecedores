// =============================================================================
// partnerAggregation.ts — Agregação GLOBAL por "Parceiro Chinês Responsável"
//
// Dado o conjunto de notas (todos os scopes), os fornecedores (custom + extras),
// os subgrupos e os macros, esta função PURA monta — para CADA parceiro — uma
// árvore organizada:
//
//   Parceiro "Betty"
//     └── Macro Nº 1 · PET
//           └── Subgrupo 1.2 · Aquário
//                 └── Fornecedor "Ghanzhou"  (+ anexos, + co-parceiros)
//
// Objetivo de produto (Fernando): daqui a meses, filtrar "Betty" e ver
// rapidamente em quais macros/subgrupos ela está envolvida e baixar os
// documentos que ela mandou, mostrando também eventuais co-parceiros.
//
// Tudo é resolvido no CLIENTE a partir de dados já carregados — sem novas rotas.
// Mantido como função pura para ser coberto por testes de unidade (vitest).
// =============================================================================

import { normalizePartner, parsePartners } from "./partners";

// ----- Tipos de entrada (subconjuntos do que os hooks já fornecem) -----------

export interface AggNoteAttachment {
  id: string;
  name: string;
  category?: string;
  /** Campos necessários para VISUALIZAR/BAIXAR direto na Home. */
  type?: string;
  size?: number;
  url?: string;
  fileKey?: string;
  dataUrl?: string;
  addedAt?: string;
  /** Pasta nomeada à qual o anexo pertence (quando organizado em pastas). */
  folder?: string;
}

export interface AggNote {
  scope: string;
  supplierId: string;
  fields?: Record<string, string> | null;
  attachments?: AggNoteAttachment[];
}

export interface AggSupplier {
  id: string;
  scope: string; // "aquario" | "tapete" | "yiwu" para custom; "grupo-<id>" não se aplica aqui
  name: string;
}

/** Fornecedores "extras" pertencem a um grupo promovido (via groupId). */
export interface AggExtraSupplier {
  id: string;
  groupId: string;
  name: string;
}

export interface AggSubgroup {
  id: string;
  macroNumber: number;
  sub: number;
  name: string;
  color: string;
}

export interface AggMacroItem {
  key: string; // ex.: "dashboard:aquario", "subgroup:aquario:terrario", "group:<id>"
  refId: string;
  label: string;
  href: string;
}

export interface AggMacro {
  id: string;
  number: number;
  name: string;
  color: string;
  items: AggMacroItem[];
}

// ----- Tipos de saída ---------------------------------------------------------

export interface PartnerSupplierHit {
  scope: string;
  supplierId: string;
  supplierName: string;
  /** Caminho clicável para chegar ao fornecedor (dashboard/grupo). */
  href: string;
  attachments: AggNoteAttachment[];
  /** Outros parceiros que dividem este fornecedor (grafia original, exceto o filtrado). */
  coPartners: string[];
}

export interface PartnerSubgroupNode {
  subgroupId: string | null; // null = sem subgrupo (vínculo só por scope/grupo)
  /** Rótulo do subgrupo (ex.: "1.2 · Aquário") ou do contexto sem subgrupo. */
  label: string;
  color: string;
  suppliers: PartnerSupplierHit[];
}

export interface PartnerMacroNode {
  macroId: string;
  macroNumber: number;
  macroName: string;
  macroColor: string;
  subgroups: PartnerSubgroupNode[];
  /** Total de fornecedores sob este macro (todas as subárvores). */
  supplierCount: number;
}

export interface PartnerResult {
  /** Grafia "canônica" para exibição (primeira encontrada). */
  displayName: string;
  /** Forma normalizada (chave de comparação). */
  key: string;
  macros: PartnerMacroNode[];
  /** Total de fornecedores ligados a este parceiro (global). */
  supplierCount: number;
  /** Total de anexos somados (para um contador rápido). */
  attachmentCount: number;
}

// ----- Implementação ----------------------------------------------------------

interface ResolveCtx {
  customById: Map<string, AggSupplier>;
  extraById: Map<string, AggExtraSupplier>;
  subgroupById: Map<string, AggSubgroup>;
  macros: AggMacro[];
  /** macro key -> macro (para achar o macro de um item). */
  macroByItemKey: Map<string, AggMacro>;
  /** groupId -> macro (grupos promovidos referenciados por item "group:<id>"). */
  macroByGroupId: Map<string, AggMacro>;
}

/** Resolve o nome do fornecedor a partir do scope + supplierId. */
function resolveSupplierName(ctx: ResolveCtx, scope: string, supplierId: string): string {
  // Custom suppliers (aquario/tapete/yiwu) e estáticos têm id próprio.
  const custom = ctx.customById.get(supplierId);
  if (custom) return custom.name;
  // Extras (dashboards promovidos)
  const extra = ctx.extraById.get(supplierId);
  if (extra) return extra.name;
  // Fallback: usa o próprio id (melhor que sumir do resultado).
  return supplierId;
}

/**
 * Descobre o macro de uma nota. Prioridade:
 *  1) Se a nota tem subgroupId, usamos o macroNumber do subgrupo.
 *  2) Caso contrário, tentamos casar pelo scope (dashboard:<scope>) ou
 *     por grupo promovido (extra supplier -> groupId -> item "group:<id>").
 */
function resolveMacro(
  ctx: ResolveCtx,
  scope: string,
  supplierId: string,
  subgroup: AggSubgroup | null,
  subtipo?: string | null,
): AggMacro | null {
  if (subgroup) {
    const m = ctx.macros.find((mm) => mm.number === subgroup.macroNumber);
    if (m) return m;
  }
  // Subtipo do Aquário (terrario/aquario) promovido a card de macro:
  // item com chave subgroup:<scope>:<subtipo> (ex.: subgroup:aquario:terrario).
  if (subtipo) {
    const bySubtipo = ctx.macroByItemKey.get(`subgroup:${scope}:${subtipo}`);
    if (bySubtipo) return bySubtipo;
  }
  // Dashboard fixo (aquario/tapete/yiwu) — casa por item dashboard:<scope>.
  const byDash = ctx.macroByItemKey.get(`dashboard:${scope}`);
  if (byDash) return byDash;
  // Subgrupo fixo do Aquário (terrario/aquario) — itens subgroup:aquario:*
  // já cobertos por subgroup acima; aqui tratamos extras de grupo promovido.
  const extra = ctx.extraById.get(supplierId);
  if (extra) {
    const byGroup = ctx.macroByGroupId.get(extra.groupId);
    if (byGroup) return byGroup;
  }
  return null;
}

/** Rótulo amigável de um subgrupo (ex.: "1.2 · Aquário"). */
function subgroupLabel(sg: AggSubgroup): string {
  return `${sg.macroNumber}.${sg.sub} · ${sg.name}`;
}

export function aggregateByPartner(input: {
  notes: AggNote[];
  customSuppliers: AggSupplier[];
  extraSuppliers: AggExtraSupplier[];
  subgroups: AggSubgroup[];
  macros: AggMacro[];
}): PartnerResult[] {
  const ctx: ResolveCtx = {
    customById: new Map(input.customSuppliers.map((s) => [s.id, s])),
    extraById: new Map(input.extraSuppliers.map((s) => [s.id, s])),
    subgroupById: new Map(input.subgroups.map((s) => [s.id, s])),
    macros: input.macros,
    macroByItemKey: new Map(),
    macroByGroupId: new Map(),
  };
  for (const m of input.macros) {
    for (const it of m.items) {
      ctx.macroByItemKey.set(it.key, m);
      if (it.key.startsWith("group:")) {
        ctx.macroByGroupId.set(it.refId, m);
      }
    }
  }

  // Acumulador por parceiro (chave normalizada).
  interface Acc {
    displayName: string;
    key: string;
    // macroId -> (subgroupKey -> node)
    macros: Map<string, { node: PartnerMacroNode; subByKey: Map<string, PartnerSubgroupNode> }>;
    supplierCount: number;
    attachmentCount: number;
  }
  const acc = new Map<string, Acc>();

  for (const note of input.notes) {
    const partners = parsePartners(note.fields);
    if (partners.length === 0) continue;

    const subgroupId = note.fields?.subgroupId ?? null;
    const subgroup = subgroupId ? ctx.subgroupById.get(subgroupId) ?? null : null;
    const subtipo = note.fields?.subtipoAquario ?? null;
    const macro = resolveMacro(ctx, note.scope, note.supplierId, subgroup, subtipo);
    if (!macro) continue; // sem macro identificável, não há onde organizar

    const supplierName = resolveSupplierName(ctx, note.scope, note.supplierId);
    const attachments = note.attachments ?? [];

    // href para chegar ao fornecedor: usamos o href do item do macro que casa.
    let href = "/";
    if (subgroup) {
      const item = macro.items.find(
        (it) => it.key === `subgroup:${note.scope}:${subgroup.name.toLowerCase()}`,
      );
      href = item?.href ?? `/${note.scope}`;
    } else if (subtipo) {
      const item = macro.items.find((it) => it.key === `subgroup:${note.scope}:${subtipo}`);
      href = item?.href ?? `/${note.scope}?subtipo=${subtipo}`;
    } else {
      const item =
        macro.items.find((it) => it.key === `dashboard:${note.scope}`) ??
        macro.items.find((it) => it.key.startsWith("group:"));
      href = item?.href ?? `/${note.scope}`;
    }

    for (const partner of partners) {
      const key = normalizePartner(partner);
      if (!key) continue;
      let a = acc.get(key);
      if (!a) {
        a = {
          displayName: partner,
          key,
          macros: new Map(),
          supplierCount: 0,
          attachmentCount: 0,
        };
        acc.set(key, a);
      }

      // Garante o nó do macro.
      let mEntry = a.macros.get(macro.id);
      if (!mEntry) {
        mEntry = {
          node: {
            macroId: macro.id,
            macroNumber: macro.number,
            macroName: macro.name,
            macroColor: macro.color,
            subgroups: [],
            supplierCount: 0,
          },
          subByKey: new Map(),
        };
        a.macros.set(macro.id, mEntry);
      }

      // Garante o nó do subgrupo (ou agrupamento por subtipo / "sem subgrupo").
      // Para subtipo, preferimos o rótulo acentuado do próprio item do macro.
      const subtipoItem = subtipo
        ? macro.items.find((it) => it.key === `subgroup:${note.scope}:${subtipo}`)
        : null;
      const subtipoLabel = subtipo
        ? subtipoItem?.label || subtipo.charAt(0).toUpperCase() + subtipo.slice(1)
        : null;
      const subKey = subgroup ? subgroup.id : subtipo ? `subtipo:${subtipo}` : "__none__";
      let sNode = mEntry.subByKey.get(subKey);
      if (!sNode) {
        sNode = {
          subgroupId: subgroup ? subgroup.id : null,
          label: subgroup ? subgroupLabel(subgroup) : (subtipoLabel ?? "Sem subgrupo"),
          color: subgroup ? subgroup.color : macro.color,
          suppliers: [],
        };
        mEntry.subByKey.set(subKey, sNode);
        mEntry.node.subgroups.push(sNode);
      }

      // Evita duplicar o mesmo fornecedor sob o mesmo subgrupo.
      const already = sNode.suppliers.find(
        (s) => s.scope === note.scope && s.supplierId === note.supplierId,
      );
      if (already) continue;

      const coPartners = partners.filter((p) => normalizePartner(p) !== key);

      sNode.suppliers.push({
        scope: note.scope,
        supplierId: note.supplierId,
        supplierName,
        href,
        attachments,
        coPartners,
      });
      mEntry.node.supplierCount += 1;
      a.supplierCount += 1;
      a.attachmentCount += attachments.length;
    }
  }

  // Converte acumulador em array ordenado (parceiro A→Z; macros por número;
  // subgrupos por sub; fornecedores por nome).
  const results: PartnerResult[] = [];
  for (const a of Array.from(acc.values())) {
    const macros = Array.from(a.macros.values()).map((m) => m.node);
    macros.sort((x, y) => x.macroNumber - y.macroNumber);
    for (const m of macros) {
      m.subgroups.sort((x: PartnerSubgroupNode, y: PartnerSubgroupNode) =>
        x.label.localeCompare(y.label, "pt-BR"),
      );
      for (const s of m.subgroups) {
        s.suppliers.sort((x: PartnerSupplierHit, y: PartnerSupplierHit) =>
          x.supplierName.localeCompare(y.supplierName, "pt-BR"),
        );
      }
    }
    results.push({
      displayName: a.displayName,
      key: a.key,
      macros,
      supplierCount: a.supplierCount,
      attachmentCount: a.attachmentCount,
    });
  }
  results.sort((x, y) => x.displayName.localeCompare(y.displayName, "pt-BR"));
  return results;
}

/** Extrai a lista de nomes de parceiros distintos (para sugestões do filtro). */
export function collectPartnerNames(notes: AggNote[]): string[] {
  const byKey = new Map<string, string>();
  for (const note of notes) {
    for (const p of parsePartners(note.fields)) {
      const key = normalizePartner(p);
      if (key && !byKey.has(key)) byKey.set(key, p);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 * Extrai os co-parceiros relacionados a um parceiro a partir do seu PartnerResult.
 * Dois parceiros são "relacionados" quando dividem ao menos um fornecedor (registrados
 * juntos no mesmo fornecedor). Retorna os nomes distintos (exceto o próprio), A→Z.
 */
export function relatedPartnersOf(result: PartnerResult | null | undefined): string[] {
  if (!result) return [];
  const selfKey = normalizePartner(result.displayName);
  const byKey = new Map<string, string>();
  for (const m of result.macros) {
    for (const sg of m.subgroups) {
      for (const s of sg.suppliers) {
        for (const cp of s.coPartners) {
          const k = normalizePartner(cp);
          if (k && k !== selfKey && !byKey.has(k)) byKey.set(k, cp);
        }
      }
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
