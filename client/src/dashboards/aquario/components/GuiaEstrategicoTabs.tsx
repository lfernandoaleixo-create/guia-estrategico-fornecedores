// =============================================================================
// GUIA ESTRATÉGICO DE FORNECEDORES
// 3 sub-abas internas que carregam, via iframe, os 3 dashboards publicados
// no Manus Space, unificando-os em um único painel de comando.
// =============================================================================

import { useState } from "react";
import { ExternalLink, Maximize2, RefreshCw, Fish, Dog, Building2 } from "lucide-react";

type GuiaTab = {
  id: string;
  label: string;
  short: string;
  url: string;
  description: string;
  icon: React.ReactNode;
  accent: string; // cor de destaque do tab
};

const tabs: GuiaTab[] = [
  {
    id: "aquario",
    label: "Aquário / Terrário",
    short: "Aquários & Terrários",
    url: "https://chinaaqua-2prbhgz3.manus.space",
    description:
      "Dashboard completo de fornecedores chineses de aquários de vidro, terrários para répteis e equipamentos.",
    icon: <Fish className="w-4 h-4" />,
    accent: "oklch(0.55 0.20 28)", // vermelho-chinês
  },
  {
    id: "tapete",
    label: "Tapete Higiênico para Cães",
    short: "Tapetes para Cães",
    url: "https://tapeteimport-o7eavvu2.manus.space",
    description: "Dashboard de fornecedores chineses de tapetes higiênicos para cães.",
    icon: <Dog className="w-4 h-4" />,
    accent: "oklch(0.55 0.16 145)", // verde-floresta
  },
  {
    id: "yiwu",
    label: "Yiwu Intel",
    short: "Yiwu Intel",
    url: "https://yiwuintel-fvkwem8u.manus.space",
    description: "Inteligência de mercado e fornecedores do mercado atacadista de Yiwu.",
    icon: <Building2 className="w-4 h-4" />,
    accent: "oklch(0.45 0.13 245)", // azul-aço
  },
];

export default function GuiaEstrategicoTabs() {
  const [activeTab, setActiveTab] = useState<string>("aquario");
  // Forçar reload do iframe alterando a key
  const [reloadKeys, setReloadKeys] = useState<Record<string, number>>({
    aquario: 0,
    tapete: 0,
    yiwu: 0,
  });

  const current = tabs.find((t) => t.id === activeTab)!;

  const handleReload = () => {
    setReloadKeys((prev) => ({ ...prev, [activeTab]: prev[activeTab] + 1 }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div
        className="flex-shrink-0 px-8 pt-8 pb-5 border-b"
        style={{ borderColor: "var(--border)", background: "var(--background)" }}
      >
        <div className="flex items-start justify-between gap-6 mb-5">
          <div>
            <div
              className="text-[0.7rem] uppercase tracking-[0.18em] font-medium mb-2"
              style={{ color: "oklch(0.55 0.20 28)", fontFamily: "Inter, sans-serif" }}
            >
              Painel Unificado · Importação China — Brasil
            </div>
            <h2
              className="font-display"
              style={{
                fontSize: "2rem",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
                color: "var(--foreground)",
              }}
            >
              Guia Estratégico de Fornecedores
            </h2>
            <p
              className="mt-2 max-w-2xl"
              style={{
                fontSize: "0.95rem",
                color: "var(--muted-foreground)",
                fontStyle: "italic",
                lineHeight: 1.55,
              }}
            >
              Três dashboards integrados em um único painel para gestão completa das suas operações de importação.
            </p>
          </div>
        </div>

        {/* Sub-abas */}
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm transition-all duration-200"
                style={{
                  background: isActive ? tab.accent : "transparent",
                  color: isActive ? "white" : "var(--foreground)",
                  border: isActive
                    ? `1px solid ${tab.accent}`
                    : "1px solid var(--border)",
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: "-0.005em",
                  boxShadow: isActive
                    ? `0 4px 14px -4px ${tab.accent.replace(")", " / 0.4)")}`
                    : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "var(--accent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.7 }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}

          {/* Ações à direita */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleReload}
              title="Recarregar"
              className="p-2 rounded-md transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir em nova aba"
              className="p-2 rounded-md transition-colors flex items-center"
              style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <Maximize2 className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Descrição da aba ativa */}
        <div
          className="mt-4 px-4 py-2.5 rounded-md flex items-center gap-2 text-xs"
          style={{
            background: "var(--accent)",
            color: "var(--muted-foreground)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <span style={{ color: current.accent }}>{current.icon}</span>
          <span>{current.description}</span>
          <span className="ml-auto" style={{ fontFamily: "JetBrains Mono, monospace", opacity: 0.6 }}>
            {current.url.replace("https://", "")}
          </span>
        </div>
      </div>

      {/* Área dos iframes */}
      <div className="flex-1 relative" style={{ background: "var(--muted)" }}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="absolute inset-0"
            style={{
              visibility: activeTab === tab.id ? "visible" : "hidden",
              pointerEvents: activeTab === tab.id ? "auto" : "none",
            }}
          >
            <IframePanel url={tab.url} accent={tab.accent} reloadKey={reloadKeys[tab.id]} />
          </div>
        ))}
      </div>
    </div>
  );
}

function IframePanel({
  url,
  accent,
  reloadKey,
}: {
  url: string;
  accent: string;
  reloadKey: number;
}) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
          style={{ background: "var(--background)" }}
        >
          <div
            className="w-10 h-10 rounded-full animate-spin"
            style={{
              border: `3px solid var(--border)`,
              borderTopColor: accent,
            }}
          />
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)", fontFamily: "Inter, sans-serif" }}
          >
            Carregando dashboard…
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1.5 mt-2"
            style={{ color: accent }}
          >
            Abrir em nova aba <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
      <iframe
        key={reloadKey}
        src={url}
        title={url}
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
