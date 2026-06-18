// =============================================================================
// subgroupNumber — regras PURAS de numeração de subgrupos no formato "macro.sub".
//
// Um subgrupo é numerado como "<macroNumber>.<sub>" (ex.: "1.1", "1.4", "3.4").
// - macroNumber: o número do MACRO ao qual pertence (1, 2, 3…). Referencia um
//   macro EXISTENTE — a criação deve ser bloqueada se o macro não existir.
// - sub: o sufixo livre dentro do macro, digitado pelo usuário (1, 4, 6…).
//
// Este módulo NÃO acessa banco nem React — apenas parsing/validação/formatação,
// para ser 100% testável via vitest.
// =============================================================================

export interface ParsedSubgroupNumber {
  macroNumber: number;
  sub: number;
}

/**
 * Faz o parse de uma string "macro.sub" (ex.: "1.4") em números.
 * Aceita espaços ao redor. Retorna null se o formato for inválido.
 *
 * Regras:
 *  - Deve conter exatamente um ponto separando dois inteiros positivos.
 *  - Ambos os lados devem ser inteiros >= 0 (aceita macro/sub 0; rejeita negativos).
 *  - Não aceita casas decimais extras (ex.: "1.4.2" é inválido).
 */
export function parseSubgroupNumber(raw: string): ParsedSubgroupNumber | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Exatamente: dígitos . dígitos
  const match = /^(\d+)\.(\d+)$/.exec(trimmed);
  if (!match) return null;
  const macroNumber = Number(match[1]);
  const sub = Number(match[2]);
  if (!Number.isInteger(macroNumber) || !Number.isInteger(sub)) return null;
  // Permite macro 0 (ex.: macro "0 — Documentos") e sub 0; rejeita negativos.
  if (macroNumber < 0 || sub < 0) return null;
  return { macroNumber, sub };
}

/** Formata um par (macroNumber, sub) na string "1.4". */
export function formatSubgroupNumber(macroNumber: number, sub: number): string {
  return `${macroNumber}.${sub}`;
}

/** Formato "1.4 - Nome" (ou só "1.4" se name vazio). */
export function formatSubgroupLabel(
  macroNumber: number,
  sub: number,
  name: string,
): string {
  const num = formatSubgroupNumber(macroNumber, sub);
  const trimmed = (name ?? "").trim();
  return trimmed ? `${num} - ${trimmed}` : num;
}

export type SubgroupValidationError =
  | "empty"
  | "format"
  | "macro-not-found"
  | "duplicate";

export interface ValidateInput {
  /** Texto digitado pelo usuário (ex.: "1.4"). */
  raw: string;
  /** Números de macros existentes (ex.: [1, 3, 5]). */
  existingMacroNumbers: number[];
  /** Subgrupos já existentes, para detectar duplicidade (mesmo macro.sub). */
  existingSubgroups: { macroNumber: number; sub: number; id?: string }[];
  /** ID do subgrupo sendo editado (para não acusar duplicidade contra si mesmo). */
  editingId?: string | null;
}

export interface ValidateResult {
  ok: boolean;
  parsed: ParsedSubgroupNumber | null;
  error: SubgroupValidationError | null;
}

/**
 * Valida um número de subgrupo digitado:
 *  - vazio        → "empty"
 *  - formato ruim → "format"
 *  - macro inexistente → "macro-not-found" (BLOQUEIA: usuário deve criar o macro antes)
 *  - já existe o mesmo macro.sub → "duplicate"
 */
export function validateSubgroupNumber(input: ValidateInput): ValidateResult {
  const { raw, existingMacroNumbers, existingSubgroups, editingId } = input;
  if (!raw || !raw.trim()) {
    return { ok: false, parsed: null, error: "empty" };
  }
  const parsed = parseSubgroupNumber(raw);
  if (!parsed) {
    return { ok: false, parsed: null, error: "format" };
  }
  if (!existingMacroNumbers.includes(parsed.macroNumber)) {
    return { ok: false, parsed, error: "macro-not-found" };
  }
  const dup = (existingSubgroups ?? []).some(
    (sg) =>
      sg.macroNumber === parsed.macroNumber &&
      sg.sub === parsed.sub &&
      (!editingId || sg.id !== editingId),
  );
  if (dup) {
    return { ok: false, parsed, error: "duplicate" };
  }
  return { ok: true, parsed, error: null };
}

/** Mensagem amigável (pt-BR) para cada erro de validação. */
export function subgroupErrorMessage(
  error: SubgroupValidationError | null,
  macroNumber?: number,
): string {
  switch (error) {
    case "empty":
      return "Digite o número do subgrupo (ex.: 1.4).";
    case "format":
      return 'Formato inválido. Use "macro.subgrupo", ex.: 1.4, 3.2.';
    case "macro-not-found":
      return `O macro Nº ${macroNumber ?? "?"} não existe. Crie esse macro na página inicial (Classificações) antes de usar este número.`;
    case "duplicate":
      return "Já existe um subgrupo com esse número. Escolha outro.";
    default:
      return "";
  }
}

/**
 * Ordena subgrupos por (macroNumber, sub) crescente. Retorna NOVO array.
 */
export function sortSubgroups<T extends { macroNumber: number; sub: number }>(
  list: T[],
): T[] {
  return [...list].sort((a, b) =>
    a.macroNumber !== b.macroNumber
      ? a.macroNumber - b.macroNumber
      : a.sub - b.sub,
  );
}

/**
 * Sugere o próximo `sub` livre dentro de um macro (maior sub + 1, mínimo 1).
 */
export function nextSubForMacro(
  macroNumber: number,
  existingSubgroups: { macroNumber: number; sub: number }[],
): number {
  const subs = (existingSubgroups ?? [])
    .filter((sg) => sg.macroNumber === macroNumber)
    .map((sg) => sg.sub);
  if (subs.length === 0) return 1;
  return Math.max(...subs) + 1;
}
