// =============================================================================
// /grupo/:groupId — Dashboard independente para um grupo personalizado promovido.
// Mantém o mesmo padrão visual editorial dos 3 dashboards principais.
// Agora com SupplierNotesPanel (catálogos, fotos, cotações, status, diário)
// e edição de cadastro do fornecedor.
// =============================================================================
import { useMemo, useState, useCallback } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  Plus,
  Building2,
  Layers,
  Sparkles,
  Trash2,
  Search,
  X,
  ArrowRightLeft,
  Phone,
  Mail,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Pencil,
  ListChecks,
  NotebookPen,
  Folder,
  FolderArchive,
  FileStack,
} from "lucide-react";
import { toast } from "sonner";
import { useCustomGroups, type CustomGroup } from "@/shared/supplier-notes/useCustomGroups";
import { useSupplierGroups } from "@/shared/supplier-notes/useSupplierGroups";
import { useMacros } from "@/shared/supplier-notes/useMacros";
import {
  useExtraSuppliers,
  genExtraContactId,
  type ExtraSupplier,
} from "@/shared/supplier-notes/useExtraSuppliers";
import SupplierNotesPanel, { type PrefilledField } from "@/shared/supplier-notes/SupplierNotesPanel";
import { DEFAULT_EDITABLE_FIELDS } from "@/shared/supplier-notes/field-presets";
import { useSupplierNotes, STATUS_CONFIG, PRECO_CONFIG, type PrecoClassificacao } from "@/shared/supplier-notes/useSupplierNotes";
import { TipoBadge } from "@/shared/supplier-notes/TipoBadge";
import { UploadMetrics } from "@/shared/supplier-notes/UploadMetrics";
import ReportPanel from "@/shared/supplier-notes/ReportPanel";
import { BackupPanel } from "@/shared/supplier-notes/BackupPanel";
import PartnerTopicsPanel from "@/shared/supplier-notes/PartnerTopicsPanel";

const TEXT_PRIMARY = "oklch(0.97 0.01 80)";
const TEXT_MUTED = "oklch(0.65 0.02 80)";
const SURFACE = "oklch(0.10 0.02 250)";
const BORDER = "oklch(0.22 0.03 250)";

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Constrói os campos read-only do painel de anotações a partir do cadastro do fornecedor.
// Assim o Diário "lê automaticamente" o que foi cadastrado; a edição continua pelo lápis.
function buildPrefilled(s: ExtraSupplier): PrefilledField[] {
  const out: PrefilledField[] = [];
  const push = (label: string, value?: string, extra?: Partial<PrefilledField>) => {
    const v = (value ?? "").trim();
    if (v) out.push({ label, value: v, ...extra });
  };
  push("Nome Chinês", s.chineseName);
  push("Categoria / Setor", s.category);
  push("NCM", s.ncm);
  push("Cidade", s.city);
  push("Província / Estado", s.province);
  push("Endereço", s.address, { full: true, copyable: true });
  push("Pessoa de Contato", s.contactName);
  push("Cargo", s.contactRole);
  push("Idioma", s.contactLanguage);
  s.phones.forEach((p, i) =>
    push(s.phones.length > 1 ? `Telefone ${i + 1}` : "Telefone", p.value, {
      copyable: true,
      href: `tel:${p.value.replace(/\s+/g, "")}`,
    }),
  );
  s.emails.forEach((e, i) =>
    push(s.emails.length > 1 ? `E-mail ${i + 1}` : "E-mail", e.value, {
      copyable: true,
      href: `mailto:${e.value}`,
    }),
  );
  s.links.forEach((l, i) =>
    push(s.links.length > 1 ? `Link ${i + 1}` : "Link / Site", l.value, {
      full: true,
      href: l.value,
    }),
  );
  push("MOQ", s.moq);
  push("Preço FOB", s.priceFob);
  push("Lead Time", s.leadTime);
  push("Pagamento", s.paymentTerms);
  push("Incoterm", s.incoterm);
  push("Observações do cadastro", s.notes, { full: true });
  return out;
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────
export type SupplierFormValues = Partial<Omit<ExtraSupplier, "id" | "createdAt" | "updatedAt" | "groupId">> & {
  name: string;
  phones: ExtraSupplier["phones"];
  emails: ExtraSupplier["emails"];
  links: ExtraSupplier["links"];
};

interface SupplierModalProps {
  /** Quando presente, o modal opera em modo edição; ausente/null = criação. */
  supplier?: ExtraSupplier | null;
  accent: string;
  /** Recebe os valores tratados. Em edição, `id` vem preenchido; em criação, `null`. */
  onSubmit: (id: string | null, values: SupplierFormValues) => Promise<void>;
  onClose: () => void;
  /** Modo enxuto (Central de Documentos / Grupo Nº 00): só Nome + Nome Chinês. */
  simplified?: boolean;
}

function SupplierModal({ supplier, accent, onSubmit, onClose, simplified = false }: SupplierModalProps) {
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    name: supplier?.name || "",
    chineseName: supplier?.chineseName || "",
    category: supplier?.category || "",
    ncm: supplier?.ncm || "",
    city: supplier?.city || "",
    province: supplier?.province || "",
    address: supplier?.address || "",
    contactName: supplier?.contactName || "",
    contactRole: supplier?.contactRole || "",
    contactLanguage: supplier?.contactLanguage || "",
    moq: supplier?.moq || "",
    priceFob: supplier?.priceFob || "",
    leadTime: supplier?.leadTime || "",
    paymentTerms: supplier?.paymentTerms || "",
    incoterm: supplier?.incoterm || "",
    notes: supplier?.notes || "",
    phones: supplier ? [...supplier.phones] : [],
    emails: supplier ? [...supplier.emails] : [],
    links: supplier ? [...supplier.links] : [],
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(supplier?.id ?? null, {
        name: form.name.trim(),
        chineseName: form.chineseName.trim() || undefined,
        category: form.category.trim() || undefined,
        ncm: form.ncm.trim() || undefined,
        city: form.city.trim() || undefined,
        province: form.province.trim() || undefined,
        address: form.address.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        contactRole: form.contactRole.trim() || undefined,
        contactLanguage: form.contactLanguage.trim() || undefined,
        moq: form.moq.trim() || undefined,
        priceFob: form.priceFob.trim() || undefined,
        leadTime: form.leadTime.trim() || undefined,
        paymentTerms: form.paymentTerms.trim() || undefined,
        incoterm: form.incoterm.trim() || undefined,
        notes: form.notes.trim() || undefined,
        phones: form.phones.filter((p) => p.value.trim()),
        emails: form.emails.filter((e) => e.value.trim()),
        links: form.links.filter((l) => l.value.trim()),
      });
      toast.success(isEdit ? "Fornecedor atualizado" : "Fornecedor cadastrado");
      onClose();
    } catch {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "oklch(0.14 0.02 250)",
    border: `1px solid ${BORDER}`,
    color: TEXT_PRIMARY,
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    color: TEXT_MUTED,
    fontSize: "0.65rem",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: "0.25rem",
    display: "block",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: "oklch(0.10 0.02 250)", border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY, fontFamily: "'Fraunces', serif" }}>
            {isEdit
              ? simplified ? "Editar parceiro" : "Editar fornecedor"
              : simplified ? "Cadastrar parceiro" : "Cadastrar fornecedor"}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: TEXT_MUTED }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Identificação */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label style={labelStyle}>Nome *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} style={inputStyle} />
            </div>
            <div className={simplified ? "col-span-2" : undefined}>
              <label style={labelStyle}>Nome Chinês</label>
              <input value={form.chineseName} onChange={(e) => set("chineseName", e.target.value)} style={inputStyle} />
            </div>
            {!simplified && (
              <div>
                <label style={labelStyle}>Categoria/Setor</label>
                <input value={form.category} onChange={(e) => set("category", e.target.value)} style={inputStyle} />
              </div>
            )}
            {!simplified && (
              <div>
                <label style={labelStyle}>NCM</label>
                <input value={form.ncm} onChange={(e) => set("ncm", e.target.value)} style={inputStyle} />
              </div>
            )}
          </div>

          {simplified && (
            <p className="text-xs" style={{ color: TEXT_MUTED, lineHeight: 1.5 }}>
              Cadastre o parceiro com o nome. Depois, dentro dele, você cria os assuntos
              (ex.: “Vidro”) e anexa cotações, catálogos, fotos, vídeos e documentos.
            </p>
          )}

          {/* Localização */}
          {!simplified && (<>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Cidade</label>
              <input value={form.city} onChange={(e) => set("city", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Província/Estado</label>
              <input value={form.province} onChange={(e) => set("province", e.target.value)} style={inputStyle} />
            </div>
            <div className="col-span-2">
              <label style={labelStyle}>Endereço</label>
              <input value={form.address} onChange={(e) => set("address", e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Nome do contato</label>
              <input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Cargo</label>
              <input value={form.contactRole} onChange={(e) => set("contactRole", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Idioma</label>
              <input value={form.contactLanguage} onChange={(e) => set("contactLanguage", e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Telefones */}
          <div>
            <label style={labelStyle}>Telefones</label>
            {form.phones.map((p, i) => (
              <div key={p.id} className="flex gap-2 mb-1">
                <input
                  value={p.value}
                  onChange={(e) => {
                    const arr = [...form.phones];
                    arr[i] = { ...arr[i], value: e.target.value };
                    setForm((f) => ({ ...f, phones: arr }));
                  }}
                  style={inputStyle}
                  placeholder="+86 ..."
                />
                <button
                  onClick={() => setForm((f) => ({ ...f, phones: f.phones.filter((_, idx) => idx !== i) }))}
                  className="px-2"
                  style={{ color: "#fca5a5" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setForm((f) => ({ ...f, phones: [...f.phones, { id: genExtraContactId(), value: "" }] }))}
              className="text-xs mt-1"
              style={{ color: accent }}
            >
              + Adicionar telefone
            </button>
          </div>

          {/* Emails */}
          <div>
            <label style={labelStyle}>E-mails</label>
            {form.emails.map((e, i) => (
              <div key={e.id} className="flex gap-2 mb-1">
                <input
                  value={e.value}
                  onChange={(ev) => {
                    const arr = [...form.emails];
                    arr[i] = { ...arr[i], value: ev.target.value };
                    setForm((f) => ({ ...f, emails: arr }));
                  }}
                  style={inputStyle}
                  placeholder="email@example.com"
                />
                <button
                  onClick={() => setForm((f) => ({ ...f, emails: f.emails.filter((_, idx) => idx !== i) }))}
                  className="px-2"
                  style={{ color: "#fca5a5" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setForm((f) => ({ ...f, emails: [...f.emails, { id: genExtraContactId(), value: "" }] }))}
              className="text-xs mt-1"
              style={{ color: accent }}
            >
              + Adicionar e-mail
            </button>
          </div>

          {/* Links */}
          <div>
            <label style={labelStyle}>Links/Sites</label>
            {form.links.map((l, i) => (
              <div key={l.id} className="flex gap-2 mb-1">
                <input
                  value={l.value}
                  onChange={(ev) => {
                    const arr = [...form.links];
                    arr[i] = { ...arr[i], value: ev.target.value };
                    setForm((f) => ({ ...f, links: arr }));
                  }}
                  style={inputStyle}
                  placeholder="https://..."
                />
                <button
                  onClick={() => setForm((f) => ({ ...f, links: f.links.filter((_, idx) => idx !== i) }))}
                  className="px-2"
                  style={{ color: "#fca5a5" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setForm((f) => ({ ...f, links: [...f.links, { id: genExtraContactId(), value: "" }] }))}
              className="text-xs mt-1"
              style={{ color: accent }}
            >
              + Adicionar link
            </button>
          </div>

          {/* Comercial */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>MOQ</label>
              <input value={form.moq} onChange={(e) => set("moq", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Preço FOB</label>
              <input value={form.priceFob} onChange={(e) => set("priceFob", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Lead Time</label>
              <input value={form.leadTime} onChange={(e) => set("leadTime", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Pagamento</label>
              <input value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Incoterm</label>
              <input value={form.incoterm} onChange={(e) => set("incoterm", e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label style={labelStyle}>Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          </>)}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: BORDER }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: TEXT_MUTED, border: `1px solid ${BORDER}` }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-transform active:scale-[0.97] disabled:opacity-60"
            style={{ background: accent, color: "oklch(0.10 0.02 250)" }}
          >
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : simplified ? "Cadastrar parceiro" : "Cadastrar fornecedor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function GrupoDashboard() {
  const params = useParams() as { groupId: string };
  const { groups, demoteFromDashboard } = useCustomGroups();
  const { groups: sharedGroups } = useSupplierGroups();
  const { list: allSuppliers, remove: removeSupplier, update: updateSupplier, create: createSupplier } = useExtraSuppliers();

  // Mapa id -> info do grupo (compartilhados + personalizados) para os chips do card.
  const groupInfoById = useMemo(() => {
    const map = new Map<string, { number: number; name: string; color: string; isCustom: boolean }>();
    sharedGroups.forEach((g) =>
      map.set(g.id, { number: g.number, name: g.name, color: g.color, isCustom: false }),
    );
    groups.forEach((g) =>
      map.set(g.id, { number: g.number, name: g.name, color: g.color, isCustom: true }),
    );
    return map;
  }, [sharedGroups, groups]);

  const group: CustomGroup | undefined = useMemo(
    () => groups.find((g) => g.id === params.groupId),
    [groups, params.groupId],
  );

  // Hierarquia macro.sub deste grupo promovido (ex.: "2.1"), derivada da posição
  // do item `group:<id>` dentro do macro a que pertence. null se não estiver em
  // nenhum macro (a numeração antiga "Nº XX" deixou de ser usada).
  const { macros } = useMacros();
  const macroHier = useMemo<string | null>(() => {
    const key = `group:${params.groupId}`;
    for (const m of macros) {
      const idx = m.items.findIndex((it) => it.key === key);
      if (idx >= 0) return `${m.number}.${idx + 1}`;
    }
    return null;
  }, [macros, params.groupId]);

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<ExtraSupplier | null>(null);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [diaryExpandedId, setDiaryExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"fornecedores" | "diario">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "fornecedores") return "fornecedores";
    }
    return "diario";
  });

  // Notas/diário deste dashboard promovido (scope dinâmico grupo-{id}).
  const scope = `grupo-${params.groupId}`;
  const { entries: groupEntries, deleteEntry: deleteGroupEntry, getEntry } = useSupplierNotes(scope);

  const suppliers = useMemo(() => {
    if (!group) return [];
    const list = allSuppliers.filter((s) => s.groupId === group.id);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => {
      const hay = [
        s.name,
        s.chineseName,
        s.category,
        s.city,
        s.province,
        s.contactName,
        s.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [allSuppliers, group, search]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // Todos os fornecedores do grupo (sem o filtro de busca) — usado nas métricas do diário.
  const groupSuppliers = useMemo(
    () => (group ? allSuppliers.filter((s) => s.groupId === group.id) : []),
    [allSuppliers, group],
  );
  const allSupplierIds = useMemo(() => groupSuppliers.map((s) => s.id), [groupSuppliers]);
  const resolveSupplierName = useCallback(
    (sid: string) => groupSuppliers.find((s) => s.id === sid)?.name ?? sid,
    [groupSuppliers],
  );

  if (!group) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
        style={{ background: "oklch(0.06 0.015 250)", color: TEXT_PRIMARY }}
      >
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
          Grupo não encontrado
        </h1>
        <p className="mb-6" style={{ color: TEXT_MUTED }}>
          O grupo solicitado não existe ou ainda não foi criado.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "oklch(0.78 0.16 75)", color: "oklch(0.10 0.02 250)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar à home
        </Link>
      </div>
    );
  }

  const accent = group.color;
  // Central de Documentos: o Grupo Nº 00 opera num modelo diferente
  // (Parceiros -> Assuntos -> Anexos), em vez do modelo comercial padrão.
  const isCentral = (group.number ?? 0) === 0;

  async function handleDemote() {
    if (
      !window.confirm(
        `Rebaixar "${group?.name}" de dashboard? Ele voltará a ser apenas um subgrupo personalizado em /adicionar (todos os fornecedores são preservados).`,
      )
    )
      return;
    if (group) {
      await demoteFromDashboard(group.id);
      toast.success("Subgrupo rebaixado", {
        description: "O subgrupo continua disponível em /adicionar.",
      });
    }
  }

  async function handleRemove(s: ExtraSupplier) {
    if (!window.confirm(`Excluir "${s.name}" deste subgrupo?`)) return;
    await removeSupplier(s.id);
    toast.success("Fornecedor removido");
  }

  async function handleSubmitSupplier(id: string | null, values: SupplierFormValues) {
    if (id) {
      await updateSupplier(id, values);
    } else if (group) {
      await createSupplier({ ...values, groupId: group.id });
    }
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at top left, ${accent}33, transparent 55%), radial-gradient(ellipse at bottom right, oklch(0.18 0.06 240 / 0.55), transparent 55%), oklch(0.06 0.015 250)`,
      }}
    >
      <header className="relative z-10 border-b" style={{ borderColor: BORDER }}>
        <div className="container flex items-center justify-between py-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm hover:opacity-80"
            style={{ color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
          <div
            className="flex items-center gap-2 text-xs"
            style={{
              color: TEXT_MUTED,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} />
            <span>DASHBOARD PROMOVIDO</span>
          </div>
        </div>
      </header>

      <section className="relative z-10 container py-12 max-w-6xl">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full border"
          style={{
            borderColor: `${accent}55`,
            background: `${accent}14`,
          }}
        >
          <Layers className="w-3.5 h-3.5" style={{ color: accent }} />
          <span
            className="text-[11px] tracking-[0.18em] uppercase font-semibold"
            style={{ color: accent, fontFamily: "'Inter', sans-serif" }}
          >
            {macroHier ? `SUBGRUPO ${macroHier}` : "SUBGRUPO"} · {group.branch || "Subgrupo personalizado"}
          </span>
        </div>
        <h1
          className="mb-3"
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            fontWeight: 600,
            color: TEXT_PRIMARY,
          }}
        >
          {group.name}
        </h1>
        {group.description && (
          <p
            className="text-base max-w-2xl mb-6"
            style={{ color: "oklch(0.78 0.015 80)", lineHeight: 1.55, fontStyle: "italic" }}
          >
            "{group.description}"
          </p>
        )}

        <div className="flex flex-wrap gap-3 items-center mb-8">
          <div
            className="px-4 py-3 rounded-xl border"
            style={{ borderColor: BORDER, background: SURFACE }}
          >
            <div
              className="text-[10px] uppercase tracking-[0.18em] mb-1"
              style={{ color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {isCentral ? "Parceiros" : "Fornecedores"}
            </div>
            <div
              className="text-2xl font-bold"
              style={{ fontFamily: "'Fraunces', serif", color: accent }}
            >
              {suppliers.length}
            </div>
          </div>
          <div
            className="px-4 py-3 rounded-xl border"
            style={{ borderColor: BORDER, background: SURFACE }}
          >
            <div
              className="text-[10px] uppercase tracking-[0.18em] mb-1"
              style={{ color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
            >
              Promovido em
            </div>
            <div
              className="text-sm font-semibold"
              style={{ color: TEXT_PRIMARY, fontFamily: "'Inter', sans-serif" }}
            >
              {group.promotedAt
                ? new Date(group.promotedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </div>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setCreatingSupplier(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-transform active:scale-[0.97]"
            style={{
              background: `${accent}`,
              color: "oklch(0.10 0.02 250)",
            }}
          >
            <Plus className="w-4 h-4" />
            {isCentral ? "Adicionar parceiro" : "Adicionar fornecedor"}
          </button>
          <button
            onClick={handleDemote}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{
              background: "transparent",
              color: TEXT_MUTED,
              border: `1px solid ${BORDER}`,
            }}
            title="Rebaixar de dashboard (volta a ser subgrupo)"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Rebaixar
          </button>
        </div>
      </section>

      {/* Abas: Fornecedores | Anotações / Diário — ocultas no modo Central (só documentos) */}
      {!isCentral && (
      <section className="relative z-10 container max-w-6xl">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl border mb-6"
          style={{ borderColor: BORDER, background: SURFACE }}
        >
          <button
            onClick={() => setTab("fornecedores")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97]"
            style={{
              background: tab === "fornecedores" ? accent : "transparent",
              color: tab === "fornecedores" ? "oklch(0.10 0.02 250)" : TEXT_MUTED,
            }}
          >
            <ListChecks className="w-4 h-4" />
            Fornecedores
          </button>
          <button
            onClick={() => setTab("diario")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97]"
            style={{
              background: tab === "diario" ? accent : "transparent",
              color: tab === "diario" ? "oklch(0.10 0.02 250)" : TEXT_MUTED,
            }}
          >
            <NotebookPen className="w-4 h-4" />
            Anotações / Diário
          </button>
        </div>
      </section>
      )}

      {(isCentral || tab === "fornecedores") && (
      <section className="relative z-10 container max-w-6xl pb-16">
        <div
          className="rounded-2xl border mb-5 px-3 py-2 flex items-center gap-3"
          style={{ borderColor: BORDER, background: SURFACE }}
        >
          <Search className="w-4 h-4" style={{ color: TEXT_MUTED }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isCentral ? "Buscar parceiro pelo nome…" : "Buscar por nome, cidade, contato…"}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: TEXT_PRIMARY }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ color: TEXT_MUTED }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {suppliers.length === 0 ? (
          <div
            className="rounded-2xl border-2 border-dashed p-12 text-center"
            style={{ borderColor: BORDER, color: TEXT_MUTED }}
          >
            {isCentral ? (
              <FolderArchive className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: accent }} />
            ) : (
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: accent }} />
            )}
            <p className="mb-3">
              {isCentral
                ? "Nenhum parceiro cadastrado ainda. Crie um parceiro (ex.: Betty) e depois adicione os assuntos e anexos."
                : "Nenhum fornecedor encontrado neste dashboard ainda."}
            </p>
            <button
              onClick={() => setCreatingSupplier(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-transform active:scale-[0.97]"
              style={{ background: accent, color: "oklch(0.10 0.02 250)" }}
            >
              <Plus className="w-4 h-4" />
              {isCentral ? "Cadastrar primeiro parceiro" : "Cadastrar primeiro fornecedor"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {suppliers.map((s) => {
              const isOpen = expandedId === s.id;
              return (
                <article
                  key={s.id}
                  className="rounded-2xl border transition-all"
                  style={{
                    background: SURFACE,
                    borderColor: isOpen ? accent : BORDER,
                    borderLeft: `4px solid ${accent}`,
                  }}
                >
                  {/* Header do card — clicável para expandir */}
                  <div
                    className="p-5 cursor-pointer select-none"
                    onClick={() => toggleExpand(s.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        {s.category && (
                          <div
                            className="text-[10px] uppercase tracking-[0.18em] mb-1.5 font-semibold"
                            style={{ color: accent, fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {s.category}
                          </div>
                        )}
                        <h3
                          className="font-semibold leading-tight truncate"
                          style={{
                            fontFamily: "'Fraunces', serif",
                            color: TEXT_PRIMARY,
                            fontSize: "1.1rem",
                          }}
                        >
                          {s.name}
                        </h3>
                        {s.chineseName && (
                          <p
                            className="text-xs italic mt-0.5 truncate"
                            style={{ color: TEXT_MUTED }}
                          >
                            {s.chineseName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSupplier(s);
                          }}
                          className="p-1.5 rounded hover:bg-white/5"
                          style={{ color: accent }}
                          title="Editar cadastro"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(s);
                          }}
                          className="p-1.5 rounded hover:bg-red-500/10"
                          style={{ color: "#fca5a5" }}
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 ml-1" style={{ color: TEXT_MUTED }} />
                        ) : (
                          <ChevronDown className="w-4 h-4 ml-1" style={{ color: TEXT_MUTED }} />
                        )}
                      </div>
                    </div>

                    {!isCentral && (
                    <div
                      className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-2"
                      style={{ color: TEXT_MUTED }}
                    >
                      {s.city && <span>{s.city}</span>}
                      {s.province && <span>· {s.province}</span>}
                      {s.contactName && <span>· {s.contactName}</span>}
                    </div>
                    )}

                    {!isCentral && (
                    <div className="flex flex-col gap-1 text-xs">
                      {s.phones.slice(0, 1).map((p) => (
                        <span key={p.id} className="inline-flex items-center gap-1.5" style={{ color: TEXT_PRIMARY }}>
                          <Phone className="w-3 h-3" style={{ color: accent }} />
                          {p.value}
                        </span>
                      ))}
                      {s.emails.slice(0, 1).map((e) => (
                        <span key={e.id} className="inline-flex items-center gap-1.5 truncate" style={{ color: TEXT_PRIMARY }}>
                          <Mail className="w-3 h-3" style={{ color: accent }} />
                          <span className="truncate">{e.value}</span>
                        </span>
                      ))}
                      {s.links.slice(0, 1).map((l) => (
                        <a
                          key={l.id}
                          href={l.value}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 truncate hover:underline"
                          style={{ color: TEXT_PRIMARY }}
                        >
                          <LinkIcon className="w-3 h-3" style={{ color: accent }} />
                          <span className="truncate">{l.value}</span>
                        </a>
                      ))}
                    </div>
                    )}

                    {isCentral && (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: TEXT_MUTED }}>
                        <FileStack className="w-3.5 h-3.5" style={{ color: accent }} />
                        <span>Toque para ver os assuntos e anexos deste parceiro</span>
                      </div>
                    )}

                    <div
                      className="text-[10px] mt-3 pt-2 border-t font-mono"
                      style={{ color: TEXT_MUTED, borderColor: BORDER }}
                    >
                      Cadastrado em {fmtDate(s.createdAt)}
                    </div>
                  </div>

                  {/* Painel expandido: assuntos (Central) ou anotações (padrão) */}
                  {isOpen && (
                    <div className="px-5 pb-5 pt-2 border-t" style={{ borderColor: BORDER }}>
                      {isCentral ? (
                        <PartnerTopicsPanel
                          partnerId={s.id}
                          dashboardScope={scope}
                          accent={accent}
                        />
                      ) : (
                        <SupplierNotesPanel
                          scope={`grupo-${group.id}`}
                          supplierId={s.id}
                          supplierName={s.name}
                          accent={accent}
                          compact
                          prefilledFields={buildPrefilled(s)}
                          editableFields={DEFAULT_EDITABLE_FIELDS}
                          onSaved={() => setExpandedId(null)}
                        />
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      )}

      {!isCentral && tab === "diario" && (
      <section className="relative z-10 container max-w-6xl pb-16 space-y-5">
        {/* CADERNO DE CAMPO */}
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-2"
            style={{ color: accent, fontFamily: "'JetBrains Mono', monospace" }}
          >
            Caderno de Campo
          </div>
          <h2
            className="mb-2"
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: TEXT_PRIMARY,
            }}
          >
            Anotações / Diário
          </h2>
          <p className="text-sm max-w-2xl" style={{ color: TEXT_MUTED, lineHeight: 1.55 }}>
            Acompanhe o status de cada fornecedor deste dashboard, edite as informações,
            faça upload de catálogos, fotos e cotações e gere relatórios em PDF. Os dados
            do cadastro são lidos automaticamente e podem ser editados pelo lápis.
          </p>
        </div>

        {/* Métricas de uploads (TOPO) */}
        <UploadMetrics scope={scope} tone="dark" accent={accent} />

        {/* Relatório de Atividades (status + detalhamento + PDF) — TOPO */}
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: BORDER, background: SURFACE }}
        >
          {groupSuppliers.length === 0 ? (
            <div className="text-center py-10" style={{ color: TEXT_MUTED }}>
              <NotebookPen className="w-9 h-9 mx-auto mb-3 opacity-40" style={{ color: accent }} />
              <p className="mb-1">Nenhum fornecedor cadastrado neste dashboard ainda.</p>
              <p className="text-xs">
                As métricas e o relatório aparecerão assim que você adicionar fornecedores.
              </p>
            </div>
          ) : (
            <ReportPanel
              scope={scope}
              scopeLabel={macroHier ? `${group.name} · Subgrupo ${macroHier}` : group.name}
              entries={groupEntries}
              allSupplierIds={allSupplierIds}
              resolveSupplierName={resolveSupplierName}
              onDeleteEntry={deleteGroupEntry}
              tone="dark"
            />
          )}
        </div>

        {/* Lista de fornecedores com painel completo (status, informações, uploads) — ABAIXO */}
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-3"
            style={{ color: accent, fontFamily: "'JetBrains Mono', monospace" }}
          >
            Fornecedores deste dashboard
          </div>
        {groupSuppliers.length === 0 ? (
          <div
            className="rounded-2xl border-2 border-dashed p-12 text-center"
            style={{ borderColor: BORDER, color: TEXT_MUTED }}
          >
            <NotebookPen className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: accent }} />
            <p className="mb-3">Nenhum fornecedor cadastrado neste dashboard ainda.</p>
            <button
              onClick={() => setCreatingSupplier(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-transform active:scale-[0.97]"
              style={{ background: accent, color: "oklch(0.10 0.02 250)" }}
            >
              <Plus className="w-4 h-4" />
              Cadastrar primeiro fornecedor
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groupSuppliers.map((s) => {
              const isOpen = diaryExpandedId === s.id;
              const entry = getEntry(s.id);
              const st = STATUS_CONFIG[entry?.status ?? "nao-visitado"];
              const precoKey = entry?.status === "fornecedor-aprovado"
                ? (entry?.fields?.precoClassificacao as PrecoClassificacao | undefined)
                : undefined;
              const pcfg = precoKey ? PRECO_CONFIG[precoKey] : null;
              const attachCount = entry?.attachments?.length ?? 0;
              return (
                <article
                  key={s.id}
                  className="rounded-2xl border transition-all"
                  style={{
                    background: SURFACE,
                    borderColor: isOpen ? accent : BORDER,
                    borderLeft: `4px solid ${accent}`,
                  }}
                >
                  <div
                    className="p-5 cursor-pointer select-none"
                    onClick={() =>
                      setDiaryExpandedId((prev) => (prev === s.id ? null : s.id))
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {s.category && (
                          <div
                            className="text-[10px] uppercase tracking-[0.18em] mb-1.5 font-semibold"
                            style={{ color: accent, fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {s.category}
                          </div>
                        )}
                        <h3
                          className="font-semibold leading-tight truncate"
                          style={{
                            fontFamily: "'Fraunces', serif",
                            color: TEXT_PRIMARY,
                            fontSize: "1.1rem",
                          }}
                        >
                          {s.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                          >
                            <span>{st.emoji}</span>
                            {st.label}
                          </span>
                          {pcfg && (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: pcfg.bg, color: pcfg.color, border: `1px solid ${pcfg.border}` }}
                            >
                              <span>{pcfg.emoji}</span>
                              {pcfg.label}
                            </span>
                          )}
                          <TipoBadge fields={entry?.fields} />
                          {attachCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full"
                              style={{ color: TEXT_MUTED, border: `1px solid ${BORDER}` }}
                            >
                              <Folder className="w-3 h-3" /> {attachCount} anexo{attachCount === 1 ? "" : "s"}
                            </span>
                          )}
                          {(entry?.groupIds ?? [])
                            .map((gid) => ({ gid, info: groupInfoById.get(gid) }))
                            .filter((x) => x.info)
                            .map(({ gid, info }) => (
                              <span
                                key={gid}
                                className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  color: info!.color,
                                  background: `${info!.color}1f`,
                                  border: `1px solid ${info!.color}66`,
                                }}
                                title={`${info!.name}${info!.isCustom ? " (subgrupo personalizado)" : ""}`}
                              >
                                <span
                                  className="inline-block w-1.5 h-1.5 rounded-full"
                                  style={{ background: info!.color }}
                                />
                                <span className="truncate max-w-[140px]">{info!.name}</span>
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSupplier(s);
                          }}
                          className="p-1.5 rounded hover:bg-white/5"
                          style={{ color: accent }}
                          title="Editar cadastro"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 ml-1" style={{ color: TEXT_MUTED }} />
                        ) : (
                          <ChevronDown className="w-4 h-4 ml-1" style={{ color: TEXT_MUTED }} />
                        )}
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-2 border-t" style={{ borderColor: BORDER }}>
                      <SupplierNotesPanel
                        scope={scope}
                        supplierId={s.id}
                        supplierName={s.name}
                        accent={accent}
                        compact
                        prefilledFields={buildPrefilled(s)}
                        editableFields={DEFAULT_EDITABLE_FIELDS}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
        </div>

        {/* Backup (rodapé) */}
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: BORDER, background: SURFACE }}
        >
          <BackupPanel tone="dark" />
        </div>
      </section>
      )}

      {/* Modal de cadastro / edição */}
      {(editingSupplier || creatingSupplier) && (
        <SupplierModal
          supplier={editingSupplier}
          accent={accent}
          simplified={isCentral}
          onSubmit={handleSubmitSupplier}
          onClose={() => {
            setEditingSupplier(null);
            setCreatingSupplier(false);
          }}
        />
      )}
    </div>
  );
}
