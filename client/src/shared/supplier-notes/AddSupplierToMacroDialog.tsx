// =============================================================================
// AddSupplierToMacroDialog — abre o cadastro de fornecedor a partir de um MACRO
// específico na Home. O macro fica PRÉ-FIXADO no seletor de subgrupo (o usuário
// escolhe/cria apenas a 2ª parte, ex.: macro 1 fixo → digita "3" → cria 1.3).
//
// O fornecedor é criado no scope "aquario" (onde o sistema de subgrupos macro.sub
// está plenamente integrado e visível) e o vínculo do subgrupo é gravado na NOTA
// do fornecedor (fields.subgroupId) — mesmo padrão de CustomSuppliersSection.
// =============================================================================
import { useState } from "react";
import CustomSupplierFormDialog from "./CustomSupplierFormDialog";
import { useCustomSuppliers, type CustomSupplier } from "./useCustomSuppliers";
import { useSupplierNotes } from "./useSupplierNotes";

interface Props {
  open: boolean;
  /** Número do macro de onde o cadastro foi aberto (fica fixo no seletor). */
  macroNumber: number;
  /** Nome do macro, só para contexto visual (não obrigatório). */
  macroName?: string;
  onClose: () => void;
  /** Callback opcional após criar com sucesso. */
  onCreated?: () => void;
}

export default function AddSupplierToMacroDialog({
  open,
  macroNumber,
  onClose,
  onCreated,
}: Props) {
  const customSuppliers = useCustomSuppliers("aquario");
  const notes = useSupplierNotes("aquario");
  const [subgroupId, setSubgroupId] = useState<string | null>(null);

  async function handleSubmit(
    data: Omit<CustomSupplier, "id" | "scope" | "createdAt" | "updatedAt">,
  ) {
    const created = await customSuppliers.create(data);
    if (created && subgroupId) {
      notes.upsertEntry(created.id, { fields: { subgroupId } });
    }
    setSubgroupId(null);
    onCreated?.();
  }

  return (
    <CustomSupplierFormDialog
      open={open}
      scope="aquario"
      tone="dark"
      onClose={() => {
        setSubgroupId(null);
        onClose();
      }}
      onSubmit={handleSubmit}
      enableSubgroup
      subgroupId={subgroupId}
      onSubgroupChange={setSubgroupId}
      fixedMacroNumber={macroNumber}
    />
  );
}
