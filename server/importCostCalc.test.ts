import { describe, it, expect } from "vitest";
import {
  computeImportCost,
  findNcm,
  normalizeNcm,
  NCM_TABLE,
  PIS_PCT,
  COFINS_PCT,
  SEGURO_PCT,
  AFRMM_PCT,
  SISCOMEX_DEFAULT,
  DESPESAS_PORTO_DEFAULT,
} from "../client/src/shared/supplier-notes/importTax";

const baseInput = {
  cotacao: 5,
  precoUnitUSD: 1,
  quantidade: 1000,
  ciPct: 60,
  iiPct: 0,
  ipiPct: 0,
  pisPct: 0,
  cofinsPct: 0,
  seguroPct: 0,
  freteMaritimoUSD: 0,
  freteTerrestreBRL: 0,
  comissaoPct: 0,
  afrmmPct: 0,
  siscomexBRL: 0,
  despesasPortoBRL: 0,
};

describe("Calculadora de custo de importação — cadeia tributária", () => {
  it("calcula a cadeia completa em cascata (seguro → II → IPI → PIS → COFINS)", () => {
    const r = computeImportCost({
      ...baseInput,
      iiPct: 10,
      ipiPct: 5,
      pisPct: 2.1,
      cofinsPct: 9.65,
      seguroPct: 0.4,
      freteMaritimoUSD: 2000,
    });
    // valorRealTotal = 1000 USD
    expect(r.valorRealTotalUSD).toBe(1000);
    // baseDeclarada = 1000 * 0,60 = 600 USD
    expect(r.baseDeclaradaUSD).toBe(600);
    // seguro = 600 * 0,004 = 2,4 USD
    expect(r.seguroUSD).toBeCloseTo(2.4, 6);
    // valorAduaneiro = 600 + 2000 + 2,4 = 2602,4 USD
    expect(r.valorAduaneiroUSD).toBeCloseTo(2602.4, 6);
    // II = 2602,4 * 0,10 = 260,24
    expect(r.iiUSD).toBeCloseTo(260.24, 6);
    // IPI = (2602,4 + 260,24) * 0,05 = 143,132
    expect(r.ipiUSD).toBeCloseTo(143.132, 6);
    // PIS = 2602,4 * 0,021 = 54,6504
    expect(r.pisUSD).toBeCloseTo(54.6504, 6);
    // COFINS = 2602,4 * 0,0965 = 251,1316
    expect(r.cofinsUSD).toBeCloseTo(251.1316, 6);
    // tributos = 260,24 + 143,132 + 54,6504 + 251,1316 = 709,154
    expect(r.tributosUSD).toBeCloseTo(709.154, 4);
  });

  it("ICMS de importação é sempre zero (benefício TTS, estadual)", () => {
    const r = computeImportCost({ ...baseInput, iiPct: 35, ipiPct: 10, pisPct: 2.1, cofinsPct: 9.65, freteMaritimoUSD: 5000 });
    expect(r.icmsUSD).toBe(0);
  });

  it("seguro entra no valor aduaneiro (antes do II) e no custo", () => {
    const sem = computeImportCost({ ...baseInput, cotacao: 1, ciPct: 100, iiPct: 50, seguroPct: 0, freteMaritimoUSD: 0 });
    const com = computeImportCost({ ...baseInput, cotacao: 1, ciPct: 100, iiPct: 50, seguroPct: 0.4, freteMaritimoUSD: 0 });
    // base 1000; seguro = 1000 * 0,004 = 4; valorAduaneiro sobe 4; II sobe 4*0,5 = 2
    expect(com.seguroUSD).toBeCloseTo(4, 6);
    expect(com.valorAduaneiroUSD - sem.valorAduaneiroUSD).toBeCloseTo(4, 6);
    expect(com.iiUSD - sem.iiUSD).toBeCloseTo(2, 6);
  });

  it("CI menor reduz toda a cadeia tributária (inclui seguro)", () => {
    const ciAlto = computeImportCost({ ...baseInput, ciPct: 60, iiPct: 20, ipiPct: 10, seguroPct: 0.4 });
    const ciBaixo = computeImportCost({ ...baseInput, ciPct: 30, iiPct: 20, ipiPct: 10, seguroPct: 0.4 });
    expect(ciBaixo.tributosUSD).toBeLessThan(ciAlto.tributosUSD);
    expect(ciBaixo.valorAduaneiroUSD).toBeLessThan(ciAlto.valorAduaneiroUSD);
    expect(ciBaixo.seguroUSD).toBeLessThan(ciAlto.seguroUSD);
  });

  it("frete marítimo entra na base (valor aduaneiro) e no custo", () => {
    const sem = computeImportCost({ ...baseInput, cotacao: 1, ciPct: 100, iiPct: 50, freteMaritimoUSD: 0 });
    const com = computeImportCost({ ...baseInput, cotacao: 1, ciPct: 100, iiPct: 50, freteMaritimoUSD: 200 });
    // II sobe 200 * 0,5 = 100
    expect(com.iiUSD - sem.iiUSD).toBeCloseTo(100, 5);
  });

  it("AFRMM é 8% do frete marítimo convertido em reais", () => {
    const r = computeImportCost({ ...baseInput, cotacao: 5, freteMaritimoUSD: 1000, afrmmPct: 8 });
    // 1000 * 5 * 0,08 = 400
    expect(r.afrmmBRL).toBeCloseTo(400, 6);
  });

  it("Siscomex, frete terrestre e despesas portuárias são somados direto em reais", () => {
    const r = computeImportCost({
      ...baseInput,
      precoUnitUSD: 0,
      quantidade: 10,
      ciPct: 0,
      freteTerrestreBRL: 500,
      siscomexBRL: 200,
      despesasPortoBRL: 3500,
    });
    // 500 + 200 + 3500 = 4200
    expect(r.custoTotalBRL).toBe(4200);
    expect(r.despesasPortoBRL).toBe(3500);
  });

  it("custo total integra USD convertido + R$ diretos (com seguro e despesas portuárias)", () => {
    const r = computeImportCost({
      cotacao: 5,
      precoUnitUSD: 1,
      quantidade: 1000,
      ciPct: 60,
      iiPct: 10,
      ipiPct: 5,
      pisPct: 2.1,
      cofinsPct: 9.65,
      seguroPct: 0.4,
      freteMaritimoUSD: 2000,
      freteTerrestreBRL: 3000,
      comissaoPct: 5,
      afrmmPct: 8,
      siscomexBRL: 200,
      despesasPortoBRL: 3500,
    });
    // seguro = 600 * 0,004 = 2,4 ; tributos = 709,154 (ver teste acima)
    // subtotalUSD = 1000 + 2000 + 2,4 + 709,154 + 50 (comissao) = 3761,554
    // *5 = 18807,77 ; + 3000 (terrestre) + 800 (AFRMM) + 200 (Siscomex) + 3500 (porto) = 26307,77
    expect(r.comissaoUSD).toBeCloseTo(50, 6);
    expect(r.seguroUSD).toBeCloseTo(2.4, 6);
    expect(r.afrmmBRL).toBeCloseTo(800, 6);
    expect(r.custoTotalBRL).toBeCloseTo(26307.77, 2);
    expect(r.custoUnitarioBRL).toBeCloseTo(26.30777, 4);
  });

  it("quantidade zero não quebra (custo unitário = 0)", () => {
    const r = computeImportCost({ ...baseInput, quantidade: 0, iiPct: 10, freteMaritimoUSD: 100 });
    expect(r.custoUnitarioBRL).toBe(0);
  });
});

describe("NCM — tabela e helpers", () => {
  it("a tabela possui 24 NCMs (sem duplicados) com II e IPI numéricos", () => {
    expect(NCM_TABLE.length).toBe(24);
    const codes = NCM_TABLE.map((e) => e.ncm);
    expect(new Set(codes).size).toBe(codes.length);
    for (const e of NCM_TABLE) {
      expect(typeof e.ii).toBe("number");
      expect(typeof e.ipi).toBe("number");
      expect(e.ncm).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
    }
  });

  it("normalizeNcm formata dígitos como xxxx.xx.xx", () => {
    expect(normalizeNcm("48189090")).toBe("4818.90.90");
    expect(normalizeNcm("4818")).toBe("4818");
    expect(normalizeNcm("481890")).toBe("4818.90");
    expect(normalizeNcm("4818.90.90")).toBe("4818.90.90");
  });

  it("findNcm localiza por código ignorando pontuação", () => {
    const hit = findNcm("4818.90.90");
    expect(hit?.produto).toBe("Tapete higiênico");
    expect(findNcm("48189090")?.produto).toBe("Tapete higiênico");
    expect(findNcm("0000.00.00")).toBeUndefined();
  });

  it("constantes do regime estão corretas (PIS/COFINS-Importação, seguro, AFRMM, Siscomex, despesas porto)", () => {
    expect(PIS_PCT).toBe(2.1);
    expect(COFINS_PCT).toBe(9.65);
    expect(SEGURO_PCT).toBe(0.4);
    expect(AFRMM_PCT).toBe(8);
    expect(SISCOMEX_DEFAULT).toBe(200);
    expect(DESPESAS_PORTO_DEFAULT).toBe(3500);
  });
});
