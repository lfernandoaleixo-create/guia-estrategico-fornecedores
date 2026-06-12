// =============================================================================
// useSupplierNotes — Hook unificado de anotações por fornecedor
// Compartilhado pelos dashboards (Aquário, Tapete, Yiwu, grupos promovidos).
//
// MIGRADO: agora persiste no BANCO DE DADOS COMPARTILHADO via tRPC, por escopo
// (scope), para que todos os usuários com o link vejam os mesmos status,
// observações, anexos, cotações e grupos. A assinatura pública do hook foi
// mantida idêntica à versão IndexedDB para não quebrar a UI.
//
// Sincronização entre usuários: polling a cada 5s e refetch após cada mutação.
// =============================================================================

import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";

export type SupplierStatus =
  | "nao-visitado"
  | "contato-feito"
  | "sem-retorno"
  | "amostra-solicitada"
  | "negociando"
  | "fornecedor-aprovado"
  | "descartado";

export type AttachmentCategory = "catalogos" | "fotos" | "cotacoes" | "outros";

export const ATTACHMENT_CATEGORY_LABEL: Record<AttachmentCategory, string> = {
  catalogos: "Catálogos",
  fotos: "Fotos",
  cotacoes: "Cotações",
  outros: "Outros documentos",
};

export interface SupplierAttachment {
  id: string;
  name: string;
  type: string; // mime
  size: number; // bytes
  /** Anexos LEGADOS: conteúdo base64 inline. Novos anexos usam url/fileKey. */
  dataUrl?: string; // base64 (legado)
  /** Novo modelo: referência ao S3. */
  url?: string; // ex.: /manus-storage/<key>
  fileKey?: string; // chave no S3
  addedAt: string; // dd/mm/yyyy
  category?: AttachmentCategory; // default "outros" para entradas legadas
}

export interface QuoteRow {
  id: string;
  produto: string;
  qtd: string;
  moq: string;
  precoFob: string;
  leadTime: string;
  pagamento: string;
  observacao: string;
}

export interface SupplierNoteEntry {
  supplierId: string;
  status: SupplierStatus;
  observacoes: string;
  fields: Record<string, string>;
  attachments: SupplierAttachment[];
  quoteRows?: QuoteRow[];
  /** IDs dos grupos aos quais o fornecedor pertence. */
  groupIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export const STATUS_CONFIG: Record<
  SupplierStatus,
  { label: string; emoji: string; color: string; bg: string; border: string }
> = {
  "nao-visitado": {
    label: "Não visitado",
    emoji: "⬜",
    color: "#27272a",
    bg: "#d4d4d8",
    border: "#52525b",
  },
  "contato-feito": {
    label: "Contato feito",
    emoji: "📧",
    color: "#1e40af",
    bg: "#dbeafe",
    border: "#93c5fd",
  },
  "sem-retorno": {
    label: "Não deu retorno",
    emoji: "📵",
    color: "#3e2723",
    bg: "#d7ccc8",
    border: "#8d6e63",
  },
  "amostra-solicitada": {
    label: "Amostra solicitada",
    emoji: "📦",
    color: "#9a3412",
    bg: "#ffedd5",
    border: "#fdba74",
  },
  negociando: {
    label: "Negociando",
    emoji: "🤝",
    color: "#854d0e",
    bg: "#fef9c3",
    border: "#fde047",
  },
  "fornecedor-aprovado": {
    label: "Fornecedor aprovado",
    emoji: "✅",
    color: "#166534",
    bg: "#dcfce7",
    border: "#86efac",
  },
  descartado: {
    label: "Descartado",
    emoji: "❌",
    color: "#991b1b",
    bg: "#fee2e2",
    border: "#fca5a5",
  },
};

// Classificação de preço (aplicável quando o fornecedor é aprovado).
export type PrecoClassificacao = "excelente" | "bom" | "ruim";

export const PRECO_CONFIG: Record<
  PrecoClassificacao,
  { label: string; emoji: string; color: string; bg: string; border: string }
> = {
  excelente: {
    label: "Preço Excelente",
    emoji: "🟢",
    color: "#166534",
    bg: "#dcfce7",
    border: "#86efac",
  },
  bom: {
    label: "Preço Bom",
    emoji: "🟡",
    color: "#854d0e",
    bg: "#fef9c3",
    border: "#fde047",
  },
  ruim: {
    label: "Preço Ruim",
    emoji: "🔴",
    color: "#991b1b",
    bg: "#fee2e2",
    border: "#fca5a5",
  },
};

export const PRECO_ORDER: PrecoClassificacao[] = ["excelente", "bom", "ruim"];

export const STATUS_ORDER: SupplierStatus[] = [
  "nao-visitado",
  "contato-feito",
  "sem-retorno",
  "amostra-solicitada",
  "negociando",
  "fornecedor-aprovado",
  "descartado",
];

// ---------- Utilidades ----------
/**
 * Filtra uma lista de entradas pelo status selecionado nos cards de resumo.
 * `status === null` significa "sem filtro" e retorna a lista inalterada.
 * Usado pelo ReportPanel (filtro por clique nos cards) e coberto por testes.
 */
export function filterEntriesByStatus<T extends { status: SupplierStatus }>(
  entries: T[],
  status: SupplierStatus | null,
): T[] {
  if (!status) return entries;
  return entries.filter((e) => e.status === status);
}

function nowDate(): string {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---------- Serialização (DB row <-> SupplierNoteEntry) ----------
function parseAttachments(raw: unknown): SupplierAttachment[] {
  if (Array.isArray(raw)) return raw as SupplierAttachment[];
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as SupplierAttachment[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToEntry(row: Record<string, unknown>): SupplierNoteEntry {
  return {
    supplierId: String(row.supplierId),
    status: (row.status as SupplierStatus) ?? "nao-visitado",
    observacoes: (row.observacoes as string) ?? "",
    fields: (row.fields as Record<string, string>) ?? {},
    attachments: parseAttachments(row.attachments),
    quoteRows: (row.quoteRows as QuoteRow[]) ?? undefined,
    groupIds: (row.groupIds as string[]) ?? [],
    createdAt: (row.createdAt as string) ?? nowDate(),
    updatedAt: (row.updatedAt as string) ?? nowDate(),
  };
}

function entryToPayload(scope: string, e: SupplierNoteEntry) {
  return {
    scope,
    supplierId: e.supplierId,
    status: e.status,
    observacoes: e.observacoes ?? "",
    fields: e.fields ?? {},
    attachments: JSON.stringify(e.attachments ?? []),
    quoteRows: e.quoteRows ?? null,
    groupIds: e.groupIds ?? [],
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

// ---------- API direta (usada por migração e backup) ----------
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

export async function readEntryDirect(
  scope: string,
  supplierId: string,
): Promise<SupplierNoteEntry | null> {
  const rows = await trpcFetch<Record<string, unknown>[]>(
    "data.notes.listByScope",
    "query",
    { scope },
  );
  const found = (rows ?? []).find((r) => String(r.supplierId) === supplierId);
  return found ? rowToEntry(found) : null;
}

export async function writeEntryDirect(scope: string, entry: SupplierNoteEntry): Promise<void> {
  await trpcFetch("data.notes.upsert", "mutation", entryToPayload(scope, entry));
}

export async function deleteEntryDirect(scope: string, supplierId: string): Promise<void> {
  await trpcFetch("data.notes.delete", "mutation", { scope, supplierId });
}

// ---------- Hook ----------
type Scope = string;

export function useSupplierNotes(scope: Scope) {
  const utils = trpc.useUtils();
  const query = trpc.data.notes.listByScope.useQuery(
    { scope },
    { refetchInterval: 5000, refetchOnWindowFocus: true },
  );
  const upsertMut = trpc.data.notes.upsert.useMutation();
  const deleteMut = trpc.data.notes.delete.useMutation();

  const entries = useMemo<Record<string, SupplierNoteEntry>>(() => {
    const map: Record<string, SupplierNoteEntry> = {};
    (query.data ?? []).forEach((row) => {
      const e = rowToEntry(row as Record<string, unknown>);
      map[e.supplierId] = e;
    });
    return map;
  }, [query.data]);

  const loaded = !query.isLoading;

  const reload = useCallback(async () => {
    await utils.data.notes.listByScope.invalidate({ scope });
  }, [utils, scope]);

  // Salva uma entrada completa no servidor e revalida.
  const persist = useCallback(
    async (entry: SupplierNoteEntry) => {
      await upsertMut.mutateAsync(entryToPayload(scope, entry));
      await reload();
    },
    [scope, upsertMut, reload],
  );

  const buildBase = useCallback(
    (supplierId: string): SupplierNoteEntry => {
      const existing = entries[supplierId];
      return {
        supplierId,
        status: existing?.status ?? "nao-visitado",
        observacoes: existing?.observacoes ?? "",
        fields: existing?.fields ?? {},
        attachments: existing?.attachments ?? [],
        quoteRows: existing?.quoteRows,
        groupIds: existing?.groupIds ?? [],
        createdAt: existing?.createdAt ?? nowDate(),
        updatedAt: nowDate(),
      };
    },
    [entries],
  );

  const upsertEntry = useCallback(
    (
      supplierId: string,
      patch: {
        status?: SupplierStatus;
        observacoes?: string;
        fields?: Record<string, string>;
        groupIds?: string[];
      },
    ) => {
      const base = buildBase(supplierId);
      const mergedFields = { ...base.fields, ...(patch.fields ?? {}) };
      const updated: SupplierNoteEntry = {
        ...base,
        status: patch.status ?? base.status,
        observacoes: patch.observacoes ?? base.observacoes,
        fields: patch.fields ? mergedFields : base.fields,
        groupIds: patch.groupIds ?? base.groupIds,
      };
      void persist(updated);
    },
    [buildBase, persist],
  );

  // NOVO MODELO: cada arquivo é enviado individualmente ao S3 via XHR (com
  // progresso real), e o servidor anexa apenas a referência (url/fileKey) ao
  // registro da nota. Isso evita reenviar todos os anexos em base64 (que
  // estourava o payload no 2º upload e fazia o funcionário perder os dados).
  const addAttachment = useCallback(
    async (
      supplierId: string,
      file: File,
      category: AttachmentCategory = "outros",
      onProgress?: (percent: number) => void,
    ) => {
      if (file.size > 20 * 1024 * 1024) {
        throw new Error("Arquivo maior que 20 MB. Compacte ou reduza antes de anexar.");
      }

      const att = await new Promise<SupplierAttachment>((resolve, reject) => {
        const form = new FormData();
        form.append("scope", scope);
        form.append("supplierId", supplierId);
        form.append("category", category);
        form.append("file", file, file.name);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload-attachment");
        xhr.withCredentials = true;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              if (onProgress) onProgress(100);
              resolve(json.attachment as SupplierAttachment);
            } catch {
              reject(new Error("Resposta inválida do servidor"));
            }
          } else {
            let msg = "Falha no upload do arquivo";
            try {
              const json = JSON.parse(xhr.responseText);
              if (json?.error) msg = json.error;
            } catch {
              /* mantém msg padrão */
            }
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => reject(new Error("Erro de rede durante o upload"));
        xhr.send(form);
      });

      // O servidor já gravou a referência; recarrega para refletir na UI.
      await reload();
      return att;
    },
    [scope, reload],
  );

  const upsertQuoteRows = useCallback(
    (supplierId: string, rows: QuoteRow[]) => {
      const base = buildBase(supplierId);
      void persist({ ...base, quoteRows: rows });
    },
    [buildBase, persist],
  );

  const removeAttachment = useCallback(
    (supplierId: string, attachmentId: string) => {
      const existing = entries[supplierId];
      if (!existing) return;
      const updated: SupplierNoteEntry = {
        ...existing,
        attachments: existing.attachments.filter((a) => a.id !== attachmentId),
        updatedAt: nowDate(),
      };
      void persist(updated);
    },
    [entries, persist],
  );

  const deleteEntry = useCallback(
    (supplierId: string) => {
      void (async () => {
        await deleteMut.mutateAsync({ scope, supplierId });
        await reload();
      })();
    },
    [scope, deleteMut, reload],
  );

  const getEntry = useCallback(
    (supplierId: string): SupplierNoteEntry | undefined => entries[supplierId],
    [entries],
  );

  const setSupplierGroups = useCallback(
    (supplierId: string, groupIds: string[]) => {
      const base = buildBase(supplierId);
      void persist({ ...base, groupIds: Array.from(new Set(groupIds)) });
    },
    [buildBase, persist],
  );

  return {
    entries,
    loaded,
    upsertEntry,
    addAttachment,
    removeAttachment,
    upsertQuoteRows,
    deleteEntry,
    getEntry,
    setSupplierGroups,
    total: Object.keys(entries).length,
  };
}
