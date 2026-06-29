import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { sanitizeAttachmentsJson, sanitizeQuoteRows } from './sanitizeNote';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.


// =============================================================================
// Guia Estratégico de Fornecedores — helpers de dados COMPARTILHADOS.
// =============================================================================
import { and } from "drizzle-orm";
import {
  customGroups,
  extraSuppliers,
  supplierNotes,
  type InsertCustomGroupRow,
  type InsertExtraSupplierRow,
  type InsertSupplierNoteRow,
} from "../drizzle/schema";

// ---------- Custom Groups ----------
export async function listCustomGroups() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customGroups);
}

export async function upsertCustomGroup(row: InsertCustomGroupRow) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { id, ...rest } = row;
  await db.insert(customGroups).values(row).onDuplicateKeyUpdate({ set: rest });
}

export async function deleteCustomGroup(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(customGroups).where(eq(customGroups.id, id));
}

export async function bulkUpsertCustomGroups(rows: InsertCustomGroupRow[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  for (const row of rows) {
    const { id, ...rest } = row;
    await db.insert(customGroups).values(row).onDuplicateKeyUpdate({ set: rest });
  }
}

// ---------- Extra Suppliers ----------
export async function listExtraSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(extraSuppliers);
}

export async function upsertExtraSupplier(row: InsertExtraSupplierRow) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { id, ...rest } = row;
  await db.insert(extraSuppliers).values(row).onDuplicateKeyUpdate({ set: rest });
}

export async function deleteExtraSupplier(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(extraSuppliers).where(eq(extraSuppliers.id, id));
}

// ---------- Supplier Notes ----------
export async function listSupplierNotes(scope: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplierNotes).where(eq(supplierNotes.scope, scope));
}

export async function listAllSupplierNotes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplierNotes);
}

export async function upsertSupplierNote(row: InsertSupplierNoteRow) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // BLINDAGEM: nunca gravar base64 (dataUrl) nas colunas attachments/quoteRows.
  // Qualquer dataUrl é enviado ao S3 e substituído por { url, fileKey } antes do
  // insert. Isso impede o estouro do INSERT que apagava os dados do usuário.
  let safeRow: InsertSupplierNoteRow = row;
  try {
    const safeAttachments = await sanitizeAttachmentsJson(
      row.scope,
      row.supplierId,
      row.attachments as unknown as string,
    );
    const safeQuotes = await sanitizeQuoteRows(row.scope, row.supplierId, row.quoteRows);
    safeRow = {
      ...row,
      attachments: safeAttachments,
      quoteRows: safeQuotes as InsertSupplierNoteRow["quoteRows"],
    };
  } catch (err) {
    console.error("[upsertSupplierNote] sanitize falhou, gravando sem base64 por segurança:", err);
    // Em caso de falha do S3, melhor não gravar base64 (que quebra o INSERT):
    // esvazia anexos para preservar status/observações/campos do usuário.
    safeRow = { ...row, attachments: "[]" };
  }

  // Chave única (scope, supplierId) garantida por uniqueIndex no schema.
  // Upsert ATÔMICO: insere ou atualiza a mesma linha, eliminando a janela de
  // concorrência do antigo delete+insert (que gerava linhas duplicadas).
  await db
    .insert(supplierNotes)
    .values(safeRow)
    .onDuplicateKeyUpdate({
      set: {
        status: safeRow.status,
        observacoes: safeRow.observacoes,
        fields: safeRow.fields,
        attachments: safeRow.attachments,
        quoteRows: safeRow.quoteRows,
        groupIds: safeRow.groupIds,
        updatedAt: safeRow.updatedAt,
      },
    });
}

export async function deleteSupplierNote(scope: string, supplierId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .delete(supplierNotes)
    .where(and(eq(supplierNotes.scope, scope), eq(supplierNotes.supplierId, supplierId)));
}

/**
 * Anexa UM anexo ao registro da nota no PRÓPRIO servidor, lendo o estado atual
 * do banco e fazendo o append. Isso evita que o cliente precise reenviar todos
 * os anexos existentes (o que estourava o limite de payload no 2º upload).
 * Se a nota ainda não existir, cria uma nova com valores padrão.
 */
export async function appendAttachmentToNote(
  scope: string,
  supplierId: string,
  attachment: unknown,
  nowStr: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select()
    .from(supplierNotes)
    .where(and(eq(supplierNotes.scope, scope), eq(supplierNotes.supplierId, supplierId)))
    .limit(1);
  const existing = rows.length > 0 ? rows[0] : null;

  let attachments: unknown[] = [];
  if (existing?.attachments) {
    try {
      const parsed = JSON.parse(existing.attachments as unknown as string);
      if (Array.isArray(parsed)) attachments = parsed;
    } catch {
      attachments = [];
    }
  }
  attachments.push(attachment);

  const row: InsertSupplierNoteRow = {
    scope,
    supplierId,
    status: (existing?.status as string) ?? "nao-visitado",
    observacoes: (existing?.observacoes as string | null) ?? null,
    fields: (existing?.fields as InsertSupplierNoteRow["fields"]) ?? {},
    attachments: JSON.stringify(attachments),
    quoteRows: (existing?.quoteRows as InsertSupplierNoteRow["quoteRows"]) ?? null,
    groupIds: (existing?.groupIds as InsertSupplierNoteRow["groupIds"]) ?? [],
    createdAt: (existing?.createdAt as string) ?? nowStr,
    updatedAt: nowStr,
  };

  // Upsert atômico (mesma unique key) para não gerar linhas duplicadas.
  await db
    .insert(supplierNotes)
    .values(row)
    .onDuplicateKeyUpdate({
      set: {
        status: row.status,
        observacoes: row.observacoes,
        fields: row.fields,
        attachments: row.attachments,
        quoteRows: row.quoteRows,
        groupIds: row.groupIds,
        updatedAt: row.updatedAt,
      },
    });
}


// ---------- Supplier Groups (compartilhados pelos 3 dashboards) ----------
import {
  supplierGroups,
  customSuppliers,
  type InsertSupplierGroupRow,
  type InsertCustomSupplierRow,
} from "../drizzle/schema";

export async function listSupplierGroups() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplierGroups);
}

export async function upsertSupplierGroup(row: InsertSupplierGroupRow) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { id, ...rest } = row;
  await db.insert(supplierGroups).values(row).onDuplicateKeyUpdate({ set: rest });
}

export async function bulkUpsertSupplierGroups(rows: InsertSupplierGroupRow[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  for (const row of rows) {
    const { id, ...rest } = row;
    await db.insert(supplierGroups).values(row).onDuplicateKeyUpdate({ set: rest });
  }
}

export async function deleteSupplierGroup(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(supplierGroups).where(eq(supplierGroups.id, id));
}

// ---------- Custom Suppliers (cadastrados dentro dos dashboards principais) ----------
export async function listCustomSuppliers(scope?: string) {
  const db = await getDb();
  if (!db) return [];
  if (scope) {
    return db.select().from(customSuppliers).where(eq(customSuppliers.scope, scope));
  }
  return db.select().from(customSuppliers);
}

export async function upsertCustomSupplier(row: InsertCustomSupplierRow) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { id, ...rest } = row;
  await db.insert(customSuppliers).values(row).onDuplicateKeyUpdate({ set: rest });
}

export async function deleteCustomSupplier(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(customSuppliers).where(eq(customSuppliers.id, id));
}

// =============================================================================
// Seed idempotente dos 2 grupos iniciais fixos.
// =============================================================================
// Garante que a base sempre sobe com o Grupo Nº 01 (Aquários & Terrários) e o
// Grupo Nº 02 (Tapete Higiênico Pet), sem depender de inserção manual nem do
// seed disparado pela UI. Idempotente: só cria se o id ainda não existir, e
// nunca sobrescreve edições do usuário (o onDuplicateKeyUpdate apenas reescreve
// o próprio id, ou seja, no-op para linhas existentes).
export async function seedSupplierGroups(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date().toISOString();
  // IDs/valores idênticos ao seed do frontend (useSupplierGroups.SEED_GROUPS)
  // para que servidor e cliente convirjam para os MESMOS registros (sem duplicar).
  const seeds: InsertSupplierGroupRow[] = [
    {
      id: "grp_seed_aquario_terrario",
      number: 1,
      name: "Aquários & Terrários",
      legend: "Aquariofilia, terrários e equipamentos",
      color: "#ef4444",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "grp_seed_tapete_higienico",
      number: 2,
      name: "Tapete Higiênico Pet",
      legend: "Importação de tapetes higiênicos (NCM 4818)",
      color: "#06b6d4",
      createdAt: now,
      updatedAt: now,
    },
  ];
  for (const row of seeds) {
    await db.insert(supplierGroups).values(row).onDuplicateKeyUpdate({
      set: { id: row.id },
    });
  }
}

// =============================================================================
// Planilhas de análise de viabilidade (calculadora) por (scope, supplierId).
// =============================================================================
import { viabilitySheets, type InsertViabilitySheetRow } from "../drizzle/schema";
import { partnerTopics, type InsertPartnerTopicRow } from "../drizzle/schema";
import { macros, type InsertMacroRow } from "../drizzle/schema";
import { subgroups, type InsertSubgroupRow } from "../drizzle/schema";

export async function getViabilitySheet(scope: string, supplierId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(viabilitySheets)
    .where(and(eq(viabilitySheets.scope, scope), eq(viabilitySheets.supplierId, supplierId)));
  return rows[0] ?? null;
}

export async function upsertViabilitySheet(row: InsertViabilitySheetRow) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  // Chave lógica (scope, supplierId) — não há PK composta declarada, então
  // fazemos update se existir, senão insert.
  const existing = await getViabilitySheet(row.scope, row.supplierId);
  if (existing) {
    await db
      .update(viabilitySheets)
      .set({ data: row.data, updatedAt: row.updatedAt })
      .where(and(eq(viabilitySheets.scope, row.scope), eq(viabilitySheets.supplierId, row.supplierId)));
  } else {
    await db.insert(viabilitySheets).values(row);
  }
}

// =============================================================================
// Partner Topics (Assuntos/Temas) — Central de Documentos do Grupo Nº 00.
// =============================================================================
export async function listPartnerTopics(scope: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(partnerTopics).where(eq(partnerTopics.scope, scope));
}

export async function listPartnerTopicsByPartner(partnerId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(partnerTopics).where(eq(partnerTopics.partnerId, partnerId));
}

export async function upsertPartnerTopic(row: InsertPartnerTopicRow) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { id, ...rest } = row;
  await db.insert(partnerTopics).values(row).onDuplicateKeyUpdate({ set: rest });
}

export async function deletePartnerTopic(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(partnerTopics).where(eq(partnerTopics.id, id));
}

// =============================================================================
// Macros (classificações MACRO da Home).
// =============================================================================
export async function listMacros() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(macros);
}

export async function upsertMacro(row: InsertMacroRow) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { id, ...rest } = row;
  await db.insert(macros).values(row).onDuplicateKeyUpdate({ set: rest });
}

export async function bulkUpsertMacros(rows: InsertMacroRow[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  for (const row of rows) {
    const { id, ...rest } = row;
    await db.insert(macros).values(row).onDuplicateKeyUpdate({ set: rest });
  }
}

export async function deleteMacro(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(macros).where(eq(macros.id, id));
}

// =============================================================================
// Subgrupos numerados (macro.sub) — vinculados a um MACRO pelo número.
// =============================================================================
export async function listSubgroups() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subgroups);
}

export async function upsertSubgroup(row: InsertSubgroupRow) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { id, ...rest } = row;
  await db.insert(subgroups).values(row).onDuplicateKeyUpdate({ set: rest });
}

export async function bulkUpsertSubgroups(rows: InsertSubgroupRow[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  for (const row of rows) {
    const { id, ...rest } = row;
    await db.insert(subgroups).values(row).onDuplicateKeyUpdate({ set: rest });
  }
}

export async function deleteSubgroup(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(subgroups).where(eq(subgroups.id, id));
}

// =============================================================================
// App Settings — chave/valor JSON genérico (ex.: cards de acesso ocultos).
// =============================================================================
import { appSettings, type InsertAppSettingRow } from "../drizzle/schema";

export async function getAppSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return rows[0]?.value ?? null;
}

export async function setAppSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row: InsertAppSettingRow = {
    key,
    value,
    updatedAt: new Date().toISOString(),
  };
  await db
    .insert(appSettings)
    .values(row)
    .onDuplicateKeyUpdate({ set: { value, updatedAt: row.updatedAt } });
}

import { desc } from "drizzle-orm";
import { importSimulations, type InsertImportSimulationRow } from "../drizzle/schema";

/** Lista todas as simulações salvas, mais recentes primeiro. */
export async function listImportSimulations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(importSimulations).orderBy(desc(importSimulations.updatedAt));
}

/**
 * Verifica se já existe outra simulação (id diferente) com o mesmo nome,
 * comparando de forma case-insensitive e ignorando espaços nas pontas.
 * Retorna o id da simulação conflitante, ou null se não houver conflito.
 */
export async function findImportSimulationByName(
  name: string,
  excludeId?: string,
): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const norm = name.trim().toLowerCase();
  if (!norm) return null;
  const rows = await db
    .select({ id: importSimulations.id, name: importSimulations.name })
    .from(importSimulations);
  const conflict = rows.find(
    (r) => (r.name ?? "").trim().toLowerCase() === norm && r.id !== excludeId,
  );
  return conflict ? conflict.id : null;
}

/** Insere ou atualiza uma simulação salva (upsert por id). */
export async function upsertImportSimulation(row: InsertImportSimulationRow) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { id, ...rest } = row;
  await db.insert(importSimulations).values(row).onDuplicateKeyUpdate({ set: rest });
}

/** Remove uma simulação salva pelo id. */
export async function deleteImportSimulation(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(importSimulations).where(eq(importSimulations.id, id));
}
