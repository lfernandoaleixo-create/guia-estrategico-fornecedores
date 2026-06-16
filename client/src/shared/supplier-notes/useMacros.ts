// =============================================================================
// useMacros — classificações MACRO exibidas na página inicial (Home).
//
// Um MACRO é uma camada de organização ACIMA dos dashboards. Tem número + nome
// (ex.: "1. PET") e uma lista ORDENADA de itens (dashboards/subgrupos/grupos).
// A numeração hierárquica (1.1, 1.2, 1.3…) é derivada da posição de cada item.
//
// Regra de negócio: um mesmo item (mesma `key`) pertence a no máximo UM macro.
// Ao atribuir um item a um macro, ele é removido de qualquer outro macro.
//
// Persiste no BANCO COMPARTILHADO via tRPC (polling 5s + reload pós-mutação),
// igual aos demais hooks do projeto. NÃO apaga nem altera dados de fornecedores,
// anexos ou especialidades — é uma camada puramente aditiva.
// =============================================================================
import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";

export type MacroItemKind = "dashboard" | "subgroup" | "group";

export interface MacroItem {
  /** Chave única e estável do item (ex.: "dashboard:aquario", "subgroup:aquario:terrario", "group:<id>"). */
  key: string;
  kind: MacroItemKind;
  /** ID do recurso referenciado (slug do dashboard, id do grupo, etc.). */
  refId: string;
  /** Rótulo exibido no card (ex.: "Terrário"). */
  label: string;
  /** Rota de destino (ex.: "/aquario?subtipo=terrario"). */
  href: string;
  /** Subtipo opcional (ex.: "terrario" | "aquario"). */
  subtipo?: string | null;
}

export interface Macro {
  id: string;
  number: number;
  /** Posição de exibição na Home (menor = primeiro). Separada do number. */
  orderIndex: number;
  name: string;
  color: string;
  items: MacroItem[];
  createdAt: string;
  updatedAt: string;
}

export const MACRO_PALETTE = [
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f97316",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
];

function genId(): string {
  return `macro_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function normalizeItems(raw: unknown): MacroItem[] {
  if (!Array.isArray(raw)) return [];
  const out: MacroItem[] = [];
  for (const it of raw) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    if (typeof o.key !== "string" || typeof o.refId !== "string") continue;
    const kind = (o.kind as MacroItemKind) ?? "dashboard";
    out.push({
      key: o.key,
      kind: kind === "subgroup" || kind === "group" ? kind : "dashboard",
      refId: o.refId,
      label: typeof o.label === "string" ? o.label : o.refId,
      href: typeof o.href === "string" ? o.href : "/",
      subtipo: typeof o.subtipo === "string" ? o.subtipo : null,
    });
  }
  return out;
}

function normalize(row: {
  id: string;
  number: number;
  orderIndex?: number | null;
  name: string;
  color: string;
  items: unknown;
  createdAt: string;
  updatedAt: string;
}): Macro {
  return {
    id: row.id,
    number: row.number,
    // Fallback: registros antigos sem orderIndex usam o próprio number.
    orderIndex:
      typeof row.orderIndex === "number" && row.orderIndex > 0
        ? row.orderIndex
        : row.number,
    name: row.name,
    color: row.color ?? "#8b5cf6",
    items: normalizeItems(row.items),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function useMacros() {
  const utils = trpc.useUtils();
  const query = trpc.data.macros.list.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const upsertMut = trpc.data.macros.upsert.useMutation();
  const bulkMut = trpc.data.macros.bulkUpsert.useMutation();
  const deleteMut = trpc.data.macros.delete.useMutation();

  const macros = useMemo<Macro[]>(() => {
    const rows = (query.data ?? []).map((r) => normalize(r as never));
    // Ordena pela posição de exibição (orderIndex); desempata pelo number.
    rows.sort((a, b) => a.orderIndex - b.orderIndex || a.number - b.number);
    return rows;
  }, [query.data]);

  const loading = query.isLoading;

  const reload = useCallback(async () => {
    await utils.data.macros.list.invalidate();
  }, [utils]);

  /** Mapa key->macroId para descobrir rapidamente onde um item está atribuído. */
  const itemAssignment = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of macros) {
      for (const it of m.items) map.set(it.key, m.id);
    }
    return map;
  }, [macros]);

  const createMacro = useCallback(
    async (input: { name: string; number?: number; color?: string }) => {
      const trimmed = input.name.trim();
      if (!trimmed) return null;
      const used = new Set(macros.map((m) => m.number).filter(Boolean));
      let auto = 1;
      while (used.has(auto)) auto += 1;
      const number =
        typeof input.number === "number" && input.number > 0
          ? Math.floor(input.number)
          : auto;
      const color =
        input.color ||
        MACRO_PALETTE[macros.length % MACRO_PALETTE.length] ||
        "#8b5cf6";
      // Novo macro vai para o fim da ordem de exibição.
      const maxOrder = macros.reduce((mx, m) => Math.max(mx, m.orderIndex), 0);
      const macro: Macro = {
        id: genId(),
        number,
        orderIndex: maxOrder + 1,
        name: trimmed,
        color,
        items: [],
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      await upsertMut.mutateAsync(macro);
      await reload();
      return macro;
    },
    [macros, upsertMut, reload],
  );

  const updateMacro = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Macro, "name" | "number" | "color" | "items" | "orderIndex">>,
    ) => {
      const current = macros.find((m) => m.id === id);
      if (!current) return;
      const updated: Macro = {
        ...current,
        ...patch,
        name: (patch.name ?? current.name).trim() || current.name,
        updatedAt: nowISO(),
      };
      await upsertMut.mutateAsync(updated);
      await reload();
    },
    [macros, upsertMut, reload],
  );

  const deleteMacro = useCallback(
    async (id: string) => {
      await deleteMut.mutateAsync({ id });
      await reload();
    },
    [deleteMut, reload],
  );

  /**
   * Atribui um item a um macro (no fim da lista). Se o item já pertencer a outro
   * macro, ele é removido de lá primeiro (vínculo único). Persiste ambos via bulk.
   */
  const assignItem = useCallback(
    async (macroId: string, item: MacroItem) => {
      const target = macros.find((m) => m.id === macroId);
      if (!target) return;
      const toWrite: Macro[] = [];
      // Remove o item de qualquer outro macro.
      for (const m of macros) {
        if (m.id === macroId) continue;
        if (m.items.some((it) => it.key === item.key)) {
          toWrite.push({
            ...m,
            items: m.items.filter((it) => it.key !== item.key),
            updatedAt: nowISO(),
          });
        }
      }
      // Adiciona ao alvo (sem duplicar).
      const exists = target.items.some((it) => it.key === item.key);
      const nextItems = exists
        ? target.items.map((it) => (it.key === item.key ? item : it))
        : [...target.items, item];
      toWrite.push({ ...target, items: nextItems, updatedAt: nowISO() });
      if (toWrite.length > 0) await bulkMut.mutateAsync(toWrite);
      await reload();
    },
    [macros, bulkMut, reload],
  );

  /** Remove um item de um macro (não exclui o dashboard, só desfaz o vínculo). */
  const removeItem = useCallback(
    async (macroId: string, key: string) => {
      const target = macros.find((m) => m.id === macroId);
      if (!target) return;
      await upsertMut.mutateAsync({
        ...target,
        items: target.items.filter((it) => it.key !== key),
        updatedAt: nowISO(),
      });
      await reload();
    },
    [macros, upsertMut, reload],
  );

  /** Reordena os itens de um macro segundo a nova ordem de keys. */
  const reorderItems = useCallback(
    async (macroId: string, orderedKeys: string[]) => {
      const target = macros.find((m) => m.id === macroId);
      if (!target) return;
      const byKey = new Map(target.items.map((it) => [it.key, it]));
      const reordered: MacroItem[] = [];
      orderedKeys.forEach((k) => {
        const it = byKey.get(k);
        if (it) reordered.push(it);
      });
      target.items.forEach((it) => {
        if (!orderedKeys.includes(it.key)) reordered.push(it);
      });
      await upsertMut.mutateAsync({
        ...target,
        items: reordered,
        updatedAt: nowISO(),
      });
      await reload();
    },
    [macros, upsertMut, reload],
  );

  /**
   * Reordena os macros APENAS pela posição de exibição (orderIndex).
   * NUNCA altera `number` nem `name` — o macro "1 · PET" continua sendo o 1
   * mesmo que desca na lista, mantendo intacta a numeração 1.x e os subgrupos.
   */
  const reorderMacros = useCallback(
    async (orderedIds: string[]) => {
      const byId = new Map(macros.map((m) => [m.id, m]));
      const reordered: Macro[] = [];
      orderedIds.forEach((id, idx) => {
        const m = byId.get(id);
        if (m) reordered.push({ ...m, orderIndex: idx + 1, updatedAt: nowISO() });
      });
      macros.forEach((m) => {
        if (!orderedIds.includes(m.id)) {
          reordered.push({ ...m, orderIndex: reordered.length + 1, updatedAt: nowISO() });
        }
      });
      if (reordered.length > 0) await bulkMut.mutateAsync(reordered);
      await reload();
    },
    [macros, bulkMut, reload],
  );

  return {
    macros,
    loading,
    reload,
    itemAssignment,
    createMacro,
    updateMacro,
    deleteMacro,
    assignItem,
    removeItem,
    reorderItems,
    reorderMacros,
  };
}
