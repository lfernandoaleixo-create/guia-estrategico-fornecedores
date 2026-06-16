// =============================================================================
// macroOrder — lógica PURA de reordenação/renumeração de macros (Home).
// Extraída para ser testável sem hooks tRPC/React.
// =============================================================================

export interface MacroLike {
  id: string;
  number: number;
}

/**
 * Move um macro uma posição para cima/baixo na lista atual e retorna a NOVA
 * ordem de ids. Se o movimento for inválido (já no topo/fim ou id inexistente),
 * retorna a ordem original sem alterações.
 */
export function moveMacroOrder(
  ids: string[],
  id: string,
  direction: "up" | "down",
): string[] {
  const next = [...ids];
  const idx = next.indexOf(id);
  if (idx === -1) return next;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= next.length) return next;
  [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
  return next;
}

/**
 * Aplica uma nova ordem de ids a uma lista de macros, renumerando 1..N na nova
 * ordem. Macros não citados em `orderedIds` são anexados ao final, preservando
 * sua ordem relativa, e também renumerados sequencialmente.
 */
export function renumberMacros<T extends MacroLike>(
  macros: T[],
  orderedIds: string[],
): T[] {
  const byId = new Map(macros.map((m) => [m.id, m]));
  const out: T[] = [];
  orderedIds.forEach((id) => {
    const m = byId.get(id);
    if (m) out.push({ ...m, number: out.length + 1 });
  });
  macros.forEach((m) => {
    if (!orderedIds.includes(m.id)) {
      out.push({ ...m, number: out.length + 1 });
    }
  });
  return out;
}
