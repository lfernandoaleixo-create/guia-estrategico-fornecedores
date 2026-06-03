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
import { readEntryDirect, writeEntryDirect } from "./useSupplierNotes";
import {
  exportAllCustomSuppliers,
  importCustomSuppliers,
  type CustomSupplier,
} from "./useCustomSuppliers";
import {
  readAllGroups,
  writeAllGroups,
  type SupplierGroup,
} from "./useSupplierGroups";
import {
  readAllExtraSuppliers,
  writeAllExtraSuppliers,
  type ExtraSupplier,
} from "./useExtraSuppliers";
import {
  readAllCustomGroups,
  writeAllCustomGroups,
  type CustomGroup,
} from "./useCustomGroups";

export type NoteScope = "aquario" | "tapete" | "yiwu";

const SCOPES: NoteScope[] = ["aquario", "tapete", "yiwu"];

// ---------- Acesso às notas (agora via API do banco compartilhado) ----------
async function trpcFetch<T>(path: string, kind: "query" | "mutation", input?: unknown): Promise<T> {
  const base = "/api/trpc";
  if (kind === "query") {
    const params = new URLSearchParams();
    params.set("input", JSON.stringify({ json: input ?? null }));
    const res = await fetch(`${base}/${path}?${params.toString()}`, { credentials: "include" });
    const data = await res.json();
    return data?.result?.data?.json as T;
  }
  const res = await fetch(`${base}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ json: input ?? null }),
  });
  const data = await res.json();
  return data?.result?.data?.json as T;
}

function parseAttachments(raw: unknown): SupplierNoteEntry["attachments"] {
  if (Array.isArray(raw)) return raw as SupplierNoteEntry["attachments"];
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function getAll(scope: NoteScope): Promise<SupplierNoteEntry[]> {
  const rows = await trpcFetch<Record<string, unknown>[]>(
    "data.notes.listByScope",
    "query",
    { scope },
  );
  return (rows ?? []).map((row) => ({
    supplierId: String(row.supplierId),
    status: (row.status as SupplierNoteEntry["status"]) ?? "nao-visitado",
    observacoes: (row.observacoes as string) ?? "",
    fields: (row.fields as Record<string, string>) ?? {},
    attachments: parseAttachments(row.attachments),
    quoteRows: (row.quoteRows as SupplierNoteEntry["quoteRows"]) ?? undefined,
    groupIds: (row.groupIds as string[]) ?? [],
    createdAt: (row.createdAt as string) ?? "",
    updatedAt: (row.updatedAt as string) ?? "",
  }));
}

async function putEntry(scope: NoteScope, entry: SupplierNoteEntry): Promise<void> {
  await writeEntryDirect(scope, entry);
}

// Marca readEntryDirect como usado (evita warning de import não utilizado)
void readEntryDirect;

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
  version: 1 | 2 | 3;
  exportedAt: string; // ISO
  exportedAtBR: string; // dd/mm/aaaa
  scopes: Record<NoteScope, SupplierNoteEntry[]>;
  totals: Record<NoteScope, number>;
  totalEntries: number;
  totalAttachments: number;
  /** v2+: fornecedores cadastrados manualmente */
  customSuppliers?: CustomSupplier[];
  totalCustomSuppliers?: number;
  /** v3+: grupos de fornecedores compartilhados */
  groups?: SupplierGroup[];
  totalGroups?: number;
  /** v3+: grupos personalizados (aba Adicionar) */
  customGroups?: CustomGroup[];
  totalCustomGroups?: number;
  /** v3+: fornecedores avulsos cadastrados em grupos personalizados */
  extraSuppliers?: ExtraSupplier[];
  totalExtraSuppliers?: number;
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
  let customSuppliers: CustomSupplier[] = [];
  try {
    customSuppliers = await exportAllCustomSuppliers();
  } catch {
    customSuppliers = [];
  }
  let groupList: SupplierGroup[] = [];
  try {
    groupList = await readAllGroups();
  } catch {
    groupList = [];
  }
  let customGroupList: CustomGroup[] = [];
  try {
    customGroupList = await readAllCustomGroups();
  } catch {
    customGroupList = [];
  }
  let extraSupplierList: ExtraSupplier[] = [];
  try {
    extraSupplierList = await readAllExtraSuppliers();
  } catch {
    extraSupplierList = [];
  }
  const now = new Date();
  return {
    format: "guia-fornecedores-backup",
    version: 3,
    exportedAt: now.toISOString(),
    exportedAtBR: now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    scopes,
    totals,
    totalEntries,
    totalAttachments,
    customSuppliers,
    totalCustomSuppliers: customSuppliers.length,
    groups: groupList,
    totalGroups: groupList.length,
    customGroups: customGroupList,
    totalCustomGroups: customGroupList.length,
    extraSuppliers: extraSupplierList,
    totalExtraSuppliers: extraSupplierList.length,
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
  customSuppliersAdded?: number;
  customSuppliersUpdated?: number;
  groupsImported?: number;
  customGroupsImported?: number;
  extraSuppliersImported?: number;
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
    customSuppliersAdded: 0,
    customSuppliersUpdated: 0,
  };

  // v2+: importa fornecedores customizados
  if (Array.isArray(backup.customSuppliers) && backup.customSuppliers.length > 0) {
    try {
      const csRes = await importCustomSuppliers(backup.customSuppliers);
      result.customSuppliersAdded = csRes.added;
      result.customSuppliersUpdated = csRes.updated;
    } catch {
      // ignora
    }
  }

  // v3+: importa grupos compartilhados
  if (Array.isArray(backup.groups) && backup.groups.length > 0) {
    try {
      await writeAllGroups(backup.groups);
      result.groupsImported = backup.groups.length;
    } catch {
      // ignora
    }
  }

  // v3+: importa grupos personalizados (aba Adicionar)
  if (Array.isArray(backup.customGroups) && backup.customGroups.length > 0) {
    try {
      await writeAllCustomGroups(backup.customGroups);
      result.customGroupsImported = backup.customGroups.length;
    } catch {
      // ignora
    }
  }

  // v3+: importa fornecedores avulsos (extra suppliers)
  if (Array.isArray(backup.extraSuppliers) && backup.extraSuppliers.length > 0) {
    try {
      await writeAllExtraSuppliers(backup.extraSuppliers);
      result.extraSuppliersImported = backup.extraSuppliers.length;
    } catch {
      // ignora
    }
  }

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
