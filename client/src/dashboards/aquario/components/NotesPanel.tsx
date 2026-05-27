// =============================================================================
// DESIGN: Mercado Oriental Premium
// Painel de notas pessoais com status de relacionamento por fornecedor
// =============================================================================

import { useState } from "react";
import { type Note, type useNotes, statusConfig } from "@aquario/hooks/useNotes";
import { type Supplier } from "@aquario/data/suppliers";
import { Pencil, Trash2, Save, X, StickyNote, Clock } from "lucide-react";

interface Props {
  supplier: Supplier;
  note: Note | undefined;
  onSave: (supplierId: string, text: string, status: Note["status"]) => void;
  onDelete: (supplierId: string) => void;
}

export default function NotesPanel({ supplier, note, onSave, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(note?.text || "");
  const [status, setStatus] = useState<Note["status"]>(note?.status || "nao-visitado");

  const handleSave = () => {
    onSave(supplier.id, text, status);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setText(note?.text || "");
    setStatus(note?.status || "nao-visitado");
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(supplier.id);
    setText("");
    setStatus("nao-visitado");
    setIsEditing(false);
  };

  const currentStatus = note?.status || "nao-visitado";
  const cfg = statusConfig[currentStatus];

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "oklch(0.9 0.004 80)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: "oklch(0.97 0.003 80)",
          borderColor: "oklch(0.9 0.004 80)",
        }}
      >
        <div className="flex items-center gap-2">
          <StickyNote size={14} style={{ color: "oklch(0.45 0.22 25)" }} />
          <span
            className="text-sm font-semibold"
            style={{ color: "oklch(0.2 0.01 60)" }}
          >
            Minhas Notas
          </span>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all hover:opacity-80"
            style={{
              background: "oklch(0.45 0.22 25 / 0.1)",
              color: "oklch(0.45 0.22 25)",
              border: "1px solid oklch(0.45 0.22 25 / 0.3)",
            }}
          >
            <Pencil size={11} />
            {note ? "Editar" : "Adicionar nota"}
          </button>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4" style={{ background: "oklch(1 0 0)" }}>
        {isEditing ? (
          <div className="space-y-3">
            {/* Seletor de status */}
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "oklch(0.45 0.01 60)" }}
              >
                STATUS DO FORNECEDOR
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(statusConfig) as Note["status"][]).map((s) => {
                  const c = statusConfig[s];
                  const isSelected = status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-all"
                      style={{
                        background: isSelected ? c.bg : "oklch(0.97 0.003 80)",
                        color: isSelected ? c.color : "oklch(0.5 0.01 60)",
                        border: isSelected
                          ? `1.5px solid ${c.color}`
                          : "1.5px solid oklch(0.9 0.004 80)",
                        fontWeight: isSelected ? "600" : "400",
                      }}
                    >
                      <span>{c.emoji}</span>
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Textarea de notas */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "oklch(0.45 0.01 60)" }}
              >
                OBSERVAÇÕES
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ex: Visitei em junho 2026. MOQ negociado para 50 unidades. Contato: Mr. Wang (+86 139...). Aguardando catálogo atualizado..."
                rows={4}
                className="w-full rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2"
                style={{
                  background: "oklch(0.97 0.003 80)",
                  border: "1px solid oklch(0.88 0.005 80)",
                  color: "oklch(0.2 0.01 60)",
                  lineHeight: "1.5",
                }}
              />
            </div>

            {/* Botões de ação */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
                style={{ background: "oklch(0.35 0.12 160)", color: "white" }}
              >
                <Save size={12} />
                Salvar nota
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{
                  background: "oklch(0.97 0.003 80)",
                  color: "oklch(0.45 0.01 60)",
                  border: "1px solid oklch(0.88 0.005 80)",
                }}
              >
                <X size={12} />
                Cancelar
              </button>
              {note && (
                <button
                  onClick={handleDelete}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    color: "oklch(0.45 0.22 25)",
                    border: "1px solid oklch(0.45 0.22 25 / 0.3)",
                  }}
                >
                  <Trash2 size={12} />
                  Excluir
                </button>
              )}
            </div>
          </div>
        ) : note ? (
          <div className="space-y-3">
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                <span>{cfg.emoji}</span>
                {cfg.label}
              </span>
            </div>
            {/* Texto da nota */}
            {note.text && (
              <p
                className="text-sm leading-relaxed"
                style={{ color: "oklch(0.3 0.01 60)" }}
              >
                {note.text}
              </p>
            )}
            {/* Data de atualização */}
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.6 0.01 60)" }}>
              <Clock size={11} />
              <span>Atualizado em {note.updatedAt}</span>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-4 gap-2 text-center"
            style={{ color: "oklch(0.65 0.01 60)" }}
          >
            <StickyNote size={24} style={{ opacity: 0.4 }} />
            <p className="text-xs">
              Nenhuma nota para este fornecedor.
              <br />
              Adicione observações, status e contatos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
