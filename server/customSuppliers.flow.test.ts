import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Contexto público mínimo — os procedimentos de customSuppliers são publicProcedure.
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

describe("data.customSuppliers flow", () => {
  it("cria, lista por scope e remove um fornecedor manual", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const now = String(Date.now());
    const id = `custom-tapete-test-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const supplierName = `TESTE Fornecedor ${now}`;

    // 1) Cria (upsert) um fornecedor manual no scope "tapete"
    const upsertRes = await caller.data.customSuppliers.upsert({
      id,
      scope: "tapete",
      name: supplierName,
      data: JSON.stringify({ id, scope: "tapete", name: supplierName }),
      createdAt: now,
      updatedAt: now,
    });
    expect(upsertRes).toEqual({ success: true });

    // 2) Lista por scope e confirma que o registro aparece com o nome correto
    const list = await caller.data.customSuppliers.list({ scope: "tapete" });
    const found = (list as Array<{ id: string; scope: string; name: string }>).find(
      (s) => s.id === id,
    );
    expect(found).toBeTruthy();
    expect(found?.scope).toBe("tapete");
    expect(found?.name).toBe(supplierName);

    // 3) Remove e confirma que não aparece mais
    const delRes = await caller.data.customSuppliers.delete({ id });
    expect(delRes).toEqual({ success: true });

    const listAfter = await caller.data.customSuppliers.list({ scope: "tapete" });
    const stillThere = (listAfter as Array<{ id: string }>).some((s) => s.id === id);
    expect(stillThere).toBe(false);
  });
});
