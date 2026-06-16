// =============================================================================
// attachmentViewer — visualizador + download de anexos REUTILIZÁVEL.
//
// Centraliza a lógica que antes vivia só dentro do SupplierNotesPanel:
//   - sniffers de tipo (imagem / vídeo / PDF / planilha)
//   - attachmentSrc / attachmentStreamSrc (mesma origem p/ leitura sem CORS)
//   - downloadAttachment (Blob + objectURL, com fallback p/ data URL legado)
//   - PdfCanvas (render via pdf.js em <canvas>, com zoom)
//   - SheetCanvas (planilha xlsx/csv/ods como tabela, via SheetJS)
//   - AttachmentLightbox (modal completo: imagem/vídeo/pdf/planilha + Baixar)
//
// Assim a MESMA experiência de "visualizar e baixar" pode ser usada no painel
// do fornecedor E direto no filtro por parceiro da Home, sem duplicar código.
// =============================================================================
import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  File as FileIcon,
  Loader2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as XLSX from "xlsx";
import type { SupplierAttachment } from "./useSupplierNotes";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ----- Sniffers de tipo -------------------------------------------------------

export function isImageAtt(att: SupplierAttachment): boolean {
  return (att.type ?? "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(att.name);
}
export function isVideoAtt(att: SupplierAttachment): boolean {
  return (att.type ?? "").startsWith("video/") || /\.(mp4|webm|mov|m4v|ogg)$/i.test(att.name);
}
export function isPdfAtt(att: SupplierAttachment): boolean {
  return att.type === "application/pdf" || att.name.toLowerCase().endsWith(".pdf");
}
export function isSheetAtt(att: SupplierAttachment): boolean {
  return (
    (att.type ?? "").includes("spreadsheet") ||
    (att.type ?? "").includes("excel") ||
    !!att.name.toLowerCase().match(/\.(xlsx?|csv|ods)$/)
  );
}
/** Qualquer tipo que conseguimos exibir embutido (sem só baixar). */
export function canPreviewAtt(att: SupplierAttachment): boolean {
  return isImageAtt(att) || isVideoAtt(att) || isPdfAtt(att) || isSheetAtt(att);
}

// ----- Fontes / conversões ----------------------------------------------------

/** Fonte para <img>/<video> (segue redirect assinado do S3 ou data URL legado). */
export function attachmentSrc(att: SupplierAttachment): string {
  return att.url ?? att.dataUrl ?? "";
}

/**
 * URL na MESMA ORIGEM para leitura por fetch().arrayBuffer() (pdf.js / SheetJS)
 * e download. Anexos do S3 passam por /api/attachment-file?key=<key> para evitar
 * o redirect 307 cross-origin sem CORS. Data URLs legados retornam como estão.
 */
export function attachmentStreamSrc(att: SupplierAttachment): string {
  if (att.fileKey) {
    return `/api/attachment-file?key=${encodeURIComponent(att.fileKey)}`;
  }
  if (att.url && att.url.startsWith("/manus-storage/")) {
    const key = att.url.slice("/manus-storage/".length);
    return `/api/attachment-file?key=${encodeURIComponent(key)}`;
  }
  return att.url ?? att.dataUrl ?? "";
}

function dataURLToBytes(dataUrl: string): Uint8Array | null {
  try {
    const base64 = dataUrl.split(",")[1];
    if (!base64) return null;
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function dataURLToBlob(dataUrl: string): Blob | null {
  try {
    const [header, base64] = dataUrl.split(",");
    if (!base64) return null;
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

/** Baixa um anexo de forma confiável (Blob + objectURL), com fallback. */
export async function downloadAttachment(att: SupplierAttachment): Promise<void> {
  if (att.url || att.fileKey) {
    const fetchUrl = attachmentStreamSrc(att);
    try {
      const resp = await fetch(fetchUrl, { credentials: "include" });
      const blob = await resp.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = att.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      return;
    } catch {
      window.open(att.url, "_blank", "noopener");
      return;
    }
  }
  if (att.dataUrl) {
    const blob = dataURLToBlob(att.dataUrl);
    const href = blob ? URL.createObjectURL(blob) : att.dataUrl;
    const a = document.createElement("a");
    a.href = href;
    a.download = att.name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (blob) setTimeout(() => URL.revokeObjectURL(href), 10_000);
  }
}

// ----- PdfCanvas --------------------------------------------------------------

export function PdfCanvas({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    setStatus("loading");

    let task: ReturnType<typeof pdfjsLib.getDocument> | null = null;

    const load = async () => {
      let docParams: Parameters<typeof pdfjsLib.getDocument>[0];

      if (src.startsWith("data:")) {
        const bytes = dataURLToBytes(src);
        if (!bytes) {
          if (!cancelled) setStatus("error");
          return;
        }
        docParams = { data: bytes };
      } else {
        try {
          const resp = await fetch(src, { credentials: "include" });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const buf = await resp.arrayBuffer();
          if (cancelled) return;
          docParams = { data: new Uint8Array(buf) };
        } catch {
          if (!cancelled) setStatus("error");
          return;
        }
      }

      task = pdfjsLib.getDocument(docParams);
      await task.promise
        .then(async (pdf) => {
          if (cancelled) return;
          const containerW = container.clientWidth || 800;
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            if (cancelled) return;
            const page = await pdf.getPage(pageNum);
            const baseViewport = page.getViewport({ scale: 1 });
            const fitScale = (containerW - 24) / baseViewport.width;
            const cssScale = fitScale * zoom;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const viewport = page.getViewport({ scale: cssScale * dpr });
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) continue;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = `${viewport.width / dpr}px`;
            canvas.style.height = `${viewport.height / dpr}px`;
            canvas.style.display = "block";
            canvas.style.marginBottom = "12px";
            canvas.style.borderRadius = "6px";
            canvas.style.boxShadow = "0 1px 6px rgba(0,0,0,0.15)";
            container.appendChild(canvas);
            await page.render({ canvasContext: ctx, viewport }).promise;
          }
          if (!cancelled) setStatus("ready");
        })
        .catch(() => {
          if (!cancelled) setStatus("error");
        });
    };

    void load();

    return () => {
      cancelled = true;
      task?.destroy?.();
    };
  }, [src, zoom]);

  const clampZoom = (z: number) => Math.min(3, Math.max(0.5, Math.round(z * 10) / 10));

  return (
    <div className="relative h-full w-full bg-zinc-200/60">
      {status === "ready" && (
        <div
          className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg bg-white/95 shadow-md border px-1 py-1"
          style={{ borderColor: "#e4e4e7" }}
        >
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z - 0.25))}
            disabled={zoom <= 0.5}
            title="Diminuir zoom"
            aria-label="Diminuir zoom"
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 transition-colors active:scale-[0.95]"
          >
            <Minus size={15} />
          </button>
          <span className="px-1 text-xs font-semibold tabular-nums text-zinc-600 select-none w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z + 0.25))}
            disabled={zoom >= 3}
            title="Aumentar zoom"
            aria-label="Aumentar zoom"
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 transition-colors active:scale-[0.95]"
          >
            <Plus size={15} />
          </button>
          {zoom !== 1 && (
            <button
              type="button"
              onClick={() => setZoom(1)}
              title="Ajustar à largura"
              aria-label="Ajustar à largura"
              className="ml-0.5 px-2 h-7 inline-flex items-center justify-center rounded-md text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors active:scale-[0.95]"
            >
              Ajustar
            </button>
          )}
        </div>
      )}
      <div className="h-full w-full overflow-auto">
        {status === "loading" && (
          <div className="h-full flex items-center justify-center text-sm text-zinc-500 gap-2">
            <Loader2 size={16} className="animate-spin" /> Carregando PDF…
          </div>
        )}
        {status === "error" && (
          <div className="h-full flex items-center justify-center text-sm text-zinc-500">
            Não foi possível renderizar o PDF. Use o botão Baixar.
          </div>
        )}
        <div
          ref={containerRef}
          className="p-3 flex flex-col items-center"
          style={{ display: status === "ready" ? "flex" : "none", width: "max-content", minWidth: "100%" }}
        />
      </div>
    </div>
  );
}

// ----- SheetCanvas ------------------------------------------------------------

export function SheetCanvas({ att }: { att: SupplierAttachment }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [rows, setRows] = useState<string[][]>([]);
  const wbRef = useRef<XLSX.WorkBook | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    wbRef.current = null;

    const parseBytes = (bytes: Uint8Array) => {
      const wb = XLSX.read(bytes, { type: "array" });
      if (cancelled) return;
      wbRef.current = wb;
      setSheetNames(wb.SheetNames);
      setActiveSheet(wb.SheetNames[0] ?? "");
      setStatus("ready");
    };

    const load = async () => {
      try {
        const src = attachmentStreamSrc(att);
        if (src.startsWith("data:")) {
          const bytes = dataURLToBytes(src);
          if (!bytes) throw new Error("data URL inválido");
          parseBytes(bytes);
          return;
        }
        const resp = await fetch(src, { credentials: "include" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        if (cancelled) return;
        parseBytes(new Uint8Array(buf));
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [att]);

  useEffect(() => {
    const wb = wbRef.current;
    if (!wb || !activeSheet) return;
    const ws = wb.Sheets[activeSheet];
    if (!ws) return;
    const data = XLSX.utils.sheet_to_json<string[]>(ws, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    const maxCols = data.reduce((m, r) => Math.max(m, r.length), 0);
    const normalized = data.map((r) => {
      const copy = r.slice();
      while (copy.length < maxCols) copy.push("");
      return copy.map((c) => (c == null ? "" : String(c)));
    });
    setRows(normalized);
  }, [activeSheet]);

  if (status === "loading") {
    return (
      <div className="h-full flex items-center justify-center text-sm text-zinc-500 gap-2">
        <Loader2 size={16} className="animate-spin" /> Carregando planilha…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <FileText size={40} style={{ color: "#a1a1aa" }} />
        <p className="text-sm text-zinc-600">Não foi possível abrir esta planilha. Use o botão Baixar.</p>
      </div>
    );
  }

  const headerRow = rows[0] ?? [];
  const bodyRows = rows.slice(1);

  return (
    <div className="h-full w-full flex flex-col bg-zinc-50">
      {sheetNames.length > 1 && (
        <div
          className="flex items-center gap-1 px-3 py-2 border-b bg-white overflow-x-auto shrink-0"
          style={{ borderColor: "#e4e4e7" }}
        >
          {sheetNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveSheet(name)}
              className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors active:scale-[0.97] ${
                name === activeSheet ? "bg-zinc-800 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-zinc-500">Planilha vazia.</div>
        ) : (
          <table className="border-collapse text-xs" style={{ minWidth: "100%" }}>
            <thead>
              <tr>
                <th
                  className="sticky top-0 left-0 z-20 bg-zinc-200 text-zinc-500 font-semibold border border-zinc-300 px-2 py-1 text-center"
                  style={{ minWidth: 40 }}
                >
                  #
                </th>
                {headerRow.map((cell, i) => (
                  <th
                    key={i}
                    className="sticky top-0 z-10 bg-zinc-100 text-zinc-700 font-semibold border border-zinc-300 px-2 py-1 text-left whitespace-nowrap"
                    style={{ minWidth: 90 }}
                  >
                    {cell || "\u00A0"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                  <td
                    className="sticky left-0 z-10 bg-zinc-100 text-zinc-400 border border-zinc-200 px-2 py-1 text-center tabular-nums"
                    style={{ minWidth: 40 }}
                  >
                    {ri + 2}
                  </td>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border border-zinc-200 px-2 py-1 text-zinc-700 whitespace-nowrap"
                      style={{ minWidth: 90 }}
                    >
                      {cell || "\u00A0"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ----- AttachmentLightbox -----------------------------------------------------

/**
 * Modal completo de visualização. Recebe o anexo selecionado (ou null) e um
 * callback de fechamento. Renderiza imagem/vídeo nativamente, PDF via PdfCanvas,
 * planilha via SheetCanvas, e oferece sempre o botão "Baixar". Fundo escuro e
 * conteúdo claro para leitura confortável de documentos.
 */
export function AttachmentLightbox({
  attachment,
  onClose,
}: {
  attachment: SupplierAttachment | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!attachment) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attachment, onClose]);

  if (!attachment) return null;

  const att = attachment;
  const img = isImageAtt(att);
  const vid = isVideoAtt(att);
  const pdf = isPdfAtt(att);
  const sheet = isSheetAtt(att);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 md:p-6"
      style={{ background: "rgba(0,0,0,0.82)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col bg-white"
        style={{ height: "min(88vh, 900px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: "#e4e4e7" }}>
          <FileText size={16} className="shrink-0 text-zinc-500" />
          <span className="flex-1 text-sm font-semibold truncate text-zinc-800">{att.name}</span>
          <button
            type="button"
            onClick={() => void downloadAttachment(att)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 bg-zinc-800 text-white hover:bg-zinc-900 transition-colors active:scale-[0.97]"
          >
            <Download size={13} /> Baixar
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 transition-colors active:scale-[0.95]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-h-0 bg-zinc-100">
          {img ? (
            <div className="h-full w-full overflow-auto flex items-center justify-center p-4">
              <img src={attachmentSrc(att)} alt={att.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : vid ? (
            <div className="h-full w-full flex items-center justify-center p-4 bg-black">
              <video src={attachmentSrc(att)} controls className="max-w-full max-h-full" />
            </div>
          ) : pdf ? (
            <PdfCanvas src={attachmentStreamSrc(att)} />
          ) : sheet ? (
            <SheetCanvas att={att} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <FileIcon size={42} className="text-zinc-400" />
              <p className="text-sm text-zinc-600">Pré-visualização não disponível para este tipo de arquivo.</p>
              <button
                type="button"
                onClick={() => void downloadAttachment(att)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-900 transition-colors active:scale-[0.97]"
              >
                <Download size={14} /> Baixar arquivo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
