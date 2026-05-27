// =============================================================================
// backup.ts — Garantias de não-perda de dados (status, observações, anexos)
//
// 1. requestPersistentStorage(): pede ao navegador para tratar os dados
//    como "não descartáveis". Sem isso, o SO pode limpar IndexedDB quando o
//    disco fica cheio. Com isso, só uma ação explícita do usuário apaga.
//
// 2. exportAllNotes(): lê todos os scopes (aquario/tapete/yiwu) do IndexedDB
//    e devolve um JSON único com TODAS as anotações + anexos (em base64).
//    Pode ser baixado como .json e guardado em Drive/OneDrive/e-mail.
//
// 3. importAllNotes(json): restaura o arquivo .json gerado acima em qualquer
//    máquina ou navegador. Faz merge não-destrutivo: nunca sobrescreve uma
//    entrada existente com uma versão mais antiga; nunca apaga.
//
// 4. estimateStorage(): retorna espaço usado / disponível para o gestor
//    saber quando exportar.
// =============================================================================

import type { SupplierNoteEntry } from "./useSupplierNotes";

export type NoteScope = "aquario" | "tapete" | "yiwu";

const SCOPES: NoteScope[] = ["aquario", "tapete", "yiwu"];
const DB_VERSION = 1;
const STORE = "notes";

function dbName(scope: NoteScope): string {
  return `guia-estrategico-notes-${scope}`;
}

function openDB(scope: NoteScope): Promise<IDBDatabase> {
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

function getAll(scope: NoteScope): Promise<SupplierNoteEntry[]> {
  return openDB(scope).then(
    (db) =>
      new Promise<SupplierNoteEntry[]>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => resolve((req.result || []) as SupplierNoteEntry[]);
        req.onerror = () => reject(req.error);
      })
  );
}

function putEntry(scope: NoteScope, entry: SupplierNoteEntry): Promise<void> {
  return openDB(scope).then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

// ---------- Persistent Storage ----------

export interface PersistStatus {
  supported: boolean;
  persisted: boolean;
}

/**
 * Pede ao navegador para marcar o storage como persistente.
 * Em Chrome/Edge isso é normalmente concedido automaticamente se
 * o usuário interagiu com o site, instalou-o, ou recebeu permissão
 * de notificações; em Firefox pode mostrar prompt.
 */
export async function requestPersistentStorage(): Promise<PersistStatus> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return { supported: false, persisted: false };
  }
  try {
    const already = await navigator.storage.persisted();
    if (already) return { supported: true, persisted: true };
    const granted = await navigator.storage.persist();
    return { supported: true, persisted: granted };
  } catch {
    return { supported: true, persisted: false };
  }
}

export async function getPersistStatus(): Promise<PersistStatus> {
  if (typeof navigator === "undefined" || !navigator.storage?.persisted) {
    return { supported: false, persisted: false };
  }
  try {
    return { supported: true, persisted: await navigator.storage.persisted() };
  } catch {
    return { supported: true, persisted: false };
  }
}

export interface StorageEstimate {
  usageMB: number;
  quotaMB: number;
  pct: number;
}

export async function estimateStorage(): Promise<StorageEstimate | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const est = await navigator.storage.estimate();
    const usage = est.usage ?? 0;
    const quota = est.quota ?? 0;
    return {
      usageMB: usage / (1024 * 1024),
      quotaMB: quota / (1024 * 1024),
      pct: quota > 0 ? (usage / quota) * 100 : 0,
    };
  } catch {
    return null;
  }
}

// ---------- Export / Import ----------

export interface BackupFile {
  format: "guia-fornecedores-backup";
  version: 1;
  exportedAt: string; // ISO
  exportedAtBR: string; // dd/mm/aaaa hh:mm
  scopes: Record<NoteScope, SupplierNoteEntry[]>;
  totals: Record<NoteScope, number>;
  totalEntries: number;
  totalAttachments: number;
}

export async function exportAllNotes(): Promise<BackupFile> {
  const scopes = {} as Record<NoteScope, SupplierNoteEntry[]>;
  const totals = {} as Record<NoteScope, number>;
  let totalEntries = 0;
  let totalAttachments = 0;
  for (const scope of SCOPES) {
    let entries: SupplierNoteEntry[] = [];
    try {
      entries = await getAll(scope);
    } catch {
      entries = [];
    }
    scopes[scope] = entries;
    totals[scope] = entries.length;
    totalEntries += entries.length;
    totalAttachments += entries.reduce((acc, e) => acc + e.attachments.length, 0);
  }
  const now = new Date();
  return {
    format: "guia-fornecedores-backup",
    version: 1,
    exportedAt: now.toISOString(),
    exportedAtBR: now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    scopes,
    totals,
    totalEntries,
    totalAttachments,
  };
}

export function downloadBackup(backup: BackupFile, filename?: string): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = backup.exportedAt.replace(/[:.]/g, "-").slice(0, 19);
  a.download = filename ?? `guia-fornecedores-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ImportResult {
  added: Record<NoteScope, number>;
  updated: Record<NoteScope, number>;
  skipped: Record<NoteScope, number>;
  total: number;
}

/**
 * Faz merge não-destrutivo:
 * - se a entrada do backup não existe localmente → adiciona
 * - se existe e a do backup é mais recente (updatedAt) → atualiza
 * - se a local é mais recente → ignora (skipped)
 * - anexos são unidos por id (sem duplicar)
 */
export async function importAllNotes(json: unknown): Promise<ImportResult> {
  const backup = json as BackupFile;
  if (!backup || backup.format !== "guia-fornecedores-backup") {
    throw new Error("Arquivo de backup inválido. Verifique se o JSON foi gerado por este sistema.");
  }
  const result: ImportResult = {
    added: { aquario: 0, tapete: 0, yiwu: 0 },
    updated: { aquario: 0, tapete: 0, yiwu: 0 },
    skipped: { aquario: 0, tapete: 0, yiwu: 0 },
    total: 0,
  };

  for (const scope of SCOPES) {
    const incoming = backup.scopes[scope] ?? [];
    if (!incoming.length) continue;
    const existing = await getAll(scope);
    const byId = new Map<string, SupplierNoteEntry>();
    for (const e of existing) byId.set(e.supplierId, e);

    for (const inc of incoming) {
      const cur = byId.get(inc.supplierId);
      if (!cur) {
        await putEntry(scope, inc);
        result.added[scope]++;
        result.total++;
        continue;
      }
      // merge anexos
      const attachmentMap = new Map<string, (typeof inc.attachments)[number]>();
      for (const a of cur.attachments) attachmentMap.set(a.id, a);
      for (const a of inc.attachments) {
        if (!attachmentMap.has(a.id)) attachmentMap.set(a.id, a);
      }
      const mergedAttachments = Array.from(attachmentMap.values());

      // versão "mais nova" decide observações/status/fields
      const curDate = parseBR(cur.updatedAt);
      const incDate = parseBR(inc.updatedAt);
      if (incDate > curDate) {
        await putEntry(scope, {
          ...cur,
          status: inc.status,
          observacoes: inc.observacoes,
          fields: { ...cur.fields, ...inc.fields },
          attachments: mergedAttachments,
          updatedAt: inc.updatedAt,
        });
        result.updated[scope]++;
        result.total++;
      } else if (mergedAttachments.length !== cur.attachments.length) {
        // anexos novos do backup, mas observações locais mais novas: mantém locais + une anexos
        await putEntry(scope, {
          ...cur,
          attachments: mergedAttachments,
        });
        result.updated[scope]++;
        result.total++;
      } else {
        result.skipped[scope]++;
      }
    }
  }
  return result;
}

function parseBR(d: string): number {
  // "dd/mm/yyyy" → timestamp
  const [dd, mm, yyyy] = d.split("/");
  if (!dd || !mm || !yyyy) return 0;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime();
}

export async function readBackupFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}
