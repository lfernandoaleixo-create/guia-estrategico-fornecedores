// =============================================================================
// SubgroupDashboard — /subgrupo/:id
//
// Dashboard dedicado de um SUBGRUPO (modelo macro.sub, ex.: 1.4 Coleira de
// cachorro) criado dentro de um macro. Lista os fornecedores manuais (scope
// "aquario") cujo vínculo de subgrupo (gravado na NOTA em fields.subgroupId)
// aponta para este subgrupo. Reaproveita o CustomSupplierCard (que já entrega o
// painel completo: status, anexos, tradução, cotações) e o CustomSupplierFormDialog
// para cadastro com o subgrupo pré-vinculado.
//
// Camada puramente ADITIVA: não altera nenhum fluxo existente.
// =============================================================================
import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Plus, Building2, Search, X, Layers } from "lucide-react";
import { toast } from "sonner";
import { useSubgroups } from "@/shared/supplier-notes/useSubgroups";
import { useMacros } from "@/shared/supplier-notes/useMacros";
import {
  useCustomSuppliers,
  type CustomSupplier,
} from "@/shared/supplier-notes/useCustomSuppliers";
import { useSupplierNotes, type SubtipoAquario } from "@/shared/supplier-notes/useSupplierNotes";
import CustomSupplierCard from "@/shared/supplier-notes/CustomSupplierCard";
import CustomSupplierFormDialog from "@/shared/supplier-notes/CustomSupplierFormDialog";
import { formatSubgroupNumber } from "@/shared/supplier-notes/subgroupNumber";
import { subgroupEmoji } from "@/shared/supplier-notes/subgroupEmoji";
import { suppliersForSubgroup, searchSuppliers } from "@/shared/supplier-notes/subgroupFilter";

const TEXT_PRIMARY = "oklch(0.97 0.01 80)";
const TEXT_MUTED = "oklch(0.65 0.02 80)";
const SURFACE = "oklch(0.10 0.02 250)";
const BORDER = "oklch(0.22 0.03 250)";
const BG = "oklch(0.07 0.015 250)";

export default function SubgroupDashboard() {
  const params = useParams();
  const subgroupId = params.id ?? "";

  const { byId: subgroupById, loading: loadingSub } = useSubgroups();
  const { macros } = useMacros();
  const subgroup = subgroupId ? subgroupById.get(subgroupId) : undefined;

  // Fornecedores manuais do scope aquário + notas (onde mora o vínculo de subgrupo).
  const { list, loaded, create, update, remove } = useCustomSuppliers("aquario");
  const notes = useSupplierNotes("aquario");

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CustomSupplier | null>(null);

  const accent = subgroup?.color ?? "#10b981";
  const macro = subgroup ? macros.find((m) => m.number === subgroup.macroNumber) : undefined;

  // Fornecedores deste subgrupo: a nota do fornecedor tem fields.subgroupId === id.
  const suppliersInSubgroup = useMemo(
    () => suppliersForSubgroup(list, notes.entries, subgroupId),
    [list, notes.entries, subgroupId],
  );

  const filtered = useMemo(
    () => searchSuppliers(suppliersInSubgroup, search),
    [suppliersInSubgroup, search],
  );

  async function handleCreate(
    data: Omit<CustomSupplier, "id" | "scope" | "createdAt" | "updatedAt">,
  ) {
    const created = await create(data);
    // Vincula o fornecedor recém-criado a ESTE subgrupo (gravado na nota).
    if (created) {
      notes.upsertEntry(created.id, { fields: { subgroupId } });
    }
    setCreating(false);
    toast.success("Fornecedor cadastrado neste subgrupo.");
  }

  async function handleEdit(
    data: Omit<CustomSupplier, "id" | "scope" | "createdAt" | "updatedAt">,
  ) {
    if (!editing) return;
    await update(editing.id, data);
    setEditing(null);
    toast.success("Cadastro atualizado.");
  }

  async function handleDuplicate(supplier: CustomSupplier, subtipo: SubtipoAquario) {
    const { id: _id, scope: _scope, createdAt: _c, updatedAt: _u, ...rest } = supplier;
    const created = await create(rest as Omit<CustomSupplier, "id" | "scope" | "createdAt" | "updatedAt">);
    if (created) {
      // Mantém o vínculo de subgrupo e registra a especialidade escolhida.
      notes.upsertEntry(created.id, {
        fields: { subgroupId, subtipoAquario: subtipo },
      });
    }
    toast.success("Fornecedor duplicado neste subgrupo.");
  }

  const loading = loadingSub || !loaded;

  // ── Subgrupo inexistente ───────────────────────────────────────────────────
  if (!loading && !subgroup) {
    return (
      <div className="min-h-screen" style={{ background: BG, color: TEXT_PRIMARY }}>
        <div className="container max-w-3xl py-20 text-center">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-40" style={{ color: TEXT_MUTED }} />
          <h1
            className="mb-3"
            style={{ fontFamily: "'Fraunces', serif", fontSize: "1.8rem", fontWeight: 600 }}
          >
            Subgrupo não encontrado
          </h1>
          <p className="mb-6" style={{ color: TEXT_MUTED }}>
            Este subgrupo pode ter sido removido. Volte à página inicial para ver os subgrupos atuais.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: accent, color: "oklch(0.10 0.02 250)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para a página inicial
          </Link>
        </div>
      </div>
    );
  }

  const emoji = subgroup ? subgroupEmoji(subgroup.name) : "";
  const hierLabel = subgroup ? formatSubgroupNumber(subgroup.macroNumber, subgroup.sub) : "";

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT_PRIMARY }}>
      {/* Glow de fundo na cor do subgrupo */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(60rem 40rem at 15% -10%, ${accent}22, transparent 60%)`,
        }}
      />

      {/* Cabeçalho */}
      <header className="relative z-10 container max-w-6xl pt-8 pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-6 hover:underline"
          style={{ color: TEXT_MUTED }}
        >
          <ArrowLeft className="w-4 h-4" /> Página inicial
        </Link>

        <div className="flex items-start gap-4">
          <span
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-bold"
            style={{
              background: `${accent}22`,
              border: `1px solid ${accent}88`,
              color: accent,
              fontFamily: "'Fraunces', serif",
            }}
          >
            {emoji || hierLabel}
          </span>
          <div className="min-w-0">
            <div
              className="text-[11px] uppercase tracking-[0.22em] font-semibold mb-1"
              style={{ color: accent, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {loading ? "Carregando…" : `Subgrupo ${hierLabel}`}
              {macro && ` · ${macro.name}`}
            </div>
            <h1
              className="leading-tight"
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: TEXT_PRIMARY,
              }}
            >
              {subgroup?.name ?? "…"}
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: TEXT_MUTED }}>
              {suppliersInSubgroup.length} fornecedor
              {suppliersInSubgroup.length === 1 ? "" : "es"} neste subgrupo. Cada um abre o painel
              completo com status, contatos, anexos (com tradução PT) e cotações.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-transform active:scale-[0.97]"
            style={{ background: accent, color: "oklch(0.10 0.02 250)" }}
          >
            <Plus className="w-4 h-4" /> Adicionar fornecedor neste subgrupo
          </button>
        </div>
      </header>

      {/* Busca + lista */}
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
            <>
              <span className="text-xs" style={{ color: TEXT_MUTED }}>
                {filtered.length} de {suppliersInSubgroup.length}
              </span>
              <button onClick={() => setSearch("")} style={{ color: TEXT_MUTED }}>
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border p-12 text-center" style={{ borderColor: BORDER, color: TEXT_MUTED }}>
            Carregando fornecedores…
          </div>
        ) : suppliersInSubgroup.length === 0 ? (
          <div
            className="rounded-2xl border-2 border-dashed p-12 text-center"
            style={{ borderColor: BORDER, color: TEXT_MUTED }}
          >
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: accent }} />
            <p className="mb-3">Nenhum fornecedor neste subgrupo ainda.</p>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-transform active:scale-[0.97]"
              style={{ background: accent, color: "oklch(0.10 0.02 250)" }}
            >
              <Plus className="w-4 h-4" /> Cadastrar primeiro fornecedor
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed p-12 text-center" style={{ borderColor: BORDER, color: TEXT_MUTED }}>
            Nenhum fornecedor casa com a busca “{search}”.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((s) => (
              <CustomSupplierCard
                key={s.id}
                supplier={s}
                tone="dark"
                onEdit={() => setEditing(s)}
                onDelete={() => remove(s.id)}
                onDuplicate={(subtipo) => handleDuplicate(s, subtipo)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal: novo fornecedor (subgrupo pré-fixado) */}
      {creating && subgroup && (
        <CustomSupplierFormDialog
          open={creating}
          scope="aquario"
          tone="dark"
          onClose={() => setCreating(false)}
          onSubmit={handleCreate}
          enableSubgroup
          subgroupId={subgroupId}
          onSubgroupChange={() => {}}
          fixedMacroNumber={subgroup.macroNumber}
        />
      )}

      {/* Modal: editar cadastro */}
      {editing && (
        <CustomSupplierFormDialog
          open={!!editing}
          scope="aquario"
          tone="dark"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}
