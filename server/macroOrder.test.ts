import { describe, it, expect } from "vitest";
import { moveMacroOrder, renumberMacros } from "@shared/macroOrder";

describe("moveMacroOrder", () => {
  const ids = ["a", "b", "c"];

  it("move um item para baixo trocando com o vizinho", () => {
    expect(moveMacroOrder(ids, "a", "down")).toEqual(["b", "a", "c"]);
  });

  it("move um item para cima trocando com o vizinho", () => {
    expect(moveMacroOrder(ids, "c", "up")).toEqual(["a", "c", "b"]);
  });

  it("não move o primeiro item para cima (no-op)", () => {
    expect(moveMacroOrder(ids, "a", "up")).toEqual(["a", "b", "c"]);
  });

  it("não move o último item para baixo (no-op)", () => {
    expect(moveMacroOrder(ids, "c", "down")).toEqual(["a", "b", "c"]);
  });

  it("ignora id inexistente", () => {
    expect(moveMacroOrder(ids, "x", "down")).toEqual(["a", "b", "c"]);
  });

  it("não muta o array original", () => {
    const original = ["a", "b", "c"];
    moveMacroOrder(original, "a", "down");
    expect(original).toEqual(["a", "b", "c"]);
  });
});

describe("renumberMacros", () => {
  const macros = [
    { id: "m1", number: 1 },
    { id: "m2", number: 2 },
    { id: "m3", number: 3 },
  ];

  it("renumera 1..N segundo a nova ordem", () => {
    const out = renumberMacros(macros, ["m3", "m1", "m2"]);
    expect(out).toEqual([
      { id: "m3", number: 1 },
      { id: "m1", number: 2 },
      { id: "m2", number: 3 },
    ]);
  });

  it("anexa macros ausentes ao final, renumerando sequencialmente", () => {
    const out = renumberMacros(macros, ["m2"]);
    expect(out.map((m) => m.id)).toEqual(["m2", "m1", "m3"]);
    expect(out.map((m) => m.number)).toEqual([1, 2, 3]);
  });

  it("preserva campos extras dos macros", () => {
    const withName = [
      { id: "m1", number: 1, name: "PET" },
      { id: "m2", number: 2, name: "CASA" },
    ];
    const out = renumberMacros(withName, ["m2", "m1"]);
    expect(out).toEqual([
      { id: "m2", number: 1, name: "CASA" },
      { id: "m1", number: 2, name: "PET" },
    ]);
  });

  it("ignora ids inexistentes na ordem solicitada", () => {
    const out = renumberMacros(macros, ["m1", "zzz", "m2", "m3"]);
    expect(out.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
    expect(out.map((m) => m.number)).toEqual([1, 2, 3]);
  });
});
