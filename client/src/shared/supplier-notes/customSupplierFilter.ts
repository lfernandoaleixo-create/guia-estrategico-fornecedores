// =============================================================================
// customSupplierFilter — lógica PURA de filtro de fornecedores manuais por
// especialidade (Aquário x Terrário). Extraída para ser testável sem React.
//
// Regra: a especialidade vive na NOTA (fields.subtipoAquario), não no cadastro.
// - filterSubtipo = null            → mostra TODOS (visão geral)
// - filterSubtipo = "aquario"       → só os marcados como "aquario"
// - filterSubtipo = "terrario"      → só os marcados como "terrario"
// Fornecedores SEM especialidade definida NÃO aparecem nas visões filtradas
// (só na visão geral), evitando que um item ambíguo polua as duas abas.
// =============================================================================

export type Subtipo = "aquario" | "terrario";

export interface HasId {
  id: string;
}

export function filterSuppliersBySubtipo<T extends HasId>(
  list: T[],
  filterSubtipo: Subtipo | null | undefined,
  specialtyById: Record<string, Subtipo>,
): T[] {
  if (filterSubtipo !== "aquario" && filterSubtipo !== "terrario") {
    return list;
  }
  return list.filter((s) => specialtyById[s.id] === filterSubtipo);
}
