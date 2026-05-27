// =============================================================================
// /grupo/:groupId — Dashboard independente para um grupo personalizado promovido.
// Mantém o mesmo padrão visual editorial dos 3 dashboards principais.
// =============================================================================
import { useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { useCustomGroups, type CustomGroup } from "@/shared/supplier-notes/useCustomGroups";
import {
  useExtraSuppliers,
  type ExtraSupplier,
} from "@/shared/supplier-notes/useExtraSuppliers";

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

export default function GrupoDashboard() {
  const params = useParams() as { groupId: string };
  const { groups, demoteFromDashboard } = useCustomGroups();
  const { list: allSuppliers, remove: removeSupplier } = useExtraSuppliers();

  const group: CustomGroup | undefined = useMemo(
    () => groups.find((g) => g.id === params.groupId),
    [groups, params.groupId],
  );

  const [search, setSearch] = useState("");

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

  async function handleDemote() {
    if (
      !window.confirm(
        `Rebaixar "${group?.name}" de dashboard? Ele voltará a ser apenas um grupo personalizado em /adicionar (todos os fornecedores são preservados).`,
      )
    )
      return;
    if (group) {
      await demoteFromDashboard(group.id);
      toast.success("Grupo rebaixado", {
        description: "O grupo continua disponível em /adicionar.",
      });
    }
  }

  async function handleRemove(s: ExtraSupplier) {
    if (!window.confirm(`Excluir "${s.name}" deste grupo?`)) return;
    await removeSupplier(s.id);
    toast.success("Fornecedor removido");
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
            GRUPO Nº {String(group.number ?? 0).padStart(2, "0")} · {group.branch || "Grupo personalizado"}
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
              Fornecedores
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
          <Link
            href="/adicionar"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-transform active:scale-[0.97]"
            style={{
              background: `${accent}`,
              color: "oklch(0.10 0.02 250)",
            }}
          >
            <Plus className="w-4 h-4" />
            Adicionar fornecedor
          </Link>
          <button
            onClick={handleDemote}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{
              background: "transparent",
              color: TEXT_MUTED,
              border: `1px solid ${BORDER}`,
            }}
            title="Rebaixar de dashboard (volta a ser grupo)"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Rebaixar
          </button>
        </div>
      </section>

      <section className="relative z-10 container max-w-6xl pb-16">
        <div
          className="rounded-2xl border mb-5 px-3 py-2 flex items-center gap-3"
          style={{ borderColor: BORDER, background: SURFACE }}
        >
          <Search className="w-4 h-4" style={{ color: TEXT_MUTED }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, cidade, contato…"
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
            <Building2
              className="w-10 h-10 mx-auto mb-3 opacity-40"
              style={{ color: accent }}
            />
            <p className="mb-3">Nenhum fornecedor encontrado neste dashboard ainda.</p>
            <Link
              href="/adicionar"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: accent, color: "oklch(0.10 0.02 250)" }}
            >
              <Plus className="w-4 h-4" />
              Cadastrar primeiro fornecedor
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <article
                key={s.id}
                className="rounded-2xl p-5 border transition-all"
                style={{
                  background: SURFACE,
                  borderColor: BORDER,
                  borderLeft: `4px solid ${accent}`,
                }}
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
                  <button
                    onClick={() => handleRemove(s)}
                    className="p-1.5 rounded hover:bg-red-500/10"
                    style={{ color: "#fca5a5" }}
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div
                  className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-2"
                  style={{ color: TEXT_MUTED }}
                >
                  {s.city && <span>{s.city}</span>}
                  {s.province && <span>· {s.province}</span>}
                  {s.contactName && <span>· {s.contactName}</span>}
                </div>

                <div className="flex flex-col gap-1 text-xs mb-2">
                  {s.phones.slice(0, 1).map((p) => (
                    <a
                      key={p.id}
                      href={`tel:${p.value}`}
                      className="inline-flex items-center gap-1.5"
                      style={{ color: TEXT_PRIMARY }}
                    >
                      <Phone className="w-3 h-3" style={{ color: accent }} />
                      {p.value}
                    </a>
                  ))}
                  {s.emails.slice(0, 1).map((e) => (
                    <a
                      key={e.id}
                      href={`mailto:${e.value}`}
                      className="inline-flex items-center gap-1.5 truncate"
                      style={{ color: TEXT_PRIMARY }}
                    >
                      <Mail className="w-3 h-3" style={{ color: accent }} />
                      <span className="truncate">{e.value}</span>
                    </a>
                  ))}
                  {s.links.slice(0, 1).map((l) => (
                    <a
                      key={l.id}
                      href={l.value}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 truncate"
                      style={{ color: TEXT_PRIMARY }}
                    >
                      <LinkIcon className="w-3 h-3" style={{ color: accent }} />
                      <span className="truncate">{l.value}</span>
                    </a>
                  ))}
                </div>

                {(s.priceFob || s.moq || s.leadTime) && (
                  <div
                    className="flex flex-wrap gap-x-3 gap-y-1 text-xs"
                    style={{ color: TEXT_MUTED }}
                  >
                    {s.priceFob && <span>FOB {s.priceFob}</span>}
                    {s.moq && <span>· MOQ {s.moq}</span>}
                    {s.leadTime && <span>· Lead {s.leadTime}</span>}
                  </div>
                )}

                {s.notes && (
                  <p
                    className="text-xs mt-2 italic line-clamp-2"
                    style={{ color: "oklch(0.78 0.015 80)" }}
                  >
                    "{s.notes}"
                  </p>
                )}

                <div
                  className="text-[10px] mt-3 pt-2 border-t font-mono"
                  style={{ color: TEXT_MUTED, borderColor: BORDER }}
                >
                  Cadastrado em {fmtDate(s.createdAt)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
