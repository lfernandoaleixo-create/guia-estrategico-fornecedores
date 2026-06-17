// =============================================================================
// cardAccent — deriva os 4 tons usados pelo DashboardCard a partir de UMA cor.
//
// O DashboardCard usa quatro campos de cor:
//   - accent       → cor principal (ícone, número, seta, título do CTA)
//   - accentSoft   → variação suave (subtítulo, chips de texto)
//   - accentBg     → fundo translúcido (badges, ícone)
//   - accentBorder → borda translúcida
//
// Recebemos uma cor base (hex "#rrggbb" da paleta de subgrupos/grupos, ou uma
// string OKLCH dos cards fixos) e derivamos os 4 tons de forma consistente,
// reproduzindo o padrão já usado na Home (`${color}1f` e `${color}88` para hex).
// =============================================================================

export interface CardAccent {
  accent: string;
  accentSoft: string;
  accentBg: string;
  accentBorder: string;
}

/** true se a string parece um hex (#rgb, #rrggbb, #rrggbbaa). */
export function isHexColor(c: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c.trim());
}

/** Normaliza um hex curto (#abc) para a forma longa (#aabbcc). */
function expandHex(hex: string): string {
  const h = hex.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    return "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  // #rrggbbaa → descarta o alfa para a base
  if (/^#[0-9a-fA-F]{8}$/.test(h)) {
    return h.slice(0, 7);
  }
  return h;
}

/**
 * Deriva os 4 tons a partir de uma cor base.
 *
 * - Hex: reproduz o padrão da Home (sufixos de alfa 1f≈12% e 88≈53%).
 * - OKLCH (ou qualquer outra string CSS): usa color-mix para gerar as variações,
 *   garantindo compatibilidade com os valores OKLCH dos cards fixos.
 */
export function deriveAccent(base: string): CardAccent {
  const c = (base ?? "").trim();
  if (!c) {
    // fallback âmbar (mesma cor padrão do app)
    return deriveAccent("#f59e0b");
  }

  if (isHexColor(c)) {
    const hex = expandHex(c);
    return {
      accent: hex,
      accentSoft: hex,
      accentBg: `${hex}1f`, // ~12% alfa
      accentBorder: `${hex}88`, // ~53% alfa
    };
  }

  // String CSS genérica (ex.: OKLCH). Usa color-mix para alfa/clareza.
  return {
    accent: c,
    accentSoft: `color-mix(in oklch, ${c} 78%, white)`,
    accentBg: `color-mix(in oklch, ${c} 14%, transparent)`,
    accentBorder: `color-mix(in oklch, ${c} 50%, transparent)`,
  };
}

/**
 * Paleta de cores oferecida no seletor.
 * Organizada por matiz (do vermelho ao rosa), com 3 níveis de saturação/clareza
 * por matiz para dar variedade real ao usuário. ~48 cores predefinidas.
 */
export const CARD_COLOR_PALETTE: { value: string; label: string }[] = [
  // Vermelho / Rosa-vermelho
  { value: "#fca5a5", label: "Vermelho claro" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#b91c1c", label: "Vermelho escuro" },
  // Laranja
  { value: "#fdba74", label: "Laranja claro" },
  { value: "#f97316", label: "Laranja" },
  { value: "#c2410c", label: "Laranja escuro" },
  // Âmbar
  { value: "#fcd34d", label: "Âmbar claro" },
  { value: "#f59e0b", label: "Âmbar" },
  { value: "#b45309", label: "Âmbar escuro" },
  // Amarelo
  { value: "#fde047", label: "Amarelo claro" },
  { value: "#eab308", label: "Amarelo" },
  { value: "#a16207", label: "Amarelo escuro" },
  // Lima
  { value: "#bef264", label: "Lima claro" },
  { value: "#84cc16", label: "Lima" },
  { value: "#4d7c0f", label: "Lima escuro" },
  // Verde
  { value: "#86efac", label: "Verde claro" },
  { value: "#22c55e", label: "Verde" },
  { value: "#15803d", label: "Verde escuro" },
  // Esmeralda
  { value: "#6ee7b7", label: "Esmeralda claro" },
  { value: "#10b981", label: "Esmeralda" },
  { value: "#047857", label: "Esmeralda escuro" },
  // Teal
  { value: "#5eead4", label: "Teal claro" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#0f766e", label: "Teal escuro" },
  // Ciano
  { value: "#67e8f9", label: "Ciano claro" },
  { value: "#06b6d4", label: "Ciano" },
  { value: "#0e7490", label: "Ciano escuro" },
  // Azul céu
  { value: "#7dd3fc", label: "Azul céu claro" },
  { value: "#0ea5e9", label: "Azul céu" },
  { value: "#0369a1", label: "Azul céu escuro" },
  // Azul
  { value: "#93c5fd", label: "Azul claro" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#1d4ed8", label: "Azul escuro" },
  // Índigo
  { value: "#a5b4fc", label: "Índigo claro" },
  { value: "#6366f1", label: "Índigo" },
  { value: "#4338ca", label: "Índigo escuro" },
  // Violeta / Roxo
  { value: "#c4b5fd", label: "Violeta claro" },
  { value: "#a855f7", label: "Roxo" },
  { value: "#7e22ce", label: "Roxo escuro" },
  // Fúcsia
  { value: "#f0abfc", label: "Fúcsia claro" },
  { value: "#d946ef", label: "Fúcsia" },
  { value: "#a21caf", label: "Fúcsia escuro" },
  // Rosa
  { value: "#f9a8d4", label: "Rosa claro" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#be185d", label: "Rosa escuro" },
  // Neutros
  { value: "#94a3b8", label: "Cinza" },
  { value: "#e2e8f0", label: "Branco gelo" },
];
