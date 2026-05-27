// =============================================================================
// Yiwu — Página Anotações / Diário
// Lista TODOS os fornecedores do mercado para que o operador de campo possa
// expandir qualquer um e registrar o contato. Status visíveis na lateral,
// busca por nome/categoria/distrito + filtro por status + paginação.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { FileText, Search, X, Filter, ChevronDown } from "lucide-react";
import Header from "@yiwu/components/Header";
import suppliersData from "@yiwu/data/suppliers.json";
import {
  useSupplierNotes,
  STATUS_CONFIG,
  type SupplierStatus,
} from "@/shared/supplier-notes/useSupplierNotes";
import SupplierNotesPanel, { type PrefilledField } from "@/shared/supplier-notes/SupplierNotesPanel";
import { DEFAULT_EDITABLE_FIELDS } from "@/shared/supplier-notes/field-presets";

interface YiwuSupplier {
  id: number;
  name: string;
  category: string;
  district?: string;
  floor?: string;
  booth?: string;
  gate?: string;
  address?: string;
  location?: string;
  years?: string;
  products?: string;
  url?: string;
  source?: string;
  score?: number;
  priority?: "alta" | "media" | "baixa";
  scoreBreakdown?: {
    alibaba: number;
    years: number;
    premium: number;
    district: number;
    floor: number;
  };
}

const PAGE_SIZE = 30;

function priorityLabel(p?: string) {
  if (p === "alta") return "Alta";
  if (p === "media") return "Média";
  if (p === "baixa") return "Baixa";
  return "—";
}

/**
 * Mapeia um YiwuSupplier em retangulozinhos read-only.
 * Cobre identificação + localização + score + url + produtos listados.
 */
function buildYiwuPrefilledFields(s: YiwuSupplier): PrefilledField[] {
  const fields: PrefilledField[] = [
    { label: "Empresa", value: s.name, copyable: true },
    { label: "Categoria (NCM)", value: s.category || "—" },
    { label: "ID Yiwu", value: `#${s.id}` },
    {
      label: "Prioridade",
      value: s.score
        ? `${priorityLabel(s.priority)} · ${s.score}/100`
        : priorityLabel(s.priority),
    },
    { label: "Distrito", value: s.district ? `Distrito ${s.district}` : "—" },
    { label: "Andar", value: s.floor ? `${s.floor}º andar` : "—" },
    { label: "Portão / Booth", value: s.gate || s.booth || "—", copyable: !!(s.gate || s.booth) },
    { label: "Anos no Yiwugo", value: s.years ? `${s.years} anos` : "—" },
  ];

  if (s.address) {
    fields.push({ label: "Endereço", value: s.address, copyable: true, full: true });
  }
  if (s.location && s.location !== s.address) {
    fields.push({ label: "Localização exata", value: s.location, copyable: true, full: true });
  }
  if (s.url) {
    fields.push({
      label: "Página Yiwugo / Alibaba",
      value: s.url,
      href: s.url,
      full: true,
    });
  }
  if (s.products) {
    fields.push({ label: "Produtos listados", value: s.products, full: true });
  }
  return fields;
}

export default function YiwuAnotacoes() {
  const { entries, loaded } = useSupplierNotes("yiwu");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | "all" | "with-notes">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const allSuppliers = (suppliersData as { suppliers: YiwuSupplier[] }).suppliers;

  // Status de cada fornecedor (default = nao-visitado)
  const statusOf = (id: number): SupplierStatus =>
    (entries[String(id)]?.status as SupplierStatus) ?? "nao-visitado";

  // Filtragem
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allSuppliers.filter((s) => {
      const status = statusOf(s.id);

      // Filtro por status
      if (statusFilter === "with-notes") {
        if (!entries[String(s.id)]) return false;
      } else if (statusFilter !== "all") {
        if (status !== statusFilter) return false;
      }

      // Busca
      if (q) {
        const hay = `${s.name} ${s.category} ${s.district ?? ""} ${s.floor ?? ""} ${s.booth ?? ""} ${s.address ?? ""}`.toLowerCase();
        const obs = (entries[String(s.id)]?.observacoes ?? "").toLowerCase();
        if (!hay.includes(q) && !obs.includes(q)) return false;
      }
      return true;
    });
  }, [allSuppliers, query, statusFilter, entries]);

  // Paginação
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, statusFilter]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  // Contagem por status (sobre o total)
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      "nao-visitado": 0,
      "contato-feito": 0,
      "amostra-solicitada": 0,
      negociando: 0,
      "fornecedor-aprovado": 0,
      descartado: 0,
    };
    allSuppliers.forEach((s) => {
      const st = statusOf(s.id);
      c[st] = (c[st] ?? 0) + 1;
    });
    return c;
  }, [allSuppliers, entries]);

  const totalWithNotes = Object.keys(entries).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 lg:py-12 max-w-6xl pt-24">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-400 font-mono mb-2">
            <FileText className="w-3.5 h-3.5" />
            Diário de Negociação
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground">
            Anotações de Fornecedores
          </h1>
          <p className="text-muted-foreground mt-2 leading-relaxed max-w-3xl">
            Todos os <span className="font-mono text-cyan-400">{allSuppliers.length}</span> fornecedores do Mercado de Yiwu prontos
            para serem contatados. Clique em qualquer linha para abrir o painel,
            marcar o status, anotar observações e anexar arquivos (PDFs, planilhas, fotos).
          </p>
          {loaded && totalWithNotes > 0 && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              {totalWithNotes} fornecedor{totalWithNotes === 1 ? "" : "es"} com anotações registradas
            </p>
          )}
        </header>

        {/* Resumo + filtro por status */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          {(Object.entries(STATUS_CONFIG) as [SupplierStatus, typeof STATUS_CONFIG[SupplierStatus]][]).map(([key, cfg]) => {
            const active = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(active ? "all" : key)}
                className="rounded-lg border p-3 bg-card text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  borderColor: active ? cfg.border : "var(--border)",
                  background: active ? cfg.bg : undefined,
                  boxShadow: active ? `0 0 0 2px ${cfg.bg}` : "none",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{cfg.emoji}</span>
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold"
                    style={{ color: active ? cfg.color : undefined }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <div
                  className="text-2xl font-bold mt-1"
                  style={{ color: active ? cfg.color : "var(--foreground)" }}
                >
                  {counts[key] ?? 0}
                </div>
              </button>
            );
          })}
        </div>

        {/* Linha de filtros */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(statusFilter !== "all") && (
            <button
              onClick={() => setStatusFilter("all")}
              className="text-xs px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/70 transition-colors flex items-center gap-1.5"
            >
              <X className="w-3 h-3" /> Limpar filtro
            </button>
          )}
          <button
            onClick={() => setStatusFilter(statusFilter === "with-notes" ? "all" : "with-notes")}
            className="text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
            style={{
              background: statusFilter === "with-notes" ? "#0891b2" : "var(--secondary)",
              color: statusFilter === "with-notes" ? "#fff" : undefined,
            }}
          >
            <Filter className="w-3 h-3" />
            Só com anotações
          </button>
          <div className="ml-auto text-xs text-muted-foreground font-mono">
            Mostrando {visible.length} de {filtered.length}
          </div>
        </div>

        {/* Busca */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, categoria, distrito, andar, portão, observação…"
            className="w-full pl-10 pr-10 py-3 rounded-lg bg-card border text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            style={{ borderColor: "var(--border)" }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Lista */}
        {loaded && filtered.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl border border-dashed bg-card"
            style={{ borderColor: "var(--border)" }}
          >
            <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">Nenhum fornecedor encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Tente outra busca ou limpe os filtros.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((s) => {
              const status = statusOf(s.id);
              const cfg = STATUS_CONFIG[status];
              const entry = entries[String(s.id)];
              const isOpen = expandedId === s.id;
              return (
                <div
                  key={s.id}
                  className="rounded-xl border bg-card overflow-hidden transition-all"
                  style={{ borderColor: "var(--border)" }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : s.id)}
                    className="w-full text-left p-4 flex items-start gap-3 hover:bg-secondary/40 transition-colors"
                  >
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}
                      title={cfg.label}
                    >
                      {cfg.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span
                          className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold"
                          style={{
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                          }}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                          {s.category} · ID #{s.id}
                          {s.district ? ` · D${s.district}` : ""}
                          {s.floor ? ` · ${s.floor}` : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-base text-foreground">{s.name}</h3>
                        {s.score !== undefined && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono"
                            style={{
                              background:
                                s.priority === "alta"
                                  ? "rgba(16,185,129,0.12)"
                                  : s.priority === "media"
                                  ? "rgba(245,158,11,0.12)"
                                  : "rgba(115,115,115,0.12)",
                              color:
                                s.priority === "alta"
                                  ? "#34d399"
                                  : s.priority === "media"
                                  ? "#fbbf24"
                                  : "#a3a3a3",
                              border: `1px solid ${
                                s.priority === "alta"
                                  ? "rgba(16,185,129,0.3)"
                                  : s.priority === "media"
                                  ? "rgba(245,158,11,0.3)"
                                  : "rgba(115,115,115,0.3)"
                              }`,
                            }}
                            title={`Prioridade ${priorityLabel(s.priority)} · Score ${s.score}/100`}
                          >
                            {s.score} · {priorityLabel(s.priority).toUpperCase()}
                          </span>
                        )}
                        {s.years && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono text-muted-foreground bg-muted/40">
                            {s.years} anos
                          </span>
                        )}
                        {s.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 border border-cyan-400/20"
                          >
                            ↗ link
                          </a>
                        )}
                      </div>
                      {s.products && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {s.products}
                        </p>
                      )}
                      {entry?.observacoes && (
                        <p className="text-sm text-foreground/80 mt-1 line-clamp-2 italic">
                          “{entry.observacoes}”
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        {s.address && <span>{s.address}</span>}
                        {entry?.updatedAt && <span>· Atualizado em {entry.updatedAt}</span>}
                        {entry && entry.attachments.length > 0 && (
                          <span>
                            · {entry.attachments.length}{" "}
                            {entry.attachments.length === 1 ? "anexo" : "anexos"}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                      <SupplierNotesPanel
                        scope="yiwu"
                        supplierId={String(s.id)}
                        supplierName={s.name}
                        accent="#0891b2"
                        compact
                        prefilledFields={buildYiwuPrefilledFields(s)}
                        editableFields={DEFAULT_EDITABLE_FIELDS}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Carregar mais */}
        {visible.length < filtered.length && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-colors"
            >
              Mostrar mais {Math.min(PAGE_SIZE, filtered.length - visible.length)} fornecedores
            </button>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              {filtered.length - visible.length} restantes
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
