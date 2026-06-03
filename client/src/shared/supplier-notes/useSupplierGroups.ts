// =============================================================================
// useSupplierGroups — grupos de fornecedores COMPARTILHADOS entre os 3
// dashboards principais (Aquário, Tapete, Yiwu). São os "GRUPOS DO FORNECEDOR"
// exibidos no GroupPicker de cada fornecedor.
//
// MIGRADO: agora persiste no BANCO DE DADOS COMPARTILHADO via tRPC. A assinatura
// pública foi mantida idêntica à versão IndexedDB para não quebrar a UI.
// Sincronização entre usuários: polling a cada 5s e refetch após mutações.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";

export interface SupplierGroup {
  id: string;
  number: number; // número do grupo (1, 2, 3…), único
  name: string;
  legend: string; // descrição/legenda livre
  color: string; // hex (ex: "#f97316")
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// Paleta sugerida para novos grupos
export const GROUP_COLOR_PALETTE = [
  "#f97316", // laranja
  "#ef4444", // vermelho
  "#f59e0b", // âmbar
  "#84cc16", // lima
  "#10b981", // esmeralda
  "#06b6d4", // ciano
  "#3b82f6", // azul
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#64748b", // ardósia
];

function genId(): string {
  return `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function normalize(row: Record<string, unknown>): SupplierGroup {
  return {
    id: String(row.id),
    number: typeof row.number === "number" ? row.number : Number(row.number) || 0,
    name: String(row.name ?? ""),
    legend: (row.legend as string) ?? "",
    color: (row.color as string) ?? "#64748b",
    createdAt: String(row.createdAt ?? nowISO()),
    updatedAt: String(row.updatedAt ?? nowISO()),
  };
}

const SEED_GROUPS: SupplierGroup[] = [
  {
    id: "grp_seed_aquario_terrario",
    number: 1,
    name: "Aquários & Terrários",
    legend: "Aquariofilia, terrários e equipamentos",
    color: "#ef4444",
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: "grp_seed_tapete_higienico",
    number: 2,
    name: "Tapete Higiênico Pet",
    legend: "Importação de tapetes higiênicos (NCM 4818)",
    color: "#06b6d4",
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
];

export function useSupplierGroups() {
  const utils = trpc.useUtils();
  const query = trpc.data.supplierGroups.list.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const upsertMut = trpc.data.supplierGroups.upsert.useMutation();
  const bulkUpsertMut = trpc.data.supplierGroups.bulkUpsert.useMutation();
  const deleteMut = trpc.data.supplierGroups.delete.useMutation();

  // Evita semear repetidamente.
  const seedingRef = useRef(false);

  const groups = useMemo<SupplierGroup[]>(() => {
    const rows = (query.data ?? []).map((r) => normalize(r as Record<string, unknown>));
    rows.sort((a, b) => a.number - b.number);
    return rows;
  }, [query.data]);

  const loading = query.isLoading;

  const reload = useCallback(async () => {
    await utils.data.supplierGroups.list.invalidate();
  }, [utils]);

  // Seed inicial: se o banco está vazio (após carregar), cria os 2 grupos fixos.
  // Executado de forma idempotente; o upsert por id evita duplicação.
  const maybeSeed = useCallback(async () => {
    if (seedingRef.current) return;
    if (query.isLoading) return;
    if ((query.data ?? []).length > 0) return;
    seedingRef.current = true;
    try {
      await bulkUpsertMut.mutateAsync(SEED_GROUPS);
      await reload();
    } catch (err) {
      console.warn("[useSupplierGroups seed]", err);
      seedingRef.current = false;
    }
  }, [query.isLoading, query.data, bulkUpsertMut, reload]);

  // Dispara o seed quando detecta banco vazio.
  useEffect(() => {
    if (!query.isLoading && (query.data ?? []).length === 0 && !seedingRef.current) {
      void maybeSeed();
    }
  }, [query.isLoading, query.data, maybeSeed]);

  const createGroup = useCallback(
    async (input: { name: string; legend?: string; color?: string; number?: number }) => {
      const trimmed = input.name.trim();
      if (!trimmed) return null;
      const palette = GROUP_COLOR_PALETTE;
      const fallbackColor = palette[Math.floor(Math.random() * palette.length)];
      const used = new Set(groups.map((g) => g.number).filter(Boolean));
      let auto = 1;
      while (used.has(auto)) auto += 1;
      const number =
        typeof input.number === "number" && input.number > 0 ? Math.floor(input.number) : auto;
      const group: SupplierGroup = {
        id: genId(),
        number,
        name: trimmed,
        legend: input.legend?.trim() ?? "",
        color: input.color || fallbackColor,
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
    async (
      id: string,
      patch: Partial<Pick<SupplierGroup, "name" | "legend" | "color" | "number">>,
    ) => {
      const current = groups.find((g) => g.id === id);
      if (!current) return;
      const updated: SupplierGroup = {
        ...current,
        ...patch,
        name: (patch.name ?? current.name).trim() || current.name,
        legend: patch.legend !== undefined ? patch.legend.trim() : current.legend,
        color: patch.color ?? current.color,
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

  const exportGroups = useCallback(async (): Promise<SupplierGroup[]> => {
    return groups;
  }, [groups]);

  const importGroups = useCallback(
    async (incoming: SupplierGroup[]) => {
      const valid = (incoming ?? []).filter((g) => g && g.id && g.name);
      if (valid.length === 0) return;
      await bulkUpsertMut.mutateAsync(
        valid.map((g) => ({
          ...g,
          legend: g.legend ?? "",
          color: g.color ?? "#64748b",
          createdAt: g.createdAt ?? nowISO(),
          updatedAt: g.updatedAt ?? nowISO(),
        })),
      );
      await reload();
    },
    [bulkUpsertMut, reload],
  );

  return {
    groups,
    loading,
    createGroup,
    updateGroup,
    deleteGroup,
    reload,
    exportGroups,
    importGroups,
  };
}

// -----------------------------------------------------------------------------
// Helpers fora do React (backup.ts).
// -----------------------------------------------------------------------------
async function trpcFetch<T>(path: string, kind: "query" | "mutation", input?: unknown): Promise<T> {
  const base = "/api/trpc";
  if (kind === "query") {
    const params = new URLSearchParams();
    params.set("input", JSON.stringify({ json: input ?? null }));
    const res = await fetch(`${base}/${path}?${params.toString()}`, { credentials: "include" });
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

export async function readAllGroups(): Promise<SupplierGroup[]> {
  const rows = await trpcFetch<Record<string, unknown>[]>("data.supplierGroups.list", "query");
  return (rows ?? []).map(normalize);
}

export async function writeAllGroups(groups: SupplierGroup[]): Promise<void> {
  const valid = (groups ?? []).filter((g) => g && g.id && g.name);
  if (valid.length === 0) return;
  await trpcFetch(
    "data.supplierGroups.bulkUpsert",
    "mutation",
    valid.map((g) => ({
      ...g,
      legend: g.legend ?? "",
      color: g.color ?? "#64748b",
      createdAt: g.createdAt ?? nowISO(),
      updatedAt: g.updatedAt ?? nowISO(),
    })),
  );
}
