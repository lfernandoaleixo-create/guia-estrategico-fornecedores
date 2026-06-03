import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

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
  // Chave composta (scope, supplierId). Como o schema não declara PK composta no
  // ORM, fazemos delete+insert para garantir idempotência.
  await db
    .delete(supplierNotes)
    .where(and(eq(supplierNotes.scope, row.scope), eq(supplierNotes.supplierId, row.supplierId)));
  await db.insert(supplierNotes).values(row);
}

export async function deleteSupplierNote(scope: string, supplierId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .delete(supplierNotes)
    .where(and(eq(supplierNotes.scope, scope), eq(supplierNotes.supplierId, supplierId)));
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
