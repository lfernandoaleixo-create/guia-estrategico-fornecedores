// =============================================================================
// NegotiationSummaryPanel — painel amplo (overlay) de VISÃO EXECUTIVA, só leitura.
//
// Pensado para gestores "baterem o olho": NÃO cadastra, NÃO edita, NÃO mostra
// diário/anotações operacionais. É uma camada puramente ADITIVA que lê os macros
// (useMacros) e os subgrupos (useSubgroups) já existentes.
//
// Navegação em níveis dentro do MESMO painel:
//   - Nível 1: lista compacta de MACROS (número · nome).
//   - Nível 2: ao clicar num macro, mostra os ACESSOS dele (dashboards/
//      subgrupos/grupos de macro.items + subgrupos numerados da tabela).
//   - (Níveis seguintes — fornecedores/resumo — serão adicionados conforme
//      instruções do Fernando.)
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  FolderTree,
  Layers,
  LayoutDashboard,
  FolderOpen,
  Boxes,
  X,
} from "lucide-react";
import { useMacros, type Macro, type MacroItem } from "./useMacros";
import { useSubgroups } from "./useSubgroups";
import { buildAccesses, type MacroAccess } from "./negotiationAccesses";

function AccessKindIcon({
  kind,
  color,
}: {
  kind: MacroItem["kind"];
  color: string;
}) {
  const cls = "w-4 h-4";
  if (kind === "dashboard")
    return <LayoutDashboard className={cls} style={{ color }} />;
  if (kind === "group")
    return <FolderOpen className={cls} style={{ color }} />;
  return <Boxes className={cls} style={{ color }} />;
}

interface NegotiationSummaryPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NegotiationSummaryPanel({
  open,
  onClose,
}: NegotiationSummaryPanelProps) {
  const { macros, loading: macrosLoading } = useMacros();
  const { byMacro, loading: subgroupsLoading } = useSubgroups();

  // Macro selecionado (nível 2). null = nível 1 (lista de macros).
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);

  // Fecha com ESC e trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedMacroId) setSelectedMacroId(null);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, selectedMacroId]);

  // Ao reabrir o painel, sempre começa no nível 1.
  useEffect(() => {
    if (open) setSelectedMacroId(null);
  }, [open]);

  const selectedMacro = useMemo<Macro | null>(
    () => macros.find((m) => m.id === selectedMacroId) ?? null,
    [macros, selectedMacroId],
  );

  const accessesOfSelected = useMemo(
    () =>
      selectedMacro
        ? buildAccesses(selectedMacro, byMacro(selectedMacro.number))
        : [],
    [selectedMacro, byMacro],
  );

  if (!open) return null;

  const loading = macrosLoading || subgroupsLoading;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Resumo das Negociações"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: "oklch(0.08 0.02 250 / 0.78)",
          backdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      />

      {/* Card amplo */}
      <div
        className="relative w-full max-w-5xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "oklch(0.13 0.02 255)",
          border: "1px solid oklch(0.28 0.04 260)",
          boxShadow:
            "0 30px 80px oklch(0 0 0 / 0.55), 0 0 0 1px oklch(0.78 0.16 75 / 0.12)",
          animation: "nsp-pop 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <style>{`
          @keyframes nsp-pop {
            from { opacity: 0; transform: scale(0.97) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Cabeçalho */}
        <div
          className="flex items-center justify-between gap-4 px-6 py-5 border-b shrink-0"
          style={{ borderColor: "oklch(0.24 0.03 258)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {selectedMacro ? (
              <button
                onClick={() => setSelectedMacroId(null)}
                className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-transform active:scale-95"
                style={{
                  background: "oklch(0.18 0.02 258)",
                  border: "1px solid oklch(0.3 0.04 260)",
                  color: "oklch(0.85 0.02 80)",
                }}
                aria-label="Voltar para a lista de macros"
                title="Voltar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.55 0.18 25))",
                  color: "oklch(0.10 0.02 250)",
                }}
              >
                <Layers className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h2
                className="text-lg font-semibold truncate"
                style={{
                  fontFamily: "'Fraunces', serif",
                  color: "oklch(0.97 0.01 80)",
                }}
              >
                {selectedMacro
                  ? `${selectedMacro.number} · ${selectedMacro.name}`
                  : "Resumo das Negociações"}
              </h2>
              <p
                className="text-[11px] tracking-[0.18em] uppercase truncate"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "oklch(0.6 0.02 80)",
                }}
              >
                {selectedMacro
                  ? "Acessos deste macro"
                  : "Visão executiva · somente leitura"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-transform active:scale-95"
            style={{
              background: "oklch(0.18 0.02 258)",
              border: "1px solid oklch(0.3 0.04 260)",
              color: "oklch(0.8 0.02 80)",
            }}
            aria-label="Fechar"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div
              className="text-sm py-12 text-center"
              style={{ color: "oklch(0.6 0.02 80)" }}
            >
              Carregando…
            </div>
          ) : !selectedMacro ? (
            <MacroList
              macros={macros}
              accessCount={(m) => buildAccesses(m, byMacro(m.number)).length}
              onSelect={setSelectedMacroId}
            />
          ) : (
            <AccessList accesses={accessesOfSelected} />
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Nível 1 — lista compacta de macros
// -----------------------------------------------------------------------------
function MacroList({
  macros,
  accessCount,
  onSelect,
}: {
  macros: Macro[];
  accessCount: (macro: Macro) => number;
  onSelect: (id: string) => void;
}) {
  if (macros.length === 0) {
    return (
      <div
        className="text-sm py-12 text-center"
        style={{ color: "oklch(0.6 0.02 80)" }}
      >
        Nenhum macro criado ainda.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {macros.map((m) => {
        const count = accessCount(m);
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.99]"
            style={{
              background: "oklch(0.16 0.02 258)",
              border: "1px solid oklch(0.26 0.03 260)",
            }}
          >
            <span
              className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 font-bold text-sm"
              style={{
                background: `${m.color}22`,
                border: `1px solid ${m.color}66`,
                color: m.color,
                fontFamily: "'Fraunces', serif",
              }}
            >
              {m.number}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block text-sm font-semibold truncate"
                style={{ color: "oklch(0.96 0.01 80)" }}
              >
                {m.name}
              </span>
              <span
                className="block text-[11px] tracking-[0.12em] uppercase"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "oklch(0.58 0.02 80)",
                }}
              >
                {count} {count === 1 ? "acesso" : "acessos"}
              </span>
            </span>
            <FolderTree
              className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5"
              style={{ color: "oklch(0.5 0.02 80)" }}
            />
          </button>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Nível 2 — acessos do macro selecionado (macro.items + subgrupos numerados)
// -----------------------------------------------------------------------------
function AccessList({ accesses }: { accesses: MacroAccess[] }) {
  if (accesses.length === 0) {
    return (
      <div
        className="text-sm py-12 text-center"
        style={{ color: "oklch(0.6 0.02 80)" }}
      >
        Este macro ainda não tem acessos.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {accesses.map((ac) => (
        <div
          key={ac.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "oklch(0.16 0.02 258)",
            border: "1px solid oklch(0.26 0.03 260)",
          }}
        >
          {ac.iconUrl ? (
            <span
              className="flex items-center justify-center h-9 w-9 min-w-[2.25rem] rounded-lg shrink-0 overflow-hidden"
              style={{
                background: `${ac.color}1a`,
                border: `1px solid ${ac.color}55`,
              }}
            >
              <img
                src={ac.iconUrl}
                alt={ac.label}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </span>
          ) : (
            <span
              className="flex items-center justify-center px-2.5 h-8 min-w-[2.5rem] rounded-lg shrink-0 font-bold text-sm"
              style={{
                background: `${ac.color}22`,
                border: `1px solid ${ac.color}66`,
                color: ac.color,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {ac.badge ?? <AccessKindIcon kind={ac.kind} color={ac.color} />}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span
              className="block text-sm font-semibold truncate"
              style={{ color: "oklch(0.96 0.01 80)" }}
            >
              {ac.label}
            </span>
            {ac.subtitle ? (
              <span
                className="block text-xs truncate"
                style={{ color: "oklch(0.62 0.02 80)" }}
              >
                {ac.subtitle}
              </span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
