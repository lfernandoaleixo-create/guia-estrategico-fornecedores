// =============================================================================
// subgroupFilter — helpers puros para vincular fornecedores manuais a subgrupos.
//
// O vínculo de um fornecedor (CustomSupplier do scope "aquario") com um subgrupo
// (modelo macro.sub) é gravado na NOTA do fornecedor, em fields.subgroupId.
// Estas funções centralizam a leitura desse vínculo para que a página de
// dashboard de subgrupo e a Home (contagem por card) compartilhem exatamente a
// mesma regra — evitando divergências como a que fazia o fornecedor "sumir".
// =============================================================================

/** Forma mínima de um fornecedor para fins de filtro (id + campos de busca). */
export interface SubgroupFilterable {
  id: string;
  name?: string | null;
  chineseName?: string | null;
  category?: string | null;
  city?: string | null;
  province?: string | null;
  contactName?: string | null;
}

/** Mapa de notas por supplierId, contendo (ao menos) fields.subgroupId. */
export type NotesEntries = Record<
  string,
  { fields?: { subgroupId?: string | null } | null } | undefined
>;

/** Lê o subgroupId vinculado a um fornecedor (via nota), ou "" se não houver. */
export function subgroupIdOf(entries: NotesEntries, supplierId: string): string {
  return (entries[supplierId]?.fields?.subgroupId as string | undefined) ?? "";
}

/** Filtra os fornecedores que pertencem ao subgrupo informado. */
export function suppliersForSubgroup<T extends SubgroupFilterable>(
  suppliers: T[],
  entries: NotesEntries,
  subgroupId: string,
): T[] {
  if (!subgroupId) return [];
  return suppliers.filter((s) => subgroupIdOf(entries, s.id) === subgroupId);
}

/** Conta quantos fornecedores estão vinculados a cada subgrupo. */
export function countSuppliersBySubgroup(
  suppliers: SubgroupFilterable[],
  entries: NotesEntries,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of suppliers) {
    const sid = subgroupIdOf(entries, s.id);
    if (!sid) continue;
    counts[sid] = (counts[sid] ?? 0) + 1;
  }
  return counts;
}

/** Remove acentos e normaliza para busca case/acento-insensitive. */
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Aplica a busca textual sobre uma lista de fornecedores. */
export function searchSuppliers<T extends SubgroupFilterable>(
  suppliers: T[],
  query: string,
): T[] {
  const q = normalizeSearch(query);
  if (!q) return suppliers;
  return suppliers.filter((s) => {
    const hay = normalizeSearch(
      [s.name, s.chineseName, s.category, s.city, s.province, s.contactName]
        .filter(Boolean)
        .join(" "),
    );
    return hay.includes(q);
  });
}
