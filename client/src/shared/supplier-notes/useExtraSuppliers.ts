// =============================================================================
// useExtraSuppliers — fornecedores cadastrados na 4ª aba "Adicionar Fornecedores".
// Diferentemente dos `useCustomSuppliers`, estes não pertencem aos 3 dashboards
// (Aquário, Tapete, Yiwu) — eles ficam vinculados a um CustomGroup criado pelo
// usuário, e podem virar dashboard próprio se o grupo for promovido.
//
// Persistido em IndexedDB no DB compartilhado "guia-fornecedores",
// store "extra_suppliers".
// =============================================================================
import { useCallback, useEffect, useState } from "react";

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

const DB_NAME = "guia-fornecedores";
const STORE = "extra_suppliers";
const DB_VERSION = 3;

const isBrowser = typeof window !== "undefined" && typeof indexedDB !== "undefined";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("custom")) {
        db.createObjectStore("custom", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("groups")) {
        db.createObjectStore("groups", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("custom_groups")) {
        db.createObjectStore("custom_groups", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("groupId", "groupId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbReadAll(): Promise<ExtraSupplier[]> {
  if (!isBrowser) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const list = (req.result as ExtraSupplier[]) ?? [];
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(s: ExtraSupplier): Promise<void> {
  if (!isBrowser) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(s);
  });
}

async function dbDelete(id: string): Promise<void> {
  if (!isBrowser) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
}

function genId(): string {
  return `extra_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
export function genExtraContactId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useExtraSuppliers() {
  const [list, setList] = useState<ExtraSupplier[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const all = await dbReadAll();
      setList(all);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

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
      await dbPut(supplier);
      await reload();
      return supplier;
    },
    [reload],
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
      await dbPut(updated);
      await reload();
    },
    [list, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await dbDelete(id);
      await reload();
    },
    [reload],
  );

  return { list, loaded, reload, create, update, remove };
}

export async function readAllExtraSuppliers(): Promise<ExtraSupplier[]> {
  return dbReadAll();
}

export async function writeAllExtraSuppliers(list: ExtraSupplier[]): Promise<void> {
  if (!isBrowser) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(STORE);
    list.forEach((s) => {
      if (s && s.id) store.put(s);
    });
  });
}
