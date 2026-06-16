// =============================================================================
// DESIGN: Mercado Oriental Premium
// Layout: Sidebar escura fixa + conteúdo principal com abas (Lista / Mapa / Notas)
// Paleta: Off-white quente + Vermelho-chinês + Verde-floresta + Azul-aço
// =============================================================================

import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import suppliers, { categories, subCategoryLabels, type Supplier } from "@aquario/data/suppliers";
import SupplierCard from "@aquario/components/SupplierCard";
import SupplierDetail from "@aquario/components/SupplierDetail";
import { Input } from "@/components/ui/input";
import { useNotes, statusConfig, type Note } from "@aquario/hooks/useNotes";
import { useDiary } from "@aquario/hooks/useDiary";
import DiaryCard from "@aquario/components/DiaryCard";
import { BackupPanel } from "@/shared/supplier-notes/BackupPanel";
import { UploadMetrics } from "@/shared/supplier-notes/UploadMetrics";
import CustomSuppliersSection from "@/shared/supplier-notes/CustomSuppliersSection";
import ClassifiedCustomList from "@/shared/supplier-notes/ClassifiedCustomList";
import { GroupsManager } from "@/shared/supplier-notes/GroupsManager";
import { GroupSummaryCards } from "@/shared/supplier-notes/GroupSummaryCards";
import ReportPanel from "@/shared/supplier-notes/ReportPanel";
import { useSupplierNotes, type SubtipoAquario } from "@/shared/supplier-notes/useSupplierNotes";
import { useCustomSuppliers, type CustomSupplier } from "@/shared/supplier-notes/useCustomSuppliers";
import GuiaEstrategicoTabs from "@aquario/components/GuiaEstrategicoTabs";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Map,
  List,
  StickyNote,
  Clock,
  Pencil,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
} from "lucide-react";

// Lazy load do mapa para não bloquear o carregamento inicial
const ChinaMap = lazy(() => import("@aquario/components/ChinaMap"));

const subCategoryGroups = {
  terrario: ["terrario-repteis", "terrario-tartaruga", "terrario-tela"],
  aquario: ["aquario-vidro", "aquario-kit-completo", "aquario-acrilico"],
  equipamento: ["filtro", "bomba", "iluminacao", "chiller", "aquecedor", "uvb-repteis", "substrato"],
};

const priorityOrder = { high: 0, medium: 1, low: 2 };

type ViewMode = "lista" | "mapa" | "notas" | "diario" | "guia";

function AquarioReportSection() {
  const { entries, deleteEntry } = useSupplierNotes("aquario");
  const { list: customSuppliers } = useCustomSuppliers("aquario");
  const resolveAquarioName = (sid: string) => {
    const found = suppliers.find((s) => s.id === sid);
    if (found) return found.name;
    const custom = customSuppliers.find((s) => s.id === sid);
    if (custom) return custom.name;
    return sid;
  };
  return (
    <div className="mb-5 p-5 rounded-xl border border-zinc-200 bg-white/80">
      <ReportPanel
        scope="aquario"
        scopeLabel="Fornecedores Aquários & Terrários"
        entries={entries}
        allSupplierIds={suppliers.map((s) => s.id)}
        resolveSupplierName={resolveAquarioName}
        onDeleteEntry={deleteEntry}
      />
    </div>
  );
}

export default function Home() {
  // Subtipo do atalho da Home (macro 1.1 Terrário / 1.2 Aquário). Quando presente,
  // o dashboard abre filtrado nessa especialidade e a categoria OPOSTA é escondida
  // da barra lateral (ex.: no Aquário não aparece "Terrários", e vice-versa).
  const [subtipoContext] = useState<"aquario" | "terrario" | null>(() => {
    if (typeof window !== "undefined") {
      const sub = new URLSearchParams(window.location.search).get("subtipo");
      if (sub === "aquario" || sub === "terrario") return sub;
    }
    return null;
  });
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    // Atalhos da Home (macro 1.1 Terrário / 1.2 Aquário) abrem este dashboard
    // já filtrado pela especialidade via ?subtipo=terrario|aquario.
    if (typeof window !== "undefined") {
      const sub = new URLSearchParams(window.location.search).get("subtipo");
      if (sub === "aquario" || sub === "terrario") return sub;
    }
    return "all";
  });
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [expandedFilters, setExpandedFilters] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const v = new URLSearchParams(window.location.search).get("view");
      if (v === "diario" || v === "mapa" || v === "notas" || v === "guia" || v === "lista") return v;
    }
    return "diario";
  });

  const { notes, upsertNote, deleteNote, getNote, totalNotes } = useNotes();
  const { totalEntries: totalDiaryEntries } = useDiary();
  const { list: customSuppliersAquario } = useCustomSuppliers("aquario");
  // Anotações/Diário deste dashboard: usadas para REPLICAR a classificação
  // (🐟 Aquário / 🦎 Terrário) marcada no painel para dentro das abas/categorias.
  const { entries: notesEntries } = useSupplierNotes("aquario");
  // Mapa supplierId -> especialidade marcada manualmente no Diário.
  const specialtyById = useMemo<Record<string, SubtipoAquario>>(() => {
    const map: Record<string, SubtipoAquario> = {};
    for (const [sid, entry] of Object.entries(notesEntries)) {
      const sub = entry?.fields?.subtipoAquario;
      if (sub === "aquario" || sub === "terrario") map[sid] = sub;
    }
    return map;
  }, [notesEntries]);
  // Categoria EFETIVA de um fornecedor do catálogo: a classificação do Diário
  // tem prioridade; na ausência dela, usa a categoria original do catálogo.
  const effectiveCategory = useCallback(
    (s: Supplier): string => specialtyById[s.id] ?? s.category,
    [specialtyById],
  );
  const resolveAquarioGroupName = (sid: string) => {
    const found = suppliers.find((s) => s.id === sid);
    if (found) return found.name;
    const custom = customSuppliersAquario.find((s) => s.id === sid);
    if (custom) return custom.name;
    return sid;
  };

  const filteredSuppliers = useMemo(() => {
    let result = suppliers;

    if (selectedCategory !== "all") {
      // Categoria efetiva: a classificação feita no Diário (subtipoAquario)
      // tem prioridade sobre s.category, replicando o fornecedor na aba certa.
      result = result.filter((s) => effectiveCategory(s) === selectedCategory);
    }

    if (selectedSubCategories.length > 0) {
      result = result.filter((s) =>
        selectedSubCategories.some((sc) => s.subCategories.includes(sc as any))
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.nameChinese || "").toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.province.toLowerCase().includes(q) ||
          s.specialties.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)) ||
          s.products.some(
            (p) =>
              p.model.toLowerCase().includes(q) ||
              (p.features || "").toLowerCase().includes(q)
          )
      );
    }

    return result.sort((a, b) => {
      const pa = priorityOrder[a.priority || "low"];
      const pb = priorityOrder[b.priority || "low"];
      return pa - pb;
    });
  }, [selectedCategory, selectedSubCategories, searchQuery, effectiveCategory]);

  const toggleSubCategory = useCallback((sc: string) => {
    setSelectedSubCategories((prev) =>
      prev.includes(sc) ? prev.filter((x) => x !== sc) : [...prev, sc]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategory("all");
    setSelectedSubCategories([]);
    setSearchQuery("");
  }, []);

  const activeFiltersCount =
    (selectedCategory !== "all" ? 1 : 0) + selectedSubCategories.length + (searchQuery ? 1 : 0);

  const currentSubGroups =
    selectedCategory !== "all" && selectedCategory in subCategoryGroups
      ? subCategoryGroups[selectedCategory as keyof typeof subCategoryGroups]
      : [];

  // Fornecedores com notas para a aba de notas
  const suppliersWithNotes = useMemo(
    () => suppliers.filter((s) => notes[s.id]),
    [notes]
  );

  // Fornecedores MANUAIS classificados no Diário (aquario/terrario), por categoria.
  const classifiedCustomByCat = useMemo<Record<string, CustomSupplier[]>>(() => {
    const map: Record<string, CustomSupplier[]> = { aquario: [], terrario: [] };
    for (const cs of customSuppliersAquario) {
      const sub = specialtyById[cs.id];
      if (sub === "aquario" || sub === "terrario") map[sub].push(cs);
    }
    return map;
  }, [customSuppliersAquario, specialtyById]);

  // Contagem por categoria para a sidebar: usa categoria efetiva do catálogo
  // (classificação do Diário tem prioridade) + manuais classificados.
  const categoryCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const s of suppliers) {
      const cat = effectiveCategory(s);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    counts["aquario"] = (counts["aquario"] ?? 0) + classifiedCustomByCat.aquario.length;
    counts["terrario"] = (counts["terrario"] ?? 0) + classifiedCustomByCat.terrario.length;
    counts["all"] = suppliers.length + customSuppliersAquario.length;
    return counts;
  }, [effectiveCategory, classifiedCustomByCat, customSuppliersAquario]);

  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
      style={{ ["--sidebar-w" as string]: sidebarOpen ? "288px" : "64px" } as React.CSSProperties}
    >
      {/* ===== SIDEBAR ===== */}
      <aside
        className={`flex-shrink-0 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          sidebarOpen ? "w-72" : "w-16"
        }`}
        style={{
          background: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* Logo + botão de toggle (layout adapta-se ao estado) */}
        {sidebarOpen ? (
          <div
            className="flex items-center gap-3 px-5 py-6 border-b"
            style={{ borderColor: "var(--sidebar-border)" }}
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold font-display text-base"
              style={{
                background: "var(--sidebar-primary)",
                color: "var(--sidebar-primary-foreground)",
                boxShadow: "0 0 0 1px oklch(0.55 0.20 28 / 0.4), 0 4px 8px oklch(0.55 0.20 28 / 0.2)",
              }}
            >
              中
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <div
                className="font-display font-semibold leading-tight truncate"
                style={{ color: "var(--sidebar-foreground)", fontSize: "1.05rem", letterSpacing: "-0.02em" }}
              >
                Fornecedores China
              </div>
              <div className="eyebrow mt-1 truncate" style={{ color: "oklch(0.6 0.01 60)", fontSize: "0.65rem" }}>
                Aquários · Terrários
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex-shrink-0 p-2 rounded-md hover:bg-white/10 transition-colors"
              style={{ color: "oklch(0.7 0.012 60)" }}
              aria-label="Recolher menu lateral"
              title="Recolher"
            >
              <PanelLeftClose size={17} />
            </button>
          </div>
        ) : (
          <div
            className="flex flex-col items-center gap-2 px-2 py-5 border-b"
            style={{ borderColor: "var(--sidebar-border)" }}
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold font-display text-base"
              style={{
                background: "var(--sidebar-primary)",
                color: "var(--sidebar-primary-foreground)",
                boxShadow: "0 0 0 1px oklch(0.55 0.20 28 / 0.4), 0 4px 8px oklch(0.55 0.20 28 / 0.2)",
              }}
            >
              中
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
              style={{ color: "oklch(0.75 0.012 60)" }}
              aria-label="Expandir menu lateral"
              title="Expandir"
            >
              <PanelLeftOpen size={18} />
            </button>
          </div>
        )}

        {/* Categorias */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Item: Anotações / Diário (TOPO) */}
          <button
            onClick={() => {
              setViewMode("diario");
            }}
            className={`w-full flex items-center gap-3 px-5 py-3 transition-all duration-200 ${
              viewMode === "diario" ? "font-semibold" : "font-normal"
            }`}
            style={{
              background: viewMode === "diario" ? "oklch(0.55 0.20 28 / 0.16)" : "transparent",
              borderLeft: viewMode === "diario" ? "3px solid var(--sidebar-primary)" : "3px solid transparent",
              color: viewMode === "diario" ? "var(--sidebar-foreground)" : "oklch(0.62 0.012 60)",
              fontSize: "0.95rem",
            }}
          >
            <span className="text-lg flex-shrink-0">📓</span>
            {sidebarOpen && (
              <>
                <span className="flex-1 text-left truncate" style={{ letterSpacing: "-0.01em" }}>
                  Anotações / Diário
                </span>
                {totalDiaryEntries > 0 && (
                  <span
                    className="num-mono text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        viewMode === "diario" ? "oklch(0.55 0.20 28 / 0.3)" : "var(--sidebar-accent)",
                      color: viewMode === "diario" ? "var(--sidebar-foreground)" : "oklch(0.55 0.012 60)",
                    }}
                  >
                    {totalDiaryEntries}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Separador após Anotações / Diário */}
          {sidebarOpen && (
            <div className="mx-5 my-4 border-t" style={{ borderColor: "var(--sidebar-border)" }} />
          )}

          <div
            className="px-5 mb-3 eyebrow"
            style={{ color: "oklch(0.5 0.012 60)" }}
          >
            {sidebarOpen ? "Categorias" : ""}
          </div>
          {categories
            .filter((cat) => {
              // Esconde a categoria OPOSTA quando o dashboard foi aberto por um
              // atalho de especialidade (ex.: contexto Aquário oculta "terrario").
              if (subtipoContext === "aquario" && cat.id === "terrario") return false;
              if (subtipoContext === "terrario" && cat.id === "aquario") return false;
              return true;
            })
            .map((cat) => {
            const count = categoryCounts[cat.id] ?? 0;
            const isActive = selectedCategory === cat.id && viewMode !== "diario";
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedSubCategories([]);
                  setViewMode("lista");
                }}
                className={`w-full flex items-center gap-3 px-5 py-3 transition-all duration-200 ${
                  isActive ? "font-semibold" : "font-normal"
                }`}
                style={{
                  background: isActive ? "oklch(0.55 0.20 28 / 0.16)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--sidebar-primary)" : "3px solid transparent",
                  color: isActive ? "var(--sidebar-foreground)" : "oklch(0.62 0.012 60)",
                  fontSize: "0.95rem",
                }}
              >
                <span className="text-lg flex-shrink-0">{cat.icon}</span>
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left truncate" style={{ letterSpacing: "-0.01em" }}>
                      {cat.label}
                    </span>
                    <span
                      className="num-mono text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: isActive ? "oklch(0.55 0.20 28 / 0.3)" : "var(--sidebar-accent)",
                        color: isActive ? "var(--sidebar-foreground)" : "oklch(0.55 0.012 60)",
                      }}
                    >
                      {count}
                    </span>
                  </>
                )}
              </button>
            );
          })}

          {/* Subcategorias */}
          {sidebarOpen && currentSubGroups.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setExpandedFilters((v) => !v)}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                style={{ color: "oklch(0.45 0.01 60)" }}
              >
                <span>Subcategorias</span>
                {expandedFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {expandedFilters && (
                <div className="px-3 space-y-1">
                  {currentSubGroups.map((sc) => {
                    const isSelected = selectedSubCategories.includes(sc);
                    return (
                      <button
                        key={sc}
                        onClick={() => toggleSubCategory(sc)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-all duration-150"
                        style={{
                          background: isSelected ? "oklch(0.45 0.22 25 / 0.15)" : "transparent",
                          color: isSelected ? "oklch(0.85 0.005 80)" : "oklch(0.55 0.01 60)",
                          border: isSelected ? "1px solid oklch(0.45 0.22 25 / 0.4)" : "1px solid transparent",
                        }}
                      >
                        <span
                          className="w-3 h-3 rounded-sm flex-shrink-0 border"
                          style={{
                            background: isSelected ? "oklch(0.45 0.22 25)" : "transparent",
                            borderColor: isSelected ? "oklch(0.45 0.22 25)" : "oklch(0.35 0.01 60)",
                          }}
                        />
                        {subCategoryLabels[sc as keyof typeof subCategoryLabels]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer da sidebar */}
        {sidebarOpen && (
          <div
            className="px-5 py-4 text-xs border-t"
            style={{
              borderColor: "var(--sidebar-border)",
              color: "oklch(0.45 0.012 60)",
              letterSpacing: "0.02em",
            }}
          >
            <div className="eyebrow mb-1" style={{ color: "oklch(0.45 0.012 60)", fontSize: "0.6rem" }}>
              Fontes
            </div>
            Alibaba · Made-in-China · Global Sources
          </div>
        )}
      </aside>

      {/* ===== CONTEÚDO PRINCIPAL ===== */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header (oculto na aba Guia Estratégico, que tem header próprio) */}
        {viewMode !== "guia" && (
        <header
          className="flex-shrink-0 px-8 py-5 border-b flex items-center gap-5"
          style={{
            borderColor: "var(--border)",
            background: "var(--card)",
            boxShadow: "0 1px 0 oklch(0.95 0.006 80)",
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="eyebrow mb-1" style={{ color: "var(--primary)", fontSize: "0.65rem" }}>
              Importação China — Brasil
            </div>
            <h1 className="font-display leading-none" style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--foreground)" }}>
              Guia de Fornecedores Chineses
            </h1>
            <p className="text-sm mt-1.5" style={{ color: "var(--muted-foreground)" }}>
              Aquários de Vidro · Terrários para Répteis · Equipamentos & Acessórios
            </p>
          </div>

          {/* Abas de visualização */}
          <div
            className="flex items-center rounded-lg p-1 gap-0.5"
            style={{ background: "oklch(0.95 0.006 80)", border: "1px solid var(--border)" }}
          >
            {[
              { mode: "lista" as ViewMode, icon: <List size={15} />, label: "Lista" },
              { mode: "mapa" as ViewMode, icon: <Map size={15} />, label: "Mapa" },
              {
                mode: "notas" as ViewMode,
                icon: <StickyNote size={15} />,
                label: `Notas${totalNotes > 0 ? ` · ${totalNotes}` : ""}`,
              },
            ].map(({ mode, icon, label }) => {
              const isActive = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-200"
                  style={{
                    background: isActive ? "var(--card)" : "transparent",
                    color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                    boxShadow: isActive
                      ? "0 1px 2px oklch(0.15 0.01 60 / 0.08), 0 0 0 1px var(--border)"
                      : "none",
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Busca (oculta na aba mapa e notas) */}
          {(viewMode === "lista" || viewMode === "diario") && (
            <div className="relative w-80">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--muted-foreground)" }}
              />
              <Input
                placeholder="Buscar fornecedor, produto, cidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-9 h-10 text-sm rounded-lg"
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/5"
                >
                  <X size={13} style={{ color: "var(--muted-foreground)" }} />
                </button>
              )}
            </div>
          )}

          {/* Limpar filtros */}
          {activeFiltersCount > 0 && (viewMode === "lista" || viewMode === "diario") && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-all hover:opacity-90"
              style={{
                background: "oklch(0.46 0.20 28 / 0.1)",
                color: "var(--primary)",
                border: "1px solid oklch(0.46 0.20 28 / 0.25)",
                letterSpacing: "0.01em",
              }}
            >
              <X size={13} />
              Limpar ({activeFiltersCount})
            </button>
          )}
        </header>
        )}

        {/* Barra de status (apenas na aba lista) */}
        {viewMode === "lista" && (
          <div
            className="flex-shrink-0 px-8 py-3 flex items-center gap-3 border-b"
            style={{ borderColor: "var(--border)", background: "oklch(0.978 0.006 80)" }}
          >
            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              <span className="num-display text-lg font-semibold mr-1" style={{ color: "var(--foreground)" }}>
                {filteredSuppliers.length}
              </span>
              {filteredSuppliers.length === 1 ? "fornecedor encontrado" : "fornecedores encontrados"}
            </span>
            {selectedSubCategories.map((sc) => (
              <button
                key={sc}
                onClick={() => toggleSubCategory(sc)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: "oklch(0.46 0.20 28 / 0.08)",
                  color: "var(--primary)",
                  border: "1px solid oklch(0.46 0.20 28 / 0.2)",
                }}
              >
                {subCategoryLabels[sc as keyof typeof subCategoryLabels]}
                <X size={11} />
              </button>
            ))}
          </div>
        )}

        {/* ===== CONTEÚDO POR ABA ===== */}

        {/* ABA: LISTA */}
        {viewMode === "lista" && (
          <div className="flex-1 overflow-y-auto px-8 py-8">
            {/* Fornecedores MANUAIS classificados nesta categoria (replicados do Diário) */}
            {(selectedCategory === "aquario" || selectedCategory === "terrario") &&
              (classifiedCustomByCat[selectedCategory]?.length ?? 0) > 0 && (
                <div className="max-w-5xl mx-auto mb-6">
                  <p
                    className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-3"
                    style={{ color: "var(--primary)" }}
                  >
                    ★ Cadastrados manualmente · classificados como{" "}
                    {selectedCategory === "aquario" ? "🐟 Aquário" : "🦎 Terrário"}
                  </p>
                  <ClassifiedCustomList scope="aquario" suppliers={classifiedCustomByCat[selectedCategory]} />
                </div>
              )}
            {filteredSuppliers.length === 0 &&
            ((selectedCategory !== "aquario" && selectedCategory !== "terrario") ||
              (classifiedCustomByCat[selectedCategory]?.length ?? 0) === 0) ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="text-5xl opacity-50">🔍</div>
                <p className="font-display text-lg" style={{ color: "var(--foreground)" }}>
                  Nenhum fornecedor encontrado
                </p>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Tente ajustar os filtros ou a busca
                </p>
                <button
                  onClick={clearFilters}
                  className="text-sm px-4 py-2 rounded-md font-medium mt-2 transition-all hover:opacity-90"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-5 max-w-5xl mx-auto">
                {filteredSuppliers.map((supplier, index) => {
                  const note = getNote(supplier.id);
                  return (
                    <div
                      key={supplier.id}
                      className="card-animate relative"
                      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
                    >
                      <SupplierCard
                        supplier={supplier}
                        note={note}
                        onClick={() => setSelectedSupplier(supplier)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA: MAPA */}
        {viewMode === "mapa" && (
          <div className="flex-1 overflow-hidden">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full gap-3" style={{ color: "oklch(0.55 0.01 60)" }}>
                  <div
                    className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "oklch(0.45 0.22 25)", borderTopColor: "transparent" }}
                  />
                  <span className="text-sm">Carregando mapa...</span>
                </div>
              }
            >
              <ChinaMap
                suppliers={filteredSuppliers}
                onSelectSupplier={(s: Supplier) => setSelectedSupplier(s)}
              />
            </Suspense>
          </div>
        )}

        {/* ABA: NOTAS */}
        {viewMode === "notas" && (
          <div className="flex-1 overflow-y-auto p-6">
            {suppliersWithNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                <div className="text-4xl">📝</div>
                <p className="text-sm font-medium" style={{ color: "oklch(0.35 0.01 60)" }}>
                  Nenhuma nota ainda
                </p>
                <p className="text-xs max-w-xs" style={{ color: "oklch(0.55 0.01 60)" }}>
                  Abra qualquer fornecedor na aba Lista e clique em "Adicionar nota" para registrar
                  observações, status de contato e informações de negociação.
                </p>
                <button
                  onClick={() => setViewMode("lista")}
                  className="text-xs px-3 py-1.5 rounded mt-1"
                  style={{ background: "oklch(0.45 0.22 25)", color: "white" }}
                >
                  Ir para Lista de Fornecedores
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-7 max-w-5xl mx-auto">
                  <div className="eyebrow mb-2" style={{ color: "var(--primary)" }}>
                    Caderno Pessoal
                  </div>
                  <h2 className="font-display" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.025em" }}>
                    Minhas Notas de Fornecedores
                  </h2>
                  <p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>
                    <span className="num-display font-semibold" style={{ color: "var(--foreground)" }}>
                      {suppliersWithNotes.length}
                    </span>{" "}
                    fornecedor{suppliersWithNotes.length !== 1 ? "es" : ""} com anotações · Salvo no banco compartilhado
                  </p>
                </div>

                {/* Resumo por status */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8 max-w-5xl mx-auto">
                  {(Object.keys(statusConfig) as Note["status"][]).map((s) => {
                    const count = suppliersWithNotes.filter((sup) => notes[sup.id]?.status === s).length;
                    const cfg = statusConfig[s];
                    if (count === 0) return null;
                    return (
                      <div
                        key={s}
                        className="rounded-lg px-3 py-2 text-center"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
                      >
                        <div className="text-lg">{cfg.emoji}</div>
                        <div className="text-lg font-bold" style={{ color: cfg.color }}>{count}</div>
                        <div className="text-xs leading-tight mt-0.5" style={{ color: cfg.color }}>{cfg.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Lista de fornecedores com notas */}
                <div className="space-y-4 max-w-5xl mx-auto">
                  {suppliersWithNotes.map((supplier) => {
                    const note = notes[supplier.id];
                    const cfg = statusConfig[note.status];
                    return (
                      <div
                        key={supplier.id}
                        className="rounded-xl border overflow-hidden"
                        style={{ borderColor: "oklch(0.9 0.004 80)" }}
                      >
                        <div
                          className="flex items-center justify-between px-4 py-3 border-b"
                          style={{ background: "oklch(0.985 0.003 80)", borderColor: "oklch(0.9 0.004 80)" }}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedSupplier(supplier)}
                              className="text-sm font-semibold hover:underline transition-all"
                              style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.15 0.01 60)" }}
                            >
                              {supplier.name}
                            </button>
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: cfg.bg, color: cfg.color }}
                            >
                              {cfg.emoji} {cfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedSupplier(supplier)}
                              className="p-1.5 rounded hover:bg-black/5 transition-colors"
                              title="Ver detalhes"
                              style={{ color: "oklch(0.45 0.01 60)" }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => deleteNote(supplier.id)}
                              className="p-1.5 rounded hover:bg-red-50 transition-colors"
                              title="Excluir nota"
                              style={{ color: "oklch(0.45 0.22 25)" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="px-4 py-3" style={{ background: "oklch(1 0 0)" }}>
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs" style={{ color: "oklch(0.55 0.01 60)" }}>
                                  {supplier.city}, {supplier.province}
                                </span>
                                <span className="text-xs" style={{ color: "oklch(0.7 0.01 60)" }}>·</span>
                                <span className="text-xs capitalize" style={{ color: "oklch(0.55 0.01 60)" }}>
                                  {supplier.category}
                                </span>
                              </div>
                              {note.text && (
                                <p className="text-sm leading-relaxed" style={{ color: "oklch(0.3 0.01 60)" }}>
                                  {note.text}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1 text-xs" style={{ color: "oklch(0.6 0.01 60)" }}>
                              <Clock size={11} />
                              <span>{note.updatedAt}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {/* ABA: ANOTAÇÕES / DIÁRIO */}
        {viewMode === "diario" && (
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <div className="max-w-5xl mx-auto">
              {/* Cabeçalho da aba diário */}
              <div className="mb-7">
                <div className="eyebrow mb-2" style={{ color: "var(--primary)" }}>
                  Caderno de Campo
                </div>
                <h2
                  className="font-display"
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "var(--foreground)",
                    letterSpacing: "-0.025em",
                  }}
                >
                  Anotações / Diário
                </h2>
                <p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>
                  Clique em qualquer fornecedor para registrar anotações livres e anexar arquivos
                  (fotos, PDFs, planilhas, contratos). Tudo é salvo no seu navegador.
                  {totalDiaryEntries > 0 && (
                    <>
                      {" · "}
                      <span
                        className="num-display font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {totalDiaryEntries}
                      </span>{" "}
                      fornecedor{totalDiaryEntries !== 1 ? "es" : ""} com registros
                    </>
                  )}
                </p>
              </div>

              {/* Proteção de dados (backup) */}
              <div className="mb-5">
                <BackupPanel tone="light" />
              </div>

              {/* Métricas de uploads */}
              <div className="mb-5">
                <UploadMetrics scope="aquario" tone="light" accent="#dc2626" />
              </div>

              {/* Gerenciar grupos */}
              <div className="mb-5">
                <GroupsManager tone="light" />
              </div>

              {/* Cards agregadores por grupo (atualiza conforme fornecedores são marcados) */}
              <div className="mb-5">
                <GroupSummaryCards
                  scope="aquario"
                  tone="light"
                  accent="#dc2626"
                  resolveSupplierName={resolveAquarioGroupName}
                />
              </div>

              {/* Relatório de Atividades */}
              <AquarioReportSection />

              {/* Cadastro manual de fornecedores */}
              <CustomSuppliersSection scope="aquario" />

              {/* Contagem de filtros aplicados */}
              <div
                className="mb-5 pb-3 flex items-center justify-between border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  <span
                    className="num-display font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {filteredSuppliers.length}
                  </span>{" "}
                  fornecedor{filteredSuppliers.length !== 1 ? "es" : ""}{" "}
                  {activeFiltersCount > 0 ? "filtrados" : "no total"}
                </div>
              </div>

              {/* Lista de cards diário */}
              {filteredSuppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                  <div className="text-4xl">🔍</div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "oklch(0.35 0.01 60)" }}
                  >
                    Nenhum fornecedor encontrado com os filtros atuais
                  </p>
                  <button
                    onClick={clearFilters}
                    className="text-xs px-3 py-1.5 rounded mt-1"
                    style={{
                      background: "oklch(0.45 0.22 25)",
                      color: "white",
                    }}
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSuppliers.map((supplier) => (
                    <DiaryCard key={supplier.id} supplier={supplier} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: GUIA ESTRATÉGICO DE FORNECEDORES */}
        {viewMode === "guia" && (
          <div className="flex-1 overflow-hidden">
            <GuiaEstrategicoTabs />
          </div>
        )}
      </main>

      {/* ===== PAINEL DE DETALHES ===== */}
      {selectedSupplier && (
        <SupplierDetail
          supplier={selectedSupplier}
          note={getNote(selectedSupplier.id)}
          onSaveNote={upsertNote}
          onDeleteNote={deleteNote}
          onClose={() => setSelectedSupplier(null)}
        />
      )}
    </div>
  );
}
