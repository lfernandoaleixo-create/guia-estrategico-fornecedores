// =============================================================================
// useViabilitySheet — planilha de "Análise de Viabilidade de Compra" por
// fornecedor (scope + supplierId). Persistida no banco compartilhado via tRPC.
//
// Recria a lógica do Excel enviado pelo usuário:
//   Colunas por linha:
//     - produto           (texto)
//     - qtd               (un)                     [C]
//     - precoVenda         (R$, editável amarelo)   [D]
//     - margem            (%, editável)             [E]
//     - precoUnitForn      (R$, fornecedor laranja)  [F]
//     - precoPacoteDesejado(R$, editável amarelo)   [H]
//   Calculados:
//     - precoUnitDesejado  = precoPacoteDesejado / qtd        (G = H/C)
//     - precoPacoteAtual    = qtd * precoUnitForn              (I = C*F)
//     - atende             = precoPacoteAtual < precoPacoteDesejado ? "SIM" : "NÃO" (J)
//
// O documento é uma lista de SEÇÕES; cada seção tem um título e LINHAS.
// O usuário pode adicionar/remover seções e linhas livremente.
// =============================================================================

import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface ViabilityRow {
  id: string;
  produto: string;
  /** Qtd (un) — C */
  qtd: number | null;
  /** Preço de Venda Informado (R$) — D (editável) */
  precoVenda: number | null;
  /** Margem Lucro (%) — E (editável, 0..1 ; ex.: 0.2 = 20%) */
  margem: number | null;
  /** Preço Unit. Fornecedor (R$) — F (laranja, vem do fornecedor) */
  precoUnitForn: number | null;
  /** Preço pacote Desejado (R$) — H (editável amarelo) */
  precoPacoteDesejado: number | null;
  /** Preço Pacote Atual (R$) — I (editável; vinculado a precoUnitForn via qtd) */
  precoPacoteAtual?: number | null;
}

export interface ViabilitySection {
  id: string;
  title: string;
  /** Cor de destaque da faixa da seção (header). */
  color: string;
  rows: ViabilityRow[];
}

export interface ViabilitySheet {
  scope: string;
  supplierId: string;
  title: string;
  note: string;
  sections: ViabilitySection[];
  createdAt: number;
  updatedAt: number;
}

// Valores derivados de uma linha (fórmulas do Excel).
export interface ViabilityComputed {
  /** G = H / C */
  precoUnitDesejado: number | null;
  /** I = C * F */
  precoPacoteAtual: number | null;
  /** J = I < H ? "SIM" : "NÃO" (vazio se faltar H) */
  atende: "SIM" | "NÃO" | "";
}

export function computeRow(row: ViabilityRow): ViabilityComputed {
  const c = row.qtd;
  const f = row.precoUnitForn;
  const h = row.precoPacoteDesejado;

  const precoUnitDesejado =
    h != null && c != null && c !== 0 ? h / c : null;

  // Preço Pacote Atual agora é um campo editável (vinculado a precoUnitForn).
  // Se o valor estiver salvo na linha, usa-o; senão, deriva de qtd * precoUnitForn (compat. com dados antigos).
  const precoPacoteAtual =
    row.precoPacoteAtual != null
      ? row.precoPacoteAtual
      : c != null && f != null
        ? c * f
        : null;

  let atende: "SIM" | "NÃO" | "" = "";
  if (h != null) {
    if (precoPacoteAtual != null) {
      atende = precoPacoteAtual < h ? "SIM" : "NÃO";
    }
  }
  return { precoUnitDesejado, precoPacoteAtual, atende };
}

/**
 * Vínculo bidirecional entre Preço Unit. Fornecedor e Preço Pacote Atual,
 * usando a Qtd como fator. Retorna a linha atualizada (não muta a original).
 *   field = "unit"   → usuário digitou o unitário; pacote = unit * qtd
 *   field = "pacote" → usuário digitou o pacote;   unit  = pacote / qtd
 * Quando a Qtd está ausente/zero, mantém o outro campo como estava
 * (apenas grava o valor digitado), evitando divisão por zero.
 */
export function linkFornecedorPrice(
  row: ViabilityRow,
  field: "unit" | "pacote",
  value: number | null,
): ViabilityRow {
  const qtd = row.qtd;
  if (field === "unit") {
    const pacote =
      value != null && qtd != null ? value * qtd : row.precoPacoteAtual ?? null;
    return { ...row, precoUnitForn: value, precoPacoteAtual: pacote };
  }
  const unit =
    value != null && qtd != null && qtd !== 0
      ? value / qtd
      : row.precoUnitForn ?? null;
  return { ...row, precoPacoteAtual: value, precoUnitForn: unit };
}

const SECTION_COLORS = ["#2E75B6", "#548235", "#7030A0", "#C55A11", "#0F9488"];

export function nextSectionColor(index: number): string {
  return SECTION_COLORS[index % SECTION_COLORS.length];
}

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeEmptyRow(): ViabilityRow {
  return {
    id: genId("vr"),
    produto: "",
    qtd: null,
    precoVenda: null,
    margem: null,
    precoUnitForn: null,
    precoPacoteDesejado: null,
    precoPacoteAtual: null,
  };
}

export function makeEmptySection(index = 0, title = ""): ViabilitySection {
  return {
    id: genId("vs"),
    title: title || `Seção ${index + 1}`,
    color: nextSectionColor(index),
    rows: [makeEmptyRow()],
  };
}

/** Cria uma linha pré-preenchida do template-base. */
function makeRow(
  produto: string,
  qtd: number,
  precoVenda: number,
  margem: number,
  precoPacoteDesejado: number,
): ViabilityRow {
  return {
    id: genId("vr"),
    produto,
    qtd,
    precoVenda,
    margem,
    precoUnitForn: null, // laranja: preenchido por fornecedor
    precoPacoteDesejado,
  };
}

/**
 * Template-base IDÊNTICO ao Excel enviado pelo usuário (Tapete Higiênico).
 * Duas seções (60x80 e 55x60), 4 linhas cada, com os valores e fórmulas originais.
 * O "Preço Unit. Fornecedor" (laranja) fica vazio para ser preenchido por fornecedor.
 */
export function makeTapeteTemplateSections(): ViabilitySection[] {
  return [
    {
      id: genId("vs"),
      title: "Tapete Higiênico 60x80 cm",
      color: nextSectionColor(0),
      rows: [
        makeRow("Tapete Higiênico 60x80 cm", 30, 49.9, 0.2, 1.66),
        makeRow("Tapete Higiênico 60x80 cm", 30, 49.9, 0.25, 1.38),
        makeRow("Tapete Higiênico 60x80 cm", 50, 69.9, 0.2, 2.96),
        makeRow("Tapete Higiênico 60x80 cm", 50, 69.9, 0.26, 2.4),
      ],
    },
    {
      id: genId("vs"),
      title: "Tapete Higiênico 55x60 cm",
      color: nextSectionColor(1),
      rows: [
        makeRow("Tapete Higiênico 55x60 cm", 30, 38, 0.2, 1.2),
        makeRow("Tapete Higiênico 55x60 cm", 30, 38, 0.25, 0.92),
        makeRow("Tapete Higiênico 55x60 cm", 50, 48, 0.2, 1.75),
        makeRow("Tapete Higiênico 55x60 cm", 50, 48, 0.25, 1.38),
      ],
    },
  ];
}

/** Documento inicial padrão para um fornecedor sem planilha ainda. */
export function makeDefaultSheet(scope: string, supplierId: string): ViabilitySheet {
  const now = Date.now();
  // No dashboard Tapete, todos os fornecedores começam com o template-base idêntico ao Excel.
  const sections =
    scope === "tapete" ? makeTapeteTemplateSections() : [makeEmptySection(0, "Nova seção")];
  return {
    scope,
    supplierId,
    title: "Análise de Viabilidade de Compra",
    note: "Campos em AMARELO são editáveis. Campos em LARANJA são do fornecedor. Preencha para calcular automaticamente.",
    sections,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Normalização linha do banco -> ViabilitySheet ──────────────────────────
function normalize(
  row: Record<string, unknown> | null,
  scope: string,
  supplierId: string,
): ViabilitySheet | null {
  if (!row) return null;
  try {
    const raw = typeof row.data === "string" ? JSON.parse(row.data as string) : row.data;
    if (!raw || typeof raw !== "object") return null;
    const s = raw as ViabilitySheet;
    return {
      scope,
      supplierId,
      title: s.title ?? "Análise de Viabilidade de Compra",
      note: s.note ?? "",
      sections: Array.isArray(s.sections)
        ? s.sections.map((sec) => ({
            id: sec.id ?? genId("vs"),
            title: sec.title ?? "Seção",
            color: sec.color ?? "#2E75B6",
            rows: Array.isArray(sec.rows)
              ? sec.rows.map((r) => ({ ...makeEmptyRow(), ...r }))
              : [],
          }))
        : [],
      createdAt: Number(s.createdAt) || Date.now(),
      updatedAt: Number(s.updatedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

function toPayload(sheet: ViabilitySheet) {
  return {
    scope: sheet.scope,
    supplierId: sheet.supplierId,
    data: JSON.stringify(sheet),
    createdAt: String(sheet.createdAt),
    updatedAt: String(sheet.updatedAt),
  };
}

export function useViabilitySheet(scope: string, supplierId: string) {
  const utils = trpc.useUtils();
  const query = trpc.data.viabilitySheets.get.useQuery(
    { scope, supplierId },
    { refetchOnWindowFocus: true, enabled: Boolean(scope && supplierId) },
  );
  const upsertMut = trpc.data.viabilitySheets.upsert.useMutation();

  const sheet = useMemo<ViabilitySheet | null>(() => {
    return normalize(query.data as Record<string, unknown> | null, scope, supplierId);
  }, [query.data, scope, supplierId]);

  const loaded = !query.isLoading;

  const reload = useCallback(async () => {
    await utils.data.viabilitySheets.get.invalidate({ scope, supplierId });
  }, [utils, scope, supplierId]);

  const save = useCallback(
    async (next: ViabilitySheet) => {
      const toSave: ViabilitySheet = { ...next, updatedAt: Date.now() };
      await upsertMut.mutateAsync(toPayload(toSave));
      await reload();
    },
    [upsertMut, reload],
  );

  return { sheet, loaded, reload, save, saving: upsertMut.isPending };
}
