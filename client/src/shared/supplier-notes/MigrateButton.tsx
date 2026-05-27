// =============================================================================
// MigrateButton — botão "Migrar Contato" reutilizável.
// Abre um modal com:
//   - Select de destino: 3 dashboards principais + grupos personalizados
//   - Confirmação clara antes de mover
//   - Toast de sucesso/erro
// =============================================================================
import { useMemo, useState } from "react";
import { ArrowRightLeft, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useCustomGroups } from "./useCustomGroups";
import {
  migrateSupplier,
  type DashboardScope,
  type MigrationContext,
  type MigrationTarget,
} from "./migrateSupplier";

const DASHBOARDS: Array<{ scope: DashboardScope; label: string; color: string }> = [
  { scope: "aquario", label: "Aquário & Terrário", color: "#dc2626" },
  { scope: "tapete", label: "Tapete Higiênico Pet", color: "#0ea5e9" },
  { scope: "yiwu", label: "Yiwu Intel", color: "#f59e0b" },
];

interface Props {
  fromScope: DashboardScope;
  fromSupplierId: string;
  context: MigrationContext;
  /** Callback chamado após migração bem-sucedida (ex: recarregar lista). */
  onMigrated?: () => void;
  /** Estilo: "compact" (texto pequeno em ícone) ou "full". */
  variant?: "compact" | "full";
  /** Cor de acento, herda do dashboard. */
  accent?: string;
}

export function MigrateButton({
  fromScope,
  fromSupplierId,
  context,
  onMigrated,
  variant = "compact",
  accent = "#475569",
}: Props) {
  const { groups } = useCustomGroups();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [target, setTarget] = useState<MigrationTarget | null>(null);
  const [busy, setBusy] = useState(false);

  const groupOptions = useMemo(
    () => groups.filter((g) => !g.promotedToDashboard),
    [groups],
  );
  const promotedGroups = useMemo(
    () => groups.filter((g) => g.promotedToDashboard),
    [groups],
  );

  function reset() {
    setStep("select");
    setTarget(null);
    setBusy(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function describeTarget(t: MigrationTarget): string {
    if (t.kind === "dashboard") {
      return DASHBOARDS.find((d) => d.scope === t.scope)?.label ?? t.scope;
    }
    return groups.find((g) => g.id === t.groupId)?.name ?? "grupo";
  }

  async function confirmMigration() {
    if (!target) return;
    setBusy(true);
    try {
      const res = await migrateSupplier(fromScope, fromSupplierId, target, context);
      if (res.success) {
        toast.success("Contato migrado com sucesso", {
          description: `${context.supplierName} → ${describeTarget(target)}`,
        });
        onMigrated?.();
        close();
      } else {
        toast.error(res.message);
        setBusy(false);
      }
    } catch (err) {
      toast.error("Erro ao migrar contato", {
        description: err instanceof Error ? err.message : String(err),
      });
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          variant === "compact"
            ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider font-bold transition-transform active:scale-[0.97]"
            : "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-transform active:scale-[0.97]"
        }
        style={{
          background: `${accent}14`,
          color: accent,
          border: `1px solid ${accent}55`,
        }}
        title="Migrar contato para outro dashboard ou grupo"
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
        Migrar contato
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            style={{ border: "1px solid #e4e4e7" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Migrar contato</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {context.supplierName}
                </p>
              </div>
              <button
                onClick={close}
                className="p-1 rounded hover:bg-zinc-100 text-zinc-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {step === "select" && (
              <>
                <p className="text-xs text-zinc-500 mb-3">
                  Escolha o destino para onde os dados deste fornecedor serão movidos
                  (status, observações, anexos e cotações).
                </p>

                <div className="space-y-1.5 mb-4">
                  <SectionLabel>Dashboards principais</SectionLabel>
                  {DASHBOARDS.filter((d) => d.scope !== fromScope).map((d) => (
                    <TargetRow
                      key={d.scope}
                      active={
                        target?.kind === "dashboard" && target.scope === d.scope
                      }
                      color={d.color}
                      label={d.label}
                      sub="Dashboard"
                      onClick={() => setTarget({ kind: "dashboard", scope: d.scope })}
                    />
                  ))}
                </div>

                {promotedGroups.length > 0 && (
                  <div className="space-y-1.5 mb-4">
                    <SectionLabel>Dashboards promovidos</SectionLabel>
                    {promotedGroups.map((g) => (
                      <TargetRow
                        key={g.id}
                        active={
                          target?.kind === "custom-group" && target.groupId === g.id
                        }
                        color={g.color}
                        label={g.name}
                        sub={`Grupo · ${g.branch || "Sem ramo"}`}
                        onClick={() =>
                          setTarget({ kind: "custom-group", groupId: g.id })
                        }
                      />
                    ))}
                  </div>
                )}

                {groupOptions.length > 0 && (
                  <div className="space-y-1.5 mb-4">
                    <SectionLabel>Grupos personalizados</SectionLabel>
                    {groupOptions.map((g) => (
                      <TargetRow
                        key={g.id}
                        active={
                          target?.kind === "custom-group" && target.groupId === g.id
                        }
                        color={g.color}
                        label={g.name}
                        sub={`Ramo: ${g.branch || "—"}`}
                        onClick={() =>
                          setTarget({ kind: "custom-group", groupId: g.id })
                        }
                      />
                    ))}
                  </div>
                )}

                {DASHBOARDS.length - 1 === 0 &&
                  groupOptions.length === 0 &&
                  promotedGroups.length === 0 && (
                    <div className="text-xs text-zinc-500 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                      Nenhum destino disponível. Crie grupos personalizados na aba
                      "Adicionar Fornecedores".
                    </div>
                  )}

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={close}
                    className="px-4 py-2 rounded-lg text-sm border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => target && setStep("confirm")}
                    disabled={!target}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: target ? "#0f172a" : "#94a3b8" }}
                  >
                    Continuar
                  </button>
                </div>
              </>
            )}

            {step === "confirm" && target && (
              <>
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 mb-4">
                  <p className="text-sm text-amber-900 leading-relaxed">
                    Tem certeza?
                    <br />
                    Esta ação moverá <strong>{context.supplierName}</strong> para{" "}
                    <strong>{describeTarget(target)}</strong>, levando todos os dados
                    salvos (status, observações, anexos, cotações, grupos) e
                    <strong> removendo do dashboard de origem</strong>.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setStep("select")}
                    className="px-4 py-2 rounded-lg text-sm border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    disabled={busy}
                  >
                    Voltar
                  </button>
                  <button
                    onClick={confirmMigration}
                    disabled={busy}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white inline-flex items-center gap-2"
                    style={{ background: "#dc2626" }}
                  >
                    <Check className="w-4 h-4" />
                    {busy ? "Migrando…" : "Confirmar migração"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-400 px-1 pt-1">
      {children}
    </div>
  );
}

function TargetRow({
  active,
  color,
  label,
  sub,
  onClick,
}: {
  active: boolean;
  color: string;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
      style={{
        borderColor: active ? color : "#e4e4e7",
        background: active ? `${color}10` : "white",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: color,
          flexShrink: 0,
        }}
      />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-zinc-800 truncate">
          {label}
        </span>
        <span className="block text-[11px] text-zinc-500 truncate">{sub}</span>
      </span>
      {active && <Check className="w-4 h-4" style={{ color }} />}
    </button>
  );
}
