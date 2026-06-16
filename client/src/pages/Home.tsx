import { useEffect, useMemo, useState } from "react";
import {
  Compass,
  Fish,
  Layers,
  MapPin,
  PawPrint,
  Plus,
  Sparkles,
  TrendingUp,
  FolderTree,
  Waves,
  Bug,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { useCustomGroups } from "@/shared/supplier-notes/useCustomGroups";
import { useExtraSuppliers } from "@/shared/supplier-notes/useExtraSuppliers";
import { useMacros } from "@/shared/supplier-notes/useMacros";
import { useSubgroups } from "@/shared/supplier-notes/useSubgroups";
import { useCustomSuppliers } from "@/shared/supplier-notes/useCustomSuppliers";
import { useSupplierNotes } from "@/shared/supplier-notes/useSupplierNotes";
import { formatSubgroupNumber } from "@/shared/supplier-notes/subgroupNumber";
import { countSuppliersBySubgroup } from "@/shared/supplier-notes/subgroupFilter";
import { MacroManager } from "@/shared/supplier-notes/MacroManager";
import { DashboardCard, type DashboardCardData } from "@/shared/supplier-notes/DashboardCard";
import AddSupplierToMacroDialog from "@/shared/supplier-notes/AddSupplierToMacroDialog";
import PartnerFilterPanel from "@/shared/supplier-notes/PartnerFilterPanel";
import { moveMacroOrder } from "@shared/macroOrder";

// -----------------------------------------------------------------------------
// Cards "atômicos" indexados por key (mesma key do catálogo de macros). Cada um
// pode ser atribuído a um macro. O dashboard de Aquários é representado por DOIS
// cards (Terrário e Aquário), ambos apontando para /aquario com filtro.
// -----------------------------------------------------------------------------
const AQUARIO_ACCENT = {
  accent: "oklch(0.72 0.18 28)",
  accentSoft: "oklch(0.85 0.14 30)",
  accentBg: "oklch(0.72 0.18 28 / 0.12)",
  accentBorder: "oklch(0.72 0.18 28 / 0.5)",
};

// Verde para o card Aquário (Terrário fica com o vermelho/coral acima).
const AQUARIO_VERDE = {
  accent: "oklch(0.72 0.19 145)",
  accentSoft: "oklch(0.85 0.15 145)",
  accentBg: "oklch(0.72 0.19 145 / 0.12)",
  accentBorder: "oklch(0.72 0.19 145 / 0.5)",
};

const cardByKey: Record<string, DashboardCardData> = {
  "subgroup:aquario:terrario": {
    href: "/aquario?subtipo=terrario",
    eyebrow: "TERRÁRIO",
    title: "Fornecedores de Terrário",
    subtitle: "Mercado Oriental Premium",
    description:
      "Fábricas chinesas focadas em terrários para répteis e anfíbios. Abre o dashboard de Aquários & Terrários já filtrado na especialidade Terrário.",
    ...AQUARIO_ACCENT,
    icon: Bug,
    chips: ["Terrários", "Répteis", "Equipamentos"],
    badge: "爬",
  },
  "subgroup:aquario:aquario": {
    href: "/aquario?subtipo=aquario",
    eyebrow: "AQUÁRIO",
    title: "Fornecedores de Aquário",
    subtitle: "Mercado Oriental Premium",
    description:
      "Fábricas chinesas de aquários, filtros e equipamentos de aquariofilia. Abre o dashboard de Aquários & Terrários já filtrado na especialidade Aquário.",
    ...AQUARIO_VERDE,
    icon: Fish,
    chips: ["Aquários", "Filtros", "Aquariofilia"],
    badge: "鱼",
  },
  "dashboard:tapete": {
    href: "/tapete",
    eyebrow: "TAPETE HIGIÊNICO",
    title: "Tapete Higiênico Pet · Importação",
    subtitle: "Corporate Intelligence — Grupo Fox",
    description:
      "Inteligência completa sobre a importação brasileira de tapetes higiênicos: exportadores chineses, importadores nacionais, cruzamento, comparador, NCM e tributação.",
    accent: "oklch(0.74 0.16 220)",
    accentSoft: "oklch(0.86 0.12 220)",
    accentBg: "oklch(0.74 0.16 220 / 0.12)",
    accentBorder: "oklch(0.74 0.16 220 / 0.5)",
    icon: PawPrint,
    chips: ["Exportadores", "Importadores", "NCM 4818", "Diário"],
    badge: "BR×CN",
  },
  "dashboard:yiwu": {
    href: "/yiwu",
    eyebrow: "YIWU INTEL",
    title: "Yiwu Intel · Mercado Internacional",
    subtitle: "Guia de Expedição China",
    description:
      "896+ fornecedores mapeados no Mercado Internacional de Yiwu. Análise da Flashgoods, dados LogComex, mapa dos 5 distritos e roteiro de viagem.",
    accent: "oklch(0.82 0.16 90)",
    accentSoft: "oklch(0.90 0.13 92)",
    accentBg: "oklch(0.82 0.16 90 / 0.14)",
    accentBorder: "oklch(0.82 0.16 90 / 0.5)",
    icon: MapPin,
    chips: ["896+ fornecedores", "5 Distritos", "LogComex", "Travel Guide"],
    badge: "义乌",
  },
};

const addCard: DashboardCardData = {
  href: "/adicionar",
  eyebrow: "ADICIONAR",
  title: "Adicionar Fornecedores",
  subtitle: "Banco de fornecedores avulsos",
  description:
    "Cadastre fornecedores que ainda não pertencem a nenhum dashboard. Crie subgrupos personalizados por ramo (brinquedos, vidro, decoração…) e, quando crescerem, promova-os a dashboards independentes.",
  accent: "oklch(0.78 0.16 75)",
  accentSoft: "oklch(0.86 0.13 75)",
  accentBg: "oklch(0.78 0.16 75 / 0.12)",
  accentBorder: "oklch(0.78 0.16 75 / 0.5)",
  icon: Plus,
  chips: ["Novos subgrupos", "Cadastro avulso", "Promover a dashboard"],
  badge: "+",
};

const NUMERO_POR_EXTENSO = [
  "Zero",
  "Um",
  "Dois",
  "Três",
  "Quatro",
  "Cinco",
  "Seis",
  "Sete",
  "Oito",
  "Nove",
  "Dez",
];
function nDashboardsLabel(n: number): string {
  return NUMERO_POR_EXTENSO[n] ?? String(n);
}

export default function Home() {
  const { groups: customGroups } = useCustomGroups();
  const { list: extraSuppliers } = useExtraSuppliers();
  const { macros, itemAssignment, reorderMacros } = useMacros();
  const { subgroups } = useSubgroups();
  const { list: aquarioSuppliers } = useCustomSuppliers("aquario");
  const aquarioNotes = useSupplierNotes("aquario");
  const [managerOpen, setManagerOpen] = useState(false);
  // Macro a partir do qual estamos adicionando um fornecedor (null = fechado).
  const [addToMacro, setAddToMacro] = useState<{ number: number; name: string } | null>(null);

  // Quais macros estão recolhidos. Por padrão, TODOS começam recolhidos.
  const [collapsedMacros, setCollapsedMacros] = useState<Set<string>>(new Set());
  // Sempre que a lista de macros muda (carregou do banco, criou novo etc.),
  // garante que macros recém-vistos comecem recolhidos sem reabrir os que o
  // usuário já abriu manualmente nesta sessão.
  const [seenMacroIds, setSeenMacroIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const novos = macros.map((m) => m.id).filter((id) => !seenMacroIds.has(id));
    if (novos.length === 0) return;
    setCollapsedMacros((prev) => {
      const next = new Set(prev);
      novos.forEach((id) => next.add(id));
      return next;
    });
    setSeenMacroIds((prev) => {
      const next = new Set(prev);
      novos.forEach((id) => next.add(id));
      return next;
    });
  }, [macros, seenMacroIds]);

  const toggleMacro = (id: string) => {
    setCollapsedMacros((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReorderMacro = async (id: string, direction: "up" | "down") => {
    const ids = macros.map((m) => m.id);
    const next = moveMacroOrder(ids, id, direction);
    // Se nada mudou (topo/fim ou id inexistente), evita escrita desnecessária.
    if (next.join("|") === ids.join("|")) return;
    await reorderMacros(next);
  };

  // Cards dos grupos promovidos (exceto o nº 0, oculto da Home).
  const promotedCardByKey = useMemo<Record<string, DashboardCardData>>(() => {
    const map: Record<string, DashboardCardData> = {};
    for (const g of customGroups) {
      if (!g.promotedToDashboard) continue;
      if ((g.number ?? 0) === 0) continue; // Central de Documentos oculta
      const count = extraSuppliers.filter((s) => s.groupId === g.id).length;
      map[`group:${g.id}`] = {
        href: `/grupo/${g.id}`,
        eyebrow: "SUBGRUPO PERSONALIZADO",
        title: g.name,
        subtitle: g.branch || "Subgrupo personalizado",
        description:
          g.description ||
          `Dashboard independente promovido a partir do subgrupo personalizado "${g.name}". Lista os fornecedores cadastrados neste ramo.`,
        accent: g.color,
        accentSoft: g.color,
        accentBg: `${g.color}1f`,
        accentBorder: `${g.color}88`,
        icon: Layers,
        chips: [
          `${count} fornecedor${count === 1 ? "" : "es"}`,
          g.branch || "Sem ramo",
          "Promovido",
        ],
        badge: "\u2605",
      };
    }
    return map;
  }, [customGroups, extraSuppliers]);

  // Índice completo de cards atribuíveis (fixos + promovidos).
  const allCards = useMemo<Record<string, DashboardCardData>>(
    () => ({ ...cardByKey, ...promotedCardByKey }),
    [promotedCardByKey],
  );

  const promotedGroupsForManager = useMemo(
    () =>
      customGroups
        .filter((g) => g.promotedToDashboard)
        .map((g) => ({ id: g.id, name: g.name, number: g.number ?? 0 })),
    [customGroups],
  );

  // Itens que NÃO estão em nenhum macro (seção "Sem classificação").
  const unclassifiedCards = useMemo(() => {
    const keys = Object.keys(allCards).filter((k) => !itemAssignment.has(k));
    return keys.map((k) => allCards[k]);
  }, [allCards, itemAssignment]);

  // Contagem de fornecedores por subgrupo (macro.sub): cruza customSuppliers do
  // scope "aquario" com a nota (fields.subgroupId).
  const countBySubgroup = useMemo<Record<string, number>>(() => {
    return countSuppliersBySubgroup(aquarioSuppliers, aquarioNotes.entries);
  }, [aquarioSuppliers, aquarioNotes.entries]);

  // Cards de SUBGRUPO (macro.sub) por número de macro. Cada subgrupo vira um card
  // clicável que abre seu dashboard dedicado (/subgrupo/:id).
  const subgroupCardsByMacro = useMemo<Record<number, DashboardCardData[]>>(() => {
    const map: Record<number, DashboardCardData[]> = {};
    for (const sg of subgroups) {
      const count = countBySubgroup[sg.id] ?? 0;
      const hier = formatSubgroupNumber(sg.macroNumber, sg.sub);
      const card: DashboardCardData = {
        href: `/subgrupo/${sg.id}`,
        eyebrow: `SUBGRUPO ${hier}`,
        title: sg.name,
        subtitle: "Subgrupo do macro",
        description: `Dashboard dedicado do subgrupo ${hier} · ${sg.name}. Lista os fornecedores deste ramo com status, contatos, anexos (com tradução PT) e cotações.`,
        accent: sg.color,
        accentSoft: sg.color,
        accentBg: `${sg.color}1f`,
        accentBorder: `${sg.color}88`,
        icon: Layers,
        chips: [
          `${count} fornecedor${count === 1 ? "" : "es"}`,
          `Subgrupo ${hier}`,
          "Dashboard próprio",
        ],
        badge: "\u2317",
        hierLabel: hier,
      };
      if (!map[sg.macroNumber]) map[sg.macroNumber] = [];
      map[sg.macroNumber].push(card);
    }
    return map;
  }, [subgroups, countBySubgroup]);

  // Total de cards exibidos (para o cabeçalho/stats).
  const totalCards = Object.keys(allCards).length;

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top left, oklch(0.18 0.05 28 / 0.45), transparent 55%), radial-gradient(ellipse at bottom right, oklch(0.18 0.06 240 / 0.55), transparent 55%), oklch(0.06 0.015 250)",
      }}
    >
      <div className="capa-grain" />

      {/* HEADER */}
      <header className="relative z-10 border-b" style={{ borderColor: "oklch(0.22 0.03 250)" }}>
        <div className="container flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
              style={{
                background: "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.55 0.18 25))",
                color: "oklch(0.10 0.02 250)",
                fontFamily: "'Fraunces', serif",
                letterSpacing: "-0.02em",
                fontSize: "1.05rem",
                boxShadow: "0 0 0 1px oklch(0.78 0.16 75 / 0.4), 0 8px 24px oklch(0.78 0.16 75 / 0.18)",
              }}
            >
              G
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="text-sm font-semibold"
                style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em", color: "oklch(0.97 0.01 80)" }}
              >
                Guia Estratégico
              </span>
              <span
                className="text-[10px] mt-1 tracking-[0.25em] uppercase"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "oklch(0.62 0.02 80)" }}
              >
                de Fornecedores
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="hidden md:flex items-center gap-3 text-xs"
              style={{ color: "oklch(0.65 0.02 80)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: "oklch(0.78 0.16 75)" }} />
              <span>{totalCards} ACESSOS · ATUALIZADO MAI/2026</span>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 container pt-16 md:pt-24 pb-12">
        <div className="max-w-4xl">
          <div
            className="capa-anim inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-8"
            style={{ borderColor: "oklch(0.78 0.16 75 / 0.3)", background: "oklch(0.78 0.16 75 / 0.07)" }}
          >
            <Compass className="w-3.5 h-3.5" style={{ color: "oklch(0.78 0.16 75)" }} />
            <span
              className="text-[11px] tracking-[0.18em] uppercase font-semibold"
              style={{ color: "oklch(0.85 0.13 75)", fontFamily: "'Inter', sans-serif" }}
            >
              Inteligência Comercial · Brasil ↔ China
            </span>
          </div>

          <h1
            className="capa-anim mb-6"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              lineHeight: 0.98,
              letterSpacing: "-0.04em",
              fontWeight: 600,
              color: "oklch(0.98 0.01 80)",
              animationDelay: "0.05s",
            }}
          >
            Guia Estratégico
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, oklch(0.85 0.16 75), oklch(0.65 0.20 35) 60%, oklch(0.55 0.22 25))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontStyle: "italic",
                fontWeight: 500,
                display: "inline-block",
                paddingRight: "0.18em",
                marginRight: "-0.18em",
              }}
            >
              de Fornecedores
            </span>
          </h1>

          <p
            className="capa-anim text-lg md:text-xl max-w-2xl mb-10"
            style={{
              color: "oklch(0.78 0.015 80)",
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1.55,
              animationDelay: "0.1s",
            }}
          >
            {nDashboardsLabel(totalCards)} acessos de inteligência comercial reunidos em um único portal,
            organizados por classificações macro. Acesse fornecedores, importadores, mapas, dados de NCM e
            roteiros — tudo em um lugar, sem login.
          </p>

          {/* Stats bar */}
          <div
            className="capa-anim grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border"
            style={{ borderColor: "oklch(0.22 0.03 250)", background: "oklch(0.22 0.03 250)", animationDelay: "0.2s" }}
          >
            {[
              { label: "Acessos integrados", value: String(totalCards) },
              { label: "Classificações macro", value: String(macros.length) },
              { label: "Fontes de dados", value: "LogComex · Alibaba · Yiwugo" },
              { label: "Atualizado em", value: "Maio / 2026" },
            ].map((s) => (
              <div key={s.label} className="p-4 md:p-5" style={{ background: "oklch(0.08 0.018 250)" }}>
                <div
                  className="text-xs uppercase tracking-[0.16em] font-semibold mb-1.5"
                  style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'Inter', sans-serif" }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    color: "oklch(0.95 0.02 80)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FILTRO POR PARCEIRO CHINÊS */}
      <PartnerFilterPanel />

      {/* DASHBOARDS POR MACRO */}
      <section className="relative z-10 container pb-24">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div
              className="text-xs uppercase tracking-[0.2em] font-semibold mb-2"
              style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'Inter', sans-serif" }}
            >
              Classificação geral de grupos macro
            </div>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                fontWeight: 600,
                letterSpacing: "-0.025em",
                color: "oklch(0.97 0.01 80)",
                lineHeight: 1.1,
              }}
            >
              Acesso direto à inteligência
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="hidden md:flex items-center gap-2 text-xs"
              style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{totalCards} / {totalCards} ATIVOS</span>
            </div>
            <button
              onClick={() => setManagerOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:brightness-110 active:scale-[0.97]"
              style={{
                borderColor: "oklch(0.78 0.16 300 / 0.5)",
                background: "oklch(0.78 0.16 300 / 0.1)",
                color: "oklch(0.82 0.14 300)",
                fontFamily: "'Inter', sans-serif",
                transitionDuration: "160ms",
              }}
            >
              <FolderTree className="w-3.5 h-3.5" />
              Criar novo Macro
            </button>
          </div>
        </div>

        {/* Seções por macro */}
        {macros.map((m, macroIdx) => {
          const items = m.items.filter((it) => allCards[it.key]);
          const subgroupCards = subgroupCardsByMacro[m.number] ?? [];
          const totalAcessos = items.length + subgroupCards.length;
          if (totalAcessos === 0) return null;
          const collapsed = collapsedMacros.has(m.id);
          const isFirst = macroIdx === 0;
          const isLast = macroIdx === macros.length - 1;
          return (
            <div key={m.id} className="mb-12">
              <div className="flex items-center gap-3 mb-5">
                {/* Cabeçalho clicável (expande/recolhe) */}
                <button
                  type="button"
                  onClick={() => toggleMacro(m.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left group active:scale-[0.997]"
                  style={{ transition: "transform 160ms cubic-bezier(0.23, 1, 0.32, 1)" }}
                  aria-expanded={!collapsed}
                >
                  <span
                    className="flex items-center justify-center flex-shrink-0 transition-transform"
                    style={{
                      color: "oklch(0.6 0.02 80)",
                      transitionDuration: "180ms",
                      transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                    }}
                  >
                    {collapsed ? (
                      <ChevronRight className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </span>
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
                    style={{
                      background: `${m.color}22`,
                      border: `1px solid ${m.color}88`,
                      color: m.color,
                      fontFamily: "'Fraunces', serif",
                      fontSize: "1.2rem",
                    }}
                  >
                    {m.number}
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block text-[10px] tracking-[0.22em] uppercase font-semibold"
                      style={{ color: "oklch(0.5 0.02 80)", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Classificação Macro Nº {m.number} · {totalAcessos} acesso{totalAcessos === 1 ? "" : "s"}
                    </span>
                    <span
                      className="block truncate"
                      style={{
                        fontFamily: "'Fraunces', serif",
                        fontSize: "1.5rem",
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        color: "oklch(0.97 0.01 80)",
                        lineHeight: 1.1,
                      }}
                    >
                      {m.name}
                    </span>
                  </span>
                </button>

                {/* Setas de reordenar macros entre si (somente com 2+ macros) */}
                {macros.length > 1 && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleReorderMacro(m.id, "up")}
                      disabled={isFirst}
                      title="Mover macro para cima"
                      aria-label="Mover macro para cima"
                      className="w-7 h-7 rounded-md flex items-center justify-center border transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-125 active:scale-[0.92]"
                      style={{
                        borderColor: "oklch(0.3 0.02 250)",
                        background: "oklch(0.14 0.02 250)",
                        color: "oklch(0.7 0.02 80)",
                        transitionDuration: "160ms",
                      }}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorderMacro(m.id, "down")}
                      disabled={isLast}
                      title="Mover macro para baixo"
                      aria-label="Mover macro para baixo"
                      className="w-7 h-7 rounded-md flex items-center justify-center border transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-125 active:scale-[0.92]"
                      style={{
                        borderColor: "oklch(0.3 0.02 250)",
                        background: "oklch(0.14 0.02 250)",
                        color: "oklch(0.7 0.02 80)",
                        transitionDuration: "160ms",
                      }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg, ${m.color}55, transparent)` }} />
              </div>

              {!collapsed && (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {items.map((it, idx) => {
                      const base = allCards[it.key];
                      const hier = `${m.number}.${idx + 1}`;
                      // Dentro de um macro a numeração antiga "Subgrupo Nº XX"
                      // perde o sentido: usamos a hierarquia macro.sub (ex.: 2.1)
                      // no eyebrow e exibimos apenas o nome/ramo no subtitle.
                      const isPromoted = it.key.startsWith("group:");
                      const d = base
                        ? {
                            ...base,
                            hierLabel: hier,
                            ...(isPromoted
                              ? {
                                  eyebrow: `SUBGRUPO ${hier}`,
                                  subtitle: base.title,
                                }
                              : {}),
                          }
                        : base;
                      return (
                        <DashboardCard key={it.key} d={d} index={idx} />
                      );
                    })}
                    {/* Cards dos subgrupos macro.sub criados neste macro */}
                    {subgroupCards.map((d, idx) => (
                      <DashboardCard key={d.href} d={d} index={items.length + idx} />
                    ))}
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setAddToMacro({ number: m.number, name: m.name })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:brightness-125 active:scale-[0.97]"
                      style={{
                        background: `${m.color}1f`,
                        borderColor: `${m.color}88`,
                        color: m.color,
                        transition: "transform 160ms cubic-bezier(0.23, 1, 0.32, 1), filter 160ms",
                      }}
                    >
                      <Plus className="w-4 h-4" /> Adicionar fornecedor em {m.number} · {m.name}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Sem classificação */}
        {unclassifiedCards.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(0.2 0.02 250)", border: "1px solid oklch(0.3 0.02 250)", color: "oklch(0.6 0.02 80)" }}
              >
                <Waves className="w-5 h-5" />
              </span>
              <div>
                <div
                  className="text-[10px] tracking-[0.22em] uppercase font-semibold"
                  style={{ color: "oklch(0.5 0.02 80)", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {macros.length > 0 ? "Ainda não classificados" : "Todos os acessos"}
                </div>
                <h3
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "oklch(0.97 0.01 80)",
                    lineHeight: 1.1,
                  }}
                >
                  {macros.length > 0 ? "Sem classificação macro" : "Dashboards"}
                </h3>
              </div>
              <div className="flex-1 h-px ml-2" style={{ background: "linear-gradient(90deg, oklch(0.3 0.02 250), transparent)" }} />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {unclassifiedCards.map((d, idx) => (
                <DashboardCard key={d.href} d={d} index={idx} />
              ))}
              {/* Card avulso "Adicionar Fornecedores" ocultado a pedido do usuário:
                  o cadastro agora é feito pelo botão "Adicionar fornecedor" dentro de cada macro. */}
            </div>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t" style={{ borderColor: "oklch(0.22 0.03 250)" }}>
        <div className="container py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div
            className="text-xs"
            style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}
          >
            GUIA ESTRATÉGICO DE FORNECEDORES · 2026
          </div>
          <div className="text-xs" style={{ color: "oklch(0.5 0.02 80)", fontFamily: "'Inter', sans-serif" }}>
            Inteligência comercial Brasil ↔ China · Sem login · Acesso público
          </div>
        </div>
      </footer>

      <MacroManager open={managerOpen} onOpenChange={setManagerOpen} promotedGroups={promotedGroupsForManager} />

      {addToMacro && (
        <AddSupplierToMacroDialog
          open={!!addToMacro}
          macroNumber={addToMacro.number}
          macroName={addToMacro.name}
          onClose={() => setAddToMacro(null)}
          onCreated={() => setAddToMacro(null)}
        />
      )}
    </div>
  );
}
