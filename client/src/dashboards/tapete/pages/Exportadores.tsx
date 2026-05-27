/**
 * Página: Fábricas Chinesas — Exportadoras para o Brasil
 * Integra dados de contato (e-mail, telefone, WhatsApp, site, Alibaba) em cada fábrica
 * Fonte: LogComex NCM 4818.90.90 + pesquisa Alibaba/Made-in-China/sites oficiais
 */
import { useState, useMemo } from "react";
import Layout from "@tapete/components/Layout";
import { todosExportadores } from "@tapete/lib/data";
import { getClassificacao, tipoLabel, type TipoEmpresa } from "@tapete/lib/classificacao";
import { contatosFabricas } from "@tapete/lib/contatos";
import {
  Search,
  Factory,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Award,
  Mail,
  Phone,
  MessageCircle,
  Globe,
  Copy,
  CheckCheck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Info,
} from "lucide-react";
import { toast } from "sonner";

const relevanciaLabel: Record<string, { label: string; color: string }> = {
  top:   { label: "Top 5",        color: "bg-amber-100 text-amber-800 border-amber-200" },
  alto:  { label: "Alto Volume",  color: "bg-blue-100 text-blue-800 border-blue-200" },
  medio: { label: "Médio Volume", color: "bg-slate-100 text-slate-600 border-slate-200" },
  baixo: { label: "Baixo Volume", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

const provincias = [
  "Todas", "Shandong", "Zhejiang", "Jiangsu", "Tianjin",
  "Fujian", "Guangdong", "Shanghai", "Anhui", "Henan",
  "Liaoning", "Hebei", "Jiangxi", "Hong Kong",
];

function fmtUsd(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

function nivelContato(c: typeof contatosFabricas[0]): "completo" | "parcial" | "sem" {
  const pts =
    (c.email !== "Não encontrado" ? 2 : 0) +
    (c.telefone !== "Não encontrado" ? 1 : 0) +
    (c.alibabaUrl !== "Não encontrado" ? 1 : 0) +
    (c.site !== "Não encontrado" ? 1 : 0);
  if (pts >= 4) return "completo";
  if (pts >= 1) return "parcial";
  return "sem";
}

function findContato(nomeLogcomex: string) {
  const key = nomeLogcomex.replace(/ CHINA$/, "").replace(/ HK$/, "").trim();
  return contatosFabricas.find(c =>
    c.nomeInput === key ||
    key.startsWith(c.nomeInput) ||
    c.nomeInput.startsWith(key.split(" ").slice(0, 2).join(" "))
  ) || null;
}

type FabComContato = {
  nome: string;
  pais: string;
  provincia: string;
  relevancia: string;
  contato: ReturnType<typeof findContato>;
  classificacao: ReturnType<typeof getClassificacao>;
};

/** Card expandido completo — igual ao da lista principal */
function CardExpandido({
  fab,
  c,
  cardKey,
  copiedField,
  copy,
}: {
  fab: FabComContato;
  c: ReturnType<typeof findContato>;
  cardKey: string;
  copiedField: string | null;
  copy: (text: string, key: string) => void;
}) {
  const cl = fab.classificacao;
  const tipoInfo = cl ? tipoLabel[cl.tipo as TipoEmpresa] : null;

  return (
    <div className="px-4 pb-5 bg-slate-50 border-t border-slate-100">
      {/* Badge de classificação com justificativa */}
      {cl && tipoInfo && (
        <div className={`mt-3 p-3 rounded-lg border text-xs leading-relaxed ${
          cl.tipo === "FABRICANTE"    ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
          cl.tipo === "TRADER"        ? "bg-amber-50 border-amber-200 text-amber-800" :
          cl.tipo === "MATERIA_PRIMA" ? "bg-blue-50 border-blue-200 text-blue-800" :
                                        "bg-red-50 border-red-200 text-red-800"
        }`}>
          <strong>{tipoInfo.icon} {tipoInfo.label}:</strong> {cl.justificativa}
          {cl.produtoReal && (
            <div className="mt-1.5 pt-1.5 border-t border-current border-opacity-20">
              <strong>Produto real fabricado/vendido:</strong> {cl.produtoReal}
            </div>
          )}
        </div>
      )}

      {c ? (
        <div className="grid lg:grid-cols-2 gap-5 pt-4">
          {/* Contato Direto */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contato Direto</p>
            <div className="space-y-2">
              {c.email !== "Não encontrado" ? (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <a href={`mailto:${c.email}`} className="text-sm text-blue-600 hover:underline truncate flex-1">{c.email}</a>
                  <button onClick={() => copy(c.email, `e-${cardKey}`)} className="text-slate-400 hover:text-slate-600">
                    {copiedField === `e-${cardKey}` ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-4 h-4" /><span className="text-sm italic">E-mail não encontrado</span>
                </div>
              )}

              {c.telefone !== "Não encontrado" ? (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{c.telefone}</span>
                  <button onClick={() => copy(c.telefone, `t-${cardKey}`)} className="text-slate-400 hover:text-slate-600">
                    {copiedField === `t-${cardKey}` ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-4 h-4" /><span className="text-sm italic">Telefone não encontrado</span>
                </div>
              )}

              {c.whatsapp !== "Não encontrado" && (
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <a href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline">{c.whatsapp}</a>
                </div>
              )}

              {c.site !== "Não encontrado" ? (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <a href={c.site} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">{c.site}</a>
                  <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <Globe className="w-4 h-4" /><span className="text-sm italic">Site não encontrado</span>
                </div>
              )}

              {c.alibabaUrl !== "Não encontrado" ? (
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <a href={c.alibabaUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline font-medium">Ver perfil no Alibaba →</a>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <ExternalLink className="w-4 h-4" /><span className="text-sm italic">Alibaba não encontrado</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-600">{c.cidade}, {c.provincia}</span>
              </div>
            </div>
          </div>

          {/* Dados Comerciais */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Dados Comerciais</p>
            <div className="space-y-2 text-sm">
              <div><span className="text-slate-500 text-xs">Produto:</span> <span className="text-slate-800">{c.produtoPrincipal}</span></div>
              {c.moq !== "Não encontrado" && (
                <div><span className="text-slate-500 text-xs">MOQ:</span> <span className="font-medium text-slate-800">{c.moq}</span></div>
              )}
              {c.precoFob !== "Não encontrado" && (
                <div><span className="text-slate-500 text-xs">Preço FOB:</span> <span className="font-medium text-green-700">{c.precoFob}</span></div>
              )}
              {c.anosExperiencia !== "Não encontrado" && (
                <div><span className="text-slate-500 text-xs">Experiência:</span> <span className="text-slate-800">{c.anosExperiencia}</span></div>
              )}
              {c.certificacoes !== "Não encontrado" && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {c.certificacoes.split(", ").map((cert: string) => (
                    <span key={cert} className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{cert}</span>
                  ))}
                </div>
              )}
              {c.observacao && (
                <p className="text-xs text-slate-500 leading-relaxed mt-2 bg-white rounded-lg p-2 border border-slate-100">{c.observacao}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-4 flex items-center gap-2 text-slate-400">
          <AlertCircle className="w-4 h-4" />
          <p className="text-sm">Dados de contato não localizados. Busque no Alibaba: <span className="font-mono text-slate-600">{fab.nome}</span></p>
        </div>
      )}
    </div>
  );
}

export default function Exportadores() {
  const [search, setSearch] = useState("");
  const [provincia, setProvincia] = useState("Todas");
  const [relevancia, setRelevancia] = useState("Todas");
  const [filtroContato, setFiltroContato] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoEmpresa>("todos");
  const [activeCategory, setActiveCategory] = useState<TipoEmpresa | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fabricasComContato = useMemo(() =>
    todosExportadores
      .filter(e => e.pais === "China" || e.pais === "Hong Kong")
      .map(e => ({ ...e, contato: findContato(e.nome), classificacao: getClassificacao(e.nome) })),
  []);

  const filtered = useMemo(() => {
    return fabricasComContato.filter(e => {
      const matchSearch =
        e.nome.toLowerCase().includes(search.toLowerCase()) ||
        e.provincia.toLowerCase().includes(search.toLowerCase()) ||
        (e.contato?.nomeOficial || "").toLowerCase().includes(search.toLowerCase());
      const matchProv = provincia === "Todas" || e.provincia === provincia;
      const matchRel  = relevancia === "Todas" || e.relevancia === relevancia;
      const nivel = e.contato ? nivelContato(e.contato) : "sem";
      const matchContato =
        filtroContato === "todos" ||
        (filtroContato === "com_email"   && e.contato?.email !== "Não encontrado") ||
        (filtroContato === "com_alibaba" && e.contato?.alibabaUrl !== "Não encontrado") ||
        (filtroContato === "sem_contato" && nivel === "sem");
      const matchTipo =
        filtroTipo === "todos" ||
        (e.classificacao?.tipo === filtroTipo);
      return matchSearch && matchProv && matchRel && matchContato && matchTipo;
    });
  }, [fabricasComContato, search, provincia, relevancia, filtroContato, filtroTipo]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(key);
      toast.success("Copiado!");
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  function exportCSV() {
    const header = "Nome LogComex,Nome Oficial,Classificacao,Tipo,Produto Real (Português),Provincia,E-mail,Telefone,WhatsApp,Site,Alibaba,MOQ,Preco FOB,Certificacoes,Justificativa\n";
    const rows = filtered.map(e => {
      const c = e.contato;
      const cl = e.classificacao;
      const produtoReal = cl?.produtoReal || c?.produtoPrincipal || "";
      return [
        e.nome,
        c?.nomeOficial || "",
        cl?.tipo || "INCERTO",
        cl ? tipoLabel[cl.tipo].label : "Não classificado",
        produtoReal,
        e.provincia,
        c?.email || "",
        c?.telefone || "",
        c?.whatsapp || "",
        c?.site || "",
        c?.alibabaUrl || "",
        c?.moq || "",
        c?.precoFob || "",
        c?.certificacoes || "",
        cl?.justificativa || "",
      ].map(v => `"${String(v).replace(/"/g, '\"')}"`).join(",");
    }).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "exportadores_chineses_tapete_pet.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com produto real e justificativa!");
  }

  const chinaCount        = fabricasComContato.filter(e => e.pais === "China").length;
  const comEmailCount     = fabricasComContato.filter(e => e.contato !== null && e.contato.email !== "Não encontrado").length;
  const comAlibabaCount   = fabricasComContato.filter(e => e.contato !== null && e.contato.alibabaUrl !== "Não encontrado").length;
  const fabricantesCount  = fabricasComContato.filter(e => e.classificacao?.tipo === "FABRICANTE").length;
  const tradersCount      = fabricasComContato.filter(e => e.classificacao?.tipo === "TRADER").length;
  const materiaPrimaCount = fabricasComContato.filter(e => e.classificacao?.tipo === "MATERIA_PRIMA").length;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Factory className="w-4 h-4" />
          <span>Fábricas Chinesas — LogComex NCM 4818.90.90 | Jun/2025–Mai/2026</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Fábricas Chinesas — Fabricantes, Traders e Fornecedores</h1>
            <p className="text-slate-500 mt-1">
              {fabricantesCount} fabricantes diretos · {tradersCount} traders · {materiaPrimaCount} fornec. matéria-prima · {comEmailCount} com e-mail
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de precisão */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Verificação de Fabricantes vs. Traders</p>
          <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
            Cada empresa foi verificada individualmente no Alibaba, Made-in-China e Google para confirmar se possui fábrica própria de tapetes higiênicos para pets.
            Use o filtro <strong>"Fabricante Direto"</strong> para ver apenas as indústrias confirmadas.
          </p>
        </div>
      </div>

      {/* Summary Cards — clicáveis para ver Top 5 da categoria */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([
          { tipo: "FABRICANTE" as TipoEmpresa,    count: fabricantesCount,  label: "Fabricantes Diretos",      sub: "Fábrica própria confirmada",  bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-400", text: "text-emerald-700", sub2: "text-emerald-500" },
          { tipo: "TRADER" as TipoEmpresa,         count: tradersCount,      label: "Traders / Intermediários", sub: "Não são fábricas diretas",    bg: "bg-amber-50",   border: "border-amber-200",   ring: "ring-amber-400",   text: "text-amber-700",   sub2: "text-amber-500" },
          { tipo: "MATERIA_PRIMA" as TipoEmpresa,  count: materiaPrimaCount, label: "Fornec. Matéria-Prima",    sub: "Non-woven, PE film etc.",      bg: "bg-blue-50",    border: "border-blue-200",    ring: "ring-blue-400",    text: "text-blue-700",    sub2: "text-blue-500" },
        ]).map(cat => (
          <button
            key={cat.tipo}
            onClick={() => setActiveCategory(activeCategory === cat.tipo ? null : cat.tipo)}
            className={`${cat.bg} border ${cat.border} rounded-xl p-4 text-center transition-all hover:shadow-md active:scale-[0.98] ${
              activeCategory === cat.tipo ? `ring-2 ${cat.ring} shadow-md` : ""
            }`}
          >
            <p className={`text-3xl font-bold ${cat.text}`}>{cat.count}</p>
            <p className={`text-xs ${cat.text} font-semibold mt-1`}>{cat.label}</p>
            <p className={`text-xs ${cat.sub2} mt-0.5`}>{cat.sub}</p>
            <p className={`text-xs ${cat.text} mt-1.5 font-medium opacity-60`}>
              {activeCategory === cat.tipo ? "▲ Fechar Top 5" : "▼ Ver Top 5"}
            </p>
          </button>
        ))}
      </div>

      {/* Painel Top 5 por categoria */}
      {activeCategory && (() => {
        const top5 = fabricasComContato
          .filter(e => e.classificacao?.tipo === activeCategory)
          .slice(0, 5);
        const catInfo = tipoLabel[activeCategory];
        return (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-6 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-600" />
                <h2 className="font-bold text-slate-900 text-sm">Top 5 — {catInfo.label}</h2>
              </div>
              <button onClick={() => setActiveCategory(null)} className="text-slate-400 hover:text-slate-600 text-xs font-medium">✕ Fechar</button>
            </div>
            <div className="divide-y divide-slate-100">
              {top5.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-500 italic">Nenhuma empresa encontrada nesta categoria.</p>
              )}
              {top5.map((fab, i) => {
                const c = fab.contato;
                const key = `cat-${activeCategory}-${i}`;
                const isExp = expandedId === key;
                const nivel = c ? nivelContato(c) : "sem";
                const cl = fab.classificacao;
                const tipoInfo = cl ? tipoLabel[cl.tipo] : null;
                return (
                  <div key={fab.nome} className={`overflow-hidden ${
                    cl?.tipo === "FABRICANTE"    ? "border-l-2 border-emerald-400" :
                    cl?.tipo === "TRADER"        ? "border-l-2 border-amber-400" :
                    cl?.tipo === "MATERIA_PRIMA" ? "border-l-2 border-blue-400" : ""
                  }`}>
                    <button
                      onClick={() => setExpandedId(isExp ? null : key)}
                      className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? "bg-slate-800 text-white" :
                        i === 1 ? "bg-slate-600 text-white" :
                        i === 2 ? "bg-slate-400 text-white" : "bg-slate-100 text-slate-500"
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">{fab.nome}</p>
                          {tipoInfo && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tipoInfo.color}`}>
                              {tipoInfo.icon} {tipoInfo.label}
                            </span>
                          )}
                          {nivel === "completo" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Contato completo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {fab.provincia}{c?.nomeOficial && c.nomeOficial !== "Não encontrado" ? ` · ${c.nomeOficial}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 mr-2">
                        {c?.email !== "Não encontrado"      && <Mail className="w-3.5 h-3.5 text-red-400" />}
                        {c?.telefone !== "Não encontrado"   && <Phone className="w-3.5 h-3.5 text-blue-400" />}
                        {c?.whatsapp !== "Não encontrado"   && <MessageCircle className="w-3.5 h-3.5 text-green-400" />}
                        {c?.alibabaUrl !== "Não encontrado" && <ExternalLink className="w-3.5 h-3.5 text-orange-400" />}
                        {c?.site !== "Não encontrado"       && <Globe className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                      {isExp ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    </button>
                    {isExp && (
                      <CardExpandido fab={fab} c={c} cardKey={key} copiedField={copiedField} copy={copy} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ===== FILTROS ===== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, província ou nome oficial..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <select value={provincia} onChange={e => setProvincia(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
            {provincias.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={relevancia} onChange={e => setRelevancia(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="Todas">Todos os volumes</option>
            <option value="top">Top 5</option>
            <option value="alto">Alto Volume</option>
            <option value="medio">Médio Volume</option>
            <option value="baixo">Baixo Volume</option>
          </select>
          <select value={filtroContato} onChange={e => setFiltroContato(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="todos">Todos os contatos</option>
            <option value="com_email">Com e-mail</option>
            <option value="com_alibaba">Com Alibaba</option>
            <option value="sem_contato">Sem contato</option>
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as "todos" | TipoEmpresa)}
            className="px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50 font-medium text-emerald-800">
            <option value="todos">Todos os tipos</option>
            <option value="FABRICANTE">✓ Fabricante Direto</option>
            <option value="TRADER">⚠ Trader / Intermediário</option>
            <option value="MATERIA_PRIMA">○ Fornec. Matéria-Prima</option>
          </select>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-slate-400">{filtered.length} empresa(s) encontrada(s) · {filtered.filter(e => e.classificacao?.tipo === "FABRICANTE").length} fabricante(s) direto(s)</p>
        </div>
      </div>

      {/* ===== LISTA DE FÁBRICAS COM CONTATO INTEGRADO ===== */}
      <div className="space-y-2">
        {filtered.map((fab, i) => {
          const rel = relevanciaLabel[fab.relevancia];
          const c = fab.contato;
          const nivel = c ? nivelContato(c) : "sem";
          const key = `fab-${i}`;
          const isExp = expandedId === key;

          const cl = fab.classificacao;
          const tipoInfo = cl ? tipoLabel[cl.tipo] : null;

          return (
            <div key={fab.nome} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
              cl?.tipo === "FABRICANTE"    ? "border-emerald-200" :
              cl?.tipo === "TRADER"        ? "border-amber-200" :
              cl?.tipo === "MATERIA_PRIMA" ? "border-blue-200" :
                                             "border-slate-200"
            }`}>
              <button
                onClick={() => setExpandedId(isExp ? null : key)}
                className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">{fab.nome}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${rel.color}`}>{rel.label}</span>
                    {tipoInfo && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tipoInfo.color}`}>
                        {tipoInfo.icon} {tipoInfo.label}
                      </span>
                    )}
                    {nivel === "completo" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Contato completo
                      </span>
                    )}
                    {nivel === "sem" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Sem contato
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fab.pais} · {fab.provincia}
                    {c?.nomeOficial && c.nomeOficial !== "Não encontrado" ? ` · ${c.nomeOficial}` : ""}
                  </p>
                </div>
                {/* Ícones de canais disponíveis */}
                <div className="flex items-center gap-1.5 flex-shrink-0 mr-2">
                  {c?.email !== "Não encontrado"      && <Mail className="w-3.5 h-3.5 text-red-400" />}
                  {c?.telefone !== "Não encontrado"   && <Phone className="w-3.5 h-3.5 text-blue-400" />}
                  {c?.whatsapp !== "Não encontrado"   && <MessageCircle className="w-3.5 h-3.5 text-green-400" />}
                  {c?.alibabaUrl !== "Não encontrado" && <ExternalLink className="w-3.5 h-3.5 text-orange-400" />}
                  {c?.site !== "Não encontrado"       && <Globe className="w-3.5 h-3.5 text-slate-400" />}
                </div>
                {isExp ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>

              {isExp && (
                <CardExpandido fab={fab} c={c} cardKey={key} copiedField={copiedField} copy={copy} />
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
