import { describe, it, expect } from "vitest";
import {
  buildMigrationPlan,
  MIGRATION_DEFAULTS,
  type MigrationNoteInput,
  type ExistingSubgroupLite,
} from "../client/src/shared/supplier-notes/migrateSubtipo";

describe("buildMigrationPlan", () => {
  it("cria 1.1 Terrário e 1.2 Aquário quando ambos os subtipos existem e nenhum subgrupo foi criado", () => {
    const notes: MigrationNoteInput[] = [
      { supplierId: "s1", subtipo: "terrario" },
      { supplierId: "s2", subtipo: "aquario" },
    ];
    const plan = buildMigrationPlan(notes, []);
    expect(plan.subgroupsToCreate).toHaveLength(2);
    const terr = plan.subgroupsToCreate.find((s) => s.sub === 1);
    const aqua = plan.subgroupsToCreate.find((s) => s.sub === 2);
    expect(terr?.name).toBe("Terrário");
    expect(terr?.macroNumber).toBe(1);
    expect(aqua?.name).toBe("Aquário");
    expect(plan.assignments).toEqual([
      { supplierId: "s1", macroNumber: 1, sub: 1 },
      { supplierId: "s2", macroNumber: 1, sub: 2 },
    ]);
  });

  it("não cria subgrupo que já existe", () => {
    const existing: ExistingSubgroupLite[] = [{ id: "x", macroNumber: 1, sub: 1 }];
    const notes: MigrationNoteInput[] = [
      { supplierId: "s1", subtipo: "terrario" },
      { supplierId: "s2", subtipo: "aquario" },
    ];
    const plan = buildMigrationPlan(notes, existing);
    // só cria o aquário (1.2); terrário 1.1 já existe
    expect(plan.subgroupsToCreate).toHaveLength(1);
    expect(plan.subgroupsToCreate[0].sub).toBe(2);
  });

  it("só cria o subtipo que aparece nas notas", () => {
    const notes: MigrationNoteInput[] = [{ supplierId: "s1", subtipo: "terrario" }];
    const plan = buildMigrationPlan(notes, []);
    expect(plan.subgroupsToCreate).toHaveLength(1);
    expect(plan.subgroupsToCreate[0].name).toBe("Terrário");
  });

  it("não atribui notas que já têm subgroupId (não sobrescreve escolha manual)", () => {
    const notes: MigrationNoteInput[] = [
      { supplierId: "s1", subtipo: "terrario", subgroupId: "já-tem" },
      { supplierId: "s2", subtipo: "aquario" },
    ];
    const plan = buildMigrationPlan(notes, []);
    expect(plan.assignments).toEqual([{ supplierId: "s2", macroNumber: 1, sub: 2 }]);
  });

  it("ignora notas sem subtipo legado", () => {
    const notes: MigrationNoteInput[] = [
      { supplierId: "s1", subtipo: null },
      { supplierId: "s2", subtipo: "equipamento" as unknown as string },
      { supplierId: "s3", subtipo: "aquario" },
    ];
    const plan = buildMigrationPlan(notes, []);
    expect(plan.assignments).toEqual([{ supplierId: "s3", macroNumber: 1, sub: 2 }]);
    expect(plan.subgroupsToCreate).toHaveLength(1);
  });

  it("respeita um macroNumber customizado", () => {
    const notes: MigrationNoteInput[] = [{ supplierId: "s1", subtipo: "terrario" }];
    const plan = buildMigrationPlan(notes, [], 3);
    expect(plan.subgroupsToCreate[0].macroNumber).toBe(3);
    expect(plan.assignments[0]).toEqual({ supplierId: "s1", macroNumber: 3, sub: 1 });
  });

  it("expõe os defaults esperados (1, terrário=1, aquário=2)", () => {
    expect(MIGRATION_DEFAULTS.macroNumber).toBe(1);
    expect(MIGRATION_DEFAULTS.terrario.sub).toBe(1);
    expect(MIGRATION_DEFAULTS.aquario.sub).toBe(2);
  });

  it("é idempotente: sem subtipos pendentes não gera nada", () => {
    const notes: MigrationNoteInput[] = [
      { supplierId: "s1", subtipo: "terrario", subgroupId: "id1" },
    ];
    const existing: ExistingSubgroupLite[] = [{ id: "id1", macroNumber: 1, sub: 1 }];
    const plan = buildMigrationPlan(notes, existing);
    expect(plan.subgroupsToCreate).toHaveLength(0);
    expect(plan.assignments).toHaveLength(0);
  });
});
