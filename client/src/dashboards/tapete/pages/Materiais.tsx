// =============================================================================
// MATERIAIS & TIPOS DE PRODUTO
// Design: Portal de Inteligência Comercial — Azul-marinho + Vermelho-China + Dourado
// Foco: Explicação simples de cada camada, fotos reais e como avaliar qualidade
// =============================================================================
import { useState } from "react";
import Layout from "@tapete/components/Layout";
import { materiais, tiposProduto } from "@tapete/lib/data";
import { Layers, Package, Ruler, Droplets, DollarSign, CheckCircle, Eye, AlertTriangle } from "lucide-react";

const camadas = [
  {
    numero: 1,
    posicao: "TOPO — Contato com o animal",
    nome: "Non-Woven (Não-Tecido)",
    nome_tecnico: "PP Spunbond / Polipropileno",
    descricao: "É a camada que o animal pisa. Feita de fibras sintéticas entrelaçadas sem tecelagem. Parece um tecido macio e levemente texturizado.",
    funcao: "Captura o líquido rapidamente e o direciona para baixo, mantendo a superfície seca ao toque. Evita que o animal molhe as patas.",
    como_avaliar: "Despeje algumas gotas de água: o líquido deve sumir em menos de 3 segundos. A superfície deve ficar seca ao toque após 5 segundos. Se ficar encharcada, a qualidade é baixa.",
    sinal_qualidade: "Superfície seca após 5 seg",
    sinal_ruim: "Superfície encharcada ao toque",
    cor: "from-sky-50 to-sky-100",
    borda: "border-sky-300",
    badge_cor: "bg-sky-600",
    espessura: "0,5–1 mm",
    material_alternativo: "Fibra de bambu (premium)",
  },
  {
    numero: 2,
    posicao: "CAMADA 2 — Distribuição",
    nome: "Papel Tissue",
    nome_tecnico: "Quick Dry Paper Tissue",
    descricao: "Uma folha fina de papel especial, semelhante ao papel de seda, mas com tratamento para absorção rápida. Fica entre o não-tecido e o núcleo absorvente.",
    funcao: "Distribui o líquido uniformemente pelo tapete, evitando que fique concentrado em um único ponto. Aumenta a eficiência do núcleo absorvente.",
    como_avaliar: "Ao rasgar o tapete, você deve ver uma camada fina e branca entre o topo e o miolo. Se não existir, o tapete tem menos camadas e absorve de forma irregular.",
    sinal_qualidade: "Camada visível ao rasgar",
    sinal_ruim: "Ausente em tapetes baratos",
    cor: "from-amber-50 to-amber-100",
    borda: "border-amber-300",
    badge_cor: "bg-amber-600",
    espessura: "0,3–0,5 mm",
    material_alternativo: "Ausente em tapetes de 4 camadas",
  },
  {
    numero: 3,
    posicao: "NÚCLEO — Principal absorção",
    nome: "Polpa de Celulose",
    nome_tecnico: "Fluff Pulp (Fibras de Madeira)",
    descricao: "Fibras de madeira processadas, parecidas com algodão em flocos. É o principal componente de volume do tapete. Quanto mais espessa essa camada, maior a capacidade de absorção.",
    funcao: "Absorve e retém grandes volumes de líquido. É a camada que dá \"corpo\" ao tapete e define a capacidade total de absorção.",
    como_avaliar: "Um tapete de qualidade deve ter pelo menos 3–4 mm de espessura nessa camada. Aperte o tapete: deve ter resistência e não achatar facilmente. Tapetes finos têm pouca polpa.",
    sinal_qualidade: "Espessura ≥ 3 mm, resistente ao aperto",
    sinal_ruim: "Achata facilmente, muito fino",
    cor: "from-orange-50 to-orange-100",
    borda: "border-orange-300",
    badge_cor: "bg-orange-600",
    espessura: "3–8 mm",
    material_alternativo: "Fibra de bambu (eco-friendly)",
  },
  {
    numero: 4,
    posicao: "NÚCLEO — Retenção em gel",
    nome: "SAP — Polímero Superabsorvente",
    nome_tecnico: "Poliacrilato de Sódio (cristais)",
    descricao: "Pequenos cristais ou pó branco que parecem sal grosso. Quando em contato com líquido, incham e formam um gel firme, podendo absorver até 300× seu peso em água.",
    funcao: "Transforma o líquido em gel sólido, impedindo que ele retorne à superfície (efeito \"re-wet\"). É o componente mais caro e mais importante para a qualidade.",
    como_avaliar: "Corte o tapete e observe os cristais brancos. Molhe um pouco: devem inchar e formar gel em segundos. Tapetes baratos têm pouco SAP — o líquido volta à superfície quando pressionado.",
    sinal_qualidade: "Gel firme, não retorna ao pressionar",
    sinal_ruim: "Líquido volta ao pressionar o tapete",
    cor: "from-blue-50 to-blue-100",
    borda: "border-blue-400",
    badge_cor: "bg-blue-700",
    espessura: "0,5–2 mm (cristais)",
    material_alternativo: "Gel de sílica (premium anti-odor)",
  },
  {
    numero: 5,
    posicao: "BASE — Barreira impermeável",
    nome: "Filme PE Impermeável",
    nome_tecnico: "Polyethylene Film (Polietileno)",
    descricao: "Uma fina película plástica, parecida com o plástico de embalagem, mas mais resistente. É a última camada do tapete, em contato com o piso.",
    funcao: "Barreira 100% impermeável que impede qualquer vazamento para o piso. Protege o assoalho, o carpete ou o piso do animal.",
    como_avaliar: "Molhe o tapete completamente e vire de cabeça para baixo. O lado de baixo deve estar completamente seco. Se molhar, o filme PE é de baixa qualidade ou muito fino.",
    sinal_qualidade: "Base completamente seca após molhar",
    sinal_ruim: "Vazamento visível na base",
    cor: "from-slate-50 to-slate-100",
    borda: "border-slate-300",
    badge_cor: "bg-slate-600",
    espessura: "0,02–0,05 mm",
    material_alternativo: "PE texturizado (antiderrapante)",
  },
];

export default function Materiais() {
  const [tab, setTab] = useState<"camadas" | "materiais" | "tipos">("camadas");
  const [camadaExpandida, setCamadaExpandida] = useState<number | null>(null);

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Layers className="w-4 h-4" />
          <span>Composição do Produto — Guia Técnico Simplificado</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Materiais, Camadas & Tipos de Produto</h1>
        <p className="text-slate-500 mt-1">
          Entenda o que compõe cada tapete higiênico, como avaliar a qualidade e quais são os tipos disponíveis no mercado
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setTab("camadas")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "camadas" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          Camadas do Produto (5)
        </button>
        <button
          onClick={() => setTab("materiais")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "materiais" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          Materiais ({materiais.length})
        </button>
        <button
          onClick={() => setTab("tipos")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "tipos" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          Tipos de Produto ({tiposProduto.length})
        </button>
      </div>

      {/* ===== ABA CAMADAS ===== */}
      {tab === "camadas" && (
        <div>
          {/* Diagrama visual de camadas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="font-bold text-slate-900 mb-1">Diagrama de Camadas — Tapete Padrão (5 camadas)</h2>
            <p className="text-xs text-slate-500 mb-5">
              Clique em cada camada para ver a explicação completa, como avaliar e o que diferencia qualidade boa de ruim.
            </p>

            {/* Diagrama explodido */}
            <div className="flex gap-6 items-start">
              {/* Diagrama visual */}
              <div className="hidden md:block w-48 flex-shrink-0">
                <img
                  src="/manus-storage/layers-6layer-diagram_f4a65703.jpg"
                  alt="Diagrama das camadas do tapete higiênico"
                  className="w-full rounded-lg border border-slate-200 shadow-sm"
                />
                <p className="text-xs text-slate-400 text-center mt-2">Estrutura real de 6 camadas (premium)</p>
              </div>

              {/* Camadas clicáveis */}
              <div className="flex-1 space-y-2">
                {camadas.map((c) => (
                  <div key={c.numero} className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <button
                      onClick={() => setCamadaExpandida(camadaExpandida === c.numero ? null : c.numero)}
                      className={`w-full bg-gradient-to-r ${c.cor} border-b ${c.borda} px-4 py-3 flex items-center gap-3 text-left hover:brightness-95 transition-all`}
                    >
                      <span className={`w-7 h-7 rounded-full ${c.badge_cor} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                        {c.numero}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{c.nome}</span>
                          <span className="text-xs text-slate-500 font-mono">{c.nome_tecnico}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{c.posicao}</p>
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">{camadaExpandida === c.numero ? "▲" : "▼"}</span>
                    </button>

                    {camadaExpandida === c.numero && (
                      <div className="bg-white p-5 space-y-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">O que é</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{c.descricao}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Para que serve</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{c.funcao}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <Eye className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-amber-800 mb-1">Como avaliar a qualidade</p>
                              <p className="text-sm text-amber-700 leading-relaxed">{c.como_avaliar}</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-green-800 mb-0.5">Sinal de boa qualidade</p>
                              <p className="text-xs text-green-700">{c.sinal_qualidade}</p>
                            </div>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-red-800 mb-0.5">Sinal de baixa qualidade</p>
                              <p className="text-xs text-red-700">{c.sinal_ruim}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span><strong>Espessura típica:</strong> {c.espessura}</span>
                          <span><strong>Alternativa:</strong> {c.material_alternativo}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Imagem adicional */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <img
                  src="/manus-storage/layers-5layer-structure_1f438e20.jpg"
                  alt="Estrutura de 5 camadas do tapete higiênico"
                  className="w-full rounded-lg border border-slate-200 shadow-sm"
                />
                <p className="text-xs text-slate-400 text-center mt-2">Estrutura de 5 camadas com SAP</p>
              </div>
              <div>
                <img
                  src="/manus-storage/layers-6layer-nezo_4fb2ff43.jpg"
                  alt="Tapete higiênico premium 6 camadas"
                  className="w-full rounded-lg border border-slate-200 shadow-sm"
                />
                <p className="text-xs text-slate-400 text-center mt-2">Tapete premium 6 camadas com bordas seladas</p>
              </div>
            </div>
          </div>

          {/* Resumo comparativo de qualidade */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-900 mb-4">Comparativo Rápido: Padrão vs. Premium</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Característica</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Padrão (4 camadas)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Premium (5 camadas)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Super Premium (6 camadas)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { item: "Non-Woven (topo)", padrao: "✅ PP básico", premium: "✅ PP macio", super: "✅ PP ultra-macio" },
                    { item: "Papel Tissue", padrao: "✅ 1 camada", premium: "✅ 1 camada", super: "✅ 2 camadas" },
                    { item: "Polpa de Celulose", padrao: "✅ Fina (2–3mm)", premium: "✅ Média (3–5mm)", super: "✅ Espessa (5–8mm)" },
                    { item: "SAP (polímero)", padrao: "❌ Ausente ou mínimo", premium: "✅ Presente", super: "✅ Alta concentração" },
                    { item: "Filme PE (base)", padrao: "✅ Básico", premium: "✅ Reforçado", super: "✅ Duplo reforço" },
                    { item: "Bordas seladas", padrao: "❌ Não", premium: "⚠️ Algumas marcas", super: "✅ Sim, 4 lados" },
                    { item: "Absorção estimada", padrao: "200–400 ml", premium: "400–800 ml", super: "800–1.500 ml" },
                    { item: "Preço FOB médio", padrao: "US$ 0,02–0,04/un", premium: "US$ 0,04–0,08/un", super: "US$ 0,08–0,15/un" },
                  ].map((row) => (
                    <tr key={row.item} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800 text-xs">{row.item}</td>
                      <td className="px-4 py-2.5 text-center text-xs text-slate-600">{row.padrao}</td>
                      <td className="px-4 py-2.5 text-center text-xs text-slate-600">{row.premium}</td>
                      <td className="px-4 py-2.5 text-center text-xs text-slate-600">{row.super}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== ABA MATERIAIS ===== */}
      {tab === "materiais" && (
        <div className="grid lg:grid-cols-2 gap-4">
          {materiais.map((mat) => (
            <div key={mat.nome} className={`rounded-xl border-2 p-5 ${mat.cor}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-bold text-slate-900 text-sm leading-tight">{mat.nome}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${mat.custoRelativo === "Alto" ? "bg-red-100 text-red-700" : mat.custoRelativo === "Medio" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                  Custo {mat.custoRelativo}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">{mat.funcao}</p>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">{mat.descricao}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Origem principal:</span>
                <span className="text-xs font-medium text-slate-700">{mat.origemPrincipal}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== ABA TIPOS ===== */}
      {tab === "tipos" && (
        <div className="grid lg:grid-cols-2 gap-4">
          {tiposProduto.map((tipo) => (
            <div key={tipo.tipo} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">{tipo.tipo}</h3>
                <span className={`text-xs px-2.5 py-1 rounded-full text-white font-medium ${tipo.badgeColor}`}>{tipo.badge}</span>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{tipo.descricao}</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500 font-medium">Camadas</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{tipo.camadas}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Droplets className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500 font-medium">Absorção</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{tipo.absorcaoMl}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Ruler className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500">Tamanhos: </span>
                      <span className="text-xs font-medium text-slate-700">{tipo.tamanhos.join(", ")}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500">Preço FOB: </span>
                      <span className="text-xs font-bold text-emerald-700">{tipo.precoFobUsd}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Package className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500">Público: </span>
                      <span className="text-xs font-medium text-slate-700">{tipo.publico}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
