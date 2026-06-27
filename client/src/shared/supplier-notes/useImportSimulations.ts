// =============================================================================
// useImportSimulations — biblioteca de simulações de custo de importação salvas
// no sistema (banco de dados), via tRPC. Lista, salva (upsert) e exclui.
//
// O payload completo da simulação (kind="import-cost-simulation") é serializado
// na coluna `data`; ao abrir, reconstruímos o CalcSnapshot com parseSnapshotObject.
// =============================================================================
import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { buildSavePayload, parseSnapshotObject, type CalcSnapshot } from "./calcReport";

export interface SavedSimulation {
  id: string;
  name: string;
  ncm: string;
  custoUnitarioBRL: string;
  custoTotalBRL: string;
  data: string;
  createdAt: string;
  updatedAt: string;
}

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Gera um id textual único para uma nova simulação.
function newId(): string {
  return `sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useImportSimulations() {
  const utils = trpc.useUtils();
  const listQuery = trpc.data.importSimulations.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const upsertMutation = trpc.data.importSimulations.upsert.useMutation();
  const deleteMutation = trpc.data.importSimulations.delete.useMutation();

  const simulations = useMemo<SavedSimulation[]>(
    () => (listQuery.data ?? []) as SavedSimulation[],
    [listQuery.data],
  );

  const reload = useCallback(() => utils.data.importSimulations.list.invalidate(), [utils]);

  // Salva (cria ou atualiza) uma simulação a partir de um snapshot da calculadora.
  // Se `existingId` for informado, atualiza o registro; senão cria um novo.
  const save = useCallback(
    async (snap: CalcSnapshot, existingId?: string): Promise<string> => {
      const now = new Date().toISOString();
      const id = existingId ?? newId();
      const existing = existingId ? simulations.find((s) => s.id === existingId) : undefined;
      await upsertMutation.mutateAsync({
        id,
        name: snap.nome || "Sem nome",
        ncm: snap.ncm || "",
        custoUnitarioBRL: BRL(snap.result.custoUnitarioBRL),
        custoTotalBRL: BRL(snap.result.custoTotalBRL),
        data: buildSavePayload(snap),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      await reload();
      return id;
    },
    [simulations, upsertMutation, reload],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await deleteMutation.mutateAsync({ id });
      await reload();
    },
    [deleteMutation, reload],
  );

  // Reconstrói o CalcSnapshot de uma simulação salva (a partir da coluna `data`).
  const openSnapshot = useCallback((row: SavedSimulation): CalcSnapshot | null => {
    try {
      const parsed = JSON.parse(row.data);
      const res = parseSnapshotObject(parsed);
      return res.ok && res.snapshot ? res.snapshot : null;
    } catch {
      return null;
    }
  }, []);

  return {
    simulations,
    isLoading: listQuery.isLoading,
    isSaving: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
    reload,
    save,
    remove,
    openSnapshot,
  };
}
