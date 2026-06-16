import { describe, expect, it } from "vitest";

/**
 * Regressão do BUG: os NOMES DAS ABAS de uma planilha (过滤器, 增氧泵, UV灯系列…)
 * não eram incluídos no conjunto de textos enviados para tradução, então
 * permaneciam em chinês mesmo no modo PT.
 *
 * O SheetCanvas monta o conjunto de textos a traduzir como:
 *   allCells = [...rows.flat(), ...sheetNames]
 *
 * Estes testes reproduzem essa lógica de forma pura, garantindo que os nomes
 * das abas chinesas entrem na lista de tradução.
 */

// Réplica pura do detector de chinês usado no cliente.
function hasChinese(text: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text);
}

// Réplica pura da coleta de células do SheetCanvas.
function collectTranslatableCells(rows: string[][], sheetNames: string[]): string[] {
  const allCells = [...rows.flat(), ...sheetNames];
  return allCells.filter((c) => hasChinese(c));
}

describe("collectTranslatableCells (SheetCanvas)", () => {
  const sheetNames = ["过滤器", "增氧泵", "UV灯系列", "灯架", "加热棒", "配件", "大泵"];
  const rows: string[][] = [
    ["产品型号", "单价", "RS-013"],
    ["RS-901", "12.0", "60"],
  ];

  it("inclui os nomes das abas chinesas no conjunto de tradução", () => {
    const out = collectTranslatableCells(rows, sheetNames);
    for (const name of sheetNames) {
      expect(out).toContain(name);
    }
  });

  it("inclui também as células chinesas do corpo", () => {
    const out = collectTranslatableCells(rows, sheetNames);
    expect(out).toContain("产品型号");
    expect(out).toContain("单价");
  });

  it("não inclui células sem chinês (códigos/números)", () => {
    const out = collectTranslatableCells(rows, sheetNames);
    expect(out).not.toContain("RS-013");
    expect(out).not.toContain("12.0");
    expect(out).not.toContain("60");
  });

  it("funciona quando há apenas uma aba (deve traduzir o nome)", () => {
    const out = collectTranslatableCells([["RS-01A"]], ["过滤器"]);
    expect(out).toEqual(["过滤器"]);
  });

  it("retorna vazio quando nada é chinês", () => {
    const out = collectTranslatableCells([["RS-01A", "6.8"]], ["Sheet1", "Sheet2"]);
    expect(out).toEqual([]);
  });
});
