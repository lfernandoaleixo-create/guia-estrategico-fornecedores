// =============================================================================
// useSubgroups — subgrupos numerados livres (modelo "macro.sub") sob cada MACRO.
//
// Cada subgrupo pertence a um MACRO (referenciado pelo NÚMERO do macro) e tem:
//   - sub: o sufixo livre digitado pelo usuário (ex.: 1 → "1.1", 4 → "1.4")
//   - name: nome livre (ex.: "Terrário", "Coleira de Cachorro")
//   - color: cor de destaque
//
// A criação é BLOQUEADA se o macro digitado não existir (validação feita na UI
// com `validateSubgroupNumber`, recebendo os números de macros existentes).
//
// Persiste no BANCO COMPARTILHADO via tRPC (polling 5s + reload pós-mutação).
// Camada puramente ADITIVA: não altera fornecedores, anexos ou notas.
// =============================================================================
import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { sortSubgroups } from "./subgroupNumber";

export interface Subgroup {
  id: string;
  /** Número do MACRO ao qual pertence (referencia Macro.number). */
  macroNumber: number;
  /** Sufixo livre dentro do macro (o "x" em macro.x). */
  sub: number;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export const SUBGROUP_PALETTE = [
  "#10b981", // verde
  "#ef4444", // vermelho
  "#3b82f6", // azul
  "#f59e0b", // âmbar
  "#a855f7", // roxo
  "#06b6d4", // ciano
  "#ec4899", // rosa
  "#14b8a6", // teal
];

function genId(): string {
  return `sg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function normalize(row: {
  id: string;
  macroNumber: number;
  sub: number;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}): Subgroup {
  return {
    id: row.id,
    macroNumber: Number(row.macroNumber),
    sub: Number(row.sub),
    name: row.name,
    color: row.color ?? "#10b981",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function useSubgroups() {
  const utils = trpc.useUtils();
  const query = trpc.data.subgroups.list.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const upsertMut = trpc.data.subgroups.upsert.useMutation();
  const bulkMut = trpc.data.subgroups.bulkUpsert.useMutation();
  const deleteMut = trpc.data.subgroups.delete.useMutation();

  const subgroups = useMemo<Subgroup[]>(() => {
    const rows = (query.data ?? []).map((r) => normalize(r as never));
    return sortSubgroups(rows);
  }, [query.data]);

  const loading = query.isLoading;

  const reload = useCallback(async () => {
    await utils.data.subgroups.list.invalidate();
  }, [utils]);

  /** Mapa id->subgrupo. */
  const byId = useMemo(() => {
    const map = new Map<string, Subgroup>();
    for (const sg of subgroups) map.set(sg.id, sg);
    return map;
  }, [subgroups]);

  /** Subgrupos de um determinado macro (ordenados por sub). */
  const byMacro = useCallback(
    (macroNumber: number) =>
      subgroups.filter((sg) => sg.macroNumber === macroNumber),
    [subgroups],
  );

  /**
   * Cria um subgrupo. A validação (macro existe? formato? duplicado?) deve ser
   * feita ANTES pela UI com `validateSubgroupNumber`. Aqui só persistimos.
   */
  const createSubgroup = useCallback(
    async (input: {
      macroNumber: number;
      sub: number;
      name: string;
      color?: string;
    }) => {
      const trimmed = input.name.trim();
      if (!trimmed) return null;
      const color =
        input.color ||
        SUBGROUP_PALETTE[subgroups.length % SUBGROUP_PALETTE.length] ||
        "#10b981";
      const sg: Subgroup = {
        id: genId(),
        macroNumber: Math.floor(input.macroNumber),
        sub: Math.floor(input.sub),
        name: trimmed,
        color,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      await upsertMut.mutateAsync(sg);
      await reload();
      return sg;
    },
    [subgroups, upsertMut, reload],
  );

  const updateSubgroup = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Subgroup, "macroNumber" | "sub" | "name" | "color">>,
    ) => {
      const current = byId.get(id);
      if (!current) return;
      const updated: Subgroup = {
        ...current,
        ...patch,
        name: (patch.name ?? current.name).trim() || current.name,
        updatedAt: nowISO(),
      };
      await upsertMut.mutateAsync(updated);
      await reload();
    },
    [byId, upsertMut, reload],
  );

  const deleteSubgroup = useCallback(
    async (id: string) => {
      await deleteMut.mutateAsync({ id });
      await reload();
    },
    [deleteMut, reload],
  );

  /** Persiste vários subgrupos de uma vez (ex.: usado na migração). */
  const bulkUpsert = useCallback(
    async (rows: Subgroup[]) => {
      if (rows.length === 0) return;
      await bulkMut.mutateAsync(rows);
      await reload();
    },
    [bulkMut, reload],
  );

  return {
    subgroups,
    loading,
    reload,
    byId,
    byMacro,
    createSubgroup,
    updateSubgroup,
    deleteSubgroup,
    bulkUpsert,
  };
}
