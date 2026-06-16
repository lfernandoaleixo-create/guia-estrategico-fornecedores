// =============================================================================
// MigrateToMacroButton — migra um fornecedor do Yiwu (Anotações/Diário) para um
// dos MACROS já criados, cadastrando-o no DESTINO CORRETO conforme o tipo do
// item escolhido (regras de subgrupo do modelo "macro.sub").
//
// Fluxo (modal, 3 passos):
//   1. ESCOLHER MACRO   → lista os macros existentes (Nº · nome).
//   2. ESCOLHER DESTINO → lista os ITENS do macro com a numeração hierárquica
//      (ex.: 2.1 · Marmita Plástica, 2.2 · Fibra). Cada item é um subgrupo do
//      Aquário (Terrário/Aquário), um grupo promovido a dashboard, ou um
//      dashboard fixo (Tapete/Yiwu).
//   3. CONFIRMAR → cadastra o fornecedor no destino:
//        • group     → ExtraSupplier com groupId (aparece em /grupo/<id>)
//        • subgroup  → CustomSupplier scope "aquario" + nota subtipoAquario
//        • dashboard → CustomSupplier no scope do dashboard (tapete/yiwu)
//      Copia status/observações/cotações da nota de origem e REMOVE a origem.
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, Layers, Loader2, Waves, X } from "lucide-react";
import { toast } from "sonner";
import { useMacros, type MacroItem } from "./useMacros";
import { useCustomGroups } from "./useCustomGroups";
import { buildCatalog } from "./macroCatalog";
import { useCustomSuppliers, type SupplierScope } from "./useCustomSuppliers";
import { useExtraSuppliers } from "./useExtraSuppliers";
import {
  readEntryDirect,
  writeEntryDirect,
  type SupplierNoteEntry,
} from "./useSupplierNotes";
import {
  buildMigratedSupplierPayload,
  buildMigratedExtraSupplierPayload,
  buildFullMigratedNote,
  destinationLabel,
  type MigrateToMacroContext,
} from "./migrateToMacro";

export type { MigrateToMacroContext };

interface Props {
  /** Scope de origem (qualquer dashboard: aquario/tapete/yiwu/grupo-<id>). */
  fromScope: string;
  /** ID do fornecedor de origem. */
  fromSupplierId: string;
  /** Dados do fornecedor para preencher o cadastro no destino. */
  context: MigrateToMacroContext;
  /** Cor de acento (herda do dashboard). */
  accent?: string;
  /** Callback após migração bem-sucedida. */
  onMigrated?: () => void;
  /** Rótulo do botão (padrão "Migrar contato"). */
  label?: string;
}

type Step = "macro" | "item" | "confirm";

export function MigrateToMacroButton({
  fromScope,
  fromSupplierId,
  context,
  accent = "#8b5cf6",
  onMigrated,
  label = "Migrar contato",
}: Props) {
  const { macros, itemAssignment } = useMacros();
  const { groups: customGroups } = useCustomGroups();
  // Hooks de destino (CustomSuppliers por scope + ExtraSuppliers de grupos).
  // As NOTAS do destino são gravadas via helpers diretos (writeEntryDirect),
  // pois o scope de grupo promovido é dinâmico (grupo-<id>) e não pode ser
  // instanciado condicionalmente como hook.
  const aquarioSuppliers = useCustomSuppliers("aquario");
  const tapeteSuppliers = useCustomSuppliers("tapete");
  const yiwuSuppliers = useCustomSuppliers("yiwu");
  const extraSuppliers = useExtraSuppliers();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("macro");
  const [macroId, setMacroId] = useState<string | null>(null);
  const [itemKey, setItemKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ID sentinela para o destino "Sem classificação macro" (não é um macro real).
  const UNCLASSIFIED_ID = "__unclassified__";
  const isUnclassified = macroId === UNCLASSIFIED_ID;

  // Itens do catálogo (dashboards/subgrupos/grupos promovidos) que NÃO estão
  // atribuídos a nenhum macro — é onde mora o Yiwu quando não classificado.
  // Exclui a própria origem para não oferecer migração para o mesmo lugar.
  const unclassifiedItems = useMemo(() => {
    const promoted = customGroups
      .filter((g) => g.promotedToDashboard)
      .map((g) => ({ id: g.id, name: g.name, number: g.number ?? 0 }));
    const catalog = buildCatalog(promoted);
    return catalog.filter((it) => {
      if (itemAssignment.has(it.key)) return false; // já pertence a um macro
      // Não oferecer o próprio dashboard de origem como destino.
      if (it.kind === "group" && fromScope === `grupo-${it.refId}`) return false;
      if (it.kind !== "group" && fromScope === it.refId) return false;
      return true;
    });
  }, [customGroups, itemAssignment, fromScope]);

  // Trava scroll do body quando aberto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Fecha com ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedMacro = useMemo(
    () => macros.find((m) => m.id === macroId) ?? null,
    [macros, macroId],
  );

  // Itens do destino com o rótulo hierárquico (m.number . posição).
  // No modo "Sem classificação macro", os itens vêm do catálogo não atribuído
  // e usam o próprio label do item (sem numeração de macro).
  const macroItems = useMemo(() => {
    if (isUnclassified) {
      return unclassifiedItems.map((it) => ({
        item: it,
        hier: 0,
        label: "—",
      }));
    }
    if (!selectedMacro) return [];
    return selectedMacro.items.map((it, idx) => ({
      item: it,
      hier: idx + 1,
      label: `${selectedMacro.number}.${idx + 1}`,
    }));
  }, [isUnclassified, unclassifiedItems, selectedMacro]);

  const selectedItem = useMemo(
    () => macroItems.find((x) => x.item.key === itemKey) ?? null,
    [macroItems, itemKey],
  );

  function reset() {
    setStep("macro");
    setMacroId(null);
    setItemKey(null);
    setBusy(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  // Executa o cadastro no destino conforme o tipo do item.
  // Retorna o scope das NOTAS do destino e o id do fornecedor criado.
  async function createInDestination(
    item: MacroItem,
    sourceEntry: SupplierNoteEntry | undefined,
  ): Promise<{ noteScope: string; id: string }> {
    if (item.kind === "group") {
      // Grupo promovido → ExtraSupplier com groupId; notas no scope grupo-<id>.
      const payload = buildMigratedExtraSupplierPayload(context, item.refId, sourceEntry);
      const created = await extraSuppliers.create(payload);
      return { noteScope: `grupo-${item.refId}`, id: created.id };
    }

    // dashboard ou subgroup → CustomSupplier no scope adequado.
    // subgroup do Aquário: refId = "aquario"; dashboard fixo: refId = "tapete"|"yiwu".
    const scope: SupplierScope =
      item.refId === "tapete" ? "tapete" : item.refId === "yiwu" ? "yiwu" : "aquario";
    const payload = buildMigratedSupplierPayload(context, sourceEntry);
    const hook =
      scope === "tapete" ? tapeteSuppliers : scope === "yiwu" ? yiwuSuppliers : aquarioSuppliers;
    const created = await hook.create(payload);
    return { noteScope: scope, id: created.id };
  }

  async function confirmMigration() {
    if (!selectedItem) return;
    if (!isUnclassified && !selectedMacro) return;
    const { item } = selectedItem;
    setBusy(true);
    try {
      // 1. Lê o histórico de origem (Yiwu) diretamente do servidor.
      const sourceEntry = (await readEntryDirect(fromScope, fromSupplierId)) ?? undefined;

      // 2. Cria o fornecedor no destino correto.
      const dest = await createInDestination(item, sourceEntry);

      // 3. Grava a NOTA do destino (status/obs/campos/anexos/cotações) via helper
      //    direto, suportando inclusive o scope dinâmico grupo-<id>.
      const extraFields: Record<string, string> = {};
      if (item.kind === "subgroup" && (item.subtipo === "aquario" || item.subtipo === "terrario")) {
        extraFields.subtipoAquario = item.subtipo;
      }
      await writeEntryDirect(
        dest.noteScope,
        buildFullMigratedNote(dest.id, sourceEntry, extraFields),
      );

      // 4. Marca a nota de ORIGEM (qualquer dashboard) como MIGRADA, sem apagar
      //    o histórico. As listas ocultam por padrão fornecedores migrados e
      //    mostram um selo "Migrado → <destino>". Preserva status/observações.
      const destLabel =
        isUnclassified || !selectedMacro
          ? `Sem classificação · ${item.label}`
          : destinationLabel(selectedMacro.number, selectedItem.hier, item.label);
      const originEntry: SupplierNoteEntry = sourceEntry ?? {
        supplierId: fromSupplierId,
        status: "nao-visitado",
        observacoes: "",
        fields: {},
        attachments: [],
        quoteRows: [],
        groupIds: [],
        createdAt: new Date().toLocaleDateString("pt-BR"),
        updatedAt: new Date().toLocaleDateString("pt-BR"),
      };
      await writeEntryDirect(fromScope, {
        ...originEntry,
        fields: {
          ...originEntry.fields,
          migratedTo: destLabel,
          migratedToScope: dest.noteScope,
          migratedToId: dest.id,
          migratedAt: new Date().toLocaleDateString("pt-BR"),
        },
        updatedAt: new Date().toLocaleDateString("pt-BR"),
      });
      toast.success("Contato migrado", {
        description: `${context.supplierName} → ${destLabel}`,
      });
      onMigrated?.();
      close();
    } catch (err) {
      toast.error("Erro ao migrar contato", {
        description: err instanceof Error ? err.message : String(err),
      });
      setBusy(false);
    }
  }

  const itemKindLabel: Record<MacroItem["kind"], string> = {
    group: "Dashboard promovido",
    subgroup: "Especialidade",
    dashboard: "Dashboard",
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider font-bold transition-transform active:scale-[0.97]"
        style={{
          background: `${accent}14`,
          color: accent,
          border: `1px solid ${accent}55`,
        }}
        title="Migrar este contato para um subgrupo de um macro"
      >
        <Layers className="w-3.5 h-3.5" />
        {label}
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 flex items-center justify-center p-4 animate-[fadeIn_140ms_ease-out]"
            style={{
              background: "rgba(15,15,20,0.62)",
              backdropFilter: "blur(4px)",
              zIndex: 9999,
            }}
            onClick={close}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[88vh] overflow-y-auto animate-[scaleIn_180ms_cubic-bezier(0.23,1,0.32,1)]"
              style={{ border: "1px solid #e4e4e7" }}
            >
              {/* Cabeçalho */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">{label}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{context.supplierName}</p>
                </div>
                <button
                  onClick={close}
                  className="p-1 rounded hover:bg-zinc-100 text-zinc-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Trilha de passos */}
              <div className="flex items-center gap-1.5 mb-4 text-[10px] font-bold uppercase tracking-wider">
                <StepDot active={step === "macro"} done={step !== "macro"} label="Macro" color={accent} />
                <span className="text-zinc-300">—</span>
                <StepDot active={step === "item"} done={step === "confirm"} label="Subgrupo" color={accent} />
                <span className="text-zinc-300">—</span>
                <StepDot active={step === "confirm"} done={false} label="Confirmar" color={accent} />
              </div>

              {/* PASSO 1 — escolher macro */}
              {step === "macro" && (
                <>
                  <p className="text-xs text-zinc-500 mb-3">
Passo 1 de 3 · Escolha o <b>macro</b> ao qual este fornecedor pertence.
                  </p>
                  {macros.length === 0 && unclassifiedItems.length === 0 ? (
                    <div className="text-xs text-zinc-500 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                      Nenhum macro criado ainda. Crie um macro em "Classificações"
                      na página inicial antes de migrar.
                    </div>
                  ) : (
                    <div className="space-y-1.5 mb-4">
                      {/* Destino especial: Sem classificação macro (onde mora o Yiwu
                          quando não atribuído a nenhum macro). Sempre visível para
                          manter o recurso descoberto; quando não há destino disponível
                          (ex.: a própria origem é o único item sem macro), o Passo 2
                          mostra um estado vazio explicativo. */}
                      {(
                        <button
                          type="button"
                          onClick={() => {
                            setMacroId(UNCLASSIFIED_ID);
                            setItemKey(null);
                          }}
                          className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
                          style={{
                            borderColor: isUnclassified ? "#64748b" : "#e4e4e7",
                            background: isUnclassified ? "#64748b14" : "white",
                          }}
                        >
                          <span
                            className="flex-shrink-0 flex items-center justify-center rounded-md"
                            style={{
                              background: "#64748b22",
                              color: "#475569",
                              width: 30,
                              height: 26,
                              border: "1px solid #64748b55",
                            }}
                          >
                            <Waves className="w-3.5 h-3.5" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-zinc-800 truncate">
                              Sem classificação macro
                            </span>
                            <span className="block text-[11px] text-zinc-500 truncate">
                              {unclassifiedItems.length > 0
                                ? `${unclassifiedItems.length} destino(s) disponíve(is)`
                                : "Nenhum destino disponível agora"}
                            </span>
                          </span>
                          {isUnclassified && (
                            <Check className="w-4 h-4" style={{ color: "#475569" }} />
                          )}
                        </button>
                      )}
                      {macros.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setMacroId(m.id);
                            setItemKey(null);
                          }}
                          className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
                          style={{
                            borderColor: macroId === m.id ? m.color : "#e4e4e7",
                            background: macroId === m.id ? `${m.color}10` : "white",
                          }}
                        >
                          <span
                            className="font-mono text-[11px] font-bold flex-shrink-0"
                            style={{
                              background: `${m.color}22`,
                              color: m.color,
                              padding: "2px 7px",
                              borderRadius: 5,
                              border: `1px solid ${m.color}55`,
                            }}
                          >
                            Nº {m.number}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-zinc-800 truncate">
                              {m.name}
                            </span>
                            <span className="block text-[11px] text-zinc-500 truncate">
                              {m.items.length} subgrupo(s)
                            </span>
                          </span>
                          {macroId === m.id && (
                            <Check className="w-4 h-4" style={{ color: m.color }} />
                          )}
                        </button>
                      ))}
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
                      onClick={() => macroId != null && setStep("item")}
                      disabled={macroId == null}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: macroId != null ? "#0f172a" : "#94a3b8" }}
                    >
                      Continuar
                    </button>
                  </div>
                </>
              )}

              {/* PASSO 2 — escolher o item/subgrupo do macro */}
              {step === "item" && (selectedMacro || isUnclassified) && (
                <>
                  <p className="text-xs text-zinc-500 mb-1">
                    Destino selecionado:{" "}
                    <strong className="text-zinc-700">
                      {isUnclassified || !selectedMacro
                        ? "Sem classificação macro"
                        : `Nº ${selectedMacro.number} · ${selectedMacro.name}`}
                    </strong>
                  </p>
                  <p className="text-xs text-zinc-500 mb-3">
                    Passo 2 de 3 · Escolha o <b>destino</b>. Ao confirmar, o
                    fornecedor sai da lista atual e passa a aparecer lá.
                  </p>

                  {macroItems.length === 0 ? (
                    <div className="text-xs text-zinc-500 p-4 bg-zinc-50 rounded-lg border border-zinc-200 mb-4">
                      {isUnclassified
                        ? "Não há destinos sem classificação disponíveis."
                        : 'Este macro ainda não tem subgrupos/itens. Adicione itens a ele em "Classificações" na página inicial antes de migrar.'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 mb-4">
                      {macroItems.map(({ item, label }) => {
                        const accentColor = selectedMacro?.color ?? "#64748b";
                        return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setItemKey(item.key)}
                          className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
                          style={{
                            borderColor: itemKey === item.key ? accentColor : "#e4e4e7",
                            background: itemKey === item.key ? `${accentColor}10` : "white",
                          }}
                        >
                          <span
                            className="font-mono text-[11px] font-bold flex-shrink-0"
                            style={{
                              background: `${accentColor}22`,
                              color: accentColor,
                              padding: "2px 7px",
                              borderRadius: 5,
                              border: `1px solid ${accentColor}55`,
                            }}
                          >
                            {label}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-zinc-800 truncate">
                              {item.label}
                            </span>
                            <span className="block text-[10px] uppercase tracking-wider text-zinc-400">
                              {itemKindLabel[item.kind]}
                            </span>
                          </span>
                          {itemKey === item.key ? (
                            <Check className="w-4 h-4" style={{ color: accentColor }} />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-300" />
                          )}
                        </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setStep("macro")}
                      className="px-4 py-2 rounded-lg text-sm border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => itemKey && setStep("confirm")}
                      disabled={!itemKey}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: itemKey ? "#0f172a" : "#94a3b8" }}
                    >
                      Continuar
                    </button>
                  </div>
                </>
              )}

              {/* PASSO 3 — confirmar */}
              {step === "confirm" && (selectedMacro || isUnclassified) && selectedItem && (
                <>
                  <div className="rounded-lg border border-violet-300 bg-violet-50 p-3 mb-4">
                    <p className="text-sm text-violet-900 leading-relaxed">
                      Confirmar migração de <strong>{context.supplierName}</strong> para{" "}
                      <strong>
                        {isUnclassified || !selectedMacro
                          ? `Sem classificação · ${selectedItem.item.label}`
                          : `${selectedMacro.number}.${selectedItem.hier} · ${selectedItem.item.label}`}
                      </strong>
                      ?
                      <br />
                      O fornecedor será cadastrado nesse subgrupo levando os dados
                      (contatos, localização), o status, as observações e as
                      cotações — e será{" "}
                      <strong>removido da lista de origem</strong>.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setStep("item")}
                      className="px-4 py-2 rounded-lg text-sm border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                      disabled={busy}
                    >
                      Voltar
                    </button>
                    <button
                      onClick={confirmMigration}
                      disabled={busy}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60"
                      style={{ background: accent }}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Migrando…
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Confirmar migração
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function StepDot({
  active,
  done,
  label,
  color,
}: {
  active: boolean;
  done: boolean;
  label: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{ color: active || done ? color : "#a1a1aa" }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: active || done ? color : "#d4d4d8" }}
      />
      {label}
    </span>
  );
}
