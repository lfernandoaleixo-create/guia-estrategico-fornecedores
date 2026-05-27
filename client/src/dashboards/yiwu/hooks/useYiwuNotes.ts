import { useCallback, useEffect, useState } from "react";

export interface YiwuNote {
  supplierId: number;
  favorite: boolean;
  note: string;
  updatedAt: string;
}

const STORAGE_KEY = "yiwu-supplier-notes-v1";

function load(): YiwuNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(notes: YiwuNote[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    /* ignore */
  }
}

export function useYiwuNotes() {
  const [notes, setNotes] = useState<YiwuNote[]>(() => load());

  useEffect(() => {
    save(notes);
  }, [notes]);

  // Sincroniza entre abas/janelas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setNotes(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const upsert = useCallback((supplierId: number, patch: Partial<YiwuNote>) => {
    setNotes(prev => {
      const idx = prev.findIndex(n => n.supplierId === supplierId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...patch, updatedAt: new Date().toISOString() };
        return copy;
      }
      return [
        {
          supplierId,
          favorite: false,
          note: "",
          ...patch,
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });
  }, []);

  const toggleFavorite = useCallback(
    (supplierId: number) => {
      setNotes(prev => {
        const idx = prev.findIndex(n => n.supplierId === supplierId);
        const ts = new Date().toISOString();
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], favorite: !copy[idx].favorite, updatedAt: ts };
          return copy;
        }
        return [
          { supplierId, favorite: true, note: "", updatedAt: ts },
          ...prev,
        ];
      });
    },
    [],
  );

  const saveNote = useCallback(
    (supplierId: number, note: string) => upsert(supplierId, { note }),
    [upsert],
  );

  const removeNote = useCallback((supplierId: number) => {
    setNotes(prev => prev.filter(n => n.supplierId !== supplierId));
  }, []);

  return { notes, toggleFavorite, saveNote, removeNote, upsert };
}
