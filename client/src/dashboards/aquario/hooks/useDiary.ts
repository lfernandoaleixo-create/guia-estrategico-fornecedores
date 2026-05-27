// =============================================================================
// Hook: useDiary
// Gerencia diário de campo por fornecedor com entradas de texto, datas e anexos
// Persistência: IndexedDB (suporta arquivos grandes; fallback silencioso se indisponível)
// =============================================================================

import { useState, useCallback, useEffect } from "react";

export interface DiaryAttachment {
  id: string;
  name: string;
  type: string; // mime
  size: number; // bytes
  dataUrl: string; // base64 dataURL
  addedAt: string;
}

export interface DiaryEntry {
  supplierId: string;
  text: string;
  attachments: DiaryAttachment[];
  updatedAt: string;
}

const DB_NAME = "china-suppliers-diary";
const DB_VERSION = 1;
const STORE = "diary";

// ---------- IndexedDB helpers ----------
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
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

async function dbGetAll(): Promise<Record<string, DiaryEntry>> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const entries: DiaryEntry[] = req.result || [];
        const map: Record<string, DiaryEntry> = {};
        entries.forEach((e) => (map[e.supplierId] = e));
        resolve(map);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return {};
  }
}

async function dbPut(entry: DiaryEntry): Promise<void> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

async function dbDelete(supplierId: string): Promise<void> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(supplierId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

// ---------- Util ----------
function nowFormatted(): string {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

// ---------- Hook ----------
export function useDiary() {
  const [entries, setEntries] = useState<Record<string, DiaryEntry>>({});
  const [loaded, setLoaded] = useState(false);

  // Carregar do IndexedDB no mount
  useEffect(() => {
    let mounted = true;
    dbGetAll().then((all) => {
      if (mounted) {
        setEntries(all);
        setLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const upsertText = useCallback(
    (supplierId: string, text: string) => {
      setEntries((prev) => {
        const existing = prev[supplierId];
        const updated: DiaryEntry = {
          supplierId,
          text,
          attachments: existing?.attachments ?? [],
          updatedAt: nowFormatted(),
        };
        const next = { ...prev, [supplierId]: updated };
        // se tudo vazio, removemos
        if (!text.trim() && updated.attachments.length === 0) {
          delete next[supplierId];
          dbDelete(supplierId);
        } else {
          dbPut(updated);
        }
        return next;
      });
    },
    []
  );

  const addAttachment = useCallback(async (supplierId: string, file: File) => {
    // Limite individual de 8 MB para evitar travar o IndexedDB
    if (file.size > 8 * 1024 * 1024) {
      throw new Error("Arquivo maior que 8 MB. Reduza o tamanho ou compacte antes de anexar.");
    }
    const dataUrl = await fileToDataURL(file);
    const att: DiaryAttachment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      dataUrl,
      addedAt: nowFormatted(),
    };
    setEntries((prev) => {
      const existing = prev[supplierId];
      const updated: DiaryEntry = {
        supplierId,
        text: existing?.text ?? "",
        attachments: [...(existing?.attachments ?? []), att],
        updatedAt: nowFormatted(),
      };
      dbPut(updated);
      return { ...prev, [supplierId]: updated };
    });
    return att;
  }, []);

  const removeAttachment = useCallback((supplierId: string, attachmentId: string) => {
    setEntries((prev) => {
      const existing = prev[supplierId];
      if (!existing) return prev;
      const updated: DiaryEntry = {
        ...existing,
        attachments: existing.attachments.filter((a) => a.id !== attachmentId),
        updatedAt: nowFormatted(),
      };
      const next = { ...prev };
      if (!updated.text.trim() && updated.attachments.length === 0) {
        delete next[supplierId];
        dbDelete(supplierId);
      } else {
        next[supplierId] = updated;
        dbPut(updated);
      }
      return next;
    });
  }, []);

  const deleteEntry = useCallback((supplierId: string) => {
    setEntries((prev) => {
      const next = { ...prev };
      delete next[supplierId];
      dbDelete(supplierId);
      return next;
    });
  }, []);

  const getEntry = useCallback(
    (supplierId: string): DiaryEntry | undefined => entries[supplierId],
    [entries]
  );

  const totalEntries = Object.keys(entries).length;

  return {
    entries,
    loaded,
    upsertText,
    addAttachment,
    removeAttachment,
    deleteEntry,
    getEntry,
    totalEntries,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
