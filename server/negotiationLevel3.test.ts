import { describe, it, expect } from "vitest";
import {
  buildNegotiationSuppliers,
  composeAddress,
  groupAttachmentsByCategory,
  groupAttachmentsByFolder,
  hasAnyTick,
  applyNegotiationFilter,
  EMPTY_FILTER,
  type NegotiationSupplierInput,
  type NegotiationNoteInput,
  type NegotiationSupplier,
} from "../client/src/shared/supplier-notes/negotiationAccesses";

const suppliers: NegotiationSupplierInput[] = [
  {
    id: "s1",
    name: "Ningbo Pet Co.",
    city: "Ningbo",
    province: "Zhejiang",
    address: "Rua A, 123",
  },
  { id: "s2", name: "Alpha Aqua", city: "Guangzhou", province: "Guangdong" },
  { id: "s3", name: "Beta Glass", city: null, province: null, address: null },
  { id: "s4", name: "Sem Ticagem", city: "Yiwu", province: "Zhejiang" },
];

const entries: Record<string, NegotiationNoteInput | undefined> = {
  // ticado: potencial alto + preço bom + status livre + resumo
  s1: {
    fields: {
      potencial: "alto",
      precoClassificacao: "bom",
      statusLivre: "Aguardando contrato",
      resumoNegociacao: "Boa conversa, enviou catálogo.",
    },
  },
  // ticado só por preço excelente, sem resumo
  s2: { fields: { precoClassificacao: "excelente" } },
  // ticado só por status livre
  s3: { fields: { statusLivre: "Visitar de novo" } },
  // NÃO ticado (campos vazios/whitespace)
  s4: { fields: { potencial: "  ", precoClassificacao: "", statusLivre: "" } },
};

describe("hasAnyTick", () => {
  it("considera ticado quem tem qualquer um dos três selos", () => {
    expect(hasAnyTick(entries.s1)).toBe(true);
    expect(hasAnyTick(entries.s2)).toBe(true);
    expect(hasAnyTick(entries.s3)).toBe(true);
  });
  it("ignora whitespace e undefined", () => {
    expect(hasAnyTick(entries.s4)).toBe(false);
    expect(hasAnyTick(undefined)).toBe(false);
  });
});

describe("composeAddress", () => {
  it("junta endereço, cidade e província sem duplicar", () => {
    expect(composeAddress(suppliers[0])).toBe("Rua A, 123, Ningbo, Zhejiang");
  });
  it("monta só com cidade/província quando não há address", () => {
    expect(composeAddress(suppliers[1])).toBe("Guangzhou, Guangdong");
  });
  it("retorna vazio quando não há nenhuma parte", () => {
    expect(composeAddress(suppliers[2])).toBe("");
  });
});

describe("buildNegotiationSuppliers", () => {
  const built = buildNegotiationSuppliers(suppliers, entries);

  it("inclui apenas os ticados (exclui s4)", () => {
    expect(built.map((b) => b.id).sort()).toEqual(["s1", "s2", "s3"]);
  });

  it("ordena por nome (acento-insensitive)", () => {
    expect(built.map((b) => b.name)).toEqual([
      "Alpha Aqua",
      "Beta Glass",
      "Ningbo Pet Co.",
    ]);
  });

  it("traz resumo só quando há texto", () => {
    const s1 = built.find((b) => b.id === "s1")!;
    const s2 = built.find((b) => b.id === "s2")!;
    expect(s1.resumo).toBe("Boa conversa, enviou catálogo.");
    expect(s2.resumo).toBeNull();
  });

  it("mapeia potencial, preço e status livre corretamente", () => {
    const s1 = built.find((b) => b.id === "s1")!;
    expect(s1.potencial).toBe("alto");
    expect(s1.preco).toBe("bom");
    expect(s1.statusLivre).toBe("Aguardando contrato");
  });

  it("preserva partes de endereço separadas (incl. distrito)", () => {
    const s1 = built.find((b) => b.id === "s1")!;
    expect(s1.address).toBe("Rua A, 123");
    expect(s1.city).toBe("Ningbo");
    expect(s1.province).toBe("Zhejiang");
    // s1 não tem distrito; deve ser null
    expect(s1.district).toBeNull();
  });
});

describe("groupAttachmentsByCategory", () => {
  it("agrupa por categoria preservando nomes completos", () => {
    const r = groupAttachmentsByCategory([
      { id: "a", name: "catalogo-2026.pdf", type: "", size: 0, addedAt: "", category: "catalogos" },
      { id: "b", name: "foto-fachada.jpg", type: "", size: 0, addedAt: "", category: "fotos" },
      { id: "c", name: "foto-galpao.jpg", type: "", size: 0, addedAt: "", category: "fotos" },
      { id: "d", name: "cotacao-fob.xlsx", type: "", size: 0, addedAt: "", category: "cotacoes" },
    ]);
    expect(r.catalogos.map((a) => a.name)).toEqual(["catalogo-2026.pdf"]);
    expect(r.fotos.map((a) => a.name)).toEqual(["foto-fachada.jpg", "foto-galpao.jpg"]);
    expect(r.cotacoes.map((a) => a.name)).toEqual(["cotacao-fob.xlsx"]);
    expect(r.outros).toEqual([]);
    // Preserva os OBJETOS completos (para visualizar/baixar), não só os nomes.
    expect(r.catalogos[0].id).toBe("a");
  });

  it("trata anexos sem categoria como 'outros' e ignora nomes vazios", () => {
    const r = groupAttachmentsByCategory([
      { id: "a", name: "legado.pdf", type: "", size: 0, addedAt: "" },
      { id: "b", name: "   ", type: "", size: 0, addedAt: "", category: "fotos" },
    ]);
    expect(r.outros.map((a) => a.name)).toEqual(["legado.pdf"]);
    expect(r.fotos).toEqual([]);
  });

  it("retorna todas as categorias vazias para nulo/indefinido", () => {
    const r = groupAttachmentsByCategory(null);
    expect(r).toEqual({ catalogos: [], fotos: [], cotacoes: [], outros: [] });
  });

  it("exclui anexos que pertencem a uma pasta nomeada", () => {
    const r = groupAttachmentsByCategory([
      { id: "a", name: "avulso.pdf", type: "", size: 0, addedAt: "", category: "catalogos" },
      { id: "b", name: "em-pasta.pdf", type: "", size: 0, addedAt: "", category: "catalogos", folder: "Documentos" },
    ]);
    expect(r.catalogos.map((a) => a.name)).toEqual(["avulso.pdf"]);
  });
});

describe("groupAttachmentsByFolder", () => {
  it("agrupa apenas anexos com pasta, preservando nomes e ordem", () => {
    const r = groupAttachmentsByFolder([
      { id: "a", name: "avulso.pdf", type: "", size: 0, addedAt: "", category: "catalogos" },
      { id: "b", name: "contrato.pdf", type: "", size: 0, addedAt: "", folder: "Documentos" },
      { id: "c", name: "nf.pdf", type: "", size: 0, addedAt: "", folder: "Documentos" },
      { id: "d", name: "foto.jpg", type: "", size: 0, addedAt: "", folder: "Fotos Fabrica" },
    ]);
    expect(r).toEqual([
      { name: "Documentos", items: [
        { id: "b", name: "contrato.pdf", type: "", size: 0, addedAt: "", folder: "Documentos" },
        { id: "c", name: "nf.pdf", type: "", size: 0, addedAt: "", folder: "Documentos" },
      ] },
      { name: "Fotos Fabrica", items: [
        { id: "d", name: "foto.jpg", type: "", size: 0, addedAt: "", folder: "Fotos Fabrica" },
      ] },
    ]);
  });

  it("retorna vazio quando não há anexos com pasta", () => {
    expect(groupAttachmentsByFolder([
      { id: "a", name: "x.pdf", type: "", size: 0, addedAt: "", category: "outros" },
    ])).toEqual([]);
    expect(groupAttachmentsByFolder(null)).toEqual([]);
  });
});

describe("buildNegotiationSuppliers — enriquecimento (tipo, parceiros, anexos)", () => {
  const sup: NegotiationSupplierInput[] = [
    {
      id: "e1",
      name: "Enriquecido Co.",
      city: "Guangzhou",
      province: "Guangdong",
      district: "Tianhe",
      address: "Av. Huabo, 101",
    },
  ];
  const ent: Record<string, NegotiationNoteInput | undefined> = {
    e1: {
      fields: {
        potencial: "alto",
        tipoFornecedor: "direto",
        parceirosChineses: JSON.stringify(["Betty", "Lilly"]),
      },
      attachments: [
        { id: "a", name: "catalogo.pdf", type: "", size: 0, addedAt: "", category: "catalogos" },
        { id: "b", name: "foto1.jpg", type: "", size: 0, addedAt: "", category: "fotos" },
        { id: "c", name: "foto2.jpg", type: "", size: 0, addedAt: "", category: "fotos" },
      ],
    },
  };
  const built = buildNegotiationSuppliers(sup, ent);
  const e1 = built[0];

  it("traz tipo de fornecedor", () => {
    expect(e1.tipoFornecedor).toBe("direto");
  });

  it("traz TODOS os parceiros chineses", () => {
    expect(e1.parceiros).toEqual(["Betty", "Lilly"]);
  });

  it("traz o distrito", () => {
    expect(e1.district).toBe("Tianhe");
  });

  it("agrupa anexos por categoria com contagem implícita pelos nomes", () => {
    expect(e1.anexos.catalogos.map((a) => a.name)).toEqual(["catalogo.pdf"]);
    expect(e1.anexos.fotos.map((a) => a.name)).toEqual(["foto1.jpg", "foto2.jpg"]);
    expect(e1.anexos.cotacoes).toEqual([]);
    expect(e1.anexos.outros).toEqual([]);
  });

  it("campos ausentes viram null/vazio sem quebrar", () => {
    const b2 = buildNegotiationSuppliers(
      [{ id: "x", name: "Vazio" }],
      { x: { fields: { statusLivre: "oi" } } },
    )[0];
    expect(b2.tipoFornecedor).toBeNull();
    expect(b2.parceiros).toEqual([]);
    expect(b2.anexos).toEqual({ catalogos: [], fotos: [], cotacoes: [], outros: [] });
  });
});

describe("applyNegotiationFilter", () => {
  const items: NegotiationSupplier[] = buildNegotiationSuppliers(
    suppliers,
    entries,
  );

  it("sem filtro retorna tudo", () => {
    expect(applyNegotiationFilter(items, EMPTY_FILTER)).toHaveLength(3);
  });

  it("filtra por potencial (alto)", () => {
    const res = applyNegotiationFilter(items, {
      ...EMPTY_FILTER,
      potencial: ["alto"],
    });
    expect(res.map((r) => r.id)).toEqual(["s1"]);
  });

  it("filtra por preço (excelente OU bom = OU dentro da dimensão)", () => {
    const res = applyNegotiationFilter(items, {
      ...EMPTY_FILTER,
      preco: ["excelente", "bom"],
    });
    expect(res.map((r) => r.id).sort()).toEqual(["s1", "s2"]);
  });

  it("filtra por status preenchido", () => {
    const res = applyNegotiationFilter(items, {
      ...EMPTY_FILTER,
      statusLivre: "com",
    });
    expect(res.map((r) => r.id).sort()).toEqual(["s1", "s3"]);
  });

  it("combina dimensões com AND (potencial alto E preço bom)", () => {
    const res = applyNegotiationFilter(items, {
      ...EMPTY_FILTER,
      potencial: ["alto"],
      preco: ["bom"],
    });
    expect(res.map((r) => r.id)).toEqual(["s1"]);
  });

  it("AND sem interseção retorna vazio (potencial alto E preço excelente)", () => {
    const res = applyNegotiationFilter(items, {
      ...EMPTY_FILTER,
      potencial: ["alto"],
      preco: ["excelente"],
    });
    expect(res).toHaveLength(0);
  });
});
