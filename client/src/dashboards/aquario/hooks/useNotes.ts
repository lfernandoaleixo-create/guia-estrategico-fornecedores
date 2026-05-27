// =============================================================================
// Hook: useNotes
// Gerencia notas pessoais por fornecedor com persistência em localStorage
// =============================================================================

import { useState, useCallback, useEffect } from "react";

export interface Note {
  supplierId: string;
  text: string;
  status: "nao-visitado" | "contato-feito" | "amostra-solicitada" | "negociando" | "fornecedor-aprovado" | "descartado";
  updatedAt: string;
}

const STORAGE_KEY = "china-suppliers-notes-v1";

function loadNotes(): Record<string, Note> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveNotes(notes: Record<string, Note>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // silently fail if localStorage is unavailable
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<Record<string, Note>>(loadNotes);

  const upsertNote = useCallback((supplierId: string, text: string, status: Note["status"]) => {
    setNotes((prev) => {
      const updated = {
        ...prev,
        [supplierId]: {
          supplierId,
          text,
          status,
          updatedAt: new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      };
      saveNotes(updated);
      return updated;
    });
  }, []);

  const deleteNote = useCallback((supplierId: string) => {
    setNotes((prev) => {
      const updated = { ...prev };
      delete updated[supplierId];
      saveNotes(updated);
      return updated;
    });
  }, []);

  const getNote = useCallback(
    (supplierId: string): Note | undefined => notes[supplierId],
    [notes]
  );

  const totalNotes = Object.keys(notes).length;

  return { notes, upsertNote, deleteNote, getNote, totalNotes };
}

export const statusConfig: Record<
  Note["status"],
  { label: string; color: string; bg: string; emoji: string }
> = {
  "nao-visitado": {
    label: "Não visitado",
    color: "oklch(0.5 0.01 60)",
    bg: "oklch(0.92 0.003 60)",
    emoji: "⬜",
  },
  "contato-feito": {
    label: "Contato feito",
    color: "oklch(0.35 0.12 220)",
    bg: "oklch(0.92 0.04 220)",
    emoji: "📧",
  },
  "amostra-solicitada": {
    label: "Amostra solicitada",
    color: "oklch(0.45 0.15 40)",
    bg: "oklch(0.92 0.05 40)",
    emoji: "📦",
  },
  negociando: {
    label: "Negociando",
    color: "oklch(0.5 0.18 60)",
    bg: "oklch(0.92 0.06 60)",
    emoji: "🤝",
  },
  "fornecedor-aprovado": {
    label: "Fornecedor aprovado",
    color: "oklch(0.35 0.12 160)",
    bg: "oklch(0.92 0.04 160)",
    emoji: "✅",
  },
  descartado: {
    label: "Descartado",
    color: "oklch(0.45 0.22 25)",
    bg: "oklch(0.92 0.06 25)",
    emoji: "❌",
  },
};
