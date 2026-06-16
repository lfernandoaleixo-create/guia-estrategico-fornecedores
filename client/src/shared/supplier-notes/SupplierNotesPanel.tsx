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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubgroupPicker } from "./SubgroupPicker";
import { MigrateButton } from "./MigrateButton";
import PartnerEditor from "./PartnerEditor";
import { parsePartners, serializePartners, PARTNERS_FIELD_KEY } from "./partners";
import { useSubtipoHierLabel } from "./useSubtipoHierLabel";
import ViabilitySheetDialog from "./ViabilitySheetDialog";
import {
  STATUS_CONFIG,
  STATUS_ORDER,
  PRECO_CONFIG,
  PRECO_ORDER,
  TIPO_CONFIG,
  TIPO_ORDER,
  SUBTIPO_CONFIG,
  SUBTIPO_ORDER,
  ATTACHMENT_CATEGORY_LABEL,
  formatBytes,
  useSupplierNotes,
  type AttachmentCategory,
  type PrecoClassificacao,
  type TipoFornecedor,
  type SubtipoAquario,
  type QuoteRow,
  type SupplierAttachment,
  type SupplierStatus,
} from "./useSupplierNotes";
import {
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Save,
  Trash2,
  Calendar,
  CheckCircle2,
  Check,
  FileSpreadsheet,
  Camera,
  BookOpen,
  DollarSign,
  Folder,
  Plus,
  Minus,
  Loader2,
  Calculator,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as XLSX from "xlsx";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/** Campo apenas leitura (vem do cadastro do fornecedor) */
export interface PrefilledField {
  label: string;
  value: string;
  /** Ocupa coluna inteira em md+ (ex.: endereço longo) */
  full?: boolean;
  /** Permite copiar com 1 clique */
  copyable?: boolean;
  /** Hiperlink (mailto, tel, url) */
  href?: string;
}

/** Campo editável pelo operador (preenche manualmente conforme contato) */
export interface EditableField {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "tel" | "email" | "url" | "number" | "date";
  full?: boolean;
}

interface Props {
  scope: string;
  supplierId: string;
  supplierName?: string;
  /** Cor de destaque (acento) — opcional, para casar com a paleta de cada dashboard */
  accent?: string;
  /** Texto compacto: oculta o cabeçalho "DIÁRIO DE NEGOCIAÇÃO" */
  compact?: boolean;
  /** Campos já cadastrados (exibidos como retângulos read-only) */
  prefilledFields?: PrefilledField[];
  /** Campos editáveis pelo operador (formulário rápido) */
  editableFields?: EditableField[];
  /** Callback chamado após salvar (usado para fechar o painel automaticamente) */
  onSaved?: () => void;
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

/**
 * Converte um data URL (base64) em Blob. Necessário porque baixar/abrir
 * diretamente via `a.href = dataUrl` falha em arquivos grandes e em vários
 * navegadores mobile (limite de tamanho de URL, bloqueio de navegação).
 */
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

/** Extrai os bytes (Uint8Array) de um data URL base64. */
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

/**
 * Retorna a fonte exibível de um anexo: a URL do S3 (novo modelo) ou o
 * data URL base64 (anexos legados). Usada por <img>, download e PDF.
 */
function attachmentSrc(att: SupplierAttachment): string {
  return att.url ?? att.dataUrl ?? "";
}

/**
 * Converte uma fonte de anexo em uma URL legível por fetch().arrayBuffer() na
 * MESMA ORIGEM. Necessária para o pdf.js, pois /manus-storage faz redirect 307
 * para a S3 (cross-origin sem CORS), bloqueando a leitura dos bytes.
 * - Anexos do S3 ("/manus-storage/<key>"): usa /api/attachment-file?key=<key>.
 * - Anexos legados (data:): retorna como está (lido localmente).
 */
function attachmentStreamSrc(att: SupplierAttachment): string {
  if (att.fileKey) {
    return `/api/attachment-file?key=${encodeURIComponent(att.fileKey)}`;
  }
  if (att.url && att.url.startsWith("/manus-storage/")) {
    const key = att.url.slice("/manus-storage/".length);
    return `/api/attachment-file?key=${encodeURIComponent(key)}`;
  }
  return att.url ?? att.dataUrl ?? "";
}

/**
 * Baixa um anexo de forma confiável, suportando tanto url (S3) quanto dataUrl
 * (legado base64). Para URLs do S3, busca o blob e usa objectURL para garantir
 * o atributo download e o nome correto do arquivo.
 */
async function downloadAttachment(att: SupplierAttachment) {
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
      // fallback: abre em nova aba
      window.open(att.url, "_blank", "noopener");
      return;
    }
  }
  if (att.dataUrl) downloadDataURL(att.dataUrl, att.name);
}

/**
 * Renderiza um PDF inteiramente em <canvas> usando pdf.js, a partir de uma URL
 * (S3) ou de um data URL base64 (legado). Evita <iframe src="blob:">, que o
 * Chrome bloqueia por segurança em sites publicados.
 */
function PdfCanvas({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  // Fator de zoom aplicado pelo usuário (1 = ajustado à largura do modal).
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    setStatus("loading");

    let task: ReturnType<typeof pdfjsLib.getDocument> | null = null;

    // Carrega os bytes do PDF e renderiza. Para anexos do S3 (/manus-storage/...),
    // buscamos os bytes via fetch (que segue o redirect 307 assinado SEM propagar
    // credenciais ao destino S3, evitando bloqueio de CORS). Para anexos legados
    // (data URL base64), decodificamos localmente.
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
          // Largura-base: ajusta à largura do modal e então aplica o zoom do usuário.
          // Com zoom > 1 a página fica mais larga que o container, habilitando
          // scroll HORIZONTAL; a altura natural habilita scroll VERTICAL.
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
          // Sem margin-inline auto: a centralização é feita pelo wrapper flex
          // (justify-content), preservando o scroll horizontal até a borda
          // esquerda quando a página (com zoom) fica mais larga que o container.
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
      {/* Controles de zoom flutuantes */}
      {status === "ready" && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg bg-white/95 shadow-md border px-1 py-1" style={{ borderColor: "#e4e4e7" }}>
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
      {/* Área rolável: scroll vertical E horizontal */}
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

/**
 * Renderiza uma planilha (xlsx/xls/csv/ods) como tabela HTML usando SheetJS.
 * Baixa os bytes da mesma origem (via attachmentStreamSrc) ou decodifica um
 * data URL legado. Permite alternar entre abas (sheets) e rola nos dois eixos.
 */
function SheetCanvas({ att }: { att: SupplierAttachment }) {
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
    // Normaliza o nº de colunas para a maior linha (tabela retangular).
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
        <div className="flex items-center gap-1 px-3 py-2 border-b bg-white overflow-x-auto shrink-0" style={{ borderColor: "#e4e4e7" }}>
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
                <th className="sticky top-0 left-0 z-20 bg-zinc-200 text-zinc-500 font-semibold border border-zinc-300 px-2 py-1 text-center" style={{ minWidth: 40 }}>
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
                  <td className="sticky left-0 z-10 bg-zinc-100 text-zinc-400 border border-zinc-200 px-2 py-1 text-center tabular-nums" style={{ minWidth: 40 }}>
                    {ri + 2}
                  </td>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-zinc-200 px-2 py-1 text-zinc-700 whitespace-nowrap" style={{ minWidth: 90 }}>
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

/** Baixa o anexo de forma confiável (Blob + objectURL), com fallback ao data URL. */
function downloadDataURL(dataUrl: string, filename: string) {
  const blob = dataURLToBlob(dataUrl);
  const href = blob ? URL.createObjectURL(blob) : dataUrl;
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (blob) setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

export default function SupplierNotesPanel({
  scope,
  supplierId,
  supplierName,
  accent = "#16a34a",
  compact = false,
  prefilledFields = [],
  editableFields = [],
  onSaved,
}: Props) {
  const {
    getEntry,
    upsertEntry,
    addAttachment,
    removeAttachment,
    upsertQuoteRows,
    deleteEntry,
  } = useSupplierNotes(scope);

  const entry = getEntry(supplierId);

  const [status, setStatus] = useState<SupplierStatus>(entry?.status ?? "nao-visitado");
  const [observacoes, setObservacoes] = useState(entry?.observacoes ?? "");
  const [fields, setFields] = useState<Record<string, string>>(entry?.fields ?? {});
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>(entry?.quoteRows ?? []);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Progresso de upload por categoria: nome do arquivo + percentual (0..100).
  const [uploadProgress, setUploadProgress] = useState<
    Partial<Record<AttachmentCategory, { name: string; percent: number; index: number; total: number }>>
  >({});
  const [savedHint, setSavedHint] = useState(false);
  const [preview, setPreview] = useState<SupplierAttachment | null>(null);
  // Abre o modal da planilha de análise de viabilidade (calculadora).
  const [calcOpen, setCalcOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const catalogosRef = useRef<HTMLInputElement>(null);
  const fotosRef = useRef<HTMLInputElement>(null);
  const cotacoesRef = useRef<HTMLInputElement>(null);
  const outrosRef = useRef<HTMLInputElement>(null);

  // Sync quando entry chega async do IndexedDB ou troca o supplier
  useEffect(() => {
    setStatus(entry?.status ?? "nao-visitado");
    setObservacoes(entry?.observacoes ?? "");
    setFields(entry?.fields ?? {});
    setQuoteRows(entry?.quoteRows ?? []);
  }, [entry?.supplierId, entry?.status, entry?.observacoes, entry?.fields, entry?.quoteRows]);

  const attachments = entry?.attachments ?? [];
  const groupAttachments = (cat: AttachmentCategory) =>
    attachments.filter((a) =>
      cat === "outros"
        ? !a.category || a.category === "outros"
        : a.category === cat
    );

  // Classificação de preço atual (somente quando aprovado).
  const precoClass = (fields.precoClassificacao as PrecoClassificacao | undefined) ?? undefined;

  // Tipo do fornecedor atual (Fabricante Direto x Trader/Intermediário).
  const tipoFornecedor = (fields.tipoFornecedor as TipoFornecedor | undefined) ?? undefined;

  const handleTipoClick = (t: TipoFornecedor) => {
    // Alterna e é mutuamente exclusivo: clicar no mesmo desmarca; clicar no outro troca.
    const nextFields = { ...fields };
    if (nextFields.tipoFornecedor === t) {
      delete nextFields.tipoFornecedor;
    } else {
      nextFields.tipoFornecedor = t;
    }
    setFields(nextFields);
    upsertEntry(supplierId, { status, observacoes, fields: nextFields });
    flashSaved();
  };

  const handleStatusClick = (s: SupplierStatus) => {
    setStatus(s);
    // Se deixar de ser aprovado, remove a classificação de preço.
    if (s !== "fornecedor-aprovado" && fields.precoClassificacao) {
      const nextFields = { ...fields };
      delete nextFields.precoClassificacao;
      setFields(nextFields);
      upsertEntry(supplierId, { status: s, observacoes, fields: nextFields });
    } else {
      upsertEntry(supplierId, { status: s, observacoes });
    }
    flashSaved();
  };

  // Persiste a lista de Parceiro(s) Chinês(es) Responsável(eis) em
  // fields.parceirosChineses (JSON). Salvamos imediatamente ao adicionar/remover.
  const handlePartnersChange = (next: string[]) => {
    const nextFields = { ...fields, [PARTNERS_FIELD_KEY]: serializePartners(next) };
    setFields(nextFields);
    upsertEntry(supplierId, { status, observacoes, fields: nextFields });
    flashSaved();
  };

  const handlePrecoClick = (p: PrecoClassificacao) => {
    // Alterna: clicar na mesma opção remove a classificação.
    const nextFields = { ...fields };
    if (nextFields.precoClassificacao === p) {
      delete nextFields.precoClassificacao;
    } else {
      nextFields.precoClassificacao = p;
    }
    setFields(nextFields);
    upsertEntry(supplierId, { status: "fornecedor-aprovado", observacoes, fields: nextFields });
    flashSaved();
  };

  const handleSave = () => {
    upsertEntry(supplierId, { status, observacoes, fields });
    upsertQuoteRows(supplierId, quoteRows);
    flashSaved();
    if (onSaved) {
      // Estratégia: ancorar visualmente o card pai (cabeçalho colapsável)
      // à mesma posição do viewport antes/depois do recolhimento.
      // 1) Captura o card pai (ancestral mais próximo do painel).
      const root = rootRef.current;
      const card =
        (root?.closest("[data-supplier-card]") as HTMLElement | null) ??
        (root?.parentElement?.parentElement as HTMLElement | null);
      const prevTop = card?.getBoundingClientRect().top ?? null;
      const prevScrollY = window.scrollY;
      window.setTimeout(() => {
        onSaved();
        // Após o DOM atualizar, recoloca o card na mesma altura visual.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (card && prevTop !== null) {
              const newTop = card.getBoundingClientRect().top;
              const delta = newTop - prevTop;
              window.scrollTo({ top: window.scrollY + delta, left: 0, behavior: "auto" });
            } else {
              window.scrollTo({ top: prevScrollY, left: 0, behavior: "auto" });
            }
          });
        });
      }, 600);
    }
  };

  // Garante que, ao desmontar/recolher o painel, não haja jump.
  useLayoutEffect(() => {
    return () => {
      // no-op: a restauração explícita acontece em handleSave
    };
  }, []);

  // -------- Tabela de cotação --------
  const newQuoteRow = (): QuoteRow => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    produto: "",
    qtd: "",
    moq: "",
    precoFob: "",
    leadTime: "",
    pagamento: "",
    observacao: "",
  });

  const handleQuoteAdd = () => {
    const next = [...quoteRows, newQuoteRow()];
    setQuoteRows(next);
    upsertQuoteRows(supplierId, next);
  };

  const handleQuoteChange = (id: string, key: keyof QuoteRow, value: string) => {
    setQuoteRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const handleQuoteBlur = () => {
    upsertQuoteRows(supplierId, quoteRows);
  };

  const handleQuoteRemove = (id: string) => {
    const next = quoteRows.filter((r) => r.id !== id);
    setQuoteRows(next);
    upsertQuoteRows(supplierId, next);
  };

  const handleFieldChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1200);
    } catch {
      /* ignore */
    }
  };

  const flashSaved = () => {
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 1600);
  };

  const handleFiles = async (
    files: FileList | null,
    category: AttachmentCategory
  ) => {
    if (!files) return;
    setUploadError(null);
    const list = Array.from(files);
    // IMPORTANTE: cada arquivo é enviado individualmente ao S3; o servidor anexa
    // apenas a referência. Um erro em um arquivo NÃO afeta os dados de texto já
    // preenchidos (status/observações/campos) nem os anexos já enviados.
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      setUploadProgress((prev) => ({
        ...prev,
        [category]: { name: f.name, percent: 0, index: i + 1, total: list.length },
      }));
      try {
        await addAttachment(supplierId, f, category, (percent) => {
          setUploadProgress((prev) => ({
            ...prev,
            [category]: { name: f.name, percent, index: i + 1, total: list.length },
          }));
        });
      } catch (err) {
        setUploadError(
          `${f.name}: ${err instanceof Error ? err.message : "erro ao anexar"}. Os dados já preenchidos foram preservados.`,
        );
      }
    }
    setUploadProgress((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
    const refs: Record<AttachmentCategory, React.RefObject<HTMLInputElement | null>> = {
      catalogos: catalogosRef,
      fotos: fotosRef,
      cotacoes: cotacoesRef,
      outros: outrosRef,
    };
    const r = refs[category];
    if (r.current) r.current.value = "";
  };

  const handleClear = () => {
    if (!confirm(
      `Apagar toda a anotação${supplierName ? ` de ${supplierName}` : ""}? Esta ação não pode ser desfeita.`,
    )) return;
    deleteEntry(supplierId);
    setStatus("nao-visitado");
    setObservacoes("");
  };

  const hasContent =
    observacoes.trim().length > 0 ||
    attachments.length > 0 ||
    quoteRows.length > 0 ||
    status !== "nao-visitado" ||
    Object.values(fields).some((v) => v && v.trim().length > 0);

  return (
    <div
      ref={rootRef}
      className="rounded-xl border bg-white p-4 sm:p-5 text-zinc-800"
      style={{ borderColor: "#e4e4e7" }}
    >
      {!compact && (
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-zinc-500" />
            <h4 className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500">
              Diário de Negociação
            </h4>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {entry?.updatedAt && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Calendar size={12} />
                <span>Atualizado em {entry.updatedAt}</span>
              </div>
            )}
            <MigrateButton
              fromScope={scope}
              fromSupplierId={supplierId}
              accent={accent ?? "#475569"}
              context={{
                supplierName: supplierName ?? supplierId,
                ...(prefilledFields ?? []).reduce((ctx, f) => {
                  const k = f.label.toLowerCase();
                  if (k.includes("chinês")) ctx.chineseName = f.value;
                  else if (k === "cidade / província") {
                    const [c, p] = f.value.split(",").map((s) => s.trim());
                    ctx.city = c; ctx.province = p;
                  } else if (k === "endereço") ctx.address = f.value;
                  else if (k.includes("contato")) ctx.contactName = f.value;
                  else if (k.includes("e-mail")) ctx.email = f.value;
                  else if (k.includes("whatsapp") || k.includes("telefone")) ctx.phone = f.value;
                  else if (k.includes("site")) ctx.website = f.value;
                  return ctx;
                }, {} as Record<string, string>),
              }}
            />
          </div>
        </div>
      )}

      {/* PARCEIRO(S) CHINÊS(ES) RESPONSÁVEL(EIS) — destaque no topo */}
      <PartnerEditor
        value={parsePartners(fields)}
        onChange={handlePartnersChange}
        accent={accent}
        highlighted
      />

      {/* SUBGRUPO DO FORNECEDOR (modelo macro.sub) */}
      <div className="mb-4">
        <label className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500 block mb-2">
          Subgrupo (classificação macro.sub)
        </label>
        <SubgroupPicker
          tone="light"
          selectedId={(fields.subgroupId as string | undefined) ?? null}
          onChange={(id) => {
            const nextFields = { ...fields, subgroupId: id ?? "" };
            setFields(nextFields);
            upsertEntry(supplierId, { status, observacoes, fields: nextFields });
            flashSaved();
          }}
        />
      </div>

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
                className="relative text-left rounded-lg px-3 py-2.5 text-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2.5"
                style={{
                  background: active ? cfg.bg : "#fafafa",
                  borderWidth: active ? "2px" : "1.5px",
                  borderStyle: "solid",
                  borderColor: active ? cfg.border : "#e4e4e7",
                  color: active ? cfg.color : "#3f3f46",
                  fontWeight: active ? 700 : 500,
                  boxShadow: active
                    ? `0 0 0 3px ${cfg.bg}, 0 1px 2px rgba(0,0,0,0.05)`
                    : "none",
                }}
                aria-pressed={active}
              >
                <span className="text-lg leading-none">{cfg.emoji}</span>
                <span className="flex-1">{cfg.label}</span>
                {active && (
                  <span
                    className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full"
                    style={{ background: cfg.color, color: "#fff" }}
                    aria-hidden
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TIPO DO FORNECEDOR — Fabricante Direto x Trader/Intermediário */}
        <div className="mt-3 rounded-lg border p-3" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
          <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-600 mb-2">
            Tipo do fornecedor
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TIPO_ORDER.map((t) => {
              const cfg = TIPO_CONFIG[t];
              const active = tipoFornecedor === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTipoClick(t)}
                  className="relative text-left rounded-lg px-3 py-2.5 text-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2.5"
                  style={{
                    background: active ? cfg.bg : "#ffffff",
                    borderWidth: active ? "2px" : "1.5px",
                    borderStyle: "solid",
                    borderColor: active ? cfg.border : "#e4e4e7",
                    color: active ? cfg.color : "#3f3f46",
                    fontWeight: active ? 700 : 500,
                    boxShadow: active
                      ? `0 0 0 3px ${cfg.bg}, 0 1px 2px rgba(0,0,0,0.05)`
                      : "none",
                  }}
                  aria-pressed={active}
                >
                  <span
                    className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded border"
                    style={{
                      background: active ? cfg.color : "#ffffff",
                      borderColor: active ? cfg.color : "#cbd5e1",
                      color: "#fff",
                    }}
                    aria-hidden
                  >
                    {active && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="flex-1">{cfg.label}</span>
                </button>
              );
            })}
          </div>
          {!tipoFornecedor && (
            <div className="text-[11px] text-slate-500 mt-2">
              Marque se este fornecedor é fabricante direto ou trader/intermediário — aparecerá no card mesmo recolhido.
            </div>
          )}
        </div>

        {/* CLASSIFICAÇÃO DE PREÇO — aparece somente quando aprovado */}
        {status === "fornecedor-aprovado" && (
          <div
            className="mt-3 rounded-lg border p-3"
            style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}
          >
            <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-green-800 mb-2">
              Classificação do preço
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRECO_ORDER.map((p) => {
                const cfg = PRECO_CONFIG[p];
                const active = precoClass === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePrecoClick(p)}
                    className="relative text-left rounded-lg px-3 py-2.5 text-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2.5"
                    style={{
                      background: active ? cfg.bg : "#ffffff",
                      borderWidth: active ? "2px" : "1.5px",
                      borderStyle: "solid",
                      borderColor: active ? cfg.border : "#e4e4e7",
                      color: active ? cfg.color : "#3f3f46",
                      fontWeight: active ? 700 : 500,
                      boxShadow: active
                        ? `0 0 0 3px ${cfg.bg}, 0 1px 2px rgba(0,0,0,0.05)`
                        : "none",
                    }}
                    aria-pressed={active}
                  >
                    <span className="text-lg leading-none">{cfg.emoji}</span>
                    <span className="flex-1">{cfg.label}</span>
                    {active && (
                      <span
                        className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full"
                        style={{ background: cfg.color, color: "#fff" }}
                        aria-hidden
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!precoClass && (
              <div className="text-[11px] text-green-700/80 mt-2">
                Selecione como foi o preço analisado para registrar no card deste fornecedor.
              </div>
            )}
          </div>
        )}
      </div>

      {/* DADOS DO FORNECEDOR (auto-preenchidos) */}
      {prefilledFields.length > 0 && (
        <div className="mb-4">
          <label className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500 block mb-2">
            Dados do Fornecedor
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {prefilledFields.map((f, i) => (
              <div
                key={`${f.label}-${i}`}
                className={`rounded-lg border bg-zinc-50/70 px-3 py-2 ${f.full ? "sm:col-span-2" : ""}`}
                style={{ borderColor: "#e4e4e7" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">
                    {f.label}
                  </div>
                  {f.copyable && f.value && f.value !== "—" && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(f.value, `pre-${i}`)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-700 transition-colors px-1.5 py-0.5 rounded"
                      title="Copiar"
                    >
                      {copiedKey === `pre-${i}` ? "✓ copiado" : "copiar"}
                    </button>
                  )}
                </div>
                {f.href && f.value && f.value !== "—" ? (
                  <a
                    href={f.href}
                    target={f.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-zinc-800 hover:underline break-words"
                    style={{ color: accent }}
                  >
                    {f.value}
                  </a>
                ) : (
                  <div className="text-sm font-medium text-zinc-800 break-words">
                    {f.value || <span className="text-zinc-400">—</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CAMPOS EDITÁVEIS (operador preenche) */}
      {editableFields.length > 0 && (
        <div className="mb-4">
          <label className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500 block mb-2">
            Informações do Contato
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {editableFields.map((f) => (
              <div
                key={f.key}
                className={`rounded-lg border bg-white px-3 py-2 transition-colors focus-within:border-zinc-400 ${f.full ? "sm:col-span-2" : ""}`}
                style={{ borderColor: "#e4e4e7" }}
              >
                <label
                  htmlFor={`field-${f.key}`}
                  className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 block"
                >
                  {f.label}
                </label>
                <input
                  id={`field-${f.key}`}
                  type={f.type ?? "text"}
                  value={fields[f.key] ?? ""}
                  onChange={(e) => handleFieldChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-transparent text-sm font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5">
            Clique em <strong>Salvar nota</strong> abaixo para gravar as alterações.
          </p>
        </div>
      )}

      {/* OBSERVAÇÕES */}
      <div className="mb-4">
        <label className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500 block mb-2">
          Observações
        </label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Anote aqui detalhes da negociação, contatos, prazos, condições…"
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

      {uploadError && (
        <div
          className="mb-3 px-3 py-2 rounded-md text-xs"
          style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}
        >
          {uploadError}
        </div>
      )}

      {/* CATÁLOGOS */}
      <AttachmentBucket
        title={ATTACHMENT_CATEGORY_LABEL.catalogos}
        subtitle="Catálogos, brochuras, line sheets e folders do fornecedor (qualquer formato de arquivo)"
        icon={<BookOpen size={14} />}
        accent="#0ea5e9"
        items={groupAttachments("catalogos")}
        accept="*/*"
        onPick={() => catalogosRef.current?.click()}
        onRemove={(id) => removeAttachment(supplierId, id)}
        onPreview={setPreview}
        inputRef={catalogosRef}
        onFiles={(files) => handleFiles(files, "catalogos")}
        uploadProgress={uploadProgress.catalogos}
        headerExtra={<CalcButton onClick={() => setCalcOpen(true)} />}
        onCalc={() => setCalcOpen(true)}
      />

      {/* FOTOS */}
      <AttachmentBucket
        title={ATTACHMENT_CATEGORY_LABEL.fotos}
        subtitle="Fotos do showroom, fábrica, embalagens e produtos avulsos (qualquer formato de arquivo)"
        icon={<Camera size={14} />}
        accent="#db2777"
        items={groupAttachments("fotos")}
        accept="*/*"
        onPick={() => fotosRef.current?.click()}
        onRemove={(id) => removeAttachment(supplierId, id)}
        onPreview={setPreview}
        inputRef={fotosRef}
        onFiles={(files) => handleFiles(files, "fotos")}
        uploadProgress={uploadProgress.fotos}
      />

      {/* COTAÇÕES — tabela editável + arquivos */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500 inline-flex items-center gap-1.5">
            <DollarSign size={13} style={{ color: "#16a34a" }} /> {ATTACHMENT_CATEGORY_LABEL.cotacoes}
          </label>
          <div className="flex items-center gap-2">
          <CalcButton onClick={() => setCalcOpen(true)} />
          <button
            type="button"
            onClick={() => cotacoesRef.current?.click()}
            className="px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all hover:bg-zinc-100 active:scale-[0.97] border bg-white"
            style={{ borderColor: "#e4e4e7", color: "#3f3f46" }}
          >
            <Paperclip size={13} /> Anexar arquivo
          </button>
          </div>
          <input
            ref={cotacoesRef}
            type="file"
            multiple
            accept="*/*"
            onChange={(e) => handleFiles(e.target.files, "cotacoes")}
            className="hidden"
          />
        </div>
        <p className="text-xs text-zinc-500 mb-2">
          Preencha a tabela abaixo conforme o fornecedor for cotando, e/ou anexe arquivos de cotação em qualquer formato (planilha, PDF, imagem, etc.).
        </p>

        {/* TABELA EDITÁVEL */}
        <div className="rounded-lg border bg-white overflow-x-auto" style={{ borderColor: "#e4e4e7" }}>
          <table className="w-full text-xs">
            <thead style={{ background: "#f4f4f5" }}>
              <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-2 py-2 font-bold">Produto</th>
                <th className="px-2 py-2 font-bold">Qtd</th>
                <th className="px-2 py-2 font-bold">MOQ</th>
                <th className="px-2 py-2 font-bold">Preço FOB</th>
                <th className="px-2 py-2 font-bold">Lead time</th>
                <th className="px-2 py-2 font-bold">Pagamento</th>
                <th className="px-2 py-2 font-bold">Observação</th>
                <th className="px-2 py-2 w-8" aria-label="ações"></th>
              </tr>
            </thead>
            <tbody>
              {quoteRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-zinc-400 text-xs">
                    Nenhuma linha. Clique em <strong>+ adicionar linha</strong> para começar a registrar a cotação.
                  </td>
                </tr>
              ) : (
                quoteRows.map((row) => (
                  <tr key={row.id} className="border-t" style={{ borderColor: "#f4f4f5" }}>
                    {(["produto", "qtd", "moq", "precoFob", "leadTime", "pagamento", "observacao"] as Array<keyof QuoteRow>).map((k) => (
                      <td key={k} className="px-1 py-1">
                        <input
                          value={row[k] as string}
                          onChange={(e) => handleQuoteChange(row.id, k, e.target.value)}
                          onBlur={handleQuoteBlur}
                          placeholder={
                            k === "produto" ? "Ex.: Aquário 60L" :
                            k === "qtd" ? "100" :
                            k === "moq" ? "50" :
                            k === "precoFob" ? "USD 4,20" :
                            k === "leadTime" ? "30 dias" :
                            k === "pagamento" ? "30/70 TT" :
                            "Detalhes…"
                          }
                          className="w-full px-2 py-1.5 rounded text-xs bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleQuoteRemove(row.id)}
                        className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remover linha"
                      >
                        <X size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={handleQuoteAdd}
          className="mt-2 px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all hover:bg-emerald-50 active:scale-[0.97] border"
          style={{ borderColor: "#bbf7d0", color: "#15803d", background: "#f0fdf4" }}
        >
          <Plus size={12} /> Adicionar linha
        </button>

        {/* Arquivos de cotação */}
        <div className="mt-3">
          <UploadProgressBar progress={uploadProgress.cotacoes} accent="#16a34a" />
          <AttachmentList
            items={groupAttachments("cotacoes")}
            onRemove={(id) => removeAttachment(supplierId, id)}
            onPreview={setPreview}
            onCalc={() => setCalcOpen(true)}
            emptyText="Nenhum arquivo de cotação anexado. (Qualquer formato, até 20 MB por arquivo.)"
          />
        </div>
      </div>

      {/* OUTROS DOCUMENTOS */}
      <AttachmentBucket
        title={ATTACHMENT_CATEGORY_LABEL.outros}
        subtitle="Contratos, faturas, certificados, prints de conversa e quaisquer outros arquivos"
        icon={<Folder size={14} />}
        accent="#a16207"
        items={groupAttachments("outros")}
        accept="*/*"
        onPick={() => outrosRef.current?.click()}
        onRemove={(id) => removeAttachment(supplierId, id)}
        onPreview={setPreview}
        inputRef={outrosRef}
        onFiles={(files) => handleFiles(files, "outros")}
        uploadProgress={uploadProgress.outros}
      />

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

      <AttachmentPreviewModal
        attachment={preview}
        onClose={() => setPreview(null)}
      />

      <ViabilitySheetDialog
        open={calcOpen}
        onOpenChange={setCalcOpen}
        scope={scope}
        supplierId={supplierId}
        supplierName={supplierName}
      />
    </div>
  );
}

// ============================================================================
// Modal de visualização de anexo (lightbox por cima da página)
// Fecha ao clicar fora (backdrop) e com a tecla Esc (via Radix Dialog).
// ============================================================================

/**
 * Botão com ícone de calculadora que abre a planilha de análise de viabilidade.
 * Usado nos cabeçalhos de "Catálogos" e "Cotações".
 */
function CalcButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Abrir planilha de análise de viabilidade"
      aria-label="Abrir planilha de análise de viabilidade"
      className="px-2.5 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 text-white transition-all active:scale-[0.95]"
      style={{ background: "#1e3a5f" }}
    >
      <Calculator size={13} /> Calcular
    </button>
  );
}

function AttachmentPreviewModal({
  attachment,
  onClose,
}: {
  attachment: SupplierAttachment | null;
  onClose: () => void;
}) {
  // Fonte exibível: URL do S3 (novo) ou objectURL a partir do base64 (legado).
  const objectUrl = useMemo(() => {
    if (!attachment) return null;
    if (attachment.url) return attachment.url;
    if (attachment.dataUrl) {
      const blob = dataURLToBlob(attachment.dataUrl);
      return blob ? URL.createObjectURL(blob) : attachment.dataUrl;
    }
    return null;
  }, [attachment]);

  useEffect(() => {
    return () => {
      if (objectUrl && objectUrl.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const open = attachment !== null;
  const isImg = attachment ? attachment.type.startsWith("image/") : false;
  const isPdf = attachment ? attachment.type === "application/pdf" : false;
  const isSheet = attachment ? !!isSpreadsheet(attachment) : false;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden bg-white">
        <DialogHeader className="px-4 py-3 border-b" style={{ borderColor: "#e4e4e7" }}>
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle className="text-sm font-semibold truncate text-zinc-800">
              {attachment?.name ?? "Visualizar anexo"}
            </DialogTitle>
            {attachment && (
              <button
                type="button"
                onClick={() => void downloadAttachment(attachment)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 bg-zinc-800 text-white hover:bg-zinc-900 transition-colors active:scale-[0.97]"
              >
                <Download size={13} /> Baixar
              </button>
            )}
          </div>
        </DialogHeader>
        <div className="bg-zinc-100" style={{ height: "78vh" }}>
          {!objectUrl ? (
            <div className="h-full flex items-center justify-center text-sm text-zinc-500">
              Não foi possível carregar o arquivo.
            </div>
          ) : isImg ? (
            <div className="h-full w-full flex items-center justify-center p-4">
              <img
                src={objectUrl}
                alt={attachment?.name ?? ""}
                className="max-h-full max-w-full object-contain rounded"
              />
            </div>
          ) : isPdf ? (
            <PdfCanvas src={attachmentStreamSrc(attachment!)} />
          ) : isSheet ? (
            <SheetCanvas att={attachment!} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <FileText size={40} style={{ color: "#a1a1aa" }} />
              <p className="text-sm text-zinc-600">
                Este tipo de arquivo não pode ser pré-visualizado aqui.
              </p>
              <button
                type="button"
                onClick={() => attachment && void downloadAttachment(attachment)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-900 transition-colors active:scale-[0.97]"
              >
                <Download size={14} /> Baixar arquivo
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Componentes auxiliares: AttachmentBucket / AttachmentList
// ============================================================================

/**
 * Barra de progresso de upload (acessível). Mostra o arquivo atual, o
 * percentual e, quando há vários, o contador (ex.: 2/3).
 */
function UploadProgressBar({
  progress,
  accent,
}: {
  progress?: { name: string; percent: number; index: number; total: number };
  accent: string;
}) {
  if (!progress) return null;
  return (
    <div className="mb-2 rounded-lg border bg-white px-3 py-2" style={{ borderColor: "#e4e4e7" }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-zinc-700 truncate inline-flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" style={{ color: accent }} />
          Enviando: {progress.name}
          {progress.total > 1 && (
            <span className="text-zinc-400"> ({progress.index}/{progress.total})</span>
          )}
        </span>
        <span className="text-xs font-semibold tabular-nums" style={{ color: accent }}>
          {progress.percent}%
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full overflow-hidden"
        style={{ background: "#f1f1f3" }}
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress.percent}%`,
            background: accent,
            transition: "width 160ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      </div>
    </div>
  );
}

interface AttachmentBucketProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  items: SupplierAttachment[];
  accept: string;
  onPick: () => void;
  onRemove: (id: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
  onPreview?: (att: SupplierAttachment) => void;
  uploadProgress?: { name: string; percent: number; index: number; total: number };
  /** Elemento extra renderizado no cabeçalho, antes do botão "Anexar". */
  headerExtra?: React.ReactNode;
  /** Quando definido, mostra um botão de calculadora em cada item anexado. */
  onCalc?: () => void;
}

function AttachmentBucket({
  title,
  subtitle,
  icon,
  accent,
  items,
  accept,
  onPick,
  onRemove,
  inputRef,
  onFiles,
  onPreview,
  uploadProgress,
  headerExtra,
  onCalc,
}: AttachmentBucketProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500 inline-flex items-center gap-1.5">
          <span style={{ color: accent }}>{icon}</span>
          {title}
          <span className="text-zinc-400 font-normal normal-case tracking-normal">
            · {items.length}
          </span>
        </label>
        <div className="flex items-center gap-2">
        {headerExtra}
        <button
          type="button"
          onClick={onPick}
          className="px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all hover:bg-zinc-100 active:scale-[0.97] border bg-white"
          style={{ borderColor: "#e4e4e7", color: "#3f3f46" }}
        >
          <Paperclip size={13} /> Anexar arquivo
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={(e) => onFiles(e.target.files)}
          className="hidden"
        />
        </div>
      </div>
      <p className="text-xs text-zinc-500 mb-2">{subtitle}</p>
      <UploadProgressBar progress={uploadProgress} accent={accent} />
      <AttachmentList items={items} onRemove={onRemove} onPreview={onPreview} onCalc={onCalc} />
    </div>
  );
}

interface AttachmentListProps {
  items: SupplierAttachment[];
  onRemove: (id: string) => void;
  onPreview?: (att: SupplierAttachment) => void;
  emptyText?: string;
  onCalc?: () => void;
}

function AttachmentList({ items, onRemove, onPreview, emptyText, onCalc }: AttachmentListProps) {
  if (items.length === 0) {
    return (
      <div
        className="text-center py-4 rounded-lg border border-dashed text-xs text-zinc-500"
        style={{ borderColor: "#e4e4e7", background: "#fafafa" }}
      >
        {emptyText ?? "Nenhum arquivo anexado nesta categoria. (Qualquer formato, até 20 MB por arquivo, salvos no banco compartilhado.)"}
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((att) => (
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
              <img src={attachmentSrc(att)} alt={att.name} className="w-full h-full object-cover" />
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
            {onCalc && (
              <button
                type="button"
                onClick={onCalc}
                className="p-1.5 rounded-md hover:bg-blue-50 transition-colors text-blue-600"
                aria-label="Abrir calculadora de viabilidade"
                title="Calcular viabilidade"
              >
                <Calculator size={14} />
              </button>
            )}
            {onPreview && (
              <button
                type="button"
                onClick={() => onPreview(att)}
                className="p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
                aria-label="Visualizar"
                title="Visualizar"
              >
                <Eye size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => void downloadAttachment(att)}
              className="p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
              aria-label="Baixar"
              title="Baixar"
            >
              <Download size={14} />
            </button>
            <button
              type="button"
              onClick={() => onRemove(att.id)}
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
  );
}
