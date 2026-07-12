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
  { id: "col_preco_unit", title: "Preço Unitário" },
  { id: "col_preco_pacote", title: "Preço do Pacote" },
];

let _rowCounter = 0;
function genRowId() {
  return `row_${Date.now()}_${++_rowCounter}`;
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  scope: string;
  accent?: string;
  tone?: "light" | "dark";
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

  // Sincroniza com o servidor na primeira carga
  useEffect(() => {
    if (initialized) return;
    if (isLoading) return;
    if (data) {
      setColumns(data.columns);
      setRows(data.rows);
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
      prev.map((r) =>
        r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: editingCellValue } } : r,
      ),
    );
    setEditingCell(null);
    scheduleSave();
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

  // Aplica filtros e ordenação
  const displayRows = useMemo(() => {
    let result = [...rows];

    // Filtros textuais (independentes entre si)
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
    ? "px-2 py-2 text-[11px] font-semibold text-white/80 border-b border-white/10 whitespace-nowrap select-none"
    : "px-2 py-2 text-[11px] font-semibold text-zinc-700 border-b border-zinc-200 whitespace-nowrap select-none";

  const tdClass = isDark
    ? "px-2 py-1.5 text-[12px] text-white/90 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
    : "px-2 py-1.5 text-[12px] text-zinc-800 border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-colors";

  const inputClass = isDark
    ? "w-full bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-[12px] text-white outline-none focus:border-white/50"
    : "w-full bg-zinc-50 border border-zinc-300 rounded px-1.5 py-0.5 text-[12px] text-zinc-900 outline-none focus:border-zinc-500";

  const filterInputClass = isDark
    ? "w-full bg-white/5 border border-white/15 rounded px-1.5 py-0.5 text-[11px] text-white/80 placeholder:text-white/30 outline-none focus:border-white/40"
    : "w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 text-[11px] text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-zinc-400";

  const btnClass = isDark
    ? "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white/80 border border-white/15 hover:bg-white/15 transition-all"
    : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 transition-all";

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
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
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
        <div className="flex flex-wrap gap-1.5">
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
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
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
                  </div>
                </th>
              ))}
            </tr>
            {/* Linha de filtros */}
            {showFilterRow && (
              <tr>
                <th className={thClass} />
                {columns.map((col) => (
                  <th key={`filter-${col.id}`} className="px-1 py-1">
                    <input
                      className={filterInputClass}
                      placeholder="Buscar…"
                      value={filters[col.id] ?? ""}
                      onChange={(e) => setFilter(col.id, e.target.value)}
                    />
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className={`text-center py-8 text-xs ${isDark ? "text-white/40" : "text-zinc-400"}`}
                >
                  Nenhuma linha adicionada. Clique em "+ Linha" para começar.
                </td>
              </tr>
            ) : (
              displayRows.map((row) => (
                <tr key={row.id} className="group">
                  <td className={`${tdClass} w-8 text-center`}>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                      onClick={() => deleteRow(row.id)}
                      title="Excluir linha"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
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
                              if (e.key === "Enter") commitEditCell();
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
