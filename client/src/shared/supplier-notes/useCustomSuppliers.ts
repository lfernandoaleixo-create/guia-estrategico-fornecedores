// =============================================================================
// useCustomSuppliers — gerenciamento de fornecedores cadastrados manualmente
// pelo operador em cada dashboard (aquario, tapete, yiwu). Persistido em
// IndexedDB no mesmo banco usado pelas anotações; entra no backup/restore.
// =============================================================================

import { useCallback, useEffect, useState } from "react";

export type SupplierScope = "aquario" | "tapete" | "yiwu";

export interface CustomSupplierContact {
  id: string;
  label?: string; // ex: "Comercial BR", "Whatsapp Mr. Wang"
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
  category?: string; // Categoria/NCM
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
  links: CustomSupplierContact[]; // site, alibaba, yiwugo, made-in-china, etc.

  // Contato principal (responsável)
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

  // Grupos atribuídos a este fornecedor manual (IDs do useSupplierGroups)
  groupIds?: string[];
}

// ─── Persistência IndexedDB ──────────────────────────────────────────────────
const DB_NAME = "guia-custom-suppliers";
const STORE = "custom_suppliers";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("scope", "scope", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll(scope: SupplierScope): Promise<CustomSupplier[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const idx = store.index("scope");
    const req = idx.getAll(scope);
    req.onsuccess = () => {
      const list = (req.result as CustomSupplier[]) ?? [];
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

async function putOne(s: CustomSupplier): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(s);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteOne(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// API global usada também pelo backup/restore
export async function exportAllCustomSuppliers(): Promise<CustomSupplier[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as CustomSupplier[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function importCustomSuppliers(list: CustomSupplier[]): Promise<{ added: number; updated: number }> {
  if (!Array.isArray(list)) return { added: 0, updated: 0 };
  const existing = new Set(
    (await exportAllCustomSuppliers()).map((s) => s.id)
  );
  let added = 0;
  let updated = 0;
  for (const s of list) {
    if (existing.has(s.id)) updated++;
    else added++;
    await putOne(s);
  }
  return { added, updated };
}

// ─── ID generator ────────────────────────────────────────────────────────────
function genId(scope: SupplierScope) {
  return `custom-${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function genContactId() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
export { genContactId };

// ─── React hook ──────────────────────────────────────────────────────────────
export function useCustomSuppliers(scope: SupplierScope) {
  const [list, setList] = useState<CustomSupplier[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await getAll(scope);
      setList(data);
    } finally {
      setLoaded(true);
    }
  }, [scope]);

  useEffect(() => {
    void reload();
  }, [reload]);

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
      await putOne(supplier);
      await reload();
      return supplier;
    },
    [scope, reload]
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
      await putOne(updated);
      await reload();
    },
    [list, reload]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteOne(id);
      await reload();
    },
    [reload]
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
