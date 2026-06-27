import { describe, it, expect } from "vitest";
import { computeImportCost } from "../client/src/shared/supplier-notes/importTax";
import {
  buildSteps,
  buildReportHtml,
  buildSavePayload,
  parseImportedSnapshot,
  compareScenarios,
  type CalcSnapshot,
} from "../client/src/shared/supplier-notes/calcReport";

function makeSnapshot(): CalcSnapshot {
  const input = {
    cotacao: 5.4,
    precoUnitUSD: 0.85,
    quantidade: 5000,
    ciPct: 60,
    iiPct: 14.4,
    ipiPct: 3.25,
    pisPct: 2.1,
    cofinsPct: 9.65,
    seguroPct: 0.4,
    freteMaritimoUSD: 3500,
    freteTerrestreBRL: 2000,
    comissaoPct: 5,
    afrmmPct: 8,
    siscomexBRL: 200,
    despesasPortoBRL: 3500,
  };
  const result = computeImportCost(input);
  return { nome: "Tapete higiênico", ncm: "4818.90.90", ncmObs: undefined, input, result, geradoEm: 1_700_000_000_000 };
}

describe("calcReport — memória de cálculo (passo a passo)", () => {
  it("gera exatamente 15 passos na ordem da cadeia (com seguro e despesas portuárias)", () => {
    const steps = buildSteps(makeSnapshot());
    expect(steps.length).toBe(15);
    expect(steps[0].titulo).toContain("Valor real total");
    expect(steps[2].titulo).toContain("Seguro");
    expect(steps[3].titulo).toContain("Valor aduaneiro");
    expect(steps[4].titulo).toContain("II");
    expect(steps[5].titulo).toContain("IPI");
    expect(steps[8].titulo).toContain("ICMS");
    expect(steps[14].titulo).toContain("Custo por unidade");
  });

  it("o passo do seguro mostra a base declarada × seguro%", () => {
    const steps = buildSteps(makeSnapshot());
    const seguro = steps.find((s) => s.titulo.includes("Seguro"))!;
    expect(seguro.formula).toContain("base declarada");
  });

  it("o valor aduaneiro inclui frete e seguro", () => {
    const steps = buildSteps(makeSnapshot());
    const va = steps.find((s) => s.titulo.includes("Valor aduaneiro"))!;
    expect(va.formula).toContain("seguro");
  });

  it("o passo do IPI mostra a cascata (valor aduaneiro + II)", () => {
    const steps = buildSteps(makeSnapshot());
    const ipi = steps.find((s) => s.titulo.includes("IPI"))!;
    expect(ipi.formula).toContain("valor aduaneiro + II");
  });

  it("PIS e COFINS usam as alíquotas de importação (2,1% e 9,65%)", () => {
    const steps = buildSteps(makeSnapshot());
    const pis = steps.find((s) => s.titulo.includes("PIS"))!;
    const cofins = steps.find((s) => s.titulo.includes("COFINS"))!;
    expect(pis.conta).toContain("2,1%");
    expect(cofins.conta).toContain("9,65%");
  });

  it("o passo do ICMS deixa claro que é zero pelo TTS", () => {
    const steps = buildSteps(makeSnapshot());
    const icms = steps.find((s) => s.titulo.includes("ICMS"))!;
    expect(icms.titulo).toContain("TTS");
    expect(icms.resultado).toBe("R$ 0,00");
  });

  it("o custo total inclui despesas portuárias", () => {
    const steps = buildSteps(makeSnapshot());
    const total = steps.find((s) => s.titulo.includes("Custo total"))!;
    expect(total.formula).toContain("despesas portuárias");
  });

  it("o último passo reflete o custo unitário calculado", () => {
    const snap = makeSnapshot();
    const steps = buildSteps(snap);
    const ultimo = steps[steps.length - 1];
    expect(ultimo.resultado).toBe(
      snap.result.custoUnitarioBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    );
    expect(snap.result.custoUnitarioBRL).toBeGreaterThan(0);
  });
});

describe("calcReport — HTML e payload de salvamento", () => {
  it("o HTML contém os blocos principais e os valores", () => {
    const html = buildReportHtml(makeSnapshot());
    expect(html).toContain("Simulação de Custo de Importação");
    expect(html).toContain("Parâmetros usados");
    expect(html).toContain("Detalhamento tributário");
    expect(html).toContain("Como o cálculo foi feito");
    expect(html).toContain("4818.90.90");
    expect(html).toContain("Tapete higiênico");
    expect(html).toContain("TTS");
    expect(html).toContain("Seguro");
    expect(html).toContain("Despesas portuárias");
  });

  it("o HTML escapa caracteres especiais do nome do produto", () => {
    const snap = makeSnapshot();
    snap.nome = 'Tapete <b> & "premium"';
    const html = buildReportHtml(snap);
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("&amp;");
    expect(html).not.toContain("<b> &");
  });

  it("o payload salvo é JSON válido e identifica o tipo", () => {
    const snap = makeSnapshot();
    const payload = buildSavePayload(snap);
    const parsed = JSON.parse(payload);
    expect(parsed.kind).toBe("import-cost-simulation");
    expect(parsed.version).toBe(1);
    expect(parsed.ncm).toBe("4818.90.90");
    expect(parsed.input.quantidade).toBe(5000);
    expect(parsed.input.seguroPct).toBe(0.4);
    expect(parsed.input.despesasPortoBRL).toBe(3500);
    expect(parsed.result.custoUnitarioBRL).toBeGreaterThan(0);
  });
});

describe("calcReport — modo do frete marítimo (CI vs pago ao chinês)", () => {
  function makeSnapshotChines(): CalcSnapshot {
    const base = makeSnapshot();
    const input = { ...base.input, freteMaritimoModo: "chines" as const };
    return { ...base, input, result: computeImportCost(input) };
  }

  it("o passo do valor aduaneiro indica que o frete fica fora quando pago ao chinês", () => {
    const steps = buildSteps(makeSnapshotChines());
    const va = steps.find((s) => s.titulo.includes("Valor aduaneiro"))!;
    expect(va.titulo).toContain("chinês");
    expect(va.formula).toContain("frete fora");
  });

  it("no modo CI o passo do valor aduaneiro mantém frete + seguro", () => {
    const steps = buildSteps(makeSnapshot());
    const va = steps.find((s) => s.titulo.includes("Valor aduaneiro"))!;
    expect(va.formula).toContain("frete marítimo");
    expect(va.formula).toContain("seguro");
  });

  it("o HTML mostra a entrada do frete (Pago ao chinês) e o valor aduaneiro sem imposto", () => {
    const html = buildReportHtml(makeSnapshotChines());
    expect(html).toContain("Pago ao chinês (sem imposto)");
    expect(html).toContain("frete fora");
  });

  it("o HTML no modo CI mostra a entrada do frete (Dentro da CI)", () => {
    const html = buildReportHtml(makeSnapshot());
    expect(html).toContain("Dentro da CI (com imposto)");
  });

  it("frete pago ao chinês reduz os tributos no relatório (vs CI)", () => {
    const ci = makeSnapshot();
    const chines = makeSnapshotChines();
    expect(chines.result.tributosUSD).toBeLessThan(ci.result.tributosUSD);
  });
});

describe("calcReport — importar simulação salva (.json)", () => {
  it("reabre um payload válido salvo por buildSavePayload", () => {
    const snap = makeSnapshot();
    const raw = buildSavePayload(snap);
    const res = parseImportedSnapshot(raw);
    expect(res.ok).toBe(true);
    expect(res.snapshot?.ncm).toBe("4818.90.90");
    expect(res.snapshot?.input.quantidade).toBe(5000);
    // o resultado é recalculado a partir do input (mesmo custo)
    expect(res.snapshot?.result.custoUnitarioBRL).toBeCloseTo(snap.result.custoUnitarioBRL, 6);
  });

  it("preserva o modo do frete marítimo ao reabrir", () => {
    const snap = makeSnapshot();
    const raw = buildSavePayload({ ...snap, input: { ...snap.input, freteMaritimoModo: "chines" } });
    const res = parseImportedSnapshot(raw);
    expect(res.ok).toBe(true);
    expect(res.snapshot?.input.freteMaritimoModo).toBe("chines");
    expect(res.snapshot?.result.freteNaBaseUSD).toBe(0);
  });

  it("rejeita JSON malformado", () => {
    const res = parseImportedSnapshot("{ isto não é json }");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("JSON");
  });

  it("rejeita arquivo de outro tipo (kind diferente)", () => {
    const res = parseImportedSnapshot(JSON.stringify({ kind: "outra-coisa", input: {} }));
    expect(res.ok).toBe(false);
    expect(res.error).toContain("não é uma simulação");
  });

  it("rejeita simulação com parâmetros faltando/inválidos", () => {
    const res = parseImportedSnapshot(
      JSON.stringify({ kind: "import-cost-simulation", input: { cotacao: "x", quantidade: 10 } }),
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("incompleta");
  });

  it("rejeita freteMaritimoModo inválido", () => {
    const snap = makeSnapshot();
    const raw = JSON.stringify({
      kind: "import-cost-simulation",
      version: 1,
      ...snap,
      input: { ...snap.input, freteMaritimoModo: "aviao" },
    });
    const res = parseImportedSnapshot(raw);
    expect(res.ok).toBe(false);
  });
});

describe("calcReport — comparar dois cenários (CI vs pago ao chinês)", () => {
  function makeBoth(): { a: CalcSnapshot; b: CalcSnapshot } {
    const base = makeSnapshot();
    const inputA = { ...base.input, freteMaritimoModo: "ci" as const };
    const inputB = { ...base.input, freteMaritimoModo: "chines" as const };
    return {
      a: { ...base, input: inputA, result: computeImportCost(inputA) },
      b: { ...base, input: inputB, result: computeImportCost(inputB) },
    };
  }

  it("calcula deltas de custo total e imposto entre os cenários", () => {
    const { a, b } = makeBoth();
    const diff = compareScenarios(a, b);
    // pago ao chinês => menos imposto e custo total menor que CI
    expect(diff.tributosDelta).toBeLessThan(0);
    expect(diff.custoTotalDelta).toBeLessThan(0);
    expect(diff.custoTotalDelta).toBeCloseTo(b.result.custoTotalBRL - a.result.custoTotalBRL, 6);
  });

  it("o percentual de variação reflete (B - A) / A", () => {
    const { a, b } = makeBoth();
    const diff = compareScenarios(a, b);
    const esperado = ((b.result.custoTotalBRL - a.result.custoTotalBRL) / a.result.custoTotalBRL) * 100;
    expect(diff.custoTotalDeltaPct).toBeCloseTo(esperado, 6);
  });

  it("cenários idênticos resultam em delta zero", () => {
    const base = makeSnapshot();
    const diff = compareScenarios(base, base);
    expect(diff.custoTotalDelta).toBe(0);
    expect(diff.tributosDelta).toBe(0);
    expect(diff.custoTotalDeltaPct).toBe(0);
  });

  it("converte os tributos de cada cenário em R$ pela cotação", () => {
    const { a } = makeBoth();
    const diff = compareScenarios(a, a);
    expect(diff.tributosBRL_A).toBeCloseTo(a.result.tributosUSD * a.input.cotacao, 6);
  });
});
