// =============================================================================
// CalculatorPanel — calculadora de custo de importação (overlay).
//
// Mesmo padrão visual do NegotiationSummaryPanel (fixed inset-0, backdrop blur,
// card max-w, animação de entrada). Puramente client-side: nada é persistido.
//
// Regra de cálculo (combinada com o usuário):
//   valorRealTotalUSD = precoRealUnitarioUSD × quantidade
//   baseCI_USD        = valorRealTotalUSD × (CI% / 100)        // valor declarado (abaixo do real)
//   impostoUSD        = (baseCI_USD + freteMaritimoUSD) × (aliquota% / 100)
//   comissaoUSD       = valorRealTotalUSD × (comissaoBety% / 100)
//   // frete marítimo é pago ao chinês 1x (entra no custo) e também compõe a base do imposto
//   custoTotalBRL     = (valorRealTotalUSD + freteMaritimoUSD + impostoUSD + comissaoUSD) × cotacao
//                       + freteTerrestreBRL                    // frete terrestre já em R$
//   custoUnitarioBRL  = custoTotalBRL / quantidade
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import { X, Calculator, RotateCcw, Package, Ship, Truck, Percent, DollarSign } from "lucide-react";

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

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const USD = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "USD" });

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

function ResultRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span
        className="text-sm"
        style={{
          color: strong ? "oklch(0.95 0.02 80)" : "oklch(0.72 0.02 80)",
          fontFamily: "'Inter', sans-serif",
          fontWeight: strong ? 600 : 400,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: strong ? "oklch(0.88 0.12 75)" : "oklch(0.9 0.02 80)",
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
  const [cotacao, setCotacao] = useState("");
  const [precoUnit, setPrecoUnit] = useState("");
  const [qtd, setQtd] = useState("");
  const [ciPct, setCiPct] = useState("");
  const [aliquotaPct, setAliquotaPct] = useState("");
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

  const calc = useMemo(() => {
    const cot = parseNum(cotacao);
    const pUnit = parseNum(precoUnit);
    const q = parseNum(qtd);
    const ci = parseNum(ciPct) / 100;
    const aliq = parseNum(aliquotaPct) / 100;
    const fMar = parseNum(freteMaritimo); // US$
    const fTer = parseNum(freteTerrestre); // R$
    const com = parseNum(comissaoPct) / 100;

    const valorRealTotalUSD = pUnit * q;
    const baseCI_USD = valorRealTotalUSD * ci;
    const impostoUSD = (baseCI_USD + fMar) * aliq;
    const comissaoUSD = valorRealTotalUSD * com;

    const subtotalUSD = valorRealTotalUSD + fMar + impostoUSD + comissaoUSD;
    const custoTotalBRL = subtotalUSD * cot + fTer;
    const custoUnitarioBRL = q > 0 ? custoTotalBRL / q : 0;

    return {
      cot,
      q,
      valorRealTotalUSD,
      baseCI_USD,
      impostoUSD,
      comissaoUSD,
      fMar,
      fTer,
      custoTotalBRL,
      custoUnitarioBRL,
    };
  }, [cotacao, precoUnit, qtd, ciPct, aliquotaPct, freteMaritimo, freteTerrestre, comissaoPct]);

  const reset = () => {
    setNome("");
    setNcm("");
    setCotacao("");
    setPrecoUnit("");
    setQtd("");
    setCiPct("");
    setAliquotaPct("");
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
        className="relative w-full max-w-5xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
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
                Custo de importação · simulação
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
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            {/* Coluna de entradas */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Nome do produto" value={nome} onChange={setNome} placeholder="Ex.: Tapete higiênico 60x90" icon={<Package className="w-3.5 h-3.5" />} />
                <TextField label="NCM" value={ncm} onChange={setNcm} placeholder="Ex.: 4818.90.90" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Cotação do dólar" value={cotacao} onChange={setCotacao} placeholder="5,40" prefix="R$" icon={<DollarSign className="w-3.5 h-3.5" />} hint="Quanto vale US$ 1,00 em reais" />
                <Field label="Qtd. de unidades no container" value={qtd} onChange={setQtd} placeholder="5000" suffix="un" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Preço real do produto" value={precoUnit} onChange={setPrecoUnit} placeholder="0,85" prefix="US$" hint="Valor real por unidade (em dólar)" />
                <Field label="Comissão Bety" value={comissaoPct} onChange={setComissaoPct} placeholder="5" suffix="%" icon={<Percent className="w-3.5 h-3.5" />} hint="Sobre o valor real do produto" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="CI (% do valor real)" value={ciPct} onChange={setCiPct} placeholder="60" suffix="%" icon={<Percent className="w-3.5 h-3.5" />} hint="Percentual do valor real usado como base declarada" />
                <Field label="Alíquota de imposto" value={aliquotaPct} onChange={setAliquotaPct} placeholder="60" suffix="%" icon={<Percent className="w-3.5 h-3.5" />} hint="Incide sobre (base da CI + frete marítimo)" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Frete marítimo" value={freteMaritimo} onChange={setFreteMaritimo} placeholder="3500" prefix="US$" icon={<Ship className="w-3.5 h-3.5" />} hint="Pago ao fornecedor (entra na base do imposto)" />
                <Field label="Frete terrestre" value={freteTerrestre} onChange={setFreteTerrestre} placeholder="2000" prefix="R$" icon={<Truck className="w-3.5 h-3.5" />} hint="Valor fixo em reais" />
              </div>
            </div>

            {/* Coluna de resultado */}
            <div
              className="rounded-xl p-5 flex flex-col gap-2 h-fit lg:sticky lg:top-0"
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

              <ResultRow label={`Valor real (${calc.q || 0} un)`} value={USD(calc.valorRealTotalUSD)} />
              <ResultRow label="Base da CI (declarado)" value={USD(calc.baseCI_USD)} />
              <ResultRow label="Imposto" value={USD(calc.impostoUSD)} />
              <ResultRow label="Comissão Bety" value={USD(calc.comissaoUSD)} />
              <ResultRow label="Frete marítimo" value={USD(calc.fMar)} />
              <ResultRow label="Frete terrestre" value={BRL(calc.fTer)} />

              <div className="h-px my-2" style={{ background: "oklch(0.24 0.03 258)" }} />
              <p className="text-[0.7rem] leading-relaxed" style={{ color: "oklch(0.5 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                Valores em dólar convertidos pela cotação informada. O frete terrestre (R$) é somado direto. O frete marítimo é pago uma vez e também compõe a base do imposto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
