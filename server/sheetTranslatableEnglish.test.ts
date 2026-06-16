import { describe, expect, it } from "vitest";

/**
 * Regressão do BUG (planilha NOMOYPET): a tabela de preços estava em INGLÊS e,
 * no modo PT, as células do corpo precisavam ser detectadas como "traduzíveis"
 * para serem enviadas ao tradutor. Estes testes reproduzem de forma pura a
 * heurística `isTranslatableText` do cliente
 * (client/src/shared/supplier-notes/attachmentViewer.tsx) para garantir que
 * frases em inglês entram na fila de tradução e que números/códigos/dimensões
 * NÃO são traduzidos (devem permanecer intactos).
 */

function hasNonLatinScript(text: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u0e00-\u0e7f\u0590-\u05ff]/.test(
    text,
  );
}

const PT_HINTS_RE =
  /\b(de|da|do|das|dos|para|com|sem|não|são|é|às|cão|ões|ário|você|preço|fornecedor|produto|modelo|cor|tamanho|peso|quantidade|unidade|caixa|frete|pagamento|entrega|observa)/i;
const EN_HINTS_RE =
  /\b(the|and|with|without|price|model|name|color|size|weight|qty|quantity|unit|box|carton|series|new|switch|plug|timer|heater|pump|filter|light|product|supplier|payment|delivery|shipping|description|material|package|packing|min|order|sample)\b/i;

function isTranslatableText(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 2) return false;
  if (!/[a-zA-Z\u00c0-\u024f\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(t)) return false;
  if (hasNonLatinScript(t)) return true;
  if (PT_HINTS_RE.test(t)) return false;
  if (EN_HINTS_RE.test(t)) return true;
  const words = t.match(/[a-zA-Z]{3,}/g) ?? [];
  return words.length > 0;
}

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
