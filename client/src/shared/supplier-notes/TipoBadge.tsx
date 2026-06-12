// =============================================================================
// TipoBadge — selo (chip) do tipo do fornecedor: Fabricante Direto x Trader.
// Exibido no cabeçalho do card RECOLHIDO de cada dashboard, para que o usuário
// veja de relance se o fornecedor é fabricante direto ou trader/intermediário,
// sem precisar expandir o card.
//
// Lê o valor de `fields.tipoFornecedor` ("direto" | "trader"). Só renderiza
// algo quando houver um tipo marcado.
// =============================================================================
import { TIPO_CONFIG, type TipoFornecedor } from "./useSupplierNotes";

interface Props {
  /** Conjunto de campos da anotação do fornecedor (entry.fields). */
  fields?: Record<string, string> | null;
  /** Valor direto do tipo, alternativa a `fields`. */
  tipo?: TipoFornecedor | null;
}

/**
 * Renderiza o selo do tipo do fornecedor. Use dentro do cabeçalho do card
 * recolhido, ao lado dos selos de status/grupos. Não renderiza nada se não
 * houver tipo marcado.
 */
export function TipoBadge({ fields, tipo }: Props) {
  const value = (tipo ?? (fields?.tipoFornecedor as TipoFornecedor | undefined)) ?? undefined;
  if (value !== "direto" && value !== "trader") return null;

  const cfg = TIPO_CONFIG[value];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
      title={cfg.label}
    >
      <span className="leading-none">{cfg.emoji}</span>
      <span>{cfg.shortLabel}</span>
    </span>
  );
}

export default TipoBadge;
