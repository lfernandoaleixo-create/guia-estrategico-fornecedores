import { useState } from "react";
import Header from "@yiwu/components/Header";
import { Building2, MapPin, Package, TrendingUp, Users, Globe, ChevronRight, ExternalLink, BarChart3, Anchor, Phone, Star, Shield, Mail } from "lucide-react";

// ─── Dados Flashgoods ────────────────────────────────────────────────────────
const importData = [
  { ncm: "70134900", desc: "Outros objetos de vidro para mesa/cozinha", kg: "2.488.684", fob: "USD 1.269.229", priceKg: "USD 0,51", fornecedor: "Yiwu Furui China (99%)", periodo: "Jun/25–Mai/26" },
  { ncm: "70133700", desc: "Outros copos de vidro (exceto vitrocerâmica)", kg: "687.432", fob: "USD 312.180", priceKg: "USD 0,45", fornecedor: "Yiwu Furui China (97%)", periodo: "Jun/25–Mai/26" },
  { ncm: "39249000", desc: "Artigos plásticos de uso doméstico/higiene", kg: "309.579", fob: "USD 447.128", priceKg: "USD 1,44", fornecedor: "Yiwu Furui China (100%)", periodo: "Jun/25–Mai/26" },
  { ncm: "96170010", desc: "Garrafas térmicas com isolamento a vácuo", kg: "89.234", fob: "USD 312.319", priceKg: "USD 3,50", fornecedor: "Yiwu Furui China (98%)", periodo: "Jun/25–Mai/26" },
];

const timeline = [
  { year: "2019", event: "Fundação da Flashgoods Comércio de Importação e Exportação Ltda.", detail: "CNPJ: 40.165.831/0001-38 — Capital social inicial" },
  { year: "2021", event: "Abertura da filial em Garuva/SC", detail: "CNPJ: 40.165.831/0003-08 — Polo logístico estratégico próximo ao Porto de Itajaí" },
  { year: "2023", event: "Consolidação como importador de utilidades domésticas", detail: "Parceria exclusiva com Yiwu Furui China estabelecida" },
  { year: "2025", event: "Expansão do portfólio — linha de garrafas térmicas", detail: "NCM 96170010 adicionado ao mix de importação" },
  { year: "2026", event: "Volume anual ultrapassa 3.500 toneladas importadas", detail: "Mais de USD 2,3 milhões em FOB nos 4 NCMs principais" },
];

const flashProducts = [
  { cat: "Vidraria", items: "Copos Diamond, Taças Elegance, Potes herméticos, Jarras, Bowls, Saladeiras de vidro", ncm: "7013" },
  { cat: "Organização Doméstica", items: "Kits de banheiro, Lixeiras, Escovas sanitárias, Organizadores de pia, Cestos plásticos", ncm: "3924" },
  { cat: "Garrafas Térmicas", items: "Garrafa LATINHA (inox), Squeeze térmico, Copos térmicos, Garrafas Stanley-style", ncm: "9617" },
  { cat: "Bambu/Sustentável", items: "Tábuas de bambu, Utensílios de cozinha bambu, Escovas de bambu", ncm: "4419/3924" },
];

// ─── Dados Yiwu Furui ────────────────────────────────────────────────────────
const contacts = [
  { label: "Responsável", value: "Ms. Luna Zhang", icon: Users },
  { label: "WhatsApp/WeChat", value: "+86 186 3892 6245", icon: Phone },
  { label: "Alibaba", value: "ywfurui.en.alibaba.com", icon: Globe, link: "https://ywfurui.en.alibaba.com" },
  { label: "Site Oficial", value: "www.ywfurui.com", icon: Globe, link: "http://www.ywfurui.com" },
  { label: "Localização", value: "Yiwu, Zhejiang Province, China", icon: MapPin },
  { label: "Tipo", value: "Trading Company / E-Commerce Firm", icon: Shield },
];

const exportData = [
  { ncm: "70134900", desc: "Vidraria para mesa/cozinha", share: "99%", kg: "2.463.797", fob: "USD 1.256.537" },
  { ncm: "70133700", desc: "Copos de vidro", share: "97%", kg: "666.809", fob: "USD 302.815" },
  { ncm: "39249000", desc: "Artigos plásticos domésticos", share: "100%", kg: "309.579", fob: "USD 447.128" },
  { ncm: "96170010", desc: "Garrafas térmicas", share: "98%", kg: "87.449", fob: "USD 306.071" },
];

const furaiProducts = [
  "Copos de vidro (Diamond, Elegance, Classic)",
  "Taças de vinho e champagne",
  "Potes herméticos de vidro",
  "Jarras e bowls de vidro",
  "Kits de banheiro plástico",
  "Organizadores domésticos",
  "Lixeiras e cestos",
  "Garrafas térmicas inox (LATINHA)",
  "Squeezes e copos térmicos",
  "Utensílios de cozinha",
  "Artigos de bambu",
  "Escovas e acessórios de limpeza",
];

export default function PrincipalDistribuidor() {
  const [tab, setTab] = useState<"flashgoods" | "yiwu-furui">("flashgoods");

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        {/* Hero */}
        <div className="border-b border-border/50 py-10" style={{ background: 'linear-gradient(135deg, oklch(0.17 0.04 240), oklch(0.13 0.04 240))' }}>
          <div className="container">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-4">
              <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-primary">Principal Distribuidor Brasileiro</span>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono mb-3">
                  <Building2 className="w-3 h-3" /> DISTRIBUIDOR ALVO
                </div>
                <h1 className="text-4xl font-extrabold mb-2">Principal Distribuidor Brasileiro</h1>
                <p className="text-muted-foreground">Flashgoods Importação &amp; Yiwu Furui — Parceria exclusiva China–Brasil</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="text-center">
                  <div className="text-2xl font-extrabold font-mono text-primary">3.574 t</div>
                  <div className="text-xs text-muted-foreground">Importado/ano</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold font-mono text-accent">USD 2,3M</div>
                  <div className="text-xs text-muted-foreground">FOB anual</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold font-mono text-amber-400">100%</div>
                  <div className="text-xs text-muted-foreground">Exclusivo BR</div>
                </div>
              </div>
            </div>

            {/* Abas */}
            <div className="flex gap-2 mt-8">
              <button
                onClick={() => setTab("flashgoods")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  tab === "flashgoods"
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                🇧🇷 Flashgoods — Importador BR
              </button>
              <button
                onClick={() => setTab("yiwu-furui")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  tab === "yiwu-furui"
                    ? "bg-amber-500 text-black shadow"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                🇨🇳 Yiwu Furui — Fornecedor China
              </button>
            </div>
          </div>
        </div>

        <div className="container py-10 space-y-10">

          {/* ─── ABA FLASHGOODS ─────────────────────────────────────────── */}
          {tab === "flashgoods" && (
            <>
              {/* Dados Cadastrais */}
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" /> Dados Cadastrais
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border p-5 space-y-3" style={{ background: 'oklch(0.17 0.04 240)' }}>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Matriz — São Paulo/SP</h3>
                    {[
                      ["CNPJ", "40.165.831/0001-38"],
                      ["Razão Social", "Flashgoods Comércio de Importação e Exportação Ltda."],
                      ["Endereço", "Rua dos Três Irmãos, 310 — Conj. 402, Barra Funda"],
                      ["CEP", "01153-000 — São Paulo/SP"],
                      ["Situação", "Ativa"],
                      ["Porte", "Pequena Empresa"],
                      ["Natureza Jurídica", "Sociedade Limitada"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-3 text-sm">
                        <span className="text-muted-foreground w-28 flex-shrink-0">{k}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border p-5 space-y-3" style={{ background: 'oklch(0.17 0.04 240)' }}>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Filial — Garuva/SC (Polo Logístico)</h3>
                    {[
                      ["CNPJ Filial", "40.165.831/0003-08"],
                      ["Cidade", "Garuva — Santa Catarina"],
                      ["Estratégia", "Polo logístico próximo ao Porto de Itajaí"],
                      ["Distância Porto", "~60 km do Porto de Itajaí"],
                      ["Vantagem", "Desembaraço aduaneiro mais ágil e barato"],
                      ["Porto Principal", "Porto de Itajaí (SC)"],
                      ["Rota", "China → Porto de Itajaí → Garuva → SP"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-3 text-sm">
                        <span className="text-muted-foreground w-28 flex-shrink-0">{k}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Dados de Importação */}
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Anchor className="w-5 h-5 text-accent" /> Dados de Importação — Últimos 12 Meses (LogComex)
                </h2>
                <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'oklch(0.17 0.04 240)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">NCM</th>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Descrição</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Peso Líq.</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">FOB Total</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Preço/kg</th>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Fornecedor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.map((row, i) => (
                          <tr key={row.ncm} className={`border-b border-border/30 hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs px-2 py-1 rounded badge-vidraria">{row.ncm}</span>
                            </td>
                            <td className="px-4 py-3 text-foreground/80 max-w-[200px]">{row.desc}</td>
                            <td className="px-4 py-3 text-right font-mono text-sm font-medium">{row.kg}</td>
                            <td className="px-4 py-3 text-right font-mono text-sm font-medium text-primary">{row.fob}</td>
                            <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{row.priceKg}</td>
                            <td className="px-4 py-3 text-sm text-accent">{row.fornecedor}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border">
                          <td colSpan={2} className="px-4 py-3 font-bold text-sm">TOTAL</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-primary">3.574.929 kg</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-primary">USD 2.340.856</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </section>

              {/* Linha do Tempo */}
              <section>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" /> Linha do Tempo
                </h2>
                <div className="relative">
                  <div className="absolute left-[60px] top-0 bottom-0 w-px bg-border/50" />
                  <div className="space-y-6">
                    {timeline.map((item) => (
                      <div key={item.year} className="flex gap-6 items-start">
                        <div className="w-[60px] flex-shrink-0 text-right">
                          <span className="font-mono text-sm font-bold text-primary">{item.year}</span>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0 mt-1 relative z-10" />
                        <div className="rounded-lg border border-border/50 p-4 flex-1" style={{ background: 'oklch(0.17 0.04 240)' }}>
                          <p className="font-semibold text-sm mb-1">{item.event}</p>
                          <p className="text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Portfólio de Produtos */}
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-400" /> Portfólio de Produtos
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {flashProducts.map((p) => (
                    <div key={p.cat} className="rounded-xl border border-border/50 p-5" style={{ background: 'oklch(0.17 0.04 240)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{p.cat}</h3>
                        <span className="font-mono text-xs px-2 py-1 rounded badge-vidraria">NCM {p.ncm}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{p.items}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Modelo de Importação */}
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" /> Modelo de Importação
                </h2>
                <div className="rounded-xl border border-border/50 p-6" style={{ background: 'oklch(0.17 0.04 240)' }}>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {[
                      { label: "Yiwu, China", sub: "Origem", color: "text-red-400" },
                      { label: "→", sub: "", color: "text-muted-foreground" },
                      { label: "Yiwu Furui", sub: "Trading/Consolidação", color: "text-amber-400" },
                      { label: "→", sub: "", color: "text-muted-foreground" },
                      { label: "Porto de Ningbo/Xangai", sub: "Embarque", color: "text-blue-400" },
                      { label: "→", sub: "", color: "text-muted-foreground" },
                      { label: "Porto de Itajaí/SC", sub: "Chegada", color: "text-green-400" },
                      { label: "→", sub: "", color: "text-muted-foreground" },
                      { label: "Garuva/SC", sub: "Desembaraço", color: "text-purple-400" },
                      { label: "→", sub: "", color: "text-muted-foreground" },
                      { label: "São Paulo/SP", sub: "Distribuição", color: "text-cyan-400" },
                    ].map((step, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <span className={`font-semibold ${step.color}`}>{step.label}</span>
                        {step.sub && <span className="text-xs text-muted-foreground">{step.sub}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Incoterm praticado:</span>
                      <span className="ml-2 font-mono font-bold text-primary">FOB</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Modal:</span>
                      <span className="ml-2 font-medium">Marítimo (FCL/LCL)</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Frequência estimada:</span>
                      <span className="ml-2 font-medium">Mensal / Bimestral</span>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ─── ABA YIWU FURUI ─────────────────────────────────────────── */}
          {tab === "yiwu-furui" && (
            <>
              {/* Alerta Estratégico */}
              <div className="rounded-xl border border-amber-500/30 p-5 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-300 mb-1">Descoberta Estratégica Crítica</h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      Nos últimos 12 meses, a Yiwu Furui exportou para o Brasil <strong>exclusivamente para a Flashgoods</strong> em todos os 4 NCMs analisados. Nenhuma outra empresa brasileira recebeu mercadoria deles. Isso sugere que a Yiwu Furui pode ser, na prática, o <strong>escritório de compras próprio da Flashgoods na China</strong> — uma prática comum entre grandes importadores que registram uma trading local em Yiwu para consolidar cargas e negociar diretamente com fábricas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contatos */}
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" /> Contatos e Presença Digital
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contacts.map((c) => (
                    <div key={c.label} className="rounded-xl border border-border/50 p-4 flex items-center gap-3" style={{ background: 'oklch(0.17 0.04 240)' }}>
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <c.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">{c.label}</div>
                        {c.link ? (
                          <a href={c.link} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-medium text-accent hover:text-accent/80 flex items-center gap-1 truncate">
                            {c.value} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <div className="text-sm font-medium truncate">{c.value}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Exportações para o Brasil */}
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" /> Exportações para o Brasil — 12 Meses
                </h2>
                <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'oklch(0.17 0.04 240)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">NCM</th>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Produto</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Share BR</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Peso (kg)</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">FOB</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exportData.map((row, i) => (
                          <tr key={row.ncm} className={`border-b border-border/30 hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs px-2 py-1 rounded badge-vidraria">{row.ncm}</span>
                            </td>
                            <td className="px-4 py-3 text-foreground/80">{row.desc}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-mono font-bold text-amber-400">{row.share}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-sm">{row.kg}</td>
                            <td className="px-4 py-3 text-right font-mono text-sm text-primary">{row.fob}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Produtos */}
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-cyan-400" /> Catálogo de Produtos
                </h2>
                <div className="rounded-xl border border-border/50 p-6" style={{ background: 'oklch(0.17 0.04 240)' }}>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {furaiProducts.map((p) => (
                      <div key={p} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        <span className="text-foreground/80">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Como Abordar */}
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-400" /> Como Abordar na Visita
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      title: "Antes da Viagem",
                      items: [
                        "Adicione Ms. Luna Zhang no WeChat: +86 186 3892 6245",
                        "Acesse o perfil no Alibaba e salve os produtos de interesse",
                        "Solicite catálogo digital e lista de preços FOB",
                        "Pergunte sobre MOQ mínimo por produto",
                      ],
                      color: "border-blue-500/30 bg-blue-500/5"
                    },
                    {
                      title: "Durante a Visita em Yiwu",
                      items: [
                        "Confirme o endereço exato do escritório/showroom",
                        "Pergunte se são trading ou se têm fábrica própria",
                        "Solicite amostras dos produtos de maior interesse",
                        "Negocie preços FOB Ningbo ou FOB Xangai",
                      ],
                      color: "border-amber-500/30 bg-amber-500/5"
                    },
                  ].map((box) => (
                    <div key={box.title} className={`rounded-xl border p-5 ${box.color}`}>
                      <h3 className="font-semibold mb-3">{box.title}</h3>
                      <ul className="space-y-2">
                        {box.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                            <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
