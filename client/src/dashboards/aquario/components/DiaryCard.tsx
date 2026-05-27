// =============================================================================
// DiaryCard - Card expansível por fornecedor que usa o painel unificado
// SupplierNotesPanel (status + observações + anexos).
//
// Mantém a casca visual rica do dashboard Aquário (card com header colorido
// por categoria, badges, info de cidade) mas delega o miolo do diário ao
// componente compartilhado.
// =============================================================================

import { useState } from "react";
import { type Supplier } from "@aquario/data/suppliers";
import { useSupplierNotes } from "@/shared/supplier-notes/useSupplierNotes";
import { useSupplierGroups } from "@/shared/supplier-notes/useSupplierGroups";
import SupplierNotesPanel, { type PrefilledField } from "@/shared/supplier-notes/SupplierNotesPanel";
import { DEFAULT_EDITABLE_FIELDS } from "@/shared/supplier-notes/field-presets";
import {
  ChevronDown,
  ChevronUp,
  Paperclip,
  FileText,
  MapPin,
  Building2,
  Calendar,
} from "lucide-react";

interface Props {
  supplier: Supplier;
  defaultExpanded?: boolean;
}

const categoryStyles: Record<
  Supplier["category"],
  { icon: string; label: string; tint: string; border: string }
> = {
  terrario: { icon: "🦎", label: "Terrário", tint: "oklch(0.96 0.04 145)", border: "oklch(0.85 0.06 145)" },
  aquario: { icon: "🐟", label: "Aquário", tint: "oklch(0.96 0.04 220)", border: "oklch(0.85 0.06 220)" },
  equipamento: { icon: "⚙️", label: "Equipamento", tint: "oklch(0.96 0.04 60)", border: "oklch(0.85 0.06 60)" },
  acessorio: { icon: "📦", label: "Acessório", tint: "oklch(0.96 0.04 280)", border: "oklch(0.85 0.06 280)" },
  mercado: { icon: "🏪", label: "Mercado · Feira", tint: "oklch(0.96 0.04 30)", border: "oklch(0.85 0.06 30)" },
};

function buildAquarioPrefilledFields(s: Supplier): PrefilledField[] {
  const fields: PrefilledField[] = [
    { label: "Empresa", value: s.name, copyable: true },
    { label: "Nome em Português", value: s.namePortuguese || "—" },
  ];
  if (s.nameChinese) fields.push({ label: "Nome em Chinês", value: s.nameChinese, copyable: true });
  fields.push(
    { label: "Cidade / Província", value: `${s.city}, ${s.province}` },
    { label: "Endereço", value: s.location || "—", copyable: !!s.location, full: true },
  );
  if (s.founded) fields.push({ label: "Fundada em", value: s.founded });
  if (s.companySize) fields.push({ label: "Tamanho da empresa", value: s.companySize });
  if (s.productionCapacity) fields.push({ label: "Capacidade de produção", value: s.productionCapacity, full: true });
  if (s.annualRevenue) fields.push({ label: "Faturamento anual", value: s.annualRevenue });
  if (s.contactPerson) fields.push({ label: "Contato registrado", value: s.contactPerson, copyable: true });
  if (s.email) {
    fields.push({
      label: "E-mail principal",
      value: s.email,
      copyable: true,
      href: `mailto:${s.email}`,
    });
  }
  if (s.phone) fields.push({ label: "Telefone", value: s.phone, copyable: true, href: `tel:${s.phone}` });
  if (s.whatsapp) fields.push({ label: "WhatsApp", value: s.whatsapp, copyable: true });
  if (s.wechat) fields.push({ label: "WeChat", value: s.wechat, copyable: true });
  if (s.website) fields.push({ label: "Site oficial", value: s.website, href: s.website, full: true });
  if (s.alibabaUrl) fields.push({ label: "Alibaba", value: s.alibabaUrl, href: s.alibabaUrl, full: true });
  if (s.priceRange || s.priceRangeFob)
    fields.push({ label: "Faixa de preço", value: s.priceRangeFob || s.priceRange || "—" });
  if (s.moqMin || s.moqDetails)
    fields.push({ label: "MOQ", value: s.moqMin || s.moqDetails || "—" });
  if (s.leadTime) fields.push({ label: "Lead time", value: s.leadTime });
  if (s.paymentTerms) fields.push({ label: "Pagamento", value: s.paymentTerms, full: true });
  if (s.samplePolicy) fields.push({ label: "Política de amostras", value: s.samplePolicy, full: true });
  if (s.languagesSpoken) fields.push({ label: "Idiomas", value: s.languagesSpoken });
  if (s.tradeShowBooth) fields.push({ label: "Feira / Stand", value: s.tradeShowBooth });
  if (s.certifications?.length) fields.push({ label: "Certificações", value: s.certifications.join(", "), full: true });
  if (s.exportMarkets?.length) fields.push({ label: "Mercados de exportação", value: s.exportMarkets.join(", "), full: true });
  if (s.specialties) fields.push({ label: "Especialidades", value: s.specialties, full: true });
  return fields;
}

export default function DiaryCard({ supplier, defaultExpanded = false }: Props) {
  const { getEntry } = useSupplierNotes("aquario");
  const { groups: allGroups } = useSupplierGroups();
  const entry = getEntry(supplier.id);
  const supplierGroups = (entry?.groupIds ?? [])
    .map((gid) => allGroups.find((g) => g.id === gid))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));
  const [expanded, setExpanded] = useState(defaultExpanded || !!entry);

  const cat = categoryStyles[supplier.category];
  const attachments = entry?.attachments ?? [];
  const hasContent =
    (entry?.observacoes?.length ?? 0) > 0 ||
    attachments.length > 0 ||
    (entry && entry.status !== "nao-visitado");

  return (
    <article
      className="card-premium overflow-hidden transition-all duration-300"
      style={{
        background: "var(--card)",
        borderColor: hasContent ? cat.border : "var(--border)",
        borderWidth: hasContent ? "1.5px" : "1px",
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-black/[0.015] transition-colors"
      >
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: cat.tint, border: `1px solid ${cat.border}` }}
          aria-hidden
        >
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="eyebrow px-2 py-0.5 rounded"
              style={{ background: cat.tint, color: "oklch(0.32 0.06 60)", fontSize: "0.6rem" }}
            >
              {cat.label}
            </span>
            {hasContent && (
              <span
                className="eyebrow px-2 py-0.5 rounded inline-flex items-center gap-1"
                style={{
                  background: "oklch(0.95 0.05 50)",
                  color: "oklch(0.45 0.15 50)",
                  fontSize: "0.6rem",
                }}
              >
                <FileText size={10} /> com anotações
              </span>
            )}
            {attachments.length > 0 && (
              <span
                className="eyebrow px-2 py-0.5 rounded inline-flex items-center gap-1"
                style={{
                  background: "oklch(0.95 0.04 220)",
                  color: "oklch(0.4 0.13 220)",
                  fontSize: "0.6rem",
                }}
              >
                <Paperclip size={10} /> {attachments.length}{" "}
                {attachments.length === 1 ? "anexo" : "anexos"}
              </span>
            )}
            {supplierGroups.map((g) => (
              <span
                key={g.id}
                className="eyebrow px-2 py-0.5 rounded inline-flex items-center gap-1"
                style={{
                  background: `${g.color}1f`,
                  color: g.color,
                  border: `1px solid ${g.color}55`,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                }}
                title={g.legend || g.name}
              >
                <span style={{ width: 6, height: 6, borderRadius: 999, background: g.color }} />
                {g.name}
              </span>
            ))}
          </div>
          <h3
            className="font-display font-semibold leading-tight"
            style={{ fontSize: "1.15rem", letterSpacing: "-0.015em" }}
          >
            {supplier.name}
          </h3>
          {supplier.namePortuguese && (
            <p
              className="italic mt-0.5"
              style={{ color: "oklch(0.55 0.012 60)", fontSize: "0.875rem", fontFamily: "var(--font-display)" }}
            >
              {supplier.namePortuguese}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "oklch(0.55 0.012 60)" }}>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {supplier.city}, {supplier.province}
            </span>
            {supplier.founded && (
              <span className="inline-flex items-center gap-1">
                <Building2 size={12} /> Desde {supplier.founded}
              </span>
            )}
            {entry?.updatedAt && (
              <span
                className="inline-flex items-center gap-1"
                style={{ color: "oklch(0.45 0.15 50)" }}
              >
                <Calendar size={12} /> {entry.updatedAt}
              </span>
            )}
          </div>
        </div>
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-transform"
          style={{ background: "oklch(0.96 0.005 60)", color: "oklch(0.45 0.012 60)" }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div
          className="px-5 pb-5 pt-2 border-t"
          style={{ borderColor: "var(--border)", background: "oklch(0.995 0.002 60)" }}
        >
          <SupplierNotesPanel
            scope="aquario"
            supplierId={supplier.id}
            supplierName={supplier.name}
            accent="#dc2626"
            prefilledFields={buildAquarioPrefilledFields(supplier)}
            editableFields={DEFAULT_EDITABLE_FIELDS}
          />
        </div>
      )}
    </article>
  );
}
