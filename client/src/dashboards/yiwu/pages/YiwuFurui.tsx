import Header from "@yiwu/components/Header";
import { Globe, MapPin, Phone, Mail, Package, TrendingUp, ChevronRight, ExternalLink, Star, Shield, Users } from "lucide-react";

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

const products = [
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

export default function YiwuFurui() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        {/* Hero */}
        <div className="border-b border-border/50 py-10" style={{ background: 'linear-gradient(135deg, oklch(0.19 0.05 55 / 0.3), oklch(0.13 0.04 240))' }}>
          <div className="container">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-4">
              <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-primary">Yiwu Furui</span>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono mb-3">
                  <Star className="w-3 h-3" /> FORNECEDOR PRINCIPAL DA FLASHGOODS
                </div>
                <h1 className="text-4xl font-extrabold mb-2">Yiwu Furui E-Commerce Co., Ltd.</h1>
                <p className="text-muted-foreground">义乌市富瑞电子商务有限公司 — Yiwu, Zhejiang, China</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="text-center">
                  <div className="text-2xl font-extrabold font-mono text-primary">100%</div>
                  <div className="text-xs text-muted-foreground">Exclusivo Brasil</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold font-mono text-amber-400">4 NCMs</div>
                  <div className="text-xs text-muted-foreground">Exportados ao BR</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold font-mono text-green-400">USD 2,3M</div>
                  <div className="text-xs text-muted-foreground">FOB/ano para BR</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-10 space-y-10">
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
                {products.map((p) => (
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
        </div>
      </div>
    </div>
  );
}
