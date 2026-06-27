import { boolean, int, json, longtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
}, (table) => ({
  // Garante uma única linha por (scope, supplierId). Sem isso, saves concorrentes
  // podiam gerar linhas duplicadas e leitura não-determinística dos campos.
  scopeSupplierUnique: uniqueIndex("supplier_notes_scope_supplier_uq").on(table.scope, table.supplierId),
}));

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

/**
 * Assuntos/Temas de Fornecedores Parceiros — usado SOMENTE no dashboard do
 * Grupo Nº 00 (Central de Documentos). Cada parceiro (extraSupplier do grupo 00)
 * pode ter vários assuntos (ex.: "Vidro"), e cada assunto guarda um título e
 * observações livres. Os ANEXOS de cada assunto reaproveitam a tabela
 * supplier_notes via escopo lógico `parceiro-<partnerId>` e supplierId=<topicId>,
 * para herdar o fluxo de upload S3 já existente (sem base64 no banco).
 */
export const partnerTopics = mysqlTable("partner_topics", {
  /** ID textual gerado no cliente (ex.: "ptopic_xxx"). Chave primária. */
  id: varchar("id", { length: 96 }).primaryKey(),
  /** ID do fornecedor parceiro (extraSupplier) ao qual o assunto pertence. */
  partnerId: varchar("partnerId", { length: 96 }).notNull(),
  /** Escopo lógico do dashboard que contém o parceiro (ex.: "grupo-<id>"). */
  scope: varchar("scope", { length: 96 }).notNull(),
  /** Título do assunto/tema (ex.: "Vidro", "Cotação frete"). */
  title: varchar("title", { length: 255 }).notNull(),
  /** Observações livres sobre o assunto. */
  notes: text("notes"),
  /** Ordem de exibição (menor = primeiro). */
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: varchar("createdAt", { length: 40 }).notNull(),
  updatedAt: varchar("updatedAt", { length: 40 }).notNull(),
});

export type PartnerTopicRow = typeof partnerTopics.$inferSelect;
export type InsertPartnerTopicRow = typeof partnerTopics.$inferInsert;

/**
 * Classificações MACRO — camada de organização ACIMA dos dashboards, exibida na
 * página inicial (Home). Cada macro tem um número (ex.: 1) e um nome (ex.: "PET").
 * Os itens do macro (dashboards e subgrupos) e a ORDEM deles são guardados como
 * JSON em `items`, de modo que a numeração hierárquica (1.1, 1.2, 1.3…) é
 * derivada da posição. Cada item referencia um dashboard fixo (aquario/tapete/
 * yiwu), um subgrupo de dashboard (ex.: aquario/terrario) ou um grupo promovido.
 * Regra de negócio: um mesmo item pertence a no máximo um macro (garantido na UI/hook).
 */
export const macros = mysqlTable("macros", {
  /** ID textual gerado no cliente (ex.: "macro_xxx"). Chave primária. */
  id: varchar("id", { length: 96 }).primaryKey(),
  /** Número do macro (1, 2, 3…), único. Define o prefixo da numeração (1.x). */
  number: int("number").notNull().default(1),
  /**
   * Posição de exibição na Home (menor = primeiro). Separado de `number`:
   * reordenar muda SÓ o orderIndex, preservando number/name e a numeração 1.x.
   */
  orderIndex: int("orderIndex").notNull().default(0),
  /** Nome do macro (ex.: "PET"). */
  name: varchar("name", { length: 255 }).notNull(),
  /** Cor de destaque (hex). */
  color: varchar("color", { length: 32 }).notNull().default("#8b5cf6"),
  /**
   * Lista ORDENADA de itens do macro, serializada em JSON. Cada item:
   * { key: string, kind: "dashboard"|"subgroup"|"group", refId: string,
   *   label: string, href: string, subtipo?: string }
   * A posição no array define o sufixo da numeração (1.1, 1.2, …).
   */
  items: json("items"),
  createdAt: varchar("createdAt", { length: 40 }).notNull(),
  updatedAt: varchar("updatedAt", { length: 40 }).notNull(),
});

export type MacroRow = typeof macros.$inferSelect;
export type InsertMacroRow = typeof macros.$inferInsert;

/**
 * SUBGRUPOS numerados livres sob cada MACRO (modelo macro.sub).
 *
 * Um subgrupo pertence a um MACRO (referenciado pelo NÚMERO do macro, ex.: 1)
 * e tem um sufixo livre digitável pelo usuário (ex.: 1 → "1.1", 4 → "1.4").
 * Tem nome livre (ex.: "Terrário", "Coleira de Cachorro") e cor.
 *
 * A combinação (macroNumber, sub) é a numeração exibida ("1.1", "3.4").
 * Pode repetir o mesmo `sub` em macros diferentes (o macroNumber distingue).
 * Os fornecedores se vinculam ao subgrupo via fields.subgroupId na nota.
 */
export const subgroups = mysqlTable("subgroups", {
  /** ID textual gerado no cliente (ex.: "sg_xxx"). Chave primária. */
  id: varchar("id", { length: 96 }).primaryKey(),
  /** Número do MACRO ao qual pertence (referencia macros.number). */
  macroNumber: int("macroNumber").notNull(),
  /** Sufixo livre dentro do macro (o "x" em macro.x). Digitado pelo usuário. */
  sub: int("sub").notNull(),
  /** Nome livre do subgrupo (ex.: "Terrário", "Coleira de Cachorro"). */
  name: varchar("name", { length: 255 }).notNull(),
  /** Subtítulo livre exibido no card (texto colorido). Vazio = usa fallback. */
  subtitle: varchar("subtitle", { length: 255 }).notNull().default(""),
  /** Cor de destaque (hex). */
  color: varchar("color", { length: 32 }).notNull().default("#10b981"),
  createdAt: varchar("createdAt", { length: 40 }).notNull(),
  updatedAt: varchar("updatedAt", { length: 40 }).notNull(),
});

export type SubgroupRow = typeof subgroups.$inferSelect;
export type InsertSubgroupRow = typeof subgroups.$inferInsert;

/**
 * Configurações genéricas do app no formato chave/valor (JSON serializado).
 * Usado para preferências de exibição que não pertencem a nenhuma outra tabela,
 * como a lista de cards de acesso fixos OCULTOS na Home (chave "hiddenCards").
 * Compartilhado entre todos os acessos (sem login), igual aos demais dados.
 */
export const appSettings = mysqlTable("app_settings", {
  /** Chave única da configuração (ex.: "hiddenCards"). */
  key: varchar("key", { length: 96 }).primaryKey(),
  /** Valor serializado como JSON (string). */
  value: longtext("value").notNull(),
  updatedAt: varchar("updatedAt", { length: 40 }).notNull(),
});

export type AppSettingRow = typeof appSettings.$inferSelect;
export type InsertAppSettingRow = typeof appSettings.$inferInsert;

/**
 * Simulações de custo de importação salvas DENTRO do sistema (biblioteca).
 * Cada registro guarda o payload completo da simulação (mesmo formato do .json
 * exportado, kind="import-cost-simulation") em `data` (JSON serializado), além
 * de campos denormalizados (nome, ncm) para busca rápida e ordenação.
 * Compartilhado entre todos os acessos (sem login por usuário), como os demais
 * dados do guia.
 */
export const importSimulations = mysqlTable("import_simulations", {
  /** ID textual gerado no cliente (ex.: "sim_xxx"). Chave primária. */
  id: varchar("id", { length: 96 }).primaryKey(),
  /** Nome do produto/simulação (para exibição e busca). */
  name: varchar("name", { length: 255 }).notNull().default(""),
  /** NCM associado (para busca). */
  ncm: varchar("ncm", { length: 64 }).notNull().default(""),
  /** Custo unitário em R$ no momento do salvamento (para exibir no card). */
  custoUnitarioBRL: varchar("custoUnitarioBRL", { length: 40 }).notNull().default("0"),
  /** Custo total em R$ no momento do salvamento (para exibir no card). */
  custoTotalBRL: varchar("custoTotalBRL", { length: 40 }).notNull().default("0"),
  /** Payload completo da simulação serializado (kind="import-cost-simulation"). */
  data: longtext("data").notNull(),
  createdAt: varchar("createdAt", { length: 40 }).notNull(),
  updatedAt: varchar("updatedAt", { length: 40 }).notNull(),
});

export type ImportSimulationRow = typeof importSimulations.$inferSelect;
export type InsertImportSimulationRow = typeof importSimulations.$inferInsert;
