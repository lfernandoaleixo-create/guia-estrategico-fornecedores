import Header from "@yiwu/components/Header";
import { Building2, MapPin, Package, TrendingUp, Users, Globe, ChevronRight, ExternalLink, BarChart3, Anchor } from "lucide-react";

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

const products = [
  { cat: "Vidraria", items: "Copos Diamond, Taças Elegance, Potes herméticos, Jarras, Bowls, Saladeiras de vidro", ncm: "7013" },
  { cat: "Organização Doméstica", items: "Kits de banheiro, Lixeiras, Escovas sanitárias, Organizadores de pia, Cestos plásticos", ncm: "3924" },
  { cat: "Garrafas Térmicas", items: "Garrafa LATINHA (inox), Squeeze térmico, Copos térmicos, Garrafas Stanley-style", ncm: "9617" },
  { cat: "Bambu/Sustentável", items: "Tábuas de bambu, Utensílios de cozinha bambu, Escovas de bambu", ncm: "4419/3924" },
];

export default function Flashgoods() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        {/* Hero */}
        <div className="border-b border-border/50 py-10" style={{ background: 'linear-gradient(135deg, oklch(0.17 0.04 240), oklch(0.13 0.04 240))' }}>
          <div className="container">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-4">
              <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-primary">Flashgoods</span>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono mb-3">
                  <Building2 className="w-3 h-3" /> EMPRESA ALVO
                </div>
                <h1 className="text-4xl font-extrabold mb-2">Flashgoods</h1>
                <p className="text-muted-foreground">Comércio de Importação e Exportação Ltda.</p>
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
                  <div className="text-2xl font-extrabold font-mono text-green-400">1</div>
                  <div className="text-xs text-muted-foreground">Fornecedor China</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-10 space-y-10">
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
              {products.map((p) => (
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
        </div>
      </div>
    </div>
  );
}
