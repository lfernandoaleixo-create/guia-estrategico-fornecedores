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

/** Paleta de cores oferecida no seletor (alinhada à SUBGROUP_PALETTE). */
export const CARD_COLOR_PALETTE: { value: string; label: string }[] = [
  { value: "#ef4444", label: "Vermelho" },
  { value: "#f59e0b", label: "Âmbar" },
  { value: "#10b981", label: "Verde" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#06b6d4", label: "Ciano" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#a855f7", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
];
