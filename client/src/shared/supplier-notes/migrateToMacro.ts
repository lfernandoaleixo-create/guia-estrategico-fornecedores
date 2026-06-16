// =============================================================================
// migrateToMacro — lógica PURA da migração de um fornecedor do Yiwu para um
// MACRO já criado. Mantida fora do componente React para permitir testes
// unitários sem dependências de DOM/hooks.
//
// Um macro contém ITENS de tipos diferentes; a migração precisa cadastrar o
// fornecedor no DESTINO CORRETO conforme o tipo do item escolhido:
//
//   - kind "group"    → grupo personalizado promovido a dashboard. O fornecedor
//                       é criado como ExtraSupplier com groupId (aparece no
//                       dashboard /grupo/<id>).
//   - kind "subgroup" → especialidade do Aquário (Terrário/Aquário). O fornecedor
//                       é criado como CustomSupplier no scope "aquario" e a nota
//                       recebe fields.subtipoAquario = "terrario" | "aquario".
//   - kind "dashboard"→ dashboard fixo (Tapete/Yiwu). O fornecedor é criado como
//                       CustomSupplier no scope do dashboard (sem subgrupo).
// =============================================================================
import type { CustomSupplier } from "./useCustomSuppliers";
import type { ExtraSupplier } from "./useExtraSuppliers";
import type { SupplierNoteEntry } from "./useSupplierNotes";

/** Dados do fornecedor de origem usados para preencher o cadastro no destino. */
export interface MigrateToMacroContext {
  supplierName: string;
  chineseName?: string;
  category?: string;
  city?: string;
  province?: string;
  address?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
}

export type MigratedCustomSupplierInput = Omit<
  CustomSupplier,
  "id" | "scope" | "createdAt" | "updatedAt"
>;

export type MigratedExtraSupplierInput = Omit<
  ExtraSupplier,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * Monta o payload de um CustomSupplier (scope aquario/tapete/yiwu) a partir do
 * contexto do fornecedor de origem + a nota (para herdar observações).
 */
export function buildMigratedSupplierPayload(
  context: MigrateToMacroContext,
  sourceEntry: SupplierNoteEntry | undefined,
  now: number = Date.now(),
): MigratedCustomSupplierInput {
  const c = context;
  return {
    name: c.supplierName?.trim() || "Fornecedor",
    chineseName: c.chineseName?.trim() || undefined,
    category: c.category?.trim() || undefined,
    city: c.city?.trim() || undefined,
    province: c.province?.trim() || undefined,
    address: c.address?.trim() || undefined,
    contactName: c.contactName?.trim() || undefined,
    phones: c.phone?.trim()
      ? [{ id: `mp-${now}`, label: "Telefone", value: c.phone.trim() }]
      : [],
    emails: c.email?.trim() ? [{ id: `me-${now}`, value: c.email.trim() }] : [],
    links: c.website?.trim() ? [{ id: `ml-${now}`, value: c.website.trim() }] : [],
    notes: sourceEntry?.observacoes?.trim() || undefined,
  };
}

/**
 * Monta o payload de um ExtraSupplier (fornecedor de um GRUPO promovido) a partir
 * do contexto de origem + a nota (para herdar observações).
 */
export function buildMigratedExtraSupplierPayload(
  context: MigrateToMacroContext,
  groupId: string,
  sourceEntry: SupplierNoteEntry | undefined,
  now: number = Date.now(),
): MigratedExtraSupplierInput {
  const c = context;
  return {
    groupId,
    name: c.supplierName?.trim() || "Fornecedor",
    chineseName: c.chineseName?.trim() || undefined,
    category: c.category?.trim() || undefined,
    city: c.city?.trim() || undefined,
    province: c.province?.trim() || undefined,
    address: c.address?.trim() || undefined,
    contactName: c.contactName?.trim() || undefined,
    phones: c.phone?.trim()
      ? [{ id: `mp-${now}`, label: "Telefone", value: c.phone.trim() }]
      : [],
    emails: c.email?.trim() ? [{ id: `me-${now}`, value: c.email.trim() }] : [],
    links: c.website?.trim() ? [{ id: `ml-${now}`, value: c.website.trim() }] : [],
    notes: sourceEntry?.observacoes?.trim() || undefined,
  };
}

/**
 * Monta um SupplierNoteEntry COMPLETO para o destino, herdando status,
 * observações, campos, anexos, cotações e grupos da nota de origem, e gravando
 * marcações extras (ex.: subtipoAquario). Usado com writeEntryDirect.
 */
export function buildFullMigratedNote(
  destSupplierId: string,
  sourceEntry: SupplierNoteEntry | undefined,
  extraFields: Record<string, string> = {},
  nowISO: string = new Date().toISOString(),
): SupplierNoteEntry {
  return {
    supplierId: destSupplierId,
    status: sourceEntry?.status ?? "nao-visitado",
    observacoes: sourceEntry?.observacoes ?? "",
    fields: {
      ...(sourceEntry?.fields ?? {}),
      ...extraFields,
    },
    attachments: sourceEntry?.attachments ?? [],
    quoteRows: sourceEntry?.quoteRows ?? [],
    groupIds: sourceEntry?.groupIds ?? [],
    createdAt: sourceEntry?.createdAt ?? nowISO,
    updatedAt: nowISO,
  };
}

/** Rótulo amigável do destino para feedback ao usuário (ex.: "2.1 · Marmita"). */
export function destinationLabel(
  macroNumber: number,
  hier: number,
  itemLabel: string,
): string {
  return `${macroNumber}.${hier} · ${itemLabel}`;
}
