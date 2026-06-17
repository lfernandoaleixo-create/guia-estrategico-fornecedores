// =============================================================================
// useManagedPartners — parceiros chineses cadastrados MANUALMENTE (avulsos).
//
// Hoje os nomes do filtro são derivados apenas do campo "Parceiros Chineses"
// preenchido em cada fornecedor. Fernando quer poder CADASTRAR um parceiro
// diretamente no filtro (ex.: "Betty") e vê-lo imediatamente como chip, mesmo
// sem nenhum fornecedor vinculado ainda — e EXCLUÍ-lo quando não há vínculo.
//
// Este hook persiste a lista de parceiros avulsos no banco compartilhado, via a
// chave de settings "managedPartners" (array de nomes serializado em JSON),
// seguindo o mesmo padrão de useHiddenCards. A grafia original é preservada;
// duplicados são removidos pela forma normalizada.
// =============================================================================
import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { dedupePartners, normalizePartner } from "./partners";

const SETTING_KEY = "managedPartners";

export function parseManagedPartners(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return dedupePartners(
        parsed.filter((v): v is string => typeof v === "string").map((v) => v.trim()),
      );
    }
  } catch {
    // valor corrompido → trata como vazio
  }
  return [];
}

export function useManagedPartners() {
  const utils = trpc.useUtils();
  const query = trpc.data.settings.get.useQuery(
    { key: SETTING_KEY },
    { refetchInterval: 5000, refetchOnWindowFocus: true },
  );
  const setMut = trpc.data.settings.set.useMutation();

  const managed = useMemo<string[]>(
    () => parseManagedPartners(query.data?.value),
    [query.data?.value],
  );

  const managedSet = useMemo(
    () => new Set(managed.map((p) => normalizePartner(p))),
    [managed],
  );

  const loading = query.isLoading;

  const reload = useCallback(async () => {
    await utils.data.settings.get.invalidate({ key: SETTING_KEY });
  }, [utils]);

  const isManaged = useCallback(
    (name: string) => managedSet.has(normalizePartner(name)),
    [managedSet],
  );

  /** Cadastra um parceiro avulso (idempotente; preserva a grafia digitada). */
  const addPartner = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      const key = normalizePartner(trimmed);
      if (!key || managedSet.has(key)) return;
      const next = dedupePartners([...managed, trimmed]);
      await setMut.mutateAsync({ key: SETTING_KEY, value: JSON.stringify(next) });
      await reload();
    },
    [managed, managedSet, setMut, reload],
  );

  /** Remove um parceiro avulso da lista (não afeta fornecedores). */
  const removePartner = useCallback(
    async (name: string) => {
      const key = normalizePartner(name);
      if (!managedSet.has(key)) return;
      const next = managed.filter((p) => normalizePartner(p) !== key);
      await setMut.mutateAsync({ key: SETTING_KEY, value: JSON.stringify(next) });
      await reload();
    },
    [managed, managedSet, setMut, reload],
  );

  return { managed, managedSet, isManaged, addPartner, removePartner, loading, reload };
}
