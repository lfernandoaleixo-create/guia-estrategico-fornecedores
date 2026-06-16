// =============================================================================
// specialtyReport — helper puro para separar métricas por especialidade
// (🐟 Aquário x 🦎 Terrário) no dashboard Aquário.
//
// A especialidade de um fornecedor é determinada por:
//   1) A classificação manual feita no Diário (fields.subtipoAquario), quando existir;
//   2) Caso não exista, cai na categoria ORIGINAL do catálogo (category):
//        - "aquario"        -> aquario
//        - "terrario"       -> terrario
//        - qualquer outra   -> "outros" (equipamento, mercado, etc.)
//
// Fornecedores cadastrados manualmente sem categoria seguem o subtipo da nota;
// na ausência dele, ficam como "outros".
// =============================================================================

export type Specialty = "aquario" | "terrario" | "outros";
export type SpecialtyFilter = "todos" | "aquario" | "terrario";

/** Entrada mínima necessária para classificar uma nota por especialidade. */
export interface SpecialtyEntryLike {
  supplierId: string;
  fields?: Record<string, string> | null;
}

/**
 * Resolve a especialidade efetiva de um fornecedor.
 * @param supplierId id do fornecedor
 * @param subtipoById mapa supplierId -> subtipoAquario marcado no Diário ("aquario"|"terrario")
 * @param categoryById mapa supplierId -> categoria original do catálogo
 */
export function resolveSpecialty(
  supplierId: string,
  subtipoById: Record<string, string | undefined>,
  categoryById: Record<string, string | undefined>,
): Specialty {
  const sub = subtipoById[supplierId];
  if (sub === "aquario" || sub === "terrario") return sub;

  const cat = categoryById[supplierId];
  if (cat === "aquario") return "aquario";
  if (cat === "terrario") return "terrario";
  return "outros";
}

/**
 * Decide se uma entry deve ser mantida dado o filtro de especialidade.
 * - "todos": mantém tudo.
 * - "aquario"/"terrario": mantém apenas quem tem aquela especialidade efetiva.
 *   (fornecedores "outros" — ex.: equipamentos — só aparecem em "todos".)
 */
export function matchesSpecialty(
  supplierId: string,
  filter: SpecialtyFilter,
  subtipoById: Record<string, string | undefined>,
  categoryById: Record<string, string | undefined>,
): boolean {
  if (filter === "todos") return true;
  return resolveSpecialty(supplierId, subtipoById, categoryById) === filter;
}

/**
 * Filtra uma lista de entries pela especialidade selecionada.
 */
export function filterEntriesBySpecialty<T extends SpecialtyEntryLike>(
  entries: T[],
  filter: SpecialtyFilter,
  subtipoById: Record<string, string | undefined>,
  categoryById: Record<string, string | undefined>,
): T[] {
  if (filter === "todos") return entries;
  return entries.filter((e) =>
    matchesSpecialty(e.supplierId, filter, subtipoById, categoryById),
  );
}

/** Conta quantos fornecedores existem por especialidade (para badges/labels). */
export function countBySpecialty<T extends SpecialtyEntryLike>(
  entries: T[],
  subtipoById: Record<string, string | undefined>,
  categoryById: Record<string, string | undefined>,
): Record<Specialty, number> {
  const counts: Record<Specialty, number> = { aquario: 0, terrario: 0, outros: 0 };
  for (const e of entries) {
    counts[resolveSpecialty(e.supplierId, subtipoById, categoryById)]++;
  }
  return counts;
}
