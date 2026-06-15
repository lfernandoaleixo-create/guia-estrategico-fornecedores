import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Globe, ChevronRight } from "lucide-react";

const navItems = [
  { path: "/anotacoes", label: "Anotações / Diário" },
  { path: "/visao-geral", label: "Visão Geral" },
  { path: "/fornecedores", label: "Fornecedores" },
  { path: "/mapa", label: "Mapa do Mercado" },
  { path: "/distribuidor", label: "Principal Distribuidor Brasileiro" },
  { path: "/metodologia", label: "Método de Avaliação" },
];

export default function Header() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-md"
      style={{ background: 'oklch(0.13 0.04 240 / 0.92)' }}>
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, oklch(0.75 0.17 75), oklch(0.65 0.18 200))' }}>
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-sm tracking-wide text-white">GRUPO FOX</span>
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest">GUIA ESTRATÉGICO DE YIWU</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border/50 py-3 pb-4">
            {navItems.map((item) => {
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
