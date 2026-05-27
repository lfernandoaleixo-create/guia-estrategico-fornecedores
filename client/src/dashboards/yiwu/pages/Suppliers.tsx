import { useState, useMemo, useEffect } from "react";
import { Link, useSearch } from "wouter";
import Header from "@yiwu/components/Header";
import { Search, Package, ChevronRight, MapPin, Clock, ExternalLink, X, Trophy, Info, ArrowUpDown, Star } from "lucide-react";
import suppliersData from "@yiwu/data/suppliers.json";
import { SupplierAnnotation } from "@yiwu/components/SupplierAnnotation";
import { useYiwuNotes } from "@yiwu/hooks/useYiwuNotes";

type Supplier = {
  id: number;
  name: string;
  booth: string;
  location: string;
  floor: string;
  district: string;
  gate: string;
  years: string;
  products: string;
  url: string;
  category: string;
  source: string;
  score?: number;
  priority?: "alta" | "media" | "baixa";
  scoreBreakdown?: {
    alibaba: number;
    years: number;
    premium: number;
    district: number;
    floor: number;
  };
};

const CATEGORIES = [
  { key: "all", label: "Todos", color: "text-foreground" },
  { key: "vidraria", label: "Vidraria (NCM 7013)", color: "text-cyan-400" },
  { key: "plasticos", label: "Plásticos (NCM 3924)", color: "text-green-400" },
  { key: "termicas", label: "Garrafas Térmicas (NCM 9617)", color: "text-amber-400" },
  { key: "premium", label: "Premium / Alibaba", color: "text-red-400" },
];

const PRIORITIES = [
  { key: "all", label: "Todas Prioridades" },
  { key: "alta", label: "Prioridade Alta", color: "text-emerald-400", dot: "bg-emerald-400" },
  { key: "media", label: "Prioridade Média", color: "text-amber-400", dot: "bg-amber-400" },
  { key: "baixa", label: "Prioridade Baixa", color: "text-muted-foreground", dot: "bg-muted-foreground" },
];

const CATEGORY_BADGES: Record<string, string> = {
  vidraria: "badge-vidraria",
  plasticos: "badge-plasticos",
  termicas: "badge-termicas",
  premium: "badge-premium",
};

const CATEGORY_LABELS: Record<string, string> = {
  vidraria: "Vidraria",
  plasticos: "Plásticos",
  termicas: "Térmicas",
  premium: "Premium",
};

function PriorityBadge({ priority, score }: { priority?: string; score?: number }) {
  const s = score ?? 0;
  let color = "text-muted-foreground";
  let bg = "bg-muted-foreground/10";
  let border = "border-muted-foreground/20";
  let label = "Baixa";

  if (priority === "alta") {
    color = "text-emerald-400";
    bg = "bg-emerald-400/10";
    border = "border-emerald-400/30";
    label = "Alta";
  } else if (priority === "media") {
    color = "text-amber-400";
    bg = "bg-amber-400/10";
    border = "border-amber-400/30";
    label = "Média";
  }

  return (
    <div className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md border ${bg} ${border}`}>
      <span className={`text-sm font-bold font-mono leading-none ${color}`}>{s}</span>
      <span className={`text-[9px] uppercase tracking-wider leading-none ${color}/80`}>{label}</span>
    </div>
  );
}

function SupplierCard({ supplier, index, rank, favoriteIds }: { supplier: Supplier; index: number; rank: number; favoriteIds: Set<number> }) {
  const isFav = favoriteIds.has(supplier.id);
  return (
    <div
      className={`supplier-card rounded-xl card-enter overflow-hidden ${isFav ? 'ring-1 ring-amber-400/40' : ''}`}
      style={{
        background: 'oklch(0.17 0.04 240)',
        animationDelay: `${Math.min(index * 30, 600)}ms`,
        animationFillMode: 'both',
      }}
    >
      {/* ============ DESKTOP (lg+): grid horizontal de 10 colunas ============ */}
      <div className="hidden lg:grid items-center px-4 py-3 gap-x-3 gap-y-1" style={{ gridTemplateColumns: '56px 64px 56px 56px 64px 80px 1fr 160px 48px 76px' }}>
        <div className="text-center">
          <span className="text-lg font-mono font-bold text-foreground/90 tabular-nums">#{rank}</span>
        </div>
        <div className="flex justify-center">
          <PriorityBadge priority={supplier.priority} score={supplier.score} />
        </div>
        <div className="text-center">
          {supplier.district
            ? <span className="font-mono font-bold text-sm text-primary">D{supplier.district}</span>
            : <span className="text-xs text-muted-foreground opacity-30">—</span>}
        </div>
        <div className="text-center">
          {supplier.floor
            ? <span className="font-mono text-xs text-foreground/80">{supplier.floor}º</span>
            : <span className="text-xs text-muted-foreground opacity-30">—</span>}
        </div>
        <div className="text-center">
          {supplier.gate
            ? <span className="font-mono text-xs text-amber-400">P.{supplier.gate}</span>
            : <span className="text-xs text-muted-foreground opacity-30">—</span>}
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0 text-accent" />
          <span className="font-mono text-xs text-accent truncate">
            {supplier.booth && supplier.booth !== 'e' ? supplier.booth : <span className="opacity-30">—</span>}
          </span>
        </div>
        <h3 className="font-semibold text-sm leading-tight truncate" title={supplier.name}>{supplier.name}</h3>
        <p className="text-xs text-foreground/60 truncate" title={supplier.products}>{supplier.products || '—'}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground justify-center">
          {supplier.years
            ? <><Clock className="w-3 h-3 flex-shrink-0" /><span>{supplier.years}a</span></>
            : <span className="opacity-30">—</span>}
        </div>
        <div className="flex justify-center">
          {supplier.url
            ? <a href={supplier.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors">
                <ExternalLink className="w-3 h-3" /> Link
              </a>
            : <span className="text-xs text-muted-foreground opacity-30">—</span>}
        </div>
      </div>

      {/* ============ MOBILE (< lg): layout vertical compacto ============ */}
      <div className="lg:hidden p-3 flex flex-col gap-2">
        {/* Linha 1: rank, score, nome */}
        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0">
            <PriorityBadge priority={supplier.priority} score={supplier.score} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-mono font-bold text-foreground/90 tabular-nums">#{rank}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${CATEGORY_BADGES[supplier.category] || 'badge-vidraria'}`}>
                {CATEGORY_LABELS[supplier.category] || supplier.category}
              </span>
            </div>
            <h3 className="font-semibold text-sm leading-tight break-words" title={supplier.name}>{supplier.name}</h3>
            {supplier.products && (
              <p className="text-[11px] text-foreground/60 leading-snug mt-0.5 line-clamp-2">{supplier.products}</p>
            )}
          </div>
        </div>

        {/* Linha 2: localização em chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {supplier.district && (
            <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 font-mono font-bold text-primary">D{supplier.district}</span>
          )}
          {supplier.floor && (
            <span className="px-2 py-0.5 rounded-md bg-secondary border border-border/40 font-mono text-foreground/80">{supplier.floor}º andar</span>
          )}
          {supplier.gate && (
            <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/30 font-mono text-amber-400">Portão {supplier.gate}</span>
          )}
          {supplier.booth && supplier.booth !== 'e' && (
            <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/30 font-mono text-accent inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />{supplier.booth}
            </span>
          )}
          {supplier.years && (
            <span className="px-2 py-0.5 rounded-md bg-secondary border border-border/40 font-mono text-muted-foreground inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />{supplier.years} anos
            </span>
          )}
          {supplier.url && (
            <a href={supplier.url} target="_blank" rel="noopener noreferrer"
              className="ml-auto px-2 py-0.5 rounded-md bg-accent/15 border border-accent/40 font-mono text-accent inline-flex items-center gap-1 hover:bg-accent/25 transition-colors">
              <ExternalLink className="w-3 h-3" /> Alibaba
            </a>
          )}
        </div>
      </div>

      {/* ============ Rodapé (visivel em ambos): badge categoria + breakdown ============ */}
      <div className="hidden lg:flex px-4 pb-2 items-center gap-2 border-t border-border/20 pt-1.5 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${CATEGORY_BADGES[supplier.category] || 'badge-vidraria'}`}>
          {CATEGORY_LABELS[supplier.category] || supplier.category}
        </span>
        {supplier.scoreBreakdown && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/70">
            <span title="Alibaba/Made-in-China">Ali:<span className="text-foreground/80 ml-1">{supplier.scoreBreakdown.alibaba}</span></span>
            <span>·</span>
            <span title="Anos de operação">Exp:<span className="text-foreground/80 ml-1">{supplier.scoreBreakdown.years}</span></span>
            <span>·</span>
            <span title="Categoria Premium">Pre:<span className="text-foreground/80 ml-1">{supplier.scoreBreakdown.premium}</span></span>
            <span>·</span>
            <span title="Distrito estratégico">Dis:<span className="text-foreground/80 ml-1">{supplier.scoreBreakdown.district}</span></span>
            <span>·</span>
            <span title="Andar conhecido">And:<span className="text-foreground/80 ml-1">{supplier.scoreBreakdown.floor}</span></span>
          </div>
        )}
        {(supplier as any).address && (
          <span className="text-[10px] text-muted-foreground font-mono truncate">{(supplier as any).address}</span>
        )}
        <div className="ml-auto">
          <SupplierAnnotation supplierId={supplier.id} supplierName={supplier.name} variant="full" />
        </div>
      </div>

      {/* Mobile annotation row */}
      <div className="lg:hidden px-3 pb-3 -mt-1 flex items-center justify-between gap-2 border-t border-border/20 pt-2">
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${CATEGORY_BADGES[supplier.category] || 'badge-vidraria'}`}>
          {CATEGORY_LABELS[supplier.category] || supplier.category}
        </span>
        <SupplierAnnotation supplierId={supplier.id} supplierName={supplier.name} />
      </div>
    </div>
  );
}

const PAGE_SIZE = 48;

export default function Suppliers() {
  const searchString = useSearch();
  const queryParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const initialOnlyFavorites = queryParams.get("favoritos") === "1";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sortBy, setSortBy] = useState<"score" | "years" | "district">("score");
  const [page, setPage] = useState(1);
  const [onlyFavorites, setOnlyFavorites] = useState(initialOnlyFavorites);

  const { notes } = useYiwuNotes();
  const favoriteIds = useMemo<Set<number>>(
    () => new Set(notes.filter(n => n.favorite).map(n => n.supplierId)),
    [notes],
  );

  const allSuppliers = suppliersData.suppliers as Supplier[];

  const stats = useMemo(() => {
    return {
      alta: allSuppliers.filter(s => s.priority === "alta").length,
      media: allSuppliers.filter(s => s.priority === "media").length,
      baixa: allSuppliers.filter(s => s.priority === "baixa").length,
    };
  }, [allSuppliers]);

  const filtered = useMemo(() => {
    let result = [...allSuppliers];
    if (onlyFavorites) {
      result = result.filter((s) => favoriteIds.has(s.id));
    }
    if (category !== "all") {
      result = result.filter((s) => s.category === category);
    }
    if (priority !== "all") {
      result = result.filter((s) => s.priority === priority);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.products.toLowerCase().includes(q) ||
          s.booth.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q)
      );
    }
    // Ordenação
    if (sortBy === "score") {
      result.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    } else if (sortBy === "years") {
      result.sort((a, b) => (parseInt(b.years) || 0) - (parseInt(a.years) || 0));
    } else if (sortBy === "district") {
      result.sort((a, b) => (a.district || "z").localeCompare(b.district || "z"));
    }
    return result;
  }, [search, category, priority, sortBy, allSuppliers, onlyFavorites, favoriteIds]);

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [search, category, priority, sortBy, onlyFavorites]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        {/* Header */}
        <div className="border-b border-border/50 py-8 sticky top-16 z-40" style={{ background: 'oklch(0.13 0.04 240 / 0.97)', backdropFilter: 'blur(12px)' }}>
          <div className="container">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-3">
              <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-primary">Fornecedores</span>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold flex items-center gap-2">
                  <Package className="w-6 h-6 text-primary" />
                  Diretório de Fornecedores
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-mono text-primary">{filtered.length}</span> de <span className="font-mono">{allSuppliers.length}</span> fornecedores ·
                  <span className="text-emerald-400 font-mono ml-2">{stats.alta} alta</span> ·
                  <span className="text-amber-400 font-mono ml-2">{stats.media} média</span> ·
                  <span className="text-muted-foreground font-mono ml-2">{stats.baixa} baixa</span>
                </p>
              </div>

              {/* Search */}
              <div className="flex gap-3 flex-1 lg:max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, produto, estande..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-border bg-secondary text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Linha de filtros: categoria + prioridade + ordenação */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {CATEGORIES.map((cat) => {
                const count = cat.key === "all" ? allSuppliers.length : allSuppliers.filter(s => s.category === cat.key).length;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setCategory(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      category === cat.key
                        ? 'bg-primary/15 border border-primary/40 text-primary'
                        : 'border border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                  >
                    <span className={cat.color}>{cat.label}</span>
                    <span className="font-mono text-muted-foreground">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {PRIORITIES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPriority(p.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    priority === p.key
                      ? 'bg-primary/15 border border-primary/40 text-primary'
                      : 'border border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {p.dot && <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />}
                  <span className={p.color || ''}>{p.label}</span>
                </button>
              ))}

              {favoriteIds.size > 0 && (
                <button
                  onClick={() => setOnlyFavorites(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    onlyFavorites
                      ? 'bg-amber-400/15 border border-amber-400/40 text-amber-300'
                      : 'border border-border/50 text-muted-foreground hover:text-amber-300 hover:border-amber-400/40'
                  }`}
                  title="Mostrar apenas favoritos"
                >
                  <Star className={`w-3 h-3 ${onlyFavorites ? 'fill-current' : ''}`} />
                  Só Favoritos ({favoriteIds.size})
                </button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "score" | "years" | "district")}
                  className="px-2 py-1 rounded-md border border-border bg-secondary text-xs focus:outline-none focus:border-primary/50"
                >
                  <option value="score">Score (maior → menor)</option>
                  <option value="years">Anos (mais experiente)</option>
                  <option value="district">Distrito (D1 → D6)</option>
                </select>

                <Link href="/metodologia">
                  <a className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-all">
                    <Info className="w-3 h-3" />
                    Método de Avaliação
                  </a>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Aviso top fornecedores */}
        {priority === "all" && category === "all" && !search && sortBy === "score" && (
          <div className="container pt-6">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4 flex items-start gap-3">
              <Trophy className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-sm text-emerald-400">Lista ordenada por Score de Prioridade de Visita</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Score de 0 a 100 baseado em 5 critérios objetivos: presença no Alibaba (30), anos de operação (25), categoria premium (20), distrito estratégico (15) e andar conhecido (10).
                  Recomendamos visitar primeiro os <span className="text-emerald-400 font-mono font-bold">{stats.alta} fornecedores de prioridade alta</span>.
                  {" "}<Link href="/metodologia"><a className="text-emerald-400 underline hover:no-underline">Ver metodologia completa →</a></Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="container py-8">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum fornecedor encontrado para esta busca.</p>
              <button onClick={() => { setSearch(""); setCategory("all"); setPriority("all"); }} className="mt-3 text-sm text-primary hover:underline">
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              {/* Cabeçalho de colunas — visivel apenas no desktop */}
              <div className="hidden lg:grid items-center px-4 py-2 gap-x-3 rounded-lg mb-1" style={{ gridTemplateColumns: '56px 64px 56px 56px 64px 80px 1fr 160px 48px 76px', background: 'oklch(0.15 0.04 240)' }}>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-center">Rank</span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-center">Score</span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-center">Distrito</span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-center">Andar</span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-center">Portão</span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Estande</span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Nome do Fornecedor</span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Produtos</span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-center">Anos</span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-center">Link</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {paginated.map((supplier, i) => (
                  <SupplierCard key={supplier.id} supplier={supplier} index={i} rank={i + 1} favoriteIds={favoriteIds} />
                ))}
              </div>

              {paginated.length < filtered.length && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="px-6 py-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 text-sm font-medium transition-all"
                  >
                    Carregar mais ({filtered.length - paginated.length} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
