// =============================================================================
// CustomSupplierCard — card reutilizável para listar fornecedores manuais.
// Mostra dados resumidos + expande para o painel completo de Diário (anotações).
// =============================================================================

import { useMemo, useState } from "react";
import SupplierNotesPanel, { type PrefilledField } from "./SupplierNotesPanel";
import { DEFAULT_EDITABLE_FIELDS } from "./field-presets";
import { type CustomSupplier, formatCreatedDateBR } from "./useCustomSuppliers";
import {
  useSupplierNotes,
  SUBTIPO_CONFIG,
  STATUS_CONFIG,
  type SubtipoAquario,
  type SupplierStatus,
} from "./useSupplierNotes";
import { TipoBadge } from "./TipoBadge";
import { PotentialBadge } from "./PotentialBadge";
import { PrecoBadge } from "./PrecoBadge";
import { StatusLivreBadge } from "./StatusLivreBadge";
import { PartnerChips } from "./PartnerChips";
import { useSubgroups } from "./useSubgroups";
import { formatSubgroupNumber } from "./subgroupNumber";
import { subgroupEmoji } from "./subgroupEmoji";

interface Props {
  supplier: CustomSupplier;
  tone?: "dark" | "light";
  onEdit: () => void;
  onDelete: () => void;
  /**
   * Duplica este fornecedor em um NOVO cadastro independente, com a especialidade
   * escolhida e negociação zerada. Só oferecido no scope aquario (Aquário/Terrário).
   */
  onDuplicate?: (subtipo: SubtipoAquario) => void;
}

export default function CustomSupplierCard({ supplier, tone = "dark", onEdit, onDelete, onDuplicate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const isDark = tone === "dark";

  // Lê a anotação deste fornecedor manual para exibir o tipo (Direto/Trader)
  // no cabeçalho recolhido, sem precisar expandir o card.
  const { entries } = useSupplierNotes(supplier.scope);
  const tipoFields = entries[supplier.id]?.fields;
  // Status atual da negociação (Não visitado, Contato feito, ...) — exibido no
  // cabeçalho recolhido como selo, igual aos cards do catálogo.
  const status = (entries[supplier.id]?.status as SupplierStatus | undefined) ?? "nao-visitado";
  const statusCfg = STATUS_CONFIG[status];
  // Subgrupo vinculado (modelo macro.sub), gravado em fields.subgroupId.
  const { byId: subgroupById } = useSubgroups();
  const subgroupId = (tipoFields?.subgroupId as string | undefined) ?? "";
  const subgroup = subgroupId ? subgroupById.get(subgroupId) : undefined;

  const prefilled = useMemo<PrefilledField[]>(() => {
    const fields: PrefilledField[] = [];
    const add = (label: string, value?: string, opts?: { copy?: boolean; link?: string }) => {
      if (!value || !value.trim()) return;
      fields.push({ label, value, copyable: opts?.copy, href: opts?.link });
    };
    add("Empresa", supplier.name, { copy: true });
    add("Nome chinês", supplier.chineseName, { copy: true });
    add("Categoria", supplier.category);
    add("NCM", supplier.ncm, { copy: true });
    add("Cidade", supplier.city);
    add("Província", supplier.province);
    add("Distrito", supplier.district);
    add("Andar", supplier.floor);
    add("Portão", supplier.gate);
    add("Endereço", supplier.address, { copy: true });
    add("Pessoa de Contato", supplier.contactName, { copy: true });
    add("Cargo", supplier.contactRole);
    add("Idioma", supplier.contactLanguage);
    supplier.phones.forEach((p, i) => {
      if (!p.value.trim()) return;
      add(p.label?.trim() || `Telefone ${i + 1}`, p.value, { copy: true });
    });
    supplier.emails.forEach((e, i) => {
      if (!e.value.trim()) return;
      add(e.label?.trim() || `E-mail ${i + 1}`, e.value, { copy: true });
    });
    supplier.links.forEach((l, i) => {
      if (!l.value.trim()) return;
      const safeLink = /^https?:\/\//i.test(l.value) ? l.value : `https://${l.value}`;
      add(l.label?.trim() || `Link ${i + 1}`, l.value, { link: safeLink, copy: true });
    });
    add("MOQ", supplier.moq);
    add("Preço FOB", supplier.priceFob);
    add("Lead time", supplier.leadTime);
    add("Pagamento", supplier.paymentTerms);
    add("Incoterm", supplier.incoterm);
    if (supplier.notes) add("Observações iniciais", supplier.notes);
    return fields;
  }, [supplier]);

  const palette = isDark
    ? {
        card: "border-amber-500/30 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]",
        title: "text-white",
        sub: "text-white/60",
        badge: "bg-amber-500/15 text-amber-200 border border-amber-500/30",
        chip: "bg-white/5 border border-white/10 text-white/70",
        actionBtn: "text-white/70 hover:text-white",
        danger: "text-rose-300 hover:text-rose-200",
      }
    : {
        card: "border-amber-300 bg-amber-50/50 hover:bg-amber-50",
        title: "text-zinc-900",
        sub: "text-zinc-600",
        badge: "bg-amber-100 text-amber-800 border border-amber-200",
        chip: "bg-zinc-100 border border-zinc-200 text-zinc-700",
        actionBtn: "text-zinc-500 hover:text-zinc-900",
        danger: "text-rose-600 hover:text-rose-700",
      };

  const phoneCount = supplier.phones.filter((p) => p.value.trim()).length;
  const emailCount = supplier.emails.filter((p) => p.value.trim()).length;
  const linkCount = supplier.links.filter((p) => p.value.trim()).length;

  return (
    <div className={`rounded-2xl border ${palette.card} transition-colors`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${palette.badge}`}>
              ★ Cadastro manual
            </span>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                color: statusCfg.color,
                background: statusCfg.bg,
                border: `1px solid ${statusCfg.border}`,
              }}
              title={statusCfg.label}
            >
              <span className="leading-none">{statusCfg.emoji}</span>
              <span>{statusCfg.label}</span>
            </span>
            {supplier.category && (
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${palette.chip}`}>
                {supplier.category}
              </span>
            )}
            <span className={`text-[10px] ${palette.sub}`}>
              Adicionado em {formatCreatedDateBR(supplier.createdAt)}
            </span>
            <PotentialBadge fields={tipoFields} />
            <PrecoBadge fields={tipoFields} />
            <TipoBadge fields={tipoFields} />
            <StatusLivreBadge fields={tipoFields} />
            <PartnerChips fields={tipoFields} accent={isDark ? "#a78bfa" : "#7c3aed"} />
            {subgroup && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: "#fff",
                  background: subgroup.color,
                  border: `1px solid ${subgroup.color}`,
                }}
                title={`Subgrupo ${formatSubgroupNumber(subgroup.macroNumber, subgroup.sub)} - ${subgroup.name}`}
              >
                {subgroupEmoji(subgroup.name) && (
                  <span aria-hidden>{subgroupEmoji(subgroup.name)}</span>
                )}
                <span className="font-extrabold">
                  {formatSubgroupNumber(subgroup.macroNumber, subgroup.sub)}
                </span>
                <span>· {subgroup.name}</span>
              </span>
            )}
          </div>
          <h3 className={`text-base sm:text-lg font-bold leading-tight ${palette.title}`}>
            {supplier.name}
            {supplier.chineseName && (
              <span className={`ml-2 text-sm font-normal ${palette.sub}`}>{supplier.chineseName}</span>
            )}
          </h3>
          <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs ${palette.sub}`}>
            {supplier.city && <span>{supplier.city}</span>}
            {supplier.district && <span>Distrito {supplier.district}</span>}
            {supplier.floor && <span>{supplier.floor}</span>}
            {supplier.gate && <span>Portão {supplier.gate}</span>}
            {phoneCount > 0 && <span>{phoneCount} telefone(s)</span>}
            {emailCount > 0 && <span>{emailCount} e-mail(s)</span>}
            {linkCount > 0 && <span>{linkCount} link(s)</span>}
          </div>
        </div>
        <span className={`text-xs ${palette.sub}`}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className={`px-4 pb-4 ${isDark ? "border-t border-white/10" : "border-t border-zinc-200"}`}>
          <div className="flex flex-wrap gap-2 my-3">
            <button
              type="button"
              onClick={onEdit}
              className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "bg-white/10 hover:bg-white/15 text-white border border-white/15" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200"}`}
            >
              ✎ Editar cadastro
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remover o fornecedor "${supplier.name}"? As anotações ligadas a ele também serão perdidas.`)) {
                  onDelete();
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-lg ${palette.danger}`}
            >
              🗑 Remover
            </button>
            {onDuplicate && supplier.scope === "aquario" && (
              <button
                type="button"
                onClick={() => setDupOpen((v) => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "bg-white/10 hover:bg-white/15 text-white border border-white/15" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"}`}
                title="Criar um novo cadastro independente deste mesmo fornecedor (outra especialidade/negociação)"
              >
                ⧉ Duplicar para outra negociação
              </button>
            )}
          </div>

          {onDuplicate && supplier.scope === "aquario" && dupOpen && (
            <div
              className={`mb-3 rounded-lg p-3 ${isDark ? "bg-white/5 border border-white/10" : "bg-zinc-50 border border-zinc-200"}`}
            >
              <p className={`text-xs mb-2 ${isDark ? "text-white/80" : "text-zinc-700"}`}>
                Cria um <strong>novo cadastro independente</strong> com os mesmos dados de contato,
                porém com <strong>negociação zerada</strong> (status, anotações, anexos e cotações começam vazios).
                Escolha a especialidade do novo cadastro:
              </p>
              <div className="flex flex-wrap gap-2">
                {((["aquario", "terrario"] as SubtipoAquario[])).map((t) => {
                  const cfg = SUBTIPO_CONFIG[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        onDuplicate(t);
                        setDupOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-transform active:scale-[0.97]"
                      style={{
                        color: cfg.color,
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                      }}
                    >
                      <span>{cfg.emoji}</span>
                      <span>Duplicar como {cfg.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setDupOpen(false)}
                  className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "text-white/60 hover:text-white" : "text-zinc-500 hover:text-zinc-800"}`}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <SupplierNotesPanel
            supplierId={supplier.id}
            supplierName={supplier.name}
            scope={supplier.scope}
            prefilledFields={prefilled}
            editableFields={DEFAULT_EDITABLE_FIELDS}
            onSaved={() => setExpanded(false)}
          />
        </div>
      )}
    </div>
  );
}
