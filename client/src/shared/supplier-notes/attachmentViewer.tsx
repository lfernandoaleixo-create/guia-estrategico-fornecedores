// =============================================================================
// attachmentViewer — visualizador + download de anexos REUTILIZÁVEL.
//
// Centraliza a lógica que antes vivia só dentro do SupplierNotesPanel:
//   - sniffers de tipo (imagem / vídeo / PDF / planilha)
//   - attachmentSrc / attachmentStreamSrc (mesma origem p/ leitura sem CORS)
//   - downloadAttachment (Blob + objectURL, com fallback p/ data URL legado)
//   - PdfCanvas (render via pdf.js em <canvas>, com zoom) + modo tradução PT
//   - SheetCanvas (planilha xlsx/csv/ods como tabela, via SheetJS) + tradução PT
//   - AttachmentLightbox (modal completo: imagem/vídeo/pdf/planilha + Baixar)
//
// TRADUÇÃO CN⇄PT: planilhas e PDFs com texto chinês podem ser alternados entre
// o original (中文) e português, sem refazer a chamada (cache no cliente). No
// download, o usuário escolhe baixar em Português (gerado) ou Chinês (original).
// =============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Download,
  FileText,
  File as FileIcon,
  Languages,
  Loader2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import JSZip from "jszip";
import { trpc } from "@/lib/trpc";
import { isTranslatableText, hasChinese, hasNonLatinScript } from "./translatableText";
import { collectWordRunTexts, applyWordTranslation } from "./docxTranslate";
import type { SupplierAttachment } from "./useSupplierNotes";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type DocLang = "zh" | "pt";

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
export function isWordAtt(att: SupplierAttachment): boolean {
  // Apenas .docx (Office Open XML) é manipulável preservando formatação via JSZip.
  // .doc (binário legado) não é suportado para tradução/preview.
  return (
    att.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    att.name.toLowerCase().endsWith(".docx")
  );
}
/** Qualquer tipo que conseguimos exibir embutido (sem só baixar). */
export function canPreviewAtt(att: SupplierAttachment): boolean {
  return isImageAtt(att) || isVideoAtt(att) || isPdfAtt(att) || isSheetAtt(att) || isWordAtt(att);
}

/**
 * Regra de NEGÓCIO da tradução automática (CN⇄PT): por decisão do Fernando,
 * traduzir PDF é lento e desconfigura o documento; então a tradução fica
 * disponível APENAS para planilhas (Excel/CSV/ODS) e Word (.docx), formatos em
 * que conseguimos reescrever o conteúdo preservando o layout original. PDF e
 * imagem continuam visíveis, porém sem toggle de idioma (download simples).
 */
export function isTranslatableAtt(att: SupplierAttachment): boolean {
  return isSheetAtt(att) || isWordAtt(att);
}

// isTranslatableText / hasChinese / hasNonLatinScript agora vêm de
// ./translatableText (módulo puro reutilizado pelo núcleo de tradução de Word).

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

async function attachmentBytes(att: SupplierAttachment): Promise<Uint8Array | null> {
  const src = attachmentStreamSrc(att);
  if (!src) return null;
  if (src.startsWith("data:")) return dataURLToBytes(src);
  try {
    const resp = await fetch(src, { credentials: "include" });
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

/**
 * Converte um anexo (imagem ou página rasterizada) em data URL base64 — formato
 * que o OCR multimodal aceita com confiabilidade (a URL assinada do S3 não é
 * acessível pelo provedor de LLM externo).
 */
async function attachmentToDataUrl(att: SupplierAttachment): Promise<string | null> {
  const src = attachmentStreamSrc(att);
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    const resp = await fetch(src, { credentials: "include" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Mapeia a extensão do nome do arquivo para um MIME correto. Garante que o
 * navegador trate o Blob como ARQUIVO (e o salve), em vez de abrir um link.
 */
export function mimeForName(name: string): string | null {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m ? m[1] : "";
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "xls":
      return "application/vnd.ms-excel";
    case "csv":
      return "text/csv";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    case "txt":
      return "text/plain";
    default:
      return null;
  }
}

/** Reembala o Blob com o MIME esperado quando o servidor devolveu algo genérico. */
export function blobWithCorrectType(blob: Blob, filename: string, fallbackMime?: string): Blob {
  const wanted = mimeForName(filename) ?? (fallbackMime || "");
  if (!wanted) return blob;
  // Só reembala se o tipo atual estiver ausente/genérico ou divergir do esperado.
  const current = blob.type || "";
  if (current === wanted) return blob;
  if (!current || current === "application/octet-stream" || current === "binary/octet-stream") {
    return new Blob([blob], { type: wanted });
  }
  return blob;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/** Baixa o anexo ORIGINAL (chinês) de forma confiável (Blob + objectURL). */
export async function downloadAttachment(att: SupplierAttachment): Promise<void> {
  if (att.url || att.fileKey) {
    const fetchUrl = attachmentStreamSrc(att);
    try {
      const resp = await fetch(fetchUrl, { credentials: "include" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const raw = await resp.blob();
      // Garante o MIME correto (ex.: application/pdf) para que o navegador SALVE
      // o arquivo binário em vez de abri-lo como link/aba.
      triggerBlobDownload(blobWithCorrectType(raw, att.name, att.type), att.name);
      return;
    } catch {
      // Fallback: ainda assim tenta forçar download via <a download> na URL S3.
      const a = document.createElement("a");
      a.href = attachmentSrc(att);
      a.download = att.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
  }
  if (att.dataUrl) {
    const blob = dataURLToBlob(att.dataUrl);
    if (blob) triggerBlobDownload(blobWithCorrectType(blob, att.name, att.type), att.name);
    else {
      const a = document.createElement("a");
      a.href = att.dataUrl;
      a.download = att.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
}

function withSuffix(name: string, suffix: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return `${name}${suffix}`;
  return `${name.slice(0, dot)}${suffix}${name.slice(dot)}`;
}

// ----- Tradutor (cliente) -----------------------------------------------------

/**
 * Hook que traduz textos chineses para PT via tRPC e mantém um cache local
 * (zh→pt). Expõe `translateMany` (preenche o cache) e `lookup` (leitura sync).
 */
export function useTranslator() {
  const mutation = trpc.data.translate.toPt.useMutation();
  const cacheRef = useRef<Map<string, string>>(new Map());
  // `version` incrementa quando o cache ganha novas entradas; consumidores
  // dependem de `version` (e não da identidade do objeto) para re-renderizar.
  const [version, setVersion] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);

  // Ref estável para mutateAsync: evita que a identidade do `mutation` (que muda
  // a cada render) entre nas deps de useCallback e cause loop de re-render.
  const mutateRef = useRef(mutation.mutateAsync);
  mutateRef.current = mutation.mutateAsync;

  const lookup = useCallback((zh: string): string | undefined => {
    return cacheRef.current.get(zh);
  }, []);

  const translateMany = useCallback(async (texts: string[]): Promise<void> => {
    const cache = cacheRef.current;
    const pending: string[] = [];
    const seen = new Set<string>();
    for (const t of texts) {
      if (!isTranslatableText(t)) continue;
      if (cache.has(t)) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      pending.push(t);
    }
    if (pending.length === 0) return;
    setIsTranslating(true);
    try {
      const res = await mutateRef.current({ texts: pending });
      let changed = false;
      pending.forEach((src, i) => {
        const pt = res.translations[i];
        if (typeof pt === "string" && pt.length > 0) {
          cache.set(src, pt);
          changed = true;
        }
      });
      if (changed) setVersion((n) => n + 1);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Objeto de retorno memoizado: só muda quando `version`/`isTranslating` mudam.
  return useMemo(
    () => ({ translateMany, lookup, isTranslating, version }),
    [translateMany, lookup, isTranslating, version],
  );
}

// ----- PdfCanvas --------------------------------------------------------------

type PdfTextPage = { page: number; text: string };

export function PdfCanvas({
  src,
  lang,
  onChineseDetected,
  onTextfulDetected,
  onTextExtracted,
  translator,
  ocrPages,
}: {
  src: string;
  lang: DocLang;
  onChineseDetected?: (has: boolean) => void;
  onTextfulDetected?: (textful: boolean) => void;
  onTextExtracted?: (pages: PdfTextPage[]) => void;
  translator?: ReturnType<typeof useTranslator>;
  ocrPages?: { page: number; pt: string; original: string }[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [zoom, setZoom] = useState(1);
  const [textPages, setTextPages] = useState<PdfTextPage[]>([]);
  // Snapshots (data URL) das páginas, para OCR quando não há texto selecionável.
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [textful, setTextful] = useState<boolean | null>(null);
  // OCR das páginas rasterizadas (PDF escaneado).
  const ocrMutation = trpc.data.translate.ocrImage.useMutation();
  const ocrMutateRef = useRef(ocrMutation.mutateAsync);
  ocrMutateRef.current = ocrMutation.mutateAsync;
  const [ocrResults, setOcrResults] = useState<{ page: number; pt: string; original: string }[]>([]);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "loading" | "ready" | "error" | "empty">("idle");

  // Render do PDF original (canvas) — sempre disponível no modo "zh".
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
          const collectedText: PdfTextPage[] = [];
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
            // Extrai texto da página (para tradução).
            try {
              const tc = await page.getTextContent();
              const txt = tc.items.map((it) => ("str" in it ? it.str : "")).join(" ");
              collectedText.push({ page: pageNum, text: txt });
            } catch {
              collectedText.push({ page: pageNum, text: "" });
            }
          }
          if (!cancelled) {
            setTextPages(collectedText);
            onTextExtracted?.(collectedText);
            const joined = collectedText.map((p) => p.text).join("");
            // "isTextful" = tem texto selecionável suficiente; se vazio, o modal
            // fará fallback para OCR das páginas rasterizadas.
            const isTextful = joined.replace(/\s+/g, "").length >= 8;
            setTextful(isTextful);
            onTextfulDetected?.(isTextful);
            // PDF com texto: traduzível se o texto tiver conteúdo estrangeiro.
            // PDF sem texto (escaneado): sempre traduzível via OCR.
            onChineseDetected?.(
              !isTextful || joined.split(/\n|\s{2,}/).some((s) => isTranslatableText(s)),
            );
            // Para PDFs sem texto, captura snapshots das páginas (limite de 6) p/ OCR.
            if (!isTextful) {
              const snaps: string[] = [];
              const canvases = Array.from(container.querySelectorAll("canvas")).slice(0, 6);
              for (const cv of canvases) {
                try {
                  snaps.push((cv as HTMLCanvasElement).toDataURL("image/jpeg", 0.85));
                } catch {
                  /* ignore */
                }
              }
              setPageImages(snaps);
            } else {
              setPageImages([]);
            }
            setStatus("ready");
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, zoom]);

  // Quando entra no modo PT, dispara tradução do texto das páginas.
  const translateManyPdf = translator?.translateMany;
  useEffect(() => {
    if (lang !== "pt" || !translateManyPdf) return;
    const texts = textPages.map((p) => p.text).filter((t) => isTranslatableText(t));
    if (texts.length > 0) void translateManyPdf(texts);
  }, [lang, textPages, translateManyPdf]);

  // PDF escaneado (sem texto): ao entrar no modo PT, roda OCR das páginas.
  useEffect(() => {
    if (lang !== "pt" || textful !== false || pageImages.length === 0) return;
    if (ocrStatus !== "idle") return;
    let cancelled = false;
    setOcrStatus("loading");
    (async () => {
      const results: { page: number; pt: string; original: string }[] = [];
      for (let i = 0; i < pageImages.length; i++) {
        try {
          const res = await ocrMutateRef.current({ imageUrl: pageImages[i] });
          if (cancelled) return;
          if (!res.empty) results.push({ page: i + 1, pt: res.pt, original: res.original });
        } catch {
          /* segue para a próxima página */
        }
      }
      if (cancelled) return;
      setOcrResults(results);
      setOcrStatus(results.length > 0 ? "ready" : "empty");
    })();
    return () => {
      cancelled = true;
    };
  }, [lang, textful, pageImages, ocrStatus]);

  const clampZoom = (z: number) => Math.min(3, Math.max(0.5, Math.round(z * 10) / 10));

  const showTranslation = lang === "pt" && !!translator;

  return (
    <div className="relative h-full w-full bg-zinc-200/60">
      {status === "ready" && !showTranslation && (
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
        {/* Render original (canvas) */}
        <div
          ref={containerRef}
          className="p-3 flex flex-col items-center"
          style={{
            display: status === "ready" && !showTranslation ? "flex" : "none",
            width: "max-content",
            minWidth: "100%",
          }}
        />
        {/* Painel de tradução PT: texto selecionável → tradução; escaneado → OCR */}
        {status === "ready" && showTranslation && textful !== false && (
          <PdfTranslationPanel textPages={textPages} translator={translator} />
        )}
        {status === "ready" && showTranslation && textful === false && (
          <PdfOcrPanel status={ocrStatus} results={ocrResults} />
        )}
      </div>
    </div>
  );
}

function PdfTranslationPanel({
  textPages,
  translator,
}: {
  textPages: PdfTextPage[];
  translator: ReturnType<typeof useTranslator>;
}) {
  const anyChinese = textPages.some((p) => isTranslatableText(p.text));
  return (
    <div className="max-w-3xl mx-auto p-5 md:p-8">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
        <Languages size={13} /> Tradução automática (PT)
      </div>
      {translator.isTranslating && (
        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
          <Loader2 size={15} className="animate-spin" /> Traduzindo o conteúdo…
        </div>
      )}
      {!anyChinese && !translator.isTranslating && (
        <p className="text-sm text-zinc-500">
          Não foi detectado texto estrangeiro selecionável neste PDF. Use o modo Original para ver o
          documento.
        </p>
      )}
      <div className="space-y-6">
        {textPages.map((p) => {
          if (!p.text.trim()) return null;
          const pt = translator.lookup(p.text);
          return (
            <div key={p.page} className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                Página {p.page}
              </p>
              <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">
                {isTranslatableText(p.text) ? (pt ?? "…") : p.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Painel de tradução para PDFs escaneados (sem texto selecionável), via OCR. */
function PdfOcrPanel({
  status,
  results,
}: {
  status: "idle" | "loading" | "ready" | "error" | "empty";
  results: { page: number; pt: string; original: string }[];
}) {
  return (
    <div className="max-w-3xl mx-auto p-5 md:p-8">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
        <Languages size={13} /> Tradução por leitura de imagem (OCR + PT)
      </div>
      {(status === "loading" || status === "idle") && (
        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
          <Loader2 size={15} className="animate-spin" /> Lendo e traduzindo o documento…
        </div>
      )}
      {status === "error" && (
        <p className="text-sm text-rose-600">Não foi possível ler o texto deste documento. Tente o modo Original.</p>
      )}
      {status === "empty" && (
        <p className="text-sm text-zinc-500">Nenhum texto foi detectado nas imagens deste documento.</p>
      )}
      <div className="space-y-6">
        {results.map((r) => (
          <div key={r.page} className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">
              Página {r.page}
            </p>
            <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">{r.pt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- SheetCanvas ------------------------------------------------------------

export function SheetCanvas({
  att,
  lang,
  onChineseDetected,
  translator,
}: {
  att: SupplierAttachment;
  lang: DocLang;
  onChineseDetected?: (has: boolean) => void;
  translator?: ReturnType<typeof useTranslator>;
}) {
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

  // Detecta chinês e dispara tradução quando entra no modo PT.
  // Inclui as células do corpo + os NOMES DAS ABAS (wb.SheetNames), que também
  // costumam estar em chinês (过滤器, 增氧泵, UV灯系列…).
  const allCells = useMemo(() => [...rows.flat(), ...sheetNames], [rows, sheetNames]);
  useEffect(() => {
    onChineseDetected?.(allCells.some((c) => isTranslatableText(c)));
  }, [allCells, onChineseDetected]);

  // tick local: incrementa quando uma rodada de tradução conclui, garantindo
  // re-render do SheetCanvas mesmo que a identidade/version do translator não
  // propague de forma confiável (cacheRef é mutável, fora do ciclo do React).
  const [, setTick] = useState(0);
  const translateMany = translator?.translateMany;
  useEffect(() => {
    if (lang !== "pt" || !translateMany) return;
    const texts = allCells.filter((c) => isTranslatableText(c));
    if (texts.length > 0) {
      void translateMany(texts).then(() => setTick((n) => n + 1));
    }
  }, [lang, allCells, translateMany]);

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

  const showPt = lang === "pt" && !!translator;
  // Ler translator.version aqui (no corpo do render) garante que o SheetCanvas
  // re-renderize quando o cache de tradução ganha novas entradas. Como o objeto
  // `translator` é memoizado por `version` no useTranslator, qualquer mudança
  // de version já força novo render deste componente e reavalia cada `cell()`.
  void translator?.version;
  const translatorBusy = translator?.isTranslating ?? false;
  const cell = (raw: string): string => {
    if (showPt && isTranslatableText(raw)) {
      const pt = translator!.lookup(raw);
      return pt ?? (translatorBusy ? "…" : raw);
    }
    return raw;
  };

  const headerRow = rows[0] ?? [];
  const bodyRows = rows.slice(1);

  return (
    <div className="h-full w-full flex flex-col bg-zinc-50">
      {(sheetNames.length > 1 || sheetNames.some((n) => isTranslatableText(n)) || (showPt && translator?.isTranslating)) && (
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
              {cell(name)}
            </button>
          ))}
          {showPt && translator?.isTranslating && (
            <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <Loader2 size={13} className="animate-spin" /> Traduzindo…
            </span>
          )}
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
                {headerRow.map((c, i) => (
                  <th
                    key={i}
                    className="sticky top-0 z-10 bg-zinc-100 text-zinc-700 font-semibold border border-zinc-300 px-2 py-1 text-left whitespace-nowrap"
                    style={{ minWidth: 90 }}
                  >
                    {cell(c) || "\u00A0"}
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
                  {row.map((c, ci) => (
                    <td
                      key={ci}
                      className="border border-zinc-200 px-2 py-1 text-zinc-700 whitespace-nowrap"
                      style={{ minWidth: 90 }}
                    >
                      {cell(c) || "\u00A0"}
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

// ----- WordCanvas (.docx) -----------------------------------------------------

// collectWordRunTexts / applyWordTranslation / (de|en)codeXmlEntities agora vêm
// de ./docxTranslate (núcleo puro testável). Ver imports no topo do arquivo.

export function WordCanvas({
  att,
  lang,
  onChineseDetected,
  translator,
}: {
  att: SupplierAttachment;
  lang: DocLang;
  onChineseDetected?: (has: boolean) => void;
  translator?: ReturnType<typeof useTranslator>;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [html, setHtml] = useState<string>("");
  // Texto bruto extraído (para detecção de idioma e tradução).
  const runTextsRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setHtml("");
    runTextsRef.current = [];

    const load = async () => {
      try {
        const bytes = await attachmentBytes(att);
        if (!bytes || cancelled) {
          if (!cancelled) setStatus("error");
          return;
        }
        // Preview HTML via mammoth (preserva parágrafos, listas, tabelas, negrito).
        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer as ArrayBuffer });
        if (cancelled) return;
        setHtml(result.value || "");
        // Coleta textos para detecção/tradução a partir do document.xml original.
        try {
          const zip = await JSZip.loadAsync(bytes);
          const docFile = zip.file("word/document.xml");
          if (docFile) {
            const xml = await docFile.async("string");
            runTextsRef.current = collectWordRunTexts(xml);
          }
        } catch {
          // Se falhar a leitura do XML, ainda mostramos o preview HTML.
        }
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [att]);

  // Detecção de idioma estrangeiro.
  useEffect(() => {
    if (status !== "ready") return;
    onChineseDetected?.(runTextsRef.current.some((t) => isTranslatableText(t)));
  }, [status, onChineseDetected]);

  // Tradução do HTML de preview quando entra no modo PT.
  const [, setTick] = useState(0);
  const translateMany = translator?.translateMany;
  useEffect(() => {
    if (lang !== "pt" || !translateMany) return;
    const texts = runTextsRef.current.filter((t) => isTranslatableText(t));
    if (texts.length > 0) {
      void translateMany(texts).then(() => setTick((n) => n + 1));
    }
  }, [lang, status, translateMany]);

  const showPt = lang === "pt" && !!translator;
  void translator?.version;

  // Para o preview PT, traduzimos os nós de texto do HTML usando o cache.
  const displayHtml = useMemo(() => {
    if (!showPt || !translator) return html;
    if (!html) return html;
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let n = walker.nextNode();
      while (n) {
        nodes.push(n as Text);
        n = walker.nextNode();
      }
      for (const node of nodes) {
        const raw = node.nodeValue ?? "";
        if (isTranslatableText(raw)) {
          const pt = translator.lookup(raw.trim());
          if (pt) node.nodeValue = raw.replace(raw.trim(), pt);
        }
      }
      return doc.body.innerHTML;
    } catch {
      return html;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPt, html, translator?.version]);

  if (status === "loading") {
    return (
      <div className="h-full flex items-center justify-center text-sm text-zinc-500 gap-2">
        <Loader2 size={16} className="animate-spin" /> Carregando documento…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <FileText size={40} style={{ color: "#a1a1aa" }} />
        <p className="text-sm text-zinc-600">Não foi possível abrir este documento Word. Use o botão Baixar.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-zinc-50">
      {showPt && translator?.isTranslating && (
        <div className="flex items-center gap-1 px-3 py-2 border-b bg-white shrink-0" style={{ borderColor: "#e4e4e7" }}>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <Loader2 size={13} className="animate-spin" /> Traduzindo…
          </span>
        </div>
      )}
      <div className="flex-1 overflow-auto flex justify-center py-6 px-4">
        <div
          className="docx-preview bg-white shadow-sm rounded-md px-10 py-10 text-zinc-800"
          style={{ maxWidth: 820, width: "100%", lineHeight: 1.6, fontSize: 14 }}
          dangerouslySetInnerHTML={{ __html: displayHtml || "<p style='color:#a1a1aa'>Documento sem conteúdo de texto.</p>" }}
        />
      </div>
    </div>
  );
}

/**
 * Gera e baixa um .docx com o texto chinês substituído pela tradução PT,
 * PRESERVANDO toda a formatação (estilos, tabelas, imagens). Reescreve apenas o
 * conteúdo dos nós <w:t> dentro de word/document.xml.
 */
async function downloadWordTranslated(
  att: SupplierAttachment,
  translator: ReturnType<typeof useTranslator>,
): Promise<void> {
  const bytes = await attachmentBytes(att);
  if (!bytes) {
    await downloadAttachment(att);
    return;
  }
  const zip = await JSZip.loadAsync(bytes);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    await downloadAttachment(att);
    return;
  }
  const xml = await docFile.async("string");
  const texts = collectWordRunTexts(xml).filter((t) => isTranslatableText(t));
  await translator.translateMany(texts);
  const newXml = applyWordTranslation(xml, translator.lookup);
  zip.file("word/document.xml", newXml);

  // Também traduz cabeçalhos/rodapés, se existirem.
  const headerFooterNames = Object.keys(zip.files).filter((n) =>
    /^word\/(header|footer)\d*\.xml$/.test(n),
  );
  for (const name of headerFooterNames) {
    const f = zip.file(name);
    if (!f) continue;
    const hx = await f.async("string");
    const hTexts = collectWordRunTexts(hx).filter((t) => isTranslatableText(t));
    if (hTexts.length > 0) await translator.translateMany(hTexts);
    zip.file(name, applyWordTranslation(hx, translator.lookup));
  }

  const out = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  triggerBlobDownload(out, withSuffix(att.name.replace(/\.docx?$/i, ".docx"), "-PT"));
}

/** Gera e baixa um .xlsx com as células chinesas substituídas pela tradução PT. */
async function downloadSheetTranslated(
  att: SupplierAttachment,
  translator: ReturnType<typeof useTranslator>,
): Promise<void> {
  const bytes = await attachmentBytes(att);
  if (!bytes) {
    await downloadAttachment(att);
    return;
  }
  const wb = XLSX.read(bytes, { type: "array" });

  // Primeiro garante que todas as células chinesas estejam traduzidas no cache.
  // Inclui também os nomes das abas (SheetNames).
  const allText: string[] = [];
  for (const sheetName of wb.SheetNames) {
    if (isTranslatableText(sheetName)) allText.push(sheetName);
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "", blankrows: false });
    for (const row of data) for (const c of row) if (c && isTranslatableText(String(c))) allText.push(String(c));
  }
  await translator.translateMany(allText);

  // Renomeia as abas chinesas pela tradução (preservando a ordem).
  const renameMap: Record<string, string> = {};
  for (const sheetName of wb.SheetNames) {
    if (isTranslatableText(sheetName)) {
      const pt = translator.lookup(sheetName);
      if (pt) renameMap[sheetName] = pt;
    }
  }
  if (Object.keys(renameMap).length > 0) {
    wb.SheetNames = wb.SheetNames.map((n) => renameMap[n] ?? n);
    const newSheets: typeof wb.Sheets = {};
    for (const oldName of Object.keys(wb.Sheets)) {
      newSheets[renameMap[oldName] ?? oldName] = wb.Sheets[oldName];
    }
    wb.Sheets = newSheets;
  }

  // Reescreve cada célula com a tradução quando houver.
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const ref = ws["!ref"];
    if (!ref) continue;
    const range = XLSX.utils.decode_range(ref);
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let cI = range.s.c; cI <= range.e.c; cI++) {
        const addr = XLSX.utils.encode_cell({ r, c: cI });
        const cellObj = ws[addr];
        if (!cellObj || cellObj.v == null) continue;
        const raw = String(cellObj.v);
        if (isTranslatableText(raw)) {
          const pt = translator.lookup(raw);
          if (pt) {
            cellObj.v = pt;
            cellObj.t = "s";
            delete cellObj.w;
          }
        }
      }
    }
  }

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBlobDownload(blob, withSuffix(att.name.replace(/\.(xlsx?|csv|ods)$/i, ".xlsx"), "-PT"));
}

/** Baixa um .txt com a tradução PT do texto de um PDF/documento textual. */
async function downloadTextTranslated(
  att: SupplierAttachment,
  translator: ReturnType<typeof useTranslator>,
  textPages: PdfTextPage[],
): Promise<void> {
  const texts = textPages.map((p) => p.text);
  await translator.translateMany(texts.filter((t) => isTranslatableText(t)));
  const lines: string[] = [];
  for (const p of textPages) {
    lines.push(`--- Página ${p.page} ---`);
    lines.push(isTranslatableText(p.text) ? translator.lookup(p.text) ?? p.text : p.text);
    lines.push("");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  triggerBlobDownload(blob, withSuffix(att.name.replace(/\.pdf$/i, ".txt"), "-PT"));
}

// ----- OCR de imagem (cliente) ------------------------------------------------

export type OcrState = {
  status: "idle" | "loading" | "ready" | "error" | "empty";
  original: string;
  pt: string;
};

/**
 * Hook que faz OCR + tradução de uma imagem via tRPC (data.translate.ocrImage).
 * Converte o anexo em data URL e mantém um cache por id de anexo.
 */
export function useImageOcr() {
  const mutation = trpc.data.translate.ocrImage.useMutation();
  const mutateRef = useRef(mutation.mutateAsync);
  mutateRef.current = mutation.mutateAsync;
  const cacheRef = useRef<Map<string, OcrState>>(new Map());
  const [state, setState] = useState<OcrState>({ status: "idle", original: "", pt: "" });

  const run = useCallback(async (att: SupplierAttachment) => {
    const cached = cacheRef.current.get(att.id);
    if (cached) {
      setState(cached);
      return;
    }
    setState({ status: "loading", original: "", pt: "" });
    try {
      const dataUrl = await attachmentToDataUrl(att);
      if (!dataUrl) {
        setState({ status: "error", original: "", pt: "" });
        return;
      }
      const res = await mutateRef.current({ imageUrl: dataUrl, cacheKey: att.id });
      const next: OcrState = res.empty
        ? { status: "empty", original: "", pt: "" }
        : { status: "ready", original: res.original, pt: res.pt };
      cacheRef.current.set(att.id, next);
      setState(next);
    } catch {
      setState({ status: "error", original: "", pt: "" });
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle", original: "", pt: "" }), []);

  return useMemo(() => ({ state, run, reset }), [state, run, reset]);
}

// ----- ImageCanvas ------------------------------------------------------------

/**
 * Exibe uma imagem. No modo PT, mostra a imagem reduzida + um painel lateral com
 * o texto extraído (OCR) traduzido para português.
 */
export function ImageCanvas({
  att,
  lang,
  ocr,
}: {
  att: SupplierAttachment;
  lang: DocLang;
  ocr: ReturnType<typeof useImageOcr>;
}) {
  const showPt = lang === "pt";

  // Dispara o OCR ao entrar no modo PT (idempotente via cache).
  const runOcr = ocr.run;
  useEffect(() => {
    if (showPt) void runOcr(att);
  }, [showPt, att, runOcr]);

  if (!showPt) {
    return (
      <div className="h-full w-full overflow-auto flex items-center justify-center p-4">
        <img src={attachmentSrc(att)} alt={att.name} className="max-w-full max-h-full object-contain" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto flex flex-col md:flex-row">
      <div className="md:w-1/2 shrink-0 flex items-center justify-center p-4 bg-zinc-100 border-b md:border-b-0 md:border-r" style={{ borderColor: "#e4e4e7" }}>
        <img src={attachmentSrc(att)} alt={att.name} className="max-w-full max-h-[40vh] md:max-h-full object-contain rounded-md" />
      </div>
      <div className="md:w-1/2 p-5 md:p-7 overflow-auto">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
          <Languages size={13} /> Tradução do texto da imagem (PT)
        </div>
        {ocr.state.status === "loading" && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 size={15} className="animate-spin" /> Lendo e traduzindo o texto da imagem…
          </div>
        )}
        {ocr.state.status === "error" && (
          <p className="text-sm text-rose-600">Não foi possível ler o texto desta imagem. Tente novamente ou use o botão Baixar.</p>
        )}
        {ocr.state.status === "empty" && (
          <p className="text-sm text-zinc-500">Nenhum texto legível foi encontrado nesta imagem.</p>
        )}
        {ocr.state.status === "ready" && (
          <div className="space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Português</p>
              <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">{ocr.state.pt}</p>
            </div>
            {ocr.state.original.trim() && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">Original</p>
                <p className="text-sm leading-relaxed text-zinc-500 whitespace-pre-wrap">{ocr.state.original}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Baixa um .txt com a tradução PT do texto extraído de uma imagem (OCR). */
function downloadImageOcrText(att: SupplierAttachment, ocr: OcrState): void {
  const lines: string[] = [];
  lines.push(`--- ${att.name} (tradução) ---`, "", ocr.pt || "(sem texto)");
  if (ocr.original.trim()) lines.push("", "--- Original ---", "", ocr.original);
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  triggerBlobDownload(blob, withSuffix(att.name.replace(/\.[^.]+$/i, ".txt"), "-PT"));
}

// ----- AttachmentLightbox -----------------------------------------------------

/**
 * Modal completo de visualização. Recebe o anexo selecionado (ou null) e um
 * callback de fechamento. Renderiza imagem/vídeo nativamente, PDF via PdfCanvas,
 * planilha via SheetCanvas. Documentos com chinês ganham:
 *   - toggle de idioma 中文 ⇄ Português (tradução automática)
 *   - menu de download que pergunta o idioma (Português gerado / Chinês original)
 */
export function AttachmentLightbox({
  attachment,
  onClose,
}: {
  attachment: SupplierAttachment | null;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<DocLang>("zh");
  const [hasCn, setHasCn] = useState(false);
  // PDF tem texto selecionável suficiente? Se false e for PDF, faríamos OCR.
  const [pdfTextful, setPdfTextful] = useState<boolean | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const downloadBtnRef = useRef<HTMLButtonElement | null>(null);
  const translator = useTranslator();
  const imageOcr = useImageOcr();
  // Guarda o texto extraído do PDF para o download traduzido.
  const pdfTextRef = useRef<PdfTextPage[]>([]);

  // Calcula a posição do menu de download a partir do botão (fixed na viewport),
  // evitando que o dropdown seja recortado pela borda do modal.
  const openDownloadMenu = useCallback(() => {
    const btn = downloadBtnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setDownloadOpen((o) => !o);
  }, []);

  // Reseta estado ao trocar de anexo. IMPORTANTE: depender apenas de
  // `attachment?.id`. Incluir `imageOcr` (objeto possivelmente não memoizado)
  // fazia o effect rodar a cada render e resetar `lang` para "zh" logo após o
  // usuário clicar em "PT", impedindo a tradução de aparecer.
  const imageOcrResetRef = useRef(imageOcr.reset);
  imageOcrResetRef.current = imageOcr.reset;
  useEffect(() => {
    setLang("zh");
    setHasCn(false);
    setPdfTextful(null);
    setDownloadOpen(false);
    pdfTextRef.current = [];
    imageOcrResetRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment?.id]);

  useEffect(() => {
    if (!attachment) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (downloadOpen) setDownloadOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attachment, onClose, downloadOpen]);

  // Trava o scroll do body enquanto o modal estiver aberto (evita scroll
  // duplo e reforça o isolamento visual da página de fundo).
  useEffect(() => {
    if (!attachment) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [attachment]);

  if (!attachment) return null;

  const att = attachment;
  const img = isImageAtt(att);
  const vid = isVideoAtt(att);
  const pdf = isPdfAtt(att);
  const sheet = isSheetAtt(att);
  const word = isWordAtt(att);
  // REGRA (Fernando): tradução automática apenas para Word (.docx) e planilhas
  // (Excel/CSV/ODS) — formatos em que reescrevemos o conteúdo preservando o
  // layout. PDF e imagem continuam visíveis, porém SEM toggle de idioma e com
  // download simples (traduzir PDF é lento e desconfigura).
  void hasCn;
  void pdfTextful;
  const translatable = isTranslatableAtt(att);
  // Rótulo do formato de download traduzido.
  const ptFormat = sheet ? "(.xlsx)" : word ? "(.docx)" : "";

  const handleDownloadOriginal = () => {
    setDownloadOpen(false);
    void downloadAttachment(att);
  };
  const handleDownloadPt = () => {
    setDownloadOpen(false);
    if (sheet) void downloadSheetTranslated(att, translator);
    else if (word) void downloadWordTranslated(att, translator);
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-3 md:p-6"
      style={{
        background: "rgba(9,9,11,0.92)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 2147483600,
        isolation: "isolate",
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col bg-white shadow-2xl"
        style={{ height: "min(88vh, 900px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: "#e4e4e7" }}>
          <FileText size={16} className="shrink-0 text-zinc-500" />
          <span className="flex-1 text-sm font-semibold truncate text-zinc-800">{att.name}</span>

          {/* Toggle de idioma (só quando há chinês detectado) */}
          {translatable && (
            <div className="shrink-0 inline-flex items-center rounded-lg border p-0.5" style={{ borderColor: "#e4e4e7" }}>
              <button
                type="button"
                onClick={() => setLang("zh")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors active:scale-[0.97] ${
                  lang === "zh" ? "bg-zinc-800 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => setLang("pt")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-colors active:scale-[0.97] ${
                  lang === "pt" ? "bg-emerald-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <Languages size={12} /> PT
              </button>
            </div>
          )}

          {/* Download: simples (sem chinês) OU menu de idioma (com chinês) */}
          {translatable ? (
            <div className="relative shrink-0">
              <button
                ref={downloadBtnRef}
                type="button"
                onClick={openDownloadMenu}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 bg-zinc-800 text-white hover:bg-zinc-900 transition-colors active:scale-[0.97]"
              >
                <Download size={13} /> Baixar
              </button>
              {downloadOpen && menuPos && (
                <>
                  <div className="fixed inset-0 z-[2147483646]" onClick={() => setDownloadOpen(false)} />
                  <div
                    className="fixed z-[2147483647] w-56 rounded-xl border bg-white shadow-xl overflow-hidden"
                    style={{ borderColor: "#e4e4e7", top: menuPos.top, right: menuPos.right }}
                  >
                    <p className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                      Baixar em
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadOriginal}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-2"
                    >
                      <span className="flex-1">Original (sem tradução)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPt}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-2 border-t"
                      style={{ borderColor: "#f4f4f5" }}
                    >
                      <Languages size={14} className="text-emerald-600" />
                      <span className="flex-1">Português {ptFormat}</span>
                      {translator.isTranslating && <Loader2 size={13} className="animate-spin text-zinc-400" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void downloadAttachment(att)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 bg-zinc-800 text-white hover:bg-zinc-900 transition-colors active:scale-[0.97]"
            >
              <Download size={13} /> Baixar
            </button>
          )}

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
            // Imagem: apenas visualização (sem tradução). Mantém lang="zh" fixo.
            <ImageCanvas att={att} lang="zh" ocr={imageOcr} />
          ) : vid ? (
            <div className="h-full w-full flex items-center justify-center p-4 bg-black">
              <video src={attachmentSrc(att)} controls className="max-w-full max-h-full" />
            </div>
          ) : pdf ? (
            // PDF: apenas visualização (sem tradução). lang="zh" fixo desativa o painel PT.
            <PdfCanvas
              src={attachmentStreamSrc(att)}
              lang="zh"
              onChineseDetected={setHasCn}
              onTextfulDetected={setPdfTextful}
              onTextExtracted={(pages) => {
                pdfTextRef.current = pages;
              }}
            />
          ) : sheet ? (
            <SheetCanvas att={att} lang={lang} translator={translator} onChineseDetected={setHasCn} />
          ) : word ? (
            <WordCanvas att={att} lang={lang} translator={translator} onChineseDetected={setHasCn} />
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
    </div>,
    document.body,
  );
}
