import { useState } from "react";
import Header from "@yiwu/components/Header";
import SafeImage from "@/components/SafeImage";
import {
  MapPin, ChevronRight, Layers, Navigation,
  Info, Building2, Map, Camera, ZoomIn, ChevronLeft, X
} from "lucide-react";

// ─── Fotos panorâmicas do mercado ────────────────────────────────────────────
const marketPhotos = [
  {
    id: "aerial3d",
    title: "Vista Aérea 3D — Futian Market com Distritos Sinalizados",
    description: "Vista aérea em perspectiva 3D do Futian Market com os 5 distritos identificados em português. Distritos 2 (âmbar) e 4 (verde) são os prioritários para Vidraria e Plásticos.",
    src: "/manus-storage/yiwu_aerial_3d_5d37ad35.png",
    badge: "Vista 3D",
  },
  {
    id: "cidade",
    title: "Localização na Cidade de Yiwu — Mapa dos Distritos",
    description: "Mapa aéreo da cidade de Yiwu mostrando a localização geográfica de cada distrito do Futian Market. Útil para planejar deslocamentos entre distritos.",
    src: "/manus-storage/yiwu_city_map_bd5ab31f.png",
    badge: "Mapa Cidade",
  },
];

// ─── Dados dos distritos ──────────────────────────────────────────────────────
const districts = [
  {
    id: 1,
    name: "Distrito 1",
    chinese: "一区",
    color: "#06B6D4",
    relevance: "baixa" as const,
    summary: "Brinquedos, artigos de festa, Natal e flores artificiais. Baixa relevância para o nicho de utilidades domésticas.",
    icon: "🎁",
    location: "Portões 1–20",
    floors: "3 andares",
    categories: ["Brinquedos", "Artigos de Festa", "Artigos de Natal", "Flores Artificiais", "Artigos Esportivos"],
    ncms: ["9503", "9505", "9506"],
    tip: "Relevância secundária para o seu nicho atual. Útil para diversificação futura.",
    svgX: 90, svgY: 200,
    photos: [] as { src: string; caption: string }[],
    floorGuide: [
      { floor: "1º Andar", content: "Brinquedos de plástico e pelúcia — grande variedade de fornecedores", highlight: false },
      { floor: "2º Andar", content: "Artigos de Natal, decorações e flores artificiais", highlight: false },
      { floor: "3º Andar", content: "Artigos esportivos, camping e lazer ao ar livre", highlight: false },
    ],
  },
  {
    id: 2,
    name: "Distrito 2",
    chinese: "二区",
    color: "#F59E0B",
    relevance: "alta" as const,
    summary: "PRINCIPAL destino. Vidraria (NCM 7013) no 2º andar e Garrafas Térmicas (NCM 9617) no 3º andar. Aqui opera a Yiwu Furui, fornecedora exclusiva da Flashgoods.",
    icon: "🥃",
    location: "Portões 21–50",
    floors: "5 andares",
    categories: ["★ Vidraria (NCM 7013)", "★ Garrafas Térmicas (NCM 9617)", "Cerâmica e Porcelana", "Utensílios de Cozinha", "Artigos de Mesa"],
    ncms: ["7013", "9617", "6911"],
    tip: "PRIORIDADE MÁXIMA — Concentre 2 dias aqui. Vidraria no 2º e 3º andares. Garrafas térmicas no 3º andar. É aqui que a Yiwu Furui (fornecedora da Flashgoods) opera.",
    svgX: 230, svgY: 200,
    photos: [
      { src: "/manus-storage/yiwu_d2_corridor_cf43e715.png", caption: "Corredor principal do Distrito 2 — Artigos domésticos e utilidades" },
      { src: "/manus-storage/yiwu_d2_corridor_cf43e715.png", caption: "Estandes de produtos variados — Seção de utilidades do D2" },
      { src: "/manus-storage/yiwu_glassware_1c06fd4d.png", caption: "Corredor amplo do Distrito 2 — Vidraria e cerâmica" },
      { src: "/manus-storage/yiwu_thermos_d57ca122.png", caption: "Exposição de garrafas e copos coloridos — 2º/3º Andar" },
      { src: "/manus-storage/yiwu_thermos_d57ca122.png", caption: "Variedade de garrafas e squeezes — Seção de garrafas térmicas" },
      { src: "/manus-storage/yiwu_glassware_1c06fd4d.png", caption: "Artigos de mesa e utilidades domésticas — Estandes do D2" },
      { src: "/manus-storage/yiwu_glassware_1c06fd4d.png", caption: "Vidraria decorativa colorida — Copos e taças de vidro" },
      { src: "/manus-storage/yiwu_glassware_1c06fd4d.png", caption: "Taças e copos de cristal colorido — 2º Andar do D2" },
      { src: "/manus-storage/yiwu_thermos_d57ca122.png", caption: "Garrafas térmicas com display digital — Fornecedores do D2" },
      { src: "/manus-storage/yiwu_thermos_d57ca122.png", caption: "Garrafas térmicas inox em atacado — 3º Andar do D2" },
    ],
    floorGuide: [
      { floor: "1º Andar", content: "Cerâmica básica, porcelana e artigos de mesa de baixo custo", highlight: false },
      { floor: "2º Andar", content: "★ VIDRARIA — Copos, taças, jarras, bowls e potes herméticos de vidro (NCM 7013)", highlight: true },
      { floor: "3º Andar", content: "★ VIDRARIA PREMIUM + GARRAFAS TÉRMICAS — Copos inox, squeezes, vacuum bottles (NCM 9617)", highlight: true },
      { floor: "4º Andar", content: "Utensílios de cozinha, facas, talheres e acessórios culinários", highlight: false },
      { floor: "5º Andar", content: "Showrooms de marcas, pedidos especiais e amostras personalizadas", highlight: false },
    ],
  },
  {
    id: 3,
    name: "Distrito 3",
    chinese: "三区",
    color: "#8B5CF6",
    relevance: "media" as const,
    summary: "Papelaria, bolsas, malas, chapéus e bijuteria. Relevância média — boa opção para diversificação de portfólio.",
    icon: "👜",
    location: "Portões 51–65",
    floors: "4 andares",
    categories: ["Papelaria e Escritório", "Bolsas e Malas", "Chapéus e Acessórios", "Bijuteria", "Artigos de Couro"],
    ncms: ["4820", "4202", "7117"],
    tip: "Relevância média para o nicho atual. Boa opção para diversificação em papelaria e acessórios de moda.",
    svgX: 370, svgY: 200,
    photos: [] as { src: string; caption: string }[],
    floorGuide: [
      { floor: "1º Andar", content: "Papelaria, cadernos, canetas e artigos de escritório", highlight: false },
      { floor: "2º Andar", content: "Bolsas, malas, mochilas e artigos de viagem", highlight: false },
      { floor: "3º Andar", content: "Chapéus, bonés, cintos e acessórios de moda", highlight: false },
      { floor: "4º Andar", content: "Bijuteria, semi-joias e acessórios femininos", highlight: false },
    ],
  },
  {
    id: 4,
    name: "Distrito 4",
    chinese: "四区",
    color: "#22C55E",
    relevance: "alta" as const,
    summary: "Segundo destino prioritário. Plásticos domésticos (NCM 3924), kits de banheiro e organizadores no 2º andar. Estande da ECOCO aqui (nº 20728-1).",
    icon: "🧴",
    location: "Portões 66–85",
    floors: "4 andares",
    categories: ["★ Plásticos Domésticos (NCM 3924)", "★ Kits de Banheiro", "★ Organizadores", "Artigos de Bambu", "Produtos de Limpeza"],
    ncms: ["3924", "3926", "4419"],
    tip: "PRIORIDADE ALTA — Reserve 1 dia completo. Plásticos e organização doméstica no 2º andar. Aqui estão os fornecedores da marca ECOCO (estande 20728-1).",
    svgX: 510, svgY: 200,
    photos: [
      { src: "/manus-storage/yiwu_d4_corridor_457f9374.png", caption: "Estandes de artigos domésticos — Entrada do Distrito 4" },
      { src: "/manus-storage/yiwu_plastic_bd0ef666.png", caption: "Variedade de produtos de organização doméstica — D4" },
      { src: "/manus-storage/yiwu_d4_corridor_457f9374.png", caption: "Corredor de artigos de utilidades — Distrito 4" },
      { src: "/manus-storage/yiwu_plastic_bd0ef666.png", caption: "Produtos de organização e limpeza — 1º Andar do D4" },
      { src: "/manus-storage/yiwu_d4_corridor_457f9374.png", caption: "Artigos domésticos variados — Corredor do D4" },
      { src: "/manus-storage/yiwu_plastic_bd0ef666.png", caption: "Corredor principal de plásticos domésticos — D4" },
      { src: "/manus-storage/yiwu_plastic_bd0ef666.png", caption: "Estandes de organização doméstica — 2º Andar D4" },
      { src: "/manus-storage/yiwu_plastic_bd0ef666.png", caption: "Variedade de kits de banheiro e organizadores — D4" },
    ],
    floorGuide: [
      { floor: "1º Andar", content: "Artigos de limpeza, vassouras, rodos, esponjas e produtos de higiene básicos", highlight: false },
      { floor: "2º Andar", content: "★ PLÁSTICOS DOMÉSTICOS — Kits de banheiro, organizadores, lixeiras, porta-objetos (NCM 3924)", highlight: true },
      { floor: "3º Andar", content: "Artigos de bambu, madeira e produtos ecológicos/sustentáveis", highlight: false },
      { floor: "4º Andar", content: "Artigos de jardim, vasos, ferramentas domésticas e outdoor", highlight: false },
    ],
  },
  {
    id: 5,
    name: "Distrito 5",
    chinese: "五区",
    color: "#EF4444",
    relevance: "baixa" as const,
    summary: "Eletrônicos, gadgets, iluminação LED e ferramentas. Baixa relevância para o nicho atual de utilidades domésticas.",
    icon: "💡",
    location: "Portões 86–100",
    floors: "3 andares",
    categories: ["Eletrônicos e Gadgets", "Acessórios de Celular", "Iluminação LED", "Ferramentas", "Auto Peças"],
    ncms: ["8513", "8517", "8544"],
    tip: "Relevância baixa para o nicho atual. Útil para futuras expansões em eletrônicos e acessórios tecnológicos.",
    svgX: 650, svgY: 200,
    photos: [] as { src: string; caption: string }[],
    floorGuide: [
      { floor: "1º Andar", content: "Acessórios de celular, capas, carregadores e gadgets", highlight: false },
      { floor: "2º Andar", content: "Iluminação LED, luminárias e acessórios de iluminação", highlight: false },
      { floor: "3º Andar", content: "Ferramentas, auto peças e equipamentos industriais leves", highlight: false },
    ],
  },
];

const relevanceBadge = {
  alta: { label: "★ PRIORITÁRIO", class: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  media: { label: "◆ SECUNDÁRIO", class: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  baixa: { label: "○ OPCIONAL", class: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
};

// ─── Mapa SVG interativo ──────────────────────────────────────────────────────
function FutianMapSVG({ selected, onSelect }: { selected: number; onSelect: (id: number) => void }) {
  const buildings = [
    { id: 1, x: 20, y: 55, w: 130, h: 170, label: "D1", color: "#06B6D4", gates: "Portões 1–20" },
    { id: 2, x: 165, y: 55, w: 130, h: 170, label: "D2", color: "#F59E0B", gates: "Portões 21–50", priority: true },
    { id: 3, x: 310, y: 55, w: 130, h: 170, label: "D3", color: "#8B5CF6", gates: "Portões 51–65" },
    { id: 4, x: 455, y: 55, w: 130, h: 170, label: "D4", color: "#22C55E", gates: "Portões 66–85", priority: true },
    { id: 5, x: 600, y: 55, w: 130, h: 170, label: "D5", color: "#EF4444", gates: "Portões 86–100" },
  ];

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox="0 0 800 340" className="w-full" style={{ minWidth: "600px", maxHeight: "340px" }}>
        <rect x="0" y="0" width="800" height="340" fill="oklch(0.13 0.04 240)" rx="12" />
        <rect x="0" y="270" width="800" height="30" fill="oklch(0.22 0.03 240)" />
        <text x="400" y="290" textAnchor="middle" fill="oklch(0.55 0.016 285)" fontSize="11" fontFamily="monospace">
          Chouzhou North Road — Rua principal de acesso ao Futian Market
        </text>
        {[120, 240, 360, 480, 600, 720].map(x => (
          <rect key={x} x={x} y="296" width="40" height="4" fill="oklch(0.35 0.03 240)" rx="2" />
        ))}
        <rect x="0" y="258" width="800" height="12" fill="oklch(0.18 0.03 240)" />

        {buildings.map((b) => {
          const isSelected = selected === b.id;
          return (
            <g key={b.id} onClick={() => onSelect(b.id)} style={{ cursor: "pointer" }}>
              <rect x={b.x + 4} y={b.y + 4} width={b.w} height={b.h} fill="black" opacity="0.3" rx="6" />
              <rect
                x={b.x} y={b.y} width={b.w} height={b.h}
                fill={isSelected ? b.color + "30" : b.color + "12"}
                stroke={b.color}
                strokeWidth={isSelected ? 3 : 1.5}
                rx="6"
                style={{ transition: "all 0.2s" }}
              />
              {[0, 1, 2, 3].map(row =>
                [0, 1, 2].map(col => {
                  const wx = b.x + 12 + col * (b.w / 3 - 2);
                  const wy = b.y + 15 + row * 35;
                  if (wy + 18 > b.y + b.h - 20) return null;
                  return (
                    <rect key={`${row}-${col}`} x={wx} y={wy} width={b.w / 3 - 14} height={18}
                      fill={isSelected ? b.color + "50" : b.color + "20"} rx="2" />
                  );
                })
              )}
              {(b as { priority?: boolean }).priority && (
                <g>
                  <rect x={b.x + b.w - 28} y={b.y - 14} width={56} height={18} fill="#F59E0B" rx="9" />
                  <text x={b.x + b.w + 0} y={b.y - 2} textAnchor="middle" fill="black" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
                    ★ PRIOR.
                  </text>
                </g>
              )}
              <circle cx={b.x + b.w / 2} cy={b.y + 28} r={18}
                fill={isSelected ? b.color : b.color + "30"}
                stroke={b.color} strokeWidth="2" />
              <text x={b.x + b.w / 2} y={b.y + 34} textAnchor="middle"
                fill={isSelected ? "black" : b.color}
                fontSize="16" fontWeight="bold" fontFamily="monospace">
                {b.id}
              </text>
              <text x={b.x + b.w / 2} y={b.y + 60} textAnchor="middle"
                fill={isSelected ? b.color : b.color + "cc"}
                fontSize="13" fontWeight="bold" fontFamily="sans-serif">
                {b.label}
              </text>
              <text x={b.x + b.w / 2} y={b.y + 80} textAnchor="middle"
                fill={isSelected ? b.color + "cc" : b.color + "80"}
                fontSize="10" fontFamily="sans-serif">
                Distrito {b.id}
              </text>
              <text x={b.x + b.w / 2} y={b.y + b.h - 10} textAnchor="middle"
                fill={b.color + "99"} fontSize="9" fontFamily="monospace">
                {b.gates}
              </text>
              <rect x={b.x + b.w / 2 - 12} y={b.y + b.h - 2} width={24} height={10}
                fill={b.color + "40"} stroke={b.color} strokeWidth="1" rx="2" />
              <polygon
                points={`${b.x + b.w / 2},${b.y + b.h + 14} ${b.x + b.w / 2 - 6},${b.y + b.h + 6} ${b.x + b.w / 2 + 6},${b.y + b.h + 6}`}
                fill={b.color + "60"}
              />
            </g>
          );
        })}

        <g>
          <rect x="10" y="305" width="12" height="12" fill="#F59E0B" rx="2" />
          <text x="26" y="315" fill="oklch(0.7 0.015 286)" fontSize="10" fontFamily="sans-serif">★ Prioritário para seu nicho</text>
          <rect x="200" y="305" width="12" height="12" fill="oklch(0.35 0.03 240)" rx="2" />
          <text x="216" y="315" fill="oklch(0.7 0.015 286)" fontSize="10" fontFamily="sans-serif">Clique no edifício para ver detalhes</text>
        </g>
        <text x="400" y="22" textAnchor="middle" fill="oklch(0.85 0.005 65)" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
          Mercado Internacional de Yiwu — Futian Market
        </text>
      </svg>
    </div>
  );
}

// ─── Galeria panorâmica do mercado ────────────────────────────────────────────
function PhotoGallery() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const photo = marketPhotos[activeIdx];

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Camera className="w-4 h-4" /> Mapas do Mercado
        </h2>
        <div className="flex gap-2">
          {marketPhotos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActiveIdx(i)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                i === activeIdx
                  ? "bg-amber-500 text-black"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {p.badge}
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden border border-border/20 shadow-2xl cursor-zoom-in relative group"
        style={{ background: "oklch(0.13 0.04 240)" }}
        onClick={() => setZoomed(true)}
      >
        <SafeImage
          key={photo.id}
          src={photo.src}
          alt={photo.title}
          fallbackLabel={photo.title}
          fallbackHint="Imagem de mapa indisponível"
          className="w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
          style={{ maxHeight: "520px", minHeight: "360px" }}
        />
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-4 h-4 text-white" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-white font-bold text-sm">{photo.title}</p>
          <p className="text-white/70 text-xs mt-1">{photo.description}</p>
        </div>
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomed(false)}
        >
          <SafeImage
            src={photo.src}
            alt={photo.title}
            fallbackLabel={photo.title}
            className="max-w-full max-h-full rounded-xl shadow-2xl cursor-zoom-out"
            style={{ objectFit: "contain", minWidth: "360px", minHeight: "360px" }}
          />
          <button
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2 text-white transition-colors"
            onClick={() => setZoomed(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Galeria de fotos por distrito ────────────────────────────────────────────
function DistrictGallery({ district }: { district: typeof districts[0] }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (!district.photos || district.photos.length === 0) {
    return (
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Camera className="w-4 h-4" /> Galeria de Fotos — {district.name}
        </h4>
        <div
          className="rounded-xl border flex flex-col items-center justify-center h-48 gap-3"
          style={{ borderColor: "oklch(0.92 0.004 286.32 / 0.15)", background: "oklch(0.967 0.001 286.375 / 0.03)" }}
        >
          <Camera className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground text-center px-4">
            Este distrito não é prioritário para sua visita.<br />
            <span className="text-xs">Foque nos Distritos 2 e 4.</span>
          </p>
        </div>
      </div>
    );
  }

  const photo = district.photos[photoIdx];
  const total = district.photos.length;

  return (
    <div>
      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <Camera className="w-4 h-4" /> Galeria de Fotos — {district.name}
        <span className="ml-auto text-xs font-normal opacity-60">{photoIdx + 1} / {total}</span>
      </h4>

      {/* Foto principal */}
      <div
        className="relative rounded-xl overflow-hidden cursor-zoom-in group"
        style={{ background: "oklch(0.13 0.04 240)" }}
        onClick={() => setZoomed(true)}
      >
        <SafeImage
          src={photo.src}
          alt={photo.caption}
          fallbackLabel={photo.caption}
          className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <p className="absolute bottom-3 left-3 right-10 text-white text-sm font-medium leading-snug">{photo.caption}</p>
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-3.5 h-3.5 text-white" />
        </div>
        {/* Setas de navegação */}
        {total > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setPhotoIdx((photoIdx - 1 + total) % total); }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setPhotoIdx((photoIdx + 1) % total); }}
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails em grade */}
      <div className="grid grid-cols-5 gap-1.5 mt-2">
        {district.photos.map((p, i) => (
          <button
            key={i}
            onClick={() => setPhotoIdx(i)}
            className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square ${
              i === photoIdx
                ? "border-amber-400 scale-105 shadow-lg shadow-amber-500/20"
                : "border-white/10 opacity-50 hover:opacity-90 hover:border-white/30"
            }`}
          >
            <SafeImage src={p.src} alt={p.caption} fallbackLabel={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            {i === photoIdx && (
              <div className="absolute inset-0 ring-2 ring-amber-400/60 rounded-lg" />
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setZoomed(false)}
        >
          <SafeImage
            src={photo.src}
            alt={photo.caption}
            fallbackLabel={photo.caption}
            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain cursor-zoom-out"
            style={{ minWidth: "360px", minHeight: "360px" }}
          />
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black/70 px-5 py-2 rounded-full whitespace-nowrap">
            {photo.caption}
          </p>
          <button
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2 text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setZoomed(false); }}
          >
            <X className="w-5 h-5" />
          </button>
          {/* Navegação no lightbox */}
          {total > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
                onClick={(e) => { e.stopPropagation(); setPhotoIdx((photoIdx - 1 + total) % total); }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
                onClick={(e) => { e.stopPropagation(); setPhotoIdx((photoIdx + 1) % total); }}
              >
                <ChevronLeft className="w-6 h-6 rotate-180" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function MarketMap() {
  const [selected, setSelected] = useState<number>(2);
  const selectedDistrict = districts.find(d => d.id === selected)!;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        {/* Page Header */}
        <div className="border-b border-border/50 py-8" style={{ background: "linear-gradient(135deg, oklch(0.17 0.04 240), oklch(0.13 0.04 240))" }}>
          <div className="container">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-4">
              <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-primary">Mapa do Mercado</span>
            </div>
            <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-2">
              <MapPin className="w-7 h-7 text-primary" />
              Mapa do Mercado de Yiwu
            </h1>
            <p className="text-muted-foreground">义乌国际商贸城 (Mercado Internacional de Yiwu) — Os 5 distritos e onde encontrar cada produto</p>
          </div>
        </div>

        <div className="container py-8 space-y-8">

          {/* ── Mini Cards dos Distritos ─────────────────────────────────────── */}
          <section>
            <h2 className="text-base font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Os 5 Distritos — Clique para ver detalhes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {districts.map((d) => {
                const badge = relevanceBadge[d.relevance];
                const isSelected = selected === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelected(d.id)}
                    className="rounded-2xl border-2 p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={isSelected ? {
                      borderColor: d.color + "80",
                      background: d.color + "10",
                      boxShadow: `0 0 24px ${d.color}25`,
                      transform: "scale(1.02)",
                    } : {
                      borderColor: "oklch(0.92 0.004 286.32 / 0.2)",
                      background: "oklch(0.967 0.001 286.375 / 0.04)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-extrabold font-mono flex-shrink-0"
                          style={{
                            background: d.color + "20",
                            color: d.color,
                            border: `2px solid ${d.color}50`,
                          }}
                        >
                          {d.id}
                        </div>
                        <div>
                          <div className="text-sm font-bold" style={isSelected ? { color: d.color } : {}}>
                            {d.name}
                          </div>
                          <div className="text-xs text-muted-foreground">{d.chinese}</div>
                        </div>
                      </div>
                      <span className="text-xl">{d.icon}</span>
                    </div>

                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-semibold mb-3 ${badge.class}`}>
                      {badge.label}
                    </span>

                    <p className="text-xs text-foreground/80 leading-relaxed mb-3 line-clamp-3">
                      {d.summary}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {d.ncms.map((ncm) => (
                        <span
                          key={ncm}
                          className="font-mono text-xs px-1.5 py-0.5 rounded"
                          style={{
                            background: d.color + "15",
                            color: d.color,
                            border: `1px solid ${d.color}30`,
                          }}
                        >
                          {ncm}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Navigation className="w-3 h-3" />
                      {d.location} · {d.floors}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Vista Panorâmica ─────────────────────────────────────────────── */}
          <PhotoGallery />

          {/* ── Mapa SVG Interativo ──────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Map className="w-4 h-4" />
                Diagrama do Mercado — Clique no edifício para selecionar
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="w-3 h-3" />
                Futian Market — Chouzhou North Road, Yiwu
              </div>
            </div>

            <div
              className="rounded-2xl overflow-hidden border shadow-xl p-4"
              style={{ borderColor: "oklch(0.92 0.004 286.32 / 0.2)", background: "oklch(0.13 0.04 240)" }}
            >
              <FutianMapSVG selected={selected} onSelect={setSelected} />
              <p className="text-xs text-muted-foreground text-center mt-3">
                Clique em qualquer distrito no diagrama para ver detalhes e a galeria de fotos
              </p>
            </div>
          </section>

          {/* ── Painel do Distrito Selecionado ──────────────────────────────── */}
          <section>
            <div
              className="rounded-2xl border-2 overflow-hidden transition-all duration-300"
              style={{ borderColor: selectedDistrict.color + "50", background: "oklch(0.15 0.04 240)" }}
            >
              {/* Cabeçalho */}
              <div
                className="p-5 border-b"
                style={{ borderColor: selectedDistrict.color + "30", background: selectedDistrict.color + "08" }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-extrabold font-mono flex-shrink-0"
                      style={{
                        background: selectedDistrict.color + "20",
                        color: selectedDistrict.color,
                        border: `2px solid ${selectedDistrict.color}50`,
                      }}
                    >
                      {selectedDistrict.id}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold flex items-center gap-2">
                        {selectedDistrict.name}
                        <span className="text-2xl">{selectedDistrict.icon}</span>
                        {selectedDistrict.relevance === "alta" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 align-middle">
                            ★ PRIORITÁRIO
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">{selectedDistrict.location} · {selectedDistrict.floors}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedDistrict.chinese} — Chouzhou North Road, Yiwu</p>
                    </div>
                  </div>

                  <div
                    className="lg:w-96 rounded-xl border p-4"
                    style={{ borderColor: selectedDistrict.color + "30", background: "oklch(0.13 0.04 240 / 0.6)" }}
                  >
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: selectedDistrict.color }} />
                      <p className="text-sm leading-relaxed text-foreground/90">{selectedDistrict.tip}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedDistrict.categories.map((cat) => (
                    <span
                      key={cat}
                      className="text-xs px-2.5 py-1 rounded-full border"
                      style={{
                        background: selectedDistrict.color + "10",
                        borderColor: selectedDistrict.color + "40",
                        color: selectedDistrict.color,
                      }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">NCMs:</p>
                  {selectedDistrict.ncms.map((ncm) => (
                    <span
                      key={ncm}
                      className="font-mono text-xs px-2 py-0.5 rounded border"
                      style={{
                        borderColor: selectedDistrict.color + "40",
                        color: selectedDistrict.color,
                        background: "oklch(0.13 0.04 240 / 0.5)",
                      }}
                    >
                      {ncm}
                    </span>
                  ))}
                  <span className="ml-auto text-xs text-muted-foreground">{selectedDistrict.location} · {selectedDistrict.floors}</span>
                </div>
              </div>

              {/* Guia por Andar + Galeria de Fotos lado a lado */}
              <div className="p-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Guia por Andar */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Guia por Andar — {selectedDistrict.name}
                    </h4>
                    <div className="space-y-2">
                      {selectedDistrict.floorGuide.map((item, i) => (
                        <div
                          key={item.floor}
                          className="rounded-xl border p-4 flex items-start gap-3 transition-all"
                          style={item.highlight ? {
                            borderColor: selectedDistrict.color + "50",
                            background: selectedDistrict.color + "08",
                          } : {
                            borderColor: "oklch(0.92 0.004 286.32 / 0.2)",
                            background: "oklch(0.967 0.001 286.375 / 0.03)",
                          }}
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-mono font-bold"
                            style={item.highlight ? {
                              background: selectedDistrict.color + "20",
                              color: selectedDistrict.color,
                              border: `1px solid ${selectedDistrict.color}40`,
                            } : {
                              background: "oklch(0.967 0.001 286.375 / 0.08)",
                              color: "oklch(0.552 0.016 285.938)",
                            }}
                          >
                            {i + 1}
                          </div>
                          <div>
                            <div
                              className="text-xs font-semibold mb-0.5"
                              style={item.highlight ? { color: selectedDistrict.color } : { color: "oklch(0.552 0.016 285.938)" }}
                            >
                              {item.floor}
                            </div>
                            <div className={`text-sm ${item.highlight ? "text-foreground font-medium" : "text-foreground/80"}`}>
                              {item.content}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Galeria de Fotos do Distrito */}
                  <DistrictGallery district={selectedDistrict} />
                </div>
              </div>
            </div>
          </section>

          {/* ── Legenda de Relevância ───────────────────────────────────────── */}
          <section className="rounded-xl border border-border/20 p-4 bg-secondary/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Legenda de Prioridade</h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold">★ PRIORITÁRIO</span>
                <span className="text-xs text-muted-foreground">Distritos 2 e 4 — Reserve 3 dias no total</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full border bg-purple-500/20 text-purple-300 border-purple-500/40 font-semibold">◆ SECUNDÁRIO</span>
                <span className="text-xs text-muted-foreground">Distrito 3 — Visita rápida de meio dia</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-500/20 text-slate-400 border-slate-500/30 font-semibold">○ OPCIONAL</span>
                <span className="text-xs text-muted-foreground">Distritos 1 e 5 — Apenas se sobrar tempo</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
