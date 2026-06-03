import { afterAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { customGroups, extraSuppliers, supplierNotes } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Contexto público (sem usuário) — os dados são compartilhados.
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const caller = appRouter.createCaller(createPublicContext());

const TEST_GROUP_ID = "cgrp_test_vitest";
const TEST_SUPPLIER_ID = "extra_test_vitest";
const TEST_SCOPE = "grupo-test-vitest";
const TEST_NOTE_SUPPLIER = "supplier-note-vitest";

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  await db.delete(customGroups).where(eq(customGroups.id, TEST_GROUP_ID));
  await db.delete(extraSuppliers).where(eq(extraSuppliers.id, TEST_SUPPLIER_ID));
  await db.delete(supplierNotes).where(eq(supplierNotes.scope, TEST_SCOPE));
});

describe("data.groups", () => {
  it("creates, lists and deletes a custom group", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("DB unavailable, skipping");
      return;
    }
    const now = new Date().toISOString();
    await caller.data.groups.upsert({
      id: TEST_GROUP_ID,
      number: 99,
      name: "Grupo Vitest",
      branch: "Teste",
      color: "#ff0000",
      description: "desc",
      promotedToDashboard: false,
      createdAt: now,
      updatedAt: now,
    });

    const list = await caller.data.groups.list();
    const found = list.find((g) => g.id === TEST_GROUP_ID);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Grupo Vitest");

    await caller.data.groups.delete({ id: TEST_GROUP_ID });
    const after = await caller.data.groups.list();
    expect(after.find((g) => g.id === TEST_GROUP_ID)).toBeUndefined();
  });
});

describe("data.suppliers", () => {
  it("creates, lists and deletes an extra supplier with contacts", async () => {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString();
    await caller.data.suppliers.upsert({
      id: TEST_SUPPLIER_ID,
      groupId: TEST_GROUP_ID,
      name: "Fornecedor Vitest",
      phones: [{ id: "p1", label: "WhatsApp", value: "+86 123" }],
      emails: [],
      links: [],
      createdAt: now,
      updatedAt: now,
    });

    const list = await caller.data.suppliers.list();
    const found = list.find((s) => s.id === TEST_SUPPLIER_ID);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Fornecedor Vitest");
    expect(Array.isArray(found?.phones)).toBe(true);

    await caller.data.suppliers.delete({ id: TEST_SUPPLIER_ID });
    const after = await caller.data.suppliers.list();
    expect(after.find((s) => s.id === TEST_SUPPLIER_ID)).toBeUndefined();
  });
});

describe("data.notes", () => {
  it("upserts a note and reads it back by scope; upsert is idempotent", async () => {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString();
    await caller.data.notes.upsert({
      scope: TEST_SCOPE,
      supplierId: TEST_NOTE_SUPPLIER,
      status: "negociando",
      observacoes: "primeira",
      fields: { contato: "Li" },
      attachments: "[]",
      groupIds: [],
      createdAt: now,
      updatedAt: now,
    });

    let byScope = await caller.data.notes.listByScope({ scope: TEST_SCOPE });
    expect(byScope).toHaveLength(1);
    expect(byScope[0]?.status).toBe("negociando");

    // upsert novamente (mesmo scope+supplierId) NÃO deve duplicar
    await caller.data.notes.upsert({
      scope: TEST_SCOPE,
      supplierId: TEST_NOTE_SUPPLIER,
      status: "fornecedor-aprovado",
      observacoes: "atualizada",
      fields: {},
      attachments: "[]",
      groupIds: [],
      createdAt: now,
      updatedAt: new Date().toISOString(),
    });

    byScope = await caller.data.notes.listByScope({ scope: TEST_SCOPE });
    expect(byScope).toHaveLength(1);
    expect(byScope[0]?.status).toBe("fornecedor-aprovado");

    await caller.data.notes.delete({ scope: TEST_SCOPE, supplierId: TEST_NOTE_SUPPLIER });
    const after = await caller.data.notes.listByScope({ scope: TEST_SCOPE });
    expect(after).toHaveLength(0);
  });
});

describe("data.supplierGroups", () => {
  const SG_ID = "grp_test_vitest";
  it("creates, lists, updates and deletes a shared supplier group", async () => {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString();
    await caller.data.supplierGroups.upsert({
      id: SG_ID,
      number: 77,
      name: "Grupo Compartilhado Vitest",
      legend: "legenda teste",
      color: "#3b82f6",
      createdAt: now,
      updatedAt: now,
    });

    let list = await caller.data.supplierGroups.list();
    let found = list.find((g) => g.id === SG_ID);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Grupo Compartilhado Vitest");
    expect(found?.number).toBe(77);

    // upsert idempotente (atualiza nome, não duplica)
    await caller.data.supplierGroups.upsert({
      id: SG_ID,
      number: 77,
      name: "Grupo Renomeado",
      legend: "nova legenda",
      color: "#10b981",
      createdAt: now,
      updatedAt: new Date().toISOString(),
    });
    list = await caller.data.supplierGroups.list();
    const occurrences = list.filter((g) => g.id === SG_ID);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]?.name).toBe("Grupo Renomeado");

    await caller.data.supplierGroups.delete({ id: SG_ID });
    list = await caller.data.supplierGroups.list();
    expect(list.find((g) => g.id === SG_ID)).toBeUndefined();
  });

  it("bulkUpsert seeds multiple groups at once", async () => {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString();
    const ids = ["grp_bulk_a_vitest", "grp_bulk_b_vitest"];
    await caller.data.supplierGroups.bulkUpsert([
      { id: ids[0], number: 81, name: "Bulk A", legend: "", color: "#f97316", createdAt: now, updatedAt: now },
      { id: ids[1], number: 82, name: "Bulk B", legend: "", color: "#ef4444", createdAt: now, updatedAt: now },
    ]);
    const list = await caller.data.supplierGroups.list();
    expect(list.find((g) => g.id === ids[0])).toBeDefined();
    expect(list.find((g) => g.id === ids[1])).toBeDefined();
    await caller.data.supplierGroups.delete({ id: ids[0] });
    await caller.data.supplierGroups.delete({ id: ids[1] });
  });
});

describe("migration flow (notes between scopes)", () => {
  const FROM_SCOPE = "aquario";
  const TO_SCOPE = "tapete";
  const SRC_ID = "mig-src-vitest";
  const DST_ID = `migrated-${FROM_SCOPE}-${SRC_ID}`;

  afterAll(async () => {
    await caller.data.notes.delete({ scope: FROM_SCOPE, supplierId: SRC_ID }).catch(() => {});
    await caller.data.notes.delete({ scope: TO_SCOPE, supplierId: DST_ID }).catch(() => {});
  });

  it("moves a note from one dashboard scope to another preserving history", async () => {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString();

    // 1) cria nota na origem com histórico (status + observações)
    await caller.data.notes.upsert({
      scope: FROM_SCOPE,
      supplierId: SRC_ID,
      status: "negociando",
      observacoes: "histórico importante",
      fields: { contato: "Wang" },
      attachments: "[]",
      groupIds: [],
      createdAt: now,
      updatedAt: now,
    });

    // 2) migra: cria no destino com mesmo histórico e remove da origem
    const src = (await caller.data.notes.listByScope({ scope: FROM_SCOPE })).find(
      (n) => n.supplierId === SRC_ID,
    );
    expect(src).toBeDefined();
    await caller.data.notes.upsert({
      scope: TO_SCOPE,
      supplierId: DST_ID,
      status: src!.status,
      observacoes: src!.observacoes ?? "",
      fields: (src!.fields as Record<string, string>) ?? {},
      attachments: "[]",
      groupIds: [],
      createdAt: now,
      updatedAt: new Date().toISOString(),
    });
    await caller.data.notes.delete({ scope: FROM_SCOPE, supplierId: SRC_ID });

    // 3) verifica: origem vazia, destino com o histórico preservado
    const fromAfter = (await caller.data.notes.listByScope({ scope: FROM_SCOPE })).find(
      (n) => n.supplierId === SRC_ID,
    );
    expect(fromAfter).toBeUndefined();
    const dst = (await caller.data.notes.listByScope({ scope: TO_SCOPE })).find(
      (n) => n.supplierId === DST_ID,
    );
    expect(dst).toBeDefined();
    expect(dst?.status).toBe("negociando");
    expect(dst?.observacoes).toBe("histórico importante");
  });
});

describe("backup v3 coverage (custom groups + extra suppliers persist)", () => {
  const BK_GROUP = "cgrp_backup_vitest";
  const BK_SUPPLIER = "extra_backup_vitest";

  afterAll(async () => {
    await caller.data.suppliers.delete({ id: BK_SUPPLIER }).catch(() => {});
    await caller.data.groups.delete({ id: BK_GROUP }).catch(() => {});
  });

  it("persists a custom group and its extra supplier so backup can export both", async () => {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString();

    await caller.data.groups.upsert({
      id: BK_GROUP,
      number: 60,
      name: "Grupo Backup",
      branch: "Vidro",
      color: "#06b6d4",
      description: "backup test",
      promotedToDashboard: false,
      createdAt: now,
      updatedAt: now,
    });
    await caller.data.suppliers.upsert({
      id: BK_SUPPLIER,
      groupId: BK_GROUP,
      name: "Fornecedor Backup",
      phones: [{ id: "p1", value: "+86 777" }],
      emails: [],
      links: [],
      createdAt: now,
      updatedAt: now,
    });

    // backup v3 lê de groups.list + suppliers.list — confirmamos que ambos retornam
    const groups = await caller.data.groups.list();
    const suppliers = await caller.data.suppliers.list();
    const g = groups.find((x) => x.id === BK_GROUP);
    const s = suppliers.find((x) => x.id === BK_SUPPLIER);
    expect(g).toBeDefined();
    expect(g?.name).toBe("Grupo Backup");
    expect(s).toBeDefined();
    expect(s?.groupId).toBe(BK_GROUP);
    expect(Array.isArray(s?.phones)).toBe(true);
  });
});

describe("data.notes attachments (JSON persistence)", () => {
  const ATT_SCOPE = "scope-attach-vitest";
  const ATT_SUPPLIER = "supplier-attach-vitest";

  afterAll(async () => {
    await caller.data.notes
      .delete({ scope: ATT_SCOPE, supplierId: ATT_SUPPLIER })
      .catch(() => {});
  });

  it("saves and reads back attachments stored as JSON, then updates the set", async () => {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString();

    const attachments = [
      {
        id: "att-1",
        name: "catalogo.pdf",
        type: "application/pdf",
        size: 1234,
        category: "catalogo",
        dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
        addedAt: now,
      },
      {
        id: "att-2",
        name: "foto.png",
        type: "image/png",
        size: 5678,
        category: "fotos",
        dataUrl: "data:image/png;base64,iVBORw0KGgo=",
        addedAt: now,
      },
    ];

    // 1) cria nota com 2 anexos (serializados como JSON string)
    await caller.data.notes.upsert({
      scope: ATT_SCOPE,
      supplierId: ATT_SUPPLIER,
      status: "negociando",
      observacoes: "com anexos",
      fields: {},
      attachments: JSON.stringify(attachments),
      groupIds: [],
      createdAt: now,
      updatedAt: now,
    });

    // 2) lê de volta e confirma que os 2 anexos persistiram íntegros
    const list = await caller.data.notes.listByScope({ scope: ATT_SCOPE });
    const note = list.find((n) => n.supplierId === ATT_SUPPLIER);
    expect(note).toBeDefined();
    const parsed =
      typeof note!.attachments === "string"
        ? JSON.parse(note!.attachments)
        : note!.attachments;
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    const byId = Object.fromEntries(parsed.map((a: { id: string }) => [a.id, a]));
    expect(byId["att-1"].name).toBe("catalogo.pdf");
    expect(byId["att-1"].category).toBe("catalogo");
    expect(byId["att-1"].dataUrl).toContain("base64,");
    expect(byId["att-2"].type).toBe("image/png");

    // 3) atualiza removendo 1 anexo (mantém apenas att-2)
    await caller.data.notes.upsert({
      scope: ATT_SCOPE,
      supplierId: ATT_SUPPLIER,
      status: "negociando",
      observacoes: "com anexos",
      fields: {},
      attachments: JSON.stringify([attachments[1]]),
      groupIds: [],
      createdAt: now,
      updatedAt: new Date().toISOString(),
    });
    const list2 = await caller.data.notes.listByScope({ scope: ATT_SCOPE });
    const note2 = list2.find((n) => n.supplierId === ATT_SUPPLIER);
    const parsed2 =
      typeof note2!.attachments === "string"
        ? JSON.parse(note2!.attachments)
        : note2!.attachments;
    expect(parsed2).toHaveLength(1);
    expect(parsed2[0].id).toBe("att-2");
  });
});

describe("seedSupplierGroups (idempotent fixed groups)", () => {
  it("ensures the two fixed groups exist and is safe to run repeatedly", async () => {
    const db = await getDb();
    if (!db) return;
    const { seedSupplierGroups } = await import("./db");
    // roda duas vezes para provar idempotência
    await seedSupplierGroups();
    await seedSupplierGroups();
    const list = await caller.data.supplierGroups.list();
    const aquario = list.filter((g) => g.id === "grp_seed_aquario_terrario");
    const tapete = list.filter((g) => g.id === "grp_seed_tapete_higienico");
    expect(aquario).toHaveLength(1);
    expect(tapete).toHaveLength(1);
    expect(aquario[0]?.number).toBe(1);
    expect(tapete[0]?.number).toBe(2);
  });
});

describe("data.customSuppliers", () => {
  const CS_ID = "custom-aquario-vitest";
  const CS_SCOPE = "aquario";
  it("creates, lists by scope, updates and deletes a custom supplier", async () => {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString();
    const payload = {
      id: CS_ID,
      scope: CS_SCOPE,
      name: "Fábrica Vitest",
      data: JSON.stringify({
        id: CS_ID,
        scope: CS_SCOPE,
        name: "Fábrica Vitest",
        phones: [{ id: "p1", value: "+86 999" }],
        emails: [],
        links: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
      createdAt: now,
      updatedAt: now,
    };
    await caller.data.customSuppliers.upsert(payload);

    let list = await caller.data.customSuppliers.list({ scope: CS_SCOPE });
    let found = list.find((s) => s.id === CS_ID);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Fábrica Vitest");

    // idempotente
    await caller.data.customSuppliers.upsert({
      ...payload,
      name: "Fábrica Renomeada",
      data: JSON.stringify({ id: CS_ID, scope: CS_SCOPE, name: "Fábrica Renomeada", phones: [], emails: [], links: [], createdAt: Date.now(), updatedAt: Date.now() }),
      updatedAt: new Date().toISOString(),
    });
    list = await caller.data.customSuppliers.list({ scope: CS_SCOPE });
    const occurrences = list.filter((s) => s.id === CS_ID);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]?.name).toBe("Fábrica Renomeada");

    await caller.data.customSuppliers.delete({ id: CS_ID });
    list = await caller.data.customSuppliers.list({ scope: CS_SCOPE });
    expect(list.find((s) => s.id === CS_ID)).toBeUndefined();
  });
});

describe("cadastro embutido no dashboard promovido (supplier vinculado ao groupId)", () => {
  const G_ID = "cgrp_inline_vitest";
  const S_ID = "extra_inline_vitest";

  afterAll(async () => {
    await caller.data.suppliers.delete({ id: S_ID }).catch(() => {});
    await caller.data.groups.delete({ id: G_ID }).catch(() => {});
  });

  it("cria fornecedor já com o groupId do dashboard e ele aparece filtrado por grupo", async () => {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString();

    // grupo promovido a dashboard
    await caller.data.groups.upsert({
      id: G_ID,
      number: 90,
      name: "Joias Inline",
      branch: "Joias",
      color: "#eab308",
      description: "dashboard promovido",
      promotedToDashboard: true,
      createdAt: now,
      updatedAt: now,
    });

    // cadastro embutido: fornecedor nasce já com o groupId deste dashboard
    await caller.data.suppliers.upsert({
      id: S_ID,
      groupId: G_ID,
      name: "Shenzhen Gold Jewelry Co.",
      category: "Joias / Banhado a ouro",
      city: "Shenzhen",
      moq: "100 kits",
      phones: [],
      emails: [],
      links: [],
      createdAt: now,
      updatedAt: now,
    });

    // a listagem geral deve trazer o fornecedor vinculado ao grupo correto
    const all = await caller.data.suppliers.list();
    const mine = all.filter((s) => s.groupId === G_ID);
    expect(mine).toHaveLength(1);
    expect(mine[0]?.id).toBe(S_ID);
    expect(mine[0]?.name).toBe("Shenzhen Gold Jewelry Co.");
    // os dados do cadastro ficam disponíveis para o painel do Diário (prefilled)
    expect(mine[0]?.category).toBe("Joias / Banhado a ouro");
    expect(mine[0]?.city).toBe("Shenzhen");
    expect(mine[0]?.moq).toBe("100 kits");
  });
});

describe("data.notes groupIds (chips de grupo no card do Diário)", () => {
  const GI_SCOPE = "scope-groupids-vitest";
  const GI_SUPPLIER = "supplier-groupids-vitest";

  afterAll(async () => {
    await caller.data.notes
      .delete({ scope: GI_SCOPE, supplierId: GI_SUPPLIER })
      .catch(() => {});
  });

  it("persiste os groupIds marcados (mistura de grupo compartilhado + personalizado) e atualiza a seleção", async () => {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString();

    const shared = "grp_seed_aquario_terrario"; // grupo compartilhado fixo
    const custom = "cgrp_chip_vitest"; // grupo personalizado

    // 1) salva nota com seleção mista de grupos
    await caller.data.notes.upsert({
      scope: GI_SCOPE,
      supplierId: GI_SUPPLIER,
      status: "negociando",
      observacoes: "",
      fields: {},
      attachments: "[]",
      groupIds: [shared, custom],
      createdAt: now,
      updatedAt: now,
    });

    let list = await caller.data.notes.listByScope({ scope: GI_SCOPE });
    let note = list.find((n) => n.supplierId === GI_SUPPLIER);
    expect(note).toBeDefined();
    const ids =
      typeof note!.groupIds === "string"
        ? JSON.parse(note!.groupIds)
        : note!.groupIds;
    expect(Array.isArray(ids)).toBe(true);
    expect(ids).toContain(shared);
    expect(ids).toContain(custom);
    expect(ids).toHaveLength(2);

    // 2) atualiza removendo o compartilhado (mantém só o personalizado)
    await caller.data.notes.upsert({
      scope: GI_SCOPE,
      supplierId: GI_SUPPLIER,
      status: "negociando",
      observacoes: "",
      fields: {},
      attachments: "[]",
      groupIds: [custom],
      createdAt: now,
      updatedAt: new Date().toISOString(),
    });

    list = await caller.data.notes.listByScope({ scope: GI_SCOPE });
    note = list.find((n) => n.supplierId === GI_SUPPLIER);
    const ids2 =
      typeof note!.groupIds === "string"
        ? JSON.parse(note!.groupIds)
        : note!.groupIds;
    expect(ids2).toHaveLength(1);
    expect(ids2[0]).toBe(custom);
  });
});
