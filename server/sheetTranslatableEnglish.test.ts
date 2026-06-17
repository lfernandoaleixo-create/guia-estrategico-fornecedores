import { describe, expect, it } from "vitest";
import { isTranslatableText } from "../client/src/shared/supplier-notes/translatableText";

/**
 * Regressão do BUG (planilha NOMOYPET): a tabela de preços estava em INGLÊS e,
 * no modo PT, as células do corpo precisavam ser detectadas como "traduzíveis"
 * para serem enviadas ao tradutor. Este arquivo agora importa a heurística REAL
 * (client/src/shared/supplier-notes/translatableText.ts) para garantir que o
 * código de produção — e não uma cópia — está coberto.
 *
 * Feature 22: além do inglês, valida que caracteres CJK ISOLADOS (unidades como
 * 只/个/支/盒), texto MISTO (chinês + latino na mesma célula) e nomes com sufixo
 * entre parênteses ("(广)") também entram na fila de tradução.
 */

describe("isTranslatableText — planilha em inglês (NOMOYPET)", () => {
  const englishCells = [
    "Sqaure Bird Mini Heater",
    "Rectangle Bird Mini Heater",
    "Rock Cave Heater",
    "with normal on/off switch",
    "with 24H cycle timer",
    "CN plug",
    "EU/US/UK/AU plug",
    "NAME",
    "MODEL",
    "QTY/CTN",
    "EXW PRICE (USD)",
    "Adjustable UVB Lamp",
    "Snake Tong Three Folds",
    // Código + palavra em inglês reconhecível: deve traduzir "Timer".
    "NR-19-Timer",
  ];

  it("detecta frases/cabeçalhos em inglês como traduzíveis", () => {
    for (const cell of englishCells) {
      expect(isTranslatableText(cell)).toBe(true);
    }
  });

  it("NÃO traduz números, preços, códigos e dimensões", () => {
    const nonTranslatable = [
      "$4.13",
      "$5.84",
      "76.5*76.5*29mm",
      "141.5*71.5*29mm",
      "NR-18",
      "10",
      "2.5",
      "",
    ];
    for (const cell of nonTranslatable) {
      expect(isTranslatableText(cell)).toBe(false);
    }
  });

  it("preserva texto que já está em português (não re-traduz)", () => {
    expect(isTranslatableText("Aquecedor para Pássaros")).toBe(false);
    expect(isTranslatableText("preço por unidade")).toBe(false);
    expect(isTranslatableText("com timer de ciclo")).toBe(false);
  });

  it("detecta chinês/CJK como traduzível independentemente de hints", () => {
    expect(isTranslatableText("过滤器")).toBe(true);
    expect(isTranslatableText("UV灯系列")).toBe(true);
  });
});

describe("isTranslatableText — Feature 22 (caracteres CJK isolados e texto misto)", () => {
  it("detecta UNIDADES chinesas isoladas (1 caractere) como traduzíveis", () => {
    // Bug: o antigo guard `t.length < 2` descartava estas células de 1 char,
    // deixando-as no idioma original na planilha traduzida.
    for (const unit of ["只", "个", "支", "盒", "件", "双", "对", "套", "袋", "瓶", "卷", "元"]) {
      expect(isTranslatableText(unit)).toBe(true);
    }
  });

  it("detecta texto MISTO (chinês + latino na mesma célula)", () => {
    expect(isTranslatableText("Motor 389元 Rotor 135元")).toBe(true);
    expect(isTranslatableText("Pump 12V 水泵")).toBe(true);
  });

  it("detecta nome de fornecedor com sufixo chinês entre parênteses", () => {
    expect(isTranslatableText("Fornecedor ABC (广)")).toBe(true);
    expect(isTranslatableText("(广)")).toBe(true);
  });

  it("ainda NÃO traduz um único caractere latino ou número isolado", () => {
    expect(isTranslatableText("A")).toBe(false);
    expect(isTranslatableText("5")).toBe(false);
  });
});
