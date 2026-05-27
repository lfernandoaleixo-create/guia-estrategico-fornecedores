// =============================================================================
// Yiwu — Página Anotações / Diário
// Lista todos os fornecedores que já têm nota gravada + permite editar
// inline cada um via SupplierNotesPanel.
// =============================================================================

import { useMemo, useState } from "react";
import { FileText, Search, X } from "lucide-react";
import Header from "@yiwu/components/Header";
import suppliersData from "@yiwu/data/suppliers.json";
import {
  useSupplierNotes,
  STATUS_CONFIG,
  type SupplierNoteEntry,
} from "@/shared/supplier-notes/useSupplierNotes";
import SupplierNotesPanel from "@/shared/supplier-notes/SupplierNotesPanel";

interface YiwuSupplier {
  id: number;
  name: string;
  category: string;
  district?: string;
  floor?: string;
  booth?: string;
  address?: string;
}

export default function YiwuAnotacoes() {
  const { entries, loaded } = useSupplierNotes("yiwu");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const suppliers = (suppliersData as { suppliers: YiwuSupplier[] }).suppliers;

  const supplierById = useMemo(() => {
    const m = new Map<number, YiwuSupplier>();
    suppliers.forEach((s) => m.set(s.id, s));
    return m;
  }, [suppliers]);

  // Lista de notas existentes, ordenadas por updatedAt desc
  const noteList: Array<SupplierNoteEntry & { supplier: YiwuSupplier | undefined }> = useMemo(() => {
    return Object.values(entries)
      .map((e) => ({ ...e, supplier: supplierById.get(Number(e.supplierId)) }))
      .filter((e) => {
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return (
          (e.supplier?.name ?? "").toLowerCase().includes(q) ||
          (e.observacoes ?? "").toLowerCase().includes(q) ||
          (e.supplier?.address ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
  }, [entries, query, supplierById]);

  // Contagem por status
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    Object.values(entries).forEach((e) => {
      c[e.status] = (c[e.status] ?? 0) + 1;
    });
    return c;
  }, [entries]);

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
          Registros salvos localmente neste navegador. Use para acompanhar visitas,
          condições negociadas, amostras solicitadas e arquivos enviados pelos
          fornecedores do Mercado de Yiwu.
        </p>
      </header>

      {/* Resumo por status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div
            key={key}
            className="rounded-lg border p-3 bg-card"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">{cfg.emoji}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {cfg.label}
              </span>
            </div>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {counts[key] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome do fornecedor, observação ou endereço…"
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

      {/* Estado vazio */}
      {loaded && noteList.length === 0 && (
        <div
          className="text-center py-16 rounded-xl border border-dashed bg-card"
          style={{ borderColor: "var(--border)" }}
        >
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold mb-1">
            {query ? "Nenhuma anotação encontrada" : "Nenhuma anotação ainda"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {query
              ? "Tente um termo diferente."
              : "Vá em Fornecedores, clique no ícone de bloco de notas ao lado de cada empresa e registre seu primeiro contato."}
          </p>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {noteList.map((entry) => {
          const cfg = STATUS_CONFIG[entry.status];
          const isOpen = expandedId === Number(entry.supplierId);
          return (
            <div
              key={entry.supplierId}
              className="rounded-xl border bg-card overflow-hidden transition-all"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedId(isOpen ? null : Number(entry.supplierId))
                }
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-secondary/40 transition-colors"
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                >
                  {cfg.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold"
                      style={{
                        background: cfg.bg,
                        color: cfg.color,
                        border: `1px solid ${cfg.border}`,
                      }}
                    >
                      {cfg.label}
                    </span>
                    {entry.supplier && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {entry.supplier.category} · ID #{entry.supplier.id}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-foreground">
                    {entry.supplier?.name ?? `Fornecedor #${entry.supplierId}`}
                  </h3>
                  {entry.observacoes && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {entry.observacoes}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>Atualizado em {entry.updatedAt}</span>
                    {entry.attachments.length > 0 && (
                      <span>
                        {entry.attachments.length}{" "}
                        {entry.attachments.length === 1 ? "anexo" : "anexos"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  {isOpen ? "▲" : "▼"}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                  <SupplierNotesPanel
                    scope="yiwu"
                    supplierId={String(entry.supplierId)}
                    supplierName={entry.supplier?.name}
                    accent="#0891b2"
                    compact
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      </main>
    </div>
  );
}
