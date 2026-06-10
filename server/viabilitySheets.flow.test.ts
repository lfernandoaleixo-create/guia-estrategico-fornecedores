import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  computeRow,
  linkFornecedorPrice,
  makeEmptyRow,
  makeDefaultSheet,
  type ViabilityRow,
} from "../client/src/shared/supplier-notes/useViabilitySheet";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

function row(partial: Partial<ViabilityRow>): ViabilityRow {
  return { ...makeEmptyRow(), ...partial };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) Fórmulas da planilha (recriação do Excel enviado)
// ─────────────────────────────────────────────────────────────────────────────
describe("computeRow — fórmulas da planilha de viabilidade", () => {
  it("Preço Unit. Desejado = Pacote Desejado / Qtd", () => {
    expect(computeRow(row({ qtd: 30, precoPacoteDesejado: 60 })).precoUnitDesejado).toBeCloseTo(2, 6);
  });

  it("Preço Pacote Atual = Qtd * Preço Unit. Fornecedor", () => {
    expect(computeRow(row({ qtd: 30, precoUnitForn: 1.8 })).precoPacoteAtual).toBeCloseTo(54, 6);
  });

  it("Atende = SIM quando pacote atual < desejado", () => {
    const r = computeRow(row({ qtd: 30, precoUnitForn: 1.8, precoPacoteDesejado: 60 }));
    expect(r.precoPacoteAtual).toBeCloseTo(54, 6);
    expect(r.atende).toBe("SIM");
  });

  it("Atende = NÃO quando pacote atual >= desejado", () => {
    expect(computeRow(row({ qtd: 30, precoUnitForn: 2.5, precoPacoteDesejado: 60 })).atende).toBe("NÃO");
  });

  it("igualdade (atual == desejado) → NÃO", () => {
    expect(computeRow(row({ qtd: 10, precoUnitForn: 6, precoPacoteDesejado: 60 })).atende).toBe("NÃO");
  });

  it("não divide por zero (Qtd = 0 → desejado nulo)", () => {
    expect(computeRow(row({ qtd: 0, precoPacoteDesejado: 60 })).precoUnitDesejado).toBeNull();
  });

  it("linha vazia → cálculos nulos e Atende vazio", () => {
    const r = computeRow(makeEmptyRow());
    expect(r.precoUnitDesejado).toBeNull();
    expect(r.precoPacoteAtual).toBeNull();
    expect(r.atende).toBe("");
  });

  it("sem Pacote Desejado, Atende fica vazio mesmo com pacote atual", () => {
    const r = computeRow(row({ qtd: 30, precoUnitForn: 1.8 }));
    expect(r.precoPacoteAtual).toBeCloseTo(54, 6);
    expect(r.atende).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 1b) Vínculo bidirecional Preço Unit. Fornecedor ⇄ Preço Pacote Atual
// ─────────────────────────────────────────────────────────────────────────────────────────────────
describe("linkFornecedorPrice — vínculo unitário ⇄ pacote", () => {
  it("digita Preço Unit. Fornecedor → calcula Pacote Atual (unit * qtd)", () => {
    const r = linkFornecedorPrice(row({ qtd: 30 }), "unit", 1.66);
    expect(r.precoUnitForn).toBeCloseTo(1.66, 6);
    expect(r.precoPacoteAtual).toBeCloseTo(49.8, 6);
  });

  it("digita Preço Pacote Atual → calcula Unit. Fornecedor (pacote / qtd)", () => {
    const r = linkFornecedorPrice(row({ qtd: 30 }), "pacote", 49.8);
    expect(r.precoPacoteAtual).toBeCloseTo(49.8, 6);
    expect(r.precoUnitForn).toBeCloseTo(1.66, 6);
  });

  it("ida e volta são consistentes (unit → pacote → unit)", () => {
    const a = linkFornecedorPrice(row({ qtd: 50 }), "unit", 0.07);
    expect(a.precoPacoteAtual).toBeCloseTo(3.5, 6);
    const b = linkFornecedorPrice(a, "pacote", a.precoPacoteAtual!);
    expect(b.precoUnitForn).toBeCloseTo(0.07, 6);
  });

  it("sem Qtd: grava o valor digitado sem quebrar o outro campo (unit)", () => {
    const r = linkFornecedorPrice(row({ qtd: null, precoPacoteAtual: 10 }), "unit", 2);
    expect(r.precoUnitForn).toBe(2);
    expect(r.precoPacoteAtual).toBe(10);
  });

  it("Qtd = 0: ao digitar pacote não divide por zero (mantém unit)", () => {
    const r = linkFornecedorPrice(row({ qtd: 0, precoUnitForn: 5 }), "pacote", 100);
    expect(r.precoPacoteAtual).toBe(100);
    expect(r.precoUnitForn).toBe(5);
  });

  it("limpar o campo (null) propaga null mantendo o outro", () => {
    const r = linkFornecedorPrice(row({ qtd: 30, precoPacoteAtual: 49.8 }), "unit", null);
    expect(r.precoUnitForn).toBeNull();
    expect(r.precoPacoteAtual).toBe(49.8);
  });

  it("Pacote Atual editado alimenta o Atende? via computeRow", () => {
    const r = linkFornecedorPrice(row({ qtd: 30, precoPacoteDesejado: 60 }), "pacote", 54);
    const c = computeRow(r);
    expect(c.precoPacoteAtual).toBeCloseTo(54, 6);
    expect(c.atende).toBe("SIM");
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 2) Fluxo do router: get (vazio) → upsert → get → upsert (atualiza)
// ─────────────────────────────────────────────────────────────────────────────
describe("data.viabilitySheets flow", () => {
  it("salva, lê de volta e atualiza a planilha de um fornecedor", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const supplierId = `TESTE VIAB ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const scope = "tapete";

    // get inicial deve ser nulo
    const before = await caller.data.viabilitySheets.get({ scope, supplierId });
    expect(before).toBeNull();

    // monta uma planilha com 1 linha calculável
    const sheet = makeDefaultSheet(scope, supplierId);
    sheet.sections[0].title = "Tapete 60x80";
    sheet.sections[0].rows[0] = row({ qtd: 30, precoUnitForn: 1.8, precoPacoteDesejado: 60 });
    const now = String(Date.now());

    const up = await caller.data.viabilitySheets.upsert({
      scope,
      supplierId,
      data: JSON.stringify(sheet),
      createdAt: now,
      updatedAt: now,
    });
    expect(up).toEqual({ success: true });

    // lê de volta e valida o conteúdo persistido
    const saved = (await caller.data.viabilitySheets.get({ scope, supplierId })) as {
      scope: string;
      supplierId: string;
      data: string;
    } | null;
    expect(saved).toBeTruthy();
    expect(saved?.scope).toBe(scope);
    const parsed = JSON.parse(saved!.data);
    expect(parsed.sections[0].title).toBe("Tapete 60x80");
    expect(parsed.sections[0].rows[0].qtd).toBe(30);

    // confere que as fórmulas batem sobre o dado persistido
    const computed = computeRow(parsed.sections[0].rows[0]);
    expect(computed.precoPacoteAtual).toBeCloseTo(54, 6);
    expect(computed.atende).toBe("SIM");

    // atualiza (upsert no mesmo scope+supplierId não deve duplicar)
    sheet.sections[0].rows[0].precoUnitForn = 2.5; // agora pacote atual = 75 > 60 → NÃO
    const now2 = String(Date.now());
    await caller.data.viabilitySheets.upsert({
      scope,
      supplierId,
      data: JSON.stringify(sheet),
      createdAt: now,
      updatedAt: now2,
    });
    const saved2 = (await caller.data.viabilitySheets.get({ scope, supplierId })) as {
      data: string;
    } | null;
    const parsed2 = JSON.parse(saved2!.data);
    expect(computeRow(parsed2.sections[0].rows[0]).atende).toBe("NÃO");
  });
});
