// =============================================================================
// migratedVisibility — testa a regra de visibilidade dos fornecedores migrados
// usada no ReportPanel: por padrão (showMigrated=false) os fornecedores com
// fields.migratedTo ficam OCULTOS; quando showMigrated=true, mostra SOMENTE eles.
// A função abaixo replica exatamente o predicado aplicado no componente.
// =============================================================================
import { describe, it, expect } from "vitest";

interface Entry {
  supplierId: string;
  fields?: Record<string, string>;
}

/** Mesmo predicado do ReportPanel (migrationFiltered). */
function filterByMigration<T extends Entry>(entries: T[], showMigrated: boolean): T[] {
  return entries.filter((e) =>
    showMigrated ? !!e.fields?.migratedTo : !e.fields?.migratedTo,
  );
}

/** Mesma contagem do ReportPanel (migratedCount). */
function countMigrated<T extends Entry>(entries: T[]): number {
  return entries.filter((e) => !!e.fields?.migratedTo).length;
}

describe("visibilidade de fornecedores migrados (ReportPanel)", () => {
  const entries: Entry[] = [
    { supplierId: "a", fields: {} },
    { supplierId: "b", fields: { migratedTo: "2.1 · Terrário" } },
    { supplierId: "c" }, // sem fields
    { supplierId: "d", fields: { migratedTo: "3.2 · Joias" } },
    { supplierId: "e", fields: { status: "aprovado" } },
  ];

  it("oculta os migrados por padrão (showMigrated=false)", () => {
    const visible = filterByMigration(entries, false);
    expect(visible.map((e) => e.supplierId)).toEqual(["a", "c", "e"]);
  });

  it("mostra SOMENTE os migrados quando showMigrated=true", () => {
    const visible = filterByMigration(entries, true);
    expect(visible.map((e) => e.supplierId)).toEqual(["b", "d"]);
  });

  it("conta corretamente os migrados para o badge do botão", () => {
    expect(countMigrated(entries)).toBe(2);
  });

  it("não conta migratedTo vazio como migrado", () => {
    const withEmpty: Entry[] = [
      { supplierId: "x", fields: { migratedTo: "" } },
      { supplierId: "y", fields: { migratedTo: "1.1 · PET" } },
    ];
    // string vazia é falsy → não migrado
    expect(countMigrated(withEmpty)).toBe(1);
    expect(filterByMigration(withEmpty, false).map((e) => e.supplierId)).toEqual(["x"]);
    expect(filterByMigration(withEmpty, true).map((e) => e.supplierId)).toEqual(["y"]);
  });

  it("lista vazia → sem migrados e sem erros", () => {
    expect(countMigrated([])).toBe(0);
    expect(filterByMigration([], false)).toEqual([]);
    expect(filterByMigration([], true)).toEqual([]);
  });
});
