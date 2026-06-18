// =============================================================================
// PrecoBadge — selo (chip) da classificação de preço do fornecedor:
// Ótimo (verde), Bom (azul) ou Ruim (vermelho). Exibido no cabeçalho do card
// RECOLHIDO de cada dashboard, para ver de relance o preço sem expandir o card.
//
// Lê o valor de `fields.precoClassificacao` ("excelente" | "bom" | "ruim").
// Só renderiza algo quando houver uma classificação marcada.
// =============================================================================
import { PRECO_CONFIG, type PrecoClassificacao } from "./useSupplierNotes";

interface Props {
  /** Conjunto de campos da anotação do fornecedor (entry.fields). */
  fields?: Record<string, string> | null;
  /** Valor direto da classificação, alternativa a `fields`. */
  preco?: PrecoClassificacao | null;
}

export function PrecoBadge({ fields, preco }: Props) {
  const value =
    (preco ?? (fields?.precoClassificacao as PrecoClassificacao | undefined)) ?? undefined;
  if (!value || !(value in PRECO_CONFIG)) return null;

  const cfg = PRECO_CONFIG[value];
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
      <span>{cfg.label}</span>
    </span>
  );
}

export default PrecoBadge;
