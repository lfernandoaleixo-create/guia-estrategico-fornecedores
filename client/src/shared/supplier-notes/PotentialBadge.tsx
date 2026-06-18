// =============================================================================
// PotentialBadge — selo (chip) do potencial do fornecedor: Alto (verde),
// Médio (laranja) ou Baixo (vermelho). Exibido no cabeçalho do card RECOLHIDO
// de cada dashboard, para que o usuário veja de relance o potencial do
// fornecedor sem precisar expandir o card.
//
// Lê o valor de `fields.potencial` ("alto" | "medio" | "baixo"). Só renderiza
// algo quando houver um potencial marcado.
// =============================================================================
import { POTENCIAL_CONFIG, type Potencial } from "./useSupplierNotes";

interface Props {
  /** Conjunto de campos da anotação do fornecedor (entry.fields). */
  fields?: Record<string, string> | null;
  /** Valor direto do potencial, alternativa a `fields`. */
  potencial?: Potencial | null;
}

/**
 * Renderiza o selo de potencial do fornecedor. Use dentro do cabeçalho do card
 * recolhido, ao lado dos selos de status/tipo/grupos. Não renderiza nada se não
 * houver potencial marcado.
 */
export function PotentialBadge({ fields, potencial }: Props) {
  const value = (potencial ?? (fields?.potencial as Potencial | undefined)) ?? undefined;
  if (!value || !(value in POTENCIAL_CONFIG)) return null;

  const cfg = POTENCIAL_CONFIG[value];
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

export default PotentialBadge;
