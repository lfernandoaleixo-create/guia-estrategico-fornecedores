// =============================================================================
// CustomSuppliersSection — bloco completo (header + botão "+ Cadastrar" +
// lista de cards + modal). Reutilizável nos 3 dashboards.
// =============================================================================

import { useState } from "react";
import { Plus } from "lucide-react";
import CustomSupplierFormDialog from "./CustomSupplierFormDialog";
import CustomSupplierCard from "./CustomSupplierCard";
import { useCustomSuppliers, type CustomSupplier, type SupplierScope } from "./useCustomSuppliers";

interface Props {
  scope: SupplierScope;
  /** "dark" para Yiwu (tema escuro), "light" para Aquário/Tapete */
  tone?: "dark" | "light";
}

export default function CustomSuppliersSection({ scope, tone = "light" }: Props) {
  const customSuppliers = useCustomSuppliers(scope);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomSupplier | null>(null);

  const isDark = tone === "dark";
  const wrapper = isDark
    ? "border-amber-500/30 bg-amber-500/[0.05]"
    : "border-amber-300 bg-amber-50/60";
  const titleColor = isDark ? "text-amber-300" : "text-amber-700";
  const textColor = isDark ? "text-white/80" : "text-zinc-700";
  const button = isDark
    ? "bg-amber-500 hover:bg-amber-400 text-zinc-950"
    : "bg-amber-600 hover:bg-amber-700 text-white";

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

  return (
    <div className="mb-6">
      <div className={`rounded-xl border ${wrapper} p-4 flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <p className={`text-[11px] uppercase tracking-[0.18em] font-semibold ${titleColor}`}>
            Fornecedores cadastrados manualmente
          </p>
          <p className={`text-sm mt-0.5 ${textColor}`}>
            {customSuppliers.list.length === 0
              ? "Nenhum fornecedor manual cadastrado ainda. Adicione contatos novos que você encontrou fora da base."
              : `${customSuppliers.list.length} fornecedor(es) manual(is) cadastrado(s).`}
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

      {customSuppliers.list.length > 0 && (
        <div className="space-y-2 mt-3">
          {customSuppliers.list.map((s) => (
            <CustomSupplierCard
              key={s.id}
              supplier={s}
              tone={tone}
              onEdit={() => openEdit(s)}
              onDelete={() => void customSuppliers.remove(s.id)}
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
