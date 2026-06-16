// =============================================================================
// partners.ts — Parceiro(s) Chinês(es) Responsável(eis) por fornecedor
//
// Os nomes dos parceiros chineses são persistidos como JSON (array de strings)
// dentro de `fields.parceirosChineses` da nota do fornecedor (SupplierNoteEntry).
// Mantemos como string serializada para reaproveitar o storage genérico de
// `fields: Record<string,string>` que já é persistido no banco compartilhado.
//
// Este módulo centraliza a (de)serialização e a NORMALIZAÇÃO de nomes para
// busca/filtro (case-insensitive, sem acentos, espaços colapsados), de modo que
// "Betty", " betty " e "BETTY" sejam tratados como o mesmo parceiro no filtro,
// preservando o rótulo original digitado pelo usuário para exibição.
// =============================================================================

/** Chave única em `fields` onde a lista de parceiros é guardada. */
export const PARTNERS_FIELD_KEY = "parceirosChineses";

/**
 * Lê a lista de parceiros a partir do mapa de `fields` da nota.
 * Aceita tanto o formato JSON novo (array) quanto um fallback de string única.
 */
export function parsePartners(
  fields: Record<string, string> | undefined | null,
): string[] {
  const raw = fields?.[PARTNERS_FIELD_KEY];
  if (!raw) return [];
  // Formato canônico: JSON array de strings.
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return dedupePartners(
        parsed.filter((v): v is string => typeof v === "string").map((v) => v.trim()),
      );
    }
  } catch {
    // ignore — pode ser uma string simples legada
  }
  // Fallback legado: string separada por vírgula/; ou nome único.
  return dedupePartners(
    raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** Serializa a lista de parceiros para guardar em `fields`. */
export function serializePartners(partners: string[]): string {
  return JSON.stringify(dedupePartners(partners.map((p) => p.trim()).filter(Boolean)));
}

/**
 * Normaliza um nome de parceiro para fins de comparação/agrupamento:
 * minúsculas, sem acentos, espaços colapsados. NÃO usar para exibição.
 */
export function normalizePartner(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Remove duplicados preservando a primeira grafia digitada (case/acentos),
 * comparando pela forma normalizada.
 */
export function dedupePartners(partners: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of partners) {
    const key = normalizePartner(p);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
