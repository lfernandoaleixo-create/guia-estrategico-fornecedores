import { useEffect, useMemo, useState } from "react";
import { Star, StickyNote, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useYiwuNotes } from "@yiwu/hooks/useYiwuNotes";

type Props = {
  supplierId: number;
  supplierName: string;
  variant?: "compact" | "full";
  className?: string;
};

/**
 * Per-supplier annotation controls (versão sem login, persistência local).
 * - O botão de estrela alterna o favorito (atualização otimista) salvando em localStorage.
 * - O botão de nota abre o dialog para editar uma nota privada de até 2000 caracteres.
 */
export function SupplierAnnotation({ supplierId, supplierName, variant = "compact", className }: Props) {
  const { notes, toggleFavorite, saveNote, removeNote } = useYiwuNotes();

  const current = useMemo(
    () => notes.find(n => n.supplierId === supplierId),
    [notes, supplierId],
  );

  const isFavorite = Boolean(current?.favorite);
  const noteText = current?.note ?? "";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftNote, setDraftNote] = useState("");

  useEffect(() => {
    if (dialogOpen) setDraftNote(noteText);
  }, [dialogOpen, noteText]);

  const hasNote = (noteText?.trim().length ?? 0) > 0;

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
        title={hasNote ? "Editar nota privada" : "Adicionar nota privada"}
        className={`p-1.5 rounded-md border transition-all duration-150 active:scale-[0.92] ${
          hasNote
            ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
            : "border-border/50 text-muted-foreground hover:text-cyan-300 hover:border-cyan-400/40 hover:bg-cyan-400/10"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      >
        <StickyNote className="w-3.5 h-3.5" />
      </button>

      {variant === "full" && hasNote && (
        <span className="text-[10px] font-mono text-cyan-300/80 max-w-[160px] truncate">
          {noteText}
        </span>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Nota privada</DialogTitle>
            <DialogDescription className="text-xs">
              <span className="font-mono text-primary">{supplierName}</span>
              <span className="block mt-1">
                Salva localmente neste navegador. Use para registrar contato preferido, condições, observações de visita, etc.
              </span>
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={draftNote}
            onChange={e => setDraftNote(e.target.value)}
            maxLength={2000}
            placeholder="Ex.: Visitar dia 3 às 14h. Pedir catálogo de copos térmicos 350ml."
            className="min-h-[140px] text-sm"
          />
          <div className="text-[10px] font-mono text-muted-foreground text-right">
            {draftNote.length}/2000
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            {hasNote && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  removeNote(supplierId);
                  toast.success("Anotação removida.");
                  setDialogOpen(false);
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Apagar
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => {
                saveNote(supplierId, draftNote);
                toast.success("Nota salva.");
                setDialogOpen(false);
              }}
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Salvar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
