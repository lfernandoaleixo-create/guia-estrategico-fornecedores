import { useState, ImgHTMLAttributes } from "react";
import { ImageIcon } from "lucide-react";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackLabel?: string;
  fallbackHint?: string;
  fallbackIcon?: React.ReactNode;
};

/**
 * SafeImage — substitui <img> com fallback visual elegante quando a imagem falha.
 * Mostra um placeholder com gradiente neutro + ícone + label, ao invés do ícone "imagem quebrada" do navegador.
 */
export function SafeImage({
  src,
  alt = "",
  className = "",
  fallbackLabel,
  fallbackHint,
  fallbackIcon,
  style,
  ...rest
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden ${className}`}
        style={{
          background:
            "linear-gradient(135deg, oklch(0.22 0.04 250) 0%, oklch(0.16 0.03 250) 100%)",
          ...style,
        }}
        aria-label={alt || fallbackLabel || "Imagem indisponível"}
      >
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, oklch(0.85 0.12 75) 0%, transparent 60%), radial-gradient(circle at 70% 70%, oklch(0.7 0.15 220) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex flex-col items-center justify-center text-center px-3 py-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
            style={{
              background: "oklch(0.28 0.04 250 / 0.6)",
              border: "1px solid oklch(0.4 0.04 250 / 0.5)",
            }}
          >
            {fallbackIcon ?? (
              <ImageIcon
                className="w-4 h-4"
                style={{ color: "oklch(0.7 0.08 75)" }}
              />
            )}
          </div>
          {(fallbackLabel || alt) && (
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{
                color: "oklch(0.78 0.06 75)",
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.3,
              }}
            >
              {fallbackLabel || alt}
            </div>
          )}
          {fallbackHint && (
            <div
              className="text-[10px] mt-1 opacity-70"
              style={{
                color: "oklch(0.7 0.02 250)",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {fallbackHint}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}

export default SafeImage;
