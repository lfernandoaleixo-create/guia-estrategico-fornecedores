import { describe, it, expect } from "vitest";
import {
  computeImportCost,
  findNcm,
  normalizeNcm,
  NCM_TABLE,
  PIS_PCT,
  COFINS_PCT,
  AFRMM_PCT,
  SISCOMEX_DEFAULT,
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
  freteMaritimoUSD: 0,
  freteTerrestreBRL: 0,
  comissaoPct: 0,
  afrmmPct: 0,
  siscomexBRL: 0,
};

describe("Calculadora de custo de importação — cadeia tributária", () => {
  it("calcula a cadeia completa em cascata (II → IPI → PIS → COFINS)", () => {
    const r = computeImportCost({
      ...baseInput,
      iiPct: 10,
      ipiPct: 5,
      pisPct: 0.65,
      cofinsPct: 3,
      freteMaritimoUSD: 2000,
    });
    // valorRealTotal = 1000 USD
    expect(r.valorRealTotalUSD).toBe(1000);
    // baseDeclarada = 1000 * 0,60 = 600 USD
    expect(r.baseDeclaradaUSD).toBe(600);
    // valorAduaneiro = 600 + 2000 = 2600 USD
    expect(r.valorAduaneiroUSD).toBe(2600);
    // II = 2600 * 0,10 = 260
    expect(r.iiUSD).toBeCloseTo(260, 6);
    // IPI = (2600 + 260) * 0,05 = 143
    expect(r.ipiUSD).toBeCloseTo(143, 6);
    // PIS = 2600 * 0,0065 = 16,9
    expect(r.pisUSD).toBeCloseTo(16.9, 6);
    // COFINS = 2600 * 0,03 = 78
    expect(r.cofinsUSD).toBeCloseTo(78, 6);
    // tributos = 260 + 143 + 16,9 + 78 = 497,9
    expect(r.tributosUSD).toBeCloseTo(497.9, 6);
  });

  it("ICMS de importação é sempre zero (benefício TTS)", () => {
    const r = computeImportCost({ ...baseInput, iiPct: 35, ipiPct: 10, pisPct: 0.65, cofinsPct: 3, freteMaritimoUSD: 5000 });
    expect(r.icmsUSD).toBe(0);
  });

  it("CI menor reduz toda a cadeia tributária", () => {
    const ciAlto = computeImportCost({ ...baseInput, ciPct: 60, iiPct: 20, ipiPct: 10 });
    const ciBaixo = computeImportCost({ ...baseInput, ciPct: 30, iiPct: 20, ipiPct: 10 });
    expect(ciBaixo.tributosUSD).toBeLessThan(ciAlto.tributosUSD);
    expect(ciBaixo.valorAduaneiroUSD).toBeLessThan(ciAlto.valorAduaneiroUSD);
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

  it("Siscomex e frete terrestre são somados direto em reais (sem cotação)", () => {
    const r = computeImportCost({
      ...baseInput,
      precoUnitUSD: 0,
      quantidade: 10,
      ciPct: 0,
      freteTerrestreBRL: 500,
      siscomexBRL: 250,
    });
    expect(r.custoTotalBRL).toBe(750);
  });

  it("custo total integra USD convertido + R$ diretos", () => {
    const r = computeImportCost({
      cotacao: 5,
      precoUnitUSD: 1,
      quantidade: 1000,
      ciPct: 60,
      iiPct: 10,
      ipiPct: 5,
      pisPct: 0.65,
      cofinsPct: 3,
      freteMaritimoUSD: 2000,
      freteTerrestreBRL: 3000,
      comissaoPct: 5,
      afrmmPct: 8,
      siscomexBRL: 250,
    });
    // subtotalUSD = 1000 (real) + 2000 (frete) + 497,9 (tributos) + 50 (comissao) = 3547,9
    // *5 = 17739,5 ; + frete terrestre 3000 + AFRMM (2000*5*0,08=800) + Siscomex 250 = 21789,5
    expect(r.comissaoUSD).toBeCloseTo(50, 6);
    expect(r.afrmmBRL).toBeCloseTo(800, 6);
    expect(r.custoTotalBRL).toBeCloseTo(21789.5, 4);
    expect(r.custoUnitarioBRL).toBeCloseTo(21.7895, 4);
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

  it("constantes do regime estão corretas (PIS/COFINS/AFRMM/Siscomex)", () => {
    expect(PIS_PCT).toBe(0.65);
    expect(COFINS_PCT).toBe(3.0);
    expect(AFRMM_PCT).toBe(8);
    expect(SISCOMEX_DEFAULT).toBe(250);
  });
});
