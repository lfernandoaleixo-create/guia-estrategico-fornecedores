import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  bulkUpsertCustomGroups,
  deleteCustomGroup,
  deleteExtraSupplier,
  deleteSupplierNote,
  listAllSupplierNotes,
  listCustomGroups,
  listExtraSuppliers,
  listSupplierNotes,
  upsertCustomGroup,
  upsertExtraSupplier,
  upsertSupplierNote,
  listSupplierGroups,
  upsertSupplierGroup,
  bulkUpsertSupplierGroups,
  deleteSupplierGroup,
  listCustomSuppliers,
  upsertCustomSupplier,
  deleteCustomSupplier,
  getViabilitySheet,
  upsertViabilitySheet,
  listPartnerTopics,
  listPartnerTopicsByPartner,
  upsertPartnerTopic,
  deletePartnerTopic,
  listMacros,
  upsertMacro,
  bulkUpsertMacros,
  deleteMacro,
  listSubgroups,
  upsertSubgroup,
  bulkUpsertSubgroups,
  deleteSubgroup,
} from "../db";

// ---------- Schemas ----------
const customGroupInput = z.object({
  id: z.string(),
  number: z.number().int(),
  name: z.string(),
  branch: z.string().default(""),
  color: z.string().default("#64748b"),
  description: z.string().nullable().optional(),
  promotedToDashboard: z.boolean().default(false),
  promotedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const contactSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  value: z.string(),
});

const extraSupplierInput = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  chineseName: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  ncm: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phones: z.array(contactSchema).default([]),
  emails: z.array(contactSchema).default([]),
  links: z.array(contactSchema).default([]),
  contactName: z.string().nullable().optional(),
  contactRole: z.string().nullable().optional(),
  contactLanguage: z.string().nullable().optional(),
  moq: z.string().nullable().optional(),
  priceFob: z.string().nullable().optional(),
  leadTime: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  incoterm: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const supplierNoteInput = z.object({
  scope: z.string(),
  supplierId: z.string(),
  status: z.string().default("nao-visitado"),
  observacoes: z.string().nullable().optional(),
  fields: z.record(z.string(), z.string()).default({}),
  // attachments armazenado como JSON serializado em string (longtext)
  attachments: z.string().default("[]"),
  quoteRows: z.array(z.any()).nullable().optional(),
  groupIds: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const supplierGroupInput = z.object({
  id: z.string(),
  number: z.number().int(),
  name: z.string(),
  legend: z.string().nullable().optional(),
  color: z.string().default("#64748b"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const customSupplierInput = z.object({
  id: z.string(),
  scope: z.string(),
  name: z.string(),
  data: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const viabilitySheetInput = z.object({
  scope: z.string(),
  supplierId: z.string(),
  // Documento completo da planilha serializado em JSON (string).
  data: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const partnerTopicInput = z.object({
  id: z.string(),
  partnerId: z.string(),
  scope: z.string(),
  title: z.string(),
  notes: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const macroItemSchema = z.object({
  key: z.string(),
  kind: z.enum(["dashboard", "subgroup", "group"]),
  refId: z.string(),
  label: z.string(),
  href: z.string(),
  subtipo: z.string().nullable().optional(),
});

const macroInput = z.object({
  id: z.string(),
  number: z.number().int(),
  orderIndex: z.number().int().default(0),
  name: z.string(),
  color: z.string().default("#8b5cf6"),
  items: z.array(macroItemSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const subgroupInput = z.object({
  id: z.string(),
  macroNumber: z.number().int(),
  sub: z.number().int(),
  name: z.string(),
  color: z.string().default("#10b981"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const dataRouter = router({
  // ---------- Custom Groups ----------
  groups: router({
    list: publicProcedure.query(() => listCustomGroups()),
    upsert: publicProcedure.input(customGroupInput).mutation(async ({ input }) => {
      await upsertCustomGroup({
        ...input,
        description: input.description ?? null,
        promotedAt: input.promotedAt ?? null,
      });
      return { success: true } as const;
    }),
    bulkUpsert: publicProcedure
      .input(z.array(customGroupInput))
      .mutation(async ({ input }) => {
        await bulkUpsertCustomGroups(
          input.map((g) => ({
            ...g,
            description: g.description ?? null,
            promotedAt: g.promotedAt ?? null,
          })),
        );
        return { success: true } as const;
      }),
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deleteCustomGroup(input.id);
        return { success: true } as const;
      }),
  }),

  // ---------- Extra Suppliers ----------
  suppliers: router({
    list: publicProcedure.query(() => listExtraSuppliers()),
    upsert: publicProcedure.input(extraSupplierInput).mutation(async ({ input }) => {
      await upsertExtraSupplier({
        ...input,
        chineseName: input.chineseName ?? null,
        category: input.category ?? null,
        ncm: input.ncm ?? null,
        city: input.city ?? null,
        province: input.province ?? null,
        address: input.address ?? null,
        contactName: input.contactName ?? null,
        contactRole: input.contactRole ?? null,
        contactLanguage: input.contactLanguage ?? null,
        moq: input.moq ?? null,
        priceFob: input.priceFob ?? null,
        leadTime: input.leadTime ?? null,
        paymentTerms: input.paymentTerms ?? null,
        incoterm: input.incoterm ?? null,
        notes: input.notes ?? null,
      });
      return { success: true } as const;
    }),
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deleteExtraSupplier(input.id);
        return { success: true } as const;
      }),
  }),

  // ---------- Supplier Notes ----------
  notes: router({
    listByScope: publicProcedure
      .input(z.object({ scope: z.string() }))
      .query(({ input }) => listSupplierNotes(input.scope)),
    listAll: publicProcedure.query(() => listAllSupplierNotes()),
    upsert: publicProcedure.input(supplierNoteInput).mutation(async ({ input }) => {
      await upsertSupplierNote({
        ...input,
        observacoes: input.observacoes ?? null,
        quoteRows: input.quoteRows ?? null,
      });
      return { success: true } as const;
    }),
    delete: publicProcedure
      .input(z.object({ scope: z.string(), supplierId: z.string() }))
      .mutation(async ({ input }) => {
        await deleteSupplierNote(input.scope, input.supplierId);
        return { success: true } as const;
      }),
  }),

  // ---------- Supplier Groups (3 dashboards principais) ----------
  supplierGroups: router({
    list: publicProcedure.query(() => listSupplierGroups()),
    upsert: publicProcedure.input(supplierGroupInput).mutation(async ({ input }) => {
      await upsertSupplierGroup({ ...input, legend: input.legend ?? null });
      return { success: true } as const;
    }),
    bulkUpsert: publicProcedure
      .input(z.array(supplierGroupInput))
      .mutation(async ({ input }) => {
        await bulkUpsertSupplierGroups(
          input.map((g) => ({ ...g, legend: g.legend ?? null })),
        );
        return { success: true } as const;
      }),
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deleteSupplierGroup(input.id);
        return { success: true } as const;
      }),
  }),

  // ---------- Custom Suppliers (dentro dos dashboards principais) ----------
  customSuppliers: router({
    list: publicProcedure
      .input(z.object({ scope: z.string().optional() }).optional())
      .query(({ input }) => listCustomSuppliers(input?.scope)),
    upsert: publicProcedure.input(customSupplierInput).mutation(async ({ input }) => {
      await upsertCustomSupplier(input);
      return { success: true } as const;
    }),
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deleteCustomSupplier(input.id);
        return { success: true } as const;
      }),
  }),

  // ---------- Planilhas de análise de viabilidade (calculadora) ----------
  viabilitySheets: router({
    get: publicProcedure
      .input(z.object({ scope: z.string(), supplierId: z.string() }))
      .query(({ input }) => getViabilitySheet(input.scope, input.supplierId)),
    upsert: publicProcedure.input(viabilitySheetInput).mutation(async ({ input }) => {
      await upsertViabilitySheet(input);
      return { success: true } as const;
    }),
  }),

  // ---------- Subgrupos numerados (macro.sub) ----------
  subgroups: router({
    list: publicProcedure.query(() => listSubgroups()),
    upsert: publicProcedure.input(subgroupInput).mutation(async ({ input }) => {
      await upsertSubgroup(input);
      return { success: true } as const;
    }),
    bulkUpsert: publicProcedure
      .input(z.array(subgroupInput))
      .mutation(async ({ input }) => {
        await bulkUpsertSubgroups(input);
        return { success: true } as const;
      }),
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deleteSubgroup(input.id);
        return { success: true } as const;
      }),
  }),

  // ---------- Macros (classificações MACRO da Home) ----------
  macros: router({
    list: publicProcedure.query(() => listMacros()),
    upsert: publicProcedure.input(macroInput).mutation(async ({ input }) => {
      await upsertMacro({ ...input, items: input.items });
      return { success: true } as const;
    }),
    bulkUpsert: publicProcedure
      .input(z.array(macroInput))
      .mutation(async ({ input }) => {
        await bulkUpsertMacros(input.map((m) => ({ ...m, items: m.items })));
        return { success: true } as const;
      }),
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deleteMacro(input.id);
        return { success: true } as const;
      }),
  }),

  // ---------- Partner Topics (Assuntos) — Central de Documentos / Grupo Nº 00 ----------
  partnerTopics: router({
    listByScope: publicProcedure
      .input(z.object({ scope: z.string() }))
      .query(({ input }) => listPartnerTopics(input.scope)),
    listByPartner: publicProcedure
      .input(z.object({ partnerId: z.string() }))
      .query(({ input }) => listPartnerTopicsByPartner(input.partnerId)),
    upsert: publicProcedure.input(partnerTopicInput).mutation(async ({ input }) => {
      await upsertPartnerTopic({ ...input, notes: input.notes ?? null });
      return { success: true } as const;
    }),
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deletePartnerTopic(input.id);
        return { success: true } as const;
      }),
  }),
});
