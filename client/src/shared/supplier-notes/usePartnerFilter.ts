// =============================================================================
// usePartnerFilter — carrega TODOS os dados necessários e produz a agregação
// global por "Parceiro Chinês Responsável".
//
// Fontes (todas já existentes no backend, via tRPC):
//   - data.notes.listAll        → notas de todos os scopes (fields + attachments)
//   - data.customSuppliers.list → fornecedores manuais (todos os scopes)
//   - data.suppliers.list       → fornecedores "extras" (dashboards promovidos)
//   - data.subgroups.list       → subgrupos numerados (macro.sub)
//   - data.macros.list          → macros da Home (com items)
//
// Devolve:
//   - results: PartnerResult[]  (árvore macro→subgrupo→fornecedores por parceiro)
//   - suggestions: string[]     (nomes distintos para autocompletar o filtro)
//   - loading, byPartner(name)  (atalho para um parceiro específico)
// =============================================================================

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  aggregateByPartner,
  collectPartnerNames,
  type AggNote,
  type AggSupplier,
  type AggExtraSupplier,
  type AggSubgroup,
  type AggMacro,
  type PartnerResult,
} from "./partnerAggregation";
import { normalizePartner } from "./partners";

function parseAttachments(raw: unknown): { id: string; name: string; category?: string }[] {
  let arr: unknown = raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a) => ({
      id: String(a.id ?? ""),
      name: String(a.name ?? "arquivo"),
      category: typeof a.category === "string" ? a.category : undefined,
    }));
}

export function usePartnerFilter() {
  const notesQ = trpc.data.notes.listAll.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  // scope opcional omitido → retorna custom suppliers de TODOS os scopes.
  const customQ = trpc.data.customSuppliers.list.useQuery(
    {},
    { refetchInterval: 5000, refetchOnWindowFocus: true },
  );
  const extraQ = trpc.data.suppliers.list.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const subgroupsQ = trpc.data.subgroups.list.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const macrosQ = trpc.data.macros.list.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const notes = useMemo<AggNote[]>(() => {
    return (notesQ.data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        scope: String(r.scope ?? ""),
        supplierId: String(r.supplierId ?? ""),
        fields: (r.fields as Record<string, string>) ?? {},
        attachments: parseAttachments(r.attachments),
      };
    });
  }, [notesQ.data]);

  const customSuppliers = useMemo<AggSupplier[]>(() => {
    return (customQ.data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      // O nome canônico fica na coluna `name`; o JSON `data` também tem name.
      let name = String(r.name ?? "");
      if (!name && typeof r.data === "string") {
        try {
          name = String(JSON.parse(r.data)?.name ?? "");
        } catch {
          /* ignore */
        }
      }
      return {
        id: String(r.id ?? ""),
        scope: String(r.scope ?? ""),
        name: name || String(r.id ?? ""),
      };
    });
  }, [customQ.data]);

  const extraSuppliers = useMemo<AggExtraSupplier[]>(() => {
    return (extraQ.data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id ?? ""),
        groupId: String(r.groupId ?? ""),
        name: String(r.name ?? r.id ?? ""),
      };
    });
  }, [extraQ.data]);

  const subgroups = useMemo<AggSubgroup[]>(() => {
    return (subgroupsQ.data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id ?? ""),
        macroNumber: Number(r.macroNumber ?? 0),
        sub: Number(r.sub ?? 0),
        name: String(r.name ?? ""),
        color: String(r.color ?? "#10b981"),
      };
    });
  }, [subgroupsQ.data]);

  const macros = useMemo<AggMacro[]>(() => {
    return (macrosQ.data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const itemsRaw = Array.isArray(r.items) ? r.items : [];
      const items = itemsRaw
        .filter((it): it is Record<string, unknown> => !!it && typeof it === "object")
        .map((it) => ({
          key: String(it.key ?? ""),
          refId: String(it.refId ?? ""),
          label: String(it.label ?? ""),
          href: String(it.href ?? "/"),
        }));
      return {
        id: String(r.id ?? ""),
        number: Number(r.number ?? 0),
        name: String(r.name ?? ""),
        color: String(r.color ?? "#8b5cf6"),
        items,
      };
    });
  }, [macrosQ.data]);

  const results = useMemo<PartnerResult[]>(
    () =>
      aggregateByPartner({
        notes,
        customSuppliers,
        extraSuppliers,
        subgroups,
        macros,
      }),
    [notes, customSuppliers, extraSuppliers, subgroups, macros],
  );

  const suggestions = useMemo<string[]>(() => collectPartnerNames(notes), [notes]);

  const loading =
    notesQ.isLoading ||
    customQ.isLoading ||
    extraQ.isLoading ||
    subgroupsQ.isLoading ||
    macrosQ.isLoading;

  const byPartner = (name: string): PartnerResult | null => {
    const key = normalizePartner(name);
    return results.find((r) => r.key === key) ?? null;
  };

  return { results, suggestions, loading, byPartner };
}
