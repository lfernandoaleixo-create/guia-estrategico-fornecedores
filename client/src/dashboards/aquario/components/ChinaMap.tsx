// =============================================================================
// DESIGN: Mercado Oriental Premium
// Mapa interativo da China com fornecedores plotados por cidade/coordenadas
// Usa react-simple-maps + GeoJSON público da China
// =============================================================================

import { useState, useEffect } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - react-simple-maps has no TypeScript declarations
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { type Supplier } from "@aquario/data/suppliers";
import { MapPin, ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";

interface Props {
  suppliers: Supplier[];
  onSelectSupplier: (supplier: Supplier) => void;
}

// Coordenadas aproximadas das principais cidades de fornecedores
const cityCoordinates: Record<string, [number, number]> = {
  "Guangzhou": [113.26, 23.13],
  "Foshan": [113.12, 23.02],
  "Dongguan": [113.75, 23.02],
  "Zhongshan": [113.39, 22.52],
  "Chaozhou": [116.62, 23.66],
  "Raoping": [117.0, 23.7],
  "Shenzhen": [114.06, 22.54],
  "Jiaxing": [120.76, 30.75],
  "Zhoushan": [122.21, 29.99],
  "Wenzhou": [120.67, 28.02],
  "Tianjin": [117.19, 39.13],
  "Rizhao": [119.53, 35.42],
  "Qingdao": [120.38, 36.07],
  "Hefei": [117.28, 31.86],
  "Shijiazhuang": [114.52, 38.05],
};

const categoryColors: Record<string, string> = {
  terrario: "#2d6a4f",
  aquario: "#1a5276",
  equipamento: "#7b4f2e",
  mercado: "#c41e3a",
  acessorio: "#6b4c9a",
};

const categoryEmoji: Record<string, string> = {
  terrario: "🦎",
  aquario: "🐟",
  equipamento: "⚙️",
  mercado: "🏪",
};

// GeoJSON público da China (províncias)
const CHINA_GEO_URL = "/china-provinces.json";

export default function ChinaMap({ suppliers, onSelectSupplier }: Props) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([104, 35]);
  const [hoveredSupplier, setHoveredSupplier] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ supplier: Supplier; x: number; y: number } | null>(null);
  const [geoLoaded, setGeoLoaded] = useState(false);

  // Agrupa fornecedores por cidade para evitar sobreposição
  const suppliersByCity = suppliers.reduce((acc, s) => {
    const key = s.city;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, Supplier[]>);

  const cityEntries = Object.entries(suppliersByCity).filter(
    ([city]) => cityCoordinates[city]
  );

  const handleMarkerClick = (citySuppliers: Supplier[], event: React.MouseEvent) => {
    if (citySuppliers.length === 1) {
      onSelectSupplier(citySuppliers[0]);
    } else {
      const rect = (event.currentTarget as SVGElement).closest("svg")?.getBoundingClientRect();
      if (rect) {
        setTooltip({
          supplier: citySuppliers[0],
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "oklch(0.97 0.003 220)" }}>
      {/* Header do mapa */}
      <div
        className="flex-shrink-0 px-5 py-3 flex items-center justify-between border-b"
        style={{ borderColor: "oklch(0.88 0.005 80)", background: "oklch(1 0 0)" }}
      >
        <div>
          <h2
            className="text-base font-bold"
            style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.15 0.01 60)" }}
          >
            Mapa de Fornecedores — China
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.01 60)" }}>
            {suppliers.length} fornecedores em {cityEntries.length} cidades · Clique nos marcadores para ver detalhes
          </p>
        </div>
        {/* Legenda */}
        <div className="flex items-center gap-4 text-xs" style={{ color: "oklch(0.45 0.01 60)" }}>
          {[
            { cat: "terrario", label: "Terrários" },
            { cat: "aquario", label: "Aquários" },
            { cat: "equipamento", label: "Equip." },
            { cat: "mercado", label: "Mercados" },
          ].map(({ cat, label }) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: categoryColors[cat] }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controles de zoom */}
      <div
        className="absolute right-4 top-20 z-10 flex flex-col gap-1"
      >
        {[
          { icon: <ZoomIn size={14} />, action: () => setZoom((z) => Math.min(z * 1.5, 8)), title: "Zoom in" },
          { icon: <ZoomOut size={14} />, action: () => setZoom((z) => Math.max(z / 1.5, 0.5)), title: "Zoom out" },
          { icon: <RotateCcw size={14} />, action: () => { setZoom(1); setCenter([104, 35]); }, title: "Resetar" },
        ].map(({ icon, action, title }, i) => (
          <button
            key={i}
            onClick={action}
            title={title}
            className="w-8 h-8 rounded flex items-center justify-center shadow-sm transition-all hover:opacity-80"
            style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.88 0.005 80)", color: "oklch(0.35 0.01 60)" }}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Mapa SVG */}
      <div className="flex-1 relative overflow-hidden">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 680,
            center: [104, 35],
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup
            zoom={zoom}
            center={center}
            onMoveEnd={({ zoom: z, coordinates }: { zoom: number; coordinates: [number, number] }) => {
              setZoom(z);
              setCenter(coordinates);
            }}
          >
            {/* Províncias da China */}
            <Geographies geography={CHINA_GEO_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: {
                        fill: "oklch(0.88 0.02 220)",
                        stroke: "oklch(0.75 0.03 220)",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                      hover: {
                        fill: "oklch(0.82 0.04 220)",
                        stroke: "oklch(0.65 0.05 220)",
                        strokeWidth: 0.8,
                        outline: "none",
                      },
                      pressed: {
                        fill: "oklch(0.78 0.05 220)",
                        outline: "none",
                      },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Marcadores de fornecedores por cidade */}
            {cityEntries.map(([city, citySuppliers]) => {
              const coords = cityCoordinates[city];
              if (!coords) return null;

              // Determina a categoria dominante da cidade
              const catCounts = citySuppliers.reduce((acc, s) => {
                acc[s.category] = (acc[s.category] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const dominantCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0][0];
              const color = categoryColors[dominantCat] || "#666";
              const isHovered = hoveredSupplier === city;

              return (
                <Marker key={city} coordinates={coords}>
                  <g
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredSupplier(city)}
                    onMouseLeave={() => setHoveredSupplier(null)}
                    onClick={(e) => handleMarkerClick(citySuppliers, e)}
                  >
                    {/* Círculo de fundo com pulso */}
                    {isHovered && (
                      <circle
                        r={14}
                        fill={color}
                        fillOpacity={0.2}
                        style={{ animation: "pulse 1.5s infinite" }}
                      />
                    )}
                    {/* Marcador principal */}
                    <circle
                      r={citySuppliers.length > 1 ? 10 : 7}
                      fill={color}
                      fillOpacity={0.9}
                      stroke="white"
                      strokeWidth={1.5}
                      style={{
                        transform: isHovered ? "scale(1.2)" : "scale(1)",
                        transformOrigin: "center",
                        transition: "transform 0.15s ease",
                      }}
                    />
                    {/* Número de fornecedores */}
                    {citySuppliers.length > 1 ? (
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          fontSize: "8px",
                          fontWeight: "bold",
                          fill: "white",
                          pointerEvents: "none",
                        }}
                      >
                        {citySuppliers.length}
                      </text>
                    ) : (
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          fontSize: "7px",
                          fill: "white",
                          pointerEvents: "none",
                        }}
                      >
                        {categoryEmoji[dominantCat] || "•"}
                      </text>
                    )}
                    {/* Label da cidade */}
                    <text
                      textAnchor="middle"
                      y={isHovered ? 20 : 18}
                      style={{
                        fontSize: isHovered ? "8px" : "7px",
                        fontWeight: isHovered ? "600" : "400",
                        fill: isHovered ? color : "oklch(0.25 0.01 60)",
                        pointerEvents: "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {city}
                    </text>
                  </g>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip para cidades com múltiplos fornecedores */}
        {tooltip && (
          <div
            className="absolute z-20 rounded-lg shadow-xl border p-3 min-w-[200px] max-w-[260px]"
            style={{
              left: Math.min(tooltip.x + 10, window.innerWidth - 280),
              top: Math.min(tooltip.y - 10, window.innerHeight - 300),
              background: "oklch(1 0 0)",
              borderColor: "oklch(0.88 0.005 80)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: "oklch(0.25 0.01 60)" }}>
                {tooltip.supplier.city} — {suppliersByCity[tooltip.supplier.city]?.length} fornecedores
              </span>
              <button onClick={() => setTooltip(null)}>
                <X size={12} style={{ color: "oklch(0.55 0.01 60)" }} />
              </button>
            </div>
            <div className="space-y-1">
              {suppliersByCity[tooltip.supplier.city]?.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { onSelectSupplier(s); setTooltip(null); }}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-gray-50 transition-colors"
                  style={{ color: "oklch(0.25 0.01 60)" }}
                >
                  <span>{categoryEmoji[s.category] || "•"}</span>
                  <span className="flex-1 truncate">{s.name.split("Co.,")[0].trim()}</span>
                  <span
                    className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: categoryColors[s.category], fontSize: "9px" }}
                  >
                    {s.category}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Painel lateral de info da cidade hover */}
        {hoveredSupplier && !tooltip && (
          <div
            className="absolute bottom-4 left-4 rounded-lg shadow-lg border px-4 py-3 max-w-xs"
            style={{
              background: "oklch(1 0 0 / 0.95)",
              borderColor: "oklch(0.88 0.005 80)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={12} style={{ color: "oklch(0.45 0.22 25)" }} />
              <span className="text-xs font-semibold" style={{ color: "oklch(0.25 0.01 60)" }}>
                {hoveredSupplier}
              </span>
            </div>
            <div className="space-y-0.5">
              {suppliersByCity[hoveredSupplier]?.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.45 0.01 60)" }}>
                  <span>{categoryEmoji[s.category] || "•"}</span>
                  <span className="truncate">{s.name.split(" Co.,")[0].trim()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
