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
} from "lucide-react";
import {
  NCM_TABLE,
  findNcm,
  normalizeNcm,
  computeImportCost,
  PIS_PCT,
  COFINS_PCT,
  AFRMM_PCT,
  SISCOMEX_DEFAULT,
  type NcmEntry,
} from "./importTax";

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
}

function Field({ label, hint, value, onChange, placeholder, icon, suffix, prefix }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-xs font-semibold uppercase tracking-[0.08em] flex items-center gap-1.5"
        style={{ color: "oklch(0.6 0.02 80)", fontFamily: "'Inter', sans-serif" }}
      >
        {icon}
        {label}
      </label>
      <div
        className="flex items-center rounded-lg overflow-hidden"
        style={{ background: "oklch(0.1 0.018 255)", border: "1px solid oklch(0.28 0.04 260)" }}
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

function ResultRow({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span
        className="text-sm"
        style={{
          color: strong ? "oklch(0.95 0.02 80)" : muted ? "oklch(0.55 0.02 80)" : "oklch(0.72 0.02 80)",
          fontFamily: "'Inter', sans-serif",
          fontWeight: strong ? 600 : 400,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: strong ? "oklch(0.88 0.12 75)" : muted ? "oklch(0.62 0.02 80)" : "oklch(0.9 0.02 80)",
          fontFamily: strong ? "'Fraunces', serif" : "'Inter', sans-serif",
          fontWeight: strong ? 600 : 500,
          fontSize: strong ? "1.05rem" : "0.875rem",
        }}
      >
        {value}
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

  // Campos tributários (todos editáveis para simulação).
  const [iiPct, setIiPct] = useState("");
  const [ipiPct, setIpiPct] = useState("");
  const [pisPct, setPisPct] = useState(String(PIS_PCT).replace(".", ","));
  const [cofinsPct, setCofinsPct] = useState(String(COFINS_PCT).replace(".", ","));
  const [afrmmPct, setAfrmmPct] = useState(String(AFRMM_PCT));
  const [siscomex, setSiscomex] = useState(String(SISCOMEX_DEFAULT));

  const [freteMaritimo, setFreteMaritimo] = useState("");
  const [freteTerrestre, setFreteTerrestre] = useState("");
  const [comissaoPct, setComissaoPct] = useState("");

  // Fecha com ESC e trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Ao selecionar um NCM da lista: preenche nome (se vazio), II/IPI e observação.
  const handlePick = (e: NcmEntry) => {
    setNcm(e.ncm);
    setIiPct(String(e.ii).replace(".", ","));
    setIpiPct(String(e.ipi).replace(".", ","));
    setNcmObs(e.obs);
    setMatched(true);
    if (!nome.trim()) setNome(e.produto);
  };

  // Ao digitar o NCM manualmente: tenta casar com a tabela.
  const handleType = (v: string) => {
    setNcm(v);
    const hit = findNcm(v);
    if (hit) {
      setIiPct(String(hit.ii).replace(".", ","));
      setIpiPct(String(hit.ipi).replace(".", ","));
      setNcmObs(hit.obs);
      setMatched(true);
      if (!nome.trim()) setNome(hit.produto);
    } else {
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
        iiPct: parseNum(iiPct),
        ipiPct: parseNum(ipiPct),
        pisPct: parseNum(pisPct),
        cofinsPct: parseNum(cofinsPct),
        freteMaritimoUSD: parseNum(freteMaritimo),
        freteTerrestreBRL: parseNum(freteTerrestre),
        comissaoPct: parseNum(comissaoPct),
        afrmmPct: parseNum(afrmmPct),
        siscomexBRL: parseNum(siscomex),
      }),
    [cotacao, precoUnit, qtd, ciPct, iiPct, ipiPct, pisPct, cofinsPct, freteMaritimo, freteTerrestre, comissaoPct, afrmmPct, siscomex],
  );

  const qNum = parseNum(qtd);

  const reset = () => {
    setNome("");
    setNcm("");
    setNcmObs(undefined);
    setMatched(false);
    setCotacao("");
    setPrecoUnit("");
    setQtd("");
    setCiPct("");
    setIiPct("");
    setIpiPct("");
    setPisPct(String(PIS_PCT).replace(".", ","));
    setCofinsPct(String(COFINS_PCT).replace(".", ","));
    setAfrmmPct(String(AFRMM_PCT));
    setSiscomex(String(SISCOMEX_DEFAULT));
    setFreteMaritimo("");
    setFreteTerrestre("");
    setComissaoPct("");
  };

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
        onClick={onClose}
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
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-transform active:scale-95"
              style={{ background: "oklch(0.18 0.02 258)", border: "1px solid oklch(0.3 0.04 260)", color: "oklch(0.85 0.02 80)" }}
              aria-label="Fechar"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

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
                    NCM reconhecido — II e IPI preenchidos automaticamente (edite se necessário).
                    {ncmObs ? ` Obs.: ${ncmObs}` : ""}
                  </span>
                </div>
              ) : null}

              <TextField label="Nome do produto" value={nome} onChange={setNome} placeholder="Ex.: Tapete higiênico 60x90" icon={<Package className="w-3.5 h-3.5" />} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Cotação do dólar" value={cotacao} onChange={setCotacao} placeholder="5,40" prefix="R$" icon={<DollarSign className="w-3.5 h-3.5" />} hint="Quanto vale US$ 1,00 em reais" />
                <Field label="Qtd. de unidades no container" value={qtd} onChange={setQtd} placeholder="5000" suffix="un" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Preço real do produto" value={precoUnit} onChange={setPrecoUnit} placeholder="0,85" prefix="US$" hint="Valor real por unidade (em dólar)" />
                <Field label="CI (% do valor real)" value={ciPct} onChange={setCiPct} placeholder="60" suffix="%" icon={<Percent className="w-3.5 h-3.5" />} hint="Base declarada — reduz toda a cadeia tributária" />
              </div>

              {/* Bloco de alíquotas tributárias */}
              <div
                className="rounded-xl p-4 flex flex-col gap-4"
                style={{ background: "oklch(0.1 0.018 255)", border: "1px solid oklch(0.26 0.035 260)" }}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4" style={{ color: "oklch(0.72 0.06 75)" }} />
                  <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "oklch(0.7 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                    Tributos (editáveis)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field label="II" value={iiPct} onChange={setIiPct} placeholder="14,4" suffix="%" />
                  <Field label="IPI" value={ipiPct} onChange={setIpiPct} placeholder="3,25" suffix="%" />
                  <Field label="PIS" value={pisPct} onChange={setPisPct} placeholder="0,65" suffix="%" />
                  <Field label="COFINS" value={cofinsPct} onChange={setCofinsPct} placeholder="3,0" suffix="%" />
                  <Field label="AFRMM" value={afrmmPct} onChange={setAfrmmPct} placeholder="8" suffix="%" />
                  <Field label="Siscomex" value={siscomex} onChange={setSiscomex} placeholder="250" prefix="R$" />
                </div>
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "oklch(0.16 0.02 258)", border: "1px solid oklch(0.28 0.04 260)" }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "oklch(0.75 0.15 150)" }} />
                  <span className="text-[0.72rem] leading-snug" style={{ color: "oklch(0.7 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                    ICMS de importação: <strong style={{ color: "oklch(0.85 0.02 80)" }}>R$ 0</strong> — benefício TTS (Corredor de Importação MG).
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Frete marítimo" value={freteMaritimo} onChange={setFreteMaritimo} placeholder="3500" prefix="US$" icon={<Ship className="w-3.5 h-3.5" />} hint="Pago ao fornecedor + compõe o valor aduaneiro" />
                <Field label="Frete terrestre" value={freteTerrestre} onChange={setFreteTerrestre} placeholder="2000" prefix="R$" icon={<Truck className="w-3.5 h-3.5" />} hint="Valor fixo em reais" />
              </div>

              <Field label="Comissão Bety" value={comissaoPct} onChange={setComissaoPct} placeholder="5" suffix="%" icon={<Percent className="w-3.5 h-3.5" />} hint="Sobre o valor real do produto" />
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

                <ResultRow label="Custo total (container)" value={BRL(calc.custoTotalBRL)} strong />
                <div className="h-px my-2" style={{ background: "oklch(0.24 0.03 258)" }} />
                <ResultRow label={`Valor real (${qNum || 0} un)`} value={USD(calc.valorRealTotalUSD)} />
                <ResultRow label="Comissão Bety" value={USD(calc.comissaoUSD)} />
                <ResultRow label="Frete marítimo" value={USD(calc.freteMaritimoUSD)} />
                <ResultRow label="AFRMM" value={BRL(calc.afrmmBRL)} />
                <ResultRow label="Taxa Siscomex" value={BRL(calc.siscomexBRL)} />
                <ResultRow label="Frete terrestre" value={BRL(calc.freteTerrestreBRL)} />
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

                <ResultRow label="Valor real total" value={USD(calc.valorRealTotalUSD)} muted />
                <ResultRow label={`Base declarada (CI ${parseNum(ciPct) || 0}%)`} value={USD(calc.baseDeclaradaUSD)} muted />
                <ResultRow label="Valor aduaneiro (+ frete mar.)" value={USD(calc.valorAduaneiroUSD)} />
                <div className="h-px my-2" style={{ background: "oklch(0.24 0.03 258)" }} />
                <ResultRow label={`II (${parseNum(iiPct) || 0}%)`} value={USD(calc.iiUSD)} />
                <ResultRow label={`IPI (${parseNum(ipiPct) || 0}%)`} value={USD(calc.ipiUSD)} />
                <ResultRow label={`PIS (${parseNum(pisPct) || 0}%)`} value={USD(calc.pisUSD)} />
                <ResultRow label={`COFINS (${parseNum(cofinsPct) || 0}%)`} value={USD(calc.cofinsUSD)} />
                <ResultRow label="ICMS importação" value="R$ 0 · TTS ✓" muted />
                <div className="h-px my-2" style={{ background: "oklch(0.24 0.03 258)" }} />
                <ResultRow label="Total de tributos" value={USD(calc.tributosUSD)} strong />

                <p className="text-[0.7rem] leading-relaxed mt-2" style={{ color: "oklch(0.5 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                  IPI incide sobre (valor aduaneiro + II). PIS/COFINS sobre o valor aduaneiro. AFRMM (8%) e Siscomex são somados em R$ ao custo final. Valores em US$ convertidos pela cotação.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
