// =============================================================================
// PartnerChips — chips compactos do(s) Parceiro(s) Chinês(es) Responsável(eis)
// para exibir no CABEÇALHO RECOLHIDO de um card de fornecedor.
//
// Lê a lista a partir de `fields.parceirosChineses` (via parsePartners) e
// renderiza um chip por parceiro, com ícone de pessoa. Não renderiza nada
// quando não há parceiros — para não poluir cards sem responsável definido.
// =============================================================================

import { UserRound } from "lucide-react";
import { parsePartners } from "./partners";

type Props = {
  fields: Record<string, string> | undefined | null;
  /** Cor de destaque do chip (acento do dashboard). Default: violeta. */
  accent?: string;
  /** Limita a quantidade de chips exibidos (excedente vira "+N"). Default: 4. */
  max?: number;
};

export function PartnerChips({ fields, accent = "#8b5cf6", max = 4 }: Props) {
  const partners = parsePartners(fields);
  if (partners.length === 0) return null;

  const shown = partners.slice(0, max);
  const extra = partners.length - shown.length;

  return (
    <>
      {shown.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            color: accent,
            background: `${accent}1f`,
            border: `1px solid ${accent}66`,
          }}
          title={`Parceiro chinês responsável: ${name}`}
        >
          <UserRound className="w-3 h-3" />
          <span className="truncate max-w-[120px]">{name}</span>
        </span>
      ))}
      {extra > 0 && (
        <span
          className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            color: accent,
            background: `${accent}14`,
            border: `1px solid ${accent}44`,
          }}
          title={`Mais ${extra} parceiro(s): ${partners.slice(max).join(", ")}`}
        >
          +{extra}
        </span>
      )}
    </>
  );
}

export default PartnerChips;
