// =============================================================================
// Hook: useDiary (LEGADO / COMPATIBILIDADE)
//
// Antes este hook persistia o "diário de campo" do dashboard Aquário no
// IndexedDB local (por navegador). Agora a persistência foi unificada no
// BANCO DE DADOS COMPARTILHADO via tRPC, através de useSupplierNotes("aquario").
//
// Mantemos este wrapper para não quebrar a UI legada (Home.tsx do Aquário, que
// usa apenas `totalEntries`). Todas as operações reais de diário/anotações
// acontecem no SupplierNotesPanel compartilhado. A assinatura pública foi
// preservada, mas os dados agora são globais (todos os usuários com o link
// veem o mesmo conteúdo, em tempo real via polling).
// =============================================================================

import { useCallback, useMemo } from "react";
import {
  useSupplierNotes,
  type SupplierNoteEntry,
  type SupplierAttachment,
} from "@/shared/supplier-notes/useSupplierNotes";

// Tipos legados mantidos por compatibilidade de import.
export interface DiaryAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  url?: string;
  addedAt: string;
}

export interface DiaryEntry {
  supplierId: string;
  text: string;
  attachments: DiaryAttachment[];
  updatedAt: string;
}

function toDiaryAttachment(a: SupplierAttachment): DiaryAttachment {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    size: a.size,
    dataUrl: a.dataUrl,
    url: a.url,
    addedAt: a.addedAt,
  };
}

function toDiaryEntry(e: SupplierNoteEntry): DiaryEntry {
  return {
    supplierId: e.supplierId,
    text: e.observacoes ?? "",
    attachments: (e.attachments ?? []).map(toDiaryAttachment),
    updatedAt: e.updatedAt,
  };
}

// Considera "com registro" qualquer fornecedor com observação, anexo ou status
// diferente de "não visitado" — coerente com o que o usuário vê como "diário".
function hasDiaryContent(e: SupplierNoteEntry): boolean {
  return (
    (e.observacoes?.trim().length ?? 0) > 0 ||
    (e.attachments?.length ?? 0) > 0 ||
    (e.status && e.status !== "nao-visitado")
  );
}

export function useDiary() {
  const notes = useSupplierNotes("aquario");

  const entries = useMemo<Record<string, DiaryEntry>>(() => {
    const map: Record<string, DiaryEntry> = {};
    Object.values(notes.entries).forEach((e) => {
      if (hasDiaryContent(e)) {
        map[e.supplierId] = toDiaryEntry(e);
      }
    });
    return map;
  }, [notes.entries]);

  const upsertText = useCallback(
    (supplierId: string, text: string) => {
      notes.upsertEntry(supplierId, { observacoes: text });
    },
    [notes],
  );

  const addAttachment = useCallback(
    async (supplierId: string, file: File) => {
      const att = await notes.addAttachment(supplierId, file, "outros");
      return toDiaryAttachment(att);
    },
    [notes],
  );

  const removeAttachment = useCallback(
    (supplierId: string, attachmentId: string) => {
      notes.removeAttachment(supplierId, attachmentId);
    },
    [notes],
  );

  const deleteEntry = useCallback(
    (supplierId: string) => {
      notes.deleteEntry(supplierId);
    },
    [notes],
  );

  const getEntry = useCallback(
    (supplierId: string): DiaryEntry | undefined => entries[supplierId],
    [entries],
  );

  const totalEntries = Object.keys(entries).length;

  return {
    entries,
    loaded: notes.loaded,
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
