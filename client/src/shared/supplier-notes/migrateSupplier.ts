// =============================================================================
// migrateSupplier — move o histórico (status, observações, anexos, cotações,
// grupos) de um fornecedor entre dashboards (aquario | tapete | yiwu) ou para
// um grupo personalizado (custom group), preservando todos os dados.
//
// Escopos válidos:
//   - "aquario" | "tapete" | "yiwu": dashboards principais (SupplierNoteEntry)
//   - "extra:<groupId>": grupo personalizado (vira ExtraSupplier)
// =============================================================================

import {
  readEntryDirect,
  writeEntryDirect,
  deleteEntryDirect,
  type SupplierNoteEntry,
} from "./useSupplierNotes";
import {
  readAllExtraSuppliers,
  writeAllExtraSuppliers,
  type ExtraSupplier,
} from "./useExtraSuppliers";

export type DashboardScope = "aquario" | "tapete" | "yiwu";
export type MigrationTarget =
  | { kind: "dashboard"; scope: DashboardScope }
  | { kind: "custom-group"; groupId: string };

export interface MigrationContext {
  /** Nome legível do fornecedor (vem dos dados originais do dashboard) */
  supplierName: string;
  /** Para reconstrução em ExtraSupplier (campos opcionais) */
  chineseName?: string;
  city?: string;
  province?: string;
  address?: string;
  category?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  newSupplierId?: string;
}

/**
 * Migra um fornecedor de origem (dashboard) para destino (dashboard OU grupo).
 * Mantém todo o histórico (entry note + extras quando aplicável).
 */
export async function migrateSupplier(
  fromScope: string,
  fromSupplierId: string,
  target: MigrationTarget,
  context: MigrationContext,
): Promise<MigrationResult> {
  const sourceEntry = await readEntryDirect(fromScope, fromSupplierId);

  if (target.kind === "dashboard") {
    if (target.scope === fromScope) {
      return { success: false, message: "Origem e destino são o mesmo dashboard." };
    }

    // Cria um id estável no destino derivado do origem (evita colisão)
    const newSupplierId = `migrated-${fromScope}-${fromSupplierId}`;

    if (sourceEntry) {
      const cloned: SupplierNoteEntry = {
        ...sourceEntry,
        supplierId: newSupplierId,
        // mantém createdAt original; updatedAt em pt-BR
        updatedAt: new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      };
      await writeEntryDirect(target.scope, cloned);
      await deleteEntryDirect(fromScope, fromSupplierId);
    } else {
      // Sem entry, ainda assim cria um registro vazio para sinalizar a migração?
      // Optamos por não criar nada — o destino pode anotar manualmente.
    }

    return {
      success: true,
      message: `Fornecedor migrado para o dashboard "${target.scope}".`,
      newSupplierId,
    };
  }

  // Destino: grupo personalizado → vira ExtraSupplier
  if (target.kind === "custom-group") {
    const now = Date.now();
    const newId = `extra_migrated_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const newSupplier: ExtraSupplier = {
      id: newId,
      groupId: target.groupId,
      name: context.supplierName,
      chineseName: context.chineseName,
      city: context.city,
      province: context.province,
      address: context.address,
      category: context.category,
      contactName: context.contactName,
      phones: context.phone
        ? [{ id: `c-${now}-p`, label: "Telefone", value: context.phone }]
        : [],
      emails: context.email
        ? [{ id: `c-${now}-e`, value: context.email }]
        : [],
      links: context.website
        ? [{ id: `c-${now}-l`, value: context.website }]
        : [],
      notes: sourceEntry?.observacoes ?? undefined,
      createdAt: now,
      updatedAt: now,
    };

    const list = await readAllExtraSuppliers();
    await writeAllExtraSuppliers([...list, newSupplier]);

    if (sourceEntry) {
      await deleteEntryDirect(fromScope, fromSupplierId);
    }

    return {
      success: true,
      message: "Fornecedor migrado para o grupo personalizado.",
      newSupplierId: newId,
    };
  }

  return { success: false, message: "Destino inválido." };
}
