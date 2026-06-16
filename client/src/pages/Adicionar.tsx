// =============================================================================
// /adicionar — 4ª aba "Adicionar Fornecedores".
// Local onde o operador cadastra grupos personalizados (ex.: Brinquedos, Vidro)
// e fornecedores avulsos que ainda não pertencem a nenhum dos 3 dashboards.
// Quando um grupo crescer, ele pode ser "promovido" a dashboard independente.
// =============================================================================
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Layers,
  Building2,
  Sparkles,
  Rocket,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCustomGroups,
  CUSTOM_GROUP_PALETTE,
  BRANCH_SUGGESTIONS,
  type CustomGroup,
} from "@/shared/supplier-notes/useCustomGroups";
import {
  useExtraSuppliers,
  type ExtraSupplier,
} from "@/shared/supplier-notes/useExtraSuppliers";
import {
  useCustomSuppliers,
  genContactId,
  type SupplierScope,
} from "@/shared/supplier-notes/useCustomSuppliers";

// Destinos fixos: os 3 dashboards principais. O id usa o prefixo "fixed:" para
// nunca colidir com ids de grupos personalizados.
interface FixedDashboard {
  id: string; // "fixed:aquario" etc.
  scope: SupplierScope;
  label: string;
  diaryRoute: string; // rota que abre direto as Anotações / Diário do dashboard
}
const FIXED_DASHBOARDS: FixedDashboard[] = [
  { id: "fixed:aquario", scope: "aquario", label: "Aquário", diaryRoute: "/aquario?view=diario" },
  { id: "fixed:tapete", scope: "tapete", label: "Tapete higiênico Pet", diaryRoute: "/tapete/anotacoes" },
  { id: "fixed:yiwu", scope: "yiwu", label: "Yiwu", diaryRoute: "/yiwu/anotacoes" },
];

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

interface GroupDraft {
  id?: string;
  number: number;
  name: string;
  branch: string;
  color: string;
  description: string;
}

interface SupplierDraft {
  destination: string; // "fixed:<scope>" ou groupId de grupo personalizado
  name: string;
  chineseName: string;
  category: string;
  city: string;
  province: string;
  address: string;
  contactName: string;
  contactRole: string;
  email: string;
  whatsapp: string;
  link: string;
  moq: string;
  priceFob: string;
  leadTime: string;
  notes: string;
}

const EMPTY_SUPPLIER: SupplierDraft = {
  destination: "",
  name: "",
  chineseName: "",
  category: "",
  city: "",
  province: "",
  address: "",
  contactName: "",
  contactRole: "",
  email: "",
  whatsapp: "",
  link: "",
  moq: "",
  priceFob: "",
  leadTime: "",
  notes: "",
};

export default function AdicionarPage() {
  const {
    groups,
    createGroup,
    updateGroup,
    deleteGroup,
    promoteToDashboard,
    demoteFromDashboard,
    reorderGroups,
  } = useCustomGroups();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const { list: suppliers, create: createSupplier, remove: removeSupplier } =
    useExtraSuppliers();

  // Hooks dos 3 dashboards fixos (chamadas fixas, respeitando as regras de hooks).
  const aquarioSuppliers = useCustomSuppliers("aquario");
  const tapeteSuppliers = useCustomSuppliers("tapete");
  const yiwuSuppliers = useCustomSuppliers("yiwu");
  const fixedCreators: Record<SupplierScope, (input: Parameters<typeof aquarioSuppliers.create>[0]) => Promise<unknown>> = {
    aquario: aquarioSuppliers.create,
    tapete: tapeteSuppliers.create,
    yiwu: yiwuSuppliers.create,
  };

  const [, navigate] = useLocation();

  // Banner pós-cadastro com link para o diário do destino.
  const [lastSaved, setLastSaved] = useState<{ label: string; route: string } | null>(
    null,
  );

  // Modal de grupo
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupDraft, setGroupDraft] = useState<GroupDraft>({
    number: 1,
    name: "",
    branch: "",
    color: CUSTOM_GROUP_PALETTE[0],
    description: "",
  });

  // Form de fornecedor
  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft>(EMPTY_SUPPLIER);
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  const suppliersByGroup = useMemo(() => {
    const map: Record<string, ExtraSupplier[]> = {};
    suppliers.forEach((s) => {
      (map[s.groupId] ??= []).push(s);
    });
    return map;
  }, [suppliers]);

  function startCreateGroup() {
    const used = new Set(groups.map((g) => g.number).filter((n) => Number.isInteger(n)));
    let next = 1;
    while (used.has(next)) next += 1;
    setGroupDraft({
      number: next,
      name: "",
      branch: "",
      color: CUSTOM_GROUP_PALETTE[Math.floor(Math.random() * CUSTOM_GROUP_PALETTE.length)],
      description: "",
    });
    setGroupModalOpen(true);
  }

  function startEditGroup(g: CustomGroup) {
    setGroupDraft({
      id: g.id,
      number: g.number ?? 1,
      name: g.name,
      branch: g.branch,
      color: g.color,
      description: g.description,
    });
    setGroupModalOpen(true);
  }

  async function onDropGroup(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const ids = groups.map((g) => g.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, dragId);
    await reorderGroups(ids);
    setDragId(null);
    setDragOverId(null);
    toast.success("Subgrupos renumerados");
  }

  async function saveGroup() {
    if (!groupDraft.name.trim()) {
      toast.error("Dê um nome ao subgrupo.");
      return;
    }
    if (!groupDraft.branch.trim()) {
      toast.error("Informe o ramo (ex: Brinquedos, Vidro, Aquário).");
      return;
    }
    if (!Number.isInteger(groupDraft.number) || groupDraft.number < 0) {
      toast.error("O número do subgrupo deve ser inteiro (0 ou maior).");
      return;
    }
    const dup = groups.find(
      (g) => g.number === groupDraft.number && g.id !== groupDraft.id,
    );
    if (dup) {
      toast.error(
        `Já existe um subgrupo com o número ${groupDraft.number} ("${dup.name}"). Escolha outro.`,
      );
      return;
    }
    if (groupDraft.id) {
      await updateGroup(groupDraft.id, {
        number: groupDraft.number,
        name: groupDraft.name,
        branch: groupDraft.branch,
        color: groupDraft.color,
        description: groupDraft.description,
      });
      toast.success(`Subgrupo ${String(groupDraft.number).padStart(2, "0")} · "${groupDraft.name}" atualizado`);
    } else {
      await createGroup({
        number: groupDraft.number,
        name: groupDraft.name,
        branch: groupDraft.branch,
        color: groupDraft.color,
        description: groupDraft.description,
      });
      toast.success(`Subgrupo ${String(groupDraft.number).padStart(2, "0")} · "${groupDraft.name}" criado`);
    }
    setGroupModalOpen(false);
  }

  async function handleDeleteGroup(g: CustomGroup) {
    const used = suppliersByGroup[g.id]?.length ?? 0;
    const msg = used > 0
      ? `Excluir o subgrupo "${g.name}"? ${used} fornecedor${used === 1 ? "" : "es"} ficará${used === 1 ? "" : "ão"} sem subgrupo.`
      : `Excluir o subgrupo "${g.name}"?`;
    if (!window.confirm(msg)) return;
    await deleteGroup(g.id);
    toast.success("Subgrupo excluído");
  }

  async function handleSaveSupplier() {
    if (!supplierDraft.destination) {
      toast.error("Selecione um destino (dashboard ou subgrupo) para o fornecedor.");
      return;
    }
    if (!supplierDraft.name.trim()) {
      toast.error("Informe o nome do fornecedor.");
      return;
    }

    const name = supplierDraft.name.trim();
    const fixed = FIXED_DASHBOARDS.find((d) => d.id === supplierDraft.destination);

    if (fixed) {
      // Destino fixo: cadastra no mesmo modelo dos fornecedores manuais do dashboard.
      const phones = supplierDraft.whatsapp.trim()
        ? [{ id: genContactId(), label: "WhatsApp", value: supplierDraft.whatsapp.trim() }]
        : [];
      const emails = supplierDraft.email.trim()
        ? [{ id: genContactId(), value: supplierDraft.email.trim() }]
        : [];
      const links = supplierDraft.link.trim()
        ? [{ id: genContactId(), value: supplierDraft.link.trim() }]
        : [];
      await fixedCreators[fixed.scope]({
        name,
        chineseName: supplierDraft.chineseName.trim() || undefined,
        category: supplierDraft.category.trim() || undefined,
        city: supplierDraft.city.trim() || undefined,
        province: supplierDraft.province.trim() || undefined,
        address: supplierDraft.address.trim() || undefined,
        contactName: supplierDraft.contactName.trim() || undefined,
        contactRole: supplierDraft.contactRole.trim() || undefined,
        moq: supplierDraft.moq.trim() || undefined,
        priceFob: supplierDraft.priceFob.trim() || undefined,
        leadTime: supplierDraft.leadTime.trim() || undefined,
        notes: supplierDraft.notes.trim() || undefined,
        phones,
        emails,
        links,
      });
      toast.success(`Fornecedor "${name}" cadastrado em ${fixed.label}`);
      setLastSaved({ label: fixed.label, route: fixed.diaryRoute });
    } else {
      // Grupo personalizado: modelo atual (ExtraSupplier com groupId).
      const group = groups.find((g) => g.id === supplierDraft.destination);
      await createSupplier({
        groupId: supplierDraft.destination,
        name,
        chineseName: supplierDraft.chineseName.trim() || undefined,
        category: supplierDraft.category.trim() || undefined,
        city: supplierDraft.city.trim() || undefined,
        province: supplierDraft.province.trim() || undefined,
        address: supplierDraft.address.trim() || undefined,
        contactName: supplierDraft.contactName.trim() || undefined,
        contactRole: supplierDraft.contactRole.trim() || undefined,
        moq: supplierDraft.moq.trim() || undefined,
        priceFob: supplierDraft.priceFob.trim() || undefined,
        leadTime: supplierDraft.leadTime.trim() || undefined,
        notes: supplierDraft.notes.trim() || undefined,
        phones: supplierDraft.whatsapp.trim()
          ? [{ id: genContactId(), label: "WhatsApp", value: supplierDraft.whatsapp.trim() }]
          : [],
        emails: supplierDraft.email.trim()
          ? [{ id: genContactId(), value: supplierDraft.email.trim() }]
          : [],
        links: supplierDraft.link.trim()
          ? [{ id: genContactId(), value: supplierDraft.link.trim() }]
          : [],
      });
      toast.success(`Fornecedor "${name}" cadastrado${group ? ` no subgrupo “${group.name}”` : ""}`);
      if (group) {
        const label = `Subgrupo · ${group.name}`;
        setLastSaved({ label, route: `/grupo/${group.id}?tab=diario` });
      }
    }

    setSupplierDraft(EMPTY_SUPPLIER);
    setShowSupplierForm(false);
  }

  async function handleRemoveSupplier(s: ExtraSupplier) {
    if (!window.confirm(`Excluir o fornecedor "${s.name}"?`)) return;
    await removeSupplier(s.id);
    toast.success("Fornecedor excluído");
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top left, oklch(0.18 0.05 28 / 0.45), transparent 55%), radial-gradient(ellipse at bottom right, oklch(0.18 0.06 240 / 0.55), transparent 55%), oklch(0.06 0.015 250)",
      }}
    >
      {/* Header */}
      <header
        className="relative z-10 border-b"
        style={{ borderColor: BORDER }}
      >
        <div className="container flex items-center justify-between py-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm transition-colors hover:opacity-80"
            style={{ color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar à home
          </Link>
          <div
            className="flex items-center gap-2 text-xs"
            style={{
              color: TEXT_MUTED,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: "oklch(0.78 0.16 75)" }} />
            <span>BANCO DE FORNECEDORES AVULSOS</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 container py-12 max-w-5xl">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full border"
          style={{
            borderColor: "oklch(0.78 0.16 75 / 0.3)",
            background: "oklch(0.78 0.16 75 / 0.07)",
          }}
        >
          <Plus className="w-3.5 h-3.5" style={{ color: "oklch(0.78 0.16 75)" }} />
          <span
            className="text-[11px] tracking-[0.18em] uppercase font-semibold"
            style={{
              color: "oklch(0.85 0.13 75)",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Adicionar Fornecedores
          </span>
        </div>
        <h1
          className="mb-4"
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            fontWeight: 600,
            color: TEXT_PRIMARY,
          }}
        >
          Cadastre fornecedores que ainda
          <br />
          <span
            style={{
              background:
                "linear-gradient(135deg, oklch(0.85 0.16 75), oklch(0.65 0.20 35) 60%, oklch(0.55 0.22 25))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontStyle: "italic",
              fontWeight: 500,
              display: "inline-block",
              paddingRight: "0.18em",
              marginRight: "-0.18em",
            }}
          >
            não têm um dashboard
          </span>
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{ color: "oklch(0.78 0.015 80)", lineHeight: 1.55 }}
        >
          Crie um <strong>subgrupo</strong> para o ramo (ex.: Brinquedos, Vidro, Decoração)
          e cadastre os fornecedores ali. Quando o subgrupo crescer e merecer, você pode
          promovê-lo a um dashboard independente — mantendo todos os dados.
        </p>
      </section>

      {/* Grupos Personalizados */}
      <section className="relative z-10 container max-w-5xl mb-12">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5" style={{ color: "oklch(0.78 0.16 75)" }} />
            <h2
              className="text-xl font-semibold"
              style={{
                fontFamily: "'Fraunces', serif",
                color: TEXT_PRIMARY,
              }}
            >
              Subgrupos Personalizados
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "oklch(0.22 0.03 250)",
                color: TEXT_MUTED,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {groups.length}
            </span>
          </div>
          <button
            type="button"
            onClick={startCreateGroup}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-transform active:scale-[0.97]"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.55 0.18 25))",
              color: "oklch(0.10 0.02 250)",
            }}
          >
            <Plus className="w-4 h-4" /> Novo subgrupo
          </button>
        </div>

        {groups.length === 0 ? (
          <div
            className="rounded-2xl border-2 border-dashed p-10 text-center"
            style={{ borderColor: BORDER, color: TEXT_MUTED }}
          >
            Nenhum subgrupo personalizado ainda. Clique em <strong>"Novo subgrupo"</strong> para criar o primeiro.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => {
              const count = suppliersByGroup[g.id]?.length ?? 0;
              const isDragging = dragId === g.id;
              const isDragOver = dragOverId === g.id && dragId !== g.id;
              return (
                <div
                  key={g.id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(g.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragId && dragId !== g.id) setDragOverId(g.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverId === g.id) setDragOverId(null);
                  }}
                  onDrop={() => onDropGroup(g.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setDragOverId(null);
                  }}
                  className="rounded-2xl p-5 border transition-all cursor-grab active:cursor-grabbing"
                  style={{
                    background: SURFACE,
                    borderColor: isDragOver ? g.color : BORDER,
                    borderLeft: `4px solid ${g.color}`,
                    opacity: isDragging ? 0.4 : 1,
                    transform: isDragOver ? "translateY(-2px)" : undefined,
                    boxShadow: isDragOver ? `0 8px 28px ${g.color}33` : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div
                        className="text-[10px] uppercase tracking-[0.18em] mb-1.5 font-semibold"
                        style={{ color: g.color, fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        SUBGRUPO · {g.branch || "Sem ramo"}
                      </div>
                      <h3
                        className="font-semibold leading-tight"
                        style={{
                          fontFamily: "'Fraunces', serif",
                          color: TEXT_PRIMARY,
                          fontSize: "1.15rem",
                        }}
                      >
                        {g.name}
                      </h3>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditGroup(g)}
                        className="p-1.5 rounded hover:bg-white/5"
                        style={{ color: TEXT_MUTED }}
                        title="Editar subgrupo"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(g)}
                        className="p-1.5 rounded hover:bg-red-500/10"
                        style={{ color: "#fca5a5" }}
                        title="Excluir subgrupo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {g.description && (
                    <p
                      className="text-xs mb-3 italic"
                      style={{ color: "oklch(0.78 0.015 80)", lineHeight: 1.45 }}
                    >
                      {g.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs"
                      style={{
                        color: TEXT_MUTED,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      <Building2 className="w-3 h-3 inline-block mr-1" />
                      {count} fornecedor{count === 1 ? "" : "es"}
                    </span>
                    {g.promotedToDashboard ? (
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Rebaixar "${g.name}" de dashboard? Volta a ser apenas subgrupo personalizado.`)) return;
                          await demoteFromDashboard(g.id);
                          toast.success("Rebaixado para subgrupo personalizado");
                        }}
                        className="text-[11px] uppercase tracking-wider font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-md"
                        style={{
                          color: TEXT_MUTED,
                          border: `1px solid ${BORDER}`,
                          background: "transparent",
                        }}
                        title="Rebaixar a subgrupo personalizado"
                      >
                        <Rocket className="w-3 h-3" /> Promovido
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!window.confirm(
                            `Promover "${g.name}" a dashboard independente? Aparecerá como card próprio na home, com mesmo padrão visual dos demais.`,
                          )) return;
                          await promoteToDashboard(g.id);
                          toast.success(`"${g.name}" agora é um dashboard !`, {
                            description: "Volte para a home para vê-lo no grid.",
                          });
                        }}
                        className="text-[11px] uppercase tracking-wider font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-md"
                        style={{
                          color: g.color,
                          border: `1px solid ${g.color}55`,
                          background: `${g.color}12`,
                        }}
                      >
                        <Rocket className="w-3 h-3" /> Promover
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Cadastro de fornecedor avulso */}
      <section className="relative z-10 container max-w-5xl mb-12">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2
            className="text-xl font-semibold"
            style={{ fontFamily: "'Fraunces', serif", color: TEXT_PRIMARY }}
          >
            Cadastrar fornecedor avulso
          </h2>
          {!showSupplierForm && (
            <button
              type="button"
              onClick={() => {
                setLastSaved(null);
                setSupplierDraft({
                  ...EMPTY_SUPPLIER,
                  destination: FIXED_DASHBOARDS[0].id,
                });
                setShowSupplierForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-transform active:scale-[0.97]"
              style={{
                background: "oklch(0.22 0.03 250)",
                color: TEXT_PRIMARY,
                border: `1px solid ${BORDER}`,
              }}
            >
              <Plus className="w-4 h-4" /> Novo fornecedor
            </button>
          )}
        </div>

        {/* Banner pós-cadastro: leva o fornecedor recém-criado ao diário do destino */}
        {lastSaved && !showSupplierForm && (
          <div
            className="rounded-2xl border p-5 mb-4 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{
              background: "oklch(0.78 0.16 75 / 0.08)",
              borderColor: "oklch(0.78 0.16 75 / 0.35)",
            }}
          >
            <div className="flex items-start gap-3 flex-1">
              <Check
                className="w-5 h-5 mt-0.5 shrink-0"
                style={{ color: "oklch(0.82 0.15 145)" }}
              />
              <div>
                <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                  Fornecedor cadastrado em {lastSaved.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
                  Abra as Anotações / Diário desse destino para registrar notas e anexar arquivos.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setLastSaved(null)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "transparent",
                  color: TEXT_MUTED,
                  border: `1px solid ${BORDER}`,
                }}
              >
                Dispensar
              </button>
              <button
                type="button"
                onClick={() => navigate(lastSaved.route)}
                className="px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-transform active:scale-[0.97]"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.55 0.18 25))",
                  color: "oklch(0.10 0.02 250)",
                }}
              >
                <BookOpen className="w-4 h-4" /> Ir para Anotações / Diário
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {showSupplierForm && (
          <div
            className="rounded-2xl border p-6 mb-4"
            style={{ background: SURFACE, borderColor: BORDER }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Destino (dashboard ou subgrupo)">
                <select
                  value={supplierDraft.destination}
                  onChange={(e) =>
                    setSupplierDraft({ ...supplierDraft, destination: e.target.value })
                  }
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: "oklch(0.14 0.02 250)",
                    color: TEXT_PRIMARY,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <option value="">— Selecione um destino —</option>
                  <optgroup label="Dashboards principais">
                    {FIXED_DASHBOARDS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </optgroup>
                  {groups.length > 0 && (
                    <optgroup label="Subgrupos personalizados">
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                          {g.branch ? ` · ${g.branch}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </Field>
              <Field label="Nome do fornecedor">
                <Input
                  value={supplierDraft.name}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, name: v })}
                  placeholder="Ex.: Yiwu Glass Co."
                />
              </Field>
              <Field label="Nome em chinês (opcional)">
                <Input
                  value={supplierDraft.chineseName}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, chineseName: v })}
                  placeholder="义乌玻璃有限公司"
                />
              </Field>
              <Field label="Categoria/NCM">
                <Input
                  value={supplierDraft.category}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, category: v })}
                  placeholder="Brinquedos / Vidraria…"
                />
              </Field>
              <Field label="Cidade">
                <Input
                  value={supplierDraft.city}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, city: v })}
                  placeholder="Yiwu"
                />
              </Field>
              <Field label="Província">
                <Input
                  value={supplierDraft.province}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, province: v })}
                  placeholder="Zhejiang"
                />
              </Field>
              <Field label="Endereço completo" full>
                <Input
                  value={supplierDraft.address}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, address: v })}
                  placeholder="Distrito 4, Rua 8, Portão North Gate"
                />
              </Field>
              <Field label="Pessoa de contato">
                <Input
                  value={supplierDraft.contactName}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, contactName: v })}
                  placeholder="Mr. Wang"
                />
              </Field>
              <Field label="Cargo">
                <Input
                  value={supplierDraft.contactRole}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, contactRole: v })}
                  placeholder="Sales Manager"
                />
              </Field>
              <Field label="E-mail">
                <Input
                  value={supplierDraft.email}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, email: v })}
                  placeholder="contato@empresa.com"
                />
              </Field>
              <Field label="WhatsApp / WeChat">
                <Input
                  value={supplierDraft.whatsapp}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, whatsapp: v })}
                  placeholder="+86 139 0000 0000"
                />
              </Field>
              <Field label="Site / Alibaba / Yiwugo" full>
                <Input
                  value={supplierDraft.link}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, link: v })}
                  placeholder="https://…"
                />
              </Field>
              <Field label="MOQ">
                <Input
                  value={supplierDraft.moq}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, moq: v })}
                  placeholder="100 unidades"
                />
              </Field>
              <Field label="Preço FOB">
                <Input
                  value={supplierDraft.priceFob}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, priceFob: v })}
                  placeholder="USD 4,20"
                />
              </Field>
              <Field label="Lead time">
                <Input
                  value={supplierDraft.leadTime}
                  onChange={(v) => setSupplierDraft({ ...supplierDraft, leadTime: v })}
                  placeholder="30 dias"
                />
              </Field>
              <Field label="Observações" full>
                <textarea
                  value={supplierDraft.notes}
                  onChange={(e) =>
                    setSupplierDraft({ ...supplierDraft, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-vertical"
                  style={{
                    background: "oklch(0.14 0.02 250)",
                    color: TEXT_PRIMARY,
                    border: `1px solid ${BORDER}`,
                  }}
                  placeholder="Detalhes da negociação, política de amostras, etc."
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  setShowSupplierForm(false);
                  setSupplierDraft(EMPTY_SUPPLIER);
                }}
                className="px-4 py-2 rounded-lg text-sm"
                style={{
                  background: "transparent",
                  color: TEXT_MUTED,
                  border: `1px solid ${BORDER}`,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSupplier}
                className="px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.55 0.18 25))",
                  color: "oklch(0.10 0.02 250)",
                }}
              >
                <Check className="w-4 h-4" /> Salvar fornecedor
              </button>
            </div>
          </div>
        )}

        {/* Listagem agrupada */}
        {groups.length > 0 && (
          <div className="space-y-6">
            {groups.map((g) => {
              const items = suppliersByGroup[g.id] ?? [];
              if (items.length === 0) return null;
              return (
                <div
                  key={g.id}
                  className="rounded-2xl border overflow-hidden"
                  style={{
                    borderColor: `${g.color}55`,
                    background: `linear-gradient(180deg, ${g.color}10 0%, transparent 60%)`,
                  }}
                >
                  <div
                    className="flex items-center gap-3 px-5 py-4 border-b"
                    style={{
                      borderColor: `${g.color}33`,
                      background: `linear-gradient(90deg, ${g.color}22, transparent 70%)`,
                    }}
                  >
                    <span
                      className="font-mono font-bold text-xs px-2 py-0.5 rounded"
                      style={{
                        background: g.color,
                        color: "oklch(0.10 0.02 250)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      SUBGRUPO
                    </span>
                    <h3
                      className="text-lg font-semibold"
                      style={{
                        color: TEXT_PRIMARY,
                        fontFamily: "'Fraunces', serif",
                      }}
                    >
                      {g.name}
                    </h3>
                    {g.branch && (
                      <span
                        className="text-[11px] uppercase tracking-[0.15em] px-2 py-0.5 rounded"
                        style={{
                          color: g.color,
                          background: `${g.color}1a`,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {g.branch}
                      </span>
                    )}
                    <span
                      className="ml-auto text-[11px] font-mono"
                      style={{ color: TEXT_MUTED }}
                    >
                      {items.length} fornecedor{items.length === 1 ? "" : "es"}
                    </span>
                  </div>
                  <div className="px-5 pt-4" />
                  <div className="grid sm:grid-cols-2 gap-3 px-5 pb-5">
                    {items.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-xl p-4 border"
                        style={{
                          background: SURFACE,
                          borderColor: BORDER,
                          borderLeft: `3px solid ${g.color}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4
                              className="font-semibold"
                              style={{
                                fontFamily: "'Fraunces', serif",
                                color: TEXT_PRIMARY,
                              }}
                            >
                              {s.name}
                            </h4>
                            {s.chineseName && (
                              <p
                                className="text-xs italic mt-0.5"
                                style={{ color: TEXT_MUTED }}
                              >
                                {s.chineseName}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveSupplier(s)}
                            className="p-1.5 rounded hover:bg-red-500/10"
                            style={{ color: "#fca5a5" }}
                            title="Excluir fornecedor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div
                          className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs"
                          style={{ color: TEXT_MUTED }}
                        >
                          {s.category && <span>{s.category}</span>}
                          {s.city && <span>· {s.city}</span>}
                          {s.contactName && <span>· {s.contactName}</span>}
                          {s.priceFob && <span>· {s.priceFob}</span>}
                          {s.moq && <span>· MOQ {s.moq}</span>}
                        </div>
                        {s.notes && (
                          <p
                            className="text-xs mt-2 italic"
                            style={{ color: "oklch(0.78 0.015 80)" }}
                          >
                            "{s.notes}"
                          </p>
                        )}
                        <div
                          className="text-[10px] mt-2 font-mono"
                          style={{ color: TEXT_MUTED }}
                        >
                          Cadastrado em {fmtDate(s.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {suppliers.length === 0 && groups.length > 0 && !showSupplierForm && (
          <div
            className="rounded-2xl border-2 border-dashed p-10 text-center"
            style={{ borderColor: BORDER, color: TEXT_MUTED }}
          >
            Nenhum fornecedor cadastrado nos subgrupos personalizados ainda.
          </div>
        )}
      </section>

      {/* Modal de grupo */}
      {groupModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={() => setGroupModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl p-6 border my-8 max-h-[90vh] overflow-y-auto"
            style={{
              background: "oklch(0.12 0.02 250)",
              borderColor: BORDER,
              color: TEXT_PRIMARY,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-lg font-semibold"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {groupDraft.id ? "Editar subgrupo" : "Novo subgrupo"}
              </h3>
              <button
                onClick={() => setGroupModalOpen(false)}
                className="p-1 rounded hover:bg-white/5"
                style={{ color: TEXT_MUTED }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Número do subgrupo">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={groupDraft.number}
                  onChange={(e) =>
                    setGroupDraft({
                      ...groupDraft,
                      number: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full rounded-lg px-3 py-2"
                  style={{
                    background: "oklch(0.14 0.02 250)",
                    color: TEXT_PRIMARY,
                    border: `1px solid ${BORDER}`,
                    fontFamily: "'Fraunces', serif",
                    fontSize: "1.1rem",
                  }}
                />
                <span
                  className="text-[10px] mt-1"
                  style={{ color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Sugestão automática do próximo livre. Também dá para arrastar os cards para reordenar.
                </span>
              </Field>
              <Field label="Nome do subgrupo">
                <Input
                  value={groupDraft.name}
                  onChange={(v) => setGroupDraft({ ...groupDraft, name: v })}
                  placeholder="Ex.: Brinquedos infantis"
                />
              </Field>
              <Field label="Ramo">
                <input
                  list="branch-list"
                  value={groupDraft.branch}
                  onChange={(e) =>
                    setGroupDraft({ ...groupDraft, branch: e.target.value })
                  }
                  placeholder="Brinquedos, Vidro, Aquário…"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: "oklch(0.14 0.02 250)",
                    color: TEXT_PRIMARY,
                    border: `1px solid ${BORDER}`,
                  }}
                />
                <datalist id="branch-list">
                  {BRANCH_SUGGESTIONS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </Field>
              <Field label="Legenda / descrição">
                <textarea
                  value={groupDraft.description}
                  onChange={(e) =>
                    setGroupDraft({ ...groupDraft, description: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-vertical"
                  style={{
                    background: "oklch(0.14 0.02 250)",
                    color: TEXT_PRIMARY,
                    border: `1px solid ${BORDER}`,
                  }}
                  placeholder="Quem entra nesse subgrupo? Especialidades, observações…"
                />
              </Field>
              <Field label="Cor">
                <div className="flex flex-wrap gap-2">
                  {CUSTOM_GROUP_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setGroupDraft({ ...groupDraft, color: c })}
                      className="w-7 h-7 rounded-full transition-transform"
                      style={{
                        background: c,
                        boxShadow:
                          groupDraft.color === c
                            ? `0 0 0 2px oklch(0.97 0.01 80), 0 0 0 4px ${c}`
                            : "none",
                      }}
                    />
                  ))}
                </div>
              </Field>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setGroupModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{
                  background: "transparent",
                  color: TEXT_MUTED,
                  border: `1px solid ${BORDER}`,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={saveGroup}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.55 0.18 25))",
                  color: "oklch(0.10 0.02 250)",
                }}
              >
                {groupDraft.id ? "Salvar alterações" : "Criar subgrupo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}
      style={{ color: TEXT_MUTED }}
    >
      <span
        className="text-[10px] uppercase tracking-[0.15em] font-semibold"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 text-sm"
      style={{
        background: "oklch(0.14 0.02 250)",
        color: TEXT_PRIMARY,
        border: `1px solid ${BORDER}`,
      }}
    />
  );
}
