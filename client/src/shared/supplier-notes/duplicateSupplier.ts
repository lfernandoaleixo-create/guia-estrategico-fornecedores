// =============================================================================
// duplicateSupplier — lógica PURA para montar o payload de um NOVO cadastro a
// partir de um fornecedor existente. Copia apenas dados de CADASTRO (nome,
// contatos, localização, etc.) e gera novos IDs de contato. NÃO copia
// id/scope/createdAt/updatedAt (gerados pelo create) nem qualquer dado de
// NEGOCIAÇÃO (status/observações/anexos/cotações vivem na NOTA, não aqui).
// =============================================================================

import type { CustomSupplier, CustomSupplierContact } from "./useCustomSuppliers";

/** Campos que o `create` do hook injeta sozinho. */
type CreatableSupplier = Omit<CustomSupplier, "id" | "scope" | "createdAt" | "updatedAt">;

function cloneContacts(
  list: CustomSupplierContact[] | undefined,
  genId: () => string,
): CustomSupplierContact[] {
  if (!Array.isArray(list)) return [];
  return list.map((c) => ({
    id: genId(),
    label: c.label,
    value: c.value,
  }));
}

/**
 * Monta os dados de um novo cadastro a partir de `source`.
 * @param source Fornecedor de origem.
 * @param genContactId Gerador de IDs de contato (injetado para testabilidade).
 * @param opts.nameSuffix Sufixo opcional no nome (ex.: " (Aquário)").
 */
export function buildDuplicatePayload(
  source: CustomSupplier,
  genContactId: () => string,
  opts?: { nameSuffix?: string },
): CreatableSupplier {
  const suffix = opts?.nameSuffix?.trim();
  return {
    name: suffix ? `${source.name} ${suffix}` : source.name,
    chineseName: source.chineseName,
    category: source.category,
    ncm: source.ncm,
    city: source.city,
    province: source.province,
    district: source.district,
    floor: source.floor,
    gate: source.gate,
    address: source.address,
    phones: cloneContacts(source.phones, genContactId),
    emails: cloneContacts(source.emails, genContactId),
    links: cloneContacts(source.links, genContactId),
    contactName: source.contactName,
    contactRole: source.contactRole,
    contactLanguage: source.contactLanguage,
    // Dados-base de negociação NÃO são copiados — começa zerado.
    moq: undefined,
    priceFob: undefined,
    leadTime: undefined,
    paymentTerms: undefined,
    incoterm: undefined,
    notes: undefined,
    // Grupos também começam vazios (vínculo é por negociação).
    groupIds: [],
  };
}
