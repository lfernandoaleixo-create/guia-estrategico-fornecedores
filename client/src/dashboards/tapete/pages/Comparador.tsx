/**
 * Comparador de Fábricas Chinesas
 * Design: Portal de Inteligência Comercial — azul-marinho + vermelho-China + dourado
 * Foco: Comparar 2-3 fábricas lado a lado em todos os critérios relevantes
 */

import { useState } from "react";
import Layout from "@tapete/components/Layout";
import { Badge } from "@/components/ui/badge";
import {
  Scale,
  Factory,
  MapPin,
  TrendingUp,
  Package,
  ShieldCheck,
  DollarSign,
  Boxes,
  Globe,
  ExternalLink,
  Star,
  CheckCircle2,
  XCircle,
  ChevronDown,
  BarChart3,
  Zap,
  Award,
} from "lucide-react";

// Dados completos das fábricas para comparação
const todasFabricas = [
  {
    id: 1,
    nome: "Shandong Aishule Hygiene Products",
    apelido: "Aishule",
    localizacao: "Shandong, China",
    provincia: "Shandong",
    fobUsd: 2585917,
    percentualMercado: 35.3,
    relevancia: "top",
    marcas: ["SHANDONG AISHULE HYGIENE"],
    especialidade: "Pet Training Pads, Puppy Pads",
    site: "https://www.aishule.com",
    alibaba: "https://aishule.en.alibaba.com",
    email: "sales@aishule.com",
    moq: "1.000 peças",
    moqNum: 1000,
    precoMin: 0.04,
    precoMax: 0.15,
    precoLabel: "US$ 0,04–0,15/pç",
    capacidadeAnual: 500,
    areaM2: 30000,
    linhasProducao: 20,
    anosExportacao: 12,
    certificacoes: ["ISO 9001", "CE", "SGS", "BSCI"],
    aceitaOEM: true,
    aceitaPrivateLabel: true,
    temSiteOficial: true,
    temAlibaba: true,
    pontuacaoGeral: 95,
    cor: "red",
    descricao: "Maior exportador para o Brasil, com 35,3% do mercado. Polo de Shandong.",
    tamanhos: ["33×45cm", "45×60cm", "60×60cm", "60×90cm", "76×90cm"],
    tiposProduto: ["Standard", "Premium", "Jumbo", "Super Absorvente"],
    tempoEntrega: "25–35 dias",
    portoPrincipal: "Qingdao",
    idiomaNegociacao: ["Inglês", "Chinês"],
    pontosFortess: ["Maior volume para o BR", "Preço competitivo", "Ampla variedade", "OEM/PL aceito"],
    pontosFracos: ["Foco em volume alto", "Comunicação pode ser lenta"],
  },
  {
    id: 2,
    nome: "Tianjin Yiyi Hygiene Products",
    apelido: "Yiyi / HUSPET",
    localizacao: "Tianjin, China",
    provincia: "Tianjin",
    fobUsd: 510058,
    percentualMercado: 7.0,
    relevancia: "top",
    marcas: ["HUSHPET", "SANCLEAN", "HUSPET"],
    especialidade: "Pet Training Pads, Poo Bags",
    site: "https://www.yiyipad.com",
    alibaba: "https://tjyiyi.en.alibaba.com",
    email: "enquiry@tjyiyi.com",
    moq: "500 peças",
    moqNum: 500,
    precoMin: 0.05,
    precoMax: 0.18,
    precoLabel: "US$ 0,05–0,18/pç",
    capacidadeAnual: 200,
    areaM2: 15000,
    linhasProducao: 12,
    anosExportacao: 15,
    certificacoes: ["ISO", "CE", "SGS"],
    aceitaOEM: true,
    aceitaPrivateLabel: true,
    temSiteOficial: true,
    temAlibaba: true,
    pontuacaoGeral: 88,
    cor: "orange",
    descricao: "Marcas próprias HUSPET/HUSHPET estabelecidas no Brasil. Site profissional.",
    tamanhos: ["33×45cm", "45×60cm", "60×60cm", "60×90cm"],
    tiposProduto: ["Standard", "Premium", "Carvão de Bambu"],
    tempoEntrega: "20–30 dias",
    portoPrincipal: "Tianjin",
    idiomaNegociacao: ["Inglês", "Chinês"],
    pontosFortess: ["Marcas conhecidas no BR", "MOQ baixo", "Site profissional", "Boa comunicação"],
    pontosFracos: ["Capacidade menor", "Preço um pouco mais alto"],
  },
  {
    id: 3,
    nome: "Care-De (Changzhou) Hygiene Products",
    apelido: "Care-De",
    localizacao: "Changzhou, Jiangsu",
    provincia: "Jiangsu",
    fobUsd: 393882,
    percentualMercado: 5.4,
    relevancia: "top",
    marcas: ["CAREDE"],
    especialidade: "Pet Training Pads, Puppy Pads",
    site: "https://www.czcarede.com",
    alibaba: "https://czcarede.en.alibaba.com",
    email: "sales@czcarede.com",
    moq: "1.000 peças",
    moqNum: 1000,
    precoMin: 0.05,
    precoMax: 0.20,
    precoLabel: "US$ 0,05–0,20/pç",
    capacidadeAnual: 300,
    areaM2: 20000,
    linhasProducao: 26,
    anosExportacao: 10,
    certificacoes: ["ISO", "CE"],
    aceitaOEM: true,
    aceitaPrivateLabel: true,
    temSiteOficial: true,
    temAlibaba: true,
    pontuacaoGeral: 85,
    cor: "blue",
    descricao: "20.000 m² e 26 linhas de produção. Exporta para Europa, EUA e Ásia.",
    tamanhos: ["56×56cm", "56×58cm", "40×60cm", "60×60cm", "60×90cm", "76×90cm"],
    tiposProduto: ["Standard", "Premium", "Jumbo", "Extra Jumbo"],
    tempoEntrega: "25–35 dias",
    portoPrincipal: "Shanghai",
    idiomaNegociacao: ["Inglês", "Chinês"],
    pontosFortess: ["26 linhas de produção", "Fábrica grande", "Exporta globalmente", "Muitos tamanhos"],
    pontosFracos: ["Preço mais alto", "Foco em clientes grandes"],
  },
  {
    id: 4,
    nome: "Xiamen Yanjan Daily Necessities",
    apelido: "Yanjan",
    localizacao: "Xiamen, Fujian",
    provincia: "Fujian",
    fobUsd: 361435,
    percentualMercado: 4.9,
    relevancia: "top",
    marcas: ["YANJAN"],
    especialidade: "Pet Pads, Bamboo Fiber Pads",
    site: "https://www.yanjan.com",
    alibaba: "https://yanjan.en.alibaba.com",
    email: "sales@yanjan.com",
    moq: "500 peças",
    moqNum: 500,
    precoMin: 0.04,
    precoMax: 0.16,
    precoLabel: "US$ 0,04–0,16/pç",
    capacidadeAnual: 250,
    areaM2: 12000,
    linhasProducao: 10,
    anosExportacao: 8,
    certificacoes: ["ISO 9001", "CE", "SGS"],
    aceitaOEM: true,
    aceitaPrivateLabel: true,
    temSiteOficial: true,
    temAlibaba: true,
    pontuacaoGeral: 82,
    cor: "green",
    descricao: "Porto de Xiamen (logística eficiente). Especialidade em tapetes de bambu.",
    tamanhos: ["33×45cm", "45×60cm", "60×60cm", "60×90cm"],
    tiposProduto: ["Standard", "Bambu", "Premium"],
    tempoEntrega: "20–28 dias",
    portoPrincipal: "Xiamen",
    idiomaNegociacao: ["Inglês", "Chinês"],
    pontosFortess: ["Porto de Xiamen", "Especialidade bambu", "MOQ baixo", "Preço competitivo"],
    pontosFracos: ["Fábrica menor", "Menos linhas de produção"],
  },
  {
    id: 5,
    nome: "ElinTree (Xiamen) Life Products",
    apelido: "ElinTree",
    localizacao: "Xiamen, Fujian",
    provincia: "Fujian",
    fobUsd: 0,
    percentualMercado: 0,
    relevancia: "alto",
    marcas: ["ELINTREE"],
    especialidade: "Pet Pads, Baby Diapers, Adult Care",
    site: "https://www.elintree.com",
    alibaba: "https://elintree.en.alibaba.com",
    email: "sales@elintree.com",
    moq: "100.000 peças (PL)",
    moqNum: 100000,
    precoMin: 0.03,
    precoMax: 0.12,
    precoLabel: "US$ 0,03–0,12/pç",
    capacidadeAnual: 800,
    areaM2: 40000,
    linhasProducao: 15,
    anosExportacao: 10,
    certificacoes: ["CE", "FDA", "ISO 9001", "ISO 13485", "OEKO-TEX", "FSC"],
    aceitaOEM: true,
    aceitaPrivateLabel: true,
    temSiteOficial: true,
    temAlibaba: true,
    pontuacaoGeral: 90,
    cor: "teal",
    descricao: "Maior capacidade: 800M/ano. Certificações FDA e OEKO-TEX. Private label.",
    tamanhos: ["33×45cm", "45×60cm", "60×60cm", "60×90cm", "76×90cm", "90×120cm"],
    tiposProduto: ["Standard", "Premium", "Jumbo", "Super Absorvente", "Bambu", "Lavável"],
    tempoEntrega: "30–45 dias",
    portoPrincipal: "Xiamen",
    idiomaNegociacao: ["Inglês", "Chinês"],
    pontosFortess: ["Maior capacidade (800M/ano)", "FDA + OEKO-TEX", "Linha completa", "Private label"],
    pontosFracos: ["MOQ alto para PL", "Lead time maior"],
  },
  {
    id: 6,
    nome: "Xiamen Newclears Daily Products",
    apelido: "Newclears",
    localizacao: "Xiamen, Fujian",
    provincia: "Fujian",
    fobUsd: 0,
    percentualMercado: 0,
    relevancia: "alto",
    marcas: ["NEWCLEARS"],
    especialidade: "Pet Pads, Baby Diapers, Bamboo Series",
    site: "https://www.newclears.com",
    alibaba: "https://newclears.en.alibaba.com",
    email: "sales@newclears.com",
    moq: "500 peças",
    moqNum: 500,
    precoMin: 0.04,
    precoMax: 0.15,
    precoLabel: "US$ 0,04–0,15/pç",
    capacidadeAnual: 400,
    areaM2: 50000,
    linhasProducao: 18,
    anosExportacao: 16,
    certificacoes: ["ISO", "CE", "SGS"],
    aceitaOEM: true,
    aceitaPrivateLabel: true,
    temSiteOficial: true,
    temAlibaba: true,
    pontuacaoGeral: 87,
    cor: "cyan",
    descricao: "50.000 m² com 18 linhas (3 dedicadas a pets). Fundada em 2009.",
    tamanhos: ["33×45cm", "45×60cm", "60×60cm", "60×90cm", "76×90cm"],
    tiposProduto: ["Standard", "Premium", "Bambu", "Lavável"],
    tempoEntrega: "25–35 dias",
    portoPrincipal: "Xiamen",
    idiomaNegociacao: ["Inglês", "Chinês"],
    pontosFortess: ["50.000 m² de área", "18 linhas de produção", "3 linhas dedicadas pets", "Fundada 2009"],
    pontosFracos: ["Não exporta diretamente ao BR (ainda)"],
  },
  {
    id: 7,
    nome: "Qingdao D&R Hygienic Products",
    apelido: "D&R",
    localizacao: "Qingdao, Shandong",
    provincia: "Shandong",
    fobUsd: 0,
    percentualMercado: 0,
    relevancia: "medio",
    marcas: ["D&R"],
    especialidade: "Puppy Pads, Washable Pads, Pet Wipes",
    site: "https://dnrpad.en.alibaba.com",
    alibaba: "https://dnrpad.en.alibaba.com",
    email: "sales@dnrpad.com",
    moq: "500 peças",
    moqNum: 500,
    precoMin: 0.02,
    precoMax: 0.17,
    precoLabel: "US$ 0,02–0,17/pç",
    capacidadeAnual: 100,
    areaM2: 8000,
    linhasProducao: 6,
    anosExportacao: 6,
    certificacoes: ["ISO", "CE"],
    aceitaOEM: true,
    aceitaPrivateLabel: true,
    temSiteOficial: false,
    temAlibaba: true,
    pontuacaoGeral: 72,
    cor: "yellow",
    descricao: "MOQ muito baixo (500 peças). Ideal para pedidos de teste. Preço muito competitivo.",
    tamanhos: ["33×45cm", "45×60cm", "60×60cm"],
    tiposProduto: ["Standard", "Lavável", "Bambu"],
    tempoEntrega: "20–30 dias",
    portoPrincipal: "Qingdao",
    idiomaNegociacao: ["Inglês", "Chinês"],
    pontosFortess: ["MOQ 500 peças", "Preço mais baixo", "Aceita pedidos teste", "Linha lavável"],
    pontosFracos: ["Fábrica menor", "Menos certificações", "Sem site próprio"],
  },
  {
    id: 8,
    nome: "Shenzhen Rockbrook Daily Products",
    apelido: "Rockbrook",
    localizacao: "Shenzhen, Guangdong",
    provincia: "Guangdong",
    fobUsd: 0,
    percentualMercado: 0,
    relevancia: "medio",
    marcas: ["ROCKBROOK"],
    especialidade: "Bamboo Charcoal Pet Pads, OEM Private Label",
    site: "https://rockbrook.en.alibaba.com",
    alibaba: "https://rockbrook.en.alibaba.com",
    email: "sales@rockbrook.com",
    moq: "1.000 peças",
    moqNum: 1000,
    precoMin: 0.05,
    precoMax: 0.20,
    precoLabel: "US$ 0,05–0,20/pç",
    capacidadeAnual: 150,
    areaM2: 10000,
    linhasProducao: 8,
    anosExportacao: 11,
    certificacoes: ["Trade Assurance"],
    aceitaOEM: true,
    aceitaPrivateLabel: true,
    temSiteOficial: false,
    temAlibaba: true,
    pontuacaoGeral: 75,
    cor: "stone",
    descricao: "11 anos no Alibaba. Trade Assurance US$ 804K. Especialidade em carvão de bambu.",
    tamanhos: ["33×45cm", "45×60cm", "60×60cm", "60×90cm"],
    tiposProduto: ["Carvão de Bambu", "Non-Woven", "OEM"],
    tempoEntrega: "25–35 dias",
    portoPrincipal: "Shenzhen",
    idiomaNegociacao: ["Inglês", "Chinês"],
    pontosFortess: ["11 anos Alibaba", "Trade Assurance alto", "Especialidade bambu", "OEM/PL"],
    pontosFracos: ["Sem site próprio", "Capacidade menor"],
  },
];

const coresBadge: Record<string, string> = {
  red: "bg-red-600",
  orange: "bg-orange-500",
  blue: "bg-blue-600",
  green: "bg-green-600",
  teal: "bg-teal-600",
  cyan: "bg-cyan-600",
  yellow: "bg-yellow-500",
  stone: "bg-stone-600",
};

const coresBorda: Record<string, string> = {
  red: "border-red-400 bg-red-50",
  orange: "border-orange-400 bg-orange-50",
  blue: "border-blue-400 bg-blue-50",
  green: "border-green-400 bg-green-50",
  teal: "border-teal-400 bg-teal-50",
  cyan: "border-cyan-400 bg-cyan-50",
  yellow: "border-yellow-400 bg-yellow-50",
  stone: "border-stone-400 bg-stone-50",
};

function ScoreBar({ value, max = 100, cor }: { value: number; max?: number; cor: string }) {
  const pct = Math.round((value / max) * 100);
  const barColors: Record<string, string> = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
    teal: "bg-teal-500",
    cyan: "bg-cyan-500",
    yellow: "bg-yellow-500",
    stone: "bg-stone-500",
  };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColors[cor] || "bg-slate-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 w-8 text-right">{value}</span>
    </div>
  );
}

export default function Comparador() {
  const [selecionadas, setSelecionadas] = useState<number[]>([1, 2, 3]);
  const [seletorAberto, setSeletorAberto] = useState<number | null>(null);

  const fabricasSelecionadas = selecionadas
    .map((id) => todasFabricas.find((f) => f.id === id))
    .filter(Boolean) as typeof todasFabricas;

  const toggleSelecao = (slot: number, id: number) => {
    const novas = [...selecionadas];
    novas[slot] = id;
    setSelecionadas(novas);
    setSeletorAberto(null);
  };

  // Determina o melhor em cada critério
  const melhorMoq = Math.min(...fabricasSelecionadas.map((f) => f.moqNum));
  const melhorPreco = Math.min(...fabricasSelecionadas.map((f) => f.precoMin));
  const maiorCapacidade = Math.max(...fabricasSelecionadas.map((f) => f.capacidadeAnual));
  const maiorArea = Math.max(...fabricasSelecionadas.map((f) => f.areaM2));
  const maiorLinhas = Math.max(...fabricasSelecionadas.map((f) => f.linhasProducao));
  const maiorExperiencia = Math.max(...fabricasSelecionadas.map((f) => f.anosExportacao));
  const maiorScore = Math.max(...fabricasSelecionadas.map((f) => f.pontuacaoGeral));

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Comparador de Fábricas</h1>
              <p className="text-slate-500 text-sm">Compare até 3 fabricantes chineses lado a lado em todos os critérios relevantes</p>
            </div>
          </div>
        </div>

        {/* Seletor de fábricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((slot) => {
            const fab = fabricasSelecionadas[slot];
            return (
              <div key={slot} className="relative">
                <button
                  onClick={() => setSeletorAberto(seletorAberto === slot ? null : slot)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    fab
                      ? `${coresBorda[fab.cor]} hover:shadow-md`
                      : "border-dashed border-slate-300 bg-slate-50 hover:border-slate-400"
                  }`}
                >
                  {fab ? (
                    <>
                      <div className={`w-9 h-9 ${coresBadge[fab.cor]} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Factory className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{fab.apelido}</p>
                        <p className="text-xs text-slate-500 truncate">{fab.localizacao}</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm w-full text-center">+ Selecionar fábrica</span>
                  )}
                </button>

                {/* Dropdown de seleção */}
                {seletorAberto === slot && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                    {todasFabricas.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => toggleSelecao(slot, f.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left ${
                          selecionadas.includes(f.id) && selecionadas[slot] !== f.id
                            ? "opacity-40 cursor-not-allowed"
                            : ""
                        }`}
                        disabled={selecionadas.includes(f.id) && selecionadas[slot] !== f.id}
                      >
                        <div className={`w-7 h-7 ${coresBadge[f.cor]} rounded-md flex items-center justify-center flex-shrink-0`}>
                          <Factory className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{f.apelido}</p>
                          <p className="text-xs text-slate-400 truncate">{f.localizacao}</p>
                        </div>
                        {f.relevancia === "top" && (
                          <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {fabricasSelecionadas.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Selecione as fábricas acima para comparar</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Pontuação Geral */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h2 className="font-bold text-slate-900">Pontuação Geral</h2>
                <span className="text-xs text-slate-400 ml-1">(baseada em volume, capacidade, certificações e experiência)</span>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                {fabricasSelecionadas.map((fab) => (
                  <div key={fab.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-6 h-6 ${coresBadge[fab.cor]} rounded-md flex items-center justify-center`}>
                        <Factory className="w-3 h-3 text-white" />
                      </div>
                      <span className="font-semibold text-sm text-slate-800">{fab.apelido}</span>
                      {fab.pontuacaoGeral === maiorScore && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs ml-auto">Melhor</Badge>
                      )}
                    </div>
                    <ScoreBar value={fab.pontuacaoGeral} cor={fab.cor} />
                  </div>
                ))}
              </div>
            </div>

            {/* Participação no mercado BR */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-500" />
                <h2 className="font-bold text-slate-900">Participação no Mercado Brasileiro</h2>
                <span className="text-xs text-slate-400 ml-1">(Jun/2025–Mai/2026, NCM 4818.90.90)</span>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                {fabricasSelecionadas.map((fab) => (
                  <div key={fab.id} className={`rounded-lg p-4 ${coresBorda[fab.cor]} border`}>
                    <p className="text-xs text-slate-500 mb-1">{fab.apelido}</p>
                    {fab.fobUsd > 0 ? (
                      <>
                        <p className="text-2xl font-bold text-slate-900">{fab.percentualMercado.toFixed(1)}%</p>
                        <p className="text-sm text-slate-600 mt-0.5">
                          US$ {(fab.fobUsd / 1000000).toFixed(2)}M FOB
                        </p>
                        <ScoreBar value={fab.percentualMercado} max={40} cor={fab.cor} />
                      </>
                    ) : (
                      <div>
                        <p className="text-lg font-semibold text-slate-400">Não identificado</p>
                        <p className="text-xs text-slate-400 mt-0.5">Não consta no top exportadores BR</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tabela de comparação detalhada */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <h2 className="font-bold text-slate-900">Comparativo Detalhado</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-5 py-3 text-slate-500 font-medium w-44">Critério</th>
                      {fabricasSelecionadas.map((fab) => (
                        <th key={fab.id} className="text-center px-4 py-3 font-semibold text-slate-800">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-7 h-7 ${coresBadge[fab.cor]} rounded-md flex items-center justify-center`}>
                              <Factory className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-xs">{fab.apelido}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* MOQ */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-slate-400" />
                        MOQ
                      </td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center">
                          <span className={`font-semibold ${fab.moqNum === melhorMoq ? "text-green-600" : "text-slate-700"}`}>
                            {fab.moq}
                          </span>
                          {fab.moqNum === melhorMoq && (
                            <span className="ml-1 text-xs text-green-600">✓ menor</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Preço FOB */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        Preço FOB
                      </td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center">
                          <span className={`font-semibold ${fab.precoMin === melhorPreco ? "text-green-600" : "text-slate-700"}`}>
                            {fab.precoLabel}
                          </span>
                          {fab.precoMin === melhorPreco && (
                            <span className="ml-1 text-xs text-green-600">✓ mais baixo</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Capacidade */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4 text-slate-400" />
                        Capacidade/ano
                      </td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center">
                          <span className={`font-semibold ${fab.capacidadeAnual === maiorCapacidade ? "text-green-600" : "text-slate-700"}`}>
                            {fab.capacidadeAnual}M peças
                          </span>
                          {fab.capacidadeAnual === maiorCapacidade && (
                            <span className="ml-1 text-xs text-green-600">✓ maior</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Área fabril */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        Área fabril
                      </td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center">
                          <span className={`font-semibold ${fab.areaM2 === maiorArea ? "text-green-600" : "text-slate-700"}`}>
                            {fab.areaM2.toLocaleString("pt-BR")} m²
                          </span>
                          {fab.areaM2 === maiorArea && (
                            <span className="ml-1 text-xs text-green-600">✓ maior</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Linhas de produção */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-400" />
                        Linhas de produção
                      </td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center">
                          <span className={`font-semibold ${fab.linhasProducao === maiorLinhas ? "text-green-600" : "text-slate-700"}`}>
                            {fab.linhasProducao} linhas
                          </span>
                          {fab.linhasProducao === maiorLinhas && (
                            <span className="ml-1 text-xs text-green-600">✓ mais</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Anos de exportação */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium flex items-center gap-2">
                        <Star className="w-4 h-4 text-slate-400" />
                        Anos exportando
                      </td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center">
                          <span className={`font-semibold ${fab.anosExportacao === maiorExperiencia ? "text-green-600" : "text-slate-700"}`}>
                            {fab.anosExportacao} anos
                          </span>
                          {fab.anosExportacao === maiorExperiencia && (
                            <span className="ml-1 text-xs text-green-600">✓ mais exp.</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Tempo de entrega */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium">⏱ Lead time</td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center text-slate-700 font-medium">
                          {fab.tempoEntrega}
                        </td>
                      ))}
                    </tr>

                    {/* Porto principal */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium">🚢 Porto</td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center text-slate-700 font-medium">
                          {fab.portoPrincipal}
                        </td>
                      ))}
                    </tr>

                    {/* Certificações */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                        Certificações
                      </td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {fab.certificacoes.map((c) => (
                              <Badge key={c} variant="outline" className="text-xs px-1.5 py-0">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* OEM */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium">🏭 Aceita OEM</td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center">
                          {fab.aceitaOEM ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Private Label */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium">🏷 Private Label</td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center">
                          {fab.aceitaPrivateLabel ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Site oficial */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        Site oficial
                      </td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center">
                          {fab.temSiteOficial ? (
                            <a
                              href={fab.site}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              Acessar <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">Apenas Alibaba</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Tamanhos disponíveis */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium">📐 Tamanhos</td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {fab.tamanhos.map((t) => (
                              <span key={t} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Tipos de produto */}
                    <tr className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 font-medium">📦 Tipos</td>
                      {fabricasSelecionadas.map((fab) => (
                        <td key={fab.id} className="px-4 py-3 text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {fab.tiposProduto.map((t) => (
                              <span key={t} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pontos fortes e fracos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {fabricasSelecionadas.map((fab) => (
                <div key={fab.id} className={`rounded-xl border-2 ${coresBorda[fab.cor]} p-5`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-7 h-7 ${coresBadge[fab.cor]} rounded-lg flex items-center justify-center`}>
                      <Factory className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">{fab.apelido}</span>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">✓ Pontos Fortes</p>
                    <ul className="space-y-1">
                      {fab.pontosFortess.map((p) => (
                        <li key={p} className="text-xs text-slate-700 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">✗ Pontos de Atenção</p>
                    <ul className="space-y-1">
                      {fab.pontosFracos.map((p) => (
                        <li key={p} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <a
                      href={fab.alibaba}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 bg-orange-500 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Ver no Alibaba
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </Layout>
  );
}
