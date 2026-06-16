// =============================================================================
// useCardColors — overrides de cor (hex) para cards de ACESSO FIXOS na Home.
//
// Subgrupos e grupos promovidos já têm cor própria persistida (updateSubgroup /
// updateGroup). Os cards de acesso fixos (Terrário, Aquário, Tapete, Yiwu) têm
// cores constantes no código; para permitir personalização, guardamos um mapa
// key->corHex na chave de settings "cardColors" (JSON), seguindo o mesmo padrão
// do useHiddenCards. Camada puramente visual: nenhum dado de fornecedor muda.
// =============================================================================
import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";

const SETTING_KEY = "cardColors";

export function parseCardColors(
  raw: string | null | undefined,
): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof k === "string" && typeof v === "string") out[k] = v;
      }
      return out;
    }
  } catch {
    // valor corrompido → trata como vazio
  }
  return {};
}

export function useCardColors() {
  const utils = trpc.useUtils();
  const query = trpc.data.settings.get.useQuery(
    { key: SETTING_KEY },
    { refetchInterval: 5000, refetchOnWindowFocus: true },
  );
  const setMut = trpc.data.settings.set.useMutation();

  const colors = useMemo<Record<string, string>>(
    () => parseCardColors(query.data?.value),
    [query.data?.value],
  );

  const loading = query.isLoading;

  const reload = useCallback(async () => {
    await utils.data.settings.get.invalidate({ key: SETTING_KEY });
  }, [utils]);

  /** Retorna a cor override de um card (ou undefined se não houver). */
  const colorFor = useCallback(
    (key: string): string | undefined => colors[key],
    [colors],
  );

  /** Define a cor override de um card fixo. */
  const setColor = useCallback(
    async (key: string, color: string) => {
      const next = { ...colors, [key]: color };
      await setMut.mutateAsync({ key: SETTING_KEY, value: JSON.stringify(next) });
      await reload();
    },
    [colors, setMut, reload],
  );

  /** Remove o override (volta à cor padrão do card). */
  const resetColor = useCallback(
    async (key: string) => {
      if (!(key in colors)) return;
      const next = { ...colors };
      delete next[key];
      await setMut.mutateAsync({ key: SETTING_KEY, value: JSON.stringify(next) });
      await reload();
    },
    [colors, setMut, reload],
  );

  return { colors, colorFor, setColor, resetColor, loading, reload };
}
