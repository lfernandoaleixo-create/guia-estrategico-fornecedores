// =============================================================================
// CustomSuppliersSection — bloco completo (header + botão "+ Cadastrar" +
// lista de cards + modal). Reutilizável nos 3 dashboards.
//
// Filtro por especialidade (Aquário x Terrário): quando `filterSubtipo` é
// definido (ex.: dashboard aberto via atalho 1.1 Terrário / 1.2 Aquário), só
// mostra os fornecedores manuais marcados naquela especialidade. A especialidade
// vive na NOTA do fornecedor (fields.subtipoAquario), então é passada via
// `specialtyById` por quem já carrega essas notas.
// =============================================================================

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import CustomSupplierFormDialog from "./CustomSupplierFormDialog";
import CustomSupplierCard from "./CustomSupplierCard";
import { useCustomSuppliers, genContactId, type CustomSupplier, type SupplierScope } from "./useCustomSuppliers";
import { filterSuppliersBySubtipo } from "./customSupplierFilter";
import { buildDuplicatePayload } from "./duplicateSupplier";
import { useSupplierNotes, SUBTIPO_CONFIG, type SubtipoAquario } from "./useSupplierNotes";

interface Props {
  scope: SupplierScope;
  /** "dark" para Yiwu (tema escuro), "light" para Aquário/Tapete */
  tone?: "dark" | "light";
  /**
   * Especialidade ativa (apenas scope aquario). Quando definido, a lista mostra
   * só os manuais marcados nessa especialidade. `null`/ausente = mostra todos.
   */
  filterSubtipo?: "aquario" | "terrario" | null;
  /** Mapa supplierId -> especialidade marcada (fields.subtipoAquario). */
  specialtyById?: Record<string, "aquario" | "terrario">;
}

export default function CustomSuppliersSection({
  scope,
  tone = "light",
  filterSubtipo = null,
  specialtyById,
}: Props) {
  const customSuppliers = useCustomSuppliers(scope);
  // Notas do scope: usadas para gravar a especialidade do cadastro DUPLICADO.
  const notes = useSupplierNotes(scope);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomSupplier | null>(null);

  // Duplica um fornecedor: novo cadastro independente + nota nova só com a
  // especialidade escolhida (negociação zerada).
  async function handleDuplicate(source: CustomSupplier, subtipo: SubtipoAquario) {
    const cfg = SUBTIPO_CONFIG[subtipo];
    const payload = buildDuplicatePayload(source, genContactId, {
      nameSuffix: `(${cfg.label})`,
    });
    const created = await customSuppliers.create(payload);
    if (created) {
      notes.upsertEntry(created.id, { fields: { subtipoAquario: subtipo } });
    }
  }

  const isDark = tone === "dark";
  const wrapper = isDark
    ? "border-amber-500/30 bg-amber-500/[0.05]"
    : "border-amber-300 bg-amber-50/60";
  const titleColor = isDark ? "text-amber-300" : "text-amber-700";
  const textColor = isDark ? "text-white/80" : "text-zinc-700";
  const button = isDark
    ? "bg-amber-500 hover:bg-amber-400 text-zinc-950"
    : "bg-amber-600 hover:bg-amber-700 text-white";

  // Lista visível depois de aplicar o filtro de especialidade (se houver).
  const visibleList = useMemo(
    () => filterSuppliersBySubtipo(customSuppliers.list, filterSubtipo, specialtyById ?? {}),
    [customSuppliers.list, filterSubtipo, specialtyById],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(s: CustomSupplier) {
    setEditing(s);
    setDialogOpen(true);
  }
  async function handleSubmit(
    data: Omit<CustomSupplier, "id" | "scope" | "createdAt" | "updatedAt">
  ) {
    if (editing) {
      await customSuppliers.update(editing.id, data);
    } else {
      await customSuppliers.create(data);
    }
  }

  const filtroAtivo = filterSubtipo === "aquario" || filterSubtipo === "terrario";
  const filtroLabel = filterSubtipo === "aquario" ? "🐟 Aquário" : "🦎 Terrário";

  return (
    <div className="mb-6">
      <div className={`rounded-xl border ${wrapper} p-4 flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <p className={`text-[11px] uppercase tracking-[0.18em] font-semibold ${titleColor}`}>
            Fornecedores cadastrados manualmente
            {filtroAtivo && <span className="ml-1 normal-case">· filtrando {filtroLabel}</span>}
          </p>
          <p className={`text-sm mt-0.5 ${textColor}`}>
            {visibleList.length === 0
              ? filtroAtivo
                ? `Nenhum fornecedor manual classificado como ${filtroLabel} ainda.`
                : "Nenhum fornecedor manual cadastrado ainda. Adicione contatos novos que você encontrou fora da base."
              : `${visibleList.length} fornecedor(es) manual(is)${filtroAtivo ? ` em ${filtroLabel}` : ""}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${button}`}
        >
          <Plus className="w-4 h-4" /> Cadastrar novo fornecedor
        </button>
      </div>

      {visibleList.length > 0 && (
        <div className="space-y-2 mt-3">
          {visibleList.map((s) => (
            <CustomSupplierCard
              key={s.id}
              supplier={s}
              tone={tone}
              onEdit={() => openEdit(s)}
              onDelete={() => void customSuppliers.remove(s.id)}
              onDuplicate={
                scope === "aquario"
                  ? (subtipo) => void handleDuplicate(s, subtipo)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <CustomSupplierFormDialog
        open={dialogOpen}
        scope={scope}
        initial={editing}
        tone={tone}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
