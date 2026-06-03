import { useMemo, useState } from "react";
import { Star, StickyNote } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useYiwuNotes } from "@yiwu/hooks/useYiwuNotes";
import SupplierNotesPanel from "@/shared/supplier-notes/SupplierNotesPanel";
import { useSupplierNotes } from "@/shared/supplier-notes/useSupplierNotes";

type Props = {
  supplierId: number;
  supplierName: string;
  variant?: "compact" | "full";
  className?: string;
};

/**
 * Per-supplier annotation controls (versão unificada, sem login).
 * - Estrela: alterna favorito (localStorage via useYiwuNotes).
 * - Bloco/folha de notas: abre o painel unificado com status, observações e anexos.
 */
export function SupplierAnnotation({ supplierId, supplierName, variant = "compact", className }: Props) {
  const { notes, toggleFavorite } = useYiwuNotes();
  const { getEntry } = useSupplierNotes("yiwu");

  const current = useMemo(
    () => notes.find(n => n.supplierId === supplierId),
    [notes, supplierId],
  );

  const isFavorite = Boolean(current?.favorite);
  const noteEntry = getEntry(String(supplierId));
  const hasNote = !!noteEntry && (noteEntry.observacoes.trim().length > 0 || noteEntry.attachments.length > 0 || noteEntry.status !== "nao-visitado");

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          try {
            toggleFavorite(supplierId);
          } catch {
            toast.error("Não foi possível atualizar o favorito.");
          }
        }}
        title={isFavorite ? "Remover dos favoritos" : "Marcar como favorito"}
        className={`p-1.5 rounded-md border transition-all duration-150 active:scale-[0.92] ${
          isFavorite
            ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
            : "border-border/50 text-muted-foreground hover:text-amber-300 hover:border-amber-400/40 hover:bg-amber-400/10"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      >
        <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
      </button>

      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          setDialogOpen(true);
        }}
        title={hasNote ? "Editar diário de negociação" : "Adicionar diário de negociação"}
        className={`p-1.5 rounded-md border transition-all duration-150 active:scale-[0.92] ${
          hasNote
            ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
            : "border-border/50 text-muted-foreground hover:text-cyan-300 hover:border-cyan-400/40 hover:bg-cyan-400/10"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      >
        <StickyNote className="w-3.5 h-3.5" />
      </button>

      {variant === "full" && hasNote && noteEntry?.observacoes && (
        <span className="text-[10px] font-mono text-cyan-300/80 max-w-[160px] truncate">
          {noteEntry.observacoes}
        </span>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-base text-zinc-900">Diário de Negociação</DialogTitle>
            <DialogDescription className="text-xs text-zinc-600">
              <span className="font-mono font-semibold text-zinc-800">{supplierName}</span>
              <span className="block mt-1 text-zinc-500">
                Status, observações e arquivos salvos no banco compartilhado (sincroniza entre dispositivos).
              </span>
            </DialogDescription>
          </DialogHeader>

          <SupplierNotesPanel
            scope="yiwu"
            supplierId={String(supplierId)}
            supplierName={supplierName}
            accent="#0891b2"
            compact
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
