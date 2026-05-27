import { Link } from "wouter";
import { ArrowRight, Compass, Fish, MapPin, PawPrint, Sparkles, TrendingUp } from "lucide-react";

const dashboards = [
  {
    href: "/aquario",
    eyebrow: "DASHBOARD 01",
    title: "Fornecedores Aquários & Terrários",
    subtitle: "Mercado Oriental Premium",
    description:
      "Diretório editorial de fábricas chinesas para aquários, terrários e equipamentos de aquariofilia. Filtros por categoria, mapa interativo, anotações e diário de negociação.",
    accent: "oklch(0.72 0.18 28)",
    accentSoft: "oklch(0.85 0.14 30)",
    accentBg: "oklch(0.72 0.18 28 / 0.12)",
    accentBorder: "oklch(0.72 0.18 28 / 0.5)",
    icon: Fish,
    chips: ["Aquários", "Terrários", "Equipamentos", "Mercado Atacado"],
    badge: "中国",
  },
  {
    href: "/tapete",
    eyebrow: "DASHBOARD 02",
    title: "Tapete Higiênico Pet · Importação",
    subtitle: "Corporate Intelligence — Grupo Fox",
    description:
      "Inteligência completa sobre a importação brasileira de tapetes higiênicos: exportadores chineses, importadores nacionais, cruzamento, comparador, NCM e tributação.",
    accent: "oklch(0.74 0.16 220)",
    accentSoft: "oklch(0.86 0.12 220)",
    accentBg: "oklch(0.74 0.16 220 / 0.12)",
    accentBorder: "oklch(0.74 0.16 220 / 0.5)",
    icon: PawPrint,
    chips: ["Exportadores", "Importadores", "NCM 4818", "Diário"],
    badge: "BR×CN",
  },
  {
    href: "/yiwu",
    eyebrow: "DASHBOARD 03",
    title: "Yiwu Intel · Mercado Internacional",
    subtitle: "Guia de Expedição China",
    description:
      "896+ fornecedores mapeados no Mercado Internacional de Yiwu. Análise da Flashgoods, dados LogComex, mapa dos 5 distritos e roteiro de viagem.",
    accent: "oklch(0.82 0.16 90)",
    accentSoft: "oklch(0.90 0.13 92)",
    accentBg: "oklch(0.82 0.16 90 / 0.14)",
    accentBorder: "oklch(0.82 0.16 90 / 0.5)",
    icon: MapPin,
    chips: ["896+ fornecedores", "5 Distritos", "LogComex", "Travel Guide"],
    badge: "义乌",
  },
];

const stats = [
  { label: "Dashboards integrados", value: "3" },
  { label: "Fornecedores mapeados", value: "1.200+" },
  { label: "Fontes de dados", value: "LogComex · Alibaba · Yiwugo" },
  { label: "Atualizado em", value: "Maio / 2026" },
];

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: "radial-gradient(ellipse at top left, oklch(0.18 0.05 28 / 0.45), transparent 55%), radial-gradient(ellipse at bottom right, oklch(0.18 0.06 240 / 0.55), transparent 55%), oklch(0.06 0.015 250)"
    }}>
      <div className="capa-grain" />

      {/* HEADER */}
      <header className="relative z-10 border-b" style={{ borderColor: "oklch(0.22 0.03 250)" }}>
        <div className="container flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
              style={{
                background: "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.55 0.18 25))",
                color: "oklch(0.10 0.02 250)",
                fontFamily: "'Fraunces', serif",
                letterSpacing: "-0.02em",
                fontSize: "1.05rem",
                boxShadow: "0 0 0 1px oklch(0.78 0.16 75 / 0.4), 0 8px 24px oklch(0.78 0.16 75 / 0.18)",
              }}
            >
              G
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="text-sm font-semibold"
                style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em", color: "oklch(0.97 0.01 80)" }}
              >
                Guia Estratégico
              </span>
              <span
                className="text-[10px] mt-1 tracking-[0.25em] uppercase"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "oklch(0.62 0.02 80)" }}
              >
                de Fornecedores
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs"
               style={{ color: "oklch(0.65 0.02 80)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: "oklch(0.78 0.16 75)" }} />
            <span>3 DASHBOARDS · ATUALIZADO MAI/2026</span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 container pt-16 md:pt-24 pb-12">
        <div className="max-w-4xl">
          <div className="capa-anim inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-8"
               style={{
                 borderColor: "oklch(0.78 0.16 75 / 0.3)",
                 background: "oklch(0.78 0.16 75 / 0.07)",
               }}>
            <Compass className="w-3.5 h-3.5" style={{ color: "oklch(0.78 0.16 75)" }} />
            <span className="text-[11px] tracking-[0.18em] uppercase font-semibold"
                  style={{ color: "oklch(0.85 0.13 75)", fontFamily: "'Inter', sans-serif" }}>
              Inteligência Comercial · Brasil ↔ China
            </span>
          </div>

          <h1 className="capa-anim mb-6"
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: "clamp(2.5rem, 6vw, 5rem)",
                lineHeight: 0.98,
                letterSpacing: "-0.04em",
                fontWeight: 600,
                color: "oklch(0.98 0.01 80)",
                animationDelay: "0.05s",
              }}>
            Guia Estratégico
            <br />
            <span style={{
              background: "linear-gradient(135deg, oklch(0.85 0.16 75), oklch(0.65 0.20 35) 60%, oklch(0.55 0.22 25))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontStyle: "italic",
              fontWeight: 500,
            }}>
              de Fornecedores
            </span>
          </h1>

          <p className="capa-anim text-lg md:text-xl max-w-2xl mb-10"
             style={{
               color: "oklch(0.78 0.015 80)",
               fontFamily: "'Inter', sans-serif",
               lineHeight: 1.55,
               animationDelay: "0.1s",
             }}>
            Três dashboards de inteligência comercial reunidos em um único portal. Acesse
            fornecedores, importadores, mapas, dados de NCM e roteiros — tudo em um lugar,
            sem login.
          </p>

          {/* Stats bar */}
          <div className="capa-anim grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border"
               style={{
                 borderColor: "oklch(0.22 0.03 250)",
                 background: "oklch(0.22 0.03 250)",
                 animationDelay: "0.2s",
               }}>
            {stats.map((s) => (
              <div key={s.label}
                   className="p-4 md:p-5"
                   style={{ background: "oklch(0.08 0.018 250)" }}>
                <div className="text-xs uppercase tracking-[0.16em] font-semibold mb-1.5"
                     style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
                  {s.label}
                </div>
                <div style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "oklch(0.95 0.02 80)",
                  letterSpacing: "-0.01em",
                }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARDS GRID */}
      <section className="relative z-10 container pb-24">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-2"
                 style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
              Selecione um dashboard
            </div>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "oklch(0.97 0.01 80)",
              lineHeight: 1.1,
            }}>
              Acesso direto à inteligência
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs"
               style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'JetBrains Mono', monospace" }}>
            <TrendingUp className="w-3.5 h-3.5" />
            <span>3 / 3 ATIVOS</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {dashboards.map((d, i) => {
            const Icon = d.icon;
            return (
              <Link key={d.href} href={d.href}>
                <div
                  className="capa-anim group cursor-pointer h-full rounded-2xl p-6 md:p-7 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] relative overflow-hidden"
                  style={{
                    background: "oklch(0.10 0.02 250)",
                    border: `1px solid oklch(0.22 0.03 250)`,
                    animationDelay: `${0.3 + i * 0.08}s`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = d.accentBorder;
                    e.currentTarget.style.boxShadow = `0 24px 48px -12px oklch(0 0 0 / 0.5), 0 0 0 1px ${d.accentBorder}, 0 0 60px -10px ${d.accent}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "oklch(0.22 0.03 250)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Glow */}
                  <div
                    className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${d.accent}, transparent 70%)` }}
                  />

                  {/* Chinese badge */}
                  <div className="absolute top-5 right-5 text-3xl select-none opacity-30 group-hover:opacity-50 transition-opacity"
                       style={{ fontFamily: "'Fraunces', serif", color: d.accent }}>
                    {d.badge}
                  </div>

                  {/* Eyebrow */}
                  <div className="text-[10px] tracking-[0.25em] font-semibold mb-5"
                       style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {d.eyebrow}
                  </div>

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                       style={{
                         background: d.accentBg,
                         border: `1px solid ${d.accentBorder}`,
                         color: d.accent,
                       }}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Title */}
                  <h3 className="mb-2"
                      style={{
                        fontFamily: "'Fraunces', serif",
                        fontSize: "1.5rem",
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.15,
                        color: "oklch(0.97 0.01 80)",
                      }}>
                    {d.title}
                  </h3>

                  {/* Subtitle */}
                  <div className="text-sm mb-4 font-semibold"
                       style={{
                         color: d.accentSoft,
                         fontFamily: "'Inter', sans-serif",
                         fontStyle: "italic",
                       }}>
                    {d.subtitle}
                  </div>

                  {/* Description */}
                  <p className="text-sm mb-6"
                     style={{
                       color: "oklch(0.88 0.01 80)",
                       fontFamily: "'Inter', sans-serif",
                       lineHeight: 1.6,
                     }}>
                    {d.description}
                  </p>

                  {/* Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {d.chips.map((c) => (
                      <span key={c}
                            className="text-[10px] tracking-wider font-semibold uppercase px-2.5 py-1 rounded-md"
                            style={{
                              background: d.accentBg,
                              color: d.accentSoft,
                              border: `1px solid ${d.accentBorder}`,
                              fontFamily: "'Inter', sans-serif",
                            }}>
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-5 border-t"
                       style={{ borderColor: "oklch(0.22 0.03 250)" }}>
                    <span className="text-xs uppercase tracking-[0.18em] font-bold transition-colors"
                          style={{ color: d.accentSoft, fontFamily: "'Inter', sans-serif" }}>
                      Acessar dashboard
                    </span>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 group-hover:translate-x-1"
                         style={{
                           background: d.accentBg,
                           border: `1px solid ${d.accentBorder}`,
                           color: d.accent,
                         }}>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t" style={{ borderColor: "oklch(0.22 0.03 250)" }}>
        <div className="container py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-xs"
               style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
            GUIA ESTRATÉGICO DE FORNECEDORES · 2026
          </div>
          <div className="text-xs"
               style={{ color: "oklch(0.5 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
            Inteligência comercial Brasil ↔ China · Sem login · Acesso público
          </div>
        </div>
      </footer>
    </div>
  );
}
