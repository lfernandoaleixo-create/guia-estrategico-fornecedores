import Layout from "@tapete/components/Layout";
import { Link } from "wouter";
import {
  logcomexStats,
  topExportadores,
  topImportadores,
  topEstadosImportadores,
  topCidadesImportadores,
} from "@tapete/lib/data";
import { classificacoes } from "@tapete/lib/classificacao";
import {
  Factory,
  Building2,
  DollarSign,
  Weight,
  Globe,
  TrendingUp,
  MapPin,
  BarChart3,
  ArrowRight,
  Package,
  Layers,
  BookOpen,
  Calculator,
  GitMerge,
} from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}
function fmtUsd(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

export default function Home() {
  const maxOps = topEstadosImportadores[0].operacoes;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg"
            style={{ background: "oklch(0.95 0.06 75)", color: "oklch(0.42 0.12 75)", border: "1px solid oklch(0.85 0.08 75)" }}
          >
            NCM 4818.90.90
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-sm text-slate-400" style={{ fontFamily: "'Inter', sans-serif" }}>Fonte: LogComex</span>
          <span className="text-slate-300">|</span>
          <span className="text-sm text-slate-400" style={{ fontFamily: "'Inter', sans-serif" }}>Jun/2025–Mai/2026</span>
        </div>
        <h1
          className="leading-tight"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "2.25rem",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            color: "oklch(0.16 0.025 255)",
            lineHeight: 1.1,
          }}
        >
          Tapetes Higiênicos para Cães
        </h1>
        <p
          className="mt-2"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "1.125rem",
            fontWeight: 500,
            color: "oklch(0.44 0.04 255)",
            letterSpacing: "-0.01em",
          }}
        >
          Inteligência Comercial · Importação China → Brasil
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "VALOR TOTAL FOB", value: "USD 28,1 milhões", sub: "Jun/2025–Mai/2026 (12 meses)", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
          { label: "PESO TOTAL", value: "13.457.056 kg", sub: "227 modelos distintos", icon: Weight, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
          { label: "FABRICANTES DIRETOS", value: classificacoes.filter(c => c.tipo === "FABRICANTE").length + " fabricantes", sub: "Fábrica própria confirmada", icon: Factory, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
          { label: "IMPORTADORES BR", value: "64 empresas", sub: "19 estados brasileiros", icon: Building2, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-white rounded-xl border ${kpi.border} p-5 shadow-sm hover:shadow-md transition-shadow`}>
            <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center mb-4`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <p
              className="leading-tight"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "1.625rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "oklch(0.16 0.025 255)",
              }}
            >
              {kpi.value}
            </p>
            <p
              className="mt-2"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.6875rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "oklch(0.50 0.02 255)",
              }}
            >
              {kpi.label}
            </p>
            <p
              className="mt-0.5"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.75rem",
                color: "oklch(0.62 0.015 255)",
              }}
            >
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Preco Medio", value: "US$ " + logcomexStats.precoMedioUsdPorKg.toFixed(2) + "/kg", icon: TrendingUp },
          { label: "Marcas Identificadas", value: logcomexStats.totalMarcas + " marcas", icon: Package },
          { label: "Modelos Distintos", value: logcomexStats.totalModelos + " modelos", icon: Layers },
          { label: "Modal Predominante", value: logcomexStats.modalPredominante, icon: Globe },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
            <item.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">{item.value}</p>
              <p className="text-xs text-slate-400">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Top Exportadores */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Top 5 Exportadores Chineses</h2>
              <p className="text-xs text-slate-400 mt-0.5">Por valor FOB (Jan–Mar 2026)</p>
            </div>
            <Link href="/exportadores" className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {topExportadores.map((exp, i) => (
              <div key={exp.nomeLogcomex} className="px-5 py-3 flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : "bg-slate-50 text-slate-500"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{exp.nome.split(" Co.,")[0]}</p>
                  <p className="text-xs text-slate-400">{exp.provincia} · {exp.marcas.join(", ")}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-900">{fmtUsd(exp.fobUsd)}</p>
                  <p className="text-xs text-slate-400">{exp.percentual.toFixed(1)}% do total</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Importadores */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Top 5 Importadores Brasileiros</h2>
              <p className="text-xs text-slate-400 mt-0.5">Por valor FOB (Jan–Mar 2026)</p>
            </div>
            <Link href="/importadores" className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {topImportadores.map((imp, i) => (
              <div key={imp.nome} className="px-5 py-3 flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : "bg-slate-50 text-slate-500"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{imp.nome.split(" IMPORTACAO")[0].split(" COMERCIO")[0]}</p>
                  <p className="text-xs text-slate-400">{imp.cidade} ({imp.estado})</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-900">{fmtUsd(imp.fobUsd)}</p>
                  <p className="text-xs text-slate-400">{imp.percentual.toFixed(1)}% do total</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Distribuicao por Estado */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">Distribuicao por Estado</h2>
            <p className="text-xs text-slate-400 mt-0.5">Operacoes de importacao por UF</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {topEstadosImportadores.map((item) => (
              <div key={item.estado} className="flex items-center gap-3">
                <span className="w-8 text-xs font-bold text-slate-700 font-mono">{item.estado}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${(item.operacoes / maxOps) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700 w-8 text-right">{item.operacoes}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cidades */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">Top Cidades Importadoras</h2>
            <p className="text-xs text-slate-400 mt-0.5">Por peso total importado (kg)</p>
          </div>
          <div className="divide-y divide-slate-50">
            {topCidadesImportadores.map((item, i) => (
              <div key={item.cidade} className="px-5 py-2.5 flex items-center gap-3">
                <MapPin className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                <span className="flex-1 text-sm text-slate-700">{item.cidade}</span>
                <span className="text-xs font-mono font-bold text-slate-600">{fmt(item.pesoKg)} kg</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: "/exportadores", label: "59 Empresas Chinesas", sub: "33 fabricantes diretos confirmados", icon: Factory, color: "bg-red-600" },
          { href: "/importadores", label: "64 Importadores BR", sub: "Empresas brasileiras reais", icon: Building2, color: "bg-blue-600" },
          { href: "/cruzamento", label: "Cruzamento Fab x Imp", sub: "Quem compra de quem + Marca", icon: GitMerge, color: "bg-amber-600" },
          { href: "/tutorial", label: "Tutorial Completo", sub: "8 etapas de importacao", icon: BookOpen, color: "bg-violet-600" },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group block">
            <div className={`w-9 h-9 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-bold text-slate-900 text-sm">{card.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-red-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Acessar <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
