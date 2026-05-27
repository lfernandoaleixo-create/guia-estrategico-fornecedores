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

export interface SupplierAttachment {
  id: string;
  name: string;
  type: string; // mime
  size: number; // bytes
  dataUrl: string; // base64
  addedAt: string; // dd/mm/yyyy
}

export interface SupplierNoteEntry {
  supplierId: string;
  status: SupplierStatus;
  observacoes: string;
  attachments: SupplierAttachment[];
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---------- Hook ----------
export function useSupplierNotes(scope: "aquario" | "tapete" | "yiwu") {
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
    return () => {
      mounted = false;
    };
  }, [scope]);

  const upsertEntry = useCallback(
    (
      supplierId: string,
      patch: { status?: SupplierStatus; observacoes?: string }
    ) => {
      setEntries((prev) => {
        const existing = prev[supplierId];
        const updated: SupplierNoteEntry = {
          supplierId,
          status: patch.status ?? existing?.status ?? "nao-visitado",
          observacoes: patch.observacoes ?? existing?.observacoes ?? "",
          attachments: existing?.attachments ?? [],
          createdAt: existing?.createdAt ?? nowDate(),
          updatedAt: nowDate(),
        };
        dbPut(scope, updated);
        return { ...prev, [supplierId]: updated };
      });
    },
    [scope]
  );

  const addAttachment = useCallback(
    async (supplierId: string, file: File) => {
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
      };
      setEntries((prev) => {
        const existing = prev[supplierId];
        const updated: SupplierNoteEntry = {
          supplierId,
          status: existing?.status ?? "nao-visitado",
          observacoes: existing?.observacoes ?? "",
          attachments: [...(existing?.attachments ?? []), att],
          createdAt: existing?.createdAt ?? nowDate(),
          updatedAt: nowDate(),
        };
        dbPut(scope, updated);
        return { ...prev, [supplierId]: updated };
      });
      return att;
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
        return { ...prev, [supplierId]: updated };
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
        return next;
      });
    },
    [scope]
  );

  const getEntry = useCallback(
    (supplierId: string): SupplierNoteEntry | undefined => entries[supplierId],
    [entries]
  );

  return {
    entries,
    loaded,
    upsertEntry,
    addAttachment,
    removeAttachment,
    deleteEntry,
    getEntry,
    total: Object.keys(entries).length,
  };
}
