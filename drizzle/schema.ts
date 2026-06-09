import { boolean, int, json, longtext, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// =============================================================================
// Guia Estratégico de Fornecedores — dados COMPARTILHADOS entre todos os usuários.
// Todos os registros são globais (não por usuário), de modo que qualquer pessoa
// com o link veja exatamente os mesmos dashboards, fornecedores e anotações.
// =============================================================================

/**
 * Grupos personalizados criados na aba "Adicionar Fornecedores".
 * Cada grupo pode ser promovido a um dashboard independente.
 * Espelha a interface CustomGroup do frontend.
 */
export const customGroups = mysqlTable("custom_groups", {
  /** ID textual gerado no cliente (ex: "cgrp_xxx"). Chave primária. */
  id: varchar("id", { length: 64 }).primaryKey(),
  number: int("number").notNull().default(1),
  name: varchar("name", { length: 255 }).notNull(),
  branch: varchar("branch", { length: 255 }).notNull().default(""),
  color: varchar("color", { length: 32 }).notNull().default("#64748b"),
  description: text("description"),
  promotedToDashboard: boolean("promotedToDashboard").notNull().default(false),
  promotedAt: varchar("promotedAt", { length: 40 }),
  createdAt: varchar("createdAt", { length: 40 }).notNull(),
  updatedAt: varchar("updatedAt", { length: 40 }).notNull(),
});

export type CustomGroupRow = typeof customGroups.$inferSelect;
export type InsertCustomGroupRow = typeof customGroups.$inferInsert;

/**
 * Fornecedores avulsos vinculados a um CustomGroup.
 * Os campos de contato (phones/emails/links) são guardados como JSON.
 * Espelha a interface ExtraSupplier do frontend.
 */
export const extraSuppliers = mysqlTable("extra_suppliers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  groupId: varchar("groupId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  chineseName: varchar("chineseName", { length: 255 }),
  category: varchar("category", { length: 255 }),
  ncm: varchar("ncm", { length: 64 }),
  city: varchar("city", { length: 255 }),
  province: varchar("province", { length: 255 }),
  address: text("address"),
  phones: json("phones"),
  emails: json("emails"),
  links: json("links"),
  contactName: varchar("contactName", { length: 255 }),
  contactRole: varchar("contactRole", { length: 255 }),
  contactLanguage: varchar("contactLanguage", { length: 255 }),
  moq: varchar("moq", { length: 255 }),
  priceFob: varchar("priceFob", { length: 255 }),
  leadTime: varchar("leadTime", { length: 255 }),
  paymentTerms: varchar("paymentTerms", { length: 255 }),
  incoterm: varchar("incoterm", { length: 255 }),
  notes: text("notes"),
  createdAt: varchar("createdAt", { length: 40 }).notNull(),
  updatedAt: varchar("updatedAt", { length: 40 }).notNull(),
});

export type ExtraSupplierRow = typeof extraSuppliers.$inferSelect;
export type InsertExtraSupplierRow = typeof extraSuppliers.$inferInsert;

/**
 * Anotações por fornecedor, por escopo (aquario/tapete/yiwu/grupo-xxx).
 * Campos complexos (fields, attachments, quoteRows, groupIds) guardados como
 * JSON/longtext. attachments pode conter base64 — por isso usamos longtext.
 * Chave primária composta: (scope, supplierId).
 */
export const supplierNotes = mysqlTable("supplier_notes", {
  /** Escopo do dashboard: "aquario" | "tapete" | "yiwu" | "grupo-<id>" ... */
  scope: varchar("scope", { length: 96 }).notNull(),
  supplierId: varchar("supplierId", { length: 191 }).notNull(),
  status: varchar("status", { length: 48 }).notNull().default("nao-visitado"),
  observacoes: text("observacoes"),
  fields: json("fields"),
  /** Anexos serializados como JSON (inclui dataUrl base64) — pode ser grande. */
  attachments: longtext("attachments"),
  quoteRows: json("quoteRows"),
  groupIds: json("groupIds"),
  createdAt: varchar("createdAt", { length: 40 }).notNull(),
  updatedAt: varchar("updatedAt", { length: 40 }).notNull(),
});

export type SupplierNoteRow = typeof supplierNotes.$inferSelect;
export type InsertSupplierNoteRow = typeof supplierNotes.$inferInsert;

/**
 * Grupos de fornecedores COMPARTILHADOS entre os 3 dashboards principais
 * (Aquário, Tapete, Yiwu). São os "GRUPOS DO FORNECEDOR" exibidos no GroupPicker.
 * Espelha a interface SupplierGroup do frontend.
 */
export const supplierGroups = mysqlTable("supplier_groups", {
  id: varchar("id", { length: 64 }).primaryKey(),
  number: int("number").notNull().default(1),
  name: varchar("name", { length: 255 }).notNull(),
  legend: text("legend"),
  color: varchar("color", { length: 32 }).notNull().default("#64748b"),
  createdAt: varchar("createdAt", { length: 40 }).notNull(),
  updatedAt: varchar("updatedAt", { length: 40 }).notNull(),
});

export type SupplierGroupRow = typeof supplierGroups.$inferSelect;
export type InsertSupplierGroupRow = typeof supplierGroups.$inferInsert;

/**
 * Fornecedores cadastrados manualmente DENTRO de cada dashboard principal
 * (aquario/tapete/yiwu). Diferente dos extraSuppliers (que pertencem a grupos
 * personalizados). Espelha a interface CustomSupplier do frontend.
 * Os muitos campos opcionais são guardados como JSON em `data`.
 */
export const customSuppliers = mysqlTable("custom_suppliers", {
  id: varchar("id", { length: 96 }).primaryKey(),
  scope: varchar("scope", { length: 48 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Objeto completo do CustomSupplier serializado (campos variados). */
  data: longtext("data").notNull(),
  createdAt: varchar("createdAt", { length: 40 }).notNull(),
  updatedAt: varchar("updatedAt", { length: 40 }).notNull(),
});

export type CustomSupplierRow = typeof customSuppliers.$inferSelect;
export type InsertCustomSupplierRow = typeof customSuppliers.$inferInsert;

/**
 * Planilhas de análise de viabilidade de compra (calculadora) por fornecedor.
 * Uma planilha por (scope, supplierId). O conteúdo completo (seções, linhas,
 * valores) é guardado como JSON em `data`. Espelha a interface ViabilitySheet
 * do frontend. Inicialmente usada no dashboard Tapete, mas o schema é genérico
 * e serve a qualquer escopo.
 */
export const viabilitySheets = mysqlTable("viability_sheets", {
  /** Escopo do dashboard: "aquario" | "tapete" | "yiwu" | "grupo-<id>" ... */
  scope: varchar("scope", { length: 96 }).notNull(),
  /** ID do fornecedor (estático, custom-..., extra_..., grupo). */
  supplierId: varchar("supplierId", { length: 191 }).notNull(),
  /** Documento completo da planilha serializado (título, seções, linhas). */
  data: longtext("data").notNull(),
  createdAt: varchar("createdAt", { length: 40 }).notNull(),
  updatedAt: varchar("updatedAt", { length: 40 }).notNull(),
});

export type ViabilitySheetRow = typeof viabilitySheets.$inferSelect;
export type InsertViabilitySheetRow = typeof viabilitySheets.$inferInsert;
