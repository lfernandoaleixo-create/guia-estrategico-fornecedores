import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Factory,
  Building2,
  Layers,
  BookOpen,
  Calculator,
  Menu,
  X,
  TrendingUp,
  GitMerge,
  Scale,
  NotebookPen,
  PhoneCall,
} from "lucide-react";

const navItems = [
  { href: "/anotacoes",    label: "Anotações / Diário",        icon: NotebookPen },
  { href: "/painel",       label: "Painel Geral",              icon: LayoutDashboard },
  { href: "/exportadores", label: "Fábricas Chinesas",         icon: Factory },
  { href: "/importadores", label: "Importadores Brasileiros",  icon: Building2 },
  { href: "/cruzamento",   label: "Cruzamento Fab × Imp",      icon: GitMerge },
  { href: "/comparador",   label: "Comparador de Fábricas",    icon: Scale },
  { href: "/materiais",    label: "Materiais & Tipos",         icon: Layers },
  { href: "/tutorial",     label: "Tutorial de Importação",    icon: BookOpen },
  { href: "/tributacao",   label: "NCM & Tributação",          icon: Calculator },
  { href: "/contato",      label: "Contato com Fábricas",      icon: PhoneCall },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "oklch(0.965 0.006 248)" }}>

      {/* ── Sidebar Desktop ──────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-30 text-white"
        style={{ background: "oklch(0.15 0.065 258)" }}
      >
        {/* Logo area */}
        <div
          className="px-5 py-6 border-b"
          style={{ borderColor: "oklch(0.28 0.055 258)" }}
        >
          {/* Marca */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: "oklch(0.48 0.22 25)" }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p
                className="font-extrabold text-base leading-tight text-white tracking-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.02em" }}
              >
                Grupo Fox
              </p>
              <p
                className="text-xs leading-tight mt-0.5"
                style={{ color: "oklch(0.62 0.04 255)", fontFamily: "'Inter', sans-serif" }}
              >
                Tapete Higiênico Pet
              </p>
            </div>
          </div>

          {/* NCM Badge */}
          <div
            className="rounded-xl px-4 py-3 border"
            style={{
              background: "oklch(0.20 0.06 258)",
              borderColor: "oklch(0.30 0.055 258)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: "oklch(0.58 0.04 255)", fontFamily: "'Inter', sans-serif" }}
            >
              NCM
            </p>
            <p
              className="text-xl font-bold"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "oklch(0.82 0.14 75)",
                letterSpacing: "0.02em",
              }}
            >
              4818.90.90
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "oklch(0.55 0.03 255)", fontFamily: "'Inter', sans-serif" }}
            >
              Jun/2025 – Mai/2026 · LogComex
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p
            className="px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "oklch(0.45 0.03 255)", fontFamily: "'Inter', sans-serif" }}
          >
            Navegação
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: "-0.005em",
                  background: active ? "oklch(0.48 0.22 25)" : "transparent",
                  color: active ? "white" : "oklch(0.72 0.025 255)",
                  boxShadow: active ? "0 2px 10px oklch(0.48 0.22 25 / 0.30)" : "none",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "oklch(0.22 0.065 258)";
                    (e.currentTarget as HTMLElement).style.color = "oklch(0.95 0.01 255)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "oklch(0.72 0.025 255)";
                  }
                }}
              >
                <Icon
                  className="w-4 h-4 flex-shrink-0 transition-colors"
                  style={{ color: active ? "white" : "oklch(0.52 0.04 255)" }}
                />
                <span className="flex-1 truncate">{label}</span>
                {active && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "oklch(0.82 0.14 75)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t"
          style={{ borderColor: "oklch(0.28 0.055 258)" }}
        >
          <p
            className="text-xs text-center"
            style={{ color: "oklch(0.45 0.03 255)", fontFamily: "'Inter', sans-serif" }}
          >
            Dados: LogComex + Alibaba
          </p>
          <p
            className="text-xs text-center mt-0.5"
            style={{ color: "oklch(0.38 0.025 255)", fontFamily: "'Inter', sans-serif" }}
          >
            Jun/2025 – Mai/2026
          </p>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside
            className="relative flex flex-col w-72 h-full text-white"
            style={{ background: "oklch(0.15 0.065 258)" }}
          >
            <div
              className="p-5 border-b flex items-center justify-between"
              style={{ borderColor: "oklch(0.28 0.055 258)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ background: "oklch(0.48 0.22 25)" }}
                >
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p
                    className="font-extrabold text-sm text-white"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.02em" }}
                  >
                    Grupo Fox
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "oklch(0.62 0.04 255)", fontFamily: "'Inter', sans-serif" }}
                  >
                    Tapete Higiênico Pet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = location === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      background: active ? "oklch(0.48 0.22 25)" : "transparent",
                      color: active ? "white" : "oklch(0.72 0.025 255)",
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header
          className="lg:hidden sticky top-0 z-20 text-white px-4 py-3 flex items-center gap-3 shadow-lg"
          style={{ background: "oklch(0.15 0.065 258)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-300 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "oklch(0.48 0.22 25)" }}
            >
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <span
              className="font-bold text-sm"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.02em" }}
            >
              Grupo Fox — Tapete Higiênico Pet
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
