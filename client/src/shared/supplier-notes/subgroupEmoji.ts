// =============================================================================
// subgroupEmoji — deriva um ícone (emoji) a partir do NOME de um subgrupo.
//
// Reaproveita a identidade visual dos antigos selos de especialidade
// (🦎 Terrário, 🐟 Aquário) e estende para outros ramos comuns do guia
// (pet, tapete, vidro, decoração, equipamento, mercado/feira...).
//
// É puramente heurístico: faz match por palavras-chave no nome (sem acento e
// em minúsculas). Quando nada casa, retorna "" (o selo fica só com número+nome).
// =============================================================================

/** Remove acentos e normaliza para comparação case-insensitive. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Cada regra: lista de palavras-chave → emoji. Ordem importa (mais específico
// primeiro). A primeira regra cujo nome contenha alguma palavra-chave vence.
const RULES: Array<{ keywords: string[]; emoji: string }> = [
  { keywords: ["terrario", "reptil", "repteis", "jacare", "lagarto", "cobra", "tartaruga"], emoji: "🦎" },
  { keywords: ["aquario", "peixe", "aquatic", "aquatico", "aqua"], emoji: "🐟" },
  { keywords: ["tapete", "higienic", "fralda", "absorvente"], emoji: "🧻" },
  { keywords: ["coleira", "cachorro", "cao", "dog", "guia", "peitoral"], emoji: "🐶" },
  { keywords: ["gato", "felino", "cat", "arranhador"], emoji: "🐱" },
  { keywords: ["passaro", "ave", "bird", "gaiola"], emoji: "🐦" },
  { keywords: ["roedor", "hamster", "coelho", "porquinho"], emoji: "🐹" },
  { keywords: ["brinquedo", "toy"], emoji: "🧸" },
  { keywords: ["vidro", "glass", "cristal"], emoji: "🪟" },
  { keywords: ["decoracao", "decor", "enfeite", "ornamento"], emoji: "🎨" },
  { keywords: ["equipamento", "maquina", "bomba", "filtro", "motor", "eletr"], emoji: "⚙️" },
  { keywords: ["acessorio", "pe&ca", "peca", "componente"], emoji: "📦" },
  { keywords: ["mercado", "feira", "atacado", "show", "expo"], emoji: "🏪" },
  { keywords: ["racao", "alimento", "comida", "petisco", "food"], emoji: "🍖" },
  { keywords: ["medicamento", "saude", "remedio", "farmac"], emoji: "💊" },
  { keywords: ["pet", "animal", "animais"], emoji: "🐾" },
];

/**
 * Retorna um emoji adequado ao nome do subgrupo, ou "" se nenhuma regra casar.
 *
 * @example subgroupEmoji("Terrário") // "🦎"
 * @example subgroupEmoji("Coleira de Cachorro") // "🐶"
 * @example subgroupEmoji("Algo Genérico") // ""
 */
export function subgroupEmoji(name: string | null | undefined): string {
  if (!name) return "";
  const n = normalize(name);
  if (!n) return "";
  for (const rule of RULES) {
    if (rule.keywords.some((k) => n.includes(k))) return rule.emoji;
  }
  return "";
}

export default subgroupEmoji;
