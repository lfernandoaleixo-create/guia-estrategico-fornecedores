// =============================================================================
// SupplierMapDialog — modal que mostra a localização de um fornecedor na China
// a partir do seu endereço textual (geocoding). Oferece:
//   - "Mapa" (roadmap) — visão principal.
//   - "Satélite" (hybrid) — visão secundária com rótulos.
//   - Cabeçalho com endereço + cidade/distrito/província (quando informados).
//   - Seção "Rotas": o usuário digita um segundo ponto (destino) e o painel
//     calcula a rota a partir do fornecedor, exibindo distância (km) e tempo.
//
// Usa o MapView (proxy Google Maps já autenticado). O geocoding e o cálculo de
// rota rodam no cliente via DirectionsService/DirectionsRenderer (lib "routes").
// =============================================================================
import { useEffect, useRef, useState } from "react";
import {
  X,
  Map as MapIcon,
  Satellite,
  ExternalLink,
  MapPin,
  Route,
  Navigation,
  Loader2,
} from "lucide-react";
import { MapView } from "@/components/Map";

interface SupplierMapDialogProps {
  open: boolean;
  onClose: () => void;
  name: string;
  /** Endereço composto (compatibilidade): usado para geocodificar a origem. */
  address: string;
  /** Partes separadas, exibidas no cabeçalho do modal. */
  street?: string | null;
  city?: string | null;
  province?: string | null;
  district?: string | null;
}

/** Chave própria de modo de rota (inclui trem e trem bala via TRANSIT). */
type RouteModeKey = "DRIVING" | "TRANSIT" | "WALKING" | "TRAIN" | "BULLET_TRAIN";

interface RouteResult {
  distanceText: string;
  durationText: string;
  destinationLabel: string;
}

export default function SupplierMapDialog({
  open,
  onClose,
  name,
  address,
  street = null,
  city = null,
  province = null,
  district = null,
}: SupplierMapDialogProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  const originRef = useRef<google.maps.LatLng | null>(null);
  const directionsRendererRef =
    useRef<google.maps.DirectionsRenderer | null>(null);

  const [mode, setMode] = useState<"roadmap" | "hybrid">("roadmap");
  const [geoError, setGeoError] = useState(false);

  // Estado da funcionalidade de rotas.
  // Usamos uma chave PRÓPRIA (não o enum do Google) porque "Trem" e "Trem bala"
  // não existem como TravelMode separados: ambos são TRANSIT com
  // transitOptions.modes = [TRAIN] e routingPreference diferente.
  const [destination, setDestination] = useState("");
  const [modeKey, setModeKey] = useState<RouteModeKey>("DRIVING");
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);

  // Garante foco na China mesmo se o geocoding falhar.
  const CHINA_CENTER = { lat: 34.0479, lng: 100.6197 };

  // Origem geocodificável: prioriza o endereço composto; cai para o nome.
  const originQuery = (address || name || "").trim();

  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    originQuery,
  )}`;

  // Linha secundária do cabeçalho: cidade · distrito · província (sem repetir).
  const localityParts: string[] = [];
  const seenLoc = new Set<string>();
  for (const part of [district, city, province]) {
    const p = (part ?? "").trim();
    if (p && !seenLoc.has(p.toLowerCase())) {
      seenLoc.add(p.toLowerCase());
      localityParts.push(p);
    }
  }
  const localityText = localityParts.join(" · ");

  // Reseta o estado de rota sempre que o modal abre para um novo fornecedor.
  useEffect(() => {
    if (open) {
      setDestination("");
      setRoute(null);
      setRouteError(null);
      setRouting(false);
      setModeKey("DRIVING");
    }
  }, [open, name, address]);

  function setMapMode(next: "roadmap" | "hybrid") {
    setMode(next);
    if (mapRef.current) mapRef.current.setMapTypeId(next);
  }

  function geocodeOrigin(map: google.maps.Map) {
    const query = originQuery;
    if (!query) {
      setGeoError(true);
      return;
    }
    try {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: query, region: "cn" }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const loc = results[0].geometry.location;
          originRef.current = loc;
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
      });
    } catch {
      setGeoError(true);
    }
  }

  function handleMapReady(map: google.maps.Map) {
    mapRef.current = map;
    map.setMapTypeId(mode);
    setGeoError(false);
    geocodeOrigin(map);
  }

  function clearRouteOverlay() {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    // Restaura o marcador da origem (o renderer some com ele).
    const map = mapRef.current;
    if (map && originRef.current) {
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: originRef.current,
        title: name,
      });
      map.setCenter(originRef.current);
      map.setZoom(15);
    }
  }

  function handleCalcRoute() {
    const map = mapRef.current;
    const dest = destination.trim();
    setRouteError(null);
    setRoute(null);

    if (!map) return;
    if (!originRef.current) {
      setRouteError(
        "A localização do fornecedor ainda não foi encontrada no mapa.",
      );
      return;
    }
    if (!dest) {
      setRouteError("Digite um destino para calcular a rota.");
      return;
    }

    setRouting(true);
    try {
      const service = new google.maps.DirectionsService();

      // Traduz a chave própria em uma DirectionsRequest do Google.
      //  - TRAIN: TRANSIT priorizando trem comum (RAIL).
      //  - BULLET_TRAIN: TRANSIT priorizando trem de alta velocidade.
      const TM = google.maps.TravelMode;
      const request: google.maps.DirectionsRequest = {
        origin: originRef.current,
        destination: dest,
        region: "cn",
        travelMode: TM.DRIVING,
      };
      if (modeKey === "DRIVING") {
        request.travelMode = TM.DRIVING;
      } else if (modeKey === "WALKING") {
        request.travelMode = TM.WALKING;
      } else if (modeKey === "TRANSIT") {
        request.travelMode = TM.TRANSIT;
      } else if (modeKey === "TRAIN") {
        request.travelMode = TM.TRANSIT;
        request.transitOptions = {
          modes: [google.maps.TransitMode.TRAIN, google.maps.TransitMode.RAIL],
          routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS,
        };
      } else if (modeKey === "BULLET_TRAIN") {
        // Trem bala: TRANSIT priorizando menos transferências e modo ferroviário.
        // O Google escolhe automaticamente trens de alta velocidade (ex.: CRH/G/D
        // na China) quando disponíveis nessa rota.
        request.travelMode = TM.TRANSIT;
        request.transitOptions = {
          modes: [google.maps.TransitMode.TRAIN],
          routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS,
        };
      }

      service.route(
        request,
        (result, status) => {
          setRouting(false);
          if (status === "OK" && result && result.routes[0]) {
            // Remove marcador isolado e renderiza a rota.
            if (markerRef.current) {
              markerRef.current.map = null;
              markerRef.current = null;
            }
            if (!directionsRendererRef.current) {
              directionsRendererRef.current =
                new google.maps.DirectionsRenderer({
                  suppressMarkers: false,
                  preserveViewport: false,
                });
            }
            directionsRendererRef.current.setMap(map);
            directionsRendererRef.current.setDirections(result);

            const leg = result.routes[0].legs[0];
            setRoute({
              distanceText: leg?.distance?.text ?? "—",
              durationText: leg?.duration?.text ?? "—",
              destinationLabel: leg?.end_address ?? dest,
            });
          } else if (status === "ZERO_RESULTS") {
            const ferroviario =
              modeKey === "TRAIN" || modeKey === "BULLET_TRAIN";
            setRouteError(
              ferroviario
                ? "Não foi encontrada linha de trem entre os dois pontos. Tente “Transporte” ou “Carro”."
                : "Não há rota entre os dois pontos para o modo escolhido. Tente outro modo de transporte.",
            );
          } else {
            setRouteError(
              "Não foi possível calcular a rota. Verifique o destino digitado.",
            );
          }
        },
      );
    } catch {
      setRouting(false);
      setRouteError("Não foi possível calcular a rota.");
    }
  }

  function handleClearRoute() {
    setRoute(null);
    setRouteError(null);
    setDestination("");
    clearRouteOverlay();
  }

  if (!open) return null;

  const TRAVEL_MODES: Array<{
    key: RouteModeKey;
    label: string;
  }> = [
    { key: "DRIVING", label: "Carro" },
    { key: "TRANSIT", label: "Transporte" },
    { key: "TRAIN", label: "Trem" },
    { key: "BULLET_TRAIN", label: "Trem bala" },
    { key: "WALKING", label: "A pé" },
  ];

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
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
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
          className="flex items-start justify-between gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "oklch(0.24 0.03 258)" }}
        >
          <div className="flex items-start gap-2.5 min-w-0">
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
                className="text-sm font-semibold leading-snug"
                style={{ color: "oklch(0.97 0.01 80)" }}
              >
                {name}
              </h3>
              <p
                className="text-[11px] leading-snug break-words"
                style={{ color: "oklch(0.68 0.02 80)" }}
              >
                {address || "Endereço não informado"}
              </p>
              {localityText && (
                <p
                  className="text-[11px] leading-snug break-words mt-0.5 font-medium"
                  style={{ color: "oklch(0.6 0.08 230)" }}
                >
                  {localityText}
                </p>
              )}
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

        {/* Alternância de modo + link externo */}
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

        {/* Seção de Rotas */}
        <div
          className="flex flex-col gap-2.5 px-5 py-3 border-b shrink-0"
          style={{ borderColor: "oklch(0.24 0.03 258)" }}
        >
          <div className="flex items-center gap-1.5">
            <Route
              className="w-4 h-4"
              style={{ color: "oklch(0.72 0.13 230)" }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "oklch(0.7 0.02 80)" }}
            >
              Criar rota a partir deste fornecedor
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCalcRoute();
              }}
              placeholder="Digite o destino (endereço, cidade, fornecedor…)"
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "oklch(0.18 0.02 258)",
                border: "1px solid oklch(0.3 0.04 260)",
                color: "oklch(0.92 0.01 80)",
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCalcRoute}
                disabled={routing}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-60"
                style={{
                  background: "oklch(0.62 0.16 230)",
                  color: "oklch(0.99 0.01 250)",
                }}
              >
                {routing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                Calcular
              </button>
              {(route || routeError) && (
                <button
                  onClick={handleClearRoute}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
                  style={{
                    background: "oklch(0.18 0.02 258)",
                    border: "1px solid oklch(0.3 0.04 260)",
                    color: "oklch(0.75 0.02 80)",
                  }}
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Modo de transporte */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {TRAVEL_MODES.map((tm) => {
              const active = modeKey === tm.key;
              return (
                <button
                  key={tm.key}
                  onClick={() => setModeKey(tm.key)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all active:scale-[0.97]"
                  style={
                    active
                      ? {
                          background: "oklch(0.3 0.08 230)",
                          color: "oklch(0.92 0.04 230)",
                          border: "1px solid oklch(0.5 0.12 230)",
                        }
                      : {
                          background: "oklch(0.16 0.02 258)",
                          color: "oklch(0.62 0.02 80)",
                          border: "1px solid oklch(0.28 0.03 260)",
                        }
                  }
                >
                  {tm.label}
                </button>
              );
            })}
          </div>

          {/* Resultado da rota */}
          {route && (
            <div
              className="flex flex-wrap items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{
                background: "oklch(0.2 0.05 230 / 0.4)",
                border: "1px solid oklch(0.4 0.1 230 / 0.5)",
              }}
            >
              <div className="flex flex-col">
                <span
                  className="text-[10px] uppercase tracking-wide font-semibold"
                  style={{ color: "oklch(0.6 0.04 230)" }}
                >
                  Distância
                </span>
                <span
                  className="text-base font-bold"
                  style={{ color: "oklch(0.9 0.06 230)" }}
                >
                  {route.distanceText}
                </span>
              </div>
              <div
                className="w-px h-8"
                style={{ background: "oklch(0.4 0.06 230 / 0.5)" }}
              />
              <div className="flex flex-col">
                <span
                  className="text-[10px] uppercase tracking-wide font-semibold"
                  style={{ color: "oklch(0.6 0.04 230)" }}
                >
                  Tempo estimado
                </span>
                <span
                  className="text-base font-bold"
                  style={{ color: "oklch(0.9 0.06 230)" }}
                >
                  {route.durationText}
                </span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span
                  className="text-[10px] uppercase tracking-wide font-semibold"
                  style={{ color: "oklch(0.6 0.04 230)" }}
                >
                  Destino
                </span>
                <span
                  className="text-xs font-medium break-words"
                  style={{ color: "oklch(0.82 0.02 80)" }}
                >
                  {route.destinationLabel}
                </span>
              </div>
            </div>
          )}

          {routeError && (
            <div
              className="px-3 py-2 rounded-lg text-xs"
              style={{
                background: "oklch(0.18 0.04 60 / 0.95)",
                border: "1px solid oklch(0.4 0.08 60)",
                color: "oklch(0.9 0.04 80)",
              }}
            >
              {routeError}
            </div>
          )}
        </div>

        {/* Mapa */}
        <div className="relative flex-1 min-h-[320px]">
          <MapView
            className="h-[380px]"
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
