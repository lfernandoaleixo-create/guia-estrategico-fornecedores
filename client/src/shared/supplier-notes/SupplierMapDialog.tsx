// =============================================================================
// SupplierMapDialog — modal que mostra a localização de um fornecedor na China
// a partir do seu endereço textual (geocoding). Oferece dois modos:
//   - "Mapa" (roadmap) — visão principal.
//   - "Satélite" (hybrid) — visão secundária com rótulos.
//
// Usa o MapView (proxy Google Maps já autenticado). O geocoding roda no
// onMapReady; se falhar, mostra um aviso e um link para o Google Maps externo.
// =============================================================================
import { useRef, useState } from "react";
import { X, Map as MapIcon, Satellite, ExternalLink, MapPin } from "lucide-react";
import { MapView } from "@/components/Map";

interface SupplierMapDialogProps {
  open: boolean;
  onClose: () => void;
  name: string;
  address: string;
}

export default function SupplierMapDialog({
  open,
  onClose,
  name,
  address,
}: SupplierMapDialogProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  const [mode, setMode] = useState<"roadmap" | "hybrid">("roadmap");
  const [geoError, setGeoError] = useState(false);

  // Garante foco na China mesmo se o geocoding falhar.
  const CHINA_CENTER = { lat: 34.0479, lng: 100.6197 };

  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address || name,
  )}`;

  function setMapMode(next: "roadmap" | "hybrid") {
    setMode(next);
    if (mapRef.current) mapRef.current.setMapTypeId(next);
  }

  function handleMapReady(map: google.maps.Map) {
    mapRef.current = map;
    map.setMapTypeId(mode);

    const query = (address || name || "").trim();
    if (!query) {
      setGeoError(true);
      return;
    }

    try {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode(
        { address: query, region: "cn" },
        (results, status) => {
          if (status === "OK" && results && results[0]) {
            const loc = results[0].geometry.location;
            map.setCenter(loc);
            map.setZoom(15);
            if (markerRef.current) markerRef.current.map = null;
            markerRef.current = new google.maps.marker.AdvancedMarkerElement({
              map,
              position: loc,
              title: name,
            });
          } else {
            setGeoError(true);
          }
        },
      );
    } catch {
      setGeoError(true);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Mapa de ${name}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "oklch(0.06 0.02 250 / 0.82)",
          backdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "oklch(0.13 0.02 255)",
          border: "1px solid oklch(0.28 0.04 260)",
          boxShadow: "0 30px 80px oklch(0 0 0 / 0.55)",
          animation: "smd-pop 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <style>{`
          @keyframes smd-pop {
            from { opacity: 0; transform: scale(0.97) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Cabeçalho */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "oklch(0.24 0.03 258)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
              style={{
                background: "oklch(0.2 0.05 25)",
                color: "oklch(0.8 0.16 25)",
              }}
            >
              <MapPin className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3
                className="text-sm font-semibold truncate"
                style={{ color: "oklch(0.97 0.01 80)" }}
              >
                {name}
              </h3>
              <p
                className="text-[11px] truncate"
                style={{ color: "oklch(0.6 0.02 80)" }}
              >
                {address || "Endereço não informado"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-transform active:scale-95"
            style={{
              background: "oklch(0.18 0.02 258)",
              border: "1px solid oklch(0.3 0.04 260)",
              color: "oklch(0.8 0.02 80)",
            }}
            aria-label="Fechar mapa"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alternância de modo */}
        <div
          className="flex items-center gap-2 px-5 py-3 border-b shrink-0"
          style={{ borderColor: "oklch(0.24 0.03 258)" }}
        >
          <button
            onClick={() => setMapMode("roadmap")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.97]"
            style={
              mode === "roadmap"
                ? {
                    background: "oklch(0.78 0.16 75)",
                    color: "oklch(0.12 0.02 250)",
                  }
                : {
                    background: "oklch(0.18 0.02 258)",
                    border: "1px solid oklch(0.3 0.04 260)",
                    color: "oklch(0.8 0.02 80)",
                  }
            }
          >
            <MapIcon className="w-3.5 h-3.5" /> Mapa
          </button>
          <button
            onClick={() => setMapMode("hybrid")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.97]"
            style={
              mode === "hybrid"
                ? {
                    background: "oklch(0.78 0.16 75)",
                    color: "oklch(0.12 0.02 250)",
                  }
                : {
                    background: "oklch(0.18 0.02 258)",
                    border: "1px solid oklch(0.3 0.04 260)",
                    color: "oklch(0.8 0.02 80)",
                  }
            }
          >
            <Satellite className="w-3.5 h-3.5" /> Satélite
          </button>

          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97]"
            style={{
              background: "oklch(0.18 0.02 258)",
              border: "1px solid oklch(0.3 0.04 260)",
              color: "oklch(0.7 0.02 80)",
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Abrir no Google Maps
          </a>
        </div>

        {/* Mapa */}
        <div className="relative flex-1 min-h-[360px]">
          <MapView
            className="h-[420px]"
            initialCenter={CHINA_CENTER}
            initialZoom={4}
            onMapReady={handleMapReady}
          />
          {geoError && (
            <div
              className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-lg text-xs"
              style={{
                background: "oklch(0.18 0.04 60 / 0.95)",
                border: "1px solid oklch(0.4 0.08 60)",
                color: "oklch(0.9 0.04 80)",
              }}
            >
              Não foi possível localizar o endereço automaticamente. Use “Abrir
              no Google Maps” para ver a localização exata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
