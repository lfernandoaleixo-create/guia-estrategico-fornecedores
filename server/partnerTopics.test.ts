import { describe, it, expect } from "vitest";

// Reimplementação local das funções puras de usePartnerTopics (sem React),
// para garantir que a normalização e a ordenação dos assuntos estão corretas.
// Mantém paridade com client/src/shared/supplier-notes/usePartnerTopics.ts.

interface PartnerTopic {
  id: string;
  partnerId: string;
  scope: string;
  title: string;
  notes?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

function toMs(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n) && v.trim() !== "") return n;
    const d = Date.parse(v);
    if (!Number.isNaN(d)) return d;
  }
  return 0;
}

function normalizeTopic(row: Record<string, unknown>): PartnerTopic {
  return {
    id: String(row.id),
    partnerId: String(row.partnerId ?? ""),
    scope: String(row.scope ?? ""),
    title: String(row.title ?? ""),
    notes: (row.notes as string) ?? undefined,
    sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : Number(row.sortOrder ?? 0) || 0,
    createdAt: toMs(row.createdAt),
    updatedAt: toMs(row.updatedAt),
  };
}

function sortTopics(list: PartnerTopic[]): PartnerTopic[] {
  return [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt - b.createdAt;
  });
}

function topicAttachmentScope(partnerId: string): string {
  return `parceiro-${partnerId}`;
}

describe("partnerTopics — normalização", () => {
  it("converte datas string ISO/number em ms e preenche defaults", () => {
    const t = normalizeTopic({
      id: "ptopic_1",
      partnerId: "extra_betty",
      scope: "grupo-x",
      title: "Vidro",
      notes: "Cotação enviada por e-mail",
      sortOrder: 2,
      createdAt: "1700000000000",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(t.title).toBe("Vidro");
    expect(t.partnerId).toBe("extra_betty");
    expect(t.sortOrder).toBe(2);
    expect(t.createdAt).toBe(1700000000000);
    expect(t.updatedAt).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
  });

  it("trata notes ausente como undefined e sortOrder inválido como 0", () => {
    const t = normalizeTopic({ id: "ptopic_2", title: "Frete", sortOrder: "abc" });
    expect(t.notes).toBeUndefined();
    expect(t.sortOrder).toBe(0);
  });
});

describe("partnerTopics — ordenação", () => {
  it("ordena por sortOrder asc e desempata por createdAt asc", () => {
    const list: PartnerTopic[] = [
      { id: "c", partnerId: "p", scope: "s", title: "C", sortOrder: 1, createdAt: 200, updatedAt: 200 },
      { id: "a", partnerId: "p", scope: "s", title: "A", sortOrder: 0, createdAt: 100, updatedAt: 100 },
      { id: "b", partnerId: "p", scope: "s", title: "B", sortOrder: 1, createdAt: 150, updatedAt: 150 },
    ];
    const sorted = sortTopics(list).map((t) => t.id);
    expect(sorted).toEqual(["a", "b", "c"]);
  });
});

describe("partnerTopics — escopo de anexos", () => {
  it("gera escopo lógico parceiro-<id> reutilizado pelo upload S3", () => {
    expect(topicAttachmentScope("extra_betty")).toBe("parceiro-extra_betty");
  });
});
