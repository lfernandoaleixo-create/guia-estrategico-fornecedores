import { useCallback, useEffect, useState } from "react";

/**
 * Sistema de grupos de fornecedores (compartilhado entre os 3 dashboards).
 * Cada grupo tem um id estável, um nome, uma legenda/descrição e uma cor para
 * destacar visualmente o badge.
 *
 * Persistido em IndexedDB no DB "guia-fornecedores", store "groups".
 */

export interface SupplierGroup {
  id: string;
  name: string;
  legend: string; // descrição/legenda livre
  color: string; // hex (ex: "#f97316")
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

const DB_NAME = "guia-fornecedores";
const DB_VERSION = 2; // bumped to add "groups" store
const STORE_GROUPS = "groups";
const STORE_CUSTOM = "custom"; // mantido para compatibilidade com useCustomSuppliers

const isBrowser = typeof window !== "undefined" && typeof indexedDB !== "undefined";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CUSTOM)) {
        db.createObjectStore(STORE_CUSTOM, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_GROUPS)) {
        db.createObjectStore(STORE_GROUPS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbReadAll(): Promise<SupplierGroup[]> {
  if (!isBrowser) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GROUPS, "readonly");
    const store = tx.objectStore(STORE_GROUPS);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as SupplierGroup[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(group: SupplierGroup): Promise<void> {
  if (!isBrowser) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GROUPS, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_GROUPS).put(group);
  });
}

async function dbDelete(id: string): Promise<void> {
  if (!isBrowser) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GROUPS, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_GROUPS).delete(id);
  });
}

// Paleta sugerida para novos grupos (cores distintas e legíveis em fundo claro/escuro)
export const GROUP_COLOR_PALETTE = [
  "#f97316", // laranja
  "#ef4444", // vermelho
  "#f59e0b", // âmbar
  "#84cc16", // lima
  "#10b981", // esmeralda
  "#06b6d4", // ciano
  "#3b82f6", // azul
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#64748b", // ardósia
];

function genId(): string {
  return `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

export function useSupplierGroups() {
  const [groups, setGroups] = useState<SupplierGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const all = await dbReadAll();
      // Ordenar pelo nome para exibição estável
      all.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      setGroups(all);
    } catch (err) {
      console.error("[useSupplierGroups] reload", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createGroup = useCallback(
    async (input: { name: string; legend?: string; color?: string }) => {
      const trimmed = input.name.trim();
      if (!trimmed) return null;
      const palette = GROUP_COLOR_PALETTE;
      const fallbackColor = palette[Math.floor(Math.random() * palette.length)];
      const group: SupplierGroup = {
        id: genId(),
        name: trimmed,
        legend: input.legend?.trim() ?? "",
        color: input.color || fallbackColor,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      await dbPut(group);
      await reload();
      return group;
    },
    [reload],
  );

  const updateGroup = useCallback(
    async (
      id: string,
      patch: Partial<Pick<SupplierGroup, "name" | "legend" | "color">>,
    ) => {
      const current = groups.find((g) => g.id === id);
      if (!current) return;
      const updated: SupplierGroup = {
        ...current,
        ...patch,
        name: (patch.name ?? current.name).trim() || current.name,
        legend: patch.legend !== undefined ? patch.legend.trim() : current.legend,
        color: patch.color ?? current.color,
        updatedAt: nowISO(),
      };
      await dbPut(updated);
      await reload();
    },
    [groups, reload],
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      await dbDelete(id);
      await reload();
    },
    [reload],
  );

  // Importar/exportar para integração com backup .json
  const exportGroups = useCallback(async (): Promise<SupplierGroup[]> => {
    return await dbReadAll();
  }, []);

  const importGroups = useCallback(
    async (incoming: SupplierGroup[]) => {
      if (!isBrowser) return;
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_GROUPS, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        const store = tx.objectStore(STORE_GROUPS);
        incoming.forEach((g) => {
          if (g && g.id && g.name) {
            store.put(g);
          }
        });
      });
      await reload();
    },
    [reload],
  );

  return {
    groups,
    loading,
    createGroup,
    updateGroup,
    deleteGroup,
    reload,
    exportGroups,
    importGroups,
  };
}

/** Helper síncrono para casos em que não dá pra usar hook (ex.: backup.ts) */
export async function readAllGroups(): Promise<SupplierGroup[]> {
  return dbReadAll();
}

export async function writeAllGroups(groups: SupplierGroup[]): Promise<void> {
  if (!isBrowser) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GROUPS, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(STORE_GROUPS);
    groups.forEach((g) => {
      if (g && g.id && g.name) store.put(g);
    });
  });
}
