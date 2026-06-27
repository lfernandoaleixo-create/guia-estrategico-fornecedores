// =============================================================================
// CalculatorPanel — calculadora de custo de importação (overlay).
//
// Mesmo padrão visual do NegotiationSummaryPanel (fixed inset-0, backdrop blur,
// card max-w, animação de entrada). Puramente client-side: nada é persistido.
//
// A cadeia tributária completa (II, IPI, PIS, COFINS, ICMS zerado via TTS,
// AFRMM e Siscomex) e a tabela de NCMs vivem em ./importTax.ts.
// =============================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Calculator,
  RotateCcw,
  Package,
  Ship,
  Truck,
  Percent,
  DollarSign,
  Search,
  CheckCircle2,
  Receipt,
  FileText,
  Save,
  AlertTriangle,
  Loader2,
  Upload,
} from "lucide-react";
import {
  NCM_TABLE,
  findNcm,
  normalizeNcm,
  computeImportCost,
  PIS_PCT,
  COFINS_PCT,
  SEGURO_PCT,
  AFRMM_PCT,
  SISCOMEX_DEFAULT,
  DESPESAS_PORTO_DEFAULT,
  type NcmEntry,
} from "./importTax";
import {
  downloadPdfReport,
  downloadJson,
  parseImportedSnapshot,
  type CalcSnapshot,
} from "./calcReport";
import type { ImportTaxInput } from "./importTax";

export interface CalculatorPanelProps {
  open: boolean;
  onClose: () => void;
}

// Converte string digitada (aceita vírgula) para número; vazio/invalido => 0.
function parseNum(v: string): number {
  if (!v) return 0;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const USD = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "USD" });

interface FieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  suffix?: string;
  prefix?: string;
  required?: boolean;
}

function Field({ label, hint, value, onChange, placeholder, icon, suffix, prefix, required }: FieldProps) {
  // Campo obrigatorio ainda nao preenchido => destaque ambar para sinalizar.
  const empty = required && value.trim() === "";
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-xs font-semibold uppercase tracking-[0.08em] flex items-center gap-1.5"
        style={{ color: "oklch(0.6 0.02 80)", fontFamily: "'Inter', sans-serif" }}
      >
        {icon}
        {label}
        {required ? (
          <span style={{ color: "oklch(0.78 0.16 60)" }} title="Campo obrigatório">*</span>
        ) : null}
      </label>
      <div
        className="flex items-center rounded-lg overflow-hidden transition-colors"
        style={{
          background: "oklch(0.1 0.018 255)",
          border: empty ? "1px solid oklch(0.7 0.15 60 / 0.7)" : "1px solid oklch(0.28 0.04 260)",
          boxShadow: empty ? "0 0 0 3px oklch(0.7 0.15 60 / 0.12)" : "none",
        }}
      >
        {prefix ? (
          <span
            className="pl-3 pr-1 text-sm shrink-0"
            style={{ color: "oklch(0.6 0.02 80)", fontFamily: "'Inter', sans-serif" }}
          >
            {prefix}
          </span>
        ) : null}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode="decimal"
          className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none w-full"
          style={{ color: "oklch(0.95 0.02 80)", fontFamily: "'Inter', sans-serif" }}
        />
        {suffix ? (
          <span
            className="pr-3 pl-1 text-sm shrink-0"
            style={{ color: "oklch(0.6 0.02 80)", fontFamily: "'Inter', sans-serif" }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? (
        <span className="text-[0.7rem]" style={{ color: "oklch(0.5 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, icon }: Omit<FieldProps, "suffix" | "prefix" | "hint">) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-xs font-semibold uppercase tracking-[0.08em] flex items-center gap-1.5"
        style={{ color: "oklch(0.6 0.02 80)", fontFamily: "'Inter', sans-serif" }}
      >
        {icon}
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg px-3 py-2.5 text-sm outline-none w-full"
        style={{
          background: "oklch(0.1 0.018 255)",
          border: "1px solid oklch(0.28 0.04 260)",
          color: "oklch(0.95 0.02 80)",
          fontFamily: "'Inter', sans-serif",
        }}
      />
    </div>
  );
}

// Chip somente leitura para uma alíquota/tributo fixo (não editável).
function ReadOnlyTax({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-lg px-3 py-2"
      style={{
        background: "oklch(0.13 0.02 255)",
        border: highlight ? "1px solid oklch(0.6 0.13 150 / 0.45)" : "1px solid oklch(0.24 0.03 258)",
      }}
    >
      <span className="text-[0.62rem] uppercase tracking-[0.08em]" style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: "oklch(0.92 0.04 80)", fontFamily: "'Inter', sans-serif" }}>
        {value}
      </span>
    </div>
  );
}

// Campo NCM com busca/autocomplete sobre a tabela interna.
function NcmField({
  ncm,
  onPick,
  onType,
}: {
  ncm: string;
  onPick: (e: NcmEntry) => void;
  onType: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qd = q.replace(/\D/g, "");
    if (!q) return NCM_TABLE;
    return NCM_TABLE.filter((e) => {
      const byName = e.produto.toLowerCase().includes(q);
      const byNcm = qd.length > 0 && e.ncm.replace(/\D/g, "").includes(qd);
      return byName || byNcm;
    });
  }, [query]);

  return (
    <div className="flex flex-col gap-1.5" ref={boxRef}>
      <label
        className="text-xs font-semibold uppercase tracking-[0.08em] flex items-center gap-1.5"
        style={{ color: "oklch(0.6 0.02 80)", fontFamily: "'Inter', sans-serif" }}
      >
        <Search className="w-3.5 h-3.5" />
        NCM (buscar produto ou código)
      </label>
      <div className="relative">
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ background: "oklch(0.1 0.018 255)", border: "1px solid oklch(0.28 0.04 260)" }}
        >
          <input
            value={open ? query : ncm}
            onFocus={() => {
              setQuery("");
              setOpen(true);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              onType(normalizeNcm(e.target.value));
            }}
            placeholder="Ex.: Tapete higiênico ou 4818.90.90"
            className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none w-full"
            style={{ color: "oklch(0.95 0.02 80)", fontFamily: "'Inter', sans-serif" }}
          />
        </div>

        {open ? (
          <div
            className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-lg"
            style={{
              background: "oklch(0.12 0.02 255)",
              border: "1px solid oklch(0.3 0.04 260)",
              boxShadow: "0 18px 40px oklch(0 0 0 / 0.5)",
            }}
          >
            {results.length === 0 ? (
              <div className="px-3 py-3 text-sm" style={{ color: "oklch(0.6 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                Nenhum NCM encontrado. Você pode digitar as alíquotas manualmente.
              </div>
            ) : (
              results.map((e) => (
                <button
                  key={e.ncm}
                  onClick={() => {
                    onPick(e);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 transition-colors hover:bg-[oklch(0.18_0.02_258)]"
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate" style={{ color: "oklch(0.92 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                      {e.produto}
                    </div>
                    <div className="text-[0.7rem]" style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                      {e.ncm}
                    </div>
                  </div>
                  <div className="text-[0.7rem] shrink-0 text-right" style={{ color: "oklch(0.72 0.06 75)", fontFamily: "'Inter', sans-serif" }}>
                    II {e.ii}% · IPI {e.ipi}%
                  </div>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  sub,
  strong,
  muted,
}: {
  label: string;
  value: string;
  /** Valor secundário (ex.: equivalente em R$) mostrado abaixo, alinhado à direita. */
  sub?: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span
        className="text-sm"
        style={{
          color: strong ? "oklch(0.95 0.02 80)" : muted ? "oklch(0.55 0.02 80)" : "oklch(0.72 0.02 80)",
          fontFamily: "'Inter', sans-serif",
          fontWeight: strong ? 600 : 400,
          lineHeight: 1.35,
        }}
      >
        {label}
      </span>
      <span className="flex flex-col items-end shrink-0" style={{ lineHeight: 1.2 }}>
        <span
          style={{
            color: strong ? "oklch(0.88 0.12 75)" : muted ? "oklch(0.62 0.02 80)" : "oklch(0.9 0.02 80)",
            fontFamily: strong ? "'Fraunces', serif" : "'Inter', sans-serif",
            fontWeight: strong ? 600 : 500,
            fontSize: strong ? "1.05rem" : "0.875rem",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
        {sub ? (
          <span
            style={{
              color: "oklch(0.55 0.02 80)",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "0.72rem",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              marginTop: "1px",
            }}
          >
            {sub}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export default function CalculatorPanel({ open, onClose }: CalculatorPanelProps) {
  const [nome, setNome] = useState("");
  const [ncm, setNcm] = useState("");
  const [ncmObs, setNcmObs] = useState<string | undefined>(undefined);
  const [matched, setMatched] = useState(false);

  const [cotacao, setCotacao] = useState("");
  const [precoUnit, setPrecoUnit] = useState("");
  const [qtd, setQtd] = useState("");
  const [ciPct, setCiPct] = useState("");

  // II e IPI vêm do NCM selecionado (não editáveis). null = nenhum NCM escolhido.
  const [iiPct, setIiPct] = useState<number | null>(null);
  const [ipiPct, setIpiPct] = useState<number | null>(null);
  // PIS/COFINS-Importação, seguro e AFRMM são FIXOS do regime — não editáveis.
  const pisPct = PIS_PCT;
  const cofinsPct = COFINS_PCT;
  const seguroPct = SEGURO_PCT;
  const afrmmPct = AFRMM_PCT;
  const siscomex = SISCOMEX_DEFAULT;

  const [freteMaritimo, setFreteMaritimo] = useState("");
  // Como o frete marítimo entra na conta: "ci" (compõe base/imposto) ou "chines"
  // (pago direto ao fornecedor, soma só no custo, sem imposto).
  const [freteModo, setFreteModo] = useState<"ci" | "chines">("ci");
  const [freteTerrestre, setFreteTerrestre] = useState("");
  const [comissaoPct, setComissaoPct] = useState("");
  // Despesas portuárias (Santos, 40 pés) — preenchido com padrão, editável.
  const [despesasPorto, setDespesasPorto] = useState(String(DESPESAS_PORTO_DEFAULT));

  // Confirmação ao sair com dados não salvos.
  const [confirmClose, setConfirmClose] = useState(false);

  // Importação de simulação salva (.json).
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importErro, setImportErro] = useState<string | null>(null);
  const [importOk, setImportOk] = useState(false);

  // Fecha com ESC e trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Ao selecionar um NCM da lista: preenche nome (se vazio), II/IPI e observação.
  const handlePick = (e: NcmEntry) => {
    setNcm(e.ncm);
    setIiPct(e.ii);
    setIpiPct(e.ipi);
    setNcmObs(e.obs);
    setMatched(true);
    if (!nome.trim()) setNome(e.produto);
  };

  // Ao digitar o NCM manualmente: tenta casar com a tabela.
  const handleType = (v: string) => {
    setNcm(v);
    const hit = findNcm(v);
    if (hit) {
      setIiPct(hit.ii);
      setIpiPct(hit.ipi);
      setNcmObs(hit.obs);
      setMatched(true);
      if (!nome.trim()) setNome(hit.produto);
    } else {
      setIiPct(null);
      setIpiPct(null);
      setMatched(false);
      setNcmObs(undefined);
    }
  };

  const calc = useMemo(
    () =>
      computeImportCost({
        cotacao: parseNum(cotacao),
        precoUnitUSD: parseNum(precoUnit),
        quantidade: parseNum(qtd),
        ciPct: parseNum(ciPct),
        iiPct: iiPct ?? 0,
        ipiPct: ipiPct ?? 0,
        pisPct,
        cofinsPct,
        seguroPct,
        freteMaritimoUSD: parseNum(freteMaritimo),
        freteMaritimoModo: freteModo,
        freteTerrestreBRL: parseNum(freteTerrestre),
        comissaoPct: parseNum(comissaoPct),
        afrmmPct,
        siscomexBRL: siscomex,
        despesasPortoBRL: parseNum(despesasPorto),
      }),
    [cotacao, precoUnit, qtd, ciPct, iiPct, ipiPct, pisPct, cofinsPct, seguroPct, freteMaritimo, freteModo, freteTerrestre, comissaoPct, afrmmPct, siscomex, despesasPorto],
  );

  // Cotacão atual (numérica) para converter US$ -> R$ nos resumos.
  const cotacaoNum = parseNum(cotacao);

  // Devolve o equivalente em R$ de um valor em US$, para exibir como SUBVALOR
  // (linha de baixo, fonte menor) ao lado do valor em dólar. Quando a cotação
  // ainda não foi informada (0), devolve undefined (evita "R$ 0,00" enganoso).
  const usdSub = (usd: number): string | undefined =>
    cotacaoNum > 0 ? `≈ ${BRL(usd * cotacaoNum)}` : undefined;

  const qNum = parseNum(qtd);

  // Campos obrigatorios para um calculo valido (NCM/produto + valores).
  const requiredFields: { label: string; value: string }[] = [
    { label: "Cotação do dólar", value: cotacao },
    { label: "Quantidade", value: qtd },
    { label: "Preço real do produto", value: precoUnit },
    { label: "CI (%)", value: ciPct },
    { label: "Frete marítimo", value: freteMaritimo },
    { label: "Frete terrestre", value: freteTerrestre },
    { label: "Comissão", value: comissaoPct },
    { label: "Despesas portuárias", value: despesasPorto },
  ];
  const missing = requiredFields.filter((f) => f.value.trim() === "");
  // Precisa de NCM (que define II/IPI) + todos os campos do usuário.
  const ncmOk = iiPct !== null && ipiPct !== null;
  const isComplete = missing.length === 0 && ncmOk;

  // Monta o snapshot atual usado tanto pelo PDF quanto pelo salvar (.json).
  const buildSnapshot = (): CalcSnapshot => ({
    nome,
    ncm,
    ncmObs,
    geradoEm: Date.now(),
    input: {
      cotacao: parseNum(cotacao),
      precoUnitUSD: parseNum(precoUnit),
      quantidade: parseNum(qtd),
      ciPct: parseNum(ciPct),
      iiPct: iiPct ?? 0,
      ipiPct: ipiPct ?? 0,
      pisPct,
      cofinsPct,
      seguroPct,
      freteMaritimoUSD: parseNum(freteMaritimo),
      freteMaritimoModo: freteModo,
      freteTerrestreBRL: parseNum(freteTerrestre),
      comissaoPct: parseNum(comissaoPct),
      afrmmPct,
      siscomexBRL: siscomex,
      despesasPortoBRL: parseNum(despesasPorto),
    },
    result: calc,
  });

  const [pdfErro, setPdfErro] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const handlePdf = async (incluirPassoAPasso = true) => {
    if (!isComplete || gerandoPdf) return;
    setPdfErro(false);
    setGerandoPdf(true);
    try {
      const ok = await downloadPdfReport(buildSnapshot(), incluirPassoAPasso);
      setPdfErro(!ok);
    } catch {
      setPdfErro(true);
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleSave = () => {
    if (!isComplete) return;
    downloadJson(buildSnapshot());
  };

  // Converte um número do snapshot importado para string de input (vazio se 0 e opcional).
  const numToStr = (n: number): string => (Number.isFinite(n) ? String(n).replace(".", ",") : "");

  // Aplica um snapshot importado a todos os campos do formulário.
  const applySnapshot = (snap: CalcSnapshot) => {
    const i = snap.input;
    setNome(snap.nome || "");
    setNcm(snap.ncm || "");
    setNcmObs(snap.ncmObs);
    // Reconhece II/IPI vindos do arquivo (mesmo que o NCM não esteja na tabela).
    setIiPct(i.iiPct);
    setIpiPct(i.ipiPct);
    setMatched(!!findNcm(snap.ncm || ""));
    setCotacao(numToStr(i.cotacao));
    setPrecoUnit(numToStr(i.precoUnitUSD));
    setQtd(numToStr(i.quantidade));
    setCiPct(numToStr(i.ciPct));
    setFreteMaritimo(numToStr(i.freteMaritimoUSD));
    setFreteModo(i.freteMaritimoModo ?? "ci");
    setFreteTerrestre(numToStr(i.freteTerrestreBRL));
    setComissaoPct(numToStr(i.comissaoPct));
    setDespesasPorto(numToStr(i.despesasPortoBRL));
    setPdfErro(false);
    setConfirmClose(false);
  };

  const handleImportClick = () => {
    setImportErro(null);
    setImportOk(false);
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite reimportar o mesmo arquivo depois (limpa o value).
    e.target.value = "";
    if (!file) return;
    setImportErro(null);
    setImportOk(false);
    try {
      const text = await file.text();
      const res = parseImportedSnapshot(text);
      if (!res.ok || !res.snapshot) {
        setImportErro(res.error ?? "Não foi possível ler o arquivo.");
        return;
      }
      applySnapshot(res.snapshot);
      setImportOk(true);
      window.setTimeout(() => setImportOk(false), 4000);
    } catch {
      setImportErro("Não foi possível ler o arquivo selecionado.");
    }
  };

  const reset = () => {
    setNome("");
    setNcm("");
    setNcmObs(undefined);
    setMatched(false);
    setCotacao("");
    setPrecoUnit("");
    setQtd("");
    setCiPct("");
    setIiPct(null);
    setIpiPct(null);
    setFreteMaritimo("");
    setFreteModo("ci");
    setFreteTerrestre("");
    setComissaoPct("");
    setDespesasPorto(String(DESPESAS_PORTO_DEFAULT));
    setPdfErro(false);
    setConfirmClose(false);
    setImportErro(null);
    setImportOk(false);
  };

  // "Sujo" = usuário mexeu em algo (ignora despesas portuárias, que já vem com padrão).
  const isDirty =
    nome.trim() !== "" ||
    ncm.trim() !== "" ||
    cotacao.trim() !== "" ||
    precoUnit.trim() !== "" ||
    qtd.trim() !== "" ||
    ciPct.trim() !== "" ||
    freteMaritimo.trim() !== "" ||
    freteTerrestre.trim() !== "" ||
    comissaoPct.trim() !== "";

  // Fechar com segurança: se houver dados, pede confirmação; senão fecha direto.
  const requestClose = () => {
    if (isDirty) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };
  // Ref para o listener de ESC sempre enxergar a versão atual.
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Calculadora de custo de importação"
    >
      <div
        className="absolute inset-0"
        style={{ background: "oklch(0.08 0.02 250 / 0.78)", backdropFilter: "blur(6px)" }}
        onClick={requestClose}
      />

      <div
        className="relative w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "oklch(0.13 0.02 255)",
          border: "1px solid oklch(0.28 0.04 260)",
          boxShadow: "0 30px 80px oklch(0 0 0 / 0.55), 0 0 0 1px oklch(0.78 0.16 75 / 0.12)",
          animation: "calc-pop 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <style>{`
          @keyframes calc-pop {
            from { opacity: 0; transform: scale(0.97) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Cabeçalho */}
        <div
          className="flex items-center justify-between gap-4 px-6 py-5 border-b shrink-0"
          style={{ borderColor: "oklch(0.24 0.03 258)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
              style={{ background: "oklch(0.78 0.16 75 / 0.16)", border: "1px solid oklch(0.78 0.16 75 / 0.4)" }}
            >
              <Calculator className="w-5 h-5" style={{ color: "oklch(0.82 0.14 75)" }} />
            </div>
            <div className="min-w-0">
              <h2
                className="text-lg font-semibold truncate"
                style={{ color: "oklch(0.96 0.02 80)", fontFamily: "'Fraunces', serif" }}
              >
                Calculadora
              </h2>
              <p className="text-xs truncate" style={{ color: "oklch(0.6 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                Custo de importação · cadeia tributária completa · simulação
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              onClick={handleImportClick}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm transition-transform active:scale-95"
              style={{
                background: "oklch(0.18 0.02 258)",
                border: "1px solid oklch(0.3 0.04 260)",
                color: "oklch(0.85 0.02 80)",
                fontFamily: "'Inter', sans-serif",
              }}
              title="Importar uma simulação salva (.json) para reabrir e editar"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm transition-transform active:scale-95"
              style={{
                background: "oklch(0.18 0.02 258)",
                border: "1px solid oklch(0.3 0.04 260)",
                color: "oklch(0.85 0.02 80)",
                fontFamily: "'Inter', sans-serif",
              }}
              title="Limpar campos"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
            <button
              onClick={requestClose}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm transition-transform active:scale-95"
              style={{ background: "oklch(0.18 0.02 258)", border: "1px solid oklch(0.3 0.04 260)", color: "oklch(0.85 0.02 80)", fontFamily: "'Inter', sans-serif" }}
              aria-label="Voltar"
              title="Voltar"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          </div>
        </div>

        {/* Barra de confirmação de saída (dados não salvos) */}
        {confirmClose && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b shrink-0"
            style={{ background: "oklch(0.2 0.06 70 / 0.25)", borderColor: "oklch(0.5 0.12 70 / 0.4)" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "oklch(0.82 0.14 75)" }} />
              <span className="text-sm" style={{ color: "oklch(0.92 0.04 80)", fontFamily: "'Inter', sans-serif" }}>
                Você tem uma simulação não salva. Deseja sair mesmo assim?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isComplete && (
                <button
                  onClick={async () => {
                    await handlePdf();
                  }}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm font-medium transition-transform active:scale-95"
                  style={{ background: "oklch(0.78 0.16 75)", color: "oklch(0.16 0.03 60)", fontFamily: "'Inter', sans-serif" }}
                >
                  <FileText className="w-4 h-4" /> Salvar em PDF
                </button>
              )}
              <button
                onClick={() => setConfirmClose(false)}
                className="px-3 h-8 rounded-lg text-sm transition-transform active:scale-95"
                style={{ background: "oklch(0.22 0.02 258)", border: "1px solid oklch(0.32 0.04 260)", color: "oklch(0.9 0.02 80)", fontFamily: "'Inter', sans-serif" }}
              >
                Continuar editando
              </button>
              <button
                onClick={onClose}
                className="px-3 h-8 rounded-lg text-sm transition-transform active:scale-95"
                style={{ background: "oklch(0.45 0.16 25 / 0.25)", border: "1px solid oklch(0.55 0.18 25 / 0.5)", color: "oklch(0.85 0.12 30)", fontFamily: "'Inter', sans-serif" }}
              >
                Sair sem salvar
              </button>
            </div>
          </div>
        )}

        {/* Feedback de importação (.json) */}
        {importErro && (
          <div
            className="flex items-center gap-2 px-6 py-3 border-b shrink-0"
            style={{ background: "oklch(0.45 0.16 25 / 0.18)", borderColor: "oklch(0.55 0.18 25 / 0.45)" }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "oklch(0.78 0.16 35)" }} />
            <span className="text-sm" style={{ color: "oklch(0.85 0.1 35)", fontFamily: "'Inter', sans-serif" }}>
              {importErro}
            </span>
          </div>
        )}
        {importOk && (
          <div
            className="flex items-center gap-2 px-6 py-3 border-b shrink-0"
            style={{ background: "oklch(0.6 0.13 150 / 0.14)", borderColor: "oklch(0.6 0.13 150 / 0.4)" }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "oklch(0.75 0.15 150)" }} />
            <span className="text-sm" style={{ color: "oklch(0.8 0.08 150)", fontFamily: "'Inter', sans-serif" }}>
              Simulação importada — os campos foram preenchidos. Edite o que precisar.
            </span>
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* Coluna de entradas */}
            <div className="flex flex-col gap-4">
              <NcmField ncm={ncm} onPick={handlePick} onType={handleType} />

              {matched ? (
                <div
                  className="flex items-start gap-2 rounded-lg px-3 py-2 -mt-1"
                  style={{ background: "oklch(0.6 0.13 150 / 0.12)", border: "1px solid oklch(0.6 0.13 150 / 0.35)" }}
                >
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.75 0.15 150)" }} />
                  <span className="text-xs leading-relaxed" style={{ color: "oklch(0.8 0.05 150)", fontFamily: "'Inter', sans-serif" }}>
                    NCM reconhecido — II e IPI definidos automaticamente.
                    {ncmObs ? ` Obs.: ${ncmObs}` : ""}
                  </span>
                </div>
              ) : null}

              <TextField label="Nome do produto" value={nome} onChange={setNome} placeholder="Digite o nome do produto" icon={<Package className="w-3.5 h-3.5" />} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Cotação do dólar" value={cotacao} onChange={setCotacao} placeholder="Digite a cotação" prefix="R$" icon={<DollarSign className="w-3.5 h-3.5" />} hint="Quanto vale US$ 1,00 em reais" required />
                <Field label="Qtd. de unidades no container" value={qtd} onChange={setQtd} placeholder="Digite a quantidade" suffix="un" required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Preço real do produto" value={precoUnit} onChange={setPrecoUnit} placeholder="Digite o preço" prefix="US$" hint="Valor real por unidade (em dólar)" required />
                <Field label="CI (% do valor real)" value={ciPct} onChange={setCiPct} placeholder="Digite o %" suffix="%" icon={<Percent className="w-3.5 h-3.5" />} hint="Base declarada — reduz toda a cadeia tributária" required />
              </div>

              {/* Tributos aplicados — FIXOS, somente leitura (II/IPI do NCM, demais do regime) */}
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: "oklch(0.1 0.018 255)", border: "1px solid oklch(0.26 0.035 260)" }}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4" style={{ color: "oklch(0.72 0.06 75)" }} />
                  <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "oklch(0.7 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                    Tributos aplicados
                  </span>
                  <span className="text-[0.65rem] px-2 py-0.5 rounded-full" style={{ background: "oklch(0.6 0.13 150 / 0.15)", color: "oklch(0.8 0.08 150)", fontFamily: "'Inter', sans-serif" }}>
                    automático
                  </span>
                </div>
                <p className="text-[0.7rem] leading-snug -mt-1" style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                  II e IPI vêm do NCM escolhido. Seguro, PIS-Importação, COFINS-Importação, AFRMM e Siscomex são fixos — você não precisa preencher nada aqui.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  <ReadOnlyTax label="II" value={iiPct !== null ? `${iiPct}%` : "—"} highlight={iiPct !== null} />
                  <ReadOnlyTax label="IPI" value={ipiPct !== null ? `${ipiPct}%` : "—"} highlight={ipiPct !== null} />
                  <ReadOnlyTax label="Seguro" value={`${seguroPct}%`} />
                  <ReadOnlyTax label="PIS-Imp." value={`${pisPct}%`} />
                  <ReadOnlyTax label="COFINS-Imp." value={`${cofinsPct}%`} />
                  <ReadOnlyTax label="AFRMM" value={`${afrmmPct}%`} />
                  <ReadOnlyTax label="Siscomex" value={BRL(siscomex)} />
                </div>
                {iiPct === null ? (
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: "oklch(0.7 0.15 60 / 0.12)", border: "1px solid oklch(0.7 0.15 60 / 0.4)" }}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "oklch(0.8 0.16 60)" }} />
                    <span className="text-[0.72rem] leading-snug" style={{ color: "oklch(0.82 0.08 70)", fontFamily: "'Inter', sans-serif" }}>
                      Escolha um NCM acima para definir II e IPI automaticamente.
                    </span>
                  </div>
                ) : null}
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "oklch(0.16 0.02 258)", border: "1px solid oklch(0.28 0.04 260)" }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "oklch(0.75 0.15 150)" }} />
                  <span className="text-[0.72rem] leading-snug" style={{ color: "oklch(0.7 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                    ICMS de importação: <strong style={{ color: "oklch(0.85 0.02 80)" }}>R$ 0</strong> — benefício TTS (Corredor de Importação MG). O TTS é estadual: PIS e COFINS de importação (federais) continuam sendo pagos na DI.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Field
                    label="Frete marítimo"
                    value={freteMaritimo}
                    onChange={setFreteMaritimo}
                    placeholder="Digite o frete"
                    prefix="US$"
                    icon={<Ship className="w-3.5 h-3.5" />}
                    hint={
                      freteModo === "ci"
                        ? "Compõe o valor aduaneiro — gera imposto (II/IPI/PIS/COFINS)"
                        : "Pago direto ao chinês — entra só no custo, SEM imposto"
                    }
                    required
                  />
                  {/* Toggle: como o frete entra na conta */}
                  <div
                    className="flex rounded-lg overflow-hidden"
                    style={{ border: "1px solid oklch(0.28 0.04 260)", background: "oklch(0.1 0.018 255)" }}
                  >
                    <button
                      type="button"
                      onClick={() => setFreteModo("ci")}
                      className="flex-1 px-3 py-2 text-[0.72rem] font-semibold transition-colors"
                      style={{
                        background: freteModo === "ci" ? "oklch(0.78 0.16 75 / 0.9)" : "transparent",
                        color: freteModo === "ci" ? "oklch(0.16 0.03 60)" : "oklch(0.7 0.02 80)",
                        fontFamily: "'Inter', sans-serif",
                      }}
                      title="O frete compõe o valor aduaneiro e gera imposto"
                    >
                      Dentro da CI (com imposto)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFreteModo("chines")}
                      className="flex-1 px-3 py-2 text-[0.72rem] font-semibold transition-colors"
                      style={{
                        background: freteModo === "chines" ? "oklch(0.78 0.16 75 / 0.9)" : "transparent",
                        color: freteModo === "chines" ? "oklch(0.16 0.03 60)" : "oklch(0.7 0.02 80)",
                        fontFamily: "'Inter', sans-serif",
                        borderLeft: "1px solid oklch(0.28 0.04 260)",
                      }}
                      title="Frete pago direto ao chinês: entra só no custo, sem imposto"
                    >
                      Pago ao chinês (sem imposto)
                    </button>
                  </div>
                </div>
                <Field label="Frete terrestre" value={freteTerrestre} onChange={setFreteTerrestre} placeholder="Digite o frete" prefix="R$" icon={<Truck className="w-3.5 h-3.5" />} hint="Valor fixo em reais" required />
              </div>

              <Field label="Comissão Bety" value={comissaoPct} onChange={setComissaoPct} placeholder="Digite o %" suffix="%" icon={<Percent className="w-3.5 h-3.5" />} hint="Sobre o valor real do produto" required />

              <Field label="Despesas portuárias (Santos)" value={despesasPorto} onChange={setDespesasPorto} placeholder="Digite o valor" prefix="R$" icon={<Package className="w-3.5 h-3.5" />} hint="Container 40 pés: THC, ISPS, desconsolidação, armazenagem (3-4 dias) e liberação · já preenchido, ajuste se precisar" required />
            </div>

            {/* Coluna de resultado + detalhamento tributário */}
            <div className="flex flex-col gap-4 h-fit lg:sticky lg:top-0">
              {/* Card de custo */}
              <div
                className="rounded-xl p-5 flex flex-col gap-2"
                style={{ background: "oklch(0.1 0.018 255)", border: "1px solid oklch(0.28 0.04 260)" }}
              >
                <h3
                  className="text-sm font-semibold uppercase tracking-[0.1em] mb-1"
                  style={{ color: "oklch(0.7 0.02 80)", fontFamily: "'Inter', sans-serif" }}
                >
                  Resultado {nome ? `· ${nome}` : ""}
                </h3>

                {!isComplete ? (
                  <div
                    className="flex items-start gap-2 rounded-lg px-3 py-2 mb-1"
                    style={{ background: "oklch(0.7 0.15 60 / 0.12)", border: "1px solid oklch(0.7 0.15 60 / 0.4)" }}
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.8 0.16 60)" }} />
                    <span className="text-[0.72rem] leading-snug" style={{ color: "oklch(0.82 0.08 70)", fontFamily: "'Inter', sans-serif" }}>
                      Faltam <strong>{missing.length}</strong> {missing.length === 1 ? "campo" : "campos"} para o cálculo: {missing.map((m) => m.label).join(", ")}.
                    </span>
                  </div>
                ) : null}

                <div
                  className="rounded-lg p-4 mb-2"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.78 0.16 75 / 0.16), oklch(0.55 0.18 25 / 0.14))",
                    border: "1px solid oklch(0.78 0.16 75 / 0.4)",
                  }}
                >
                  <div className="text-xs uppercase tracking-[0.12em]" style={{ color: "oklch(0.72 0.06 75)", fontFamily: "'Inter', sans-serif" }}>
                    Custo por unidade
                  </div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.9rem", fontWeight: 600, color: "oklch(0.95 0.08 80)", lineHeight: 1.1 }}>
                    {BRL(calc.custoUnitarioBRL)}
                  </div>
                </div>

                {/* Ações rápidas (visíveis junto ao resultado) */}
                <div className="grid grid-cols-2 gap-2 mb-1">
                  <button
                    onClick={() => handlePdf(true)}
                    disabled={!isComplete || gerandoPdf}
                    className="flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-semibold transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "oklch(0.78 0.16 75)", color: "oklch(0.16 0.03 60)", fontFamily: "'Inter', sans-serif" }}
                    title={isComplete ? "Baixar o PDF completo (com a explicação do cálculo)" : "Preencha todos os campos obrigatórios primeiro"}
                  >
                    {gerandoPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {gerandoPdf ? "Gerando..." : "PDF completo"}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!isComplete}
                    className="flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-semibold transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "oklch(0.2 0.02 258)", border: "1px solid oklch(0.32 0.04 260)", color: "oklch(0.9 0.02 80)", fontFamily: "'Inter', sans-serif" }}
                    title={isComplete ? "Salvar a simulação (arquivo .json) para reabrir depois" : "Preencha todos os campos obrigatórios primeiro"}
                  >
                    <Save className="w-4 h-4" /> Salvar
                  </button>
                </div>

                <ResultRow label="Custo total (container)" value={BRL(calc.custoTotalBRL)} strong />
                <div className="h-px my-2" style={{ background: "oklch(0.24 0.03 258)" }} />
                <ResultRow label={`Valor real (${qNum || 0} un)`} value={USD(calc.valorRealTotalUSD)} sub={usdSub(calc.valorRealTotalUSD)} />
                <ResultRow label="Comissão Bety" value={USD(calc.comissaoUSD)} sub={usdSub(calc.comissaoUSD)} />
                <ResultRow
                  label={freteModo === "chines" ? "Frete marítimo (pago ao chinês)" : "Frete marítimo (na CI)"}
                  value={USD(calc.freteMaritimoUSD)}
                  sub={usdSub(calc.freteMaritimoUSD)}
                />
                <ResultRow label="AFRMM" value={BRL(calc.afrmmBRL)} />
                <ResultRow label="Taxa Siscomex" value={BRL(calc.siscomexBRL)} />
                <ResultRow label="Frete terrestre" value={BRL(calc.freteTerrestreBRL)} />
                <ResultRow label="Despesas portúrias (Santos)" value={BRL(calc.despesasPortoBRL)} />

              </div>

              {/* Card paralelo — detalhamento tributário */}
              <div
                className="rounded-xl p-5 flex flex-col gap-1"
                style={{ background: "oklch(0.1 0.018 255)", border: "1px solid oklch(0.78 0.16 75 / 0.28)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="w-4 h-4" style={{ color: "oklch(0.82 0.14 75)" }} />
                  <h3
                    className="text-sm font-semibold uppercase tracking-[0.1em]"
                    style={{ color: "oklch(0.7 0.02 80)", fontFamily: "'Inter', sans-serif" }}
                  >
                    Detalhamento tributário
                  </h3>
                </div>

                <ResultRow label="Valor real total" value={USD(calc.valorRealTotalUSD)} sub={usdSub(calc.valorRealTotalUSD)} muted />
                <ResultRow label={`Base declarada (CI ${parseNum(ciPct) || 0}%)`} value={USD(calc.baseDeclaradaUSD)} sub={usdSub(calc.baseDeclaradaUSD)} muted />
                <ResultRow label={`Seguro (${seguroPct}% s/ base)`} value={USD(calc.seguroUSD)} sub={usdSub(calc.seguroUSD)} muted />
                <ResultRow
                  label={freteModo === "chines" ? "Valor aduaneiro (frete fora — sem imposto)" : "Valor aduaneiro (+ frete + seguro)"}
                  value={USD(calc.valorAduaneiroUSD)}
                  sub={usdSub(calc.valorAduaneiroUSD)}
                />
                <div className="h-px my-2" style={{ background: "oklch(0.24 0.03 258)" }} />
                <ResultRow label={`II (${iiPct ?? 0}%)`} value={USD(calc.iiUSD)} sub={usdSub(calc.iiUSD)} />
                <ResultRow label={`IPI (${ipiPct ?? 0}%)`} value={USD(calc.ipiUSD)} sub={usdSub(calc.ipiUSD)} />
                <ResultRow label={`PIS-Imp. (${pisPct}%)`} value={USD(calc.pisUSD)} sub={usdSub(calc.pisUSD)} />
                <ResultRow label={`COFINS-Imp. (${cofinsPct}%)`} value={USD(calc.cofinsUSD)} sub={usdSub(calc.cofinsUSD)} />
                <ResultRow label="ICMS importação" value="R$ 0 · TTS ✓" muted />
                <div className="h-px my-2" style={{ background: "oklch(0.24 0.03 258)" }} />
                <ResultRow label="Total de tributos" value={USD(calc.tributosUSD)} sub={usdSub(calc.tributosUSD)} strong />

                <p className="text-[0.7rem] leading-relaxed mt-2" style={{ color: "oklch(0.5 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                  {freteModo === "chines"
                    ? "Frete marítimo PAGO AO CHINÊS: não entra no valor aduaneiro nem gera II/IPI/PIS/COFINS — soma apenas no custo final (em R$). "
                    : "Frete marítimo DENTRO DA CI: compõe o valor aduaneiro e gera imposto. "}
                  Seguro (0,40% da base declarada) entra no valor aduaneiro. IPI incide sobre (valor aduaneiro + II). PIS/COFINS-Importação (2,1% + 9,65%) sobre o valor aduaneiro. AFRMM (8%), Siscomex e despesas portuárias são somados em R$ ao custo final. Valores em US$ com o equivalente em R$ entre parênteses (pela cotação informada).
                </p>
              </div>

              {/* Card de ações — salvar simulação e gerar PDF */}
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: "oklch(0.1 0.018 255)", border: "1px solid oklch(0.28 0.04 260)" }}
              >
                <span
                  className="text-xs font-semibold uppercase tracking-[0.1em]"
                  style={{ color: "oklch(0.7 0.02 80)", fontFamily: "'Inter', sans-serif" }}
                >
                  Exportar simulação
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handlePdf(true)}
                    disabled={!isComplete || gerandoPdf}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-transform active:scale-[0.97]"
                    style={{
                      background: isComplete ? "linear-gradient(135deg, oklch(0.78 0.16 75 / 0.9), oklch(0.6 0.18 35 / 0.9))" : "oklch(0.2 0.02 258)",
                      color: isComplete ? "oklch(0.16 0.02 60)" : "oklch(0.5 0.02 80)",
                      fontFamily: "'Inter', sans-serif",
                      cursor: isComplete && !gerandoPdf ? "pointer" : "not-allowed",
                      opacity: isComplete ? (gerandoPdf ? 0.8 : 1) : 0.7,
                    }}
                    title={isComplete ? "PDF completo: resultado + detalhamento + passo a passo do cálculo" : "Preencha todos os campos obrigatórios primeiro"}
                  >
                    {gerandoPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {gerandoPdf ? "Gerando PDF..." : "PDF completo"}
                  </button>
                  <button
                    onClick={() => handlePdf(false)}
                    disabled={!isComplete || gerandoPdf}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-transform active:scale-[0.97]"
                    style={{
                      background: "oklch(0.18 0.02 258)",
                      border: "1px solid oklch(0.55 0.12 75 / 0.5)",
                      color: isComplete ? "oklch(0.85 0.1 75)" : "oklch(0.5 0.02 80)",
                      fontFamily: "'Inter', sans-serif",
                      cursor: isComplete && !gerandoPdf ? "pointer" : "not-allowed",
                      opacity: isComplete ? 1 : 0.7,
                    }}
                    title={isComplete ? "PDF resumido: apenas resultado + detalhamento (sem o passo a passo)" : "Preencha todos os campos obrigatórios primeiro"}
                  >
                    {gerandoPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {gerandoPdf ? "Gerando PDF..." : "PDF resumido"}
                  </button>
                </div>
                {pdfErro ? (
                  <div
                    className="flex items-start gap-2 rounded-lg px-3 py-2"
                    style={{ background: "oklch(0.6 0.16 50 / 0.12)", border: "1px solid oklch(0.6 0.16 50 / 0.4)" }}
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.78 0.16 60)" }} />
                    <span className="text-[0.72rem] leading-snug" style={{ color: "oklch(0.8 0.06 60)", fontFamily: "'Inter', sans-serif" }}>
                      Não foi possível gerar o PDF. Tente novamente.
                    </span>
                  </div>
                ) : (
                  <p className="text-[0.7rem] leading-relaxed" style={{ color: "oklch(0.5 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                    O PDF é baixado direto no seu dispositivo (sem janela de impressão) e traz todos os dados, o resultado e a explicação passo a passo de cada conta. Salvar gera um arquivo reabrível.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
