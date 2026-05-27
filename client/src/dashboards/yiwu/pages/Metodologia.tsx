import Header from "@yiwu/components/Header";
import { Link } from "wouter";
import { ChevronRight, Trophy, Globe, Calendar, Award, MapPin, Building2, Info, Target, AlertTriangle, CheckCircle2 } from "lucide-react";

const FACTORS = [
  {
    icon: Globe,
    title: "Presença no Alibaba / Made-in-China",
    weight: 30,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/30",
    why: "Fornecedor com perfil ativo no Alibaba já trabalha com exportação internacional, tem catálogo em inglês, aceita pagamento via T/T ou L/C, conhece processos de container e tem departamento comercial preparado para clientes estrangeiros. Indica que o produto já foi validado para o mercado externo.",
    scoring: [
      { range: "Alibaba.com / Made-in-China / GlobalSources", points: 30 },
      { range: "Apenas Yiwugo (catálogo doméstico chinês)", points: 15 },
      { range: "Sem URL pública", points: 0 },
    ],
  },
  {
    icon: Calendar,
    title: "Anos de Operação no Mercado",
    weight: 25,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    why: "Fornecedores com 14+ anos no mesmo estande do Futian têm produto consolidado, capacidade fabril estável e relacionamento com fábricas próprias. Reduz drasticamente o risco de produto fora de padrão ou atrasos de entrega.",
    scoring: [
      { range: "14+ anos (máximo do mercado)", points: 25 },
      { range: "10-13 anos", points: "18-23" },
      { range: "5-9 anos", points: "9-16" },
      { range: "1-4 anos", points: "2-7" },
      { range: "Sem informação", points: 0 },
    ],
  },
  {
    icon: Award,
    title: "Categoria Premium / Curada",
    weight: 20,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    why: "Os 89 fornecedores marcados como Premium foram selecionados manualmente em pesquisas anteriores como mais relevantes para vidraria, plásticos e térmicas. Esses fornecedores aparecem em listas curadas porque já possuem perfil exportador conhecido e tendem a oferecer melhores condições para compradores internacionais.",
    scoring: [
      { range: "Categoria 'Premium / Alibaba'", points: 20 },
      { range: "Vidraria / Plásticos / Térmicas", points: 0 },
    ],
  },
  {
    icon: MapPin,
    title: "Distrito Estratégico",
    weight: 15,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/30",
    why: "Os 3 NCMs que você importa estão concentrados em distritos específicos. Priorizar visitas a fornecedores nesses distritos maximiza o tempo do funcionário no mercado e evita deslocamentos longos entre edifícios.",
    scoring: [
      { range: "Distrito 2 — Vidraria / Joias (prioridade alta)", points: 15 },
      { range: "Distrito 4 — Utilidades Domésticas / Plásticos", points: 12 },
      { range: "Distrito 5 — Eletrônicos / Garrafas Térmicas", points: 12 },
      { range: "Distritos 1, 3 ou 6", points: 8 },
      { range: "Sem distrito identificado", points: 0 },
    ],
  },
  {
    icon: Building2,
    title: "Andar Conhecido",
    weight: 10,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    border: "border-rose-400/30",
    why: "Ter o andar identificado evita o erro mais comum de quem visita o mercado pela primeira vez: perder 1-2 horas procurando o estande dentro de um prédio com 5 andares. É um ganho prático direto de produtividade no dia da visita.",
    scoring: [
      { range: "Andar preenchido (1º, 2º, 3º, 4º ou 5º)", points: 10 },
      { range: "Sem andar identificado", points: 0 },
    ],
  },
];

const TIERS = [
  {
    name: "Prioridade Alta",
    range: "Score ≥ 55",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    icon: CheckCircle2,
    description: "Visitar primeiro. Combinam exportação Alibaba + 10+ anos de experiência + distrito estratégico. Probabilidade alta de fechamento de pedido com qualidade consistente.",
    count: "~31 fornecedores",
  },
  {
    name: "Prioridade Média",
    range: "Score 35-54",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    icon: Info,
    description: "Visitar se houver tempo restante. Possuem ao menos 2 dos 5 critérios fortes — geralmente Alibaba ou alta experiência, mas faltam outras informações.",
    count: "~257 fornecedores",
  },
  {
    name: "Prioridade Baixa",
    range: "Score < 35",
    color: "text-muted-foreground",
    bg: "bg-muted-foreground/10",
    border: "border-muted-foreground/20",
    icon: AlertTriangle,
    description: "Visitar apenas para categorias específicas ou se não houver alternativa. Faltam informações cruciais ou são fornecedores muito novos sem perfil exportador.",
    count: "~608 fornecedores",
  },
];

export default function Metodologia() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        {/* Hero */}
        <div className="border-b border-border/50 py-10" style={{ background: 'oklch(0.13 0.04 240)' }}>
          <div className="container">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-3">
              <Link href="/"><a className="hover:text-foreground">Home</a></Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/fornecedores"><a className="hover:text-foreground">Fornecedores</a></Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-primary">Método de Avaliação</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/15 border border-primary/30">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-extrabold">Método de Avaliação de Fornecedores</h1>
                <p className="text-muted-foreground mt-2 max-w-3xl leading-relaxed">
                  Sistema de ranking objetivo para priorizar a visita aos 896 fornecedores mapeados no Futian Market.
                  Cada fornecedor recebe um <strong className="text-foreground">score de 0 a 100 pontos</strong> calculado a partir de 5 critérios ponderados,
                  permitindo que o funcionário em campo concentre o tempo nos fornecedores com maior probabilidade de gerar negócio.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contexto */}
        <div className="container py-10">
          <div className="rounded-xl border border-border/50 bg-secondary/30 p-6 mb-10">
            <div className="flex items-start gap-3">
              <Target className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold">Por que precisamos de um ranking?</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Com <strong className="text-foreground">896 fornecedores</strong> mapeados e <strong className="text-foreground">1 funcionário em campo</strong>,
                  visitar todos é fisicamente impossível — mesmo dedicando 15 minutos por estande, seriam mais de <strong className="text-foreground">220 horas</strong> só de visitas.
                  O ranking transforma esses 896 fornecedores em uma fila ordenada por probabilidade de retorno, permitindo começar pelos que combinam
                  <strong className="text-foreground"> perfil exportador validado</strong>, <strong className="text-foreground">experiência comprovada</strong> e <strong className="text-foreground">localização estratégica</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Tiers */}
          <h2 className="text-2xl font-extrabold mb-1">Tiers de Prioridade</h2>
          <p className="text-sm text-muted-foreground mb-6">A pontuação total agrupa cada fornecedor em um dos três níveis de prioridade de visita.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {TIERS.map(tier => {
              const Icon = tier.icon;
              return (
                <div key={tier.name} className={`rounded-xl border ${tier.border} ${tier.bg} p-5`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`w-5 h-5 ${tier.color}`} />
                    <h3 className={`font-bold ${tier.color}`}>{tier.name}</h3>
                  </div>
                  <div className={`text-xs font-mono ${tier.color} mb-3`}>{tier.range} · {tier.count}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
                </div>
              );
            })}
          </div>

          {/* Fatores */}
          <h2 className="text-2xl font-extrabold mb-1">Os 5 Critérios de Pontuação</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Cada fator tem um peso máximo definido. A soma dos 5 fatores resulta no score total (0–100).
          </p>

          <div className="space-y-4 mb-12">
            {FACTORS.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className={`rounded-xl border ${f.border} ${f.bg} overflow-hidden`}>
                  <div className="p-5 flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg ${f.bg} border ${f.border}`}>
                      <Icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold">{f.title}</h3>
                        <div className={`text-2xl font-mono font-bold ${f.color}`}>
                          {f.weight} <span className="text-xs text-muted-foreground">pts máx.</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{f.why}</p>

                      <div className="rounded-lg bg-background/50 border border-border/40 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-secondary/50">
                              <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">Condição</th>
                              <th className="text-right px-4 py-2 text-xs font-mono text-muted-foreground uppercase tracking-wider w-32">Pontos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {f.scoring.map((s, j) => (
                              <tr key={j} className="border-t border-border/20">
                                <td className="px-4 py-2 text-foreground/80">{s.range}</td>
                                <td className={`px-4 py-2 text-right font-mono font-bold ${f.color}`}>+{s.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Como ler */}
          <h2 className="text-2xl font-extrabold mb-1">Como Ler o Score na Lista de Fornecedores</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Em cada card, o badge ao lado do rank mostra a pontuação total e a faixa de prioridade. Logo abaixo, o detalhamento Ali/Exp/Pre/Dis/And permite entender de onde vêm os pontos.
          </p>

          <div className="rounded-xl border border-border/50 bg-secondary/30 p-6 mb-12">
            <div className="font-mono text-xs grid gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-2 py-1 rounded-md bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 font-bold">65 Alta</span>
                <span className="text-muted-foreground">→ Score total: 65 pts (faixa Alta)</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground/80 flex-wrap">
                <span>Ali:<span className="text-foreground/80 ml-1">15</span></span>
                <span>·</span>
                <span>Exp:<span className="text-foreground/80 ml-1">25</span></span>
                <span>·</span>
                <span>Pre:<span className="text-foreground/80 ml-1">0</span></span>
                <span>·</span>
                <span>Dis:<span className="text-foreground/80 ml-1">15</span></span>
                <span>·</span>
                <span>And:<span className="text-foreground/80 ml-1">10</span></span>
                <span className="text-muted-foreground/60 ml-2">→ Detalhamento por fator (Yiwugo + 14 anos + Distrito 2 + andar conhecido)</span>
              </div>
            </div>
          </div>

          {/* Limitações */}
          <h2 className="text-2xl font-extrabold mb-1">Limitações e Próximas Melhorias</h2>
          <p className="text-sm text-muted-foreground mb-6">Transparência sobre o que o score atual ainda não captura.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-5">
              <h3 className="font-bold text-amber-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                O que o score NÃO mede hoje
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1.5 mt-3 list-disc list-inside">
                <li>Histórico real de exportação para o Brasil (dados de LogComex específicos por fornecedor)</li>
                <li>Preço FOB de cada fornecedor (depende de cotação direta no mercado)</li>
                <li>Capacidade produtiva mensal (volume de containers que conseguem fornecer)</li>
                <li>Avaliação qualitativa do funcionário em campo após a visita</li>
                <li>Resposta a contato prévio via WeChat (dados ainda não coletados)</li>
              </ul>
            </div>

            <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-5">
              <h3 className="font-bold text-cyan-400 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Como evoluir o ranking
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1.5 mt-3 list-disc list-inside">
                <li>Adicionar campo "visitado" e nota qualitativa pós-visita (1-5 estrelas)</li>
                <li>Importar dados de LogComex Brasil para identificar quem já exporta para o BR</li>
                <li>Coletar contatos WeChat e marcar fornecedores que respondem em até 24h</li>
                <li>Cruzar com dados Alibaba (Trade Assurance, Verified Manufacturer, Response Rate)</li>
                <li>Recalibrar pesos após primeira viagem (com base no que efetivamente gerou negócio)</li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
            <h3 className="font-bold text-primary text-lg mb-2">Pronto para começar pela lista ordenada</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-2xl mx-auto">
              Volte ao diretório de fornecedores e use o filtro "Prioridade Alta" para ver os 31 fornecedores recomendados
              como ponto de partida da visita ao Futian Market.
            </p>
            <Link href="/fornecedores">
              <a className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                Ver Fornecedores Priorizados
                <ChevronRight className="w-4 h-4" />
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
