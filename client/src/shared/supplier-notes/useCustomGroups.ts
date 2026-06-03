// =============================================================================
// useCustomGroups — grupos personalizados criados na 4ª aba (Adicionar Fornecedores).
//
// MIGRADO: agora persiste no BANCO DE DADOS COMPARTILHADO via tRPC, de modo que
// todos os usuários com o link veem os mesmos grupos. A assinatura pública do
// hook foi mantida idêntica à versão anterior (IndexedDB) para não quebrar a UI.
//
// Sincronização entre usuários: refetch automático (polling) a cada 5s e após
// cada mutação.
// =============================================================================
import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface CustomGroup {
  id: string;
  number: number;        // número do grupo (1, 2, 3…), único
  name: string;          // ex: "Brinquedos infantis"
  branch: string;        // ramo de mercado, ex: "Brinquedos"
  color: string;         // hex
  description: string;   // legenda livre
  promotedToDashboard: boolean; // virou dashboard independente?
  promotedAt?: string;   // ISO
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
}

// Sugestões de ramos comuns para autocomplete; o usuário pode digitar livre.
export const BRANCH_SUGGESTIONS = [
  "Brinquedos",
  "Vidro / Vidraria",
  "Aquário / Terrário",
  "Tapete higiênico",
  "Tapete artesanal",
  "Decoração",
  "Cozinha",
  "Cama, mesa e banho",
  "Eletrônicos",
  "Pet",
  "Bazar",
  "Beleza",
  "Festas",
];

export const CUSTOM_GROUP_PALETTE = [
  "#f97316",
  "#ef4444",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#14b8a6",
  "#a855f7",
];

function genId(): string {
  return `cgrp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

// Normaliza linha do banco -> CustomGroup (campos nuláveis viram defaults).
function normalize(row: {
  id: string;
  number: number;
  name: string;
  branch: string;
  color: string;
  description: string | null;
  promotedToDashboard: boolean;
  promotedAt: string | null;
  createdAt: string;
  updatedAt: string;
}): CustomGroup {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    branch: row.branch ?? "",
    color: row.color ?? "#64748b",
    description: row.description ?? "",
    promotedToDashboard: !!row.promotedToDashboard,
    promotedAt: row.promotedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function useCustomGroups() {
  const utils = trpc.useUtils();
  const query = trpc.data.groups.list.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const upsertMut = trpc.data.groups.upsert.useMutation();
  const bulkMut = trpc.data.groups.bulkUpsert.useMutation();
  const deleteMut = trpc.data.groups.delete.useMutation();

  const groups = useMemo<CustomGroup[]>(() => {
    const rows = (query.data ?? []).map(normalize);
    rows.sort((a, b) => a.number - b.number);
    return rows;
  }, [query.data]);

  const loading = query.isLoading;

  const reload = useCallback(async () => {
    await utils.data.groups.list.invalidate();
  }, [utils]);

  const createGroup = useCallback(
    async (input: {
      name: string;
      branch: string;
      color?: string;
      description?: string;
      number?: number;
    }) => {
      const trimmed = input.name.trim();
      if (!trimmed) return null;
      const fallbackColor =
        CUSTOM_GROUP_PALETTE[Math.floor(Math.random() * CUSTOM_GROUP_PALETTE.length)];
      const used = new Set(groups.map((g) => g.number).filter(Boolean));
      let auto = 1;
      while (used.has(auto)) auto += 1;
      const number =
        typeof input.number === "number" && input.number > 0 ? Math.floor(input.number) : auto;
      const group: CustomGroup = {
        id: genId(),
        number,
        name: trimmed,
        branch: input.branch.trim(),
        color: input.color || fallbackColor,
        description: input.description?.trim() ?? "",
        promotedToDashboard: false,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      await upsertMut.mutateAsync(group);
      await reload();
      return group;
    },
    [groups, upsertMut, reload],
  );

  const updateGroup = useCallback(
    async (id: string, patch: Partial<Omit<CustomGroup, "id" | "createdAt">>) => {
      const current = groups.find((g) => g.id === id);
      if (!current) return;
      const updated: CustomGroup = {
        ...current,
        ...patch,
        name: (patch.name ?? current.name).trim() || current.name,
        branch: patch.branch !== undefined ? patch.branch.trim() : current.branch,
        description:
          patch.description !== undefined ? patch.description.trim() : current.description,
        updatedAt: nowISO(),
      };
      await upsertMut.mutateAsync(updated);
      await reload();
    },
    [groups, upsertMut, reload],
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      await deleteMut.mutateAsync({ id });
      await reload();
    },
    [deleteMut, reload],
  );

  const promoteToDashboard = useCallback(
    async (id: string) => {
      const current = groups.find((g) => g.id === id);
      if (!current) return;
      await upsertMut.mutateAsync({
        ...current,
        promotedToDashboard: true,
        promotedAt: nowISO(),
        updatedAt: nowISO(),
      });
      await reload();
    },
    [groups, upsertMut, reload],
  );

  const demoteFromDashboard = useCallback(
    async (id: string) => {
      const current = groups.find((g) => g.id === id);
      if (!current) return;
      await upsertMut.mutateAsync({
        ...current,
        promotedToDashboard: false,
        promotedAt: undefined,
        updatedAt: nowISO(),
      });
      await reload();
    },
    [groups, upsertMut, reload],
  );

  /**
   * Reordena a lista de grupos. `orderedIds` é a nova ordem visual desejada.
   * O número de cada grupo é renumerado para 1..N na nova ordem.
   */
  const reorderGroups = useCallback(
    async (orderedIds: string[]) => {
      const byId = new Map(groups.map((g) => [g.id, g]));
      const reordered: CustomGroup[] = [];
      orderedIds.forEach((id, idx) => {
        const g = byId.get(id);
        if (g) reordered.push({ ...g, number: idx + 1, updatedAt: nowISO() });
      });
      groups.forEach((g) => {
        if (!orderedIds.includes(g.id)) {
          reordered.push({ ...g, number: reordered.length + 1, updatedAt: nowISO() });
        }
      });
      if (reordered.length > 0) {
        await bulkMut.mutateAsync(reordered);
      }
      await reload();
    },
    [groups, bulkMut, reload],
  );

  return {
    groups,
    loading,
    reload,
    createGroup,
    updateGroup,
    deleteGroup,
    promoteToDashboard,
    demoteFromDashboard,
    reorderGroups,
  };
}

// -----------------------------------------------------------------------------
// Helpers para backup (usados fora do React). Mantidos por compatibilidade.
// Agora chamam a API via fetch direto ao endpoint tRPC.
// -----------------------------------------------------------------------------
async function trpcFetch<T>(path: string, kind: "query" | "mutation", input?: unknown): Promise<T> {
  const base = "/api/trpc";
  if (kind === "query") {
    const params = new URLSearchParams();
    params.set("input", JSON.stringify({ json: input ?? null }));
    const res = await fetch(`${base}/${path}?${params.toString()}`, {
      credentials: "include",
    });
    const data = await res.json();
    return data?.result?.data?.json as T;
  }
  const res = await fetch(`${base}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ json: input ?? null }),
  });
  const data = await res.json();
  return data?.result?.data?.json as T;
}

export async function readAllCustomGroups(): Promise<CustomGroup[]> {
  const rows = await trpcFetch<ReturnType<typeof normalize>[]>("data.groups.list", "query");
  return (rows ?? []).map((r) => normalize(r as never));
}

export async function writeAllCustomGroups(groups: CustomGroup[]): Promise<void> {
  const valid = groups.filter((g) => g && g.id && g.name);
  if (valid.length === 0) return;
  await trpcFetch("data.groups.bulkUpsert", "mutation", valid);
}
