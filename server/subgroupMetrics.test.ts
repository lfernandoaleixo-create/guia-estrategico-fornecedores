import { describe, expect, it } from "vitest";

/**
 * Feature 23: o dashboard de SUBGRUPO precisa exibir as métricas de upload
 * (catálogos/fotos/cotações/outros) contando APENAS os anexos dos fornecedores
 * que pertencem ao subgrupo. Como os fornecedores de subgrupo compartilham o
 * mesmo scope ("aquario"), a contagem é restrita por uma lista de supplierIds.
 *
 * Este teste reproduz de forma pura a lógica de `counts` do componente
 * UploadMetrics (client/src/shared/supplier-notes/UploadMetrics.tsx) para a
 * dimensão que mudou: o filtro `allowedIds`.
 */

type Category = "catalogos" | "fotos" | "cotacoes" | "outros";
interface Attachment {
  category: Category;
  addedAt: string; // dd/mm/yyyy
}
interface Entry {
  supplierId: string;
  attachments: Attachment[];
}

function parseAddedAt(s: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function countUploads(
  entries: Entry[],
  from: Date | null,
  to: Date | null,
  supplierIds?: string[],
): Record<Category, number> {
  const allowed = supplierIds ? new Set(supplierIds) : null;
  const c: Record<Category, number> = { catalogos: 0, fotos: 0, cotacoes: 0, outros: 0 };
  for (const e of entries) {
    if (allowed && !allowed.has(e.supplierId)) continue;
    for (const a of e.attachments) {
      const d = parseAddedAt(a.addedAt);
      if (!d) continue;
      if (from && d < from) continue;
      if (to && d > to) continue;
      c[a.category] += 1;
    }
  }
  return c;
}

const FROM = new Date(2026, 5, 1); // 01/06/2026
const TO = new Date(2026, 5, 30, 23, 59, 59, 999); // 30/06/2026

const entries: Entry[] = [
  // Fornecedor do subgrupo "coleiras"
  {
    supplierId: "s1",
    attachments: [
      { category: "catalogos", addedAt: "05/06/2026" },
      { category: "cotacoes", addedAt: "10/06/2026" },
    ],
  },
  // Outro fornecedor do MESMO scope, mas de OUTRO subgrupo
  {
    supplierId: "s2",
    attachments: [
      { category: "catalogos", addedAt: "06/06/2026" },
      { category: "fotos", addedAt: "07/06/2026" },
    ],
  },
  // Fornecedor do subgrupo "coleiras" com upload fora do período
  {
    supplierId: "s3",
    attachments: [
      { category: "fotos", addedAt: "15/05/2026" }, // maio — fora
      { category: "outros", addedAt: "20/06/2026" }, // junho — dentro
    ],
  },
];

describe("Métricas do subgrupo — contagem restrita por supplierIds (Feature 23)", () => {
  it("sem restrição conta todos os fornecedores do scope", () => {
    const c = countUploads(entries, FROM, TO);
    expect(c.catalogos).toBe(2); // s1 + s2
    expect(c.fotos).toBe(1); // s2 (s3 está fora do período)
    expect(c.cotacoes).toBe(1); // s1
    expect(c.outros).toBe(1); // s3
  });

  it("restrita ao subgrupo (s1, s3) ignora fornecedores de outros subgrupos (s2)", () => {
    const c = countUploads(entries, FROM, TO, ["s1", "s3"]);
    expect(c.catalogos).toBe(1); // só s1 (s2 excluído)
    expect(c.fotos).toBe(0); // s2 excluído; foto de s3 está em maio (fora)
    expect(c.cotacoes).toBe(1); // s1
    expect(c.outros).toBe(1); // s3 (junho)
  });

  it("subgrupo sem fornecedores resulta em zero em tudo", () => {
    const c = countUploads(entries, FROM, TO, []);
    expect(c.catalogos).toBe(0);
    expect(c.fotos).toBe(0);
    expect(c.cotacoes).toBe(0);
    expect(c.outros).toBe(0);
  });

  it("respeita o período mesmo dentro do subgrupo", () => {
    // Período só de maio: apenas a foto de s3 (15/05) entraria, mas s3 está no subgrupo.
    const mayFrom = new Date(2026, 4, 1);
    const mayTo = new Date(2026, 4, 31, 23, 59, 59, 999);
    const c = countUploads(entries, mayFrom, mayTo, ["s1", "s3"]);
    expect(c.fotos).toBe(1); // foto de maio de s3
    expect(c.catalogos).toBe(0);
    expect(c.outros).toBe(0);
  });
});
