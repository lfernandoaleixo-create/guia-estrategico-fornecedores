// ═══════════════════════════════════════════════════════════════════════════
// CRUZAMENTO: Fábrica Chinesa × Importador Brasileiro × Marca no Brasil
// Fonte: LogComex NCM 4818.90.90 | Jun/2025 – Mai/2026
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useMemo } from "react";
import Layout from "@tapete/components/Layout";
import { todosImportadores, topImportadores, topExportadores, marcas } from "@tapete/lib/data";
import { GitMerge, Search, Building2, Factory, Tag, ChevronDown, ChevronUp, Info } from "lucide-react";

// Cruzamentos reais baseados nos dados LogComex
const cruzamentosData = [
  {
    id: 1,
    importador: "BM3 IMPORTACAO E EXPORTACAO LTDA",
    estado: "SP",
    cidade: "Aruja",
    segmento: "Importadora / Distribuidora",
    fobUsd: 2638553,
    percentual: "35,99%",
    fabricantes: [
      { nome: "SHANDONG AISHULE", provincia: "Shandong", participacao: "Principal" },
      { nome: "TIANJIN YIYI", provincia: "Tianjin", participacao: "Secundário" },
      { nome: "CHANGZHOU CAREDE", provincia: "Jiangsu", participacao: "Secundário" },
    ],
    marcas: ["HUSPET", "SHANDONG AISHULE HYGIENE", "SEM MARCA", "CAREDE"],
    obs: "Maior importador do NCM. Distribui para pet shops e atacadistas em todo o Brasil.",
  },
  {
    id: 2,
    importador: "LALA PET IMPORT LTDA",
    estado: "AL",
    cidade: "Maceio",
    segmento: "Importadora Pet",
    fobUsd: 559204,
    percentual: "7,63%",
    fabricantes: [
      { nome: "SHANDONG AISHULE", provincia: "Shandong", participacao: "Principal" },
      { nome: "HANGZHOU BRILLIANT", provincia: "Zhejiang", participacao: "Secundário" },
    ],
    marcas: ["HUSPET", "SEM MARCA"],
    obs: "Segundo maior importador. Concentrado no Nordeste, distribui para redes pet regionais.",
  },
  {
    id: 3,
    importador: "PETGLOBAL IMPORTACAO E COMERCIO DE PRODUTOS PARA ANIMAIS LTDA",
    estado: "SC",
    cidade: "Imbituba",
    segmento: "Produtos Pet",
    fobUsd: 427522,
    percentual: "5,83%",
    fabricantes: [
      { nome: "XIAMEN YANJAN", provincia: "Fujian", participacao: "Principal" },
      { nome: "CHANGZHOU AM", provincia: "Jiangsu", participacao: "Secundário" },
    ],
    marcas: ["PET GLOBAL", "PELO AMOR", "SEM MARCA"],
    obs: "Importa pelo porto de Imbituba (SC). Marca própria PET GLOBAL e PELO AMOR.",
  },
  {
    id: 4,
    importador: "UNIPET DISTRIBUIDORA DE PRODUTOS AGROPECUARIOS LTDA",
    estado: "SC",
    cidade: "Itajai",
    segmento: "Distribuidora Pet",
    fobUsd: 298139,
    percentual: "4,07%",
    fabricantes: [
      { nome: "HANGZHOU LINAN", provincia: "Zhejiang", participacao: "Principal" },
      { nome: "TIANJIN YIYI", provincia: "Tianjin", participacao: "Secundário" },
    ],
    marcas: ["HUSPET", "SEM MARCA"],
    obs: "Distribuidora com foco no mercado agropecuário e pet do Sul do Brasil.",
  },
  {
    id: 5,
    importador: "HIGIEFARM - COMERCIO, IMPORTACAO E EXPORTACAO LTDA",
    estado: "SC",
    cidade: "Itajai",
    segmento: "Higiene / Pet",
    fobUsd: 277050,
    percentual: "3,78%",
    fabricantes: [
      { nome: "CHANGZHOU CAREDE", provincia: "Jiangsu", participacao: "Principal" },
      { nome: "ZHEJIANG WIPEX", provincia: "Zhejiang", participacao: "Secundário" },
    ],
    marcas: ["CAREDE", "WIPEX", "SEM MARCA"],
    obs: "Especializada em produtos de higiene. Importa pelo porto de Itajai.",
  },
  {
    id: 6,
    importador: "INOVEN INDUSTRIA, COMERCIO E IMPORTACAO LTDA",
    estado: "SC",
    cidade: "Itajai",
    segmento: "Indústria / Importadora",
    fobUsd: 198400,
    percentual: "2,71%",
    fabricantes: [
      { nome: "HANGZHOU JEENOR", provincia: "Zhejiang", participacao: "Principal" },
      { nome: "SHANDONG AISHULE", provincia: "Shandong", participacao: "Secundário" },
    ],
    marcas: ["JEENOR", "SEM MARCA"],
    obs: "Indústria que importa insumos e produtos acabados para revenda.",
  },
  {
    id: 7,
    importador: "MEC G STORE IMPORTS LTDA",
    estado: "SC",
    cidade: "Itajai",
    segmento: "Importadora",
    fobUsd: 165200,
    percentual: "2,25%",
    fabricantes: [
      { nome: "TIANJIN YIYI", provincia: "Tianjin", participacao: "Principal" },
      { nome: "HANGZHOU BRILLIANT", provincia: "Zhejiang", participacao: "Secundário" },
    ],
    marcas: ["HUSPET", "SANCLEAN", "SEM MARCA"],
    obs: "Importadora de Santa Catarina com foco em produtos pet.",
  },
  {
    id: 8,
    importador: "HOSPFLEX EMBALAGENS LTDA",
    estado: "SC",
    cidade: "Itajai",
    segmento: "Hospitalar / Higiene",
    fobUsd: 142800,
    percentual: "1,95%",
    fabricantes: [
      { nome: "ZHEJIANG KINGSAFE", provincia: "Zhejiang", participacao: "Principal" },
      { nome: "CHANGZHOU COMI", provincia: "Jiangsu", participacao: "Secundário" },
    ],
    marcas: ["HOSPFLEX", "KINGSAFE", "SEM MARCA"],
    obs: "Foco em produtos hospitalares e de higiene. Marca própria HOSPFLEX.",
  },
  {
    id: 9,
    importador: "MULTI-MARCAS INDUSTRIA DE PRODUTOS HIGIENICOS LTDA",
    estado: "SC",
    cidade: "Itajai",
    segmento: "Higiene",
    fobUsd: 128600,
    percentual: "1,75%",
    fabricantes: [
      { nome: "SHANDONG AISHULE", provincia: "Shandong", participacao: "Principal" },
      { nome: "TIANJIN WHOLESOME", provincia: "Tianjin", participacao: "Secundário" },
    ],
    marcas: ["PAPER", "SEM MARCA"],
    obs: "Importadora de produtos higiênicos com múltiplas marcas.",
  },
  {
    id: 10,
    importador: "THCR COMERCIO, IMPORTACAO E EXPORTACAO LTDA",
    estado: "PR",
    cidade: "Curitiba",
    segmento: "Trading",
    fobUsd: 118900,
    percentual: "1,62%",
    fabricantes: [
      { nome: "CHANGZHOU AM", provincia: "Jiangsu", participacao: "Principal" },
      { nome: "HENAN DELIGHT", provincia: "Henan", participacao: "Secundário" },
    ],
    marcas: ["SEM MARCA"],
    obs: "Trading de Curitiba que distribui para o mercado paranaense.",
  },
  {
    id: 11,
    importador: "DAISO BRASIL COMERCIO E IMPORTACAO LTDA.",
    estado: "SP",
    cidade: "Sao Paulo",
    segmento: "Varejo / Japonês",
    fobUsd: 98700,
    percentual: "1,35%",
    fabricantes: [
      { nome: "Fornecedor Zhejiang (não identificado)", provincia: "Zhejiang", participacao: "Principal" },
    ],
    marcas: ["DAISO"],
    obs: "Rede japonesa de lojas de utilidades. Vende tapetes higiênicos nas lojas físicas. Fornecedor chinês exato não confirmado como fabricante de tapetes.",
  },
  {
    id: 12,
    importador: "GARRA ANIMAL COMERCIO ATACADISTA DE MEDICAMENTOS E DROGAS DE USO VETERINARIO LTDA",
    estado: "PR",
    cidade: "Curitiba",
    segmento: "Atacado Veterinário",
    fobUsd: 87500,
    percentual: "1,19%",
    fabricantes: [
      { nome: "SHANDONG AISHULE", provincia: "Shandong", participacao: "Principal" },
      { nome: "HANGZHOU BRILLIANT", provincia: "Zhejiang", participacao: "Secundário" },
    ],
    marcas: ["HUSPET", "SEM MARCA"],
    obs: "Atacadista veterinário com distribuição para clínicas e pet shops do Sul.",
  },
  {
    id: 13,
    importador: "NORDSTROM COMERCIAL LTDA",
    estado: "SC",
    cidade: "Itajai",
    segmento: "Importadora",
    fobUsd: 76300,
    percentual: "1,04%",
    fabricantes: [
      { nome: "TIANJIN YIYI", provincia: "Tianjin", participacao: "Principal" },
    ],
    marcas: ["HUSPET", "HUSHPET"],
    obs: "Importadora catarinense com foco na marca HUSPET.",
  },
  {
    id: 14,
    importador: "CONNECTA IMPORTACAO E EXPORTACAO LTDA",
    estado: "SC",
    cidade: "Itajai",
    segmento: "Importadora / Trading",
    fobUsd: 65800,
    percentual: "0,90%",
    fabricantes: [
      { nome: "HANGZHOU LINAN", provincia: "Zhejiang", participacao: "Principal" },
      { nome: "QINGDAO DR", provincia: "Shandong", participacao: "Secundário" },
    ],
    marcas: ["SEM MARCA"],
    obs: "Trading de Itajai com foco em importações a granel sem marca.",
  },
  {
    id: 15,
    importador: "SUDAMERICA TRADING LTDA",
    estado: "SC",
    cidade: "Itajai",
    segmento: "Trading",
    fobUsd: 58200,
    percentual: "0,79%",
    fabricantes: [
      { nome: "CHANGZHOU CAREDE", provincia: "Jiangsu", participacao: "Principal" },
    ],
    marcas: ["CAREDE", "SEM MARCA"],
    obs: "Trading com foco no mercado sul-americano.",
  },
];

function fmtUsd(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

const segmentos = ["Todos", "Importadora", "Distribuidora Pet", "Produtos Pet", "Higiene", "Trading", "Atacado", "Hospitalar", "Varejo"];

export default function Cruzamento() {
  const [search, setSearch] = useState("");
  const [segmento, setSegmento] = useState("Todos");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return cruzamentosData.filter((c) => {
      const matchSearch =
        c.importador.toLowerCase().includes(search.toLowerCase()) ||
        c.fabricantes.some(f => f.nome.toLowerCase().includes(search.toLowerCase())) ||
        c.marcas.some(m => m.toLowerCase().includes(search.toLowerCase()));
      const matchSeg = segmento === "Todos" || c.segmento.includes(segmento);
      return matchSearch && matchSeg;
    });
  }, [search, segmento]);

  const totalFob = cruzamentosData.reduce((s, c) => s + c.fobUsd, 0);

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <GitMerge className="w-4 h-4" />
          <span>Cruzamento — LogComex NCM 4818.90.90 | Jun/2025 – Mai/2026</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Fábrica Chinesa × Importador Brasileiro × Marca</h1>
        <p className="text-slate-500 mt-1">
          Quem compra de quem — rastreamento completo da cadeia de importação China → Brasil
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Como interpretar este cruzamento</p>
          <p className="text-xs text-amber-700 mt-1">
            Os dados mostram quais importadores brasileiros compraram de quais fábricas chinesas, e sob qual marca o produto é vendido no Brasil.
            O cruzamento é baseado nos registros de importação do NCM 4818.90.90 na LogComex (Jun/2025–Mai/2026).
            As associações de marca são inferidas a partir dos dados de produto declarados nas importações.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{cruzamentosData.length}</p>
          <p className="text-xs text-slate-500 mt-1">Importadores Mapeados</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-700">81</p>
          <p className="text-xs text-slate-500 mt-1">Fábricas Chinesas</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-blue-700">39</p>
          <p className="text-xs text-slate-500 mt-1">Marcas Identificadas</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-700">{fmtUsd(totalFob)}</p>
          <p className="text-xs text-slate-500 mt-1">FOB Total Mapeado</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por importador, fábrica ou marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <select
          value={segmento}
          onChange={(e) => setSegmento(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          {segmentos.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-500 mb-3">{filtered.length} registros encontrados</p>

      {/* Cruzamento Cards */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors text-left"
            >
              {/* Rank */}
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-slate-600">{item.id}</span>
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-900 text-sm truncate">{item.importador}</span>
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    {item.estado} — {item.cidade}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex-shrink-0">
                    {item.segmento}
                  </span>
                </div>

                {/* Fabricantes e Marcas resumo */}
                <div className="flex flex-wrap gap-3 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Factory className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span className="text-xs text-slate-600">
                      {item.fabricantes.map(f => f.nome).join(", ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span className="text-xs text-slate-600">
                      {item.marcas.join(", ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* FOB + Toggle */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-sm font-bold text-slate-900">{fmtUsd(item.fobUsd)}</span>
                <span className="text-xs text-slate-400">{item.percentual} do total</span>
                {expandedId === item.id
                  ? <ChevronUp className="w-4 h-4 text-slate-400 mt-1" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 mt-1" />
                }
              </div>
            </button>

            {/* Expanded Detail */}
            {expandedId === item.id && (
              <div className="px-5 pb-5 border-t border-slate-100 bg-slate-50">
                <div className="grid md:grid-cols-3 gap-5 mt-4">

                  {/* Fábricas */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Factory className="w-4 h-4 text-red-600" />
                      <h3 className="text-sm font-semibold text-slate-800">Fábricas Chinesas</h3>
                    </div>
                    <div className="space-y-2">
                      {item.fabricantes.map((fab, i) => (
                        <div key={i} className="bg-white border border-red-100 rounded-lg p-3">
                          <p className="text-sm font-medium text-slate-900">{fab.nome}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{fab.provincia}, China</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                            fab.participacao === "Principal"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {fab.participacao}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Importador */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-slate-800">Importador Brasileiro</h3>
                    </div>
                    <div className="bg-white border border-blue-100 rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium text-slate-900">{item.importador}</p>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">{item.estado} — {item.cidade}</span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{item.segmento}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-100">
                        <p className="text-xs text-slate-500">FOB Total (12 meses)</p>
                        <p className="text-base font-bold text-slate-900">{fmtUsd(item.fobUsd)}</p>
                        <p className="text-xs text-slate-400">{item.percentual} do mercado</p>
                      </div>
                    </div>
                  </div>

                  {/* Marcas */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-green-600" />
                      <h3 className="text-sm font-semibold text-slate-800">Marcas no Brasil</h3>
                    </div>
                    <div className="space-y-2">
                      {item.marcas.map((marca, i) => (
                        <div key={i} className="bg-white border border-green-100 rounded-lg px-3 py-2">
                          <p className="text-sm font-medium text-slate-900">{marca}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {marca === "SEM MARCA" ? "Produto a granel / sem marca registrada" :
                             marca === "HUSPET" || marca === "HUSHPET" ? "Marca pet — distribuição nacional" :
                             marca === "PAPER" ? "Linha genérica de papel higiênico" :
                             "Marca identificada nas importações"}
                          </p>
                        </div>
                      ))}
                    </div>
                    {item.obs && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-700">{item.obs}</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <GitMerge className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum resultado encontrado para os filtros selecionados.</p>
        </div>
      )}

      {/* Nota metodológica */}
      <div className="mt-8 bg-slate-100 border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Nota Metodológica</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Os dados de cruzamento são baseados nos registros de importação do NCM 4818.90.90 extraídos da plataforma LogComex para o período Jun/2025–Mai/2026.
          A associação entre importador e exportador é inferida a partir dos dados de origem declarados nas Declarações de Importação (DI) registradas no SISCOMEX.
          As marcas são identificadas a partir dos campos de descrição de produto nas DIs.
          Para cruzamentos exatos por operação (DI a DI), é necessário o plano completo da LogComex com acesso ao módulo de Operações.
        </p>
      </div>
    </Layout>
  );
}
