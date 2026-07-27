// =============================================================================
// TopicAttachments — área de anexos de UM assunto (tema) de fornecedor parceiro.
//
// Usado na Central de Documentos (Grupo Nº 00). Reaproveita o backend de upload
// S3 já existente (useSupplierNotes.addAttachment / removeAttachment) usando o
// escopo lógico `parceiro-<partnerId>` e supplierId = <topicId>. Aceita QUALQUER
// tipo de arquivo (cotação, catálogo, foto, vídeo, Excel, PDF, etc.), até 20 MB.
// =============================================================================
import { useRef, useState } from "react";
import {
  Upload,
  Trash2,
  Download,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Film,
  File as FileIcon,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { SupplierAttachment } from "./useSupplierNotes";

const BORDER = "oklch(0.22 0.03 250)";
const TEXT_PRIMARY = "oklch(0.97 0.01 80)";
const TEXT_MUTED = "oklch(0.65 0.02 80)";
const SURFACE_2 = "oklch(0.13 0.02 250)";

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isImage(att: SupplierAttachment) {
  return att.type.startsWith("image/");
}
function isVideo(att: SupplierAttachment) {
  return att.type.startsWith("video/");
}
function isSpreadsheet(att: SupplierAttachment) {
  return (
    att.type.includes("spreadsheet") ||
    att.type.includes("excel") ||
    !!att.name.toLowerCase().match(/\.(xlsx?|csv|ods)$/)
  );
}
function isPdf(att: SupplierAttachment) {
  return att.type === "application/pdf" || att.name.toLowerCase().endsWith(".pdf");
}

/** Fonte para <img>/<video> (segue redirect assinado). */
function attachmentSrc(att: SupplierAttachment): string {
  return att.url ?? att.dataUrl ?? "";
}

/** URL na MESMA ORIGEM para download/leitura sem CORS. */
function attachmentStreamSrc(att: SupplierAttachment): string {
  if (att.fileKey) return `/api/attachment-file?key=${encodeURIComponent(att.fileKey)}`;
  if (att.url && att.url.startsWith("/manus-storage/")) {
    const key = att.url.slice("/manus-storage/".length);
    return `/api/attachment-file?key=${encodeURIComponent(key)}`;
  }
  return att.url ?? att.dataUrl ?? "";
}

async function downloadAttachment(att: SupplierAttachment) {
  if (att.url || att.fileKey) {
    const fetchUrl = attachmentStreamSrc(att);
    try {
      const resp = await fetch(fetchUrl, { credentials: "include" });
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
    } catch {
      window.open(att.url, "_blank", "noopener");
    }
    return;
  }
  if (att.dataUrl) {
    const a = document.createElement("a");
    a.href = att.dataUrl;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

function AttachmentIcon({ att }: { att: SupplierAttachment }) {
  if (isImage(att)) return <ImageIcon size={18} style={{ color: "#2563eb" }} />;
  if (isVideo(att)) return <Film size={18} style={{ color: "#7c3aed" }} />;
  if (isPdf(att)) return <FileText size={18} style={{ color: "#dc2626" }} />;
  if (isSpreadsheet(att)) return <FileSpreadsheet size={18} style={{ color: "#16a34a" }} />;
  return <FileIcon size={18} style={{ color: TEXT_MUTED }} />;
}

interface TopicAttachmentsProps {
  accent: string;
  attachments: SupplierAttachment[];
  /** Faz upload de um arquivo; resolve quando concluído. */
  onUpload: (file: File, onProgress?: (pct: number) => void) => Promise<unknown>;
  onRemove: (attachmentId: string) => void;
}

export default function TopicAttachments({
  accent,
  attachments,
  onUpload,
  onRemove,
}: TopicAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<SupplierAttachment | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (file.size > 99 * 1024 * 1024) {
        toast.error(`"${file.name}" passa de 99 MB. Compacte ou reduza antes de anexar.`);
        continue;
      }
      setUploading(true);
      setProgress(0);
      try {
        await onUpload(file, (pct) => setProgress(pct));
        toast.success(`"${file.name}" anexado`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao anexar arquivo");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="*/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Botão de upload */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-transform active:scale-[0.97] disabled:opacity-60"
        style={{ background: `${accent}1f`, color: accent, border: `1px solid ${accent}55` }}
      >
        {uploading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Enviando… {progress}%
          </>
        ) : (
          <>
            <Upload className="w-3.5 h-3.5" />
            Anexar arquivo (PDF, Excel, foto, vídeo…)
          </>
        )}
      </button>

      {/* Lista de anexos */}
      {attachments.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-2.5 rounded-lg border"
              style={{ borderColor: BORDER, background: SURFACE_2 }}
            >
              {/* thumbnail/ícone */}
              <button
                onClick={() => (isImage(att) || isVideo(att) ? setPreview(att) : downloadAttachment(att))}
                className="flex items-center justify-center w-10 h-10 rounded-md overflow-hidden shrink-0"
                style={{ background: "oklch(0.18 0.02 250)" }}
                title={isImage(att) || isVideo(att) ? "Visualizar" : "Baixar"}
              >
                {isImage(att) ? (
                  <img src={attachmentSrc(att)} alt={att.name} className="w-full h-full object-cover" />
                ) : (
                  <AttachmentIcon att={att} />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: TEXT_PRIMARY }}>
                  {att.name}
                </p>
                <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
                  {formatSize(att.size)} {att.addedAt ? `· ${att.addedAt}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {(isImage(att) || isVideo(att) || isPdf(att)) && (
                  <button
                    onClick={() => setPreview(att)}
                    className="p-1.5 rounded hover:bg-white/5"
                    style={{ color: TEXT_MUTED }}
                    title="Visualizar"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => downloadAttachment(att)}
                  className="p-1.5 rounded hover:bg-white/5"
                  style={{ color: TEXT_MUTED }}
                  title="Baixar"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Remover o anexo "${att.name}"?`)) onRemove(att.id);
                  }}
                  className="p-1.5 rounded hover:bg-red-500/10"
                  style={{ color: "#fca5a5" }}
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs" style={{ color: TEXT_MUTED }}>
          Nenhum arquivo anexado neste assunto ainda.
        </p>
      )}

      {/* Preview modal (imagem / vídeo / pdf) */}
      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setPreview(null)}
        >
          <div
            className="max-w-4xl w-full max-h-[88vh] rounded-xl overflow-hidden"
            style={{ background: "oklch(0.10 0.02 250)", border: `1px solid ${BORDER}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BORDER }}>
              <p className="text-sm truncate" style={{ color: TEXT_PRIMARY }}>
                {preview.name}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadAttachment(preview)}
                  className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded"
                  style={{ color: accent, border: `1px solid ${accent}55` }}
                >
                  <Download className="w-3 h-3" /> Baixar
                </button>
                <button onClick={() => setPreview(null)} className="text-sm" style={{ color: TEXT_MUTED }}>
                  Fechar
                </button>
              </div>
            </div>
            <div className="p-3 flex items-center justify-center overflow-auto" style={{ maxHeight: "78vh" }}>
              {isImage(preview) ? (
                <img src={attachmentSrc(preview)} alt={preview.name} className="max-w-full max-h-[74vh] object-contain" />
              ) : isVideo(preview) ? (
                <video src={attachmentSrc(preview)} controls className="max-w-full max-h-[74vh]" />
              ) : isPdf(preview) ? (
                <iframe
                  src={attachmentStreamSrc(preview)}
                  title={preview.name}
                  className="w-full"
                  style={{ height: "74vh", border: "none", background: "#fff" }}
                />
              ) : (
                <div className="text-center py-12" style={{ color: TEXT_MUTED }}>
                  <FileIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="mb-3">Pré-visualização não disponível para este tipo de arquivo.</p>
                  <button
                    onClick={() => downloadAttachment(preview)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: accent, color: "oklch(0.10 0.02 250)" }}
                  >
                    <Download className="w-4 h-4" /> Baixar arquivo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
