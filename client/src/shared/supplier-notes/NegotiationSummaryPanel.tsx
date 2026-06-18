// =============================================================================
// NegotiationSummaryPanel — painel amplo (overlay) de VISÃO EXECUTIVA, só leitura.
//
// Pensado para gestores "baterem o olho": NÃO cadastra, NÃO edita anotações
// operacionais. É uma camada puramente ADITIVA que lê macros (useMacros),
// subgrupos (useSubgroups), fornecedores e notas já existentes.
//
// Navegação em níveis dentro do MESMO painel:
//   - Nível 1: lista compacta de MACROS (número · nome).
//   - Nível 2: ACESSOS do macro (dashboards/subgrupos/grupos + subgrupos numerados).
//   - Nível 3: FORNECEDORES "ticados" do acesso (com potencial, preço OU status
//      livre). Mostra nome, potencial, preço, status livre, resumo (se houver) e
//      endereço clicável (abre mapa principal + satélite). Filtros combináveis.
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
  MapPin,
  FileText,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { useMacros, type Macro, type MacroItem } from "./useMacros";
import { useSubgroups } from "./useSubgroups";
import { buildAccesses, type MacroAccess } from "./negotiationAccesses";
import {
  applyNegotiationFilter,
  EMPTY_FILTER,
  type NegotiationFilter,
  type NegotiationSupplier,
} from "./negotiationAccesses";
import { useNegotiationLevel3 } from "./useNegotiationLevel3";
import {
  POTENCIAL_CONFIG,
  POTENCIAL_ORDER,
  PRECO_CONFIG,
  PRECO_ORDER,
  type Potencial,
  type PrecoClassificacao,
} from "./useSupplierNotes";
import SupplierMapDialog from "./SupplierMapDialog";

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

  // Macro selecionado (nível 2). null = nível 1.
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);
  // Acesso selecionado (nível 3). null = nível 2.
  const [selectedAccess, setSelectedAccess] = useState<MacroAccess | null>(
    null,
  );

  // Fecha com ESC respeitando a hierarquia de níveis; trava o scroll do body.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedAccess) setSelectedAccess(null);
        else if (selectedMacroId) setSelectedMacroId(null);
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
  }, [open, onClose, selectedMacroId, selectedAccess]);

  // Ao reabrir, sempre começa no nível 1.
  useEffect(() => {
    if (open) {
      setSelectedMacroId(null);
      setSelectedAccess(null);
    }
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

  // Título e subtítulo do cabeçalho conforme o nível.
  let headerTitle = "Resumo das Negociações";
  let headerSubtitle = "Visão executiva · somente leitura";
  if (selectedAccess) {
    headerTitle = selectedAccess.label;
    headerSubtitle = "Fornecedores avaliados";
  } else if (selectedMacro) {
    headerTitle = `${selectedMacro.number} · ${selectedMacro.name}`;
    headerSubtitle = "Acessos deste macro";
  }

  const goBack = () => {
    if (selectedAccess) setSelectedAccess(null);
    else if (selectedMacroId) setSelectedMacroId(null);
  };
  const showBack = Boolean(selectedMacro || selectedAccess);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Resumo das Negociações"
    >
      <div
        className="absolute inset-0"
        style={{
          background: "oklch(0.08 0.02 250 / 0.78)",
          backdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      />

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
            {showBack ? (
              <button
                onClick={goBack}
                className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-transform active:scale-95"
                style={{
                  background: "oklch(0.18 0.02 258)",
                  border: "1px solid oklch(0.3 0.04 260)",
                  color: "oklch(0.85 0.02 80)",
                }}
                aria-label="Voltar"
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
                {headerTitle}
              </h2>
              <p
                className="text-[11px] tracking-[0.18em] uppercase truncate"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "oklch(0.6 0.02 80)",
                }}
              >
                {headerSubtitle}
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
          ) : selectedAccess ? (
            <SupplierLevel3 access={selectedAccess} />
          ) : !selectedMacro ? (
            <MacroList
              macros={macros}
              accessCount={(m) => buildAccesses(m, byMacro(m.number)).length}
              onSelect={setSelectedMacroId}
            />
          ) : (
            <AccessList
              accesses={accessesOfSelected}
              onSelect={setSelectedAccess}
            />
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
function AccessList({
  accesses,
  onSelect,
}: {
  accesses: MacroAccess[];
  onSelect: (access: MacroAccess) => void;
}) {
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
        <button
          key={ac.id}
          onClick={() => onSelect(ac)}
          className="group flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.99]"
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
          <ChevronRight
            className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ color: "oklch(0.5 0.02 80)" }}
          />
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Nível 3 — fornecedores ticados do acesso, com filtros combináveis
// -----------------------------------------------------------------------------
function SupplierLevel3({ access }: { access: MacroAccess }) {
  const { suppliers, loading } = useNegotiationLevel3(access);
  const [filter, setFilter] = useState<NegotiationFilter>(EMPTY_FILTER);
  const [showFilters, setShowFilters] = useState(false);
  const [mapFor, setMapFor] = useState<NegotiationSupplier | null>(null);

  const filtered = useMemo(
    () => applyNegotiationFilter(suppliers, filter),
    [suppliers, filter],
  );

  const togglePotencial = (p: Potencial) =>
    setFilter((f) => ({
      ...f,
      potencial: f.potencial.includes(p)
        ? f.potencial.filter((x) => x !== p)
        : [...f.potencial, p],
    }));
  const togglePreco = (p: PrecoClassificacao) =>
    setFilter((f) => ({
      ...f,
      preco: f.preco.includes(p)
        ? f.preco.filter((x) => x !== p)
        : [...f.preco, p],
    }));
  const toggleStatus = () =>
    setFilter((f) => ({
      ...f,
      statusLivre: f.statusLivre === "com" ? "any" : "com",
    }));
  const clearFilters = () => setFilter(EMPTY_FILTER);

  const activeFilterCount =
    filter.potencial.length +
    filter.preco.length +
    (filter.statusLivre === "com" ? 1 : 0);

  if (loading) {
    return (
      <div
        className="text-sm py-12 text-center"
        style={{ color: "oklch(0.6 0.02 80)" }}
      >
        Carregando fornecedores…
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div
        className="text-sm py-12 text-center"
        style={{ color: "oklch(0.6 0.02 80)" }}
      >
        Nenhum fornecedor avaliado neste acesso ainda.
        <br />
        <span className="text-xs">
          Só aparecem aqui fornecedores com potencial, preço ou status
          preenchido.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.97]"
          style={{
            background: showFilters
              ? "oklch(0.78 0.16 75)"
              : "oklch(0.18 0.02 258)",
            border: "1px solid oklch(0.3 0.04 260)",
            color: showFilters ? "oklch(0.12 0.02 250)" : "oklch(0.85 0.02 80)",
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
          {activeFilterCount > 0 && (
            <span
              className="ml-1 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] rounded-full text-[10px] font-bold px-1"
              style={{
                background: showFilters
                  ? "oklch(0.12 0.02 250)"
                  : "oklch(0.78 0.16 75)",
                color: showFilters ? "oklch(0.92 0.05 80)" : "oklch(0.12 0.02 250)",
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        <span className="text-xs" style={{ color: "oklch(0.58 0.02 80)" }}>
          {filtered.length} de {suppliers.length}{" "}
          {suppliers.length === 1 ? "fornecedor" : "fornecedores"}
        </span>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs underline"
            style={{ color: "oklch(0.62 0.02 80)" }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {showFilters && (
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{
            background: "oklch(0.10 0.02 255)",
            border: "1px solid oklch(0.24 0.03 260)",
          }}
        >
          {/* Potencial */}
          <div className="flex flex-col gap-1.5">
            <span
              className="text-[10px] uppercase tracking-[0.18em] font-semibold"
              style={{ color: "oklch(0.55 0.02 80)" }}
            >
              Potencial
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POTENCIAL_ORDER.map((p) => {
                const cfg = POTENCIAL_CONFIG[p];
                const active = filter.potencial.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePotencial(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-[0.97]"
                    style={{
                      background: active ? cfg.color : "oklch(0.16 0.02 258)",
                      border: `1px solid ${active ? cfg.color : "oklch(0.3 0.04 260)"}`,
                      color: active ? "#fff" : "oklch(0.78 0.02 80)",
                    }}
                  >
                    {cfg.emoji} {cfg.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preço */}
          <div className="flex flex-col gap-1.5">
            <span
              className="text-[10px] uppercase tracking-[0.18em] font-semibold"
              style={{ color: "oklch(0.55 0.02 80)" }}
            >
              Preço
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRECO_ORDER.map((p) => {
                const cfg = PRECO_CONFIG[p];
                const active = filter.preco.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePreco(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-[0.97]"
                    style={{
                      background: active ? cfg.color : "oklch(0.16 0.02 258)",
                      border: `1px solid ${active ? cfg.color : "oklch(0.3 0.04 260)"}`,
                      color: active ? "#fff" : "oklch(0.78 0.02 80)",
                    }}
                  >
                    {cfg.emoji} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status livre */}
          <div className="flex flex-col gap-1.5">
            <span
              className="text-[10px] uppercase tracking-[0.18em] font-semibold"
              style={{ color: "oklch(0.55 0.02 80)" }}
            >
              Status
            </span>
            <button
              onClick={toggleStatus}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold self-start transition-all active:scale-[0.97]"
              style={{
                background:
                  filter.statusLivre === "com"
                    ? "oklch(0.55 0.16 280)"
                    : "oklch(0.16 0.02 258)",
                border: `1px solid ${filter.statusLivre === "com" ? "oklch(0.55 0.16 280)" : "oklch(0.3 0.04 260)"}`,
                color:
                  filter.statusLivre === "com" ? "#fff" : "oklch(0.78 0.02 80)",
              }}
            >
              Apenas com status preenchido
            </button>
          </div>
        </div>
      )}

      {/* Lista de fornecedores */}
      {filtered.length === 0 ? (
        <div
          className="text-sm py-10 text-center"
          style={{ color: "oklch(0.6 0.02 80)" }}
        >
          Nenhum fornecedor corresponde aos filtros selecionados.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((s) => (
            <SupplierRow key={s.id} supplier={s} onOpenMap={setMapFor} />
          ))}
        </div>
      )}

      {/* Modal de mapa */}
      <SupplierMapDialog
        open={Boolean(mapFor)}
        onClose={() => setMapFor(null)}
        name={mapFor?.name ?? ""}
        address={mapFor?.addressText ?? ""}
      />
    </div>
  );
}

function SupplierRow({
  supplier,
  onOpenMap,
}: {
  supplier: NegotiationSupplier;
  onOpenMap: (s: NegotiationSupplier) => void;
}) {
  const potencialCfg = supplier.potencial
    ? POTENCIAL_CONFIG[supplier.potencial as Potencial]
    : null;
  const precoCfg = supplier.preco
    ? PRECO_CONFIG[supplier.preco as PrecoClassificacao]
    : null;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: "oklch(0.16 0.02 258)",
        border: "1px solid oklch(0.26 0.03 260)",
      }}
    >
      {/* Nome + selos */}
      <div className="flex items-start justify-between gap-3">
        <h4
          className="text-sm font-semibold leading-snug"
          style={{ color: "oklch(0.97 0.01 80)" }}
        >
          {supplier.name}
        </h4>
        <div className="flex flex-wrap items-center gap-1.5 justify-end shrink-0">
          {potencialCfg && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{
                background: potencialCfg.bg,
                color: potencialCfg.color,
                border: `1px solid ${potencialCfg.border}`,
              }}
            >
              {potencialCfg.emoji} {potencialCfg.shortLabel}
            </span>
          )}
          {precoCfg && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{
                background: precoCfg.bg,
                color: precoCfg.color,
                border: `1px solid ${precoCfg.border}`,
              }}
            >
              {precoCfg.emoji} {precoCfg.label}
            </span>
          )}
        </div>
      </div>

      {/* Status livre */}
      {supplier.statusLivre && (
        <div
          className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-lg text-xs font-medium"
          style={{
            background: "oklch(0.22 0.06 280 / 0.35)",
            border: "1px solid oklch(0.4 0.1 280 / 0.5)",
            color: "oklch(0.85 0.06 290)",
          }}
        >
          {supplier.statusLivre}
        </div>
      )}

      {/* Resumo (só quando houver) */}
      {supplier.resumo && (
        <div className="flex items-start gap-2">
          <FileText
            className="w-3.5 h-3.5 mt-0.5 shrink-0"
            style={{ color: "oklch(0.55 0.02 80)" }}
          />
          <p
            className="text-xs leading-relaxed whitespace-pre-wrap"
            style={{ color: "oklch(0.78 0.02 80)" }}
          >
            {supplier.resumo}
          </p>
        </div>
      )}

      {/* Endereço clicável → mapa */}
      {supplier.addressText ? (
        <button
          onClick={() => onOpenMap(supplier)}
          className="inline-flex items-center gap-1.5 self-start text-xs font-medium transition-colors hover:underline"
          style={{ color: "oklch(0.72 0.13 230)" }}
          title="Abrir no mapa"
        >
          <MapPin className="w-3.5 h-3.5" />
          {supplier.addressText}
        </button>
      ) : (
        <span className="text-xs" style={{ color: "oklch(0.5 0.02 80)" }}>
          Endereço não informado
        </span>
      )}
    </div>
  );
}
