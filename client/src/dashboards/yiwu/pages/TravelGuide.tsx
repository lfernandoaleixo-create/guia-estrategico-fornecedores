import Header from "@yiwu/components/Header";
import { ChevronRight, Calendar, DollarSign, MessageSquare, Package, Shield, Zap, CheckCircle, AlertTriangle, Phone } from "lucide-react";

const itinerary = [
  {
    day: "Dia 1",
    title: "Chegada e Orientação",
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    tasks: [
      "Chegada em Yiwu (trem de Xangai ou Hangzhou)",
      "Check-in no hotel próximo ao mercado (recomendado: Marriott Yiwu ou Wanda Realm)",
      "Passeio de reconhecimento pelo Distrito 2 (sem comprar ainda)",
      "Jantar e reunião de planejamento — revise a lista de fornecedores",
      "Instale WeChat e Didi no celular se ainda não tiver",
    ],
  },
  {
    day: "Dia 2",
    title: "Distrito 2 — Vidraria (Manhã)",
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    tasks: [
      "Chegue ao mercado às 09h00 — portões do Distrito 2",
      "2º Andar: Visite fornecedores de copos e taças (estandes 20xxx)",
      "Fotografe e anote TODOS os preços — não negocie ainda",
      "Colete catálogos físicos e cartões de visita",
      "Almoço no food court do mercado (andar térreo)",
      "3º Andar: Vidraria premium e garrafas térmicas",
      "Identifique os 3-5 melhores fornecedores para retornar",
    ],
  },
  {
    day: "Dia 3",
    title: "Distrito 2 — Negociação e Amostras",
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    tasks: [
      "Retorne aos fornecedores selecionados no Dia 2",
      "Apresente-se como importador brasileiro com volume mensal",
      "Negocie preços: mostre cotações de concorrentes",
      "Solicite amostras dos produtos de interesse",
      "Discuta MOQ, prazo de produção e embalagem personalizada",
      "Tire fotos detalhadas de produtos, embalagens e certificados",
    ],
  },
  {
    day: "Dia 4",
    title: "Distrito 4 — Plásticos e Organização",
    color: "text-green-400",
    border: "border-green-500/30",
    bg: "bg-green-500/5",
    tasks: [
      "Foco total no Distrito 4 — portões 66-85",
      "2º Andar: Kits de banheiro, organizadores, lixeiras",
      "Busque especificamente fornecedores da marca ECOCO (estande 20728-1)",
      "Compare preços de produtos similares entre 5+ fornecedores",
      "Tarde: Visite Distrito 4 — artigos de bambu e ecológicos",
      "Consolide lista de pedidos de amostras",
    ],
  },
  {
    day: "Dia 5",
    title: "Visita à Yiwu Furui + Fechamento",
    color: "text-primary",
    border: "border-primary/30",
    bg: "bg-primary/5",
    tasks: [
      "Contate Ms. Luna Zhang (WeChat: +86 186 3892 6245) para agendar visita",
      "Visite o escritório/showroom da Yiwu Furui",
      "Entenda o modelo de operação deles (trading vs. fábrica própria)",
      "Solicite catálogo completo e condições de pagamento",
      "Tarde: Revisão geral — compare todos os fornecedores visitados",
      "Defina top 10 fornecedores para follow-up",
    ],
  },
  {
    day: "Dia 6",
    title: "Visitas a Fábricas (Opcional)",
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    tasks: [
      "Visite fábricas de vidraria em Anhui (3-4h de Yiwu de carro)",
      "Alternativa: Fábricas de plásticos em Taizhou (2h de Yiwu)",
      "Comprar direto da fábrica elimina a margem da trading (10-30% mais barato)",
      "Solicite auditoria de fábrica se volumes forem grandes",
      "Retorno a Yiwu para jantar de encerramento com fornecedores",
    ],
  },
  {
    day: "Dia 7",
    title: "Partida e Follow-up",
    color: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    tasks: [
      "Manhã: Últimas compras de amostras e materiais",
      "Envie pedidos de amostras por WeChat para todos os fornecedores selecionados",
      "Confirme endereços para envio das amostras ao Brasil",
      "Trem para Xangai ou Hangzhou para voo de retorno",
      "No avião: organize fotos, contatos e notas de preço",
    ],
  },
];

const negotiationTips = [
  {
    title: "Frase de Abertura",
    content: "\"I'm an importer from Brazil. We import containers monthly. What's your best FOB price for 1,000 pieces?\"",
    type: "success",
  },
  {
    title: "Nunca Revele seu Orçamento",
    content: "Sempre pergunte o preço primeiro. Nunca diga quanto você está disposto a pagar antes de ouvir a oferta inicial.",
    type: "warning",
  },
  {
    title: "Mostre Concorrência",
    content: "\"Your competitor at booth [X] offered me USD [Y]. Can you match or beat that price?\" — Isso funciona muito bem em Yiwu.",
    type: "success",
  },
  {
    title: "Peça Desconto por Volume",
    content: "\"If I order 5,000 pieces, what's the price? And for 10,000?\" — Sempre negocie em escala, mesmo que o pedido inicial seja menor.",
    type: "success",
  },
  {
    title: "Cuidado com Qualidade",
    content: "Amostras podem ser de qualidade superior ao produto final. Especifique claramente o padrão de qualidade no contrato.",
    type: "warning",
  },
  {
    title: "Pagamento",
    content: "Padrão: 30% depósito + 70% antes do embarque. Negocie 30/70 ou 50/50. Nunca pague 100% antecipado para fornecedor novo.",
    type: "warning",
  },
];

const essentials = [
  { item: "Passaporte válido + visto chinês", category: "Documentos" },
  { item: "Cartão de visita em inglês e chinês", category: "Documentos" },
  { item: "WeChat instalado e configurado", category: "Apps" },
  { item: "Didi (Uber chinês) instalado", category: "Apps" },
  { item: "Google Translate com pacote chinês offline", category: "Apps" },
  { item: "VPN configurada (para acessar Google/WhatsApp)", category: "Apps" },
  { item: "Mala vazia para amostras", category: "Bagagem" },
  { item: "Câmera ou celular com boa câmera", category: "Equipamentos" },
  { item: "Adaptador de tomada (Tipo A/I)", category: "Equipamentos" },
  { item: "Cartão de crédito internacional (Visa/Master)", category: "Financeiro" },
  { item: "Yuan chinês em espécie (CNY 2.000–5.000)", category: "Financeiro" },
  { item: "Lista de fornecedores deste guia impressa", category: "Planejamento" },
];

const moqGuide = [
  { product: "Copos de vidro simples", moq: "500–1.000 pcs", price: "USD 0,30–0,80/pc", notes: "Preço cai 30% acima de 5.000 pcs" },
  { product: "Taças de vinho", moq: "300–500 pcs", price: "USD 0,50–1,50/pc", notes: "MOQ menor para modelos padrão" },
  { product: "Potes herméticos vidro", moq: "200–500 sets", price: "USD 1,00–3,00/set", notes: "Sets de 3-5 peças são mais populares" },
  { product: "Kit banheiro plástico", moq: "200–500 sets", price: "USD 2,00–6,00/set", notes: "Personalização de cor a partir de 500 pcs" },
  { product: "Garrafa térmica inox", moq: "300–500 pcs", price: "USD 3,00–8,00/pc", notes: "Logo personalizado a partir de 500 pcs" },
  { product: "Organizadores plástico", moq: "500–1.000 pcs", price: "USD 0,80–2,50/pc", notes: "Ampla variedade de modelos disponíveis" },
];

export default function TravelGuide() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        {/* Header */}
        <div className="border-b border-border/50 py-8" style={{ background: 'linear-gradient(135deg, oklch(0.17 0.04 240), oklch(0.13 0.04 240))' }}>
          <div className="container">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-4">
              <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-primary">Guia de Visita</span>
            </div>
            <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-2">
              <Zap className="w-7 h-7 text-primary" />
              Guia Estratégico de Visita
            </h1>
            <p className="text-muted-foreground">Roteiro de 7 dias para maximizar sua missão comercial em Yiwu</p>
          </div>
        </div>

        <div className="container py-10 space-y-12">
          {/* Itinerary */}
          <section>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Roteiro Dia a Dia
            </h2>
            <div className="space-y-4">
              {itinerary.map((day) => (
                <div key={day.day} className={`rounded-xl border p-5 ${day.border} ${day.bg}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`font-mono font-bold text-sm px-3 py-1 rounded-full border ${day.border} ${day.color}`}
                      style={{ background: 'oklch(0.13 0.04 240 / 0.5)' }}>
                      {day.day}
                    </div>
                    <h3 className={`font-bold ${day.color}`}>{day.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {day.tasks.map((task, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                        <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${day.color} opacity-60`} />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* MOQ Guide */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" /> Guia de MOQ e Preços Típicos
            </h2>
            <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'oklch(0.17 0.04 240)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Produto</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">MOQ Típico</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Faixa de Preço FOB</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moqGuide.map((row, i) => (
                      <tr key={row.product} className={`border-b border-border/30 hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                        <td className="px-4 py-3 font-medium">{row.product}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-400">{row.moq}</td>
                        <td className="px-4 py-3 text-right font-mono text-primary">{row.price}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Negotiation Tips */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" /> Dicas de Negociação
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {negotiationTips.map((tip) => (
                <div key={tip.title} className={`rounded-xl border p-5 ${
                  tip.type === 'success' ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'
                }`}>
                  <div className="flex items-start gap-3">
                    {tip.type === 'success'
                      ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      : <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    }
                    <div>
                      <h3 className={`font-semibold text-sm mb-1 ${tip.type === 'success' ? 'text-green-300' : 'text-amber-300'}`}>
                        {tip.title}
                      </h3>
                      <p className="text-sm text-foreground/80 leading-relaxed">{tip.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Essentials Checklist */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" /> Checklist de Viagem
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {["Documentos", "Apps", "Bagagem", "Equipamentos", "Financeiro", "Planejamento"].map((cat) => (
                <div key={cat} className="rounded-xl border border-border/50 p-4" style={{ background: 'oklch(0.17 0.04 240)' }}>
                  <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
                  <ul className="space-y-2">
                    {essentials.filter(e => e.category === cat).map((item) => (
                      <li key={item.item} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{item.item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Key Contact */}
          <section>
            <div className="rounded-xl border border-primary/30 p-6 bg-primary/5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Contato Principal em Yiwu</h3>
                  <p className="text-muted-foreground text-sm mb-3">Fornecedor exclusivo da Flashgoods — agende visita antes de viajar</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Empresa: </span><span className="font-semibold">Yiwu Furui E-Commerce Co., Ltd.</span></div>
                    <div><span className="text-muted-foreground">Contato: </span><span className="font-semibold">Ms. Luna Zhang</span></div>
                    <div><span className="text-muted-foreground">WhatsApp/WeChat: </span><span className="font-mono text-primary">+86 186 3892 6245</span></div>
                    <div><span className="text-muted-foreground">Alibaba: </span><span className="text-accent">ywfurui.en.alibaba.com</span></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
