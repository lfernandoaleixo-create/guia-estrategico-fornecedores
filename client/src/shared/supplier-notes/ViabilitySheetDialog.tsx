// =============================================================================
// ViabilitySheetDialog — modal com a planilha interativa de "Análise de
// Viabilidade de Compra" de um fornecedor. Recria fielmente o Excel enviado:
// seções com faixa colorida, colunas calculadas automaticamente e campos
// editáveis destacados (amarelo = editável; laranja = preço do fornecedor).
//
// Persistência: useViabilitySheet (banco compartilhado). Salvamento automático
// (debounce) a cada edição + botão "Salvar" explícito.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calculator,
  Plus,
  Trash2,
  Loader2,
  Check,
  Info,
  Layers,
} from "lucide-react";
import {
  useViabilitySheet,
  computeRow,
  makeDefaultSheet,
  makeEmptyRow,
  makeEmptySection,
  nextSectionColor,
  type ViabilitySheet,
  type ViabilityRow,
  type ViabilitySection,
} from "./useViabilitySheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: string;
  supplierId: string;
  supplierName?: string;
}

// Cores de destaque dos campos (iguais ao Excel).
const FILL_EDIT = "#FFF8E1"; // amarelo claro (editável)
const FILL_EDIT_BORDER = "#F5D76E";
const FILL_FORN = "#FCE4D6"; // laranja claro (fornecedor)
const FILL_FORN_BORDER = "#F0B27A";
const FILL_CALC = "#EAF2F8"; // azul claro suave (calculado)

// Formata número em pt-BR com casas fixas; vazio para null.
function fmt(n: number | null, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// Converte texto digitado (pt-BR) em número; aceita vírgula e ponto.
function parseNum(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const normalized = t.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export default function ViabilitySheetDialog({
  open,
  onOpenChange,
  scope,
  supplierId,
  supplierName,
}: Props) {
  const { sheet, loaded, save, saving } = useViabilitySheet(scope, supplierId);

  // Estado local editável (espelha o documento do banco).
  const [draft, setDraft] = useState<ViabilitySheet | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza o draft ao abrir / quando o documento carrega.
  useEffect(() => {
    if (!open) return;
    if (draft) return; // já inicializado nesta abertura
    if (!loaded) return;
    setDraft(sheet ?? makeDefaultSheet(scope, supplierId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loaded, sheet, scope, supplierId]);

  // Limpa o draft ao fechar para reidratar na próxima abertura.
  useEffect(() => {
    if (!open) {
      setDraft(null);
      setJustSaved(false);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    }
  }, [open]);

  // Agenda salvamento com debounce sempre que o draft muda por edição.
  const scheduleSave = useCallback(
    (next: ViabilitySheet) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await save(next);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1800);
      }, 700);
    },
    [save],
  );

  const mutate = useCallback(
    (updater: (prev: ViabilitySheet) => ViabilitySheet) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  // ─── Mutadores de seções/linhas ──────────────────────────────────────────
  const addSection = () =>
    mutate((prev) => ({
      ...prev,
      sections: [...prev.sections, makeEmptySection(prev.sections.length, "")],
    }));

  const removeSection = (sectionId: string) =>
    mutate((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));

  const setSectionTitle = (sectionId: string, title: string) =>
    mutate((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, title } : s,
      ),
    }));

  const addRow = (sectionId: string) =>
    mutate((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, rows: [...s.rows, makeEmptyRow()] } : s,
      ),
    }));

  const removeRow = (sectionId: string, rowId: string) =>
    mutate((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, rows: s.rows.filter((r) => r.id !== rowId) }
          : s,
      ),
    }));

  const setCell = (
    sectionId: string,
    rowId: string,
    key: keyof ViabilityRow,
    value: string | number | null,
  ) =>
    mutate((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              rows: s.rows.map((r) =>
                r.id === rowId ? { ...r, [key]: value } : r,
              ),
            }
          : s,
      ),
    }));

  const handleManualSave = async () => {
    if (!draft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await save(draft);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 flex flex-col overflow-hidden sm:rounded-xl !w-screen !max-w-none"
        style={{
          background: "#f8fafc",
          width: "100vw",
          maxWidth: "100vw",
          height: "100vh",
          maxHeight: "100vh",
          borderRadius: 0,
        }}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0" style={{ borderColor: "#e2e8f0" }}>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white"
              style={{ background: "#1e3a5f" }}
            >
              <Calculator size={15} />
            </span>
            Análise de Viabilidade
            {supplierName ? (
              <span className="font-normal text-zinc-500">— {supplierName}</span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {!draft ? (
          <div className="flex flex-1 items-center justify-center text-zinc-400">
            <Loader2 className="animate-spin mr-2" size={18} /> Carregando planilha…
          </div>
        ) : (
          <div className="flex-1 overflow-auto px-5 py-4">
            {/* Legenda */}
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] mb-4 px-3 py-2 rounded-lg"
              style={{ background: "#fffaf0", border: "1px solid #f3e0c0", color: "#7a5b1e" }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Info size={12} /> Como preencher:
              </span>
              <LegendChip color={FILL_EDIT} border={FILL_EDIT_BORDER} label="Amarelo = você edita" />
              <LegendChip color={FILL_FORN} border={FILL_FORN_BORDER} label="Laranja = preço do fornecedor" />
              <LegendChip color={FILL_CALC} border="#bcd4ea" label="Azul = calculado automaticamente" />
            </div>

            {/* Seções */}
            <div className="space-y-5">
              {draft.sections.map((section) => (
                <SectionTable
                  key={section.id}
                  section={section}
                  onTitle={(t) => setSectionTitle(section.id, t)}
                  onRemoveSection={() => removeSection(section.id)}
                  onAddRow={() => addRow(section.id)}
                  onRemoveRow={(rowId) => removeRow(section.id, rowId)}
                  onCell={(rowId, key, value) => setCell(section.id, rowId, key, value)}
                />
              ))}
            </div>

          </div>
        )}

        {draft && (
          <div
            className="shrink-0 border-t bg-white px-5 py-3 flex flex-wrap items-center justify-between gap-3"
            style={{ borderColor: "#e2e8f0" }}
          >
            <button
              type="button"
              onClick={addSection}
              className="px-3.5 py-2 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 text-white transition-all active:scale-[0.97]"
              style={{ background: "#1e3a5f" }}
            >
              <Layers size={14} /> Adicionar seção
            </button>

            <div className="flex items-center gap-3">
              {justSaved && (
                <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
                  <Check size={13} /> Salvo
                </span>
              )}
              {saving && (
                <span className="text-xs text-zinc-400 inline-flex items-center gap-1">
                  <Loader2 size={13} className="animate-spin" /> Salvando…
                </span>
              )}
              <button
                type="button"
                onClick={handleManualSave}
                className="px-4 py-2 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 text-white transition-all active:scale-[0.97]"
                style={{ background: "#16a34a" }}
              >
                <Check size={14} /> Salvar agora
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LegendChip({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-3 rounded-sm"
        style={{ background: color, border: `1px solid ${border}` }}
      />
      {label}
    </span>
  );
}

// ─── Tabela de uma seção ─────────────────────────────────────────────────────
interface SectionTableProps {
  section: ViabilitySection;
  onTitle: (title: string) => void;
  onRemoveSection: () => void;
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  onCell: (rowId: string, key: keyof ViabilityRow, value: string | number | null) => void;
}

function SectionTable({
  section,
  onTitle,
  onRemoveSection,
  onAddRow,
  onRemoveRow,
  onCell,
}: SectionTableProps) {
  return (
    <div className="rounded-xl overflow-hidden shadow-sm border" style={{ borderColor: "#e2e8f0" }}>
      {/* Faixa colorida da seção (título editável) */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ background: section.color }}
      >
        <input
          value={section.title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Nome da seção (ex.: Tapete Higiênico 60x80 cm)"
          className="bg-transparent text-white placeholder-white/60 font-semibold text-sm px-1 py-0.5 rounded outline-none focus:bg-white/15 transition-colors w-full max-w-[80%]"
        />
        <button
          type="button"
          onClick={onRemoveSection}
          className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/15 transition-colors shrink-0"
          title="Remover seção"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="overflow-x-auto bg-white">
        <table className="w-full text-xs border-collapse min-w-[1180px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider" style={{ background: "#eef2f6", color: "#475569" }}>
              <Th className="min-w-[180px]">Produto</Th>
              <Th className="min-w-[90px]">Qtd (un)</Th>
              <Th className="min-w-[120px]">Preço Venda (R$)</Th>
              <Th className="min-w-[100px]">Margem (%)</Th>
              <Th className="min-w-[150px]">Preço Unit. Fornecedor (R$)</Th>
              <Th className="min-w-[150px]">Preço Unit. Desejado (R$)</Th>
              <Th className="min-w-[150px]">Preço Pacote Desejado (R$)</Th>
              <Th className="min-w-[150px]">Preço Pacote Atual (R$)</Th>
              <Th className="min-w-[90px]">Atende?</Th>
              <th className="px-1 py-2 w-8" aria-label="ações" />
            </tr>
          </thead>
          <tbody>
            {section.rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-4 text-center text-zinc-400">
                  Nenhuma linha. Clique em <strong>+ Adicionar linha</strong>.
                </td>
              </tr>
            ) : (
              section.rows.map((row) => {
                const calc = computeRow(row);
                return (
                  <tr key={row.id} className="border-t" style={{ borderColor: "#f1f5f9" }}>
                    {/* Produto */}
                    <Td>
                      <CellInput
                        value={row.produto}
                        onChange={(v) => onCell(row.id, "produto", v)}
                        placeholder="Ex.: Tapete 60x80"
                        align="left"
                      />
                    </Td>
                    {/* Qtd (editável) */}
                    <Td fill={FILL_EDIT} border={FILL_EDIT_BORDER}>
                      <NumInput
                        value={row.qtd}
                        digits={0}
                        onChange={(n) => onCell(row.id, "qtd", n)}
                        placeholder="30"
                      />
                    </Td>
                    {/* Preço Venda (editável) */}
                    <Td fill={FILL_EDIT} border={FILL_EDIT_BORDER}>
                      <NumInput
                        value={row.precoVenda}
                        onChange={(n) => onCell(row.id, "precoVenda", n)}
                        placeholder="49,90"
                      />
                    </Td>
                    {/* Margem % (editável) — guarda fração 0..1, exibe % */}
                    <Td fill={FILL_EDIT} border={FILL_EDIT_BORDER}>
                      <PercentInput
                        value={row.margem}
                        onChange={(n) => onCell(row.id, "margem", n)}
                        placeholder="20"
                      />
                    </Td>
                    {/* Preço Unit. Fornecedor (laranja) */}
                    <Td fill={FILL_FORN} border={FILL_FORN_BORDER}>
                      <NumInput
                        value={row.precoUnitForn}
                        onChange={(n) => onCell(row.id, "precoUnitForn", n)}
                        placeholder="1,66"
                      />
                    </Td>
                    {/* Preço Unit. Desejado (calculado) */}
                    <Td fill={FILL_CALC}>
                      <CalcCell text={fmt(calc.precoUnitDesejado, 4)} />
                    </Td>
                    {/* Preço Pacote Desejado (editável) */}
                    <Td fill={FILL_EDIT} border={FILL_EDIT_BORDER}>
                      <NumInput
                        value={row.precoPacoteDesejado}
                        onChange={(n) => onCell(row.id, "precoPacoteDesejado", n)}
                        placeholder="1,66"
                      />
                    </Td>
                    {/* Preço Pacote Atual (calculado) */}
                    <Td fill={FILL_CALC}>
                      <CalcCell text={fmt(calc.precoPacoteAtual, 2)} />
                    </Td>
                    {/* Atende? (calculado) */}
                    <Td>
                      <AtendeBadge value={calc.atende} />
                    </Td>
                    <td className="px-1 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => onRemoveRow(row.id)}
                        className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remover linha"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-2 bg-white border-t" style={{ borderColor: "#f1f5f9" }}>
        <button
          type="button"
          onClick={onAddRow}
          className="px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all hover:bg-zinc-50 active:scale-[0.97] border"
          style={{ borderColor: "#e2e8f0", color: "#334155" }}
        >
          <Plus size={12} /> Adicionar linha
        </button>
      </div>
    </div>
  );
}

// ─── Células auxiliares ──────────────────────────────────────────────────────
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-2 py-2 font-bold whitespace-nowrap ${className}`}>{children}</th>;
}

function Td({
  children,
  fill,
  border,
}: {
  children: React.ReactNode;
  fill?: string;
  border?: string;
}) {
  return (
    <td
      className="px-1 py-1"
      style={fill ? { background: fill, boxShadow: border ? `inset 0 0 0 1px ${border}` : undefined } : undefined}
    >
      {children}
    </td>
  );
}

function CellInput({
  value,
  onChange,
  placeholder,
  align = "left",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 rounded bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors text-xs"
      style={{ textAlign: align }}
    />
  );
}

// Input numérico que guarda número (ou null). Mostra valor formatado quando não focado.
function NumInput({
  value,
  onChange,
  placeholder,
  digits = 2,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder?: string;
  digits?: number;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  const display = focused
    ? raw
    : value == null
      ? ""
      : value.toLocaleString("pt-BR", {
          minimumFractionDigits: digits === 0 ? 0 : 2,
          maximumFractionDigits: digits === 0 ? 0 : 2,
        });

  return (
    <input
      inputMode="decimal"
      value={display}
      onFocus={() => {
        setFocused(true);
        setRaw(value == null ? "" : String(value).replace(".", ","));
      }}
      onChange={(e) => {
        setRaw(e.target.value);
        onChange(parseNum(e.target.value));
      }}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 rounded bg-transparent border border-transparent hover:border-zinc-300 focus:border-zinc-500 focus:bg-white focus:outline-none transition-colors text-xs text-right font-medium"
    />
  );
}

// Input de porcentagem: usuário digita 20 -> guarda 0.2; exibe "20%".
function PercentInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  const pct = value == null ? null : value * 100;
  const display = focused
    ? raw
    : pct == null
      ? ""
      : `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

  return (
    <input
      inputMode="decimal"
      value={display}
      onFocus={() => {
        setFocused(true);
        setRaw(pct == null ? "" : String(pct).replace(".", ","));
      }}
      onChange={(e) => {
        setRaw(e.target.value);
        const n = parseNum(e.target.value);
        onChange(n == null ? null : n / 100);
      }}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 rounded bg-transparent border border-transparent hover:border-zinc-300 focus:border-zinc-500 focus:bg-white focus:outline-none transition-colors text-xs text-right font-medium"
    />
  );
}

function CalcCell({ text }: { text: string }) {
  return (
    <div className="px-2 py-1.5 text-xs text-right font-semibold tabular-nums" style={{ color: "#1e3a5f" }}>
      {text || <span className="text-zinc-300">—</span>}
    </div>
  );
}

function AtendeBadge({ value }: { value: "SIM" | "NÃO" | "" }) {
  if (value === "") {
    return (
      <div className="px-2 py-1.5 text-center text-zinc-300 text-xs">—</div>
    );
  }
  const isYes = value === "SIM";
  return (
    <div className="px-2 py-1 flex justify-center">
      <span
        className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-bold"
        style={{
          background: isYes ? "#dcfce7" : "#fee2e2",
          color: isYes ? "#15803d" : "#b91c1c",
        }}
      >
        {value}
      </span>
    </div>
  );
}
