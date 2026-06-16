// =============================================================================
// CustomSupplierFormDialog — modal de cadastro/edição de fornecedor manual
// Suporta múltiplos telefones, e-mails e links (dinâmicos).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import {
  type CustomSupplier,
  type CustomSupplierContact,
  type SupplierScope,
  genContactId,
} from "./useCustomSuppliers";
import { SubgroupPicker } from "./SubgroupPicker";

interface Props {
  open: boolean;
  scope: SupplierScope;
  initial?: CustomSupplier | null;
  tone?: "dark" | "light";
  onClose: () => void;
  onSubmit: (data: Omit<CustomSupplier, "id" | "scope" | "createdAt" | "updatedAt">) => Promise<void> | void;
  /**
   * Subgrupo selecionado para este fornecedor (modelo macro.sub). O vínculo é
   * persistido na NOTA pelo componente pai. Quando definido, exibe o seletor.
   */
  enableSubgroup?: boolean;
  subgroupId?: string | null;
  onSubgroupChange?: (id: string | null) => void;
}

interface FormState {
  name: string;
  chineseName: string;
  category: string;
  ncm: string;

  city: string;
  province: string;
  district: string;
  floor: string;
  gate: string;
  address: string;

  phones: CustomSupplierContact[];
  emails: CustomSupplierContact[];
  links: CustomSupplierContact[];

  contactName: string;
  contactRole: string;
  contactLanguage: string;

  moq: string;
  priceFob: string;
  leadTime: string;
  paymentTerms: string;
  incoterm: string;
  notes: string;
  groupIds: string[];
}

function emptyState(): FormState {
  return {
    name: "",
    chineseName: "",
    category: "",
    ncm: "",
    city: "",
    province: "",
    district: "",
    floor: "",
    gate: "",
    address: "",
    phones: [{ id: genContactId(), label: "", value: "" }],
    emails: [{ id: genContactId(), label: "", value: "" }],
    links: [{ id: genContactId(), label: "", value: "" }],
    contactName: "",
    contactRole: "",
    contactLanguage: "",
    moq: "",
    priceFob: "",
    leadTime: "",
    paymentTerms: "",
    incoterm: "",
    notes: "",
    groupIds: [],
  };
}

function fromSupplier(s: CustomSupplier): FormState {
  return {
    name: s.name ?? "",
    chineseName: s.chineseName ?? "",
    category: s.category ?? "",
    ncm: s.ncm ?? "",
    city: s.city ?? "",
    province: s.province ?? "",
    district: s.district ?? "",
    floor: s.floor ?? "",
    gate: s.gate ?? "",
    address: s.address ?? "",
    phones: s.phones.length > 0 ? s.phones : [{ id: genContactId(), label: "", value: "" }],
    emails: s.emails.length > 0 ? s.emails : [{ id: genContactId(), label: "", value: "" }],
    links: s.links.length > 0 ? s.links : [{ id: genContactId(), label: "", value: "" }],
    contactName: s.contactName ?? "",
    contactRole: s.contactRole ?? "",
    contactLanguage: s.contactLanguage ?? "",
    moq: s.moq ?? "",
    priceFob: s.priceFob ?? "",
    leadTime: s.leadTime ?? "",
    paymentTerms: s.paymentTerms ?? "",
    incoterm: s.incoterm ?? "",
    notes: s.notes ?? "",
    groupIds: s.groupIds ?? [],
  };
}

export default function CustomSupplierFormDialog({
  open,
  scope,
  initial,
  tone = "dark",
  onClose,
  onSubmit,
  enableSubgroup = false,
  subgroupId = null,
  onSubgroupChange,
}: Props) {
  // Estado local do subgrupo (espelha a prop; persistência fica no pai).
  const [localSubgroupId, setLocalSubgroupId] = useState<string | null>(subgroupId);
  const [state, setState] = useState<FormState>(emptyState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setState(initial ? fromSupplier(initial) : emptyState());
      setLocalSubgroupId(subgroupId ?? null);
      setError(null);
    }
  }, [open, initial, subgroupId]);

  const isDark = tone === "dark";

  const palette = useMemo(
    () => ({
      backdrop: isDark ? "bg-black/70" : "bg-black/40",
      panel: isDark
        ? "bg-zinc-950 border border-white/10 text-zinc-100"
        : "bg-white border border-zinc-200 text-zinc-900",
      sectionTitle: isDark ? "text-amber-300" : "text-zinc-900",
      label: isDark ? "text-white/70" : "text-zinc-600",
      input: isDark
        ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-400/60"
        : "bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-700",
      buttonPrimary: isDark
        ? "bg-amber-500 hover:bg-amber-400 text-zinc-950"
        : "bg-zinc-900 hover:bg-zinc-800 text-white",
      buttonSecondary: isDark
        ? "bg-white/10 hover:bg-white/15 text-white border border-white/15"
        : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200",
      buttonGhost: isDark
        ? "text-white/60 hover:text-white"
        : "text-zinc-500 hover:text-zinc-900",
      divider: isDark ? "border-white/10" : "border-zinc-200",
    }),
    [isDark]
  );

  if (!open) return null;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function updateContact(
    list: "phones" | "emails" | "links",
    id: string,
    patch: Partial<CustomSupplierContact>
  ) {
    setState((s) => ({
      ...s,
      [list]: s[list].map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }
  function addContact(list: "phones" | "emails" | "links") {
    setState((s) => ({
      ...s,
      [list]: [...s[list], { id: genContactId(), label: "", value: "" }],
    }));
  }
  function removeContact(list: "phones" | "emails" | "links", id: string) {
    setState((s) => ({
      ...s,
      [list]: s[list].filter((c) => c.id !== id),
    }));
  }

  function cleanContacts(list: CustomSupplierContact[]): CustomSupplierContact[] {
    return list.filter((c) => c.value.trim().length > 0);
  }

  async function handleSubmit() {
    setError(null);
    if (!state.name.trim()) {
      setError("Informe o nome do fornecedor.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: state.name.trim(),
        chineseName: state.chineseName.trim() || undefined,
        category: state.category.trim() || undefined,
        ncm: state.ncm.trim() || undefined,
        city: state.city.trim() || undefined,
        province: state.province.trim() || undefined,
        district: state.district.trim() || undefined,
        floor: state.floor.trim() || undefined,
        gate: state.gate.trim() || undefined,
        address: state.address.trim() || undefined,
        phones: cleanContacts(state.phones),
        emails: cleanContacts(state.emails),
        links: cleanContacts(state.links),
        contactName: state.contactName.trim() || undefined,
        contactRole: state.contactRole.trim() || undefined,
        contactLanguage: state.contactLanguage.trim() || undefined,
        moq: state.moq.trim() || undefined,
        priceFob: state.priceFob.trim() || undefined,
        leadTime: state.leadTime.trim() || undefined,
        paymentTerms: state.paymentTerms.trim() || undefined,
        incoterm: state.incoterm.trim() || undefined,
        notes: state.notes.trim() || undefined,
        groupIds: state.groupIds.length > 0 ? state.groupIds : undefined,
      });
      onClose();
    } catch (e) {
      setError(`Falha ao salvar: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  const scopeLabel = scope === "aquario" ? "Aquário" : scope === "tapete" ? "Tapete" : "Yiwu";

  return (
    <div
      className={`fixed inset-0 z-[100] ${palette.backdrop} flex items-start sm:items-center justify-center p-2 sm:p-6 overflow-y-auto`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-3xl ${palette.panel} rounded-2xl shadow-2xl my-4`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b ${palette.divider}`}>
          <div>
            <p className={`text-[11px] uppercase tracking-[0.2em] font-semibold ${palette.label}`}>
              {initial ? "Editar fornecedor" : "Cadastrar novo fornecedor"} · {scopeLabel}
            </p>
            <h2 className="text-xl font-bold mt-1">
              {initial?.name ? initial.name : "Novo fornecedor manual"}
            </h2>
            <p className={`text-xs mt-1 ${palette.label}`}>
              Preencha os campos relevantes. Você pode adicionar quantos telefones, e-mails e links
              forem necessários.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`text-2xl leading-none ${palette.buttonGhost}`}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Identificação */}
          <Section title="Identificação" palette={palette}>
            <Grid>
              <FieldText
                label="Nome do fornecedor *"
                value={state.name}
                onChange={(v) => setField("name", v)}
                placeholder="Ex.: Yiwu Hongchen Co., Ltd."
                palette={palette}
                required
              />
              <FieldText
                label="Nome em chinês"
                value={state.chineseName}
                onChange={(v) => setField("chineseName", v)}
                placeholder="义乌洪臣有限公司"
                palette={palette}
              />
              <FieldText
                label="Categoria / Setor"
                value={state.category}
                onChange={(v) => setField("category", v)}
                placeholder="Ex.: Vidraria, Aquário, Tapete…"
                palette={palette}
              />
              <FieldText
                label="NCM (se souber)"
                value={state.ncm}
                onChange={(v) => setField("ncm", v)}
                placeholder="Ex.: 7013.49.00"
                palette={palette}
              />
            </Grid>
          </Section>

          {/* Subgrupo (modelo macro.sub) */}
          {enableSubgroup && (
            <Section title="Subgrupo (classificação macro.sub)" palette={palette}>
              <p className={`text-xs mb-2 ${palette.label}`}>
                Escolha o subgrupo deste fornecedor (ex.: 1.1 - Terrário, 1.2 -
                Aquário) ou crie um novo digitando o número livremente. O número
                antes do ponto deve corresponder a um MACRO já criado na página
                inicial.
              </p>
              <SubgroupPicker
                tone={isDark ? "dark" : "light"}
                selectedId={localSubgroupId}
                onChange={(id) => {
                  setLocalSubgroupId(id);
                  onSubgroupChange?.(id);
                }}
              />
            </Section>
          )}

          {/* Localização */}
          <Section title="Localização" palette={palette}>
            <Grid>
              <FieldText
                label="Cidade"
                value={state.city}
                onChange={(v) => setField("city", v)}
                placeholder="Ex.: Yiwu / Jiaxing / Tianjin"
                palette={palette}
              />
              <FieldText
                label="Província"
                value={state.province}
                onChange={(v) => setField("province", v)}
                placeholder="Ex.: Zhejiang / Hebei"
                palette={palette}
              />
              <FieldText
                label="Distrito"
                value={state.district}
                onChange={(v) => setField("district", v)}
                placeholder="Ex.: D4"
                palette={palette}
              />
              <FieldText
                label="Andar"
                value={state.floor}
                onChange={(v) => setField("floor", v)}
                placeholder="Ex.: 2º andar"
                palette={palette}
              />
              <FieldText
                label="Portão / Booth"
                value={state.gate}
                onChange={(v) => setField("gate", v)}
                placeholder="Ex.: 75"
                palette={palette}
              />
              <FieldText
                label="Endereço completo"
                value={state.address}
                onChange={(v) => setField("address", v)}
                placeholder="Rua, número, bairro, código postal"
                palette={palette}
                fullWidth
              />
            </Grid>
          </Section>

          {/* Múltiplos contatos */}
          <Section title="Telefones / WhatsApp / WeChat" palette={palette}>
            {state.phones.map((c, i) => (
              <ContactRow
                key={c.id}
                contact={c}
                index={i}
                placeholder="+86 139 0000 0000"
                onChange={(p) => updateContact("phones", c.id, p)}
                onRemove={() => removeContact("phones", c.id)}
                palette={palette}
                labelPlaceholder="Ex.: WhatsApp, WeChat, Fixo, Mr. Wang"
              />
            ))}
            <button
              type="button"
              onClick={() => addContact("phones")}
              className={`text-xs px-3 py-1.5 rounded-lg ${palette.buttonSecondary}`}
            >
              + Adicionar telefone
            </button>
          </Section>

          <Section title="E-mails" palette={palette}>
            {state.emails.map((c, i) => (
              <ContactRow
                key={c.id}
                contact={c}
                index={i}
                placeholder="contato@empresa.com"
                onChange={(p) => updateContact("emails", c.id, p)}
                onRemove={() => removeContact("emails", c.id)}
                palette={palette}
                labelPlaceholder="Ex.: Comercial, Vendas, Mr. Wang"
              />
            ))}
            <button
              type="button"
              onClick={() => addContact("emails")}
              className={`text-xs px-3 py-1.5 rounded-lg ${palette.buttonSecondary}`}
            >
              + Adicionar e-mail
            </button>
          </Section>

          <Section title="Sites / Links / Redes" palette={palette}>
            {state.links.map((c, i) => (
              <ContactRow
                key={c.id}
                contact={c}
                index={i}
                placeholder="https://"
                onChange={(p) => updateContact("links", c.id, p)}
                onRemove={() => removeContact("links", c.id)}
                palette={palette}
                labelPlaceholder="Ex.: Alibaba, Yiwugo, Site, Instagram"
              />
            ))}
            <button
              type="button"
              onClick={() => addContact("links")}
              className={`text-xs px-3 py-1.5 rounded-lg ${palette.buttonSecondary}`}
            >
              + Adicionar link
            </button>
          </Section>

          {/* Contato principal */}
          <Section title="Pessoa de Contato Principal" palette={palette}>
            <Grid>
              <FieldText
                label="Nome do responsável"
                value={state.contactName}
                onChange={(v) => setField("contactName", v)}
                placeholder="Ex.: Mr. Wang"
                palette={palette}
              />
              <FieldText
                label="Cargo / Função"
                value={state.contactRole}
                onChange={(v) => setField("contactRole", v)}
                placeholder="Ex.: Sales Manager"
                palette={palette}
              />
              <FieldText
                label="Idioma preferido"
                value={state.contactLanguage}
                onChange={(v) => setField("contactLanguage", v)}
                placeholder="Inglês / Mandarim / Português"
                palette={palette}
              />
            </Grid>
          </Section>

          {/* Negociação */}
          <Section title="Condições de Negociação" palette={palette}>
            <Grid>
              <FieldText
                label="MOQ"
                value={state.moq}
                onChange={(v) => setField("moq", v)}
                placeholder="Ex.: 500 un."
                palette={palette}
              />
              <FieldText
                label="Preço FOB"
                value={state.priceFob}
                onChange={(v) => setField("priceFob", v)}
                placeholder="Ex.: USD 1.20 / un."
                palette={palette}
              />
              <FieldText
                label="Lead time"
                value={state.leadTime}
                onChange={(v) => setField("leadTime", v)}
                placeholder="Ex.: 30 dias"
                palette={palette}
              />
              <FieldText
                label="Forma de pagamento"
                value={state.paymentTerms}
                onChange={(v) => setField("paymentTerms", v)}
                placeholder="Ex.: 30% TT antes, 70% contra B/L"
                palette={palette}
              />
              <FieldText
                label="Incoterm"
                value={state.incoterm}
                onChange={(v) => setField("incoterm", v)}
                placeholder="Ex.: FOB Ningbo"
                palette={palette}
              />
            </Grid>
          </Section>

          {/* Observações */}
          <Section title="Observações gerais" palette={palette}>
            <textarea
              rows={4}
              value={state.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Comentários, particularidades, histórico inicial…"
              className={`w-full rounded-lg border px-3 py-2 text-sm leading-relaxed ${palette.input}`}
            />
          </Section>

          {error && (
            <p className={isDark ? "text-rose-300 text-xs" : "text-rose-700 text-xs"}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t ${palette.divider}`}>
          <button type="button" onClick={onClose} className={`text-sm ${palette.buttonGhost}`}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className={`text-sm font-semibold px-4 py-2 rounded-lg ${palette.buttonPrimary} disabled:opacity-60`}
          >
            {saving ? "Salvando…" : initial ? "Salvar alterações" : "Cadastrar fornecedor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────
type Palette = {
  sectionTitle: string;
  label: string;
  input: string;
  buttonSecondary: string;
  buttonGhost: string;
  divider: string;
};

function Section({
  title,
  children,
  palette,
}: {
  title: string;
  children: React.ReactNode;
  palette: Palette;
}) {
  return (
    <div>
      <h3 className={`text-[11px] uppercase tracking-[0.18em] font-semibold mb-2 ${palette.sectionTitle}`}>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>;
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
  palette,
  fullWidth,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  palette: Palette;
  fullWidth?: boolean;
  required?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${fullWidth ? "sm:col-span-2" : ""}`}>
      <span className={`text-[11px] uppercase tracking-wide ${palette.label}`}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-lg border px-3 py-2 text-sm ${palette.input}`}
      />
    </label>
  );
}

function ContactRow({
  contact,
  index,
  placeholder,
  labelPlaceholder,
  onChange,
  onRemove,
  palette,
}: {
  contact: CustomSupplierContact;
  index: number;
  placeholder: string;
  labelPlaceholder: string;
  onChange: (p: Partial<CustomSupplierContact>) => void;
  onRemove: () => void;
  palette: Palette;
}) {
  return (
    <div className="flex gap-2 items-stretch">
      <input
        type="text"
        value={contact.label ?? ""}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder={labelPlaceholder}
        className={`w-40 rounded-lg border px-3 py-2 text-xs ${palette.input}`}
        aria-label={`Rótulo do contato ${index + 1}`}
      />
      <input
        type="text"
        value={contact.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder={placeholder}
        className={`flex-1 rounded-lg border px-3 py-2 text-sm ${palette.input}`}
        aria-label={`Valor do contato ${index + 1}`}
      />
      <button
        type="button"
        onClick={onRemove}
        className={`text-xs px-2 ${palette.buttonGhost}`}
        aria-label="Remover contato"
      >
        ✕
      </button>
    </div>
  );
}
