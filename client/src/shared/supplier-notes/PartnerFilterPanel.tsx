// =============================================================================
// PartnerFilterPanel — Filtro GLOBAL por "Parceiro Chinês Responsável" na Home.
//
// Fernando escreve/escolhe o nome de um parceiro (ex.: "Betty"); o painel mostra,
// de forma organizada, TODOS os macros e subgrupos onde aquele parceiro aparece,
// com os fornecedores ligados a ele, os documentos anexados e eventuais
// co-parceiros (outros nomes no mesmo fornecedor). As opções de nome surgem
// automaticamente a partir do que já foi preenchido nos fornecedores.
//
// Tudo client-side via usePartnerFilter (sem novas rotas).
// =============================================================================

import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Search,
  X,
  Users,
  FileText,
  Layers,
  ExternalLink,
  UserCheck,
  Eye,
  Download,
  Link2,
  ChevronRight,
} from "lucide-react";
import { usePartnerFilter } from "./usePartnerFilter";
import { normalizePartner } from "./partners";
import { relatedPartnersOf } from "./partnerAggregation";
import type { PartnerResult, AggNoteAttachment } from "./partnerAggregation";
import type { SupplierAttachment } from "./useSupplierNotes";
import {
  AttachmentLightbox,
  canPreviewAtt,
  downloadAttachment,
} from "./attachmentViewer";

/** Converte o anexo agregado (Home) no formato completo usado pelo visualizador. */
function toSupplierAttachment(att: AggNoteAttachment): SupplierAttachment {
  return {
    id: att.id,
    name: att.name,
    type: att.type ?? "",
    size: att.size ?? 0,
    url: att.url,
    fileKey: att.fileKey,
    dataUrl: att.dataUrl,
    addedAt: att.addedAt ?? "",
    category: att.category as SupplierAttachment["category"],
  };
}

export function PartnerFilterPanel() {
  const { results, suggestions, loading, byPartner } = usePartnerFilter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const queryKey = normalizePartner(query);

  // Parceiros derivados dos fornecedores (preserva grafia; ordena pt-BR).
  const allPartners = useMemo<string[]>(() => {
    const byKey = new Map<string, string>();
    for (const s of suggestions) {
      const k = normalizePartner(s);
      if (k && !byKey.has(k)) byKey.set(k, s);
    }
    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [suggestions]);

  // Sugestões filtradas pelo texto digitado (ou todas, se vazio).
  const filteredSuggestions = useMemo(() => {
    if (!queryKey) return allPartners;
    return allPartners.filter((s) => normalizePartner(s).includes(queryKey));
  }, [allPartners, queryKey]);

  const result: PartnerResult | null = selected ? byPartner(selected) : null;

  // Co-parceiros relacionados: todos os outros nomes que dividem ao menos um
  // fornecedor com o parceiro selecionado (relação derivada do mesmo fornecedor).
  const relatedPartners = useMemo<string[]>(() => relatedPartnersOf(result), [result]);

  // Anexo aberto no visualizador (lightbox) — direto da Home.
  const [viewing, setViewing] = useState<SupplierAttachment | null>(null);

  const choose = (name: string) => {
    setSelected(name);
    setQuery(name);
    setOpen(false);
    inputRef.current?.blur();
  };

  const clear = () => {
    setSelected(null);
    setQuery("");
    setOpen(false);
  };

  return (
    <section className="relative z-10 container pb-4">
      <div
        className="rounded-2xl border p-5 md:p-6"
        style={{
          borderColor: "oklch(0.78 0.16 300 / 0.35)",
          background:
            "linear-gradient(180deg, oklch(0.78 0.16 300 / 0.08), oklch(0.10 0.02 250 / 0.2))",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "oklch(0.78 0.16 300 / 0.16)",
              border: "1px solid oklch(0.78 0.16 300 / 0.5)",
              color: "oklch(0.82 0.14 300)",
            }}
          >
            <Users className="w-4.5 h-4.5" />
          </span>
          <div>
            <div
              className="text-[10px] tracking-[0.22em] uppercase font-semibold"
              style={{ color: "oklch(0.62 0.02 80)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              Filtro por parceiro chinês
            </div>
            <h3
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1.25rem",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "oklch(0.97 0.01 80)",
                lineHeight: 1.1,
              }}
            >
              Onde cada parceiro está envolvido
            </h3>
          </div>
        </div>

        {/* Campo de busca com autocomplete */}
        <div className="relative max-w-xl">
          <div
            className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5"
            style={{
              borderColor: "oklch(0.3 0.02 250)",
              background: "oklch(0.10 0.02 250)",
            }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.6 0.02 80)" }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                if (selected) setSelected(null);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim() && filteredSuggestions.length > 0) {
                  e.preventDefault();
                  choose(filteredSuggestions[0]);
                }
              }}
              placeholder="Digite ou escolha um parceiro (ex.: Betty)"
              className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
              style={{ color: "oklch(0.95 0.01 80)" }}
            />
            {query && (
              <button
                type="button"
                onClick={clear}
                aria-label="Limpar filtro"
                className="inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors active:scale-[0.9]"
                style={{ color: "oklch(0.7 0.02 80)" }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdown de sugestões */}
          {open && filteredSuggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 mt-2 rounded-xl border overflow-hidden z-20 max-h-64 overflow-y-auto"
              style={{
                borderColor: "oklch(0.3 0.02 250)",
                background: "oklch(0.12 0.02 250)",
                boxShadow: "0 12px 32px oklch(0 0 0 / 0.4)",
              }}
            >
              {filteredSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(s);
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-sm transition-colors hover:brightness-125"
                  style={{ color: "oklch(0.92 0.01 80)" }}
                >
                  <UserCheck className="w-3.5 h-3.5" style={{ color: "oklch(0.82 0.14 300)" }} />
                  {s}
                </button>
              ))}
            </div>
          )}

          {open && filteredSuggestions.length === 0 && (
            <div
              className="absolute left-0 right-0 mt-2 rounded-xl border overflow-hidden z-20"
              style={{
                borderColor: "oklch(0.3 0.02 250)",
                background: "oklch(0.12 0.02 250)",
                boxShadow: "0 12px 32px oklch(0 0 0 / 0.4)",
              }}
            >
              <div
                className="px-3.5 py-3 text-sm"
                style={{ color: "oklch(0.6 0.02 80)" }}
              >
                {loading
                  ? "Carregando parceiros…"
                  : allPartners.length === 0
                    ? "Nenhum parceiro cadastrado nos fornecedores ainda."
                    : "Nenhum parceiro corresponde à busca."}
              </div>
            </div>
          )}
        </div>

        {/* Chips de acesso rápido (apenas selecionam o parceiro) */}
        {!selected && allPartners.length > 0 && allPartners.length <= 24 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {allPartners.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => choose(s)}
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-transform hover:brightness-125 active:scale-[0.97]"
                style={{
                  borderColor: "oklch(0.78 0.16 300 / 0.4)",
                  background: "oklch(0.78 0.16 300 / 0.08)",
                  color: "oklch(0.85 0.12 300)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Parceiros relacionados (dividem o mesmo fornecedor) */}
        {selected && relatedPartners.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-4">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide mr-1"
              style={{ color: "oklch(0.6 0.02 80)" }}
            >
              <Link2 className="w-3.5 h-3.5" style={{ color: "oklch(0.82 0.14 300)" }} />
              Relacionados:
            </span>
            {relatedPartners.map((cp) => (
              <button
                key={cp}
                type="button"
                onClick={() => choose(cp)}
                title={`${cp} divide fornecedor com ${selected}`}
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-transform hover:brightness-125 active:scale-[0.97]"
                style={{
                  borderColor: "oklch(0.82 0.14 300 / 0.5)",
                  background: "oklch(0.82 0.14 300 / 0.12)",
                  color: "oklch(0.88 0.12 300)",
                }}
              >
                {cp}
              </button>
            ))}
          </div>
        )}

        {/* Resultados */}
        {selected && (
          <div className="mt-5">
            {!result || result.macros.length === 0 ? (
              <div
                className="rounded-xl border px-4 py-5 text-sm"
                style={{
                  borderColor: "oklch(0.3 0.02 250)",
                  background: "oklch(0.10 0.02 250)",
                  color: "oklch(0.7 0.02 80)",
                }}
              >
                Nenhum fornecedor vinculado a <strong>{selected}</strong> ainda.
              </div>
            ) : (
              <PartnerResultTree result={result} onView={setViewing} />
            )}
          </div>
        )}
      </div>

      {/* Visualizador de documentos — abre direto na Home, sem trocar de página */}
      <AttachmentLightbox attachment={viewing} onClose={() => setViewing(null)} />
    </section>
  );
}

function PartnerResultTree({
  result,
  onView,
}: {
  result: PartnerResult;
  onView: (att: SupplierAttachment) => void;
}) {
  // Documentos de cada fornecedor RECOLHIDOS por padrão (evita poluir a tela
  // quando o fornecedor tem dezenas de anexos). Chave: `${scope}:${supplierId}`.
  const [openDocs, setOpenDocs] = useState<Set<string>>(() => new Set());
  const toggleDocs = (key: string) =>
    setOpenDocs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div>
      {/* Resumo */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
          style={{
            background: "oklch(0.78 0.16 300 / 0.16)",
            border: "1px solid oklch(0.78 0.16 300 / 0.5)",
            color: "oklch(0.85 0.12 300)",
          }}
        >
          <UserCheck className="w-3.5 h-3.5" /> {result.displayName}
        </span>
        <span
          className="text-xs"
          style={{ color: "oklch(0.62 0.02 80)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {result.supplierCount} fornecedor{result.supplierCount === 1 ? "" : "es"} ·{" "}
          {result.macros.length} macro{result.macros.length === 1 ? "" : "s"} ·{" "}
          {result.attachmentCount} documento{result.attachmentCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-4">
        {result.macros.map((m) => (
          <div
            key={m.macroId}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: `${m.macroColor}55`, background: "oklch(0.09 0.02 250)" }}
          >
            {/* Cabeçalho do macro */}
            <div
              className="flex items-center gap-2.5 px-4 py-3"
              style={{ background: `${m.macroColor}14`, borderBottom: `1px solid ${m.macroColor}33` }}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold flex-shrink-0"
                style={{
                  background: `${m.macroColor}22`,
                  border: `1px solid ${m.macroColor}88`,
                  color: m.macroColor,
                  fontFamily: "'Fraunces', serif",
                }}
              >
                {m.macroNumber}
              </span>
              <span
                className="font-semibold"
                style={{ color: "oklch(0.95 0.01 80)", fontFamily: "'Fraunces', serif", letterSpacing: "-0.01em" }}
              >
                {m.macroName}
              </span>
              <span
                className="text-[11px] ml-auto"
                style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {m.supplierCount} fornec.
              </span>
            </div>

            {/* Subgrupos */}
            <div className="p-3 space-y-3">
              {m.subgroups.map((sg) => (
                <div key={sg.subgroupId ?? "none"}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Layers className="w-3.5 h-3.5 flex-shrink-0" style={{ color: sg.color }} />
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: sg.color }}
                    >
                      {sg.label}
                    </span>
                  </div>

                  {/* Fornecedores */}
                  <div className="space-y-1.5 pl-5">
                    {sg.suppliers.map((s) => (
                      <div
                        key={`${s.scope}:${s.supplierId}`}
                        className="rounded-lg border px-3 py-2.5"
                        style={{
                          borderColor: "oklch(0.25 0.02 250)",
                          background: "oklch(0.11 0.02 250)",
                        }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={s.href}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:underline"
                            style={{ color: "oklch(0.92 0.01 80)" }}
                          >
                            {s.supplierName}
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </Link>

                          {/* Co-parceiros */}
                          {s.coPartners.length > 0 && (
                            <span className="inline-flex items-center gap-1 flex-wrap">
                              {s.coPartners.map((cp) => (
                                <span
                                  key={cp}
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                  style={{
                                    background: "oklch(0.7 0.12 145 / 0.16)",
                                    border: "1px solid oklch(0.7 0.12 145 / 0.45)",
                                    color: "oklch(0.82 0.13 145)",
                                  }}
                                  title="Também responsável por este fornecedor"
                                >
                                  + {cp}
                                </span>
                              ))}
                            </span>
                          )}

                          {s.attachments.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleDocs(`${s.scope}:${s.supplierId}`)}
                              className="text-[10px] ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-transform active:scale-95 hover:brightness-125"
                              style={{ color: "oklch(0.7 0.02 80)", fontFamily: "'JetBrains Mono', monospace", background: "oklch(0.18 0.02 250)" }}
                              aria-expanded={openDocs.has(`${s.scope}:${s.supplierId}`)}
                              title={openDocs.has(`${s.scope}:${s.supplierId}`) ? "Recolher documentos" : "Ver documentos"}
                            >
                              <ChevronRight
                                className="w-3 h-3 transition-transform duration-200"
                                style={{ transform: openDocs.has(`${s.scope}:${s.supplierId}`) ? "rotate(90deg)" : "none" }}
                              />
                              {s.attachments.length} doc{s.attachments.length === 1 ? "" : "s"}
                            </button>
                          ) : (
                            <span
                              className="text-[10px] ml-auto"
                              style={{ color: "oklch(0.5 0.02 80)", fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              0 docs
                            </span>
                          )}
                        </div>

                        {/* Documentos — recolhidos por padrão; expandem ao clicar no contador. */}
                        {s.attachments.length > 0 && openDocs.has(`${s.scope}:${s.supplierId}`) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {s.attachments.map((att) => {
                              const full = toSupplierAttachment(att);
                              const previewable = canPreviewAtt(full);
                              return (
                                <span
                                  key={att.id}
                                  className="group inline-flex items-center gap-1 rounded-md pl-2 pr-1 py-1 text-[11px] font-medium border"
                                  style={{
                                    borderColor: "oklch(0.3 0.02 250)",
                                    background: "oklch(0.14 0.02 250)",
                                    color: "oklch(0.8 0.02 80)",
                                  }}
                                >
                                  <FileText className="w-3 h-3 flex-shrink-0" style={{ color: "oklch(0.78 0.16 75)" }} />
                                  <span className="max-w-[150px] truncate">{att.name}</span>
                                  {previewable && (
                                    <button
                                      type="button"
                                      onClick={() => onView(full)}
                                      title="Visualizar documento"
                                      aria-label={`Visualizar ${att.name}`}
                                      className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded transition-colors hover:brightness-150 active:scale-[0.9]"
                                      style={{ background: "oklch(0.78 0.16 300 / 0.18)", color: "oklch(0.85 0.12 300)" }}
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => void downloadAttachment(full)}
                                    title="Baixar documento"
                                    aria-label={`Baixar ${att.name}`}
                                    className="inline-flex items-center justify-center w-5 h-5 rounded transition-colors hover:brightness-150 active:scale-[0.9]"
                                    style={{ background: "oklch(0.78 0.16 75 / 0.18)", color: "oklch(0.82 0.14 75)" }}
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PartnerFilterPanel;
