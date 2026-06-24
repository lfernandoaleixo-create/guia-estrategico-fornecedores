import { describe, it, expect } from "vitest";
import { computeImportCost } from "../client/src/shared/supplier-notes/importTax";
import {
  buildSteps,
  buildReportHtml,
  buildSavePayload,
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
    pisPct: 0.65,
    cofinsPct: 3,
    freteMaritimoUSD: 3500,
    freteTerrestreBRL: 2000,
    comissaoPct: 5,
    afrmmPct: 8,
    siscomexBRL: 250,
  };
  const result = computeImportCost(input);
  return { nome: "Tapete higiênico", ncm: "4818.90.90", ncmObs: undefined, input, result, geradoEm: 1_700_000_000_000 };
}

describe("calcReport — memória de cálculo (passo a passo)", () => {
  it("gera exatamente 14 passos na ordem da cadeia", () => {
    const steps = buildSteps(makeSnapshot());
    expect(steps.length).toBe(14);
    expect(steps[0].titulo).toContain("Valor real total");
    expect(steps[3].titulo).toContain("II");
    expect(steps[4].titulo).toContain("IPI");
    expect(steps[7].titulo).toContain("ICMS");
    expect(steps[13].titulo).toContain("Custo por unidade");
  });

  it("o passo do IPI mostra a cascata (valor aduaneiro + II)", () => {
    const steps = buildSteps(makeSnapshot());
    const ipi = steps.find((s) => s.titulo.includes("IPI"))!;
    expect(ipi.formula).toContain("valor aduaneiro + II");
  });

  it("o passo do ICMS deixa claro que é zero pelo TTS", () => {
    const steps = buildSteps(makeSnapshot());
    const icms = steps.find((s) => s.titulo.includes("ICMS"))!;
    expect(icms.titulo).toContain("TTS");
    expect(icms.resultado).toBe("R$ 0,00");
  });

  it("o último passo reflete o custo unitário calculado", () => {
    const snap = makeSnapshot();
    const steps = buildSteps(snap);
    const ultimo = steps[steps.length - 1];
    // custo unitário ~ R$ 10,77 → formatado em pt-BR
    expect(ultimo.resultado).toContain("10,77");
    expect(snap.result.custoUnitarioBRL).toBeCloseTo(10.7742, 3);
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
    expect(parsed.result.custoUnitarioBRL).toBeCloseTo(10.7742, 3);
  });
});
