import { useState } from "react";
import Layout from "@tapete/components/Layout";
import { aliquotas } from "@tapete/lib/data";
import { Calculator, AlertCircle, CheckCircle, Info } from "lucide-react";

function calcTributos(cifBrl: number, icmsAliq: number) {
  const ii = cifBrl * 0.144;
  const ipi = (cifBrl + ii) * 0.0325;
  const baseIcms = (cifBrl + ii + ipi) / (1 - icmsAliq / 100);
  const icms = baseIcms * (icmsAliq / 100);
  const pis = (cifBrl + ii + ipi) * 0.021;
  const cofins = (cifBrl + ii + ipi) * 0.0965;
  const total = cifBrl + ii + ipi + icms + pis + cofins;
  return { ii, ipi, icms, pis, cofins, total };
}

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(n);
}

export default function Tributacao() {
  const [cifBrl, setCifBrl] = useState(50000);
  const [icmsEstado, setIcmsEstado] = useState(18);

  const tributos = calcTributos(cifBrl, icmsEstado);

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Calculator className="w-4 h-4" />
          <span>Classificacao Fiscal e Tributacao</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">NCM & Tributacao</h1>
        <p className="text-slate-500 mt-1">Aliquotas, calculadora de tributos e observacoes fiscais para NCM 4818.90.90</p>
      </div>

      {/* NCM Card */}
      <div className="bg-slate-900 text-white rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Codigo NCM</p>
            <p className="text-4xl font-mono font-bold text-amber-400">4818.90.90</p>
            <p className="text-sm text-slate-300 mt-2">{aliquotas.descricao}</p>
          </div>
          <div className="bg-slate-800 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Capitulo</p>
            <p className="text-2xl font-bold text-white">48</p>
            <p className="text-xs text-slate-400 mt-1">Papel e Papelao</p>
          </div>
        </div>
      </div>

      {/* Aliquotas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Aliquotas de Importacao</h2>
          <p className="text-xs text-slate-400 mt-0.5">Tributos incidentes na importacao do NCM 4818.90.90</p>
        </div>
        <div className="divide-y divide-slate-50">
          {aliquotas.tributos.map((t) => (
            <div key={t.nome} className="px-5 py-3 flex items-center gap-4">
              <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${t.cor} flex-shrink-0 w-16 text-center`}>{t.aliquota}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{t.nome}</p>
                <p className="text-xs text-slate-400">Base de calculo: {t.base}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calculadora */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-slate-900">Calculadora de Tributos</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Estimativa simplificada — consulte um despachante para valores precisos</p>
        </div>
        <div className="p-5">
          <div className="grid lg:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Valor CIF (R$)</label>
              <input
                type="number"
                value={cifBrl}
                onChange={e => setCifBrl(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                min={0}
                step={1000}
              />
              <p className="text-xs text-slate-400 mt-1">Valor CIF = FOB + Frete + Seguro (em BRL)</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Aliquota ICMS (%)</label>
              <select
                value={icmsEstado}
                onChange={e => setIcmsEstado(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value={18}>18% — Sao Paulo (SP)</option>
                <option value={17}>17% — Santa Catarina (SC)</option>
                <option value={17}>17% — Parana (PR)</option>
                <option value={12}>12% — Minas Gerais (MG)</option>
                <option value={20}>20% — Rio de Janeiro (RJ)</option>
                <option value={17}>17% — Rio Grande do Sul (RS)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {[
              { label: "II (14,4%)", value: tributos.ii, color: "bg-red-50 border-red-200 text-red-800" },
              { label: "IPI (3,25%)", value: tributos.ipi, color: "bg-orange-50 border-orange-200 text-orange-800" },
              { label: "PIS (2,1%)", value: tributos.pis, color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
              { label: "COFINS (9,65%)", value: tributos.cofins, color: "bg-amber-50 border-amber-200 text-amber-800" },
              { label: `ICMS (${icmsEstado}%)`, value: tributos.icms, color: "bg-blue-50 border-blue-200 text-blue-800" },
              { label: "CIF Original", value: cifBrl, color: "bg-slate-50 border-slate-200 text-slate-800" },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg border p-3 ${item.color}`}>
                <p className="text-xs font-semibold opacity-70 mb-1">{item.label}</p>
                <p className="text-base font-bold">{fmt(item.value)}</p>
              </div>
            ))}
          </div>

          <div className="bg-emerald-600 text-white rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold opacity-90">Custo Total Desembarcado (estimado)</p>
              <p className="text-xs opacity-70 mt-0.5">CIF + II + IPI + PIS + COFINS + ICMS</p>
            </div>
            <p className="text-2xl font-bold">{fmt(tributos.total)}</p>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">* Estimativa simplificada. Nao inclui taxa Siscomex, despesas aduaneiras, frete interno, armazenagem.</p>
        </div>
      </div>

      {/* Observacoes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Observacoes Fiscais Importantes</h2>
        </div>
        <div className="p-5 space-y-3">
          {aliquotas.observacoes.map((obs, i) => (
            <div key={i} className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-700">{obs}</p>
            </div>
          ))}
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-800 font-medium">Tapetes higienicos para pets NAO requerem registro na ANVISA — processo de importacao simplificado.</p>
          </div>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">Sempre consulte um despachante aduaneiro habilitado para calcular os tributos exatos da sua operacao.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
