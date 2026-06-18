// =============================================================================
// useNegotiationLevel3 — resolve, para um ACESSO do painel "Resumo das
// Negociações", a lista de fornecedores "ticados" (com potencial, preço OU
// status livre) já enriquecida com nome, endereço e resumo.
//
// O acesso (MacroAccess) carrega `source` + `refId` (+ subtipo/subgroupId), que
// determinam a FONTE de fornecedores e o SCOPE das notas:
//   - "aquario-subtipo"  → custom suppliers scope "aquario", notas scope "aquario",
//                          filtra por fields.subtipoAquario === subtipo.
//   - "aquario-subgroup" → idem, filtra por fields.subgroupId === subgroupId.
//   - "dashboard"        → custom suppliers scope = refId (tapete/yiwu/aquario),
//                          notas scope = refId.
//   - "group"            → ExtraSuppliers com groupId === refId, notas scope
//                          "grupo-<refId>".
//
// Camada puramente ADITIVA e somente leitura — não altera nada.
// =============================================================================
import { useMemo } from "react";
import { useCustomSuppliers, type SupplierScope } from "./useCustomSuppliers";
import { useExtraSuppliers } from "./useExtraSuppliers";
import { useSupplierNotes } from "./useSupplierNotes";
import {
  buildNegotiationSuppliers,
  type MacroAccess,
  type NegotiationSupplier,
  type NegotiationSupplierInput,
} from "./negotiationAccesses";

/**
 * Hook único e estável (sempre chama os mesmos hooks na mesma ordem). Carrega
 * todas as fontes e seleciona a relevante conforme o acesso. Como os hooks de
 * dados fazem polling/cache, o custo de carregar as 4 fontes é baixo e evita
 * problemas de "hooks condicionais".
 */
export function useNegotiationLevel3(access: MacroAccess | null): {
  suppliers: NegotiationSupplier[];
  loading: boolean;
} {
  // Custom suppliers dos 3 scopes fixos.
  const aquario = useCustomSuppliers("aquario");
  const tapete = useCustomSuppliers("tapete");
  const yiwu = useCustomSuppliers("yiwu");
  // Extra suppliers (grupos personalizados).
  const extra = useExtraSuppliers();

  // Notas: o scope depende do acesso. Para manter a ordem dos hooks estável,
  // resolvemos o scope das notas a partir do acesso (string única).
  const notesScope = useMemo(() => {
    if (!access) return "aquario";
    if (access.source === "group") return `grupo-${access.refId}`;
    if (access.source === "dashboard") return access.refId;
    // subtipo/subgroup → scope aquário
    return "aquario";
  }, [access]);

  const notes = useSupplierNotes(notesScope as never);

  const suppliers = useMemo<NegotiationSupplier[]>(() => {
    if (!access) return [];

    // 1) Seleciona a lista-base de fornecedores conforme a fonte.
    let base: NegotiationSupplierInput[] = [];

    if (access.source === "group") {
      base = extra.list
        .filter((s) => s.groupId === access.refId)
        .map((s) => ({
          id: s.id,
          name: s.name,
          city: s.city ?? null,
          province: s.province ?? null,
          address: s.address ?? null,
        }));
    } else {
      // aquario-subtipo, aquario-subgroup, dashboard → custom suppliers
      const scope: SupplierScope =
        access.source === "dashboard"
          ? (access.refId as SupplierScope)
          : "aquario";
      const src =
        scope === "aquario"
          ? aquario.list
          : scope === "tapete"
            ? tapete.list
            : yiwu.list;

      base = src.map((s) => ({
        id: s.id,
        name: s.name,
        city: s.city ?? null,
        province: s.province ?? null,
        address: s.address ?? null,
      }));

      // Filtro adicional por subtipo/subgrupo (vínculo gravado na NOTA).
      if (access.source === "aquario-subtipo" && access.subtipo) {
        base = base.filter(
          (s) =>
            (notes.entries[s.id]?.fields?.subtipoAquario ?? "") ===
            access.subtipo,
        );
      } else if (access.source === "aquario-subgroup" && access.subgroupId) {
        base = base.filter(
          (s) =>
            (notes.entries[s.id]?.fields?.subgroupId ?? "") ===
            access.subgroupId,
        );
      }
    }

    // 2) Mantém só os "ticados" e enriquece com selos + resumo.
    return buildNegotiationSuppliers(base, notes.entries);
  }, [access, extra.list, aquario.list, tapete.list, yiwu.list, notes.entries]);

  const loading =
    !aquario.loaded ||
    !tapete.loaded ||
    !yiwu.loaded ||
    !extra.loaded ||
    !notes.loaded;

  return { suppliers, loading };
}
