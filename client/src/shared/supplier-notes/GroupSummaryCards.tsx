// =============================================================================
// GroupSummaryCards — Cards agregadores de grupos de fornecedores.
//
// Mostra um card para CADA grupo criado em useSupplierGroups que tenha pelo
// menos 1 fornecedor marcado dentro do dashboard atual (scope). Cada card
// exibe: Nº (badge colorido), nome do grupo, ramo/legenda, contagem total e
// uma prévia dos fornecedores agrupados (até 8 nomes).
//
// O nome do fornecedor é resolvido por callback (cada dashboard sabe traduzir
// supplierId → nome de empresa).
// =============================================================================
import { useMemo, useState } from "react";
import { Users, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { useSupplierGroups, type SupplierGroup } from "./useSupplierGroups";
import { useSupplierNotes } from "./useSupplierNotes";

interface Props {
  scope: "aquario" | "tapete" | "yiwu";
  /** Resolver supplierId → nome humano do fornecedor (varia por dashboard) */
  resolveSupplierName: (supplierId: string) => string;
  /** Tom claro (cards brancos) ou escuro (Yiwu) */
  tone?: "light" | "dark";
  /** Cor de acento que combina com o dashboard */
  accent?: string;
  /** Número máximo de fornecedores listados antes de "ver mais" */
  previewLimit?: number;
}

interface AggregatedGroup {
  group: SupplierGroup;
  supplierIds: string[];
}

export function GroupSummaryCards({
  scope,
  resolveSupplierName,
  tone = "light",
  accent = "#0891b2",
  previewLimit = 8,
}: Props) {
  const { groups } = useSupplierGroups();
  const { entries } = useSupplierNotes(scope);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const aggregated: AggregatedGroup[] = useMemo(() => {
    const byGroup = new Map<string, string[]>();
    Object.values(entries).forEach((e) => {
      (e.groupIds ?? []).forEach((gid) => {
        if (!byGroup.has(gid)) byGroup.set(gid, []);
        byGroup.get(gid)!.push(e.supplierId);
      });
    });
    return groups
      .map((g) => ({ group: g, supplierIds: byGroup.get(g.id) ?? [] }))
      .filter((a) => a.supplierIds.length > 0)
      .sort((a, b) => a.group.number - b.group.number);
  }, [entries, groups]);

  const isDark = tone === "dark";

  if (groups.length === 0 || aggregated.length === 0) {
    return null;
  }

  const containerClass = isDark
    ? "rounded-xl border border-white/10 bg-white/[0.03] p-5"
    : "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm";

  const titleClass = isDark
    ? "text-[11px] font-mono uppercase tracking-[0.18em] text-white/60"
    : "text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-500";

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" style={{ color: accent }} />
          <h3 className={titleClass}>Cards de Grupo · Resumo automático</h3>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
            isDark ? "bg-white/10 text-white/70" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {aggregated.length} {aggregated.length === 1 ? "grupo ativo" : "grupos ativos"}
        </span>
      </div>
      <p
        className={`text-xs mb-4 ${
          isDark ? "text-white/55" : "text-zinc-500"
        }`}
      >
        Conforme você marca um grupo no painel de cada fornecedor, ele aparece
        agrupado aqui. Útil para depois promover um grupo inteiro a dashboard
        independente pela aba <strong>Adicionar Fornecedores</strong>.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {aggregated.map(({ group, supplierIds }) => {
          const isOpen = !!expanded[group.id];
          const visibleNames = (isOpen ? supplierIds : supplierIds.slice(0, previewLimit)).map(
            (sid) => ({ id: sid, name: resolveSupplierName(sid) }),
          );
          const hiddenCount = supplierIds.length - previewLimit;

          return (
            <div
              key={group.id}
              className={`relative rounded-xl border overflow-hidden transition-all ${
                isDark
                  ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
                  : "border-zinc-200 bg-zinc-50/50 hover:bg-white"
              }`}
              style={{ boxShadow: `inset 4px 0 0 0 ${group.color}` }}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm"
                    style={{ background: group.color }}
                    aria-label={`Grupo número ${group.number}`}
                  >
                    Nº{group.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`text-sm font-bold leading-tight truncate ${
                        isDark ? "text-white" : "text-zinc-900"
                      }`}
                      title={group.name}
                    >
                      {group.name}
                    </h4>
                    {group.legend && (
                      <p
                        className={`text-[11px] mt-0.5 truncate ${
                          isDark ? "text-white/55" : "text-zinc-500"
                        }`}
                        title={group.legend}
                      >
                        {group.legend}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 mb-2">
                  <Users
                    className={`w-3.5 h-3.5 ${
                      isDark ? "text-white/55" : "text-zinc-500"
                    }`}
                  />
                  <span
                    className={`text-2xl font-bold leading-none ${
                      isDark ? "text-white" : "text-zinc-900"
                    }`}
                  >
                    {supplierIds.length}
                  </span>
                  <span
                    className={`text-xs ${
                      isDark ? "text-white/55" : "text-zinc-500"
                    }`}
                  >
                    {supplierIds.length === 1 ? "fornecedor" : "fornecedores"}
                  </span>
                </div>

                <ul
                  className={`space-y-1 text-xs ${
                    isDark ? "text-white/75" : "text-zinc-700"
                  }`}
                >
                  {visibleNames.map(({ id, name }) => (
                    <li
                      key={id}
                      className="flex items-center gap-1.5 truncate"
                      title={name}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: group.color }}
                      />
                      <span className="truncate">{name}</span>
                    </li>
                  ))}
                </ul>

                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                    }
                    className={`mt-2 text-[11px] font-medium inline-flex items-center gap-1 transition-colors ${
                      isDark
                        ? "text-white/70 hover:text-white"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {isOpen ? (
                      <>
                        <ChevronUp className="w-3 h-3" /> Mostrar menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" /> Ver mais {hiddenCount}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GroupSummaryCards;
