// =============================================================================
// staticSupplierSources — expõe os fornecedores das BASES ESTÁTICAS dos três
// dashboards fixos (Aquário, Tapete, Yiwu) no formato NegotiationSupplierInput.
//
// CONTEXTO DO BUG QUE ISTO RESOLVE
// --------------------------------
// O painel de anotações de cada dashboard fixo é montado com um supplierId que
// vem da base ESTÁTICA do próprio dashboard, NÃO de custom_suppliers:
//   - Aquário (DiaryCard): scope "aquario", supplierId = supplier.id  (ex.: "mclanzoo")
//   - Tapete (Anotacoes):  scope "tapete",  supplierId = fab.nome     (ex.: "ZHEJIANG ECOCOM CHINA")
//   - Yiwu (Anotacoes):    scope "yiwu",    supplierId = String(s.id)  (ex.: "42")
//
// Já o "Resumo das Negociações" (useNegotiationLevel3) montava a lista-base APENAS
// a partir de useCustomSuppliers/useExtraSuppliers. Logo, qualquer fornecedor da
// base estática (a grande maioria) que recebesse selos (potencial/preço/status)
// NUNCA aparecia no Resumo, mesmo com a nota corretamente preenchida.
//
// Este módulo devolve, para cada scope fixo, a lista de fornecedores estáticos no
// MESMO formato e com o MESMO id usado ao salvar a nota — para que
// buildNegotiationSuppliers consiga casar a nota e incluí-los no Resumo.
//
// É uma camada puramente ADITIVA e somente leitura (não altera dados).
// =============================================================================
import aquarioSuppliers from "@aquario/data/suppliers";
import { todosExportadores } from "@tapete/lib/data";
import yiwuData from "@yiwu/data/suppliers.json";
import type { NegotiationSupplierInput } from "./negotiationAccesses";

interface YiwuSupplierRaw {
  id: number;
  name: string;
  district?: string;
  location?: string;
  address?: string;
}

/**
 * Fornecedores estáticos do dashboard Aquário.
 * id = supplier.id (igual ao supplierId salvo pelo DiaryCard).
 */
function aquarioStatic(): NegotiationSupplierInput[] {
  return aquarioSuppliers.map((s) => ({
    id: s.id,
    name: s.name,
    city: s.city ?? null,
    province: s.province ?? null,
    district: null,
    address: null,
  }));
}

/**
 * Fornecedores estáticos do dashboard Tapete (lista todosExportadores).
 * id = nome (igual ao supplierId salvo por Anotacoes do Tapete: fab.nome).
 * A lista estática só traz província (sem cidade/endereço estruturado).
 */
function tapeteStatic(): NegotiationSupplierInput[] {
  return todosExportadores.map((e) => ({
    id: e.nome,
    name: e.nome,
    city: null,
    province: e.provincia ?? null,
    district: null,
    address: null,
  }));
}

/**
 * Fornecedores estáticos do dashboard Yiwu (suppliers.json).
 * id = String(s.id) (igual ao supplierId salvo por Anotacoes do Yiwu).
 */
function yiwuStatic(): NegotiationSupplierInput[] {
  const list = (yiwuData as { suppliers: YiwuSupplierRaw[] }).suppliers ?? [];
  return list.map((s) => ({
    id: String(s.id),
    name: s.name,
    city: null,
    province: null,
    district: s.district ?? null,
    address: s.address ?? s.location ?? null,
  }));
}

/**
 * Mapa supplierId -> subtipo ("aquario" | "terrario") derivado da CATEGORIA
 * original da base estática do Aquário. Serve de FALLBACK para o acesso de
 * subtipo do Resumo quando a nota não tem `fields.subtipoAquario` gravado —
 * espelhando a "categoria efetiva" usada na Home do Aquário.
 */
export function aquarioSubtipoById(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of aquarioSuppliers) {
    if (s.category === "aquario" || s.category === "terrario") {
      map[s.id] = s.category;
    }
  }
  return map;
}

/**
 * Retorna os fornecedores da base estática correspondente a um scope fixo.
 * Scopes desconhecidos (grupos personalizados, dashboards promovidos) não têm
 * base estática e retornam lista vazia.
 */
export function staticSuppliersForScope(
  scope: string,
): NegotiationSupplierInput[] {
  switch (scope) {
    case "aquario":
      return aquarioStatic();
    case "tapete":
      return tapeteStatic();
    case "yiwu":
      return yiwuStatic();
    default:
      return [];
  }
}

/**
 * Mescla a base ESTÁTICA com a base de CUSTOM suppliers, deduplicando por id.
 * O custom suppliers tem PRIORIDADE (vem primeiro): se um id existir nas duas
 * fontes, mantemos o registro custom (dados editados pelo usuário) e ignoramos
 * o estático. Mantém ordem estável (custom primeiro, depois estáticos novos).
 */
export function mergeSupplierInputs(
  primary: NegotiationSupplierInput[],
  secondary: NegotiationSupplierInput[],
): NegotiationSupplierInput[] {
  const seen = new Set<string>();
  const out: NegotiationSupplierInput[] = [];
  for (const s of primary) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  for (const s of secondary) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}
