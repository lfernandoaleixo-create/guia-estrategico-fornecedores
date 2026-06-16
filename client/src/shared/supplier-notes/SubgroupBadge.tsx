// =============================================================================
// SubgroupBadge — selo (chip) do SUBGRUPO (modelo macro.sub) ao qual um
// fornecedor pertence. Exibido no cabeçalho do card RECOLHIDO de cada dashboard,
// para que o número hierárquico (ex.: "2.1") apareça de relance, sem expandir.
//
// Lê o subgrupo vinculado a partir de `fields.subgroupId` e resolve número+nome
// via useSubgroups. Funciona em QUALQUER dashboard/macro (não só Aquário). Só
// renderiza algo quando houver um subgrupo válido.
//
// O selo também mostra um ÍCONE automático derivado do nome do subgrupo
// (ex.: "Terrário" → 🦎, "Aquário" → 🐟), reaproveitando a identidade visual
// dos antigos selos de especialidade.
// =============================================================================
import { useSubgroups } from "./useSubgroups";
import { formatSubgroupNumber } from "./subgroupNumber";
import { subgroupEmoji } from "./subgroupEmoji";

interface Props {
  /** Campos da anotação do fornecedor (entry.fields). Lê fields.subgroupId. */
  fields?: Record<string, unknown> | null;
  /** Limita o comprimento máximo do nome exibido no chip. */
  maxNameWidth?: number;
}

/**
 * Renderiza o selo do subgrupo do fornecedor (ex.: "🦎 2.1 · Terrário"). Use
 * dentro do cabeçalho do card recolhido, ao lado do selo de status. Não renderiza
 * nada se o fornecedor não tiver subgrupo vinculado ou se o subgrupo não existir.
 */
export function SubgroupBadge({ fields, maxNameWidth = 160 }: Props) {
  const { byId } = useSubgroups();
  const subgroupId = (fields?.subgroupId as string | undefined) ?? "";
  const sg = subgroupId ? byId.get(subgroupId) : undefined;
  if (!sg) return null;

  const num = formatSubgroupNumber(sg.macroNumber, sg.sub);
  const emoji = subgroupEmoji(sg.name);

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        color: "#fff",
        background: sg.color,
        border: `1px solid ${sg.color}`,
      }}
      title={`Subgrupo ${num} - ${sg.name}`}
    >
      {emoji && <span aria-hidden>{emoji}</span>}
      <span className="font-extrabold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {num}
      </span>
      <span className="truncate" style={{ maxWidth: maxNameWidth }}>
        · {sg.name}
      </span>
    </span>
  );
}

export default SubgroupBadge;
