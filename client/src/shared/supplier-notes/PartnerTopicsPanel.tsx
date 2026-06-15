// =============================================================================
// PartnerTopicsPanel — lista de Assuntos/Temas de UM fornecedor parceiro.
//
// Usado na Central de Documentos (Grupo Nº 00). Cada assunto tem título +
// observações editáveis e uma área de anexos (TopicAttachments) que reaproveita
// o upload S3 existente via escopo `parceiro-<partnerId>` (supplierId=<topicId>).
// =============================================================================
import { useMemo, useState } from "react";
import {
  Plus,
  Tag,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { usePartnerTopics, topicAttachmentScope, type PartnerTopic } from "./usePartnerTopics";
import { useSupplierNotes, type SupplierAttachment } from "./useSupplierNotes";
import TopicAttachments from "./TopicAttachments";

const BORDER = "oklch(0.22 0.03 250)";
const TEXT_PRIMARY = "oklch(0.97 0.01 80)";
const TEXT_MUTED = "oklch(0.65 0.02 80)";
const SURFACE = "oklch(0.10 0.02 250)";
const SURFACE_2 = "oklch(0.12 0.02 250)";

interface PartnerTopicsPanelProps {
  partnerId: string;
  /** Escopo do dashboard que contém o parceiro (ex.: "grupo-<id>"). */
  dashboardScope: string;
  accent: string;
}

const inputBase: React.CSSProperties = {
  background: "oklch(0.14 0.02 250)",
  border: `1px solid ${BORDER}`,
  color: TEXT_PRIMARY,
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
};

function TopicCard({
  topic,
  accent,
  attachments,
  onUpload,
  onRemoveAttachment,
  onSaveEdit,
  onDelete,
}: {
  topic: PartnerTopic;
  accent: string;
  attachments: SupplierAttachment[];
  onUpload: (file: File, onProgress?: (pct: number) => void) => Promise<unknown>;
  onRemoveAttachment: (attachmentId: string) => void;
  onSaveEdit: (title: string, notes: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(topic.title);
  const [notes, setNotes] = useState(topic.notes ?? "");

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("O título do assunto é obrigatório");
      return;
    }
    await onSaveEdit(title, notes);
    setEditing(false);
    toast.success("Assunto atualizado");
  };

  return (
    <div className="rounded-xl border" style={{ borderColor: BORDER, background: SURFACE_2 }}>
      {/* Cabeçalho do assunto */}
      <div className="flex items-center gap-2 p-3.5">
        <Tag className="w-4 h-4 shrink-0" style={{ color: accent }} />
        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ ...inputBase, fontSize: "0.95rem", fontWeight: 600 }}
            placeholder="Título do assunto (ex.: Vidro)"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex-1 min-w-0 text-left flex items-center gap-2"
          >
            <span className="font-semibold truncate" style={{ color: TEXT_PRIMARY, fontFamily: "'Fraunces', serif" }}>
              {topic.title}
            </span>
            {attachments.length > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: `${accent}1f`, color: accent }}
              >
                <Paperclip className="w-3 h-3" />
                {attachments.length}
              </span>
            )}
          </button>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <button onClick={handleSave} className="p-1.5 rounded hover:bg-white/5" style={{ color: accent }} title="Salvar">
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setTitle(topic.title);
                  setNotes(topic.notes ?? "");
                }}
                className="p-1.5 rounded hover:bg-white/5"
                style={{ color: TEXT_MUTED }}
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-white/5" style={{ color: accent }} title="Editar assunto">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Excluir o assunto "${topic.title}" e seus anexos?`)) onDelete();
                }}
                className="p-1.5 rounded hover:bg-red-500/10"
                style={{ color: "#fca5a5" }}
                title="Excluir assunto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen((v) => !v)} className="p-1.5 rounded hover:bg-white/5" style={{ color: TEXT_MUTED }}>
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Corpo do assunto */}
      {(open || editing) && (
        <div className="px-3.5 pb-3.5 border-t" style={{ borderColor: BORDER }}>
          <div className="pt-3">
            {editing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ ...inputBase, resize: "vertical" }}
                placeholder="Observações sobre este assunto (opcional)…"
              />
            ) : (
              topic.notes && (
                <p className="text-sm whitespace-pre-wrap mb-3" style={{ color: "oklch(0.80 0.015 80)", lineHeight: 1.5 }}>
                  {topic.notes}
                </p>
              )
            )}
          </div>

          {!editing && (
            <div className="mt-2">
              <TopicAttachments
                accent={accent}
                attachments={attachments}
                onUpload={onUpload}
                onRemove={onRemoveAttachment}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PartnerTopicsPanel({ partnerId, dashboardScope, accent }: PartnerTopicsPanelProps) {
  const { topics, createTopic, updateTopic, removeTopic } = usePartnerTopics(partnerId, dashboardScope);

  // Anexos de cada assunto vivem no escopo `parceiro-<partnerId>`, com
  // supplierId = topicId. Assim reaproveitamos todo o fluxo de upload S3.
  const attachScope = useMemo(() => topicAttachmentScope(partnerId), [partnerId]);
  const { entries, addAttachment, removeAttachment } = useSupplierNotes(attachScope);

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Informe o título do assunto");
      return;
    }
    await createTopic(newTitle, newNotes);
    setNewTitle("");
    setNewNotes("");
    setCreating(false);
    toast.success("Assunto criado");
  };

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: SURFACE }}>
      <div className="flex items-center justify-between mb-4">
        <h4
          className="text-sm font-semibold uppercase tracking-[0.14em]"
          style={{ color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
        >
          Assuntos / Temas
        </h4>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-transform active:scale-[0.97]"
            style={{ background: accent, color: "oklch(0.10 0.02 250)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Novo assunto
          </button>
        )}
      </div>

      {/* Formulário de novo assunto */}
      {creating && (
        <div className="rounded-xl border p-3 mb-3" style={{ borderColor: `${accent}55`, background: SURFACE_2 }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ ...inputBase, marginBottom: "0.5rem" }}
            placeholder="Título do assunto (ex.: Vidro)"
            autoFocus
          />
          <textarea
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            rows={2}
            style={{ ...inputBase, resize: "vertical" }}
            placeholder="Observações (opcional)…"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setCreating(false);
                setNewTitle("");
                setNewNotes("");
              }}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: TEXT_MUTED, border: `1px solid ${BORDER}` }}
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: accent, color: "oklch(0.10 0.02 250)" }}
            >
              <Check className="w-3.5 h-3.5" />
              Criar assunto
            </button>
          </div>
        </div>
      )}

      {/* Lista de assuntos */}
      {topics.length === 0 && !creating ? (
        <div className="text-center py-8 rounded-xl border-2 border-dashed" style={{ borderColor: BORDER, color: TEXT_MUTED }}>
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" style={{ color: accent }} />
          <p className="text-sm mb-3">Nenhum assunto cadastrado para este parceiro.</p>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: accent, color: "oklch(0.10 0.02 250)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Criar primeiro assunto
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              accent={accent}
              attachments={entries[topic.id]?.attachments ?? []}
              onUpload={(file, onProgress) => addAttachment(topic.id, file, "outros", onProgress)}
              onRemoveAttachment={(attId) => removeAttachment(topic.id, attId)}
              onSaveEdit={(title, notes) => updateTopic(topic.id, { title, notes })}
              onDelete={() => removeTopic(topic.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
