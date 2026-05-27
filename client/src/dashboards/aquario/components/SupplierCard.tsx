// =============================================================================
// DESIGN: Mercado Oriental Premium — Edição Editorial
// Card com tipografia Fraunces (display) + Inter (UI), hierarquia generosa,
// hover refinado, destaque cromático por categoria
// =============================================================================

import { type Supplier } from "@aquario/data/suppliers";
import { type Note, statusConfig } from "@aquario/hooks/useNotes";
import { MapPin, Globe, Phone, Mail, ArrowUpRight, BadgeCheck, Star } from "lucide-react";

interface Props {
  supplier: Supplier;
  note?: Note;
  onClick: () => void;
}

const categoryConfig: Record<
  string,
  { color: string; bg: string; soft: string; label: string; icon: string }
> = {
  terrario: {
    color: "oklch(0.42 0.13 155)",
    bg: "oklch(0.96 0.04 155)",
    soft: "oklch(0.42 0.13 155 / 0.18)",
    label: "Terrário",
    icon: "🦎",
  },
  aquario: {
    color: "oklch(0.42 0.14 220)",
    bg: "oklch(0.96 0.04 220)",
    soft: "oklch(0.42 0.14 220 / 0.18)",
    label: "Aquário",
    icon: "🐟",
  },
  equipamento: {
    color: "oklch(0.5 0.15 40)",
    bg: "oklch(0.97 0.04 60)",
    soft: "oklch(0.5 0.15 40 / 0.18)",
    label: "Equipamento",
    icon: "⚙️",
  },
  acessorio: {
    color: "oklch(0.5 0.13 290)",
    bg: "oklch(0.97 0.04 290)",
    soft: "oklch(0.5 0.13 290 / 0.18)",
    label: "Acessório",
    icon: "🧰",
  },
  mercado: {
    color: "oklch(0.46 0.20 28)",
    bg: "oklch(0.97 0.04 28)",
    soft: "oklch(0.46 0.20 28 / 0.18)",
    label: "Mercado · Feira",
    icon: "🏪",
  },
};

export default function SupplierCard({ supplier, note, onClick }: Props) {
  const cfg = categoryConfig[supplier.category] || categoryConfig.equipamento;
  const noteCfg = note ? statusConfig[note.status] : null;

  return (
    <button
      onClick={onClick}
      className="card-premium w-full text-left overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        borderLeft: `4px solid ${cfg.color}`,
      }}
    >
      {/* ====== HEADER ====== */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start gap-4">
          {/* Selo circular com ícone */}
          <div
            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-transform group-hover:scale-105"
            style={{
              background: cfg.bg,
              border: `1px solid ${cfg.soft}`,
            }}
          >
            {cfg.icon}
          </div>

          <div className="flex-1 min-w-0">
            {/* Tags / Selos */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: cfg.bg,
                  color: cfg.color,
                  border: `1px solid ${cfg.soft}`,
                  letterSpacing: "0.01em",
                }}
              >
                {cfg.label}
              </span>
              {supplier.verified && (
                <span
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: "oklch(0.42 0.13 155)" }}
                >
                  <BadgeCheck size={13} />
                  Verificado
                </span>
              )}
              {supplier.priority === "high" && (
                <span
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: "oklch(0.55 0.13 75)" }}
                >
                  <Star size={12} fill="currentColor" />
                  Alta Prioridade
                </span>
              )}
              {noteCfg && (
                <span
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: noteCfg.bg, color: noteCfg.color }}
                >
                  {noteCfg.emoji} {noteCfg.label}
                </span>
              )}
            </div>

            {/* Nome principal — Fraunces, maior e mais elegante */}
            <h3
              className="font-display leading-tight line-clamp-2 transition-colors"
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "-0.02em",
              }}
            >
              {supplier.name}
            </h3>

            {(supplier.namePortuguese || supplier.nameChinese) && (
              <p
                className="text-sm mt-1 italic"
                style={{ color: "var(--muted-foreground)" }}
              >
                {supplier.namePortuguese || supplier.nameChinese}
              </p>
            )}

            {/* Localização */}
            <div className="flex items-center gap-2 mt-2.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
              <MapPin size={13} className="flex-shrink-0" />
              <span style={{ letterSpacing: "-0.005em" }}>
                {supplier.city}, {supplier.province}
              </span>
              {supplier.founded && (
                <>
                  <span style={{ color: "var(--border)" }}>·</span>
                  <span className="num-mono text-xs">
                    Desde {supplier.founded}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ====== ESPECIALIDADES ====== */}
      <div className="px-6 pb-4">
        <p
          className="text-sm leading-relaxed line-clamp-3"
          style={{ color: "oklch(0.35 0.012 60)" }}
        >
          {supplier.specialties}
        </p>
        {note?.text && (
          <div
            className="mt-3 px-3 py-2 rounded-md text-sm italic line-clamp-2"
            style={{
              background: "oklch(0.97 0.018 75)",
              border: "1px solid oklch(0.85 0.04 75 / 0.5)",
              color: "oklch(0.35 0.04 75)",
            }}
          >
            <span className="not-italic mr-1">📝</span>
            {note.text}
          </div>
        )}
      </div>

      {/* ====== PRODUTOS DESTAQUE ====== */}
      {supplier.products.length > 0 && (
        <div className="px-6 pb-4">
          <div className="eyebrow mb-2" style={{ color: "var(--muted-foreground)" }}>
            Produtos · {supplier.products.length}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {supplier.products.slice(0, 3).map((p, i) => (
              <span
                key={i}
                className="font-mono text-xs px-2.5 py-1 rounded-md"
                style={{
                  background: "oklch(0.96 0.005 80)",
                  color: "oklch(0.32 0.012 60)",
                  border: "1px solid var(--border)",
                }}
              >
                {p.model}
              </span>
            ))}
            {supplier.products.length > 3 && (
              <span
                className="text-xs px-2.5 py-1 rounded-md font-medium"
                style={{
                  background: "oklch(0.96 0.005 80)",
                  color: "var(--muted-foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                +{supplier.products.length - 3} produtos
              </span>
            )}
          </div>
        </div>
      )}

      {/* ====== FOOTER ====== */}
      <div
        className="px-6 py-3.5 flex items-center justify-between border-t"
        style={{
          background: "oklch(0.985 0.006 80)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center gap-4 text-xs">
          {supplier.website && (
            <div className="flex items-center gap-1.5" style={{ color: "oklch(0.42 0.14 220)" }}>
              <Globe size={13} strokeWidth={2.2} />
              <span className="font-medium">Site</span>
            </div>
          )}
          {(supplier.phone || supplier.whatsapp) && (
            <div className="flex items-center gap-1.5" style={{ color: "oklch(0.42 0.13 155)" }}>
              <Phone size={13} strokeWidth={2.2} />
              <span className="font-medium">Tel · WhatsApp</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-1.5" style={{ color: "oklch(0.5 0.15 40)" }}>
              <Mail size={13} strokeWidth={2.2} />
              <span className="font-medium">E-mail</span>
            </div>
          )}
        </div>
        <div
          className="flex items-center gap-1.5 text-xs font-semibold transition-all group-hover:gap-2.5"
          style={{ color: "var(--primary)", letterSpacing: "-0.005em" }}
        >
          Ver detalhes
          <ArrowUpRight size={14} strokeWidth={2.2} />
        </div>
      </div>
    </button>
  );
}
