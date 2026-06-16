// =============================================================================
// Testes dos helpers PUROS de migração de um fornecedor do Yiwu para um MACRO.
// Cobrem os dois tipos de destino (CustomSupplier e ExtraSupplier), a montagem
// da nota completa (com herança de histórico + marcação de especialidade) e o
// rótulo hierárquico do destino.
// =============================================================================
import { describe, it, expect } from "vitest";
import {
  buildMigratedSupplierPayload,
  buildMigratedExtraSupplierPayload,
  buildFullMigratedNote,
  destinationLabel,
  type MigrateToMacroContext,
} from "../client/src/shared/supplier-notes/migrateToMacro";
import type { SupplierNoteEntry } from "../client/src/shared/supplier-notes/useSupplierNotes";

const ctx: MigrateToMacroContext = {
  supplierName: "Hongchen Firm",
  chineseName: "宏辰",
  category: "Marmitas",
  city: "Yiwu",
  province: "Zhejiang",
  address: "Distrito 5, Portão 12",
  contactName: "Li Wei",
  email: "li@hongchen.cn",
  phone: "+86 139 0000 0000",
  website: "https://hongchen.cn",
};

const sourceEntry: SupplierNoteEntry = {
  supplierId: "yiwu-1",
  status: "negociando",
  observacoes: "Boa qualidade, pediu amostra.",
  fields: { foo: "bar" },
  attachments: [
    {
      id: "att-1",
      name: "catalogo.pdf",
      type: "application/pdf",
      size: 1234,
      url: "/manus-storage/abc.pdf",
      fileKey: "abc.pdf",
      addedAt: "01/06/2026",
      category: "catalogos",
    },
  ],
  quoteRows: [
    {
      id: "q1",
      produto: "Marmita 750ml",
      qtd: "5000",
      moq: "3000",
      precoFob: "0.32",
      leadTime: "30d",
      pagamento: "30/70",
      observacao: "amostra ok",
    },
  ],
  groupIds: ["g1"],
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-10T10:00:00.000Z",
};

describe("buildMigratedSupplierPayload", () => {
  it("mapeia os campos do contexto para CustomSupplier e herda observações", () => {
    const p = buildMigratedSupplierPayload(ctx, sourceEntry, 111);
    expect(p.name).toBe("Hongchen Firm");
    expect(p.chineseName).toBe("宏辰");
    expect(p.category).toBe("Marmitas");
    expect(p.city).toBe("Yiwu");
    expect(p.province).toBe("Zhejiang");
    expect(p.address).toBe("Distrito 5, Portão 12");
    expect(p.contactName).toBe("Li Wei");
    expect(p.phones).toEqual([{ id: "mp-111", label: "Telefone", value: "+86 139 0000 0000" }]);
    expect(p.emails).toEqual([{ id: "me-111", value: "li@hongchen.cn" }]);
    expect(p.links).toEqual([{ id: "ml-111", value: "https://hongchen.cn" }]);
    expect(p.notes).toBe("Boa qualidade, pediu amostra.");
  });

  it("usa nome padrão e listas vazias quando faltam dados", () => {
    const p = buildMigratedSupplierPayload({ supplierName: "  " }, undefined, 5);
    expect(p.name).toBe("Fornecedor");
    expect(p.phones).toEqual([]);
    expect(p.emails).toEqual([]);
    expect(p.links).toEqual([]);
    expect(p.notes).toBeUndefined();
  });

  it("ignora campos em branco (apenas espaços)", () => {
    const p = buildMigratedSupplierPayload(
      { supplierName: "X", phone: "   ", email: "", website: "  " },
      undefined,
      2,
    );
    expect(p.phones).toEqual([]);
    expect(p.emails).toEqual([]);
    expect(p.links).toEqual([]);
  });
});

describe("buildMigratedExtraSupplierPayload", () => {
  it("inclui o groupId e mapeia os campos para ExtraSupplier", () => {
    const p = buildMigratedExtraSupplierPayload(ctx, "grp_123", sourceEntry, 222);
    expect(p.groupId).toBe("grp_123");
    expect(p.name).toBe("Hongchen Firm");
    expect(p.phones).toEqual([{ id: "mp-222", label: "Telefone", value: "+86 139 0000 0000" }]);
    expect(p.emails).toEqual([{ id: "me-222", value: "li@hongchen.cn" }]);
    expect(p.notes).toBe("Boa qualidade, pediu amostra.");
  });
});

describe("buildFullMigratedNote", () => {
  it("herda status, observações, anexos, cotações e grupos da origem", () => {
    const note = buildFullMigratedNote("dest-9", sourceEntry, {}, "2026-06-16T00:00:00.000Z");
    expect(note.supplierId).toBe("dest-9");
    expect(note.status).toBe("negociando");
    expect(note.observacoes).toBe("Boa qualidade, pediu amostra.");
    expect(note.attachments).toHaveLength(1);
    expect(note.quoteRows).toHaveLength(1);
    expect(note.groupIds).toEqual(["g1"]);
    expect(note.fields.foo).toBe("bar");
    expect(note.createdAt).toBe("2026-06-01T10:00:00.000Z");
    expect(note.updatedAt).toBe("2026-06-16T00:00:00.000Z");
  });

  it("grava a especialidade do Aquário em fields.subtipoAquario", () => {
    const note = buildFullMigratedNote(
      "dest-10",
      sourceEntry,
      { subtipoAquario: "terrario" },
      "2026-06-16T00:00:00.000Z",
    );
    expect(note.fields.subtipoAquario).toBe("terrario");
    expect(note.fields.foo).toBe("bar");
  });

  it("usa defaults seguros quando não há nota de origem", () => {
    const note = buildFullMigratedNote("dest-11", undefined, {}, "2026-06-16T00:00:00.000Z");
    expect(note.status).toBe("nao-visitado");
    expect(note.observacoes).toBe("");
    expect(note.attachments).toEqual([]);
    expect(note.quoteRows).toEqual([]);
    expect(note.groupIds).toEqual([]);
    expect(note.createdAt).toBe("2026-06-16T00:00:00.000Z");
  });
});

describe("destinationLabel", () => {
  it("monta o rótulo hierárquico macro.sub · nome", () => {
    expect(destinationLabel(2, 1, "Marmita Plástica")).toBe("2.1 · Marmita Plástica");
    expect(destinationLabel(3, 4, "Joias")).toBe("3.4 · Joias");
  });
});
