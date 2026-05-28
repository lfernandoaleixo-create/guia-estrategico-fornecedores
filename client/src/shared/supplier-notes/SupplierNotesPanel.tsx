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
import { GroupPicker } from "./GroupPicker";
import { MigrateButton } from "./MigrateButton";
import {
  STATUS_CONFIG,
  STATUS_ORDER,
  ATTACHMENT_CATEGORY_LABEL,
  formatBytes,
  useSupplierNotes,
  type AttachmentCategory,
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
} from "lucide-react";

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
  scope: "aquario" | "tapete" | "yiwu";
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
    setSupplierGroups,
  } = useSupplierNotes(scope);

  const entry = getEntry(supplierId);

  const [status, setStatus] = useState<SupplierStatus>(entry?.status ?? "nao-visitado");
  const [observacoes, setObservacoes] = useState(entry?.observacoes ?? "");
  const [fields, setFields] = useState<Record<string, string>>(entry?.fields ?? {});
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>(entry?.quoteRows ?? []);
  const [groupIds, setGroupIdsState] = useState<string[]>(entry?.groupIds ?? []);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
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
    setGroupIdsState(entry?.groupIds ?? []);
  }, [entry?.supplierId, entry?.status, entry?.observacoes, entry?.fields, entry?.quoteRows, entry?.groupIds]);

  const attachments = entry?.attachments ?? [];
  const groupAttachments = (cat: AttachmentCategory) =>
    attachments.filter((a) =>
      cat === "outros"
        ? !a.category || a.category === "outros"
        : a.category === cat
    );

  const handleStatusClick = (s: SupplierStatus) => {
    setStatus(s);
    upsertEntry(supplierId, { status: s, observacoes });
    flashSaved();
  };

  const handleSave = () => {
    upsertEntry(supplierId, { status, observacoes, fields });
    upsertQuoteRows(supplierId, quoteRows);
    flashSaved();
    // Fecha o painel automaticamente ~600ms depois (tempo do toast "salvo").
    if (onSaved) {
      window.setTimeout(() => onSaved(), 600);
    }
  };

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
    for (const f of Array.from(files)) {
      try {
        await addAttachment(supplierId, f, category);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Erro ao anexar arquivo");
      }
    }
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

      {/* GRUPOS DO FORNECEDOR */}
      <div className="mb-4">
        <GroupPicker
          tone="light"
          selectedIds={groupIds}
          onChange={(ids) => {
            setGroupIdsState(ids);
            setSupplierGroups(supplierId, ids);
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
        subtitle="Catálogos, brochuras, line sheets e folders do fornecedor (PDF, JPG, PNG)"
        icon={<BookOpen size={14} />}
        accent="#0ea5e9"
        items={groupAttachments("catalogos")}
        accept="image/*,application/pdf"
        onPick={() => catalogosRef.current?.click()}
        onRemove={(id) => removeAttachment(supplierId, id)}
        inputRef={catalogosRef}
        onFiles={(files) => handleFiles(files, "catalogos")}
      />

      {/* FOTOS */}
      <AttachmentBucket
        title={ATTACHMENT_CATEGORY_LABEL.fotos}
        subtitle="Fotos do showroom, fábrica, embalagens e produtos avulsos (JPG, PNG)"
        icon={<Camera size={14} />}
        accent="#db2777"
        items={groupAttachments("fotos")}
        accept="image/*"
        onPick={() => fotosRef.current?.click()}
        onRemove={(id) => removeAttachment(supplierId, id)}
        inputRef={fotosRef}
        onFiles={(files) => handleFiles(files, "fotos")}
      />

      {/* COTAÇÕES — tabela editável + arquivos */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-500 inline-flex items-center gap-1.5">
            <DollarSign size={13} style={{ color: "#16a34a" }} /> {ATTACHMENT_CATEGORY_LABEL.cotacoes}
          </label>
          <button
            type="button"
            onClick={() => cotacoesRef.current?.click()}
            className="px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all hover:bg-zinc-100 active:scale-[0.97] border bg-white"
            style={{ borderColor: "#e4e4e7", color: "#3f3f46" }}
          >
            <Paperclip size={13} /> Anexar planilha/PDF
          </button>
          <input
            ref={cotacoesRef}
            type="file"
            multiple
            accept=".xls,.xlsx,.csv,.ods,application/pdf,image/*"
            onChange={(e) => handleFiles(e.target.files, "cotacoes")}
            className="hidden"
          />
        </div>
        <p className="text-xs text-zinc-500 mb-2">
          Preencha a tabela abaixo conforme o fornecedor for cotando, e/ou anexe planilhas e PDFs de cotação que ele enviar.
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
          <AttachmentList
            items={groupAttachments("cotacoes")}
            onRemove={(id) => removeAttachment(supplierId, id)}
            emptyText="Nenhuma planilha ou PDF de cotação anexado."
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
        inputRef={outrosRef}
        onFiles={(files) => handleFiles(files, "outros")}
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
    </div>
  );
}

// ============================================================================
// Componentes auxiliares: AttachmentBucket / AttachmentList
// ============================================================================

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
      <p className="text-xs text-zinc-500 mb-2">{subtitle}</p>
      <AttachmentList items={items} onRemove={onRemove} />
    </div>
  );
}

interface AttachmentListProps {
  items: SupplierAttachment[];
  onRemove: (id: string) => void;
  emptyText?: string;
}

function AttachmentList({ items, onRemove, emptyText }: AttachmentListProps) {
  if (items.length === 0) {
    return (
      <div
        className="text-center py-4 rounded-lg border border-dashed text-xs text-zinc-500"
        style={{ borderColor: "#e4e4e7", background: "#fafafa" }}
      >
        {emptyText ?? "Nenhum arquivo anexado nesta categoria. (Limite 8 MB por arquivo, salvos no navegador.)"}
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
