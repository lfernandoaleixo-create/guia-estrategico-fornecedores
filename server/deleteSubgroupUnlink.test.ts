import { describe, it, expect } from "vitest";
import {
  suppliersForSubgroup,
  subgroupIdOf,
  type NotesEntries,
  type SubgroupFilterable,
} from "../client/src/shared/supplier-notes/subgroupFilter";

// =============================================================================
// Feature 13 — Excluir subgrupo desvincula (não apaga) os fornecedores.
//
// Ao excluir um subgrupo, o handler `handleDeleteSubgroup` da Home:
//   1. coleta os fornecedores vinculados via suppliersForSubgroup;
//   2. limpa fields.subgroupId de cada um (patch { subgroupId: "" });
//   3. só então remove o subgrupo.
//
// Estes testes cobrem a lógica pura (1) e (2) — a parte que garante que os
// fornecedores permanecem existindo e que apenas perdem o vínculo correto.
// =============================================================================

const suppliers: SubgroupFilterable[] = [
  { id: "s1", name: "Terrário A" },
  { id: "s2", name: "Terrário B" },
  { id: "s3", name: "Coleira X" },
  { id: "s4", name: "Sem vínculo" },
];

function makeEntries(): NotesEntries {
  return {
    s1: { fields: { subgroupId: "sg_terrario" } },
    s2: { fields: { subgroupId: "sg_terrario" } },
    s3: { fields: { subgroupId: "sg_coleira" } },
    // s4: sem nota
  };
}

/** Simula o desvínculo: aplica { subgroupId: "" } aos fornecedores do subgrupo. */
function unlinkSubgroup(entries: NotesEntries, ids: string[]): NotesEntries {
  const next: NotesEntries = JSON.parse(JSON.stringify(entries));
  for (const id of ids) {
    next[id] = { ...(next[id] ?? {}), fields: { ...(next[id]?.fields ?? {}), subgroupId: "" } };
  }
  return next;
}

describe("Feature 13 — desvínculo ao excluir subgrupo", () => {
  it("coleta exatamente os fornecedores vinculados ao subgrupo alvo", () => {
    const entries = makeEntries();
    const toUnlink = suppliersForSubgroup(suppliers, entries, "sg_terrario");
    expect(toUnlink.map((s) => s.id).sort()).toEqual(["s1", "s2"]);
  });

  it("após desvincular, nenhum fornecedor permanece no subgrupo excluído", () => {
    const entries = makeEntries();
    const toUnlink = suppliersForSubgroup(suppliers, entries, "sg_terrario");
    const after = unlinkSubgroup(
      entries,
      toUnlink.map((s) => s.id),
    );
    expect(suppliersForSubgroup(suppliers, after, "sg_terrario")).toEqual([]);
    expect(subgroupIdOf(after, "s1")).toBe("");
    expect(subgroupIdOf(after, "s2")).toBe("");
  });

  it("não afeta fornecedores de outros subgrupos nem os sem vínculo", () => {
    const entries = makeEntries();
    const toUnlink = suppliersForSubgroup(suppliers, entries, "sg_terrario");
    const after = unlinkSubgroup(
      entries,
      toUnlink.map((s) => s.id),
    );
    // s3 continua na coleira; s4 segue sem vínculo
    expect(subgroupIdOf(after, "s3")).toBe("sg_coleira");
    expect(suppliersForSubgroup(suppliers, after, "sg_coleira").map((s) => s.id)).toEqual(["s3"]);
    expect(subgroupIdOf(after, "s4")).toBe("");
  });

  it("os fornecedores continuam existindo (desvínculo nunca remove a lista)", () => {
    const entries = makeEntries();
    const toUnlink = suppliersForSubgroup(suppliers, entries, "sg_terrario");
    const after = unlinkSubgroup(
      entries,
      toUnlink.map((s) => s.id),
    );
    // A lista de fornecedores é imutável: o desvínculo só mexe nas notas.
    expect(suppliers).toHaveLength(4);
    expect(Object.keys(after)).toContain("s1");
    expect(Object.keys(after)).toContain("s2");
  });

  it("excluir um subgrupo sem fornecedores não desvincula ninguém", () => {
    const entries = makeEntries();
    const toUnlink = suppliersForSubgroup(suppliers, entries, "sg_vazio");
    expect(toUnlink).toEqual([]);
    const after = unlinkSubgroup(
      entries,
      toUnlink.map((s) => s.id),
    );
    expect(after).toEqual(entries);
  });
});
