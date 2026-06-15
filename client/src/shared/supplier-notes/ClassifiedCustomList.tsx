// =============================================================================
// ClassifiedCustomList — lista de fornecedores MANUAIS já classificados, para
// ser exibida nas abas/categorias (Aquário/Terrário) replicando o que foi
// marcado em Anotações/Diário. Reaproveita CustomSupplierCard e o hook de
// fornecedores manuais para manter a edição/remoção funcionando.
// =============================================================================

import { useState } from "react";
import CustomSupplierCard from "./CustomSupplierCard";
import CustomSupplierFormDialog from "./CustomSupplierFormDialog";
import {
  useCustomSuppliers,
  type CustomSupplier,
  type SupplierScope,
} from "./useCustomSuppliers";

interface Props {
  scope: SupplierScope;
  /** Subconjunto de fornecedores manuais a exibir (já filtrado por classificação) */
  suppliers: CustomSupplier[];
  tone?: "dark" | "light";
}

export default function ClassifiedCustomList({ scope, suppliers, tone = "light" }: Props) {
  const customSuppliers = useCustomSuppliers(scope);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomSupplier | null>(null);

  function openEdit(s: CustomSupplier) {
    setEditing(s);
    setDialogOpen(true);
  }

  async function handleSubmit(
    data: Omit<CustomSupplier, "id" | "scope" | "createdAt" | "updatedAt">
  ) {
    if (editing) {
      await customSuppliers.update(editing.id, data);
    }
  }

  if (suppliers.length === 0) return null;

  return (
    <div className="space-y-2">
      {suppliers.map((s) => (
        <CustomSupplierCard
          key={s.id}
          supplier={s}
          tone={tone}
          onEdit={() => openEdit(s)}
          onDelete={() => void customSuppliers.remove(s.id)}
        />
      ))}

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
