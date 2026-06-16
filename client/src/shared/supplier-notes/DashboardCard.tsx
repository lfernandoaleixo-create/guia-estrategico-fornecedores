// =============================================================================
// DashboardCard — card de dashboard da Home (extraído de Home.tsx sem mudar o
// visual). Aceita um `hierLabel` opcional (ex.: "1.1") exibido como badge quando
// o card pertence a um macro.
// =============================================================================
import { useState, type ComponentType } from "react";
import { Link } from "wouter";
import { ArrowRight, Trash2, Palette, Check } from "lucide-react";
import { CARD_COLOR_PALETTE } from "./cardAccent";

export interface DashboardCardData {
  href: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  accentSoft: string;
  accentBg: string;
  accentBorder: string;
  icon: ComponentType<{ className?: string }>;
  chips: string[];
  badge: string;
  groupNumber?: number;
  /** Rótulo hierárquico do macro (ex.: "1.1"). Exibido como badge quando presente. */
  hierLabel?: string;
}

export function DashboardCard({
  d,
  index,
  onDelete,
  deleteTitle,
  onChangeColor,
  currentColor,
}: {
  d: DashboardCardData;
  index: number;
  /** Quando presente, exibe um botão de excluir no canto do card. */
  onDelete?: () => void;
  deleteTitle?: string;
  /** Quando presente, exibe um botão de paleta para trocar a cor do card. */
  onChangeColor?: (color: string) => void;
  /** Cor atual (para marcar a selecionada na paleta). */
  currentColor?: string;
}) {
  const Icon = d.icon;
  const [paletteOpen, setPaletteOpen] = useState(false);
  return (
    <Link href={d.href}>
      <div
        className="capa-anim group cursor-pointer h-full rounded-2xl p-6 md:p-7 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] relative overflow-hidden"
        style={{
          background: "oklch(0.10 0.02 250)",
          border: `1px solid oklch(0.22 0.03 250)`,
          animationDelay: `${0.05 + index * 0.06}s`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.borderColor = d.accentBorder;
          e.currentTarget.style.boxShadow = `0 24px 48px -12px oklch(0 0 0 / 0.5), 0 0 0 1px ${d.accentBorder}, 0 0 60px -10px ${d.accent}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "oklch(0.22 0.03 250)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Glow */}
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${d.accent}, transparent 70%)` }}
        />

        {/* Chinese badge */}
        <div
          className="absolute top-5 right-5 text-3xl select-none opacity-30 group-hover:opacity-50 transition-opacity"
          style={{ fontFamily: "'Fraunces', serif", color: d.accent }}
        >
          {d.badge}
        </div>

        {/* Botão de excluir (opcional) — intercepta o clique para não navegar */}
        {onDelete && (
          <button
            type="button"
            title={deleteTitle ?? "Excluir"}
            aria-label={deleteTitle ?? "Excluir"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-5 left-5 z-10 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              background: "oklch(0.16 0.02 250)",
              border: "1px solid oklch(0.30 0.03 250)",
              color: "oklch(0.70 0.16 25)",
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Botão de trocar cor (opcional) + popover de paleta */}
        {onChangeColor && (
          <div
            className={`absolute top-5 z-20 ${onDelete ? "left-16" : "left-5"}`}
          >
            <button
              type="button"
              title="Trocar cor do card"
              aria-label="Trocar cor do card"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPaletteOpen((v) => !v);
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${paletteOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              style={{
                background: "oklch(0.16 0.02 250)",
                border: "1px solid oklch(0.30 0.03 250)",
                color: d.accent,
              }}
            >
              <Palette className="w-4 h-4" />
            </button>

            {paletteOpen && (
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="absolute top-11 left-0 z-30 p-2.5 rounded-xl grid grid-cols-4 gap-2 shadow-2xl"
                style={{
                  background: "oklch(0.13 0.02 250)",
                  border: "1px solid oklch(0.30 0.03 250)",
                  width: "max-content",
                }}
              >
                {CARD_COLOR_PALETTE.map((c) => {
                  const selected =
                    (currentColor ?? "").toLowerCase() === c.value.toLowerCase();
                  return (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      aria-label={c.label}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChangeColor(c.value);
                        setPaletteOpen(false);
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                      style={{
                        background: c.value,
                        boxShadow: selected
                          ? "0 0 0 2px oklch(0.97 0.01 80), 0 0 0 4px " + c.value
                          : "none",
                      }}
                    >
                      {selected && (
                        <Check
                          className="w-3.5 h-3.5"
                          style={{ color: "oklch(0.10 0.02 250)" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Eyebrow */}
        <div
          className="text-[10px] tracking-[0.25em] font-semibold mb-5"
          style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {d.eyebrow}
        </div>

        {/* Icon + badge hierárquico / grupo */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
            style={{ background: d.accentBg, border: `1px solid ${d.accentBorder}`, color: d.accent }}
          >
            <Icon className="w-5 h-5" />
          </div>
          {d.hierLabel ? (
            <span
              className="text-xs tracking-[0.12em] font-bold px-2.5 py-1 rounded-full"
              style={{
                color: d.accent,
                background: d.accentBg,
                border: `1px solid ${d.accentBorder}`,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              title={`Item ${d.hierLabel}`}
            >
              {d.hierLabel}
            </span>
          ) : (
            typeof d.groupNumber === "number" && (
              <span
                className="text-[10px] tracking-[0.18em] font-bold px-2.5 py-1 rounded-full uppercase"
                style={{
                  color: d.accent,
                  background: d.accentBg,
                  border: `1px solid ${d.accentBorder}`,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                title={`Grupo número ${d.groupNumber}`}
              >
                Grupo · Nº {String(d.groupNumber).padStart(2, "0")}
              </span>
            )
          )}
        </div>

        {/* Title */}
        <h3
          className="mb-2"
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "1.5rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            color: "oklch(0.97 0.01 80)",
          }}
        >
          {d.title}
        </h3>

        {/* Subtitle */}
        <div
          className="text-sm mb-4 font-semibold"
          style={{ color: d.accentSoft, fontFamily: "'Inter', sans-serif", fontStyle: "italic" }}
        >
          {d.subtitle}
        </div>

        {/* Description */}
        <p
          className="text-sm mb-6"
          style={{ color: "oklch(0.88 0.01 80)", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}
        >
          {d.description}
        </p>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {d.chips.map((c) => (
            <span
              key={c}
              className="text-[10px] tracking-wider font-semibold uppercase px-2.5 py-1 rounded-md"
              style={{
                background: d.accentBg,
                color: d.accentSoft,
                border: `1px solid ${d.accentBorder}`,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {c}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: "oklch(0.22 0.03 250)" }}>
          <span
            className="text-xs uppercase tracking-[0.18em] font-bold transition-colors"
            style={{ color: d.accentSoft, fontFamily: "'Inter', sans-serif" }}
          >
            Acessar dashboard
          </span>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 group-hover:translate-x-1"
            style={{ background: d.accentBg, border: `1px solid ${d.accentBorder}`, color: d.accent }}
          >
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}
