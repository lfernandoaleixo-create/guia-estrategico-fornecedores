import { useEffect, useMemo, useState, lazy, Suspense } from "react";
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
  ClipboardList,
  Calculator,
  Trash2,
  RotateCcw,
  EyeOff,
} from "lucide-react";
import { useCustomGroups } from "@/shared/supplier-notes/useCustomGroups";
import { useHiddenCards } from "@/shared/supplier-notes/useHiddenCards";
import { useCardColors } from "@/shared/supplier-notes/useCardColors";
import { deriveAccent } from "@/shared/supplier-notes/cardAccent";
import { useExtraSuppliers } from "@/shared/supplier-notes/useExtraSuppliers";
import { useMacros } from "@/shared/supplier-notes/useMacros";
import { useSubgroups } from "@/shared/supplier-notes/useSubgroups";
import { useCustomSuppliers } from "@/shared/supplier-notes/useCustomSuppliers";
import { useSupplierNotes } from "@/shared/supplier-notes/useSupplierNotes";
import { formatSubgroupNumber } from "@/shared/supplier-notes/subgroupNumber";
import { countSuppliersBySubgroup, suppliersForSubgroup } from "@/shared/supplier-notes/subgroupFilter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MacroManager } from "@/shared/supplier-notes/MacroManager";
import { DashboardCard, type DashboardCardData } from "@/shared/supplier-notes/DashboardCard";
import AddSupplierToMacroDialog from "@/shared/supplier-notes/AddSupplierToMacroDialog";
import PartnerFilterPanel from "@/shared/supplier-notes/PartnerFilterPanel";
const NegotiationSummaryPanel = lazy(() => import("@/shared/supplier-notes/NegotiationSummaryPanel"));
const CalculatorPanel = lazy(() => import("@/shared/supplier-notes/CalculatorPanel"));
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
  const { groups: customGroups, updateGroup } = useCustomGroups();
  const { list: extraSuppliers } = useExtraSuppliers();
  const { macros, itemAssignment, reorderMacros, deleteMacro } = useMacros();
  const { subgroups, deleteSubgroup, updateSubgroup } = useSubgroups();
  const { isHidden, hideCard, showCard, hiddenKeys } = useHiddenCards();
  const { colorFor, setColor } = useCardColors();
  const { list: aquarioSuppliers } = useCustomSuppliers("aquario");
  const aquarioNotes = useSupplierNotes("aquario");
  // Subgrupo pendente de exclusão (null = dialog fechado).
  const [subgroupToDelete, setSubgroupToDelete] = useState<{
    id: string;
    label: string;
    name: string;
    count: number;
  } | null>(null);
  const [deletingSubgroup, setDeletingSubgroup] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  // Card de acesso fixo pendente de ocultar (null = dialog fechado).
  const [cardToHide, setCardToHide] = useState<{ key: string; title: string } | null>(null);
  const [hidingCard, setHidingCard] = useState(false);
  // Macro pendente de exclusão (null = dialog fechado).
  const [macroToDelete, setMacroToDelete] = useState<{
    id: string;
    number: number;
    name: string;
    itemCount: number;
  } | null>(null);
  const [deletingMacro, setDeletingMacro] = useState(false);
  // Painel de cards ocultos (para restaurar).
  const [hiddenPanelOpen, setHiddenPanelOpen] = useState(false);
  // Painel "Resumo das Negociações" (visão executiva, só leitura).
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  // Oculta um card de acesso fixo do portal (NÃO apaga dados do dashboard).
  const handleHideCard = async () => {
    if (!cardToHide) return;
    setHidingCard(true);
    try {
      await hideCard(cardToHide.key);
      setCardToHide(null);
    } finally {
      setHidingCard(false);
    }
  };

  // Exclui um macro inteiro (a classificação). Os itens dentro dele (dashboards,
  // subgrupos, grupos) NÃO são apagados — voltam para "Sem classificação".
  const handleDeleteMacro = async () => {
    if (!macroToDelete) return;
    setDeletingMacro(true);
    try {
      await deleteMacro(macroToDelete.id);
      setMacroToDelete(null);
    } finally {
      setDeletingMacro(false);
    }
  };

  // Exclui um subgrupo: primeiro DESVINCULA todos os fornecedores marcados com ele
  // (limpa fields.subgroupId), aguardando a persistência, e só depois apaga o subgrupo.
  // Os fornecedores NÃO são apagados — apenas perdem o vínculo.
  const handleDeleteSubgroup = async () => {
    if (!subgroupToDelete) return;
    setDeletingSubgroup(true);
    try {
      const toUnlink = suppliersForSubgroup(
        aquarioSuppliers,
        aquarioNotes.entries,
        subgroupToDelete.id,
      );
      for (const s of toUnlink) {
        await aquarioNotes.upsertEntryAsync(s.id, { fields: { subgroupId: "" } });
      }
      await deleteSubgroup(subgroupToDelete.id);
      setSubgroupToDelete(null);
    } finally {
      setDeletingSubgroup(false);
    }
  };
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

  // Índice completo de cards atribuíveis (fixos + promovidos), EXCETO os cards
  // de acesso fixos que o usuário ocultou do portal. Ocultar não apaga dados:
  // o dashboard segue existindo e o card pode ser restaurado.
  const allCards = useMemo<Record<string, DashboardCardData>>(() => {
    const merged = { ...cardByKey, ...promotedCardByKey };
    for (const key of Object.keys(merged)) {
      // Só cards FIXOS (cardByKey) podem ser ocultos por aqui; promovidos têm
      // seu próprio fluxo. Ainda assim respeitamos a lista de ocultos.
      if (isHidden(key)) {
        delete merged[key];
        continue;
      }
      // Override de cor (cards fixos): se o usuário escolheu uma cor, deriva os
      // 4 tons a partir dela. Camada puramente visual.
      const override = colorFor(key);
      if (override) {
        merged[key] = { ...merged[key], ...deriveAccent(override) };
      }
    }
    return merged;
  }, [promotedCardByKey, isHidden, colorFor]);

  const promotedGroupsForManager = useMemo(
    () =>
      customGroups
        .filter((g) => g.promotedToDashboard)
        .map((g) => ({ id: g.id, name: g.name, number: g.number ?? 0 })),
    [customGroups],
  );

  // Itens que NÃO estão em nenhum macro (seção "Sem classificação").
  // Mantém a `key` junto do card para permitir ocultar cards de acesso fixos.
  const unclassifiedCards = useMemo(() => {
    const keys = Object.keys(allCards).filter((k) => !itemAssignment.has(k));
    return keys.map((k) => ({ key: k, card: allCards[k] }));
  }, [allCards, itemAssignment]);

  // Cards de acesso fixos atualmente ocultos (para o painel de restauração).
  const hiddenFixedCards = useMemo(
    () =>
      hiddenKeys
        .filter((k) => cardByKey[k])
        .map((k) => ({ key: k, card: cardByKey[k] })),
    [hiddenKeys],
  );

  // Contagem de fornecedores por subgrupo (macro.sub): cruza customSuppliers do
  // scope "aquario" com a nota (fields.subgroupId).
  const countBySubgroup = useMemo<Record<string, number>>(() => {
    return countSuppliersBySubgroup(aquarioSuppliers, aquarioNotes.entries);
  }, [aquarioSuppliers, aquarioNotes.entries]);

  // Cards de SUBGRUPO (macro.sub) por número de macro. Cada subgrupo vira um card
  // clicável que abre seu dashboard dedicado (/subgrupo/:id).
  const subgroupCardsByMacro = useMemo<Record<number, DashboardCardData[]>>(() => {
    const map: Record<number, DashboardCardData[]> = {};
    // Nomes (normalizados) dos itens de cada macro — usados para NÃO duplicar:
    // se um subgrupo numerado tem o mesmo nome de um item já presente no macro
    // (ex.: 1.3 · Tapete Higiênico Pet), o item original já é o acesso e o
    // subgrupo serve apenas de vínculo de filtro — então NÃO criamos card extra.
    const normName = (s: string) =>
      s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const itemNamesByMacro = new Map<number, Set<string>>();
    for (const m of macros) {
      const set = new Set<string>();
      for (const it of m.items ?? []) set.add(normName(it.label));
      itemNamesByMacro.set(m.number, set);
    }
    for (const sg of subgroups) {
      // Pula subgrupos que coincidem com um item já exibido no mesmo macro.
      if (itemNamesByMacro.get(sg.macroNumber)?.has(normName(sg.name))) continue;
      const count = countBySubgroup[sg.id] ?? 0;
      const hier = formatSubgroupNumber(sg.macroNumber, sg.sub);
      const card: DashboardCardData = {
        href: `/subgrupo/${sg.id}`,
        eyebrow: sg.name,
        title: sg.name,
        subtitle: sg.subtitle?.trim() || "Subgrupo do macro",
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
  }, [subgroups, countBySubgroup, macros]);

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
          <div
            className="hidden md:flex items-center gap-3 text-xs"
            style={{ color: "oklch(0.65 0.02 80)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: "oklch(0.78 0.16 75)" }} />
            <span>{totalCards} ACESSOS · ATUALIZADO MAI/2026</span>
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

          {/* Botões: Resumo das Negociações + Calculadora (mesmo tamanho/estilo) */}
          <div className="capa-anim mb-10 flex flex-wrap gap-3" style={{ animationDelay: "0.15s" }}>
            <button
              onClick={() => setSummaryOpen(true)}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, oklch(0.78 0.16 75 / 0.18), oklch(0.55 0.18 25 / 0.18))",
                border: "1px solid oklch(0.78 0.16 75 / 0.5)",
                color: "oklch(0.94 0.08 80)",
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "0.02em",
                boxShadow: "0 8px 30px oklch(0.78 0.16 75 / 0.12)",
              }}
              title="Resumo das Negociações (visão executiva)"
            >
              <ClipboardList className="w-4.5 h-4.5" style={{ color: "oklch(0.82 0.14 75)" }} />
              <span>Resumo das Negociações</span>
            </button>
            <button
              onClick={() => setCalcOpen(true)}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, oklch(0.78 0.16 75 / 0.18), oklch(0.55 0.18 25 / 0.18))",
                border: "1px solid oklch(0.78 0.16 75 / 0.5)",
                color: "oklch(0.94 0.08 80)",
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "0.02em",
                boxShadow: "0 8px 30px oklch(0.78 0.16 75 / 0.12)",
              }}
              title="Calculadora de custo de importação"
            >
              <Calculator className="w-4.5 h-4.5" style={{ color: "oklch(0.82 0.14 75)" }} />
              <span>Calculadora</span>
            </button>
          </div>

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
              Classificação geral de grupos macro
            </h2>
            <div
              className="text-xs uppercase tracking-[0.2em] font-semibold mt-2"
              style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'Inter', sans-serif" }}
            >
              Acesso direto à inteligência
            </div>
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
          // Macros recém-criados (sem itens/subgrupos) DEVEM aparecer na lista,
          // com um estado vazio e atalho para adicionar conteúdo. Antes eles
          // ficavam ocultos (return null) e pareciam "não ter sido criados".
          const isEmptyMacro = totalAcessos === 0;
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

                {/* Excluir macro inteiro (remove a classificação; itens voltam para "Sem classificação") */}
                <button
                  type="button"
                  onClick={() =>
                    setMacroToDelete({
                      id: m.id,
                      number: m.number,
                      name: m.name,
                      itemCount: totalAcessos,
                    })
                  }
                  title={`Excluir macro ${m.number} · ${m.name}`}
                  aria-label={`Excluir macro ${m.number} · ${m.name}`}
                  className="w-9 h-9 rounded-md flex items-center justify-center border flex-shrink-0 transition-colors hover:brightness-125 active:scale-[0.92]"
                  style={{
                    borderColor: "oklch(0.30 0.05 25)",
                    background: "oklch(0.14 0.03 25)",
                    color: "oklch(0.70 0.16 25)",
                    transitionDuration: "160ms",
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg, ${m.color}55, transparent)` }} />
              </div>

              {!collapsed && (
                <>
                  {isEmptyMacro && (
                    <div
                      className="rounded-2xl border border-dashed p-6 mb-4 text-center"
                      style={{ borderColor: `${m.color}55`, background: `${m.color}0d` }}
                    >
                      <div
                        className="text-sm"
                        style={{ color: "oklch(0.72 0.02 80)" }}
                      >
                        Esta classificação ainda não tem acessos. Adicione um
                        fornecedor abaixo ou organize dashboards/subgrupos em
                        <strong> Criar novo Macro</strong>.
                      </div>
                    </div>
                  )}
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
                      // Cards de ACESSO FIXOS (Terrário, Aquário, Tapete, Yiwu)
                      // ganham botão de ocultar (remove do portal sem apagar dados).
                      const isFixed = !!cardByKey[it.key];
                      const promotedId = it.key.startsWith("group:")
                        ? it.key.slice("group:".length)
                        : null;
                      const promoted = promotedId
                        ? customGroups.find((g) => g.id === promotedId)
                        : null;
                      return (
                        <DashboardCard
                          key={it.key}
                          d={d}
                          index={idx}
                          onDelete={
                            isFixed
                              ? () => setCardToHide({ key: it.key, title: base.title })
                              : undefined
                          }
                          deleteTitle={isFixed ? `Remover “${base.title}” do portal` : undefined}
                          onChangeColor={
                            isFixed
                              ? (color) => void setColor(it.key, color)
                              : promoted
                                ? (color) => void updateGroup(promoted.id, { color })
                                : undefined
                          }
                          currentColor={
                            isFixed ? colorFor(it.key) : promoted?.color
                          }
                        />
                      );
                    })}
                    {/* Cards dos subgrupos macro.sub criados neste macro */}
                    {subgroupCards.map((d, idx) => {
                      const sgId = d.href.split("/").pop() ?? "";
                      const sg = subgroups.find((s) => s.id === sgId);
                      return (
                        <DashboardCard
                          key={d.href}
                          d={d}
                          index={items.length + idx}
                          onDelete={
                            sg
                              ? () =>
                                  setSubgroupToDelete({
                                    id: sg.id,
                                    label: formatSubgroupNumber(sg.macroNumber, sg.sub),
                                    name: sg.name,
                                    count: countBySubgroup[sg.id] ?? 0,
                                  })
                              : undefined
                          }
                          deleteTitle={
                            sg
                              ? `Excluir subgrupo ${formatSubgroupNumber(sg.macroNumber, sg.sub)}`
                              : undefined
                          }
                          onChangeColor={
                            sg ? (color) => void updateSubgroup(sg.id, { color }) : undefined
                          }
                          currentColor={sg?.color}
                        />
                      );
                    })}
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
              {unclassifiedCards.map(({ key, card }, idx) => {
                const isFixed = !!cardByKey[key];
                const promotedId = key.startsWith("group:")
                  ? key.slice("group:".length)
                  : null;
                const sgId = key.startsWith("subgroupCard:")
                  ? key.slice("subgroupCard:".length)
                  : card.href.startsWith("/subgrupo/")
                    ? card.href.split("/").pop() ?? null
                    : null;
                const promoted = promotedId
                  ? customGroups.find((g) => g.id === promotedId)
                  : null;
                const sg = sgId ? subgroups.find((s) => s.id === sgId) : null;
                const onChangeColor = isFixed
                  ? (color: string) => void setColor(key, color)
                  : promoted
                    ? (color: string) => void updateGroup(promoted.id, { color })
                    : sg
                      ? (color: string) => void updateSubgroup(sg.id, { color })
                      : undefined;
                const currentColor = isFixed
                  ? colorFor(key)
                  : promoted?.color ?? sg?.color;
                return (
                  <DashboardCard
                    key={card.href}
                    d={card}
                    index={idx}
                    onDelete={
                      isFixed
                        ? () => setCardToHide({ key, title: card.title })
                        : undefined
                    }
                    deleteTitle={isFixed ? `Remover “${card.title}” do portal` : undefined}
                    onChangeColor={onChangeColor}
                    currentColor={currentColor}
                  />
                );
              })}
              {/* Card avulso "Adicionar Fornecedores" ocultado a pedido do usuário:
                  o cadastro agora é feito pelo botão "Adicionar fornecedor" dentro de cada macro. */}
            </div>
          </div>
        )}

        {/* Cards removidos do portal (restauráveis) */}
        {hiddenFixedCards.length > 0 && (
          <div className="mb-12">
            <button
              type="button"
              onClick={() => setHiddenPanelOpen((v) => !v)}
              className="flex items-center gap-3 mb-5 w-full text-left group active:scale-[0.997]"
              style={{ transition: "transform 160ms cubic-bezier(0.23, 1, 0.32, 1)" }}
              aria-expanded={hiddenPanelOpen}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(0.18 0.03 25)", border: "1px solid oklch(0.30 0.05 25)", color: "oklch(0.70 0.16 25)" }}
              >
                <EyeOff className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span
                  className="block text-[10px] tracking-[0.22em] uppercase font-semibold"
                  style={{ color: "oklch(0.5 0.02 80)", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Removidos do portal
                </span>
                <span
                  className="block"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "oklch(0.97 0.01 80)",
                    lineHeight: 1.1,
                  }}
                >
                  Cards removidos ({hiddenFixedCards.length})
                </span>
              </span>
              <span className="flex items-center justify-center flex-shrink-0" style={{ color: "oklch(0.6 0.02 80)" }}>
                {hiddenPanelOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </span>
              <div className="flex-1 h-px ml-2" style={{ background: "linear-gradient(90deg, oklch(0.30 0.05 25), transparent)" }} />
            </button>

            {hiddenPanelOpen && (
              <div className="flex flex-col gap-3">
                {hiddenFixedCards.map(({ key, card }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 rounded-xl p-4 border"
                    style={{ background: "oklch(0.10 0.02 250)", borderColor: "oklch(0.22 0.03 250)" }}
                  >
                    <div className="min-w-0">
                      <div
                        className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-1"
                        style={{ color: "oklch(0.55 0.02 80)", fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {card.eyebrow}
                      </div>
                      <div
                        className="truncate"
                        style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", fontWeight: 600, color: "oklch(0.95 0.01 80)" }}
                      >
                        {card.title}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void showCard(key)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold uppercase tracking-[0.12em] flex-shrink-0 transition-colors hover:brightness-110 active:scale-[0.97]"
                      style={{
                        borderColor: "oklch(0.72 0.19 145 / 0.5)",
                        background: "oklch(0.72 0.19 145 / 0.1)",
                        color: "oklch(0.82 0.15 145)",
                        fontFamily: "'Inter', sans-serif",
                        transitionDuration: "160ms",
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            )}
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

      <Suspense fallback={null}>
        {summaryOpen && <NegotiationSummaryPanel open={summaryOpen} onClose={() => setSummaryOpen(false)} />}
        {calcOpen && <CalculatorPanel open={calcOpen} onClose={() => setCalcOpen(false)} />}
      </Suspense>

      {addToMacro && (
        <AddSupplierToMacroDialog
          open={!!addToMacro}
          macroNumber={addToMacro.number}
          macroName={addToMacro.name}
          onClose={() => setAddToMacro(null)}
          onCreated={() => setAddToMacro(null)}
        />
      )}

      {/* Confirmação de exclusão de subgrupo (desvincula fornecedores, não os apaga) */}
      <AlertDialog
        open={!!subgroupToDelete}
        onOpenChange={(o) => {
          if (!o && !deletingSubgroup) setSubgroupToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir o subgrupo {subgroupToDelete?.label} · {subgroupToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os fornecedores marcados com ele NÃO serão apagados, apenas perderão o vínculo.
              {subgroupToDelete && subgroupToDelete.count > 0
                ? ` (${subgroupToDelete.count} fornecedor${
                    subgroupToDelete.count === 1 ? "" : "es"
                  } serão desvinculados)`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSubgroup}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteSubgroup();
              }}
              disabled={deletingSubgroup}
            >
              {deletingSubgroup ? "Excluindo…" : "Excluir subgrupo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de ocultar card de acesso fixo (remove do portal, não apaga dados) */}
      <AlertDialog
        open={!!cardToHide}
        onOpenChange={(o) => {
          if (!o && !hidingCard) setCardToHide(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover “{cardToHide?.title}” do portal?</AlertDialogTitle>
            <AlertDialogDescription>
              O card sai da página inicial, mas NENHUM dado é apagado: os fornecedores,
              anexos e o dashboard correspondente continuam existindo. Você pode
              restaurá-lo a qualquer momento em “Cards removidos”, no fim da página.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={hidingCard}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleHideCard();
              }}
              disabled={hidingCard}
            >
              {hidingCard ? "Removendo…" : "Remover do portal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de exclusão de macro inteiro (itens voltam para "Sem classificação") */}
      <AlertDialog
        open={!!macroToDelete}
        onOpenChange={(o) => {
          if (!o && !deletingMacro) setMacroToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir o macro {macroToDelete?.number} · {macroToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A classificação macro será removida. Os itens que estavam dentro dela
              (dashboards, subgrupos e grupos) NÃO serão apagados — voltam para a seção
              “Sem classificação macro” e podem ser reorganizados depois.
              {macroToDelete && macroToDelete.itemCount > 0
                ? ` (${macroToDelete.itemCount} acesso${
                    macroToDelete.itemCount === 1 ? "" : "s"
                  } serão desclassificados)`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingMacro}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteMacro();
              }}
              disabled={deletingMacro}
            >
              {deletingMacro ? "Excluindo…" : "Excluir macro"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
