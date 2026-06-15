// =============================================================================
// usePartnerTopics — Assuntos/Temas de um Fornecedor Parceiro.
//
// Usado SOMENTE na Central de Documentos (dashboard do Grupo Nº 00). Cada
// parceiro tem vários assuntos (ex.: "Vidro"); cada assunto tem título +
// observações. Os ANEXOS de cada assunto são tratados pelo hook useSupplierNotes
// com escopo lógico `parceiro-<partnerId>` e supplierId = <topicId>, reutilizando
// o fluxo de upload S3 já existente.
//
// Persiste no banco compartilhado via tRPC (polling 5s + refetch pós-mutação).
// =============================================================================
import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface PartnerTopic {
  id: string;
  partnerId: string;
  scope: string;
  title: string;
  notes?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export function genTopicId(): string {
  return `ptopic_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Escopo lógico usado para os ANEXOS de assuntos de um parceiro. */
export function topicAttachmentScope(partnerId: string): string {
  return `parceiro-${partnerId}`;
}

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

export function normalizeTopic(row: Record<string, unknown>): PartnerTopic {
  return {
    id: String(row.id),
    partnerId: String(row.partnerId ?? ""),
    scope: String(row.scope ?? ""),
    title: String(row.title ?? ""),
    notes: (row.notes as string) ?? undefined,
    sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : Number(row.sortOrder ?? 0) || 0,
    createdAt: toMs(row.createdAt),
    updatedAt: toMs(row.updatedAt),
  };
}

/** Ordena assuntos por sortOrder (asc) e, em empate, por createdAt (asc). */
export function sortTopics(list: PartnerTopic[]): PartnerTopic[] {
  return [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt - b.createdAt;
  });
}

function toPayload(t: PartnerTopic) {
  return {
    id: t.id,
    partnerId: t.partnerId,
    scope: t.scope,
    title: t.title,
    notes: t.notes ?? null,
    sortOrder: t.sortOrder,
    createdAt: String(t.createdAt),
    updatedAt: String(t.updatedAt),
  };
}

export function usePartnerTopics(partnerId: string, scope: string) {
  const utils = trpc.useUtils();
  const query = trpc.data.partnerTopics.listByPartner.useQuery(
    { partnerId },
    { refetchInterval: 5000, refetchOnWindowFocus: true, enabled: !!partnerId },
  );
  const upsertMut = trpc.data.partnerTopics.upsert.useMutation();
  const deleteMut = trpc.data.partnerTopics.delete.useMutation();

  const topics = useMemo<PartnerTopic[]>(() => {
    const rows = (query.data ?? []).map((r) => normalizeTopic(r as Record<string, unknown>));
    return sortTopics(rows);
  }, [query.data]);

  const loaded = !query.isLoading;

  const reload = useCallback(async () => {
    await utils.data.partnerTopics.listByPartner.invalidate({ partnerId });
  }, [utils, partnerId]);

  const createTopic = useCallback(
    async (title: string, notes?: string) => {
      const now = Date.now();
      const maxOrder = topics.reduce((acc, t) => Math.max(acc, t.sortOrder), -1);
      const topic: PartnerTopic = {
        id: genTopicId(),
        partnerId,
        scope,
        title: title.trim(),
        notes: notes?.trim() || undefined,
        sortOrder: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      };
      await upsertMut.mutateAsync(toPayload(topic));
      await reload();
      return topic;
    },
    [topics, partnerId, scope, upsertMut, reload],
  );

  const updateTopic = useCallback(
    async (id: string, patch: Partial<Pick<PartnerTopic, "title" | "notes" | "sortOrder">>) => {
      const existing = topics.find((t) => t.id === id);
      if (!existing) return;
      const updated: PartnerTopic = {
        ...existing,
        ...patch,
        title: patch.title !== undefined ? patch.title.trim() : existing.title,
        notes: patch.notes !== undefined ? (patch.notes.trim() || undefined) : existing.notes,
        updatedAt: Date.now(),
      };
      await upsertMut.mutateAsync(toPayload(updated));
      await reload();
    },
    [topics, upsertMut, reload],
  );

  const removeTopic = useCallback(
    async (id: string) => {
      await deleteMut.mutateAsync({ id });
      await reload();
    },
    [deleteMut, reload],
  );

  return { topics, loaded, reload, createTopic, updateTopic, removeTopic };
}
