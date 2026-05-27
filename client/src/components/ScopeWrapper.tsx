import { useEffect, type ReactNode } from "react";

type ScopeName = "aquario" | "tapete" | "yiwu" | "capa";

/**
 * Aplica a classe `scope-X` no <html> enquanto este componente está montado,
 * garantindo que as variáveis CSS específicas de cada dashboard fiquem ativas.
 * Adiciona um botão flutuante "Voltar ao Guia" posicionado de forma inteligente
 * para não conflitar com sidebars/menus de cada dashboard.
 */
export default function ScopeWrapper({
  scope,
  children,
}: {
  scope: ScopeName;
  children: ReactNode;
}) {
  useEffect(() => {
    const html = document.documentElement;
    const prev = Array.from(html.classList).filter(c => c.startsWith("scope-"));
    prev.forEach(c => html.classList.remove(c));
    if (scope !== "capa") {
      html.classList.add(`scope-${scope}`);
    }
    return () => {
      html.classList.remove(`scope-${scope}`);
      prev.forEach(c => {
        if (c !== `scope-${scope}`) html.classList.add(c);
      });
    };
  }, [scope]);

  // Posicionamento unificado: todos os dashboards têm sidebar/header no lado esquerdo,
  // então o botão fica sempre no canto superior direito da viewport.
  const positionClass = "fixed top-3 right-6 z-[9999]";

  return (
    <>
      {children}
      {scope !== "capa" && (
        <a
          href="/"
          className={`${positionClass} inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-sm font-bold tracking-wide shadow-2xl shadow-amber-900/40 ring-2 ring-white/20 transition-all hover:scale-105 active:scale-95`}
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
          title="Voltar ao Guia Estratégico"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Voltar ao Guia
        </a>
      )}
    </>
  );
}
