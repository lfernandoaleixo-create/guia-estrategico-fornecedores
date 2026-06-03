// =============================================================================
// useCustomSuppliers — fornecedores cadastrados manualmente dentro de cada
// dashboard principal (aquario, tapete, yiwu).
//
// MIGRADO: agora persiste no BANCO DE DADOS COMPARTILHADO via tRPC. A assinatura
// pública foi mantida idêntica à versão IndexedDB para não quebrar a UI.
// O objeto CustomSupplier é serializado como JSON no campo `data` do banco.
// Sincronização entre usuários: polling a cada 5s e refetch após mutações.
// =============================================================================

import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";

export type SupplierScope = "aquario" | "tapete" | "yiwu";

export interface CustomSupplierContact {
  id: string;
  label?: string;
  value: string;
}

export interface CustomSupplier {
  id: string; // "custom-<scope>-<timestamp>-<rand>"
  scope: SupplierScope;
  createdAt: number;
  updatedAt: number;

  // Identificação
  name: string;
  chineseName?: string;
  category?: string;
  ncm?: string;

  // Localização
  city?: string;
  province?: string;
  district?: string;
  floor?: string;
  gate?: string;
  address?: string;

  // Contatos múltiplos
  phones: CustomSupplierContact[];
  emails: CustomSupplierContact[];
  links: CustomSupplierContact[];

  // Contato principal
  contactName?: string;
  contactRole?: string;
  contactLanguage?: string;

  // Negociação base
  moq?: string;
  priceFob?: string;
  leadTime?: string;
  paymentTerms?: string;
  incoterm?: string;

  // Texto livre
  notes?: string;

  // Grupos atribuídos
  groupIds?: string[];
}

// ─── ID generators ───────────────────────────────────────────────────────────
function genId(scope: SupplierScope) {
  return `custom-${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function genContactId() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
export { genContactId };

// ─── Normalização: linha do banco -> CustomSupplier ──────────────────────────
function normalize(row: Record<string, unknown>): CustomSupplier | null {
  try {
    const raw = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
    if (!raw || typeof raw !== "object") return null;
    const s = raw as CustomSupplier;
    return {
      ...s,
      id: String(row.id ?? s.id),
      scope: (row.scope as SupplierScope) ?? s.scope,
      name: String(row.name ?? s.name ?? ""),
      phones: Array.isArray(s.phones) ? s.phones : [],
      emails: Array.isArray(s.emails) ? s.emails : [],
      links: Array.isArray(s.links) ? s.links : [],
      createdAt: typeof s.createdAt === "number" ? s.createdAt : Number(s.createdAt) || Date.now(),
      updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : Number(s.updatedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

// ─── CustomSupplier (UI) -> payload da API ───────────────────────────────────
function toPayload(s: CustomSupplier) {
  return {
    id: s.id,
    scope: s.scope,
    name: s.name,
    data: JSON.stringify(s),
    createdAt: String(s.createdAt),
    updatedAt: String(s.updatedAt),
  };
}

// ─── React hook ──────────────────────────────────────────────────────────────
export function useCustomSuppliers(scope: SupplierScope) {
  const utils = trpc.useUtils();
  const query = trpc.data.customSuppliers.list.useQuery(
    { scope },
    { refetchInterval: 5000, refetchOnWindowFocus: true },
  );
  const upsertMut = trpc.data.customSuppliers.upsert.useMutation();
  const deleteMut = trpc.data.customSuppliers.delete.useMutation();

  const list = useMemo<CustomSupplier[]>(() => {
    const rows = (query.data ?? [])
      .map((r) => normalize(r as Record<string, unknown>))
      .filter((s): s is CustomSupplier => s !== null);
    rows.sort((a, b) => b.updatedAt - a.updatedAt);
    return rows;
  }, [query.data]);

  const loaded = !query.isLoading;

  const reload = useCallback(async () => {
    await utils.data.customSuppliers.list.invalidate();
  }, [utils]);

  const create = useCallback(
    async (input: Omit<CustomSupplier, "id" | "scope" | "createdAt" | "updatedAt">) => {
      const now = Date.now();
      const supplier: CustomSupplier = {
        ...input,
        id: genId(scope),
        scope,
        createdAt: now,
        updatedAt: now,
        phones: input.phones ?? [],
        emails: input.emails ?? [],
        links: input.links ?? [],
      };
      await upsertMut.mutateAsync(toPayload(supplier));
      await reload();
      return supplier;
    },
    [scope, upsertMut, reload],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Omit<CustomSupplier, "id" | "scope" | "createdAt">>) => {
      const existing = list.find((s) => s.id === id);
      if (!existing) return;
      const updated: CustomSupplier = {
        ...existing,
        ...patch,
        updatedAt: Date.now(),
      };
      await upsertMut.mutateAsync(toPayload(updated));
      await reload();
    },
    [list, upsertMut, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteMut.mutateAsync({ id });
      await reload();
    },
    [deleteMut, reload],
  );

  return { list, loaded, reload, create, update, remove };
}

export function formatCreatedDateBR(ts: number): string {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// -----------------------------------------------------------------------------
// Helpers para backup (fora do React).
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

export async function exportAllCustomSuppliers(): Promise<CustomSupplier[]> {
  const rows = await trpcFetch<Record<string, unknown>[]>("data.customSuppliers.list", "query", {});
  return (rows ?? [])
    .map(normalize)
    .filter((s): s is CustomSupplier => s !== null);
}

export async function importCustomSuppliers(
  list: CustomSupplier[],
): Promise<{ added: number; updated: number }> {
  if (!Array.isArray(list)) return { added: 0, updated: 0 };
  const existing = new Set((await exportAllCustomSuppliers()).map((s) => s.id));
  let added = 0;
  let updated = 0;
  for (const s of list) {
    if (!s || !s.id) continue;
    if (existing.has(s.id)) updated++;
    else added++;
    await trpcFetch("data.customSuppliers.upsert", "mutation", toPayload(s));
  }
  return { added, updated };
}
