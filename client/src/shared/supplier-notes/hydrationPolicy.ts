// =============================================================================
// hydrationPolicy — Regra PURA que decide se o painel de anotações pode
// reidratar (sobrescrever) o estado local com os dados vindos do servidor.
//
// MOTIVAÇÃO (bug "as observações somem ao salvar"):
//   O painel faz polling/refetch a cada poucos segundos. Se reidratarmos o
//   estado local toda vez que `entry` muda de referência, qualquer coisa que o
//   operador esteja digitando é descartada quando chega uma resposta do servidor
//   (muitas vezes uma versão ANTIGA, por corrida). A regra abaixo garante que:
//     1) Reidratamos ao TROCAR de fornecedor (sempre).
//     2) Reidratamos na 1ª vez que os dados chegam para o fornecedor atual,
//        DESDE QUE o operador ainda não tenha digitado nada (painel "limpo").
//     3) NUNCA reidratamos enquanto o painel está "sujo" (dirty) — isto é, o
//        operador editou algo e ainda não salvou. Assim nada é perdido.
// =============================================================================

export interface HydrationState {
  /** supplierId atualmente exibido no painel. */
  currentSupplierId: string;
  /** Último supplierId que foi hidratado (ref). null se nunca hidratou. */
  hydratedFor: string | null;
  /** O operador editou algo desde a última hidratação? */
  dirty: boolean;
  /** Já populamos o estado com um `entry` real (não-nulo) para o supplier atual? */
  hydratedFromEntry: boolean;
  /** Existe `entry` (dados salvos) para o supplier atual neste momento? */
  hasEntry: boolean;
}

/**
 * Decide se o estado local deve ser reidratado a partir do servidor.
 * Retorna true APENAS quando é seguro (não há risco de descartar edição).
 */
export function shouldHydrate(state: HydrationState): boolean {
  const changedSupplier = state.hydratedFor !== state.currentSupplierId;

  // Trocou de fornecedor → sempre reidrata (estado anterior não pertence a este).
  if (changedSupplier) return true;

  // Mesmo fornecedor: só preenche se ainda está limpo E os dados acabaram de
  // chegar (antes o entry era nulo). Nunca sobrescreve edição em andamento.
  const firstFillWhileClean =
    !state.dirty && state.hasEntry && !state.hydratedFromEntry;

  return firstFillWhileClean;
}
