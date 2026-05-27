/**
 * Página: Importadores Brasileiros
 * Empresas que importam tapetes higiênicos para pets da China para o Brasil
 * Fonte: LogComex NCM 4818.90.90 (Jun/2025–Mai/2026) + pesquisa Receita Federal / Google
 * Contatos: CNPJ, telefone, e-mail, site, Instagram — para fins de parceria
 */
import { useState, useMemo } from "react";
import Layout from "@tapete/components/Layout";
import { importadoresContato } from "@tapete/lib/importadores";
import { topImportadores } from "@tapete/lib/data";
import {
  Search,
  Building2,
  Mail,
  Phone,
  Globe,
  Instagram,
  Copy,
  CheckCheck,
  MapPin,
  Download,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  TrendingUp,
  Package,
  BadgeCheck,
  AlertCircle,
  Filter,
  Info,
} from "lucide-react";
import { toast } from "sonner";

const SEGMENTOS = ["Todos", "Pet", "Trading/Importadora", "Higiene Hospitalar", "Atacado", "E-commerce", "Varejo", "Outro"];
const ESTADOS = ["Todos", "SP", "SC", "AL", "RJ", "MG", "PR", "RS", "GO", "CE", "BA", "PE", "ES", "MT", "MS", "DF", "PA", "AM"];

function fmtUsd(n: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

function fmtNum(n: number) {
  return n.toLocaleString("pt-BR");
}

function nivelContato(imp: typeof importadoresContato[0]): "completo" | "parcial" | "sem" {
  const pts =
    (imp.cnpj !== "Não encontrado" ? 1 : 0) +
    (imp.email !== "Não encontrado" ? 2 : 0) +
    (imp.telefone !== "Não encontrado" ? 1 : 0) +
    (imp.site !== "Não encontrado" ? 1 : 0);
  if (pts >= 4) return "completo";
  if (pts >= 1) return "parcial";
  return "sem";
}

export default function Importadores() {
  const [search, setSearch] = useState("");
  const [segmento, setSegmento] = useState("Todos");
  const [estado, setEstado] = useState("Todos");
  const [filtroContato, setFiltroContato] = useState("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return importadoresContato.filter(imp => {
      const matchSearch =
        imp.nome.toLowerCase().includes(search.toLowerCase()) ||
        imp.cidade.toLowerCase().includes(search.toLowerCase()) ||
        imp.cnpj.includes(search);
      const matchSeg = segmento === "Todos" || imp.segmento.includes(segmento);
      const matchEst = estado === "Todos" || imp.estado === estado;
      const nivel = nivelContato(imp);
      const matchContato =
        filtroContato === "todos" ||
        (filtroContato === "com_email" && imp.email !== "Não encontrado") ||
        (filtroContato === "com_site" && imp.site !== "Não encontrado") ||
        (filtroContato === "sem_contato" && nivel === "sem");
      return matchSearch && matchSeg && matchEst && matchContato;
    });
  }, [search, segmento, estado, filtroContato]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(key);
      toast.success("Copiado!");
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  function exportCSV() {
    const header = "Nome,CNPJ,Cidade,Estado,Endereço,Telefone,E-mail,Site,Instagram,Segmento,FOB USD,Observação\n";
    const rows = filtered.map(imp =>
      [
        imp.nome, imp.cnpj, imp.cidade, imp.estado, imp.endereco,
        imp.telefone, imp.email, imp.site, imp.instagram, imp.segmento,
        imp.fobUsd || "", imp.observacao,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "importadores_brasileiros_tapete_pet.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com " + filtered.length + " empresas!");
  }

  const totalCount = importadoresContato.length;
  const comEmailCount = importadoresContato.filter(i => i.email !== "Não encontrado").length;
  const comSiteCount = importadoresContato.filter(i => i.site !== "Não encontrado").length;
  const petCount = importadoresContato.filter(i => i.segmento.includes("Pet")).length;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Building2 className="w-4 h-4" />
          <span>Importadores Brasileiros — LogComex NCM 4818.90.90 | Jun/2025–Mai/2026</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Importadores Brasileiros</h1>
            <p className="text-slate-500 mt-1">
              {totalCount} empresas identificadas · {comEmailCount} com e-mail · {comSiteCount} com site · {petCount} do segmento pet
            </p>
          </div>

        </div>
      </div>

      {/* Banner informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Atenção: NCM 4818.90.90 é amplo</p>
          <p className="text-xs text-blue-700 mt-1">
            Este NCM inclui outros produtos além de tapetes higiênicos para pets (ex: underpads hospitalares).
            As empresas do segmento <strong>Pet</strong> são as mais relevantes para esta pesquisa.
            Contatos pesquisados via Receita Federal, Google e LinkedIn para fins de parceria comercial.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-700">{totalCount}</p>
          <p className="text-xs text-blue-600 font-medium mt-1">Empresas Identificadas</p>
          <p className="text-xs text-blue-400 mt-0.5">Fonte: LogComex</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-700">{comEmailCount}</p>
          <p className="text-xs text-green-600 font-medium mt-1">Com E-mail Encontrado</p>
          <p className="text-xs text-green-400 mt-0.5">de {totalCount} empresas</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-700">{petCount}</p>
          <p className="text-xs text-amber-600 font-medium mt-1">Segmento Pet</p>
          <p className="text-xs text-amber-400 mt-0.5">foco em animais</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-700">{comSiteCount}</p>
          <p className="text-xs text-purple-600 font-medium mt-1">Com Site Oficial</p>
          <p className="text-xs text-purple-400 mt-0.5">de {totalCount} empresas</p>
        </div>
      </div>

      {/* Top 5 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-700">
          <h2 className="font-bold text-white">Top 5 Maiores Importadores</h2>
          <p className="text-xs text-slate-300 mt-0.5">Por valor FOB — China → Brasil (Jun/2025–Mai/2026)</p>
        </div>
        <div className="divide-y divide-slate-100">
          {topImportadores.map((imp, i) => (
            <div key={imp.nome} className="px-5 py-4 flex items-center gap-4">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                i === 0 ? "bg-amber-400 text-white" :
                i === 1 ? "bg-slate-300 text-slate-700" :
                i === 2 ? "bg-orange-300 text-orange-800" :
                "bg-slate-100 text-slate-600"
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm leading-tight">{imp.nome}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <p className="text-xs text-slate-500">{imp.cidade} — {imp.estado}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right flex-shrink-0">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{fmtUsd(imp.fobUsd)}</p>
                  <p className="text-xs text-slate-400">Valor FOB</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">{fmtNum(imp.pesoKg)} kg</p>
                  <p className="text-xs text-slate-400">Peso total</p>
                </div>
                <div>
                  <span className="text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-full">
                    {imp.percentual.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
          <Filter className="w-4 h-4" />
          Filtros — Lista Completa com Contatos
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar empresa, cidade, CNPJ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={segmento}
            onChange={e => setSegmento(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SEGMENTOS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            value={estado}
            onChange={e => setEstado(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ESTADOS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            value={filtroContato}
            onChange={e => setFiltroContato(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os contatos</option>
            <option value="com_email">Com e-mail</option>
            <option value="com_site">Com site</option>
            <option value="sem_contato">Sem contato</option>
          </select>
        </div>
        <p className="text-xs text-slate-400">{filtered.length} empresa(s) encontrada(s)</p>
      </div>

      {/* Lista de Importadores */}
      <div className="space-y-3">
        {filtered.map((imp, idx) => {
          const id = imp.cnpj !== "Não encontrado" ? imp.cnpj : imp.nome;
          const isExpanded = expandedId === id;
          const nivel = nivelContato(imp);

          return (
            <div
              key={id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors"
            >
              {/* Card Header */}
              <div
                className="flex items-start gap-4 p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : id)}
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-500">
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm leading-tight">{imp.nome}</h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {imp.cnpj !== "Não encontrado" && (
                          <span className="text-xs text-slate-500 font-mono">{imp.cnpj}</span>
                        )}
                        {(imp.cidade !== "Não encontrado" || imp.estado !== "Não encontrado") && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            {imp.cidade !== "Não encontrado" ? imp.cidade : ""}
                            {imp.estado !== "Não encontrado" ? ` (${imp.estado})` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                        imp.segmento.includes("Pet")
                          ? "bg-green-50 text-green-700 border-green-200"
                          : imp.segmento.includes("Hospitalar")
                          ? "bg-red-50 text-red-600 border-red-200"
                          : imp.segmento.includes("Trading")
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>
                        {imp.segmento}
                      </span>
                      {nivel === "completo" && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                          <BadgeCheck className="w-3 h-3" />
                          Contato completo
                        </span>
                      )}
                      {nivel === "sem" && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                          <AlertCircle className="w-3 h-3" />
                          Sem contato
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    {imp.fobUsd > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-700 font-medium">
                        <TrendingUp className="w-3 h-3" />
                        {fmtUsd(imp.fobUsd)} FOB
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                      {imp.email !== "Não encontrado" && <Mail className="w-3.5 h-3.5 text-green-500" />}
                      {imp.telefone !== "Não encontrado" && <Phone className="w-3.5 h-3.5 text-blue-500" />}
                      {imp.site !== "Não encontrado" && <Globe className="w-3.5 h-3.5 text-purple-500" />}
                      {imp.instagram !== "Não encontrado" && <Instagram className="w-3.5 h-3.5 text-pink-500" />}
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    }
                  </div>
                </div>
              </div>

              {/* Detalhes expandidos */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* CNPJ */}
                    {imp.cnpj !== "Não encontrado" && (
                      <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-slate-100">
                        <BadgeCheck className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">CNPJ</p>
                          <p className="text-sm font-mono text-slate-800 mt-0.5">{imp.cnpj}</p>
                        </div>
                        <button
                          onClick={() => copy(imp.cnpj, `cnpj-${id}`)}
                          className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                          title="Copiar CNPJ"
                        >
                          {copiedField === `cnpj-${id}` ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    )}

                    {/* Endereço */}
                    {imp.endereco !== "Não encontrado" && (
                      <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-slate-100">
                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Endereço</p>
                          <p className="text-sm text-slate-800 mt-0.5 break-words">{imp.endereco}</p>
                        </div>
                      </div>
                    )}

                    {/* E-mail */}
                    {imp.email !== "Não encontrado" ? (
                      <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-green-100">
                        <Mail className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">E-mail</p>
                          <a href={`mailto:${imp.email}`} className="text-sm text-green-700 hover:underline break-all mt-0.5 block">
                            {imp.email}
                          </a>
                        </div>
                        <button
                          onClick={() => copy(imp.email, `email-${id}`)}
                          className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                        >
                          {copiedField === `email-${id}` ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-slate-100 opacity-50">
                        <Mail className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">E-mail</p>
                          <p className="text-sm text-slate-400 mt-0.5">Não encontrado</p>
                        </div>
                      </div>
                    )}

                    {/* Telefone */}
                    {imp.telefone !== "Não encontrado" ? (
                      <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-blue-100">
                        <Phone className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Telefone</p>
                          <a href={`tel:${imp.telefone}`} className="text-sm text-blue-700 hover:underline mt-0.5 block">
                            {imp.telefone}
                          </a>
                        </div>
                        <button
                          onClick={() => copy(imp.telefone, `tel-${id}`)}
                          className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                        >
                          {copiedField === `tel-${id}` ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-slate-100 opacity-50">
                        <Phone className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Telefone</p>
                          <p className="text-sm text-slate-400 mt-0.5">Não encontrado</p>
                        </div>
                      </div>
                    )}

                    {/* Site */}
                    {imp.site !== "Não encontrado" && (
                      <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-purple-100">
                        <Globe className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Site Oficial</p>
                          <a
                            href={imp.site}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-700 hover:underline break-all mt-0.5 flex items-center gap-1"
                          >
                            {imp.site.replace(/^https?:\/\//, '')}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Instagram */}
                    {imp.instagram !== "Não encontrado" && (
                      <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-pink-100">
                        <Instagram className="w-4 h-4 text-pink-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Instagram</p>
                          <a
                            href={imp.instagram.startsWith('http') ? imp.instagram : `https://instagram.com/${imp.instagram.replace('@','')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-pink-700 hover:underline break-all mt-0.5 flex items-center gap-1"
                          >
                            {imp.instagram}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dados de importação */}
                  {imp.fobUsd > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-700 uppercase tracking-wider font-medium mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Dados de Importação (Jun/2025–Mai/2026)
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-amber-600">Valor FOB</p>
                          <p className="text-sm font-bold text-amber-800">{fmtUsd(imp.fobUsd)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-amber-600">% do Mercado</p>
                          <p className="text-sm font-bold text-amber-800">{imp.percentual.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-amber-600">Peso Total</p>
                          <p className="text-sm font-bold text-amber-800">{fmtNum(imp.pesoKg)} kg</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observação */}
                  {imp.observacao !== "Não encontrado" && imp.observacao && (
                    <div className="bg-slate-100 rounded-lg p-3">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Observação</p>
                      <p className="text-sm text-slate-700">{imp.observacao}</p>
                    </div>
                  )}

                  {/* Botões de ação */}
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {imp.cnpj !== "Não encontrado" && (
                      <a
                        href={`https://www.cnpja.com.br/office/${imp.cnpj.replace(/\D/g,'')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                      >
                        <Package className="w-3 h-3" />
                        Consultar CNPJ
                      </a>
                    )}
                    {imp.email !== "Não encontrado" && (
                      <a
                        href={`mailto:${imp.email}?subject=Parceria%20Tapete%20Higiênico%20Pet&body=Olá%2C%20gostaria%20de%20conversar%20sobre%20uma%20possível%20parceria%20comercial.`}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                      >
                        <Mail className="w-3 h-3" />
                        Enviar E-mail
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma empresa encontrada</p>
          <p className="text-sm mt-1">Tente ajustar os filtros</p>
        </div>
      )}
    </Layout>
  );
}
