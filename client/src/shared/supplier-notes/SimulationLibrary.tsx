// =============================================================================
// SimulationLibrary — overlay com a biblioteca de simulações salvas no sistema.
// Permite buscar (por nome/NCM), abrir (reabre na calculadora) e excluir.
// =============================================================================
import { useMemo, useState } from "react";
import { X, Search, FolderOpen, Trash2, Loader2, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { useImportSimulations, type SavedSimulation } from "./useImportSimulations";
import type { CalcSnapshot } from "./calcReport";

export interface SimulationLibraryProps {
  open: boolean;
  onClose: () => void;
  /** Chamado quando o usuário abre uma simulação salva (reabre na calculadora). */
  onOpen: (snap: CalcSnapshot, id: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
        " · " +
        d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function SimulationLibrary({ open, onClose, onOpen }: SimulationLibraryProps) {
  const { simulations, isLoading, remove, isDeleting, openSnapshot } = useImportSimulations();
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [openErro, setOpenErro] = useState<string | null>(null);

  const filtered = useMemo<SavedSimulation[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return simulations;
    const qd = q.replace(/\D/g, "");
    return simulations.filter((s) => {
      const byName = s.name.toLowerCase().includes(q);
      const byNcm = qd.length > 0 && s.ncm.replace(/\D/g, "").includes(qd);
      return byName || byNcm;
    });
  }, [simulations, query]);

  if (!open) return null;

  const handleOpen = (row: SavedSimulation) => {
    const snap = openSnapshot(row);
    if (!snap) {
      setOpenErro("Não foi possível abrir esta simulação (registro corrompido).");
      return;
    }
    onOpen(snap, row.id);
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Biblioteca de simulações salvas"
    >
      <div
        className="absolute inset-0"
        style={{ background: "oklch(0.08 0.02 250 / 0.78)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "oklch(0.13 0.02 255)",
          border: "1px solid oklch(0.28 0.04 260)",
          boxShadow: "0 30px 80px oklch(0 0 0 / 0.55)",
          animation: "lib-pop 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <style>{`@keyframes lib-pop { from { opacity: 0; transform: scale(0.97) translateY(8px);} to { opacity: 1; transform: scale(1) translateY(0);} }`}</style>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b shrink-0" style={{ borderColor: "oklch(0.24 0.03 258)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
              style={{ background: "oklch(0.78 0.16 75 / 0.16)", border: "1px solid oklch(0.78 0.16 75 / 0.4)" }}
            >
              <FileSpreadsheet className="w-5 h-5" style={{ color: "oklch(0.82 0.14 75)" }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate" style={{ color: "oklch(0.96 0.02 80)", fontFamily: "'Fraunces', serif" }}>
                Simulações salvas
              </h2>
              <p className="text-xs truncate" style={{ color: "oklch(0.6 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                {simulations.length} {simulations.length === 1 ? "cálculo salvo" : "cálculos salvos"} · busque e reabra
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm transition-transform active:scale-95"
            style={{ background: "oklch(0.18 0.02 258)", border: "1px solid oklch(0.3 0.04 260)", color: "oklch(0.85 0.02 80)", fontFamily: "'Inter', sans-serif" }}
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Fechar</span>
          </button>
        </div>

        {/* Busca */}
        <div className="px-5 py-3 border-b shrink-0" style={{ borderColor: "oklch(0.24 0.03 258)" }}>
          <div className="flex items-center rounded-lg overflow-hidden" style={{ background: "oklch(0.1 0.018 255)", border: "1px solid oklch(0.28 0.04 260)" }}>
            <Search className="w-4 h-4 ml-3 shrink-0" style={{ color: "oklch(0.6 0.02 80)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome do produto ou NCM"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none w-full"
              style={{ color: "oklch(0.95 0.02 80)", fontFamily: "'Inter', sans-serif" }}
            />
          </div>
        </div>

        {openErro && (
          <div className="flex items-center gap-2 px-5 py-2.5 border-b shrink-0" style={{ background: "oklch(0.45 0.16 25 / 0.18)", borderColor: "oklch(0.55 0.18 25 / 0.45)" }}>
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "oklch(0.78 0.16 35)" }} />
            <span className="text-sm" style={{ color: "oklch(0.85 0.1 35)", fontFamily: "'Inter', sans-serif" }}>{openErro}</span>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12" style={{ color: "oklch(0.6 0.02 80)" }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span style={{ fontFamily: "'Inter', sans-serif" }}>Carregando...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <FolderOpen className="w-8 h-8" style={{ color: "oklch(0.45 0.02 80)" }} />
              <p className="text-sm" style={{ color: "oklch(0.6 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                {simulations.length === 0
                  ? "Nenhuma simulação salva ainda. Salve um cálculo na calculadora para vê-lo aqui."
                  : "Nenhuma simulação encontrada para essa busca."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl p-3.5 flex items-center justify-between gap-3"
                  style={{ background: "oklch(0.1 0.018 255)", border: "1px solid oklch(0.26 0.035 260)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate" style={{ color: "oklch(0.94 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                      {s.name || "Sem nome"}
                    </div>
                    <div className="text-[0.72rem] mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5" style={{ color: "oklch(0.58 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                      {s.ncm ? <span>NCM {s.ncm}</span> : null}
                      <span>Unit. {s.custoUnitarioBRL}</span>
                      <span>Total {s.custoTotalBRL}</span>
                    </div>
                    <div className="text-[0.68rem] mt-0.5" style={{ color: "oklch(0.48 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                      Salvo em {formatDate(s.updatedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpen(s)}
                      className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold transition-transform active:scale-95"
                      style={{ background: "oklch(0.78 0.16 75)", color: "oklch(0.16 0.03 60)", fontFamily: "'Inter', sans-serif" }}
                      title="Abrir esta simulação na calculadora"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span className="hidden sm:inline">Abrir</span>
                    </button>
                    {confirmDelete === s.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={async () => {
                            await remove(s.id);
                            setConfirmDelete(null);
                          }}
                          disabled={isDeleting}
                          className="px-2.5 h-9 rounded-lg text-xs font-semibold transition-transform active:scale-95"
                          style={{ background: "oklch(0.45 0.16 25 / 0.3)", border: "1px solid oklch(0.55 0.18 25 / 0.5)", color: "oklch(0.85 0.12 30)", fontFamily: "'Inter', sans-serif" }}
                          title="Confirmar exclusão"
                        >
                          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Excluir"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2.5 h-9 rounded-lg text-xs transition-transform active:scale-95"
                          style={{ background: "oklch(0.2 0.02 258)", border: "1px solid oklch(0.32 0.04 260)", color: "oklch(0.85 0.02 80)", fontFamily: "'Inter', sans-serif" }}
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(s.id)}
                        className="flex items-center justify-center w-9 h-9 rounded-lg transition-transform active:scale-95"
                        style={{ background: "oklch(0.18 0.02 258)", border: "1px solid oklch(0.3 0.04 260)", color: "oklch(0.7 0.08 30)" }}
                        title="Excluir esta simulação"
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
