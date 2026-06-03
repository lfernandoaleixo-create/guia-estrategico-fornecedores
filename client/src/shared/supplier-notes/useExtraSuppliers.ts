// =============================================================================
// useExtraSuppliers — fornecedores cadastrados na 4ª aba "Adicionar Fornecedores".
//
// MIGRADO: agora persiste no BANCO DE DADOS COMPARTILHADO via tRPC. A assinatura
// pública foi mantida idêntica à versão IndexedDB para não quebrar a UI.
// Sincronização entre usuários: polling a cada 5s e refetch após mutações.
// =============================================================================
import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface ExtraSupplierContact {
  id: string;
  label?: string;
  value: string;
}

export interface ExtraSupplier {
  id: string;
  groupId: string; // FK -> CustomGroup.id
  name: string;
  chineseName?: string;
  category?: string;
  ncm?: string;
  city?: string;
  province?: string;
  address?: string;
  phones: ExtraSupplierContact[];
  emails: ExtraSupplierContact[];
  links: ExtraSupplierContact[];
  contactName?: string;
  contactRole?: string;
  contactLanguage?: string;
  moq?: string;
  priceFob?: string;
  leadTime?: string;
  paymentTerms?: string;
  incoterm?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export function genExtraContactId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function genId(): string {
  return `extra_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// O banco guarda createdAt/updatedAt como string ISO; a UI usa number (ms).
function toMs(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n) && v.trim() !== "") return n;
    const d = Date.parse(v);
    if (!Number.isNaN(d)) return d;
  }
  return Date.now();
}

function asContacts(v: unknown): ExtraSupplierContact[] {
  if (Array.isArray(v)) return v as ExtraSupplierContact[];
  return [];
}

function normalize(row: Record<string, unknown>): ExtraSupplier {
  return {
    id: String(row.id),
    groupId: String(row.groupId ?? ""),
    name: String(row.name ?? ""),
    chineseName: (row.chineseName as string) ?? undefined,
    category: (row.category as string) ?? undefined,
    ncm: (row.ncm as string) ?? undefined,
    city: (row.city as string) ?? undefined,
    province: (row.province as string) ?? undefined,
    address: (row.address as string) ?? undefined,
    phones: asContacts(row.phones),
    emails: asContacts(row.emails),
    links: asContacts(row.links),
    contactName: (row.contactName as string) ?? undefined,
    contactRole: (row.contactRole as string) ?? undefined,
    contactLanguage: (row.contactLanguage as string) ?? undefined,
    moq: (row.moq as string) ?? undefined,
    priceFob: (row.priceFob as string) ?? undefined,
    leadTime: (row.leadTime as string) ?? undefined,
    paymentTerms: (row.paymentTerms as string) ?? undefined,
    incoterm: (row.incoterm as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    createdAt: toMs(row.createdAt),
    updatedAt: toMs(row.updatedAt),
  };
}

// Converte ExtraSupplier (UI) -> payload aceito pela API (datas como string).
function toPayload(s: ExtraSupplier) {
  return {
    id: s.id,
    groupId: s.groupId,
    name: s.name,
    chineseName: s.chineseName,
    category: s.category,
    ncm: s.ncm,
    city: s.city,
    province: s.province,
    address: s.address,
    phones: s.phones ?? [],
    emails: s.emails ?? [],
    links: s.links ?? [],
    contactName: s.contactName,
    contactRole: s.contactRole,
    contactLanguage: s.contactLanguage,
    moq: s.moq,
    priceFob: s.priceFob,
    leadTime: s.leadTime,
    paymentTerms: s.paymentTerms,
    incoterm: s.incoterm,
    notes: s.notes,
    createdAt: String(s.createdAt),
    updatedAt: String(s.updatedAt),
  };
}

export function useExtraSuppliers() {
  const utils = trpc.useUtils();
  const query = trpc.data.suppliers.list.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const upsertMut = trpc.data.suppliers.upsert.useMutation();
  const deleteMut = trpc.data.suppliers.delete.useMutation();

  const list = useMemo<ExtraSupplier[]>(() => {
    const rows = (query.data ?? []).map((r) => normalize(r as Record<string, unknown>));
    rows.sort((a, b) => b.updatedAt - a.updatedAt);
    return rows;
  }, [query.data]);

  const loaded = !query.isLoading;

  const reload = useCallback(async () => {
    await utils.data.suppliers.list.invalidate();
  }, [utils]);

  const create = useCallback(
    async (input: Omit<ExtraSupplier, "id" | "createdAt" | "updatedAt">) => {
      const now = Date.now();
      const supplier: ExtraSupplier = {
        ...input,
        id: genId(),
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
    [upsertMut, reload],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Omit<ExtraSupplier, "id" | "createdAt">>) => {
      const existing = list.find((s) => s.id === id);
      if (!existing) return;
      const updated: ExtraSupplier = {
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

export async function readAllExtraSuppliers(): Promise<ExtraSupplier[]> {
  const rows = await trpcFetch<Record<string, unknown>[]>("data.suppliers.list", "query");
  return (rows ?? []).map(normalize);
}

export async function writeAllExtraSuppliers(list: ExtraSupplier[]): Promise<void> {
  for (const s of list) {
    if (s && s.id) {
      await trpcFetch("data.suppliers.upsert", "mutation", toPayload(s));
    }
  }
}
