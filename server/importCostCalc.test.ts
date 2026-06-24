import { describe, it, expect } from "vitest";

// Réplica pura da fórmula usada em CalculatorPanel.tsx (mantida em sincronia).
// valorRealTotalUSD = precoUnit × qtd
// baseCI_USD        = valorRealTotalUSD × CI%
// impostoUSD        = (baseCI_USD + freteMaritimoUSD) × aliquota%
// comissaoUSD       = valorRealTotalUSD × comissao%
// custoTotalBRL     = (valorRealTotalUSD + freteMaritimoUSD + impostoUSD + comissaoUSD) × cotacao + freteTerrestreBRL
// custoUnitarioBRL  = custoTotalBRL / qtd
function calcImportCost(input: {
  cotacao: number;
  precoUnitUSD: number;
  qtd: number;
  ciPct: number;
  aliquotaPct: number;
  freteMaritimoUSD: number;
  freteTerrestreBRL: number;
  comissaoPct: number;
}) {
  const valorRealTotalUSD = input.precoUnitUSD * input.qtd;
  const baseCI_USD = valorRealTotalUSD * (input.ciPct / 100);
  const impostoUSD = (baseCI_USD + input.freteMaritimoUSD) * (input.aliquotaPct / 100);
  const comissaoUSD = valorRealTotalUSD * (input.comissaoPct / 100);
  const subtotalUSD = valorRealTotalUSD + input.freteMaritimoUSD + impostoUSD + comissaoUSD;
  const custoTotalBRL = subtotalUSD * input.cotacao + input.freteTerrestreBRL;
  const custoUnitarioBRL = input.qtd > 0 ? custoTotalBRL / input.qtd : 0;
  return { valorRealTotalUSD, baseCI_USD, impostoUSD, comissaoUSD, custoTotalBRL, custoUnitarioBRL };
}

describe("Calculadora de custo de importação", () => {
  it("calcula custo total e unitário com cenário base", () => {
    const r = calcImportCost({
      cotacao: 5,
      precoUnitUSD: 1, // US$ 1,00/un
      qtd: 1000,
      ciPct: 60, // base declarada = 60% do real
      aliquotaPct: 60, // imposto 60%
      freteMaritimoUSD: 2000,
      freteTerrestreBRL: 3000,
      comissaoPct: 5,
    });
    // valorRealTotal = 1000 USD
    expect(r.valorRealTotalUSD).toBe(1000);
    // baseCI = 600 USD
    expect(r.baseCI_USD).toBe(600);
    // imposto = (600 + 2000) * 0.6 = 1560 USD
    expect(r.impostoUSD).toBe(1560);
    // comissao = 1000 * 0.05 = 50 USD
    expect(r.comissaoUSD).toBe(50);
    // subtotal USD = 1000 + 2000 + 1560 + 50 = 4610 → *5 = 23050 + 3000 = 26050 BRL
    expect(r.custoTotalBRL).toBe(26050);
    // unit = 26050 / 1000 = 26,05
    expect(r.custoUnitarioBRL).toBeCloseTo(26.05, 2);
  });

  it("CI menor reduz o imposto", () => {
    const base = calcImportCost({ cotacao: 5, precoUnitUSD: 1, qtd: 1000, ciPct: 60, aliquotaPct: 60, freteMaritimoUSD: 0, freteTerrestreBRL: 0, comissaoPct: 0 });
    const menorCI = calcImportCost({ cotacao: 5, precoUnitUSD: 1, qtd: 1000, ciPct: 30, aliquotaPct: 60, freteMaritimoUSD: 0, freteTerrestreBRL: 0, comissaoPct: 0 });
    expect(menorCI.impostoUSD).toBeLessThan(base.impostoUSD);
  });

  it("frete marítimo entra na base do imposto", () => {
    const semFrete = calcImportCost({ cotacao: 1, precoUnitUSD: 1, qtd: 100, ciPct: 100, aliquotaPct: 50, freteMaritimoUSD: 0, freteTerrestreBRL: 0, comissaoPct: 0 });
    const comFrete = calcImportCost({ cotacao: 1, precoUnitUSD: 1, qtd: 100, ciPct: 100, aliquotaPct: 50, freteMaritimoUSD: 200, freteTerrestreBRL: 0, comissaoPct: 0 });
    // diferença de imposto = 200 * 0.5 = 100, mais o próprio frete (200) no custo
    expect(comFrete.impostoUSD - semFrete.impostoUSD).toBeCloseTo(100, 5);
  });

  it("frete terrestre é somado em reais (não multiplica pela cotação)", () => {
    const r = calcImportCost({ cotacao: 5, precoUnitUSD: 0, qtd: 10, ciPct: 0, aliquotaPct: 0, freteMaritimoUSD: 0, freteTerrestreBRL: 500, comissaoPct: 0 });
    expect(r.custoTotalBRL).toBe(500);
  });

  it("quantidade zero não quebra (custo unitário = 0)", () => {
    const r = calcImportCost({ cotacao: 5, precoUnitUSD: 1, qtd: 0, ciPct: 60, aliquotaPct: 60, freteMaritimoUSD: 100, freteTerrestreBRL: 0, comissaoPct: 5 });
    expect(r.custoUnitarioBRL).toBe(0);
  });
});
