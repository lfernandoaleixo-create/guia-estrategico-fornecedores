// =============================================================================
// SupplierNotesPanel — UI unificada de anotações por fornecedor
// Compartilhada pelos 3 dashboards (Aquário, Tapete, Yiwu).
//
// Layout baseado no modelo aprovado (print 3):
//   - Grade de botões STATUS DO FORNECEDOR (1 selecionado por vez)
//   - Textarea OBSERVAÇÕES com placeholder de exemplo
//   - Uploader de ANEXOS (PDF, planilhas, fotos)
//   - Botão "Salvar nota" + "Limpar"
//   - Data atualizada automaticamente (sem hora)
// =============================================================================

import { useEffect, useRef, useState } from "react";
import {
  STATUS_CONFIG,
  STATUS_ORDER,
  formatBytes,
  useSupplierNotes,
  type SupplierAttachment,
  type SupplierStatus,
} from "./useSupplierNotes";
import {
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Download,
  Save,
  Trash2,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";

interface Props {
  scope: "aquario" | "tapete" | "yiwu";
  supplierId: string;
  supplierName?: string;
  /** Cor de destaque (acento) — opcional, para casar com a paleta de cada dashboard */
  accent?: string;
  /** Texto compacto: oculta o cabeçalho "DIÁRIO DE NEGOCIAÇÃO" */
  compact?: boolean;
}

function isImage(att: SupplierAttachment) {
  return att.type.startsWith("image/");
}

function isSpreadsheet(att: SupplierAttachment) {
  return (
    att.type.includes("spreadsheet") ||
    att.type.includes("excel") ||
    att.name.toLowerCase().match(/\.(xlsx?|csv|ods)$/)
  );
}

function downloadDataURL(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function SupplierNotesPanel({
  scope,
  supplierId,
  supplierName,
  accent = "#16a34a",
  compact = false,
}: Props) {
  const {
    getEntry,
    upsertEntry,
    addAttachment,
    removeAttachment,
    deleteEntry,
  } = useSupplierNotes(scope);

  const entry = getEntry(supplierId);

  const [status, setStatus] = useState<SupplierStatus>(entry?.status ?? "nao-visitado");
  const [observacoes, setObservacoes] = useState(entry?.observacoes ?? "");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync quando entry chega async do IndexedDB ou troca o supplier
  useEffect(() => {
    setStatus(entry?.status ?? "nao-visitado");
    setObservacoes(entry?.observacoes ?? "");
  }, [entry?.supplierId, entry?.status, entry?.observacoes]);

  const attachments = entry?.attachments ?? [];

  const handleStatusClick = (s: SupplierStatus) => {
    setStatus(s);
    upsertEntry(supplierId, { status: s, observacoes });
    flashSaved();
  };

  const handleSave = () => {
    upsertEntry(supplierId, { status, observacoes });
    flashSaved();
  };

  const flashSaved = () => {
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 1600);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploadError(null);
    for (const f of Array.from(files)) {
      try {
        await addAttachment(supplierId, f);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Erro ao anexar arquivo");
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClear = () => {
    if (!confirm(
      `Apagar toda a anotação${supplierName ? ` de ${supplierName}` : ""}? Esta ação não pode ser desfeita.`,
    )) return;
    deleteEntry(supplierId);
    setStatus("nao-visitado");
    setObservacoes("");
  };

  const hasContent = observacoes.trim().length > 0 || attachments.length > 0 || status !== "nao-visitado";

  return (
    <div
      className="rounded-xl border bg-white p-4 sm:p-5 text-zinc-800"
      style={{ borderColor: "#e4e4e7" }}
    >
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-zinc-500" />
            <h4 className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500">
              Diário de Negociação
            </h4>
          </div>
          {entry?.updatedAt && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Calendar size={12} />
              <span>Atualizado em {entry.updatedAt}</span>
            </div>
          )}
        </div>
      )}

      {/* STATUS DO FORNECEDOR */}
      <div className="mb-4">
        <label className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500 block mb-2">
          Status do Fornecedor
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STATUS_ORDER.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleStatusClick(s)}
                className="text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2.5"
                style={{
                  background: active ? cfg.bg : "#fafafa",
                  borderWidth: "1.5px",
                  borderStyle: "solid",
                  borderColor: active ? cfg.border : "#e4e4e7",
                  color: active ? cfg.color : "#3f3f46",
                  boxShadow: active ? `0 0 0 3px ${cfg.bg}` : "none",
                }}
                aria-pressed={active}
              >
                <span className="text-lg leading-none">{cfg.emoji}</span>
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* OBSERVAÇÕES */}
      <div className="mb-4">
        <label className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500 block mb-2">
          Observações
        </label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Ex: Visitei em junho 2026. MOQ negociado para 50 unidades. Contato: Mr. Wang (+86 139…). Aguardando catálogo atualizado…"
          rows={5}
          className="w-full px-3.5 py-3 rounded-lg resize-y text-sm leading-relaxed focus:outline-none focus:ring-2 transition-all border bg-zinc-50"
          style={{
            borderColor: "#e4e4e7",
            // O ring usa a cor de acento do dashboard
            // (via CSS var inline com fallback)
            // @ts-expect-error - custom property for tailwind ring
            "--tw-ring-color": accent,
          }}
        />
        <p className="text-xs text-zinc-500 mt-1.5">
          {observacoes.length} {observacoes.length === 1 ? "caractere" : "caracteres"}
        </p>
      </div>

      {/* ANEXOS */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500">
            Anexos · {attachments.length}
          </label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all hover:bg-zinc-100 active:scale-[0.97] border bg-white"
            style={{ borderColor: "#e4e4e7", color: "#3f3f46" }}
          >
            <Paperclip size={13} /> Anexar arquivo
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.ods"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {uploadError && (
          <div
            className="mb-2 px-3 py-2 rounded-md text-xs"
            style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}
          >
            {uploadError}
          </div>
        )}

        {attachments.length === 0 ? (
          <div
            className="text-center py-5 rounded-lg border border-dashed text-xs text-zinc-500"
            style={{ borderColor: "#e4e4e7", background: "#fafafa" }}
          >
            Anexe fotos, PDFs, planilhas e contratos. Os arquivos ficam salvos no seu navegador (limite 8 MB por arquivo).
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachments.map((att) => (
              <li
                key={att.id}
                className="group flex items-center gap-3 px-3 py-2 rounded-lg border bg-white"
                style={{ borderColor: "#e4e4e7" }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center overflow-hidden"
                  style={{ background: "#f4f4f5" }}
                >
                  {isImage(att) ? (
                    <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                  ) : att.type === "application/pdf" ? (
                    <FileText size={18} style={{ color: "#dc2626" }} />
                  ) : isSpreadsheet(att) ? (
                    <FileSpreadsheet size={18} style={{ color: "#16a34a" }} />
                  ) : att.type.startsWith("image/") ? (
                    <ImageIcon size={18} style={{ color: "#2563eb" }} />
                  ) : (
                    <FileText size={18} style={{ color: "#52525b" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate text-zinc-800">{att.name}</div>
                  <div className="text-xs text-zinc-500">
                    {formatBytes(att.size)} · {att.addedAt}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => downloadDataURL(att.dataUrl, att.name)}
                    className="p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
                    aria-label="Baixar"
                    title="Baixar"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAttachment(supplierId, att.id)}
                    className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-red-600"
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

      {/* AÇÕES */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#e4e4e7" }}>
        <div className="flex items-center gap-2">
          {hasContent && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all hover:bg-red-50 text-red-600"
            >
              <Trash2 size={13} /> Limpar
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {savedHint && (
            <span className="text-xs inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 size={13} /> Salvo
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white inline-flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.97] shadow-sm"
            style={{ background: accent }}
          >
            <Save size={14} /> Salvar nota
          </button>
        </div>
      </div>
    </div>
  );
}
