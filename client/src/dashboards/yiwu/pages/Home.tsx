import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import Header from "@yiwu/components/Header";
import { ArrowRight, BarChart3, Building2, Globe, MapPin, Package, TrendingUp } from "lucide-react";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/fVKWEm8u2i7QfqAdFtxLtp/hero_yiwu_market-Cef2KRhBtVXGAvZe2d24xv.webp";
const GLASS_IMG = "/manus-storage/glassware_yiwu_9964e484.png";
const PLASTIC_IMG = "/manus-storage/plastic_household_514ed902.png";
const THERMOS_IMG = "/manus-storage/thermos_bottles_97f200e6.png";

function AnimatedCounter({ target, duration = 1500, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
          else setCount(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString('pt-BR')}{suffix}</span>;
}

const stats = [
  { label: "Fornecedores Mapeados", value: 896, suffix: "+", icon: Building2, color: "text-primary" },
  { label: "NCMs Analisados", value: 4, suffix: "", icon: Package, color: "text-accent" },
  { label: "Toneladas Importadas/ano", value: 3500, suffix: "t", icon: TrendingUp, color: "text-green-400" },
  { label: "Meses de Dados LogComex", value: 12, suffix: "", icon: BarChart3, color: "text-purple-400" },
];

const sections = [
  {
    path: "/distribuidor",
    title: "Principal Distribuidor Brasileiro",
    subtitle: "Flashgoods + Yiwu Furui",
    description: "Análise completa do principal importador brasileiro e seu fornecedor exclusivo na China: dados cadastrais, importações, contatos e estratégia.",
    icon: Building2,
    color: "from-blue-600/20 to-amber-800/10",
    border: "border-blue-500/30",
    badge: "Empresa Alvo",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    path: "/fornecedores",
    title: "Diretório de Fornecedores",
    subtitle: "896+ fornecedores mapeados",
    description: "Base de dados completa com fornecedores de vidraria, plásticos domésticos e garrafas térmicas no Mercado de Yiwu.",
    icon: Package,
    color: "from-cyan-600/20 to-cyan-800/10",
    border: "border-cyan-500/30",
    badge: "896+ Fornecedores",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
  {
    path: "/mapa",
    title: "Mapa do Mercado",
    subtitle: "Futian Market — 5 Distritos",
    description: "Guia visual dos 5 distritos do Mercado Internacional de Yiwu com localização exata de cada categoria de produto.",
    icon: MapPin,
    color: "from-green-600/20 to-green-800/10",
    border: "border-green-500/30",
    badge: "75.000+ Estandes",
    badgeColor: "bg-green-500/20 text-green-300 border-green-500/30",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt="Mercado Internacional de Yiwu"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, oklch(0.13 0.04 240 / 0.95) 0%, oklch(0.13 0.04 240 / 0.75) 60%, oklch(0.13 0.04 240 / 0.4) 100%)'
          }} />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top, oklch(0.13 0.04 240) 0%, transparent 40%)'
          }} />
        </div>

        {/* Content */}
        <div className="container relative z-10 py-20">
          <div className="max-w-3xl">
            {/* Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono text-primary tracking-widest uppercase">Inteligência Comercial — China</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-none mb-6 tracking-tight">
              <span className="text-white">Mercado de</span>
              <br />
              <span className="gradient-text-amber">Yiwu</span>
              <span className="text-white"> em</span>
              <br />
              <span className="text-white">suas mãos</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
              Guia estratégico completo com <strong className="text-foreground">896+ fornecedores mapeados</strong>, análise da Flashgoods, dados de importação via LogComex e roteiro prático para sua viagem à China.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/fornecedores">
                <button className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-[0.97]"
                  style={{ background: 'linear-gradient(135deg, oklch(0.75 0.17 75), oklch(0.65 0.18 55))' }}>
                  <Package className="w-4 h-4" />
                  Ver Fornecedores
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/mapa">
                <button className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border border-border hover:border-accent/50 hover:bg-accent/10 transition-all duration-200 active:scale-[0.97]">
                  <MapPin className="w-4 h-4 text-accent" />
                  Ver Mapa do Mercado
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border/50 py-8" style={{ background: 'oklch(0.17 0.04 240)' }}>
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-secondary flex-shrink-0">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <div className={`text-2xl font-extrabold font-mono ${stat.color}`}>
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Visual Cards */}
      <section className="py-12">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Categorias de Produtos</h2>
            <p className="text-muted-foreground">Os 3 NCMs principais importados pela Flashgoods da China</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { img: GLASS_IMG, title: "Vidraria", ncm: "NCM 7013", desc: "Copos, taças, potes herméticos, jarras e bowls de vidro", count: "262 fornecedores", color: "text-cyan-300", border: "border-cyan-500/30" },
              { img: PLASTIC_IMG, title: "Plásticos Domésticos", ncm: "NCM 3924", desc: "Kits de banheiro, organizadores, lixeiras e artigos de higiene", count: "308 fornecedores", color: "text-green-300", border: "border-green-500/30" },
              { img: THERMOS_IMG, title: "Garrafas Térmicas", ncm: "NCM 9617", desc: "Garrafas inox, squeezes, copos térmicos e vacuum bottles", count: "237 fornecedores", color: "text-amber-300", border: "border-amber-500/30" },
            ].map((cat) => (
              <Link key={cat.title} href="/fornecedores">
                <div className={`rounded-xl overflow-hidden border ${cat.border} supplier-card cursor-pointer`}>
                  <div className="relative h-48 overflow-hidden">
                    <img src={cat.img} alt={cat.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, oklch(0.13 0.04 240) 0%, transparent 60%)' }} />
                    <div className="absolute bottom-3 left-3">
                      <span className={`text-xs font-mono px-2 py-1 rounded-full border ${cat.border} bg-black/40 ${cat.color}`}>{cat.ncm}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold mb-1">{cat.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{cat.desc}</p>
                    <div className={`text-xs font-mono ${cat.color}`}>{cat.count} mapeados</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Sections Grid */}
      <section className="py-16">
        <div className="container">
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-2">O que você encontra aqui</h2>
            <p className="text-muted-foreground">Navegue pelas seções para acessar toda a inteligência comercial coletada.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section) => (
              <Link key={section.path} href={section.path}>
                <div className={`supplier-card rounded-xl p-6 bg-gradient-to-br ${section.color} border ${section.border} cursor-pointer h-full`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <section.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <span className={`text-xs font-mono px-2 py-1 rounded-full border ${section.badgeColor}`}>
                      {section.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{section.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{section.subtitle}</p>
                  <p className="text-sm text-foreground/70 leading-relaxed">{section.description}</p>
                  <div className="flex items-center gap-1 mt-4 text-xs font-medium text-accent">
                    Acessar <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">YIWU INTEL</span>
              <span className="text-xs text-muted-foreground">— Inteligência Comercial China-Brasil</span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Dados coletados em Maio/2026 · LogComex + Yiwugo + Alibaba
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
