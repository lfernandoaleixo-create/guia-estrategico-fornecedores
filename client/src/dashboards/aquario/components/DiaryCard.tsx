// =============================================================================
// DiaryCard - card expansível com anotações de diário e anexos por fornecedor
// =============================================================================

import { useState, useRef, useCallback } from "react";
import { type Supplier } from "@aquario/data/suppliers";
import { useDiary, formatBytes, type DiaryAttachment } from "@aquario/hooks/useDiary";
import {
  ChevronDown,
  ChevronUp,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Download,
  CheckCircle2,
  Trash2,
  MapPin,
  Building2,
  Calendar,
  Eye,
} from "lucide-react";

interface Props {
  supplier: Supplier;
  defaultExpanded?: boolean;
}

const categoryStyles: Record<Supplier["category"], { icon: string; label: string; tint: string; border: string }> = {
  terrario: { icon: "🦎", label: "Terrário", tint: "oklch(0.96 0.04 145)", border: "oklch(0.85 0.06 145)" },
  aquario: { icon: "🐟", label: "Aquário", tint: "oklch(0.96 0.04 220)", border: "oklch(0.85 0.06 220)" },
  equipamento: { icon: "⚙️", label: "Equipamento", tint: "oklch(0.96 0.04 60)", border: "oklch(0.85 0.06 60)" },
  acessorio: { icon: "📦", label: "Acessório", tint: "oklch(0.96 0.04 280)", border: "oklch(0.85 0.06 280)" },
  mercado: { icon: "🏪", label: "Mercado · Feira", tint: "oklch(0.96 0.04 30)", border: "oklch(0.85 0.06 30)" },
};

function isImage(att: DiaryAttachment) {
  return att.type.startsWith("image/");
}

function downloadDataURL(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function DiaryCard({ supplier, defaultExpanded = false }: Props) {
  const { getEntry, upsertText, addAttachment, removeAttachment, deleteEntry } = useDiary();
  const entry = getEntry(supplier.id);
  const [expanded, setExpanded] = useState(defaultExpanded || !!entry);
  const [text, setText] = useState(entry?.text ?? "");
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewAtt, setPreviewAtt] = useState<DiaryAttachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync text quando o fornecedor é trocado
  const onTextChange = (v: string) => {
    setText(v);
  };

  const onSave = useCallback(() => {
    setSaving(true);
    upsertText(supplier.id, text);
    setTimeout(() => {
      setSaving(false);
      setSavedHint(true);
      setTimeout(() => setSavedHint(false), 1800);
    }, 200);
  }, [supplier.id, text, upsertText]);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploadError(null);
    for (const f of Array.from(files)) {
      try {
        await addAttachment(supplier.id, f);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Erro ao anexar arquivo");
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const onClearEntry = () => {
    if (!confirm(`Apagar todas as anotações e anexos de ${supplier.name}? Esta ação não pode ser desfeita.`)) return;
    deleteEntry(supplier.id);
    setText("");
  };

  const cat = categoryStyles[supplier.category];
  const attachments = entry?.attachments ?? [];
  const hasContent = (entry?.text?.length ?? 0) > 0 || attachments.length > 0;

  return (
    <article
      className="card-premium overflow-hidden transition-all duration-300"
      style={{
        background: "var(--card)",
        borderColor: hasContent ? cat.border : "var(--border)",
        borderWidth: hasContent ? "1.5px" : "1px",
      }}
    >
      {/* Header sempre visível - clique para expandir */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-black/[0.015] transition-colors"
      >
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: cat.tint, border: `1px solid ${cat.border}` }}
          aria-hidden
        >
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="eyebrow px-2 py-0.5 rounded"
              style={{ background: cat.tint, color: "oklch(0.32 0.06 60)", fontSize: "0.6rem" }}
            >
              {cat.label}
            </span>
            {hasContent && (
              <span
                className="eyebrow px-2 py-0.5 rounded inline-flex items-center gap-1"
                style={{
                  background: "oklch(0.95 0.05 50)",
                  color: "oklch(0.45 0.15 50)",
                  fontSize: "0.6rem",
                }}
              >
                <FileText size={10} /> com anotações
              </span>
            )}
            {attachments.length > 0 && (
              <span
                className="eyebrow px-2 py-0.5 rounded inline-flex items-center gap-1"
                style={{
                  background: "oklch(0.95 0.04 220)",
                  color: "oklch(0.4 0.13 220)",
                  fontSize: "0.6rem",
                }}
              >
                <Paperclip size={10} /> {attachments.length} {attachments.length === 1 ? "anexo" : "anexos"}
              </span>
            )}
          </div>
          <h3
            className="font-display font-semibold leading-tight"
            style={{ fontSize: "1.15rem", letterSpacing: "-0.015em" }}
          >
            {supplier.name}
          </h3>
          {supplier.namePortuguese && (
            <p
              className="italic mt-0.5"
              style={{ color: "oklch(0.55 0.012 60)", fontSize: "0.875rem", fontFamily: "var(--font-display)" }}
            >
              {supplier.namePortuguese}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "oklch(0.55 0.012 60)" }}>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {supplier.city}, {supplier.province}
            </span>
            {supplier.founded && (
              <span className="inline-flex items-center gap-1">
                <Building2 size={12} /> Desde {supplier.founded}
              </span>
            )}
            {entry?.updatedAt && (
              <span className="inline-flex items-center gap-1" style={{ color: "oklch(0.45 0.15 50)" }}>
                <Calendar size={12} /> {entry.updatedAt}
              </span>
            )}
          </div>
        </div>
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-transform"
          style={{ background: "oklch(0.96 0.005 60)", color: "oklch(0.45 0.012 60)" }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Área expansível */}
      {expanded && (
        <div
          className="px-5 pb-5 pt-2 border-t"
          style={{ borderColor: "var(--border)", background: "oklch(0.995 0.002 60)" }}
        >
          {/* Editor de anotações */}
          <div className="mb-4">
            <label
              className="eyebrow block mb-2"
              style={{ color: "oklch(0.45 0.012 60)", fontSize: "0.65rem" }}
            >
              Anotações de diário
            </label>
            <textarea
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder={`Anotações sobre ${supplier.name}: visitas, conversas, preços negociados, impressões…`}
              rows={6}
              className="w-full px-4 py-3 rounded-lg resize-y text-sm focus:outline-none focus:ring-2 transition-all"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-display)",
                lineHeight: 1.65,
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <p style={{ color: "oklch(0.55 0.012 60)", fontSize: "0.75rem" }}>
                {text.length} {text.length === 1 ? "caractere" : "caracteres"}
                {entry?.updatedAt && ` · última atualização ${entry.updatedAt}`}
              </p>
              <div className="flex items-center gap-2">
                {savedHint && (
                  <span
                    className="text-xs inline-flex items-center gap-1"
                    style={{ color: "oklch(0.5 0.15 145)" }}
                  >
                    <CheckCircle2 size={13} /> Salvo
                  </span>
                )}
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-[0.97]"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {saving ? "Salvando…" : "Salvar anotações"}
                </button>
              </div>
            </div>
          </div>

          {/* Anexos */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <label
                className="eyebrow"
                style={{ color: "oklch(0.45 0.012 60)", fontSize: "0.65rem" }}
              >
                Anexos · {attachments.length}
              </label>
              <button
                onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all hover:opacity-90 active:scale-[0.97]"
                style={{
                  background: "oklch(0.96 0.005 60)",
                  color: "oklch(0.32 0.012 60)",
                  border: "1px solid var(--border)",
                }}
              >
                <Paperclip size={13} /> Anexar arquivo
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                onChange={(e) => onFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {uploadError && (
              <div
                className="mb-2 px-3 py-2 rounded-md text-xs"
                style={{
                  background: "oklch(0.96 0.05 25)",
                  color: "oklch(0.42 0.18 25)",
                  border: "1px solid oklch(0.85 0.08 25)",
                }}
              >
                {uploadError}
              </div>
            )}

            {attachments.length === 0 ? (
              <div
                className="text-center py-6 rounded-lg border border-dashed text-xs"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--card)",
                  color: "oklch(0.55 0.012 60)",
                }}
              >
                Anexe fotos, PDFs, planilhas e contratos. Os arquivos ficam salvos no seu navegador (limite 8 MB por arquivo).
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att) => (
                  <li
                    key={att.id}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg border"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center overflow-hidden"
                      style={{ background: "oklch(0.96 0.005 60)" }}
                    >
                      {isImage(att) ? (
                        <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                      ) : att.type === "application/pdf" ? (
                        <FileText size={18} style={{ color: "oklch(0.45 0.18 25)" }} />
                      ) : att.type.startsWith("image/") ? (
                        <ImageIcon size={18} style={{ color: "oklch(0.45 0.13 220)" }} />
                      ) : (
                        <FileText size={18} style={{ color: "oklch(0.45 0.012 60)" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                        {att.name}
                      </div>
                      <div className="text-xs" style={{ color: "oklch(0.55 0.012 60)" }}>
                        {formatBytes(att.size)} · {att.addedAt}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isImage(att) && (
                        <button
                          onClick={() => setPreviewAtt(att)}
                          className="p-1.5 rounded-md hover:bg-black/[0.04] transition-colors"
                          aria-label="Visualizar"
                          title="Visualizar"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => downloadDataURL(att.dataUrl, att.name)}
                        className="p-1.5 rounded-md hover:bg-black/[0.04] transition-colors"
                        aria-label="Baixar"
                        title="Baixar"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => removeAttachment(supplier.id, att.id)}
                        className="p-1.5 rounded-md hover:bg-black/[0.04] transition-colors"
                        style={{ color: "oklch(0.45 0.18 25)" }}
                        aria-label="Remover"
                        title="Remover"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ações destrutivas */}
          {hasContent && (
            <div className="pt-3 border-t flex justify-end" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={onClearEntry}
                className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all hover:bg-black/[0.04]"
                style={{ color: "oklch(0.45 0.18 25)" }}
              >
                <Trash2 size={12} /> Apagar entrada deste fornecedor
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de preview de imagem */}
      {previewAtt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "oklch(0 0 0 / 0.7)" }}
          onClick={() => setPreviewAtt(null)}
        >
          <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewAtt(null)}
              className="absolute -top-10 right-0 text-white p-2 rounded-md hover:bg-white/10"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
            <img
              src={previewAtt.dataUrl}
              alt={previewAtt.name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <div className="mt-2 text-white text-sm text-center">{previewAtt.name}</div>
          </div>
        </div>
      )}
    </article>
  );
}
