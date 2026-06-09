// =============================================================================
// GroupBadges — selos (chips) dos grupos aos quais um fornecedor pertence.
// Exibidos no cabeçalho do card RECOLHIDO de cada dashboard, para que o usuário
// veja de relance a que grupos o fornecedor foi classificado (ex.: "Tapete
// Higiênico Pet"), sem precisar expandir o card.
//
// Lê as DUAS fontes de grupos (compartilhados fixos + personalizados) e resolve
// cada id de `groupIds` para { number, name, color }. Só renderiza algo quando
// houver ao menos um grupo válido.
// =============================================================================
import { useMemo } from "react";
import { useSupplierGroups } from "./useSupplierGroups";
import { useCustomGroups } from "./useCustomGroups";

interface GroupInfo {
  number: number;
  name: string;
  color: string;
  isCustom: boolean;
}

/**
 * Hook que devolve um Map id -> info do grupo, unindo grupos compartilhados
 * (Nº 01/02 + criados no GroupPicker) e personalizados (4ª aba / promovidos).
 * Reaproveitado por qualquer dashboard que precise resolver `groupIds`.
 */
export function useGroupInfoById() {
  const { groups: sharedGroups } = useSupplierGroups();
  const { groups: customGroups } = useCustomGroups();
  return useMemo(() => {
    const map = new Map<string, GroupInfo>();
    sharedGroups.forEach((g) =>
      map.set(g.id, { number: g.number, name: g.name, color: g.color, isCustom: false }),
    );
    customGroups.forEach((g) =>
      map.set(g.id, { number: g.number, name: g.name, color: g.color, isCustom: true }),
    );
    return map;
  }, [sharedGroups, customGroups]);
}

interface Props {
  /** IDs de grupos marcados no fornecedor (entry.groupIds). */
  groupIds?: string[] | null;
  /** Limita o comprimento máximo do nome exibido no chip. */
  maxNameWidth?: number;
}

/**
 * Renderiza os selos dos grupos do fornecedor. Use dentro do cabeçalho do card
 * recolhido, ao lado do selo de status. Não renderiza nada se não houver grupos.
 */
export function GroupBadges({ groupIds, maxNameWidth = 140 }: Props) {
  const groupInfoById = useGroupInfoById();
  const items = useMemo(
    () =>
      (groupIds ?? [])
        .map((gid) => ({ gid, info: groupInfoById.get(gid) }))
        .filter((x): x is { gid: string; info: GroupInfo } => Boolean(x.info)),
    [groupIds, groupInfoById],
  );

  if (items.length === 0) return null;

  return (
    <>
      {items.map(({ gid, info }) => (
        <span
          key={gid}
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            color: info.color,
            background: `${info.color}1f`,
            border: `1px solid ${info.color}66`,
          }}
          title={`${info.name}${info.isCustom ? " (grupo personalizado)" : ""}`}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: info.color }}
          />
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Nº {String(info.number).padStart(2, "0")}
          </span>
          <span className="truncate" style={{ maxWidth: maxNameWidth }}>
            {info.name}
          </span>
        </span>
      ))}
    </>
  );
}

export default GroupBadges;
