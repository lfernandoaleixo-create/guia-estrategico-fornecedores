import { describe, it, expect } from "vitest";
import { countFolders } from "../client/src/shared/supplier-notes/useSupplierNotes";

describe("countFolders", () => {
  it("conta 0 quando não há anexos", () => {
    expect(countFolders([])).toBe(0);
    expect(countFolders([{ attachments: [] }])).toBe(0);
    expect(countFolders([{ attachments: null }])).toBe(0);
  });

  it("ignora anexos sem pasta (avulsos)", () => {
    expect(
      countFolders([
        { attachments: [{ folder: undefined }, { folder: "" }, { folder: "   " }] },
      ]),
    ).toBe(0);
  });

  it("conta pastas distintas considerando trim", () => {
    expect(
      countFolders([
        {
          attachments: [
            { folder: "Contratos" },
            { folder: "Contratos " },
            { folder: "Cotações" },
          ],
        },
      ]),
    ).toBe(2);
  });

  it("agrega pastas distintas entre múltiplas entradas (fornecedores)", () => {
    expect(
      countFolders([
        { attachments: [{ folder: "Contratos" }] },
        { attachments: [{ folder: "Fotos da Fábrica" }] },
        { attachments: [{ folder: "Contratos" }] },
      ]),
    ).toBe(2);
  });
});
