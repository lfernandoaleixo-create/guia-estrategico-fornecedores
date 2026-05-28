// =============================================================================
// useSupplierNotes — Hook unificado de anotações por fornecedor
// Compartilhado pelos 3 dashboards (Aquário, Tapete, Yiwu).
//
// Cada entrada contém:
//   - status: do fornecedor (lista padronizada e editável)
//   - observacoes: texto livre
//   - anexos: arquivos (PDF, planilhas, imagens, etc.) como dataURL
//   - createdAt / updatedAt: data automática
//
// Persistência: IndexedDB, com namespace por scope (aquario/tapete/yiwu),
// permitindo que cada dashboard tenha sua própria base sem colidir.
// =============================================================================

import { useState, useCallback, useEffect } from "react";

export type SupplierStatus =
  | "nao-visitado"
  | "contato-feito"
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
  dataUrl: string; // base64
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
  /** IDs dos grupos aos quais o fornecedor pertence (gerenciados em useSupplierGroups). */
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

export const STATUS_ORDER: SupplierStatus[] = [
  "nao-visitado",
  "contato-feito",
  "amostra-solicitada",
  "negociando",
  "fornecedor-aprovado",
  "descartado",
];

// ---------- IndexedDB helpers (1 DB por scope) ----------
const DB_VERSION = 1;
const STORE = "notes";

function dbName(scope: string): string {
  return `guia-estrategico-notes-${scope}`;
}

function openDB(scope: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName(scope), DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "supplierId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(scope: string): Promise<Record<string, SupplierNoteEntry>> {
  try {
    const db = await openDB(scope);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const entries: SupplierNoteEntry[] = req.result || [];
        const map: Record<string, SupplierNoteEntry> = {};
        entries.forEach((e) => (map[e.supplierId] = e));
        resolve(map);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return {};
  }
}

async function dbPut(scope: string, entry: SupplierNoteEntry): Promise<void> {
  try {
    const db = await openDB(scope);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* silent */
  }
}

async function dbDelete(scope: string, supplierId: string): Promise<void> {
  try {
    const db = await openDB(scope);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(supplierId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* silent */
  }
}

// ---------- Utilidades ----------
function nowDate(): string {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ---------- API direta (usada por migração e backup) ----------
export async function readEntryDirect(
  scope: "aquario" | "tapete" | "yiwu",
  supplierId: string,
): Promise<SupplierNoteEntry | null> {
  const all = await dbGetAll(scope);
  return all[supplierId] ?? null;
}
export async function writeEntryDirect(
  scope: "aquario" | "tapete" | "yiwu",
  entry: SupplierNoteEntry,
): Promise<void> {
  await dbPut(scope, entry);
}
export async function deleteEntryDirect(
  scope: "aquario" | "tapete" | "yiwu",
  supplierId: string,
): Promise<void> {
  await dbDelete(scope, supplierId);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---------- Pub/Sub global para sincronizar instâncias do hook ----------
// Cada instância (lista, painel, etc.) registra um listener; quando uma escreve,
// todas recebem o estado atualizado e re-renderizam.
type Scope = "aquario" | "tapete" | "yiwu";
const listeners: Record<Scope, Set<(state: Record<string, SupplierNoteEntry>) => void>> = {
  aquario: new Set(),
  tapete: new Set(),
  yiwu: new Set(),
};
function notify(scope: Scope, state: Record<string, SupplierNoteEntry>) {
  listeners[scope].forEach((fn) => fn(state));
}

// ---------- Hook ----------
export function useSupplierNotes(scope: Scope) {
  const [entries, setEntries] = useState<Record<string, SupplierNoteEntry>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    dbGetAll(scope).then((all) => {
      if (mounted) {
        setEntries(all);
        setLoaded(true);
      }
    });
    // Escuta mudanças feitas por outras instâncias do hook.
    const sub = (state: Record<string, SupplierNoteEntry>) => {
      if (mounted) setEntries(state);
    };
    listeners[scope].add(sub);
    return () => {
      mounted = false;
      listeners[scope].delete(sub);
    };
  }, [scope]);

  const upsertEntry = useCallback(
    (
      supplierId: string,
      patch: { status?: SupplierStatus; observacoes?: string; fields?: Record<string, string>; groupIds?: string[] }
    ) => {
      setEntries((prev) => {
        const existing = prev[supplierId];
        const mergedFields = {
          ...(existing?.fields ?? {}),
          ...(patch.fields ?? {}),
        };
        const updated: SupplierNoteEntry = {
          supplierId,
          status: patch.status ?? existing?.status ?? "nao-visitado",
          observacoes: patch.observacoes ?? existing?.observacoes ?? "",
          fields: patch.fields ? mergedFields : existing?.fields ?? {},
          attachments: existing?.attachments ?? [],
          quoteRows: existing?.quoteRows,
          groupIds: patch.groupIds ?? existing?.groupIds ?? [],
          createdAt: existing?.createdAt ?? nowDate(),
          updatedAt: nowDate(),
        };
        dbPut(scope, updated);
        const next = { ...prev, [supplierId]: updated };
        notify(scope, next);
        return next;
      });
    },
    [scope]
  );

  const addAttachment = useCallback(
    async (
      supplierId: string,
      file: File,
      category: AttachmentCategory = "outros"
    ) => {
      if (file.size > 8 * 1024 * 1024) {
        throw new Error("Arquivo maior que 8 MB. Compacte ou reduza antes de anexar.");
      }
      const dataUrl = await fileToDataURL(file);
      const att: SupplierAttachment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
        addedAt: nowDate(),
        category,
      };
      setEntries((prev) => {
        const existing = prev[supplierId];
        const updated: SupplierNoteEntry = {
          supplierId,
          status: existing?.status ?? "nao-visitado",
          observacoes: existing?.observacoes ?? "",
          fields: existing?.fields ?? {},
          attachments: [...(existing?.attachments ?? []), att],
          quoteRows: existing?.quoteRows,
          groupIds: existing?.groupIds ?? [],
          createdAt: existing?.createdAt ?? nowDate(),
          updatedAt: nowDate(),
        };
        dbPut(scope, updated);
        const next = { ...prev, [supplierId]: updated };
        notify(scope, next);
        return next;
      });
      return att;
    },
    [scope]
  );

  const upsertQuoteRows = useCallback(
    (supplierId: string, rows: QuoteRow[]) => {
      setEntries((prev) => {
        const existing = prev[supplierId];
        const updated: SupplierNoteEntry = {
          supplierId,
          status: existing?.status ?? "nao-visitado",
          observacoes: existing?.observacoes ?? "",
          fields: existing?.fields ?? {},
          attachments: existing?.attachments ?? [],
          quoteRows: rows,
          groupIds: existing?.groupIds ?? [],
          createdAt: existing?.createdAt ?? nowDate(),
          updatedAt: nowDate(),
        };
        dbPut(scope, updated);
        const next = { ...prev, [supplierId]: updated };
        notify(scope, next);
        return next;
      });
    },
    [scope]
  );

  const removeAttachment = useCallback(
    (supplierId: string, attachmentId: string) => {
      setEntries((prev) => {
        const existing = prev[supplierId];
        if (!existing) return prev;
        const updated: SupplierNoteEntry = {
          ...existing,
          attachments: existing.attachments.filter((a) => a.id !== attachmentId),
          updatedAt: nowDate(),
        };
        dbPut(scope, updated);
        const next = { ...prev, [supplierId]: updated };
        notify(scope, next);
        return next;
      });
    },
    [scope]
  );

  const deleteEntry = useCallback(
    (supplierId: string) => {
      setEntries((prev) => {
        const next = { ...prev };
        delete next[supplierId];
        dbDelete(scope, supplierId);
        notify(scope, next);
        return next;
      });
    },
    [scope]
  );

  const getEntry = useCallback(
    (supplierId: string): SupplierNoteEntry | undefined => entries[supplierId],
    [entries]
  );

  const setSupplierGroups = useCallback(
    (supplierId: string, groupIds: string[]) => {
      setEntries((prev) => {
        const existing = prev[supplierId];
        const updated: SupplierNoteEntry = {
          supplierId,
          status: existing?.status ?? "nao-visitado",
          observacoes: existing?.observacoes ?? "",
          fields: existing?.fields ?? {},
          attachments: existing?.attachments ?? [],
          quoteRows: existing?.quoteRows,
          groupIds: Array.from(new Set(groupIds)),
          createdAt: existing?.createdAt ?? nowDate(),
          updatedAt: nowDate(),
        };
        dbPut(scope, updated);
        const next = { ...prev, [supplierId]: updated };
        notify(scope, next);
        return next;
      });
    },
    [scope]
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
