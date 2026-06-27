// =============================================================================
// importTax.ts — Tabela de NCMs e cálculo da cadeia tributária de importação.
//
// Premissas confirmadas com o usuário (Fernando — empresa em MG com benefício
// TTS / Corredor de Importação):
//   - ICMS de importação SEMPRE ZERADO (benefício TTS, mercadoria p/ revenda).
//     IMPORTANTE: o TTS é benefício ESTADUAL (só ICMS). PIS/COFINS-Importação
//     são federais e NÃO são afetados pelo TTS — devem ser pagos na DI.
//   - PIS/COFINS = alíquotas de IMPORTAÇÃO: PIS 2,1% + COFINS 9,65% (Lei
//     10.865/2004; base = valor aduaneiro desde a Lei 12.865/2013). Aqui a base
//     usada é a base declarada (valor real × CI%), por opção do usuário.
//   - A "CI%" é o percentual do valor real usado como base declarada (abaixo do
//     real). Essa base reduzida aplica em TODA a cadeia (seguro, II, IPI, PIS,
//     COFINS).
//   - Seguro internacional: 0,40% sobre a base declarada (valor × CI%). Entra no
//     valor aduaneiro ANTES do II.
//   - Frete marítimo (US$): pago 1x ao fornecedor (entra no custo) e também
//     compõe a base do II/cadeia. Frete terrestre (R$): somado direto.
//   - AFRMM: 8% sobre o frete marítimo. Taxa Siscomex: R$ 200 fixo.
//   - Despesas portuárias (Santos, container 40 pés): THC + ISPS +
//     desconsolidação + armazenagem curta (3-4 dias) + liberação. Padrão
//     R$ 3.500, editável. Somado direto ao custo total (em R$).
//
// Cadeia (em cascata), tudo em US$ até converter:
//   baseDeclarada      = valorRealTotalUSD × (CI%/100)
//   seguroUSD          = baseDeclarada × (seguro%/100)
//   valorAduaneiro     = baseDeclarada + freteMaritimoUSD + seguroUSD  // base II
//   II                 = valorAduaneiro × (II%/100)
//   IPI                = (valorAduaneiro + II) × (IPI%/100)
//   PIS  (importação)  = valorAduaneiro × (PIS%/100)    // 2,1%
//   COFINS (importação)= valorAduaneiro × (COFINS%/100) // 9,65%
//   ICMS importação    = 0  (TTS)
//   tributosUSD        = II + IPI + PIS + COFINS
//   AFRMM (R$)         = freteMaritimoUSD × cotacao × 8%
//   Siscomex (R$)      = R$ 200 fixo
//   despesasPorto (R$) = valor editável (padrão R$ 3.500)
//   comissaoUSD        = valorRealTotalUSD × (comissaoBety%/100)
//
//   custoTotalBRL = (valorRealTotalUSD + freteMaritimoUSD + seguroUSD
//                    + tributosUSD + comissaoUSD) × cotacao
//                   + freteTerrestreBRL + afrmmBRL + siscomexBRL + despesasPortoBRL
//   custoUnitarioBRL = custoTotalBRL / quantidade
// =============================================================================

export interface NcmEntry {
  ncm: string;
  produto: string;
  ii: number; // %
  ipi: number; // %
  obs?: string;
}

// PIS/COFINS de IMPORTAÇÃO (Lei 10.865/2004). NÃO são afetados pelo TTS (ICMS).
export const PIS_PCT = 2.1;
export const COFINS_PCT = 9.65;
// Seguro internacional: 0,40% sobre a base declarada (valor × CI%).
export const SEGURO_PCT = 0.4;
// AFRMM fixo (8% sobre o frete marítimo internacional).
export const AFRMM_PCT = 8;
// Taxa Siscomex fixa (R$ 200).
export const SISCOMEX_DEFAULT = 200;
// Despesas portuárias padrão para container de 40 pés em Santos (editável).
// Inclui THC + ISPS + desconsolidação + armazenagem (3-4 dias) + liberação.
export const DESPESAS_PORTO_DEFAULT = 3500;

// Tabela base de NCMs usados pela empresa. Editável/expansível na tela.
// Alíquotas levantadas em jun/2026 (TEC/Gecex + TIPI Decreto 11.158/2022).
export const NCM_TABLE: NcmEntry[] = [
  { ncm: "6306.22.00", produto: "Barraca de camping (tenda)", ii: 35, ipi: 6.5 },
  { ncm: "4202.92.00", produto: "Bolsa para Pet", ii: 35, ipi: 6.5, obs: "ST CEST 19.005.00" },
  { ncm: "8436.21.00", produto: "Chocadeira / Incubadora", ii: 12, ipi: 0, obs: "possível ex-tarifário → II 2%" },
  { ncm: "3924.10.00", produto: "Utensílios de plástico (Bety/Marmita)", ii: 16.2, ipi: 6.75 },
  { ncm: "5603.92.20", produto: "Falso Tecido / Perflex", ii: 26, ipi: 0, obs: "IPI NT" },
  { ncm: "7326.90.00", produto: "Gaiola de arame", ii: 18, ipi: 5, obs: "reclass. 7326.90.90" },
  { ncm: "7117.19.00", produto: "Joias (bijuteria)", ii: 35, ipi: 7.8, obs: "II via LETEC (era 18%)" },
  { ncm: "8543.70.20", produto: "Matador de mosquito", ii: 16.2, ipi: 6.5 },
  { ncm: "7615.10.00", produto: "Panelas de alumínio", ii: 14.4, ipi: 6.5 },
  { ncm: "3923.21.90", produto: "Sr. Wu (sacos de lixo)", ii: 18, ipi: 9.75 },
  { ncm: "4818.90.90", produto: "Tapete higiênico", ii: 14.4, ipi: 3.25 },
  { ncm: "7013.99.00", produto: "Terrário (vidro)", ii: 16.2, ipi: 9.75 },
  { ncm: "7013.37.00", produto: "Vidro - Copos", ii: 25, ipi: 9.75 },
  { ncm: "7013.49.00", produto: "Vidro - Pratos/travessas", ii: 25, ipi: 6.5 },
  { ncm: "4421.91.00", produto: "Bambu", ii: 14, ipi: 0, obs: "IPI NT" },
  { ncm: "5601.22.99", produto: "Fibra", ii: 16.2, ipi: 0, obs: "IPI NT; alt. 3926.90.90" },
  { ncm: "4421.99.00", produto: "Madeira", ii: 14, ipi: 0, obs: "IPI NT" },
  { ncm: "8210.00.90", produto: "Aparelho manual fab. espetos", ii: 16.2, ipi: 6.5 },
  { ncm: "8202.20.00", produto: "Lâmina de serra de fita", ii: 16.2, ipi: 5.2 },
  { ncm: "8202.39.00", produto: "Lâmina de serra circular", ii: 16.2, ipi: 5.2 },
  { ncm: "9403.20.90", produto: "Estante/Prateleira metálica", ii: 16.2, ipi: 3.25 },
  { ncm: "8716.80.00", produto: "Carrinho metálico", ii: 35, ipi: 0 },
  { ncm: "8479.89.99", produto: "Máquina de seleção/estampagem", ii: 14, ipi: 0, obs: "possível ex-tarifário → II 0" },
  { ncm: "8422.40.90", produto: "Máquina de embalagem", ii: 12.6, ipi: 0, obs: "ex-tarifários (II 0-2%)" },
];

// Normaliza um NCM digitado (remove tudo que não é dígito e re-formata xxxx.xx.xx).
export function normalizeNcm(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`;
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
}

// Procura uma entrada da tabela pelo NCM (comparando só os dígitos).
export function findNcm(raw: string): NcmEntry | undefined {
  const key = (raw || "").replace(/\D/g, "");
  if (!key) return undefined;
  return NCM_TABLE.find((e) => e.ncm.replace(/\D/g, "") === key);
}

export interface ImportTaxInput {
  cotacao: number; // R$/US$
  precoUnitUSD: number; // valor real por unidade (US$)
  quantidade: number;
  ciPct: number; // % do valor real usado como base declarada
  iiPct: number; // %
  ipiPct: number; // %
  pisPct: number; // % (importação)
  cofinsPct: number; // % (importação)
  seguroPct: number; // % sobre a base declarada
  freteMaritimoUSD: number;
  freteTerrestreBRL: number;
  comissaoPct: number; // % sobre o valor real
  afrmmPct: number; // % sobre o frete marítimo
  siscomexBRL: number; // taxa fixa
  despesasPortoBRL: number; // despesas portuárias (Santos, 40 pés)
}

export interface ImportTaxResult {
  valorRealTotalUSD: number;
  baseDeclaradaUSD: number;
  seguroUSD: number;
  valorAduaneiroUSD: number; // base declarada + frete marítimo + seguro
  iiUSD: number;
  ipiUSD: number;
  pisUSD: number;
  cofinsUSD: number;
  icmsUSD: number; // sempre 0 (TTS)
  tributosUSD: number; // II+IPI+PIS+COFINS
  comissaoUSD: number;
  freteMaritimoUSD: number;
  afrmmBRL: number;
  siscomexBRL: number;
  freteTerrestreBRL: number;
  despesasPortoBRL: number;
  custoTotalBRL: number;
  custoUnitarioBRL: number;
}

export function computeImportCost(inp: ImportTaxInput): ImportTaxResult {
  const valorRealTotalUSD = inp.precoUnitUSD * inp.quantidade;
  const baseDeclaradaUSD = valorRealTotalUSD * (inp.ciPct / 100);
  const seguroUSD = baseDeclaradaUSD * (inp.seguroPct / 100);
  const valorAduaneiroUSD = baseDeclaradaUSD + inp.freteMaritimoUSD + seguroUSD;

  const iiUSD = valorAduaneiroUSD * (inp.iiPct / 100);
  const ipiUSD = (valorAduaneiroUSD + iiUSD) * (inp.ipiPct / 100);
  const pisUSD = valorAduaneiroUSD * (inp.pisPct / 100);
  const cofinsUSD = valorAduaneiroUSD * (inp.cofinsPct / 100);
  const icmsUSD = 0; // TTS — ICMS de importação zerado

  const tributosUSD = iiUSD + ipiUSD + pisUSD + cofinsUSD + icmsUSD;
  const comissaoUSD = valorRealTotalUSD * (inp.comissaoPct / 100);

  const afrmmBRL = inp.freteMaritimoUSD * inp.cotacao * (inp.afrmmPct / 100);
  const siscomexBRL = inp.siscomexBRL;
  const freteTerrestreBRL = inp.freteTerrestreBRL;
  const despesasPortoBRL = inp.despesasPortoBRL;

  const subtotalUSD = valorRealTotalUSD + inp.freteMaritimoUSD + seguroUSD + tributosUSD + comissaoUSD;
  const custoTotalBRL =
    subtotalUSD * inp.cotacao + freteTerrestreBRL + afrmmBRL + siscomexBRL + despesasPortoBRL;
  const custoUnitarioBRL = inp.quantidade > 0 ? custoTotalBRL / inp.quantidade : 0;

  return {
    valorRealTotalUSD,
    baseDeclaradaUSD,
    seguroUSD,
    valorAduaneiroUSD,
    iiUSD,
    ipiUSD,
    pisUSD,
    cofinsUSD,
    icmsUSD,
    tributosUSD,
    comissaoUSD,
    freteMaritimoUSD: inp.freteMaritimoUSD,
    afrmmBRL,
    siscomexBRL,
    freteTerrestreBRL,
    despesasPortoBRL,
    custoTotalBRL,
    custoUnitarioBRL,
  };
}
