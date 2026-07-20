// =============================================================================
// QuotationTable — Tabela de Cotações editável e persistente por dashboard.
//
// Funcionalidades:
// - Títulos de colunas editáveis (duplo-clique)
// - Células editáveis inline (clique)
// - Colunas reordenáveis via drag & drop (HTML5 nativo)
// - Filtro classificatório por coluna (asc/desc + busca textual)
// - Botão "Limpar todos os filtros"
// - Auto-save com debounce (~800ms) via tRPC
// - Adicionar/excluir linhas
// =============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  XCircle,
  Table2,
  Check,
  Pencil,
  Copy,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Column {
  id: string;
  title: string;
}

interface Row {
  id: string;
  cells: Record<string, string>;
}

interface SortState {
  columnId: string;
  direction: "asc" | "desc";
}

interface FilterState {
  [columnId: string]: string; // busca textual por coluna
}

// ─── Colunas padrão ──────────────────────────────────────────────────────────
const DEFAULT_COLUMNS: Column[] = [
  { id: "col_item", title: "Item" },
  { id: "col_variacao", title: "Variação" },
  { id: "col_peso", title: "Peso" },
  { id: "col_especificacao", title: "Especificação" },
  { id: "col_qualidade", title: "Qualidade" },
  { id: "col_unid_pacote", title: "Unidades por Pacotes" },
  { id: "col_pac_caixa", title: "Pacotes por Caixa" },
  { id: "col_caixa_40hq", title: "Caixa em 40HQ" },
  { id: "col_qtde_pacotes", title: "Qtde Pacotes" },
  { id: "col_preco_unit", title: "Preço Unitário" },
  { id: "col_preco_pacote", title: "Preço do Pacote" },
];

let _rowCounter = 0;
function genRowId() {
  return `row_${Date.now()}_${++_rowCounter}`;
}

let _colCounter = 0;
function genColId() {
  return `col_${Date.now()}_${++_colCounter}`;
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  scope: string;
  accent?: string;
  tone?: "light" | "dark";
}

// ─── FilterInput (campo de filtro com dropdown de sugestões) ─────────────────
interface FilterInputProps {
  colId: string;
  value: string;
  onChange: (v: string) => void;
  rows: Row[];
  isDark: boolean;
}

function FilterInput({ colId, value, onChange, rows, isDark }: FilterInputProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Valores únicos já preenchidos nesta coluna (sem vazios)
  const suggestions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      const v = (row.cells[colId] ?? "").trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [rows, colId]);

  // Filtra sugestões pelo que o usuário digitou
  const filtered = useMemo(() => {
    if (!value.trim()) return suggestions;
    const t = value.trim().toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(t));
  }, [suggestions, value]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const inputCls = isDark
    ? "w-full bg-white/5 border border-white/15 rounded px-1.5 py-0.5 text-[11px] text-white/80 placeholder:text-white/30 outline-none focus:border-white/40"
    : "w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 text-[11px] text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-zinc-400";

  const dropdownCls = isDark
    ? "absolute z-50 top-full left-0 mt-0.5 min-w-[180px] max-h-40 overflow-y-auto rounded border border-white/20 bg-zinc-900 shadow-lg"
    : "absolute z-50 top-full left-0 mt-0.5 min-w-[180px] max-h-40 overflow-y-auto rounded border border-zinc-200 bg-white shadow-lg";

  const itemCls = isDark
    ? "px-2 py-1 text-[11px] text-white/80 hover:bg-white/10 cursor-pointer whitespace-normal break-words"
    : "px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100 cursor-pointer whitespace-normal break-words";

  return (
    <div ref={wrapperRef} className="relative">
      <input
        className={inputCls}
        placeholder="Buscar…"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && filtered.length > 0 && (
        <div className={dropdownCls}>
          {filtered.map((s) => (
            <div
              key={s}
              className={itemCls}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setOpen(false);
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Componente ──────────────────────────────────────────────────────────────
export function QuotationTable({ scope, accent = "#0891b2", tone = "dark" }: Props) {
  const isDark = tone === "dark";

  // ── Dados do servidor ──────────────────────────────────────────────────────
  const { data, isLoading } = trpc.data.quotationTables.get.useQuery(
    { scope },
    { staleTime: 30_000 },
  );
  const upsertMut = trpc.data.quotationTables.upsert.useMutation();

  // ── Estado local (draft) ───────────────────────────────────────────────────
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [rows, setRows] = useState<Row[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [expanded, setExpanded] = useState(false); // começa retraída

  // Sincroniza com o servidor na primeira carga (e recalcula fórmulas em linhas existentes)
  useEffect(() => {
    if (initialized) return;
    if (isLoading) return;
    if (data) {
      // Mesclar colunas do banco com DEFAULT_COLUMNS para garantir que novas colunas (ex: col_qtde_pacotes) existam
      const savedCols = data.columns as Column[];
      const savedIds = new Set(savedCols.map((c) => c.id));
      const missingDefaults = DEFAULT_COLUMNS.filter((dc) => !savedIds.has(dc.id));
      // Inserir colunas faltantes na posição correta
      let mergedCols = [...savedCols];
      for (const mc of missingDefaults) {
        const defaultIdx = DEFAULT_COLUMNS.findIndex((d) => d.id === mc.id);
        // Encontrar a posição de inserção baseada na coluna anterior no DEFAULT
        let insertAt = mergedCols.length;
        if (defaultIdx > 0) {
          const prevDefault = DEFAULT_COLUMNS[defaultIdx - 1];
          const prevIdx = mergedCols.findIndex((c) => c.id === prevDefault.id);
          if (prevIdx >= 0) insertAt = prevIdx + 1;
        }
        mergedCols.splice(insertAt, 0, mc);
      }
      setColumns(mergedCols);

      // Recalcular fórmulas em todas as linhas existentes
      const recalculated = data.rows.map((row: Row) => {
        let cells = { ...row.cells };
        const parseNum = (v: string | undefined) => {
          if (!v || !v.trim()) return NaN;
          return parseFloat(v.trim().replace(",", "."));
        };
        // Fórmula 1: col_pac_caixa × col_caixa_40hq = col_qtde_pacotes
        const a1 = parseNum(cells["col_pac_caixa"]);
        const b1 = parseNum(cells["col_caixa_40hq"]);
        if (!isNaN(a1) && !isNaN(b1)) {
          cells["col_qtde_pacotes"] = String(Math.round(a1 * b1));
        }
        // Fórmula 2: col_preco_unit × col_unid_pacote = col_preco_pacote
        const a2 = parseNum(cells["col_preco_unit"]);
        const b2 = parseNum(cells["col_unid_pacote"]);
        if (!isNaN(a2) && !isNaN(b2)) {
          cells["col_preco_pacote"] = (a2 * b2).toFixed(4);
        }
        return { ...row, cells };
      });
      setRows(recalculated);
    }
    setInitialized(true);
  }, [data, isLoading, initialized]);

  // ── Auto-save com debounce ─────────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const columnsRef = useRef(columns);
  const rowsRef = useRef(rows);
  columnsRef.current = columns;
  rowsRef.current = rows;

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      upsertMut.mutate({
        scope,
        columns: columnsRef.current,
        rows: rowsRef.current,
      });
    }, 800);
  }, [scope, upsertMut]);

  // ── Edição de colunas ──────────────────────────────────────────────────────
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColTitle, setEditingColTitle] = useState("");

  const startEditCol = (col: Column) => {
    setEditingColId(col.id);
    setEditingColTitle(col.title);
  };

  const commitEditCol = () => {
    if (!editingColId) return;
    setColumns((prev) =>
      prev.map((c) => (c.id === editingColId ? { ...c, title: editingColTitle.trim() || c.title } : c)),
    );
    setEditingColId(null);
    scheduleSave();
  };

  // ── Edição de células ──────────────────────────────────────────────────────
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editingCellValue, setEditingCellValue] = useState("");

  const startEditCell = (rowId: string, colId: string, value: string) => {
    setEditingCell({ rowId, colId });
    setEditingCellValue(value);
  };

  const commitEditCell = () => {
    if (!editingCell) return;
    const { rowId, colId } = editingCell;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const newCells = { ...r.cells, [colId]: editingCellValue };
        const formulaCells = applyLinkedFormula(rowId, colId, newCells);
        return { ...r, cells: formulaCells };
      }),
    );
    setEditingCell(null);
    scheduleSave();
  };

  // Commit e pular para a próxima coluna na mesma linha (Enter/Tab)
  const commitEditCellAndMoveNext = () => {
    if (!editingCell) return;
    const { rowId, colId } = editingCell;
    // Salva o valor atual com fórmula vinculada
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const newCells = { ...r.cells, [colId]: editingCellValue };
        const formulaCells = applyLinkedFormula(rowId, colId, newCells);
        return { ...r, cells: formulaCells };
      }),
    );
    scheduleSave();
    // Encontra a próxima coluna
    const colIdx = columns.findIndex((c) => c.id === colId);
    if (colIdx < columns.length - 1) {
      const nextCol = columns[colIdx + 1];
      // Pega o valor atual da próxima célula
      const currentRow = rowsRef.current.find((r) => r.id === rowId);
      const nextValue = currentRow?.cells[nextCol.id] ?? "";
      setEditingCell({ rowId, colId: nextCol.id });
      setEditingCellValue(nextValue);
    } else {
      setEditingCell(null);
    }
  };

  // ── Fórmulas ocultas vinculadas ─────────────────────────────────────
  // Fórmula 1: Pacotes por Caixa (col_pac_caixa) × Caixa em 40HQ (col_caixa_40hq) = Qtde Pacotes (col_qtde_pacotes)
  // Fórmula 2: Preço Unitário (col_preco_unit) × Unidades por Pacotes (col_unid_pacote) = Preço do Pacote (col_preco_pacote)
  //
  // As duas fórmulas são INDEPENDENTES — não compartilham colunas.

  const applyLinkedFormula = (_rowId: string, changedColId: string, cells: Record<string, string>): Record<string, string> => {
    const parseNum = (v: string | undefined) => {
      if (!v || !v.trim()) return NaN;
      return parseFloat(v.trim().replace(",", "."));
    };

    // Se o usuário apagou a célula (vazia), não recalcular nada
    const changedValue = (cells[changedColId] ?? "").trim();
    if (changedValue === "") return cells;

    let updated = { ...cells };

    // === Fórmula 1: Pacotes por Caixa × Caixa em 40HQ = Qtde Pacotes ===
    const F1_A = "col_pac_caixa";
    const F1_B = "col_caixa_40hq";
    const F1_C = "col_qtde_pacotes";

    if (changedColId === F1_A || changedColId === F1_B || changedColId === F1_C) {
      const a = parseNum(updated[F1_A]);
      const b = parseNum(updated[F1_B]);
      const c = parseNum(updated[F1_C]);

      if ((changedColId === F1_A || changedColId === F1_B) && !isNaN(a) && !isNaN(b)) {
        updated[F1_C] = String(Math.round(a * b));
      } else if (changedColId === F1_C && !isNaN(c) && !isNaN(a) && a !== 0) {
        updated[F1_B] = String(Math.round(c / a));
      } else if (changedColId === F1_C && !isNaN(c) && !isNaN(b) && b !== 0) {
        updated[F1_A] = String(Math.round(c / b));
      }
    }

    // === Fórmula 2: Preço Unitário × Unidades por Pacotes = Preço do Pacote ===
    const F2_A = "col_preco_unit";
    const F2_B = "col_unid_pacote";
    const F2_C = "col_preco_pacote";

    if (changedColId === F2_A || changedColId === F2_B || changedColId === F2_C) {
      const a2 = parseNum(updated[F2_A]);
      const b2 = parseNum(updated[F2_B]);
      const c2 = parseNum(updated[F2_C]);

      // Preço Unitário × Unidades por Pacotes = Preço do Pacote
      if ((changedColId === F2_A || changedColId === F2_B) && !isNaN(a2) && !isNaN(b2)) {
        updated[F2_C] = (a2 * b2).toFixed(4);
      }
      // Preço do Pacote / Preço Unitário = Unidades por Pacotes
      else if (changedColId === F2_C && !isNaN(c2) && !isNaN(a2) && a2 !== 0) {
        updated[F2_B] = String(Math.round(c2 / a2));
      }
      // Preço do Pacote / Unidades por Pacotes = Preço Unitário
      else if (changedColId === F2_C && !isNaN(c2) && !isNaN(b2) && b2 !== 0) {
        updated[F2_A] = (c2 / b2).toFixed(4);
      }
    }

    return updated;
  };

  // ── Adicionar / excluir linhas ─────────────────────────────────────────────
  const addRow = () => {
    const newRow: Row = { id: genRowId(), cells: {} };
    setRows((prev) => [...prev, newRow]);
    scheduleSave();
  };

  const deleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    scheduleSave();
  };

  const duplicateRow = (rowId: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      if (idx === -1) return prev;
      const original = prev[idx];
      const copy: Row = { id: genRowId(), cells: { ...original.cells } };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    scheduleSave();
  };

  // ── Adicionar / excluir colunas ─────────────────────────────────────────────
  const addColumn = () => {
    const newCol: Column = { id: genColId(), title: "Nova Coluna" };
    setColumns((prev) => [...prev, newCol]);
    scheduleSave();
  };

  const deleteColumn = (colId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== colId));
    // Limpar dados das células dessa coluna
    setRows((prev) =>
      prev.map((r) => {
        const cells = { ...r.cells };
        delete cells[colId];
        return { ...r, cells };
      }),
    );
    scheduleSave();
  };

  // ── Drag & drop de colunas ─────────────────────────────────────────────────
  const [dragColId, setDragColId] = useState<string | null>(null);

  const handleDragStart = (colId: string) => {
    setDragColId(colId);
  };

  const handleDragOver = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!dragColId || dragColId === targetColId) return;
    setColumns((prev) => {
      const fromIdx = prev.findIndex((c) => c.id === dragColId);
      const toIdx = prev.findIndex((c) => c.id === targetColId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleDragEnd = () => {
    setDragColId(null);
    scheduleSave();
  };

  // ── Filtro e ordenação ─────────────────────────────────────────────────────
  const [sort, setSort] = useState<SortState | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilterRow, setShowFilterRow] = useState(false);

  const hasActiveFilters = useMemo(
    () => sort !== null || Object.values(filters).some((v) => v.trim() !== ""),
    [sort, filters],
  );

  const clearAllFilters = () => {
    setSort(null);
    setFilters({});
  };

  const toggleSort = (colId: string) => {
    setSort((prev) => {
      if (!prev || prev.columnId !== colId) return { columnId: colId, direction: "asc" };
      if (prev.direction === "asc") return { columnId: colId, direction: "desc" };
      return null; // terceiro clique remove sort
    });
  };

  const setFilter = (colId: string, value: string) => {
    setFilters((prev) => ({ ...prev, [colId]: value }));
  };

  // Linhas filtradas por TODAS as colunas exceto uma específica (para sugestões cascateadas)
  const getRowsFilteredExcluding = useCallback(
    (excludeColId: string): Row[] => {
      let result = [...rows];
      for (const [colId, term] of Object.entries(filters)) {
        if (colId === excludeColId) continue; // pula o filtro da coluna atual
        const t = term.trim().toLowerCase();
        if (!t) continue;
        result = result.filter((r) => (r.cells[colId] ?? "").toLowerCase().includes(t));
      }
      return result;
    },
    [rows, filters],
  );

  // Aplica filtros e ordenação
  const displayRows = useMemo(() => {
    let result = [...rows];

    // Filtros textuais (cumulativos / AND)
    for (const [colId, term] of Object.entries(filters)) {
      const t = term.trim().toLowerCase();
      if (!t) continue;
      result = result.filter((r) => (r.cells[colId] ?? "").toLowerCase().includes(t));
    }

    // Ordenação
    if (sort) {
      result.sort((a, b) => {
        const va = (a.cells[sort.columnId] ?? "").toLowerCase();
        const vb = (b.cells[sort.columnId] ?? "").toLowerCase();
        const numA = parseFloat(va.replace(",", "."));
        const numB = parseFloat(vb.replace(",", "."));
        const isNumeric = !isNaN(numA) && !isNaN(numB);
        const cmp = isNumeric ? numA - numB : va.localeCompare(vb, "pt-BR");
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [rows, filters, sort]);

  // ── Estilos ────────────────────────────────────────────────────────────────
  const containerClass = isDark
    ? "rounded-xl border border-white/10 bg-white/[0.03] p-5"
    : "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm";

  const titleClass = isDark
    ? "text-[11px] font-mono uppercase tracking-[0.18em] text-white/60"
    : "text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-500";

  const thClass = isDark
    ? "px-1 py-2 text-[10px] font-semibold text-white/80 border-b border-white/10 select-none truncate"
    : "px-1 py-2 text-[10px] font-semibold text-zinc-700 border-b border-zinc-200 select-none truncate";

  const tdClass = isDark
    ? "px-1 py-1.5 text-[11px] text-white/90 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors truncate"
    : "px-1 py-1.5 text-[11px] text-zinc-800 border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-colors truncate";

  const inputClass = isDark
    ? "w-full bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-[12px] text-white outline-none focus:border-white/50"
    : "w-full bg-zinc-50 border border-zinc-300 rounded px-1.5 py-0.5 text-[12px] text-zinc-900 outline-none focus:border-zinc-500";

  const filterInputClass = isDark
    ? "w-full bg-white/5 border border-white/15 rounded px-1.5 py-0.5 text-[11px] text-white/80 placeholder:text-white/30 outline-none focus:border-white/40"
    : "w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 text-[11px] text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-zinc-400";

  const btnClass = isDark
    ? "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white/80 border border-white/15 hover:bg-white/15 transition-all"
    : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 transition-all";

  // ── Exportar PDF ─────────────────────────────────────────────────────────
  const exportPDF = () => {
    const visibleCols = columns;
    const visibleRows = displayRows;

    // Gera HTML para impressão
    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Tabela de Cotações</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 10px; margin: 10mm; }
          h1 { font-size: 14px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; font-size: 9px; }
          th { background: #f5f5f5; font-weight: bold; }
          .info { font-size: 9px; color: #666; margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <h1>Tabela de Cotações — ${scope}</h1>
        <p class="info">${hasActiveFilters ? "Filtros aplicados — mostrando " + visibleRows.length + " de " + rows.length + " linhas" : "Todas as linhas (" + rows.length + ")"}</p>
        <table>
          <thead><tr>${visibleCols.map(c => `<th>${c.title}</th>`).join("")}</tr></thead>
          <tbody>
            ${visibleRows.map(r => `<tr>${visibleCols.map(c => `<td>${r.cells[c.id] ?? ""}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  if (!initialized && isLoading) {
    return (
      <div className={containerClass}>
        <div className="flex items-center gap-2 mb-4">
          <Table2 className="w-4 h-4" style={{ color: accent }} />
          <h3 className={titleClass}>Tabela de Cotações</h3>
        </div>
        <div className="animate-pulse h-24 rounded bg-white/5" />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Header — toda a área do título é clicável para expandir/retrair */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "Retrair tabela" : "Expandir tabela"}
        >
          <span className="opacity-60 hover:opacity-100 transition-opacity">
            {expanded ? (
              <ChevronUp className="w-4 h-4" style={{ color: accent }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: accent }} />
            )}
          </span>
          <Table2 className="w-4 h-4" style={{ color: accent }} />
          <h3 className={titleClass}>Tabela de Cotações</h3>
          {upsertMut.isPending && (
            <span className="text-[10px] text-white/40 italic ml-2">salvando…</span>
          )}
          {upsertMut.isSuccess && !upsertMut.isPending && (
            <span className="text-[10px] text-emerald-400/80 ml-2 flex items-center gap-0.5">
              <Check className="w-3 h-3" /> salvo
            </span>
          )}
        </div>
        {expanded && (
          <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={btnClass}
              onClick={() => setShowFilterRow(!showFilterRow)}
            >
              <Search className="w-3.5 h-3.5" />
              Filtros
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                className={btnClass}
                onClick={clearAllFilters}
              >
                <XCircle className="w-3.5 h-3.5" />
                Limpar filtros
              </button>
            )}
            <button type="button" className={btnClass} onClick={addRow}>
              <Plus className="w-3.5 h-3.5" />
              Linha
            </button>
            <button type="button" className={btnClass} onClick={exportPDF}>
              <Download className="w-3.5 h-3.5" />
              Exportar PDF
            </button>
          </div>
        )}
      </div>

      {/* Tabela (só visível quando expandida) */}
      {expanded && <div className="max-h-[70vh] overflow-y-auto relative">
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0 z-10" style={{ background: isDark ? '#1a1a1a' : '#ffffff' }}>
            <tr>
              {/* Coluna de ações (excluir) */}
              <th className={`${thClass} w-8`} />
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={`${thClass} ${dragColId === col.id ? "opacity-40" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(col.id)}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center gap-1">
                    <GripVertical className="w-3 h-3 opacity-30 cursor-grab" />
                    {editingColId === col.id ? (
                      <input
                        autoFocus
                        className={inputClass}
                        style={{ maxWidth: 140 }}
                        value={editingColTitle}
                        onChange={(e) => setEditingColTitle(e.target.value)}
                        onBlur={commitEditCol}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEditCol();
                          if (e.key === "Escape") setEditingColId(null);
                        }}
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onDoubleClick={() => startEditCol(col)}
                        title="Duplo-clique para editar título"
                      >
                        {col.title}
                      </span>
                    )}
                    {editingColId !== col.id && (
                      <button
                        type="button"
                        className="opacity-40 hover:opacity-100 transition-opacity ml-0.5"
                        onClick={() => startEditCol(col)}
                        title="Editar título"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="opacity-40 hover:opacity-100 transition-opacity"
                      onClick={() => toggleSort(col.id)}
                      title="Ordenar"
                    >
                      {sort?.columnId === col.id ? (
                        sort.direction === "asc" ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="opacity-30 hover:opacity-100 transition-opacity text-red-400"
                      onClick={() => deleteColumn(col.id)}
                      title="Excluir coluna"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </th>
              ))}
              {/* Botão + para adicionar coluna */}
              <th className={`${thClass} w-8`}>
                <button
                  type="button"
                  className="opacity-50 hover:opacity-100 transition-opacity"
                  onClick={addColumn}
                  title="Adicionar coluna"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
            {/* Linha de filtros */}
            {showFilterRow && (
              <tr>
                <th className={thClass} />
                {columns.map((col) => (
                  <th key={`filter-${col.id}`} className="px-1 py-1">
                    <FilterInput
                      colId={col.id}
                      value={filters[col.id] ?? ""}
                      onChange={(v) => setFilter(col.id, v)}
                      rows={getRowsFilteredExcluding(col.id)}
                      isDark={isDark}
                    />
                  </th>
                ))}
                <th className={thClass} />
              </tr>
            )}
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className={`text-center py-8 text-xs ${isDark ? "text-white/40" : "text-zinc-400"}`}
                >
                  Nenhuma linha adicionada. Clique em "+ Linha" para começar.
                </td>
              </tr>
            ) : (
              displayRows.map((row) => {
                const isRowEditing = editingCell?.rowId === row.id;
                const rowHighlight = isRowEditing
                  ? isDark ? "bg-amber-500/15" : "bg-amber-100"
                  : "";
                const rowHover = isDark ? "hover:bg-white/[0.08]" : "hover:bg-zinc-100";
                return (
                <tr key={row.id} className={`group transition-colors ${rowHover} ${rowHighlight}`}>
                  <td className={`${tdClass} w-8 text-center`}>
                    <div className="flex items-center gap-0.5 justify-center">
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                        onClick={() => duplicateRow(row.id)}
                        title="Duplicar linha"
                      >
                        <Copy className="w-3 h-3 text-blue-400" />
                      </button>
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                        onClick={() => deleteRow(row.id)}
                        title="Excluir linha"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                  {columns.map((col) => {
                    const isEditing =
                      editingCell?.rowId === row.id && editingCell?.colId === col.id;
                    const cellValue = row.cells[col.id] ?? "";
                    return (
                      <td
                        key={col.id}
                        className={tdClass}
                        onClick={() => {
                          if (!isEditing) startEditCell(row.id, col.id, cellValue);
                        }}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            className={inputClass}
                            value={editingCellValue}
                            onChange={(e) => setEditingCellValue(e.target.value)}
                            onBlur={commitEditCell}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Tab") {
                                e.preventDefault();
                                commitEditCellAndMoveNext();
                              }
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                          />
                        ) : (
                          <span className={cellValue ? "" : "opacity-30"}>
                            {cellValue || "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className={`${tdClass} w-8`} />
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>}
    </div>
  );
}
