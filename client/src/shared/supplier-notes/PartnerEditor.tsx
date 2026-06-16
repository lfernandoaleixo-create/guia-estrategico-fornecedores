// =============================================================================
// PartnerEditor — editor de "Parceiro Chinês Responsável" (multi-nomes)
//
// Mostra os parceiros já cadastrados como cardzinhos removíveis e um input para
// adicionar novos. Suporta vários parceiros por fornecedor. As alterações são
// devolvidas ao componente pai via onChange (que persiste em fields).
// =============================================================================

import { useState } from "react";
import { UserCheck, X, Plus } from "lucide-react";
import { dedupePartners, normalizePartner } from "./partners";

interface PartnerEditorProps {
  /** Lista atual de nomes de parceiros. */
  value: string[];
  /** Chamado com a nova lista ao adicionar/remover. */
  onChange: (next: string[]) => void;
  /** Cor de acento do dashboard (chips e foco). */
  accent?: string;
  /** Sugestões opcionais (nomes já usados em outros fornecedores). */
  suggestions?: string[];
  /** Quando true, envolve o editor num cartão de destaque (uso no topo do painel). */
  highlighted?: boolean;
}

export function PartnerEditor({
  value,
  onChange,
  accent = "#16a34a",
  suggestions = [],
  highlighted = false,
}: PartnerEditorProps) {
  const [draft, setDraft] = useState("");

  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = dedupePartners([...value, trimmed]);
    onChange(next);
    setDraft("");
  };

  const remove = (name: string) => {
    const key = normalizePartner(name);
    onChange(value.filter((p) => normalizePartner(p) !== key));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter ou vírgula confirmam o nome.
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    }
  };

  // Sugestões ainda não escolhidas e que casam com o que está sendo digitado.
  const chosen = new Set(value.map(normalizePartner));
  const draftKey = normalizePartner(draft);
  const filteredSuggestions = dedupePartners(suggestions)
    .filter((s) => !chosen.has(normalizePartner(s)))
    .filter((s) => (draftKey ? normalizePartner(s).includes(draftKey) : true))
    .slice(0, 6);

  return (
    <div
      className={highlighted ? "mb-5 rounded-xl border-2 p-4" : "mb-4"}
      style={
        highlighted
          ? {
              borderColor: `${accent}66`,
              background: `linear-gradient(180deg, ${accent}12, ${accent}05)`,
              boxShadow: `0 0 0 3px ${accent}10`,
            }
          : undefined
      }
    >
      <label
        className={
          highlighted
            ? "text-[12px] font-extrabold tracking-[0.16em] uppercase block mb-2.5 flex items-center gap-2"
            : "text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500 block mb-2 flex items-center gap-1.5"
        }
        style={highlighted ? { color: accent } : undefined}
      >
        <UserCheck size={highlighted ? 16 : 13} style={{ color: accent }} />
        Parceiro Chinês Responsável
      </label>

      {/* Cardzinhos dos parceiros já cadastrados */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 rounded-full pl-3 pr-1.5 py-1 text-xs font-semibold border"
              style={{
                background: `${accent}14`,
                borderColor: `${accent}55`,
                color: accent,
              }}
            >
              {p}
              <button
                type="button"
                onClick={() => remove(p)}
                title={`Remover ${p}`}
                aria-label={`Remover ${p}`}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 transition-colors active:scale-[0.9]"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input para adicionar novo parceiro */}
      <div
        className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 transition-colors focus-within:border-zinc-400"
        style={{ borderColor: "#e4e4e7" }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreva o nome (ex.: Betty) e tecle Enter"
          className="flex-1 bg-transparent text-sm font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40 transition-all active:scale-[0.97]"
          style={{ background: accent }}
        >
          <Plus size={13} /> Adicionar
        </button>
      </div>

      {/* Sugestões com base nos nomes já usados */}
      {filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
            Sugestões:
          </span>
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 transition-colors active:scale-[0.97]"
            >
              <Plus size={10} /> {s}
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] text-zinc-500 mt-1.5">
        Você pode adicionar mais de um parceiro. Esses nomes alimentam o filtro
        por parceiro na página inicial.
      </p>
    </div>
  );
}

export default PartnerEditor;
