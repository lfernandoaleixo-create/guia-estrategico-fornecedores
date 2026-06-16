// =============================================================================
// MigrateSubtipoButton — migra a especialidade legada (fields.subtipoAquario)
// dos fornecedores do scope "aquario" para o novo modelo de SUBGRUPOS:
//   1.1 - Terrário  e  1.2 - Aquário  sob o macro PET (nº 1).
//
// Fluxo (1 clique, com confirmação):
//   1. Monta o plano com buildMigrationPlan (puro/testável).
//   2. Cria os subgrupos que faltam (createSubgroup, capturando o id retornado).
//   3. Resolve o subgroupId de cada fornecedor (mapa macro.sub -> id, incluindo
//      os recém-criados) e grava em fields.subgroupId.
//
// É IDEMPOTENTE: não duplica subgrupos já existentes e não sobrescreve um
// subgroupId já definido manualmente. Não apaga nenhum dado.
// =============================================================================
import { useMemo, useState } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { useMacros } from "./useMacros";
import { useSubgroups, type Subgroup } from "./useSubgroups";
import { useSupplierNotes } from "./useSupplierNotes";
import { buildMigrationPlan, MIGRATION_DEFAULTS, type MigrationNoteInput } from "./migrateSubtipo";

interface Props {
  /** Número do macro PET (default 1). */
  macroNumber?: number;
}

type Phase = "idle" | "running" | "done" | "error" | "no-macro";

const keyOf = (mn: number, sub: number) => `${mn}.${sub}`;

export default function MigrateSubtipoButton({ macroNumber = MIGRATION_DEFAULTS.macroNumber }: Props) {
  const { macros } = useMacros();
  const { subgroups, createSubgroup, reload: reloadSubgroups } = useSubgroups();
  const { entries, upsertEntry } = useSupplierNotes("aquario");

  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string>("");

  // Quantos fornecedores ainda têm especialidade legada SEM subgrupo vinculado?
  const pending = useMemo(() => {
    let n = 0;
    for (const e of Object.values(entries)) {
      const s = (e.fields?.subtipoAquario ?? "").trim();
      const has = (e.fields?.subgroupId ?? "").trim();
      if ((s === "terrario" || s === "aquario") && !has) n += 1;
    }
    return n;
  }, [entries]);

  const macroExists = macros.some((m) => m.number === macroNumber);

  const run = async () => {
    if (!macroExists) {
      setPhase("no-macro");
      setMessage(`O macro nº ${macroNumber} (PET) não existe. Crie-o em "Classificações" antes de migrar.`);
      return;
    }
    const ok = window.confirm(
      `Migrar a especialidade dos fornecedores para subgrupos?\n\n` +
        `Serão criados (se ainda não existirem) os subgrupos ${macroNumber}.1 - Terrário e ` +
        `${macroNumber}.2 - Aquário, e cada fornecedor marcado como terrário/aquário será ` +
        `vinculado ao subgrupo correspondente.\n\nNenhum dado é apagado.`,
    );
    if (!ok) return;

    setPhase("running");
    setMessage("");
    try {
      const notes: MigrationNoteInput[] = Object.values(entries).map((e) => ({
        supplierId: e.supplierId,
        subtipo: e.fields?.subtipoAquario ?? null,
        subgroupId: e.fields?.subgroupId ?? null,
      }));

      const plan = buildMigrationPlan(
        notes,
        subgroups.map((s) => ({ id: s.id, macroNumber: s.macroNumber, sub: s.sub })),
        macroNumber,
      );

      // Índice (macro.sub) -> id, começando pelos subgrupos já existentes.
      const idByKey = new Map<string, string>();
      for (const s of subgroups) idByKey.set(keyOf(s.macroNumber, s.sub), s.id);

      // 1. Cria os subgrupos que faltam, capturando o id retornado.
      for (const sg of plan.subgroupsToCreate) {
        const created = await createSubgroup({
          macroNumber: sg.macroNumber,
          sub: sg.sub,
          name: sg.name,
          color: sg.color,
        });
        if (created) idByKey.set(keyOf(created.macroNumber, created.sub), created.id);
      }

      // 2. Grava o subgroupId em cada fornecedor do plano.
      let assigned = 0;
      let missing = 0;
      for (const a of plan.assignments) {
        const id = idByKey.get(keyOf(a.macroNumber, a.sub));
        if (!id) {
          missing += 1;
          continue;
        }
        upsertEntry(a.supplierId, { fields: { subgroupId: id } });
        assigned += 1;
      }

      await reloadSubgroups();

      if (missing > 0) {
        setPhase("error");
        setMessage(`Migração parcial: ${assigned} vinculado(s), ${missing} sem subgrupo resolvido. Tente novamente.`);
        return;
      }

      setPhase("done");
      setMessage(
        `Migração concluída. ${assigned} fornecedor(es) vinculado(s); ` +
          `${plan.subgroupsToCreate.length} subgrupo(s) criado(s).`,
      );
    } catch (err) {
      setPhase("error");
      setMessage(err instanceof Error ? err.message : "Falha na migração.");
    }
  };

  // Não mostra nada se não há pendências e ainda está ocioso.
  if (pending === 0 && phase === "idle") return null;

  return (
    <div
      className="rounded-xl border p-3 mb-4"
      style={{ borderColor: "oklch(0.3 0.05 150)", background: "oklch(0.12 0.03 150 / 0.4)" }}
    >
      <div className="flex items-start gap-3">
        <ArrowLeftRight className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#10b981" }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: "oklch(0.95 0.01 150)" }}>
            Migrar Aquário/Terrário para subgrupos
          </div>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.7 0.02 150)" }}>
            {pending > 0
              ? `${pending} fornecedor(es) com especialidade ainda sem subgrupo. Clique para criar ${macroNumber}.1 - Terrário e ${macroNumber}.2 - Aquário e vinculá-los.`
              : "Especialidades já migradas."}
          </p>
          {message && (
            <p
              className="text-xs mt-1.5 font-medium"
              style={{ color: phase === "error" || phase === "no-macro" ? "#f87171" : "#34d399" }}
            >
              {message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={run}
          disabled={phase === "running" || pending === 0}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-transform active:scale-[0.97] disabled:opacity-50"
          style={{ background: "#10b981", color: "#04231a" }}
        >
          {phase === "running" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowLeftRight className="w-3.5 h-3.5" />
          )}
          {phase === "running" ? "Migrando…" : "Migrar agora"}
        </button>
      </div>
    </div>
  );
}

export type { Subgroup };
