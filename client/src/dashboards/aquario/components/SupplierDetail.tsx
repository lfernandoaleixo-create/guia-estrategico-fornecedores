// =============================================================================
// DESIGN: Mercado Oriental Premium
// Painel lateral deslizante com todos os detalhes do fornecedor
// =============================================================================

import { useState } from "react";
import { type Supplier, subCategoryLabels } from "@aquario/data/suppliers";
import NotesPanel from "@aquario/components/NotesPanel";
import ContactChannels from "@aquario/components/ContactChannels";
import { type Note } from "@aquario/hooks/useNotes";
import {
  X,
  Globe,
  Phone,
  Mail,
  MapPin,
  Package,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Factory,
  Award,
  Truck,
  Wrench,
  Tag,
  Star,
  User,
  FileText,
  Sparkles,
  Trophy,
  Languages,
  CalendarCheck,
  Info,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Music2,
  Twitter,
  Copy,
  Check,
} from "lucide-react";

interface Props {
  supplier: Supplier;
  note: Note | undefined;
  onSaveNote: (supplierId: string, text: string, status: Note["status"]) => void;
  onDeleteNote: (supplierId: string) => void;
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  terrario: "oklch(0.35 0.12 160)",
  aquario: "oklch(0.35 0.12 220)",
  equipamento: "oklch(0.45 0.15 40)",
  acessorio: "oklch(0.5 0.1 280)",
  mercado: "oklch(0.45 0.22 25)",
};

export default function SupplierDetail({ supplier, note, onSaveNote, onDeleteNote, onClose }: Props) {
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const borderColor = categoryColors[supplier.category] || "oklch(0.6 0.01 60)";

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <>
      {/* Overlay (apenas área da sidebar) */}
      <div
        className="fixed left-0 top-0 bottom-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease", width: "var(--sidebar-w, 288px)" }}
      />

      {/* Painel: ocupa toda a área à direita da sidebar */}
      <aside
        className="fixed top-0 bottom-0 z-50 flex flex-col overflow-hidden shadow-2xl right-0"
        style={{
          left: "var(--sidebar-w, 288px)",
          background: "var(--background)",
          borderLeft: `4px solid ${borderColor}`,
          animation: "slideInRight 0.32s cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {/* Header do painel */}
        <div
          className="flex-shrink-0 px-8 py-7 border-b"
          style={{
            borderColor: "var(--border)",
            background: "linear-gradient(to bottom, oklch(0.99 0.005 80), oklch(0.985 0.006 80))",
          }}
        >
          <div className="flex items-start gap-5">
            <div
              className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{
                background: `${borderColor}15`,
                border: `1px solid ${borderColor}30`,
                boxShadow: `0 4px 12px ${borderColor}15`,
              }}
            >
              {supplier.category === "terrario" ? "🦎" : supplier.category === "aquario" ? "🐟" : supplier.category === "mercado" ? "🏪" : "⚙️"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="eyebrow mb-2" style={{ color: borderColor }}>
                Ficha do Fornecedor
              </div>
              <h2
                className="font-display leading-tight"
                style={{
                  fontSize: "1.85rem",
                  fontWeight: 700,
                  color: "var(--foreground)",
                  letterSpacing: "-0.025em",
                }}
              >
                {supplier.name}
              </h2>
              {(supplier.namePortuguese || supplier.nameChinese) && (
                <p
                  className="text-base mt-1.5 italic"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {supplier.namePortuguese || supplier.nameChinese}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {supplier.verified && (
                  <span
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: "oklch(0.96 0.04 155)",
                      color: "oklch(0.42 0.13 155)",
                      border: "1px solid oklch(0.42 0.13 155 / 0.2)",
                    }}
                  >
                    <CheckCircle2 size={12} />
                    Verificado
                  </span>
                )}
                {supplier.priority === "high" && (
                  <span
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: "oklch(0.97 0.04 75)",
                      color: "oklch(0.55 0.13 75)",
                      border: "1px solid oklch(0.55 0.13 75 / 0.2)",
                    }}
                  >
                    <Star size={11} fill="currentColor" />
                    Alta Prioridade
                  </span>
                )}
                {supplier.oemOdm && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: "oklch(0.97 0.04 28)",
                      color: "var(--primary)",
                      border: "1px solid oklch(0.46 0.20 28 / 0.2)",
                    }}
                  >
                    OEM/ODM
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2.5 rounded-lg hover:bg-black/5 transition-colors"
              aria-label="Fechar"
            >
              <X size={20} style={{ color: "var(--muted-foreground)" }} />
            </button>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto">
          <div className="detail-multicol">
          {/* Contatos */}
          <Section title="Contatos e Acesso" icon={<Phone size={14} />}>
            <div className="space-y-2">
              {supplier.website && (
                <ContactRow
                  icon={<Globe size={13} />}
                  label="Website"
                  value={supplier.website}
                  href={supplier.website}
                  mono
                />
              )}
              {supplier.alibabaUrl && (
                <ContactRow
                  icon={<ExternalLink size={13} />}
                  label="Alibaba"
                  value="Ver perfil no Alibaba"
                  href={supplier.alibabaUrl}
                />
              )}
              {supplier.madeInChinaUrl && (
                <ContactRow
                  icon={<ExternalLink size={13} />}
                  label="Made-in-China"
                  value="Ver perfil"
                  href={supplier.madeInChinaUrl}
                />
              )}
              {supplier.phone && (
                <ContactRow
                  icon={<Phone size={13} />}
                  label="Telefone"
                  value={supplier.phone}
                  href={`tel:${supplier.phone}`}
                  mono
                />
              )}
              {supplier.whatsapp && (
                <ContactRow
                  icon={<Phone size={13} />}
                  label="WhatsApp"
                  value={supplier.whatsapp}
                  href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, "")}`}
                  mono
                />
              )}
              {supplier.wechat && (
                <ContactRow
                  icon={<Phone size={13} />}
                  label="WeChat"
                  value={supplier.wechat}
                  mono
                />
              )}
              {supplier.email && (
                <ContactRow
                  icon={<Mail size={13} />}
                  label="E-mail"
                  value={supplier.email}
                  href={`mailto:${supplier.email}`}
                  onCopy={() => copyToClipboard(supplier.email!, "email")}
                  copied={copiedField === "email"}
                  mono
                />
              )}
              {supplier.emailsAlt && supplier.emailsAlt.length > 0 && (
                <>
                  {supplier.emailsAlt.map((em, i) => (
                    <ContactRow
                      key={`em-${i}`}
                      icon={<Mail size={13} />}
                      label={`E-mail ${i + 2}`}
                      value={em}
                      href={`mailto:${em}`}
                      onCopy={() => copyToClipboard(em, `em-${i}`)}
                      copied={copiedField === `em-${i}`}
                      mono
                    />
                  ))}
                </>
              )}
              {supplier.contactPerson && (
                <ContactRow
                  icon={<User size={13} />}
                  label="Contato"
                  value={supplier.contactPerson}
                />
              )}
              {supplier.languagesSpoken && (
                <ContactRow
                  icon={<Languages size={13} />}
                  label="Idiomas"
                  value={supplier.languagesSpoken}
                />
              )}
              {supplier.globalSourcesUrl && (
                <ContactRow
                  icon={<ExternalLink size={13} />}
                  label="Global Sources"
                  value="Ver perfil"
                  href={supplier.globalSourcesUrl}
                />
              )}
              {supplier.catalogUrl && (
                <ContactRow
                  icon={<FileText size={13} />}
                  label="Catálogo"
                  value="Baixar PDF"
                  href={supplier.catalogUrl}
                />
              )}
              {supplier.websiteAlt && (
                <ContactRow
                  icon={<Globe size={13} />}
                  label="Website 2"
                  value={supplier.websiteAlt}
                  href={supplier.websiteAlt}
                  mono
                />
              )}
              <ContactRow
                icon={<MapPin size={13} />}
                label="Endereço (resumo)"
                value={supplier.location}
              />
            </div>

            {/* Redes sociais */}
            {supplier.socialMedia && Object.values(supplier.socialMedia).some(Boolean) && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: "oklch(0.93 0.003 80)" }}>
                <span className="text-xs font-medium" style={{ color: "oklch(0.55 0.01 60)" }}>Redes:</span>
                {supplier.socialMedia.facebook && (
                  <a href={supplier.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-black/5 transition-colors" title="Facebook">
                    <Facebook size={14} style={{ color: "#1877F2" }} />
                  </a>
                )}
                {supplier.socialMedia.instagram && (
                  <a href={supplier.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-black/5 transition-colors" title="Instagram">
                    <Instagram size={14} style={{ color: "#E4405F" }} />
                  </a>
                )}
                {supplier.socialMedia.youtube && (
                  <a href={supplier.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-black/5 transition-colors" title="YouTube">
                    <Youtube size={14} style={{ color: "#FF0000" }} />
                  </a>
                )}
                {supplier.socialMedia.linkedin && (
                  <a href={supplier.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-black/5 transition-colors" title="LinkedIn">
                    <Linkedin size={14} style={{ color: "#0A66C2" }} />
                  </a>
                )}
                {supplier.socialMedia.tiktok && (
                  <a href={supplier.socialMedia.tiktok} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-black/5 transition-colors" title="TikTok">
                    <Music2 size={14} style={{ color: "oklch(0.2 0.01 60)" }} />
                  </a>
                )}
                {supplier.socialMedia.twitter && (
                  <a href={supplier.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-black/5 transition-colors" title="Twitter/X">
                    <Twitter size={14} style={{ color: "oklch(0.4 0.01 60)" }} />
                  </a>
                )}
              </div>
            )}
          </Section>

          {/* Canais de contato detalhados (novo bloco enriquecido) */}
          {supplier.contacts && (
            <ContactChannels contacts={supplier.contacts} />
          )}

          {/* Informações da empresa */}
          <Section title="Informações da Empresa" icon={<Factory size={14} />}>
            <div className="grid grid-cols-2 gap-3">
              {supplier.founded && (
                <InfoBox label="Fundada em" value={supplier.founded} />
              )}
              {supplier.companySize && (
                <InfoBox label="Porte" value={supplier.companySize} />
              )}
              {supplier.annualRevenue && (
                <InfoBox label="Faturamento Anual" value={supplier.annualRevenue} />
              )}
              {supplier.productionCapacity && (
                <InfoBox label="Capacidade Produtiva" value={supplier.productionCapacity} />
              )}
              {(supplier.priceRangeFob || supplier.priceRange) && (
                <InfoBox label="Faixa de Preço (FOB)" value={supplier.priceRangeFob || supplier.priceRange!} highlight />
              )}
              {(supplier.moqDetails || supplier.moqMin) && (
                <InfoBox label="MOQ" value={supplier.moqDetails || supplier.moqMin!} />
              )}
              {supplier.paymentTerms && (
                <InfoBox label="Pagamento" value={supplier.paymentTerms} />
              )}
              {supplier.leadTime && (
                <InfoBox label="Lead Time" value={supplier.leadTime} />
              )}
              {supplier.alibabaStatus && (
                <InfoBox label="Status Alibaba" value={supplier.alibabaStatus} />
              )}
              {supplier.samplePolicy && (
                <InfoBox label="Política de Amostras" value={supplier.samplePolicy} />
              )}
            </div>

            {supplier.specialties && (
              <div className="mt-3 p-3 rounded-lg" style={{ background: "oklch(0.97 0.003 80)" }}>
                <p className="text-xs leading-relaxed" style={{ color: "oklch(0.35 0.01 60)" }}>
                  {supplier.specialties}
                </p>
              </div>
            )}
          </Section>

          {/* Subcategorias */}
          {supplier.subCategories.length > 0 && (
            <Section title="Categorias de Produto" icon={<Tag size={14} />}>
              <div className="flex flex-wrap gap-2">
                {supplier.subCategories.map((sc) => (
                  <span
                    key={sc}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{
                      background: `${borderColor}12`,
                      color: borderColor,
                      border: `1px solid ${borderColor}30`,
                    }}
                  >
                    {subCategoryLabels[sc as keyof typeof subCategoryLabels] || sc}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Certificações */}
          {supplier.certifications.length > 0 && (
            <Section title="Certificações" icon={<Award size={14} />}>
              <div className="flex flex-wrap gap-2">
                {supplier.certifications.map((cert) => (
                  <span
                    key={cert}
                    className="text-xs px-2.5 py-1 rounded font-mono font-medium"
                    style={{
                      background: "oklch(0.95 0.003 80)",
                      color: "oklch(0.25 0.01 60)",
                      border: "1px solid oklch(0.88 0.005 80)",
                    }}
                  >
                    {cert}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Mercados de exportação */}
          {supplier.exportMarkets.length > 0 && (
            <Section title="Mercados de Exportação" icon={<Truck size={14} />}>
              <div className="flex flex-wrap gap-1.5">
                {supplier.exportMarkets.map((market) => (
                  <span
                    key={market}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ background: "oklch(0.94 0.004 80)", color: "oklch(0.4 0.01 60)" }}
                  >
                    {market}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* OEM/ODM */}
          {supplier.oemOdm && supplier.oemOdmDetails && (
            <Section title="OEM / ODM" icon={<Wrench size={14} />}>
              <div
                className="p-3 rounded-lg text-xs leading-relaxed"
                style={{
                  background: "oklch(0.45 0.22 25 / 0.06)",
                  color: "oklch(0.3 0.01 60)",
                  border: "1px solid oklch(0.45 0.22 25 / 0.2)",
                }}
              >
                {supplier.oemOdmDetails}
              </div>
            </Section>
          )}

          {/* Diferenciais Competitivos */}
          {supplier.competitiveAdvantages && (
            <Section title="Diferenciais Competitivos" icon={<Trophy size={14} />}>
              <div
                className="p-3 rounded-lg text-xs leading-relaxed"
                style={{
                  background: "oklch(0.55 0.15 60 / 0.06)",
                  color: "oklch(0.3 0.01 60)",
                  border: "1px solid oklch(0.55 0.15 60 / 0.2)",
                }}
              >
                {supplier.competitiveAdvantages}
              </div>
            </Section>
          )}

          {/* Novos Produtos / Lançamentos */}
          {supplier.newProducts && (
            <Section title="Novos Produtos / Lançamentos" icon={<Sparkles size={14} />}>
              <div className="flex flex-wrap gap-1.5">
                {supplier.newProducts.split("|").map((p, i) => p.trim()).filter(Boolean).map((p, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded"
                    style={{
                      background: "oklch(0.96 0.05 100)",
                      color: "oklch(0.3 0.1 80)",
                      border: "1px solid oklch(0.85 0.08 90)",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Stands em Feiras */}
          {supplier.tradeShowBooth && (
            <Section title="Participação em Feiras" icon={<CalendarCheck size={14} />}>
              <div
                className="p-3 rounded-lg text-xs leading-relaxed font-mono"
                style={{
                  background: "oklch(0.95 0.005 220)",
                  color: "oklch(0.25 0.05 220)",
                  border: "1px solid oklch(0.85 0.01 220)",
                }}
              >
                {supplier.tradeShowBooth}
              </div>
            </Section>
          )}

          {/* Notas Adicionais sobre o fornecedor */}
          {supplier.additionalNotes && (
            <Section title="Observações sobre o Fornecedor" icon={<Info size={14} />}>
              <div
                className="p-3 rounded-lg text-xs leading-relaxed"
                style={{
                  background: "oklch(0.97 0.003 80)",
                  color: "oklch(0.3 0.01 60)",
                }}
              >
                {supplier.additionalNotes}
              </div>
            </Section>
          )}

          {/* Catálogo de Produtos */}
          {supplier.products.length > 0 && (
            <Section title={`Catálogo de Produtos (${supplier.products.length})`} icon={<Package size={14} />}>
              <div className="space-y-2">
                {supplier.products.map((product, index) => (
                  <div
                    key={index}
                    className="rounded-lg border overflow-hidden"
                    style={{ borderColor: "oklch(0.9 0.004 80)" }}
                  >
                    <button
                      onClick={() =>
                        setExpandedProduct(expandedProduct === index ? null : index)
                      }
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-black/2 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="text-xs font-semibold font-mono flex-shrink-0"
                          style={{ color: borderColor }}
                        >
                          {product.model}
                        </span>
                        {product.dimensions && (
                          <span
                            className="text-xs truncate"
                            style={{ color: "oklch(0.55 0.01 60)" }}
                          >
                            {product.dimensions}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        {product.fobPrice && product.fobPrice !== "Consultar" && (
                          <span
                            className="text-xs font-semibold font-mono"
                            style={{ color: "oklch(0.35 0.12 160)" }}
                          >
                            {product.fobPrice}
                          </span>
                        )}
                        {expandedProduct === index ? (
                          <ChevronUp size={13} style={{ color: "oklch(0.55 0.01 60)" }} />
                        ) : (
                          <ChevronDown size={13} style={{ color: "oklch(0.55 0.01 60)" }} />
                        )}
                      </div>
                    </button>

                    {expandedProduct === index && (
                      <div
                        className="px-3 pb-3 pt-1 border-t space-y-2"
                        style={{ borderColor: "oklch(0.93 0.003 80)", background: "oklch(0.985 0.003 80)" }}
                      >
                        {product.material && (
                          <div className="flex gap-2">
                            <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: "oklch(0.55 0.01 60)" }}>
                              Material
                            </span>
                            <span className="text-xs" style={{ color: "oklch(0.25 0.01 60)" }}>
                              {product.material}
                            </span>
                          </div>
                        )}
                        {product.features && (
                          <div className="flex gap-2">
                            <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: "oklch(0.55 0.01 60)" }}>
                              Características
                            </span>
                            <span className="text-xs leading-relaxed" style={{ color: "oklch(0.25 0.01 60)" }}>
                              {product.features}
                            </span>
                          </div>
                        )}
                        {product.moq && (
                          <div className="flex gap-2">
                            <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: "oklch(0.55 0.01 60)" }}>
                              MOQ
                            </span>
                            <span className="text-xs font-mono font-semibold" style={{ color: "oklch(0.35 0.15 40)" }}>
                              {product.moq}
                            </span>
                          </div>
                        )}
                        {product.fobPrice && (
                          <div className="flex gap-2">
                            <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: "oklch(0.55 0.01 60)" }}>
                              Preço FOB
                            </span>
                            <span className="text-xs font-mono font-semibold" style={{ color: "oklch(0.35 0.12 160)" }}>
                              {product.fobPrice}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Tags */}
          {supplier.tags.length > 0 && (
            <Section title="Tags" icon={<Tag size={14} />}>
              <div className="flex flex-wrap gap-1.5">
                {supplier.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ background: "oklch(0.94 0.004 80)", color: "oklch(0.45 0.01 60)" }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Notas Pessoais — ocultado: o lugar de anotações agora é Anotações/Diário */}

          </div>
          <div className="h-8" />
        </div>
      </aside>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .detail-multicol > div { break-inside: avoid; page-break-inside: avoid; }
        @media (min-width: 1100px) {
          .detail-multicol { column-count: 2; column-gap: 0; column-fill: balance; }
          .detail-multicol > div { display: inline-block; width: 100%; }
        }
        @media (min-width: 1700px) {
          .detail-multicol { column-count: 3; }
        }
      `}</style>
    </>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-8 py-6 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
          style={{
            background: "oklch(0.97 0.005 80)",
            color: "var(--primary)",
            border: "1px solid var(--border)",
          }}
        >
          {icon}
        </span>
        <h3
          className="font-display"
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "var(--foreground)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
  mono,
  onCopy,
  copied,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  const content = (
    <div className="flex items-start gap-2 py-1">
      <span className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.55 0.01 60)" }}>
        {icon}
      </span>
      <span className="text-xs w-24 flex-shrink-0 font-medium" style={{ color: "oklch(0.55 0.01 60)" }}>
        {label}
      </span>
      <span
        className={`text-xs flex-1 break-all ${mono ? "font-mono" : ""}`}
        style={{ color: href ? "oklch(0.35 0.12 220)" : "oklch(0.25 0.01 60)" }}
      >
        {value}
        {href && <ExternalLink size={10} className="inline ml-1 opacity-60" />}
      </span>
      {onCopy && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCopy();
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
          title="Copiar"
        >
          {copied ? (
            <Check size={11} style={{ color: "oklch(0.5 0.15 145)" }} />
          ) : (
            <Copy size={11} style={{ color: "oklch(0.55 0.01 60)" }} />
          )}
        </button>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:bg-black/2 rounded transition-colors -mx-1 px-1">
        {content}
      </a>
    );
  }
  return <div>{content}</div>;
}

function InfoBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="p-2.5 rounded-lg"
      style={{
        background: highlight ? "oklch(0.35 0.12 160 / 0.08)" : "oklch(0.97 0.003 80)",
        border: highlight ? "1px solid oklch(0.35 0.12 160 / 0.2)" : "1px solid oklch(0.91 0.004 80)",
      }}
    >
      <div className="text-xs mb-0.5" style={{ color: "oklch(0.55 0.01 60)" }}>
        {label}
      </div>
      <div
        className="text-xs font-semibold leading-tight"
        style={{
          color: highlight ? "oklch(0.25 0.12 160)" : "oklch(0.2 0.01 60)",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {value}
      </div>
    </div>
  );
}
