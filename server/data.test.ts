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
