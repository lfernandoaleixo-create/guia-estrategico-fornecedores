// =============================================================================
// ReportPanel — Painel de Relatórios compartilhado pelos 3 dashboards
// Exibe somatório por status, filtros de período, listagem detalhada e exporta PDF.
// =============================================================================

import { useState, useMemo } from "react";
import {
  SupplierNoteEntry,
  SupplierStatus,
  STATUS_CONFIG,
  STATUS_ORDER,
  AttachmentCategory,
} from "./useSupplierNotes";
import { FileText, Download, Filter, BarChart3, Calendar } from "lucide-react";

// ---------- Types ----------
interface ReportPanelProps {
  scope: "aquario" | "tapete" | "yiwu";
  scopeLabel: string;
  entries: Record<string, SupplierNoteEntry>;
  resolveSupplierName: (supplierId: string) => string;
  tone?: "dark" | "light";
}

type PeriodFilter = "todos" | "hoje" | "7dias" | "30dias" | "personalizado";

// ---------- Helpers ----------
function parseBRDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  return new Date(y, m - 1, d);
}

function isWithinPeriod(
  dateStr: string,
  period: PeriodFilter,
  customStart?: string,
  customEnd?: string
): boolean {
  if (period === "todos") return true;
  const date = parseBRDate(dateStr);
  if (!date) return false;
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  if (period === "hoje") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return date >= start && date <= now;
  }
  if (period === "7dias") {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return date >= start && date <= now;
  }
  if (period === "30dias") {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return date >= start && date <= now;
  }
  if (period === "personalizado" && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  }
  return true;
}

function formatPeriodLabel(period: PeriodFilter, customStart?: string, customEnd?: string): string {
  if (period === "todos") return "Todo o período";
  if (period === "hoje") return "Hoje";
  if (period === "7dias") return "Últimos 7 dias";
  if (period === "30dias") return "Últimos 30 dias";
  if (period === "personalizado" && customStart && customEnd) {
    const s = new Date(customStart).toLocaleDateString("pt-BR");
    const e = new Date(customEnd).toLocaleDateString("pt-BR");
    return `${s} a ${e}`;
  }
  return "Período personalizado";
}

// ---------- Component ----------
export default function ReportPanel({
  scope,
  scopeLabel,
  entries,
  resolveSupplierName,
}: ReportPanelProps) {
  const dark = (scope === "yiwu");
  const [period, setPeriod] = useState<PeriodFilter>("todos");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Filter entries by period (based on updatedAt)
  const filteredEntries = useMemo(() => {
    return Object.values(entries).filter((e) =>
      isWithinPeriod(e.updatedAt, period, customStart, customEnd)
    );
  }, [entries, period, customStart, customEnd]);

  // Summary by status
  const statusSummary = useMemo(() => {
    const counts: Record<SupplierStatus, number> = {} as any;
    STATUS_ORDER.forEach((s) => (counts[s] = 0));
    filteredEntries.forEach((e) => {
      if (counts[e.status] !== undefined) counts[e.status]++;
    });
    return counts;
  }, [filteredEntries]);

  // Attachment counts
  const attachmentCounts = useMemo(() => {
    let catalogos = 0,
      fotos = 0,
      cotacoes = 0,
      outros = 0;
    filteredEntries.forEach((e) => {
      e.attachments.forEach((a) => {
        const cat = a.category || "outros";
        if (cat === "catalogos") catalogos++;
        else if (cat === "fotos") fotos++;
        else if (cat === "cotacoes") cotacoes++;
        else outros++;
      });
    });
    return { catalogos, fotos, cotacoes, outros };
  }, [filteredEntries]);

  // Generate PDF
  const handleExportPDF = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`Relatório de Fornecedores — ${scopeLabel}`, 14, 18);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      const periodLabel = formatPeriodLabel(period, customStart, customEnd);
      doc.text(
        `Período: ${periodLabel}  |  Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        14,
        25
      );
      doc.setTextColor(0);

      // Summary table
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo por Status", 14, 34);

      const summaryRows = STATUS_ORDER.map((s) => [
        STATUS_CONFIG[s].label,
        String(statusSummary[s]),
      ]);
      summaryRows.push(["TOTAL", String(filteredEntries.length)]);

      autoTable(doc, {
        startY: 37,
        head: [["Status", "Qtd"]],
        body: summaryRows,
        theme: "grid",
        headStyles: { fillColor: [55, 55, 55], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 20, halign: "center" } },
        margin: { left: 14 },
        tableWidth: 70,
      });

      // Attachments summary
      const attY = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Anexos no período:", 14, attY);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Catálogos: ${attachmentCounts.catalogos}  |  Fotos: ${attachmentCounts.fotos}  |  Cotações: ${attachmentCounts.cotacoes}  |  Outros: ${attachmentCounts.outros}`,
        14,
        attY + 5
      );

      // Detailed table - new page
      doc.addPage();
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Detalhamento por Fornecedor", 14, 18);

      const detailRows = filteredEntries.map((e) => {
        const name = resolveSupplierName(e.supplierId);
        const status = STATUS_CONFIG[e.status]?.label || e.status;
        const obs = (e.observacoes || "—").slice(0, 120);
        const catCount = e.attachments.filter((a) => (a.category || "outros") === "catalogos").length;
        const fotoCount = e.attachments.filter((a) => (a.category || "outros") === "fotos").length;
        const cotCount = e.attachments.filter((a) => (a.category || "outros") === "cotacoes").length;
        const quotes = e.quoteRows?.length || 0;
        return [
          name,
          status,
          obs,
          `${catCount}`,
          `${fotoCount}`,
          `${cotCount}`,
          `${quotes}`,
          e.updatedAt,
        ];
      });

      autoTable(doc, {
        startY: 22,
        head: [["Fornecedor", "Status", "Observações", "Cat.", "Fotos", "Cot.", "Quotes", "Atualizado"]],
        body: detailRows,
        theme: "striped",
        headStyles: { fillColor: [55, 55, 55], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 28 },
          2: { cellWidth: 95 },
          3: { cellWidth: 12, halign: "center" },
          4: { cellWidth: 12, halign: "center" },
          5: { cellWidth: 12, halign: "center" },
          6: { cellWidth: 14, halign: "center" },
          7: { cellWidth: 22, halign: "center" },
        },
        margin: { left: 14, right: 14 },
      });

      // Footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
          `Guia Estratégico de Fornecedores — ${scopeLabel} — Página ${i}/${totalPages}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: "center" }
        );
        doc.setTextColor(0);
      }

      const filename = `relatorio-${scope}-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-amber-500" />
          <h3 className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-400">
            Relatório de Atividades
          </h3>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={generating || filteredEntries.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          <Download size={14} />
          {generating ? "Gerando..." : "Exportar PDF"}
        </button>
      </div>

      {/* Period Filter */}
      <div className={`p-4 rounded-xl border ${dark ? 'border-zinc-700/50 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className={dark ? 'text-zinc-400' : 'text-zinc-500'} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Período
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "todos", label: "Todos" },
              { key: "hoje", label: "Hoje" },
              { key: "7dias", label: "7 dias" },
              { key: "30dias", label: "30 dias" },
              { key: "personalizado", label: "Personalizado" },
            ] as { key: PeriodFilter; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                period === key
                  ? "bg-amber-600 text-white"
                  : dark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {period === "personalizado" && (
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-zinc-500" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className={`rounded px-2 py-1 text-xs border ${dark ? 'bg-zinc-800 border-zinc-600 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'}`}
              />
            </div>
            <span className="text-zinc-500 text-xs self-center">até</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className={`rounded px-2 py-1 text-xs border ${dark ? 'bg-zinc-800 border-zinc-600 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STATUS_ORDER.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = statusSummary[s];
          return (
            <div
              key={s}
              className="p-3 rounded-lg border text-center transition-all"
              style={{
                borderColor: count > 0 ? cfg.border : "rgba(63,63,70,0.4)",
                background: count > 0 ? `${cfg.bg}15` : "transparent",
              }}
            >
              <div className="text-lg mb-0.5">{cfg.emoji}</div>
              <div className={`text-xl font-bold ${dark ? 'text-zinc-100' : 'text-zinc-800'}`}>{count}</div>
              <div className={`text-[9px] leading-tight mt-0.5 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Total bar */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${dark ? 'bg-zinc-800/60 border-zinc-700/40' : 'bg-amber-50 border-amber-200'}`}>
        <span className={`text-sm font-medium ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Total de fornecedores no período
        </span>
        <span className={`text-lg font-bold ${dark ? 'text-amber-400' : 'text-amber-600'}`}>{filteredEntries.length}</span>
      </div>

      {/* Attachment summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Catálogos", count: attachmentCounts.catalogos, color: "#f59e0b" },
          { label: "Fotos", count: attachmentCounts.fotos, color: "#8b5cf6" },
          { label: "Cotações", count: attachmentCounts.cotacoes, color: "#10b981" },
          { label: "Outros", count: attachmentCounts.outros, color: "#6b7280" },
        ].map((item) => (
          <div
            key={item.label}
            className={`p-3 rounded-lg border flex items-center gap-3 ${dark ? 'border-zinc-700/40 bg-zinc-900/40' : 'border-zinc-200 bg-white'}`}
          >
            <div
              className="w-2 h-8 rounded-full"
              style={{ background: item.color }}
            />
            <div>
              <div className={`text-sm font-bold ${dark ? 'text-zinc-100' : 'text-zinc-800'}`}>{item.count}</div>
              <div className="text-[10px] text-zinc-500">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed List */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} className={dark ? 'text-zinc-400' : 'text-zinc-500'} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Detalhamento ({filteredEntries.length} fornecedores)
          </span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            Nenhum fornecedor encontrado no período selecionado.
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredEntries
              .sort((a, b) => {
                const dateA = parseBRDate(a.updatedAt)?.getTime() || 0;
                const dateB = parseBRDate(b.updatedAt)?.getTime() || 0;
                return dateB - dateA;
              })
              .map((entry) => {
                const cfg = STATUS_CONFIG[entry.status];
                const name = resolveSupplierName(entry.supplierId);
                const isExpanded = expandedId === entry.supplierId;
                const catCount = entry.attachments.filter(
                  (a) => (a.category || "outros") === "catalogos"
                ).length;
                const fotoCount = entry.attachments.filter(
                  (a) => (a.category || "outros") === "fotos"
                ).length;
                const cotCount = entry.attachments.filter(
                  (a) => (a.category || "outros") === "cotacoes"
                ).length;

                return (
                  <div
                    key={entry.supplierId}
                    className={`rounded-lg border overflow-hidden transition-all ${dark ? 'border-zinc-700/50 bg-zinc-900/60' : 'border-zinc-200 bg-white'}`}
                  >
                    {/* Row header */}
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : entry.supplierId)
                      }
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${dark ? 'hover:bg-zinc-800/40' : 'hover:bg-zinc-50'}`}
                    >
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-xs"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.emoji}
                      </span>
                      <span className={`flex-1 text-sm font-medium truncate ${dark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                        {name}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: cfg.bg,
                          color: cfg.color,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-zinc-500 ml-2">
                        {entry.updatedAt}
                      </span>
                      <span className="text-zinc-500 text-xs">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className={`px-4 pb-4 pt-1 border-t space-y-3 ${dark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                        {/* Observações */}
                        {entry.observacoes && (
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                              Observações
                            </span>
                            <p className={`text-xs mt-1 whitespace-pre-wrap ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                              {entry.observacoes}
                            </p>
                          </div>
                        )}

                        {/* Anexos resumo */}
                        <div className="flex flex-wrap gap-3">
                          {catCount > 0 && (
                            <span className="text-[10px] text-amber-400">
                              📁 {catCount} catálogo(s)
                            </span>
                          )}
                          {fotoCount > 0 && (
                            <span className="text-[10px] text-purple-400">
                              📷 {fotoCount} foto(s)
                            </span>
                          )}
                          {cotCount > 0 && (
                            <span className="text-[10px] text-emerald-400">
                              💰 {cotCount} cotação(ões)
                            </span>
                          )}
                        </div>

                        {/* Quote rows */}
                        {entry.quoteRows && entry.quoteRows.length > 0 && (
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                              Cotações detalhadas
                            </span>
                            <div className="mt-1 overflow-x-auto">
                              <table className="w-full text-[10px] text-zinc-300">
                                <thead>
                                  <tr className="text-zinc-500 border-b border-zinc-700">
                                    <th className="text-left py-1 pr-2">Produto</th>
                                    <th className="text-left py-1 pr-2">Qtd</th>
                                    <th className="text-left py-1 pr-2">MOQ</th>
                                    <th className="text-left py-1 pr-2">FOB</th>
                                    <th className="text-left py-1 pr-2">Lead</th>
                                    <th className="text-left py-1">Obs</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entry.quoteRows.map((q) => (
                                    <tr
                                      key={q.id}
                                      className="border-b border-zinc-800/50"
                                    >
                                      <td className="py-1 pr-2">{q.produto}</td>
                                      <td className="py-1 pr-2">{q.qtd}</td>
                                      <td className="py-1 pr-2">{q.moq}</td>
                                      <td className="py-1 pr-2">{q.precoFob}</td>
                                      <td className="py-1 pr-2">{q.leadTime}</td>
                                      <td className="py-1">{q.observacao}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Dates */}
                        <div className="flex gap-4 text-[10px] text-zinc-500">
                          <span>Criado: {entry.createdAt}</span>
                          <span>Atualizado: {entry.updatedAt}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
