// =============================================================================
// useCustomGroups — grupos personalizados criados na 4ª aba (Adicionar Fornecedores).
//
// Diferença em relação a useSupplierGroups:
//   - useSupplierGroups: tags/categorias livres usadas DENTRO dos 3 dashboards
//     existentes (Aquário, Tapete, Yiwu) para marcar fornecedores.
//   - useCustomGroups: grupos "candidatos a virar dashboard". Cada um tem um
//     ramo (Brinquedos, Vidro, Aquário, Tapete, etc.) e pode ser promovido a
//     um dashboard independente quando ficar grande.
//
// Cada grupo tem um `number` (1, 2, 3…) único, sugerido automaticamente como
// o próximo livre, mas editável. Reordenar os grupos via drag & drop renumera
// automaticamente todos eles na ordem visual.
//
// Persistido em IndexedDB no DB "guia-fornecedores", store "custom_groups".
// =============================================================================
import { useCallback, useEffect, useState } from "react";

export interface CustomGroup {
  id: string;
  number: number;        // número do grupo (1, 2, 3…), único
  name: string;          // ex: "Brinquedos infantis"
  branch: string;        // ramo de mercado, ex: "Brinquedos"
  color: string;         // hex
  description: string;   // legenda livre
  promotedToDashboard: boolean; // virou dashboard independente?
  promotedAt?: string;   // ISO
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
}

const DB_NAME = "guia-fornecedores";
const DB_VERSION = 3;
const STORE_GROUPS = "groups";
const STORE_CUSTOM_LEGACY = "custom";
const STORE_CUSTOM_GROUPS = "custom_groups";
const STORE_EXTRA_SUPPLIERS = "extra_suppliers";

const isBrowser = typeof window !== "undefined" && typeof indexedDB !== "undefined";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CUSTOM_LEGACY)) {
        db.createObjectStore(STORE_CUSTOM_LEGACY, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_GROUPS)) {
        db.createObjectStore(STORE_GROUPS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_CUSTOM_GROUPS)) {
        db.createObjectStore(STORE_CUSTOM_GROUPS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_EXTRA_SUPPLIERS)) {
        const store = db.createObjectStore(STORE_EXTRA_SUPPLIERS, { keyPath: "id" });
        store.createIndex("groupId", "groupId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbReadAll(): Promise<CustomGroup[]> {
  if (!isBrowser) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_GROUPS, "readonly");
    const store = tx.objectStore(STORE_CUSTOM_GROUPS);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as CustomGroup[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(group: CustomGroup): Promise<void> {
  if (!isBrowser) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_GROUPS, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_CUSTOM_GROUPS).put(group);
  });
}

async function dbPutMany(groups: CustomGroup[]): Promise<void> {
  if (!isBrowser) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_GROUPS, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(STORE_CUSTOM_GROUPS);
    groups.forEach((g) => store.put(g));
  });
}

async function dbDelete(id: string): Promise<void> {
  if (!isBrowser) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_GROUPS, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_CUSTOM_GROUPS).delete(id);
  });
}

// Sugestões de ramos comuns para autocomplete; o usuário pode digitar livre.
export const BRANCH_SUGGESTIONS = [
  "Brinquedos",
  "Vidro / Vidraria",
  "Aquário / Terrário",
  "Tapete higiênico",
  "Tapete artesanal",
  "Decoração",
  "Cozinha",
  "Cama, mesa e banho",
  "Eletrônicos",
  "Pet",
  "Bazar",
  "Beleza",
  "Festas",
];

export const CUSTOM_GROUP_PALETTE = [
  "#f97316",
  "#ef4444",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#14b8a6",
  "#a855f7",
];

function genId(): string {
  return `cgrp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

export function useCustomGroups() {
  const [groups, setGroups] = useState<CustomGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const all = await dbReadAll();
      // Migração leve: garante number atribuído para registros antigos.
      const used = new Set<number>();
      all.forEach((g) => {
        if (typeof g.number === "number" && g.number > 0) used.add(g.number);
      });
      let next = 1;
      const fixed = all.map((g) => {
        if (typeof g.number === "number" && g.number > 0) return g;
        while (used.has(next)) next += 1;
        const withNumber = { ...g, number: next };
        used.add(next);
        return withNumber;
      });
      // Persiste correção em background.
      fixed.forEach((g, idx) => {
        if (g !== all[idx]) {
          dbPut(g).catch((e) => console.warn("[useCustomGroups migrate]", e));
        }
      });
      fixed.sort((a, b) => a.number - b.number);
      setGroups(fixed);
    } catch (err) {
      console.error("[useCustomGroups]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createGroup = useCallback(
    async (input: {
      name: string;
      branch: string;
      color?: string;
      description?: string;
      number?: number;
    }) => {
      const trimmed = input.name.trim();
      if (!trimmed) return null;
      const fallbackColor =
        CUSTOM_GROUP_PALETTE[Math.floor(Math.random() * CUSTOM_GROUP_PALETTE.length)];
      const used = new Set(groups.map((g) => g.number).filter(Boolean));
      let auto = 1;
      while (used.has(auto)) auto += 1;
      const number =
        typeof input.number === "number" && input.number > 0 ? Math.floor(input.number) : auto;
      const group: CustomGroup = {
        id: genId(),
        number,
        name: trimmed,
        branch: input.branch.trim(),
        color: input.color || fallbackColor,
        description: input.description?.trim() ?? "",
        promotedToDashboard: false,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      await dbPut(group);
      await reload();
      return group;
    },
    [groups, reload],
  );

  const updateGroup = useCallback(
    async (id: string, patch: Partial<Omit<CustomGroup, "id" | "createdAt">>) => {
      const current = groups.find((g) => g.id === id);
      if (!current) return;
      const updated: CustomGroup = {
        ...current,
        ...patch,
        name: (patch.name ?? current.name).trim() || current.name,
        branch: patch.branch !== undefined ? patch.branch.trim() : current.branch,
        description:
          patch.description !== undefined ? patch.description.trim() : current.description,
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

  const promoteToDashboard = useCallback(
    async (id: string) => {
      const current = groups.find((g) => g.id === id);
      if (!current) return;
      await dbPut({
        ...current,
        promotedToDashboard: true,
        promotedAt: nowISO(),
        updatedAt: nowISO(),
      });
      await reload();
    },
    [groups, reload],
  );

  const demoteFromDashboard = useCallback(
    async (id: string) => {
      const current = groups.find((g) => g.id === id);
      if (!current) return;
      const next: CustomGroup = {
        ...current,
        promotedToDashboard: false,
        promotedAt: undefined,
        updatedAt: nowISO(),
      };
      await dbPut(next);
      await reload();
    },
    [groups, reload],
  );

  /**
   * Reordena a lista de grupos. `orderedIds` é a nova ordem visual desejada.
   * O número de cada grupo é renumerado para 1..N na nova ordem.
   */
  const reorderGroups = useCallback(
    async (orderedIds: string[]) => {
      const byId = new Map(groups.map((g) => [g.id, g]));
      const reordered: CustomGroup[] = [];
      orderedIds.forEach((id, idx) => {
        const g = byId.get(id);
        if (g) reordered.push({ ...g, number: idx + 1, updatedAt: nowISO() });
      });
      // Anexa quaisquer grupos não citados (defesa) no final, mantendo unicidade.
      groups.forEach((g) => {
        if (!orderedIds.includes(g.id)) {
          reordered.push({ ...g, number: reordered.length + 1, updatedAt: nowISO() });
        }
      });
      await dbPutMany(reordered);
      await reload();
    },
    [groups, reload],
  );

  return {
    groups,
    loading,
    reload,
    createGroup,
    updateGroup,
    deleteGroup,
    promoteToDashboard,
    demoteFromDashboard,
    reorderGroups,
  };
}

// Helpers para backup
export async function readAllCustomGroups(): Promise<CustomGroup[]> {
  return dbReadAll();
}

export async function writeAllCustomGroups(groups: CustomGroup[]): Promise<void> {
  if (!isBrowser) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_GROUPS, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(STORE_CUSTOM_GROUPS);
    groups.forEach((g) => {
      if (g && g.id && g.name) store.put(g);
    });
  });
}
