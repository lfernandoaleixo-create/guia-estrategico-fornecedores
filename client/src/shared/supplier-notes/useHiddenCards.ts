// =============================================================================
// useHiddenCards — lista de KEYS de cards de acesso fixos OCULTOS na Home.
//
// "Ocultar" um card de acesso fixo (Terrário, Aquário, Tapete, Yiwu) significa
// apenas removê-lo do portal: o card some da Home, mas NENHUM dado de fornecedor,
// anexo ou dashboard é apagado. O dashboard correspondente continua existindo e
// pode ser restaurado a qualquer momento (basta desocultar o card).
//
// Persiste no banco compartilhado via a chave de settings "hiddenCards"
// (array de keys serializado em JSON), seguindo o mesmo padrão dos demais hooks.
// =============================================================================
import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";

const SETTING_KEY = "hiddenCards";

function parseKeys(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((k): k is string => typeof k === "string");
    }
  } catch {
    // valor corrompido → trata como vazio
  }
  return [];
}

export function useHiddenCards() {
  const utils = trpc.useUtils();
  const query = trpc.data.settings.get.useQuery(
    { key: SETTING_KEY },
    { refetchInterval: 5000, refetchOnWindowFocus: true },
  );
  const setMut = trpc.data.settings.set.useMutation();

  const hiddenKeys = useMemo<string[]>(
    () => parseKeys(query.data?.value),
    [query.data?.value],
  );

  const hiddenSet = useMemo(() => new Set(hiddenKeys), [hiddenKeys]);

  const loading = query.isLoading;

  const reload = useCallback(async () => {
    await utils.data.settings.get.invalidate({ key: SETTING_KEY });
  }, [utils]);

  const isHidden = useCallback((key: string) => hiddenSet.has(key), [hiddenSet]);

  /** Oculta um card de acesso fixo (idempotente). */
  const hideCard = useCallback(
    async (key: string) => {
      if (hiddenSet.has(key)) return;
      const next = [...hiddenKeys, key];
      await setMut.mutateAsync({ key: SETTING_KEY, value: JSON.stringify(next) });
      await reload();
    },
    [hiddenKeys, hiddenSet, setMut, reload],
  );

  /** Restaura (desoculta) um card de acesso fixo. */
  const showCard = useCallback(
    async (key: string) => {
      if (!hiddenSet.has(key)) return;
      const next = hiddenKeys.filter((k) => k !== key);
      await setMut.mutateAsync({ key: SETTING_KEY, value: JSON.stringify(next) });
      await reload();
    },
    [hiddenKeys, hiddenSet, setMut, reload],
  );

  return { hiddenKeys, isHidden, hideCard, showCard, loading, reload };
}
