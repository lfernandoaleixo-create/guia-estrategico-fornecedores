// =============================================================================
// useSubtipoHierLabel — descobre o prefixo hierárquico (ex.: "1.1") de cada
// especialidade (Terrário/Aquário) a partir dos macros configurados na Home.
//
// A numeração NÃO é fixa: depende de qual macro contém os subitens do Aquário
// (keys "subgroup:aquario:terrario" / "subgroup:aquario:aquario") e da ordem
// definida pelo usuário. Quando o subitem não está em macro algum, o prefixo
// fica vazio e o rótulo exibe apenas "Terrário" / "Aquário".
//
// Camada puramente de EXIBIÇÃO — não altera nenhum dado salvo do fornecedor.
// =============================================================================
import { useMemo } from "react";
import { useMacros } from "./useMacros";
import type { SubtipoAquario } from "./useSupplierNotes";

const KEY_BY_SUBTIPO: Record<SubtipoAquario, string> = {
  terrario: "subgroup:aquario:terrario",
  aquario: "subgroup:aquario:aquario",
};

export interface SubtipoHier {
  /** Prefixo hierárquico atual (ex.: "1.1") ou "" se não estiver em macro. */
  prefix: string;
  /** Rótulo curto com prefixo: "1.1 - Terrário" ou só "Terrário". */
  withPrefix: (label: string) => string;
}

export function useSubtipoHierLabel(): Record<SubtipoAquario, SubtipoHier> {
  const { macros } = useMacros();

  return useMemo(() => {
    const build = (subtipo: SubtipoAquario): SubtipoHier => {
      const key = KEY_BY_SUBTIPO[subtipo];
      let prefix = "";
      for (const m of macros) {
        const idx = m.items.findIndex((it) => it.key === key);
        if (idx >= 0) {
          prefix = `${m.number}.${idx + 1}`;
          break;
        }
      }
      return {
        prefix,
        withPrefix: (label: string) => (prefix ? `${prefix} - ${label}` : label),
      };
    };
    return {
      terrario: build("terrario"),
      aquario: build("aquario"),
    };
  }, [macros]);
}
