// =============================================================================
// StatusLivreBadge — selo (chip) do status LIVRE escrito pelo operador.
// É um texto arbitrário que o usuário digita no painel do fornecedor
// (fields.statusLivre). Exibido no cabeçalho do card RECOLHIDO para que o
// status definido pelo operador apareça de relance.
//
// Só renderiza algo quando houver texto. Trunca visualmente textos longos.
// =============================================================================
interface Props {
  /** Conjunto de campos da anotação do fornecedor (entry.fields). */
  fields?: Record<string, string> | null;
  /** Valor direto, alternativa a `fields`. */
  statusLivre?: string | null;
}

export function StatusLivreBadge({ fields, statusLivre }: Props) {
  const raw = (statusLivre ?? fields?.statusLivre ?? "").trim();
  if (!raw) return null;

  return (
    <span
      className="inline-flex items-center gap-1 max-w-[180px] text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        color: "#3730a3",
        background: "#eef2ff",
        border: "1px solid #c7d2fe",
      }}
      title={raw}
    >
      <span className="leading-none">📝</span>
      <span className="truncate">{raw}</span>
    </span>
  );
}

export default StatusLivreBadge;
