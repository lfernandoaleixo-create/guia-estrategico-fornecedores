// =============================================================================
// migrateSubtipo — helper PURO (testável) para migrar a especialidade legada
// `fields.subtipoAquario` ("terrario" | "aquario") para o novo modelo de
// SUBGRUPOS numerados (macro.sub), criando 1.1 - Terrário e 1.2 - Aquário sob
// o macro PET (número 1, por padrão).
//
// É puramente determinístico: recebe os dados de entrada e devolve:
//   - subgroupsToCreate: subgrupos que precisam ser criados (1.1 / 1.2)
//   - assignments: para cada supplierId, o subgroupId que deve ir em
//     `fields.subgroupId`
//
// NÃO faz I/O. A persistência (criar subgrupos + gravar nas notas) é feita por
// quem chama, usando useSubgroups + useSupplierNotes.
// =============================================================================

export type LegacySubtipo = "terrario" | "aquario";

export interface ExistingSubgroupLite {
  id: string;
  macroNumber: number;
  sub: number;
}

export interface MigrationNoteInput {
  /** id do fornecedor (supplierId da nota). */
  supplierId: string;
  /** valor de fields.subtipoAquario, se houver. */
  subtipo?: string | null;
  /** valor atual de fields.subgroupId, se já houver (não sobrescreve). */
  subgroupId?: string | null;
}

export interface SubgroupToCreate {
  macroNumber: number;
  sub: number;
  name: string;
  color: string;
}

export interface MigrationPlan {
  /** Subgrupos a criar (apenas os que ainda não existem). */
  subgroupsToCreate: SubgroupToCreate[];
  /**
   * Mapa subtipo->"sub" usado (1.1 terrário, 1.2 aquário). Útil para o chamador
   * resolver o id após criar (quando o subgrupo não existia antes).
   */
  subByMacroSub: { terrario: { macroNumber: number; sub: number }; aquario: { macroNumber: number; sub: number } };
  /**
   * Atribuições por supplierId quando o subgrupo correspondente JÁ existe (id
   * conhecido). Para os que serão criados agora, o chamador resolve depois.
   */
  assignments: Array<{ supplierId: string; macroNumber: number; sub: number }>;
}

export const MIGRATION_DEFAULTS = {
  macroNumber: 1, // PET
  terrario: { sub: 1, name: "Terrário", color: "#ef4444" }, // 1.1 vermelho
  aquario: { sub: 2, name: "Aquário", color: "#10b981" }, // 1.2 verde
} as const;

/**
 * Monta o plano de migração.
 *
 * @param notes notas com subtipo legado
 * @param existingSubgroups subgrupos já existentes (para não duplicar)
 * @param macroNumber número do macro PET (default 1)
 */
export function buildMigrationPlan(
  notes: MigrationNoteInput[],
  existingSubgroups: ExistingSubgroupLite[],
  macroNumber: number = MIGRATION_DEFAULTS.macroNumber,
): MigrationPlan {
  const terr = { macroNumber, sub: MIGRATION_DEFAULTS.terrario.sub };
  const aqua = { macroNumber, sub: MIGRATION_DEFAULTS.aquario.sub };

  const hasSubgroup = (mn: number, sub: number) =>
    existingSubgroups.some((s) => s.macroNumber === mn && s.sub === sub);

  // Descobre quais subtipos realmente aparecem nas notas (para não criar à toa).
  let needTerr = false;
  let needAqua = false;
  for (const n of notes) {
    const s = (n.subtipo ?? "").trim();
    if (s === "terrario") needTerr = true;
    else if (s === "aquario") needAqua = true;
  }

  const subgroupsToCreate: SubgroupToCreate[] = [];
  if (needTerr && !hasSubgroup(terr.macroNumber, terr.sub)) {
    subgroupsToCreate.push({
      macroNumber: terr.macroNumber,
      sub: terr.sub,
      name: MIGRATION_DEFAULTS.terrario.name,
      color: MIGRATION_DEFAULTS.terrario.color,
    });
  }
  if (needAqua && !hasSubgroup(aqua.macroNumber, aqua.sub)) {
    subgroupsToCreate.push({
      macroNumber: aqua.macroNumber,
      sub: aqua.sub,
      name: MIGRATION_DEFAULTS.aquario.name,
      color: MIGRATION_DEFAULTS.aquario.color,
    });
  }

  // Atribuições: só para notas com subtipo legado e SEM subgroupId já definido
  // (não sobrescreve uma escolha manual já feita pelo usuário).
  const assignments: MigrationPlan["assignments"] = [];
  for (const n of notes) {
    const s = (n.subtipo ?? "").trim();
    if (s !== "terrario" && s !== "aquario") continue;
    if ((n.subgroupId ?? "").trim()) continue; // já tem subgrupo, respeita
    const target = s === "terrario" ? terr : aqua;
    assignments.push({ supplierId: n.supplierId, macroNumber: target.macroNumber, sub: target.sub });
  }

  return {
    subgroupsToCreate,
    subByMacroSub: { terrario: terr, aquario: aqua },
    assignments,
  };
}
