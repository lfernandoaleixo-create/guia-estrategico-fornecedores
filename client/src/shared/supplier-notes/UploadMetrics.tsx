// =============================================================================
// UploadMetrics — KPIs de uploads (Catálogos & Fotos / Cotações / Outros)
// com filtro de período: Mês atual, Mês anterior e Personalizado.
//
// Lê `entries` direto do hook `useSupplierNotes` (mesma fonte do painel),
// então o card é reativo: a cada upload salvo, o número incrementa.
//
// Design: card minimalista com 3 KPIs grandes + total, alinhado à paleta
// passada via `accent` para casar com cada dashboard.
// =============================================================================
import { useMemo, useState } from "react";
import {
  useSupplierNotes,
  ATTACHMENT_CATEGORY_LABEL,
  type AttachmentCategory,
} from "./useSupplierNotes";
import { Camera, BookOpen, DollarSign, Folder, Calendar, Filter } from "lucide-react";

interface Props {
  /** Aceita os scopes fixos (aquario|tapete|yiwu) ou dinâmicos como `grupo-{id}` */
  scope: string;
  /** Cor de destaque (hex/oklch) — combina com o dashboard */
  accent?: string;
  /** Tom claro (Aquário/Tapete usam cards brancos; Yiwu usa escuro) */
  tone?: "light" | "dark";
}

type Range = "this_month" | "last_month" | "custom";

/** Converte "dd/mm/yyyy" para Date local (00:00). */
function parseAddedAt(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function fmtDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function toInputDate(d: Date): string {
  // "yyyy-mm-dd" para input type=date
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fromInputDate(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

export function UploadMetrics({ scope, accent = "#0891b2", tone = "light" }: Props) {
  const { entries } = useSupplierNotes(scope);
  const [range, setRange] = useState<Range>("this_month");
  const today = useMemo(() => new Date(), []);
  const [customFrom, setCustomFrom] = useState<string>(toInputDate(startOfMonth(today)));
  const [customTo, setCustomTo] = useState<string>(toInputDate(today));

  const { from, to, label } = useMemo(() => {
    if (range === "this_month") {
      const f = startOfMonth(today);
      const t = endOfMonth(today);
      return { from: f, to: t, label: `${fmtDDMMYYYY(f)} → ${fmtDDMMYYYY(t)}` };
    }
    if (range === "last_month") {
      const ref = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const f = startOfMonth(ref);
      const t = endOfMonth(ref);
      return { from: f, to: t, label: `${fmtDDMMYYYY(f)} → ${fmtDDMMYYYY(t)}` };
    }
    const f = fromInputDate(customFrom);
    const t = fromInputDate(customTo);
    if (!f || !t) return { from: null as Date | null, to: null as Date | null, label: "—" };
    const tEnd = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999);
    return { from: f, to: tEnd, label: `${fmtDDMMYYYY(f)} → ${fmtDDMMYYYY(t)}` };
  }, [range, today, customFrom, customTo]);

  const counts = useMemo(() => {
    const c: Record<AttachmentCategory, number> = { catalogos: 0, fotos: 0, cotacoes: 0, outros: 0 };
    Object.values(entries).forEach((e) => {
      e.attachments.forEach((a) => {
        const d = parseAddedAt(a.addedAt);
        if (!d) return;
        if (from && d < from) return;
        if (to && d > to) return;
        const cat: AttachmentCategory = a.category ?? "outros";
        c[cat] += 1;
      });
    });
    return c;
  }, [entries, from, to]);

  const total = counts.catalogos + counts.fotos + counts.cotacoes + counts.outros;
  const isDark = tone === "dark";

  const containerClass = isDark
    ? "rounded-xl border border-white/10 bg-white/[0.03] p-5"
    : "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm";

  const titleClass = isDark
    ? "text-[11px] font-mono uppercase tracking-[0.18em] text-white/60"
    : "text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-500";

  const periodChip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
      active
        ? isDark
          ? "bg-white/15 text-white border border-white/25"
          : "bg-zinc-900 text-white border border-zinc-900"
        : isDark
        ? "bg-transparent text-white/70 border border-white/15 hover:bg-white/10"
        : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50"
    }`;

  const kpis: { key: AttachmentCategory; icon: React.ElementType; color: string }[] = [
    { key: "catalogos", icon: BookOpen, color: "#0891b2" },
    { key: "fotos", icon: Camera, color: "#db2777" },
    { key: "cotacoes", icon: DollarSign, color: "#16a34a" },
    { key: "outros", icon: Folder, color: "#a855f7" },
  ];

  return (
    <div className={containerClass}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: accent }} />
          <h3 className={titleClass}>Métricas de uploads</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={periodChip(range === "this_month")} onClick={() => setRange("this_month")}>
            Mês atual
          </button>
          <button type="button" className={periodChip(range === "last_month")} onClick={() => setRange("last_month")}>
            Mês anterior
          </button>
          <button type="button" className={periodChip(range === "custom")} onClick={() => setRange("custom")}>
            Personalizado
          </button>
        </div>
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Calendar className={`w-4 h-4 ${isDark ? "text-white/60" : "text-zinc-500"}`} />
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border ${
              isDark ? "bg-white/5 border-white/15 text-white" : "bg-white border-zinc-200 text-zinc-800"
            }`}
          />
          <span className={`text-xs ${isDark ? "text-white/50" : "text-zinc-400"}`}>até</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border ${
              isDark ? "bg-white/5 border-white/15 text-white" : "bg-white border-zinc-200 text-zinc-800"
            }`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {kpis.map(({ key, icon: Icon, color }) => (
          <div
            key={key}
            className={`rounded-lg border p-4 ${
              isDark ? "border-white/10 bg-white/[0.02]" : "border-zinc-100 bg-zinc-50/50"
            }`}
            style={{ boxShadow: `inset 4px 0 0 0 ${color}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              <span
                className={`text-[10px] font-mono uppercase tracking-wider ${
                  isDark ? "text-white/60" : "text-zinc-500"
                }`}
              >
                {ATTACHMENT_CATEGORY_LABEL[key]}
              </span>
            </div>
            <div className={`text-3xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              {counts[key]}
            </div>
            <div className={`text-[11px] mt-0.5 ${isDark ? "text-white/50" : "text-zinc-400"}`}>
              {counts[key] === 1 ? "arquivo" : "arquivos"}
            </div>
          </div>
        ))}
      </div>

      <div className={`flex items-center justify-between text-xs ${isDark ? "text-white/55" : "text-zinc-500"}`}>
        <span>Total no período: <strong className={isDark ? "text-white" : "text-zinc-900"}>{total}</strong></span>
        <span className="font-mono">{label}</span>
      </div>
    </div>
  );
}

export default UploadMetrics;
