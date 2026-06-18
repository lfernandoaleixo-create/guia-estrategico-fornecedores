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
  filterEntriesByStatus,
  TIPO_CONFIG,
  TIPO_ORDER,
  TipoFornecedor,
  filterEntriesByTipo,
  countFolders,
} from "./useSupplierNotes";
import { FileText, Download, Filter, BarChart3, Calendar, Trash2, Search, X, ChevronDown, Factory, FolderClosed } from "lucide-react";
import {
  SpecialtyFilter,
  filterEntriesBySpecialty,
  countBySpecialty,
} from "./specialtyReport";

// Normaliza texto para busca: minúsculas + remove acentos.
function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ---------- Types ----------
interface ReportPanelProps {
  /** Aceita os scopes fixos (aquario|tapete|yiwu) ou dinâmicos como `grupo-{id}` */
  scope: string;
  scopeLabel: string;
  entries: Record<string, SupplierNoteEntry>;
  resolveSupplierName: (supplierId: string) => string;
  onDeleteEntry?: (supplierId: string) => void;
  /** IDs de todos os fornecedores do dataset — os que não têm entry contam como "Não visitado" */
  allSupplierIds?: string[];
  /** Tom do painel. Se omitido, deriva de scope ("yiwu" e "grupo-*" => dark). */
  tone?: "dark" | "light";
  /** Paleta opcional para o PDF (RGB). Default deriva do scope. */
  pdfPalette?: { primary: number[]; secondary: number[]; accent: number[] };
  /** Habilita o seletor de especialidade (🐟 Aquário x 🦎 Terrário). Usado só no dashboard Aquário. */
  specialtyEnabled?: boolean;
  /** Mapa supplierId -> subtipoAquario marcado no Diário ("aquario"|"terrario"). */
  subtipoById?: Record<string, string | undefined>;
  /** Mapa supplierId -> categoria original do catálogo. */
  categoryById?: Record<string, string | undefined>;
  /** Especialidade inicial selecionada (deriva do atalho ?subtipo=). */
  initialSpecialty?: SpecialtyFilter;
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
  onDeleteEntry,
  allSupplierIds,
  tone,
  pdfPalette,
  specialtyEnabled = false,
  subtipoById,
  categoryById,
  initialSpecialty = "todos",
}: ReportPanelProps) {
  // Dashboards promovidos (grupo-*) e Yiwu usam tom escuro por padrão.
  const dark = tone ? tone === "dark" : (scope === "yiwu" || scope.startsWith("grupo-"));
  // Cor de destaque por dashboard, usada no card de Detalhamento.
  const accentHex =
    scope === "tapete" ? "#0891b2" // ciano
    : scope === "aquario" ? "#ea580c" // laranja
    : scope === "yiwu" ? "#ca8a04" // âmbar
    : "#ea580c"; // grupos promovidos → laranja editorial
  const [period, setPeriod] = useState<PeriodFilter>("todos");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Filtro por status acionado pelos cards de resumo (clique = filtra; clique de novo = limpa).
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | null>(null);
  // Filtro por tipo de fornecedor (Fabricante Direto x Trader/Intermediário).
  const [tipoFilter, setTipoFilter] = useState<TipoFornecedor | null>(null);
  // O card de Detalhamento começa recolhido para otimizar espaço; o usuário expande quando quiser.
  const [detailOpen, setDetailOpen] = useState(false);
  // Filtro por especialidade (🐟 Aquário x 🦎 Terrário). Só ativo quando specialtyEnabled.
  const [specialtyFilter, setSpecialtyFilter] = useState<SpecialtyFilter>(initialSpecialty);
  // Fornecedores migrados para outro destino ficam OCULTOS por padrão (saíram
  // daqui e foram para o destino). O botão "Migrados (N)" mostra apenas eles.
  const [showMigrated, setShowMigrated] = useState(false);

  // Total de fornecedores migrados para outro destino (para o botão de filtro).
  const migratedCount = useMemo(
    () => Object.values(entries).filter((e) => !!e?.fields?.migratedTo).length,
    [entries],
  );

  // Build virtual entries: fornecedores sem entry = "nao-visitado"
  const allEntries = useMemo(() => {
    const real = Object.values(entries);
    if (!allSupplierIds || allSupplierIds.length === 0) return real;
    const existingIds = new Set(real.map((e) => e.supplierId));
    const today = new Date().toLocaleDateString("pt-BR");
    const virtual: SupplierNoteEntry[] = allSupplierIds
      .filter((id) => !existingIds.has(id))
      .map((id) => ({
        supplierId: id,
        status: "nao-visitado" as SupplierStatus,
        observacoes: "",
        fields: {} as Record<string, string>,
        attachments: [],
        quoteRows: [],
        groupIds: [],
        createdAt: today,
        updatedAt: today,
      }));
    return [...real, ...virtual];
  }, [entries, allSupplierIds]);

  // Oculta migrados por padrão; quando showMigrated=true, mostra SOMENTE migrados.
  const migrationFiltered = useMemo(() => {
    return allEntries.filter((e) =>
      showMigrated ? !!e.fields?.migratedTo : !e.fields?.migratedTo,
    );
  }, [allEntries, showMigrated]);

  // Filtra por especialidade ANTES de tudo (quando habilitado).
  const specialtyEntries = useMemo(() => {
    if (!specialtyEnabled || specialtyFilter === "todos") return migrationFiltered;
    return filterEntriesBySpecialty(
      migrationFiltered,
      specialtyFilter,
      subtipoById ?? {},
      categoryById ?? {},
    );
  }, [migrationFiltered, specialtyEnabled, specialtyFilter, subtipoById, categoryById]);

  // Contagem por especialidade para os rótulos do seletor (sobre o universo do período? não:
  // usa todas as entries para refletir o total cadastrado em cada especialidade).
  const specialtyCounts = useMemo(() => {
    if (!specialtyEnabled) return { aquario: 0, terrario: 0, outros: 0 };
    return countBySpecialty(allEntries, subtipoById ?? {}, categoryById ?? {});
  }, [allEntries, specialtyEnabled, subtipoById, categoryById]);

  // Filter entries by period (based on updatedAt)
  const filteredEntries = useMemo(() => {
    return specialtyEntries.filter((e) =>
      isWithinPeriod(e.updatedAt, period, customStart, customEnd)
    );
  }, [specialtyEntries, period, customStart, customEnd]);

  // Filtra pelo status selecionado nos cards de resumo (null = todos).
  const statusFiltered = useMemo<SupplierNoteEntry[]>(
    () => filterEntriesByStatus(filteredEntries, statusFilter),
    [filteredEntries, statusFilter],
  );

  // Filtra pelo tipo de fornecedor selecionado (null = todos).
  const tipoFiltered = useMemo<SupplierNoteEntry[]>(
    () => filterEntriesByTipo(statusFiltered, tipoFilter),
    [statusFiltered, tipoFilter],
  );

  // Filtra a lista detalhada pelo nome do fornecedor (busca em tempo real).
  const searchedEntries = useMemo(() => {
    const q = normalizeSearch(searchTerm.trim());
    if (!q) return tipoFiltered;
    return tipoFiltered.filter((e) =>
      normalizeSearch(resolveSupplierName(e.supplierId)).includes(q)
    );
  }, [tipoFiltered, searchTerm, resolveSupplierName]);

  // Contagem por tipo de fornecedor (no período, respeitando o filtro de status).
  const tipoSummary = useMemo(() => {
    const counts: Record<TipoFornecedor, number> = { direto: 0, trader: 0 };
    statusFiltered.forEach((e) => {
      const t = e.fields?.tipoFornecedor as TipoFornecedor | undefined;
      if (t === "direto" || t === "trader") counts[t]++;
    });
    return counts;
  }, [statusFiltered]);

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
    const folders = countFolders(filteredEntries);
    return { catalogos, fotos, cotacoes, outros, folders };
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
      const periodLabel = formatPeriodLabel(period, customStart, customEnd);
      const now = new Date();
      const dateStr = now.toLocaleDateString("pt-BR");
      const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      // Color palette per scope
      const palette: Record<string, { primary: number[]; secondary: number[]; accent: number[] }> = {
        aquario: { primary: [234, 88, 12], secondary: [255, 237, 213], accent: [194, 65, 12] },
        tapete: { primary: [8, 145, 178], secondary: [207, 250, 254], accent: [14, 116, 144] },
        yiwu: { primary: [202, 138, 4], secondary: [254, 249, 195], accent: [161, 98, 7] },
      };
      // Paleta padrão para dashboards promovidos (laranja editorial).
      const promotedPalette = { primary: [234, 88, 12], secondary: [255, 237, 213], accent: [194, 65, 12] };
      const colors = pdfPalette || palette[scope] || (scope.startsWith("grupo-") ? promotedPalette : palette.yiwu);

      // Status color map (RGB)
      const statusColors: Record<string, number[]> = {
        "nao-visitado": [158, 158, 158],
        "contato-feito": [33, 150, 243],
        "sem-retorno": [121, 85, 72],
        "amostra-solicitada": [255, 152, 0],
        "negociando": [255, 193, 7],
        "aprovado": [76, 175, 80],
        "descartado": [244, 67, 54],
      };

      // ===== PAGE 1: Cover + Summary =====
      // Header band
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, pageWidth, 32, "F");

      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("RELAT\u00d3RIO DE ATIVIDADES", pageWidth / 2, 14, { align: "center" });

      // Subtitle (inclui a especialidade quando filtrada)
      const specialtySuffix =
        specialtyEnabled && specialtyFilter !== "todos"
          ? specialtyFilter === "aquario"
            ? " — Aquário"
            : " — Terrário"
          : "";
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(scopeLabel + specialtySuffix, pageWidth / 2, 22, { align: "center" });

      // Period + date line
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`Per\u00edodo: ${periodLabel}  \u2022  Gerado em ${dateStr} \u00e0s ${timeStr}`, pageWidth / 2, 29, { align: "center" });

      doc.setTextColor(0, 0, 0);

      // Section: Resumo por Status
      let y = 40;
      doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.roundedRect(12, y - 4, pageWidth - 24, 10, 2, 2, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.text("RESUMO POR STATUS", 16, y + 3);
      doc.setTextColor(0, 0, 0);
      y += 12;

      // Status cards as colored table
      const summaryRows = STATUS_ORDER.map((s) => [
        STATUS_CONFIG[s].label,
        String(statusSummary[s]),
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Status", "Quantidade", "% do Total"]],
        body: STATUS_ORDER.map((s) => [
          STATUS_CONFIG[s].label,
          String(statusSummary[s]),
          filteredEntries.length > 0 ? `${((statusSummary[s] / filteredEntries.length) * 100).toFixed(1)}%` : "0%",
        ]).concat([["TOTAL GERAL", String(filteredEntries.length), "100%"]]),
        theme: "grid",
        headStyles: {
          fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
          fontSize: 9,
          fontStyle: "bold",
          textColor: [255, 255, 255],
          halign: "center",
        },
        bodyStyles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: "bold" },
          1: { cellWidth: 30, halign: "center" },
          2: { cellWidth: 30, halign: "center" },
        },
        margin: { left: 14, right: 14 },
        tableWidth: 115,
        didParseCell: (data: any) => {
          if (data.section === "body" && data.row.index < STATUS_ORDER.length) {
            const statusKey = STATUS_ORDER[data.row.index];
            const sc = statusColors[statusKey] || [200, 200, 200];
            if (data.column.index === 0) {
              data.cell.styles.textColor = sc;
            }
            if (data.column.index === 1) {
              data.cell.styles.fillColor = [...sc.map((c: number) => Math.min(255, c + 180))];
              data.cell.styles.textColor = sc;
              data.cell.styles.fontStyle = "bold";
            }
          }
          // Total row bold
          if (data.section === "body" && data.row.index === STATUS_ORDER.length) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [colors.secondary[0], colors.secondary[1], colors.secondary[2]];
          }
        },
      });

      // Attachments summary - visual cards
      const attY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.roundedRect(12, attY - 4, pageWidth - 24, 10, 2, 2, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.text("ANEXOS COLETADOS", 16, attY + 3);
      doc.setTextColor(0, 0, 0);

      const attData = [
        { label: "Catálogos", value: attachmentCounts.catalogos, color: [234, 88, 12] },
        { label: "Fotos", value: attachmentCounts.fotos, color: [124, 58, 237] },
        { label: "Cotações", value: attachmentCounts.cotacoes, color: [5, 150, 105] },
        { label: "Outros", value: attachmentCounts.outros, color: [107, 114, 128] },
        { label: "Pastas anexadas", value: attachmentCounts.folders, color: [124, 58, 237] },
      ];

      const cardW = 45;
      const cardH = 20;
      const cardGap = 8;
      const cardsStartX = (pageWidth - (cardW * attData.length + cardGap * (attData.length - 1))) / 2;
      const cardsY = attY + 10;

      attData.forEach((item, i) => {
        const cx = cardsStartX + i * (cardW + cardGap);
        // Card background
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.roundedRect(cx, cardsY, cardW, cardH, 3, 3, "F");
        // Value
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(String(item.value), cx + cardW / 2, cardsY + 10, { align: "center" });
        // Label
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(item.label, cx + cardW / 2, cardsY + 16, { align: "center" });
      });

      doc.setTextColor(0, 0, 0);

      // ===== PAGE 2+: Detailed table =====
      doc.addPage();

      // Mini header band on detail pages
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, pageWidth, 16, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("DETALHAMENTO POR FORNECEDOR", pageWidth / 2, 10, { align: "center" });
      doc.setTextColor(0, 0, 0);

      const detailRows = filteredEntries.map((e) => {
        const name = resolveSupplierName(e.supplierId);
        const status = STATUS_CONFIG[e.status]?.label || e.status;
        const obs = (e.observacoes || "\u2014").slice(0, 100);
        const catCount = e.attachments.filter((a) => (a.category || "outros") === "catalogos").length;
        const fotoCount = e.attachments.filter((a) => (a.category || "outros") === "fotos").length;
        const cotCount = e.attachments.filter((a) => (a.category || "outros") === "cotacoes").length;
        const quotes = e.quoteRows?.length || 0;
        return [name, status, obs, `${catCount}`, `${fotoCount}`, `${cotCount}`, `${quotes}`, e.updatedAt];
      });

      autoTable(doc, {
        startY: 20,
        head: [["Fornecedor", "Status", "Observa\u00e7\u00f5es", "Cat.", "Fotos", "Cot.", "Quotes", "Atualizado"]],
        body: detailRows,
        theme: "grid",
        headStyles: {
          fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
          fontSize: 8,
          fontStyle: "bold",
          textColor: [255, 255, 255],
          halign: "center",
        },
        bodyStyles: { fontSize: 7, cellPadding: 2.5 },
        alternateRowStyles: {
          fillColor: [colors.secondary[0], colors.secondary[1], colors.secondary[2]],
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: "bold" },
          1: { cellWidth: 30, halign: "center" },
          2: { cellWidth: 85 },
          3: { cellWidth: 12, halign: "center" },
          4: { cellWidth: 12, halign: "center" },
          5: { cellWidth: 12, halign: "center" },
          6: { cellWidth: 14, halign: "center" },
          7: { cellWidth: 24, halign: "center" },
        },
        margin: { left: 12, right: 12 },
        didParseCell: (data: any) => {
          // Color status column
          if (data.section === "body" && data.column.index === 1) {
            const rowIdx = data.row.index;
            if (rowIdx < filteredEntries.length) {
              const entry = filteredEntries[rowIdx];
              const sc = statusColors[entry.status] || [100, 100, 100];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fillColor = sc;
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
        didDrawPage: () => {
          // Repeat mini header on new pages
          doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.rect(0, 0, pageWidth, 16, "F");
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text("DETALHAMENTO POR FORNECEDOR", pageWidth / 2, 10, { align: "center" });
          doc.setTextColor(0, 0, 0);
        },
      });

      // Footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // Footer line
        doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setLineWidth(0.3);
        doc.line(12, pageHeight - 10, pageWidth - 12, pageHeight - 10);
        // Footer text
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Guia Estrat\u00e9gico de Fornecedores  \u2022  ${scopeLabel}`,
          14,
          pageHeight - 5
        );
        doc.text(
          `P\u00e1gina ${i} de ${totalPages}`,
          pageWidth - 14,
          pageHeight - 5,
          { align: "right" }
        );
        doc.setTextColor(0, 0, 0);
      }

      const filename = `relatorio-${scope}-${now.toISOString().slice(0, 10)}.pdf`;
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

      {/* Seletor de especialidade (🐟 Aquário x 🦎 Terrário) — separa as métricas. */}
      {specialtyEnabled && (
        <div className={`p-4 rounded-xl border ${dark ? 'border-zinc-700/50 bg-zinc-900/50' : 'border-emerald-200 bg-emerald-50/40'}`}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className={dark ? 'text-zinc-400' : 'text-emerald-600'} />
            <span className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Especialidade
            </span>
            <span className={`text-[11px] font-normal normal-case tracking-normal ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              · métricas separadas por tipo
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "todos", label: "Todos", emoji: "🌐", count: specialtyCounts.aquario + specialtyCounts.terrario + specialtyCounts.outros },
                { key: "aquario", label: "Aquário", emoji: "🐟", count: specialtyCounts.aquario },
                { key: "terrario", label: "Terrário", emoji: "🦎", count: specialtyCounts.terrario },
              ] as { key: SpecialtyFilter; label: string; emoji: string; count: number }[]
            ).map(({ key, label, emoji, count }) => {
              const active = specialtyFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSpecialtyFilter(key)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all active:scale-[0.97] ${
                    active
                      ? "bg-emerald-600 text-white shadow-sm"
                      : dark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                  <span className={`tabular-nums rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/25 text-white" : dark ? "bg-zinc-700 text-zinc-200" : "bg-zinc-100 text-zinc-600"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          {specialtyFilter !== "todos" && (
            <div className={`mt-2.5 text-[11px] ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Mostrando apenas fornecedores de <strong>{specialtyFilter === "aquario" ? "🐟 Aquário" : "🦎 Terrário"}</strong>. Equipamentos e outras categorias aparecem apenas em “Todos”.
            </div>
          )}
        </div>
      )}

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
        {migratedCount > 0 && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: dark ? "rgba(63,63,70,0.5)" : "#e4e4e7" }}>
            <button
              type="button"
              onClick={() => setShowMigrated((v) => !v)}
              aria-pressed={showMigrated}
              title={showMigrated ? "Voltar a ocultar os migrados" : "Ver apenas os fornecedores migrados para outro destino"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all active:scale-[0.97] ${
                showMigrated
                  ? "bg-violet-600 text-white shadow-sm"
                  : dark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <span>{showMigrated ? "Mostrando migrados" : "Migrados"}</span>
              <span className={`tabular-nums rounded-full px-1.5 py-0.5 text-[10px] font-bold ${showMigrated ? "bg-white/25 text-white" : dark ? "bg-zinc-700 text-zinc-200" : "bg-zinc-100 text-zinc-600"}`}>
                {migratedCount}
              </span>
            </button>
            {showMigrated && (
              <span className={`text-[11px] ${dark ? "text-zinc-400" : "text-zinc-500"}`}>
                Fornecedores que saíram deste dashboard para outro destino.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status Summary Cards — clicáveis para filtrar a lista (toggle) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STATUS_ORDER.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = statusSummary[s];
          const active = statusFilter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === s ? null : s))}
              aria-pressed={active}
              title={active ? `Mostrando só “${cfg.label}” · clique para ver todos` : `Filtrar por “${cfg.label}”`}
              className="p-3 rounded-lg border text-center transition-all cursor-pointer hover:-translate-y-0.5 active:scale-[0.97] focus:outline-none"
              style={{
                borderColor: active ? cfg.bg : count > 0 ? cfg.border : "rgba(63,63,70,0.4)",
                background: active ? `${cfg.bg}26` : count > 0 ? `${cfg.bg}15` : "transparent",
                boxShadow: active ? `0 0 0 2px ${cfg.bg}` : "none",
              }}
            >
              <div className="text-lg mb-0.5">{cfg.emoji}</div>
              <div className={`text-xl font-bold ${dark ? 'text-zinc-100' : 'text-zinc-800'}`}>{count}</div>
              <div className={`text-[9px] leading-tight mt-0.5 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Card de resumo por tipo de fornecedor (Fabricante Direto x Trader).
          Cada bloco é clicável e funciona também como filtro. */}
      <div className={`rounded-xl border p-3 ${dark ? 'bg-zinc-800/40 border-zinc-700/50' : 'bg-white border-zinc-200'}`}>
        <div className={`flex items-center gap-1.5 mb-2.5 text-[11px] font-semibold uppercase tracking-wider ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          <Factory size={13} /> Tipo de fornecedor
          <span className={`font-normal normal-case tracking-normal ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>· clique para filtrar</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {TIPO_ORDER.map((t) => {
            const cfg = TIPO_CONFIG[t];
            const active = tipoFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTipoFilter((prev) => (prev === t ? null : t))}
                aria-pressed={active}
                title={active ? `Mostrando só “${cfg.label}” · clique para ver todos` : `Filtrar por “${cfg.label}”`}
                className="flex items-center gap-3 px-3.5 py-3 rounded-lg border text-left transition-all cursor-pointer active:scale-[0.98] focus:outline-none"
                style={{
                  borderColor: active ? cfg.color : (dark ? "#3f3f46" : cfg.border),
                  background: active ? cfg.bg : (dark ? "rgba(255,255,255,0.02)" : `${cfg.bg}55`),
                  boxShadow: active ? `0 0 0 1.5px ${cfg.color}` : "none",
                }}
              >
                <span
                  className="shrink-0 w-9 h-9 rounded-full inline-flex items-center justify-center text-base"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                >
                  {cfg.emoji}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="text-2xl font-bold leading-none tabular-nums" style={{ color: cfg.color }}>
                    {tipoSummary[t]}
                  </span>
                  <span className={`text-[11px] font-medium mt-1 leading-tight ${dark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {cfg.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aviso de filtro ativo por status */}
      {statusFilter && (
        <div className={`flex items-center justify-between gap-3 px-4 py-2 rounded-lg border text-xs ${dark ? 'bg-zinc-800/60 border-zinc-700/40 text-zinc-300' : 'bg-amber-50 border-amber-200 text-zinc-700'}`}>
          <span className="inline-flex items-center gap-1.5">
            <Filter size={12} /> Filtrando por <strong>{STATUS_CONFIG[statusFilter].label}</strong>
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter(null)}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${dark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-amber-100 text-amber-700'}`}
          >
            <X size={12} /> Limpar filtro
          </button>
        </div>
      )}

      {/* Total bar */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${dark ? 'bg-zinc-800/60 border-zinc-700/40' : 'bg-amber-50 border-amber-200'}`}>
        <span className={`text-sm font-medium ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Total de fornecedores no período
        </span>
        <span className={`text-lg font-bold ${dark ? 'text-amber-400' : 'text-amber-600'}`}>{filteredEntries.length}</span>
      </div>

      {/* Attachment summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {[
          { label: "Catálogos", count: attachmentCounts.catalogos, color: "#f59e0b" },
          { label: "Fotos", count: attachmentCounts.fotos, color: "#8b5cf6" },
          { label: "Cotações", count: attachmentCounts.cotacoes, color: "#10b981" },
          { label: "Outros", count: attachmentCounts.outros, color: "#6b7280" },
          { label: "Pastas anexadas", count: attachmentCounts.folders, color: "#7c3aed" },
        ].map((item) => (
          <div
            key={item.label}
            className={`p-3 rounded-lg border flex items-center gap-3 ${dark ? 'border-zinc-700/40 bg-zinc-900/40' : 'border-zinc-200 bg-white'}`}
          >
            {item.label === "Pastas anexadas" ? (
              <FolderClosed size={18} style={{ color: item.color }} className="flex-shrink-0" />
            ) : (
              <div
                className="w-2 h-8 rounded-full"
                style={{ background: item.color }}
              />
            )}
            <div>
              <div className={`text-sm font-bold ${dark ? 'text-zinc-100' : 'text-zinc-800'}`}>{item.count}</div>
              <div className="text-[10px] text-zinc-500">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed List — card recolhível, colorido e destacado */}
      <div
        className="rounded-2xl overflow-hidden shadow-sm transition-shadow hover:shadow-md"
        style={{
          border: `1.5px solid ${accentHex}55`,
          background: detailOpen
            ? (dark ? "rgba(24,24,27,0.55)" : "#ffffff")
            : `linear-gradient(135deg, ${accentHex}1f 0%, ${accentHex}0d 55%, transparent 100%)`,
        }}
      >
        <button
          type="button"
          onClick={() => setDetailOpen((o) => !o)}
          aria-expanded={detailOpen}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer active:scale-[0.997] focus:outline-none"
        >
          <span
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl shrink-0 shadow-sm"
            style={{ background: accentHex, color: "#ffffff" }}
          >
            <FileText size={17} />
          </span>
          <div className="min-w-0">
            <div
              className="text-sm font-bold uppercase tracking-wide"
              style={{ color: accentHex }}
            >
              Detalhamento de Fornecedores
            </div>
            <div className={`text-[11px] font-medium ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {searchedEntries.length}
              {(searchTerm.trim() || statusFilter || tipoFilter) ? ` de ${filteredEntries.length}` : ''} fornecedor(es)
              {detailOpen ? '' : ' · toque para expandir'}
            </div>
          </div>
          <span
            className="ml-auto inline-flex items-center justify-center h-7 w-7 rounded-full shrink-0 transition-transform duration-200"
            style={{
              background: `${accentHex}1f`,
              color: accentHex,
              transform: detailOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <ChevronDown size={16} />
          </span>
        </button>

        {detailOpen && (
        <div className="px-4 pb-4 pt-1">

        {/* Barra de pesquisa por nome do fornecedor */}
        <div className="relative mb-3">
          <Search
            size={15}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar fornecedor pelo nome…"
            className={`w-full rounded-lg border pl-9 pr-9 py-2 text-sm outline-none transition-colors focus:ring-2 ${
              dark
                ? 'border-zinc-700 bg-zinc-900/60 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-zinc-700/50'
                : 'border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-zinc-200'
            }`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors ${dark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
              title="Limpar busca"
              type="button"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            Nenhum fornecedor encontrado no período selecionado.
          </div>
        ) : searchedEntries.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            {searchTerm.trim() ? (
              <>Nenhum fornecedor encontrado para <span className="font-medium">“{searchTerm.trim()}”</span>.</>
            ) : statusFilter ? (
              <>Nenhum fornecedor com o status <span className="font-medium">“{STATUS_CONFIG[statusFilter].label}”</span> no período.</>
            ) : tipoFilter ? (
              <>Nenhum fornecedor do tipo <span className="font-medium">“{TIPO_CONFIG[tipoFilter].label}”</span> no período.</>
            ) : (
              <>Nenhum fornecedor encontrado.</>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {searchedEntries
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
                      <span className={`flex-1 min-w-0 text-sm font-medium truncate ${dark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                        {name}
                      </span>
                      {entry.fields?.migratedTo ? (
                        <span
                          className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                          style={{ background: "#8b5cf618", color: "#7c3aed", border: "1px solid #8b5cf655" }}
                          title={`Migrado para ${entry.fields.migratedTo}`}
                        >
                          Migrado → {entry.fields.migratedTo}
                        </span>
                      ) : (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
                          style={{
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                          }}
                        >
                          {cfg.label}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500 ml-2">
                        {entry.updatedAt}
                      </span>
                      <span className="text-zinc-500 text-xs">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                      {onDeleteEntry && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Excluir anotação de "${name}"?`)) {
                              onDeleteEntry(entry.supplierId);
                            }
                          }}
                          className={`ml-1 p-1.5 rounded-md transition-colors ${dark ? 'hover:bg-red-900/40 text-zinc-500 hover:text-red-400' : 'hover:bg-red-50 text-zinc-400 hover:text-red-500'}`}
                          title="Excluir anotação"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
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
        )}
      </div>
    </div>
  );
}
