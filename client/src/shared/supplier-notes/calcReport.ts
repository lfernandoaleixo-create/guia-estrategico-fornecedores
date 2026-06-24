// =============================================================================
// calcReport.ts — geração do relatório da simulação (PDF imprimível + JSON).
//
// Não depende de bibliotecas externas: monta um HTML autossuficiente e abre a
// caixa de impressão do navegador (o usuário escolhe "Salvar como PDF").
// O relatório traz os parâmetros de entrada, o resultado, o detalhamento
// tributário e a EXPLICAÇÃO passo a passo de cada conta com os números reais.
// =============================================================================
import type { ImportTaxInput, ImportTaxResult } from "./importTax";

export interface CalcSnapshot {
  nome: string;
  ncm: string;
  ncmObs?: string;
  input: ImportTaxInput;
  result: ImportTaxResult;
  geradoEm: number; // Unix ms (UTC)
}

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const USD = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "USD" });
const PCT = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
const NUM = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Monta a lista de passos da memória de cálculo com os números reais.
export function buildSteps(snap: CalcSnapshot): { titulo: string; formula: string; conta: string; resultado: string }[] {
  const i = snap.input;
  const r = snap.result;
  const steps: { titulo: string; formula: string; conta: string; resultado: string }[] = [];

  steps.push({
    titulo: "1. Valor real total da mercadoria (US$)",
    formula: "preço real por unidade × quantidade",
    conta: `${USD(i.precoUnitUSD)} × ${NUM(i.quantidade)} un`,
    resultado: USD(r.valorRealTotalUSD),
  });

  steps.push({
    titulo: "2. Base declarada (CI%)",
    formula: "valor real total × CI%",
    conta: `${USD(r.valorRealTotalUSD)} × ${PCT(i.ciPct)}`,
    resultado: USD(r.baseDeclaradaUSD),
  });

  steps.push({
    titulo: "3. Valor aduaneiro (base da cadeia tributária)",
    formula: "base declarada + frete marítimo",
    conta: `${USD(r.baseDeclaradaUSD)} + ${USD(i.freteMaritimoUSD)}`,
    resultado: USD(r.valorAduaneiroUSD),
  });

  steps.push({
    titulo: "4. II — Imposto de Importação",
    formula: "valor aduaneiro × II%",
    conta: `${USD(r.valorAduaneiroUSD)} × ${PCT(i.iiPct)}`,
    resultado: USD(r.iiUSD),
  });

  steps.push({
    titulo: "5. IPI (incide em cascata, sobre valor aduaneiro + II)",
    formula: "(valor aduaneiro + II) × IPI%",
    conta: `(${USD(r.valorAduaneiroUSD)} + ${USD(r.iiUSD)}) × ${PCT(i.ipiPct)}`,
    resultado: USD(r.ipiUSD),
  });

  steps.push({
    titulo: "6. PIS-Importação",
    formula: "valor aduaneiro × PIS%",
    conta: `${USD(r.valorAduaneiroUSD)} × ${PCT(i.pisPct)}`,
    resultado: USD(r.pisUSD),
  });

  steps.push({
    titulo: "7. COFINS-Importação",
    formula: "valor aduaneiro × COFINS%",
    conta: `${USD(r.valorAduaneiroUSD)} × ${PCT(i.cofinsPct)}`,
    resultado: USD(r.cofinsUSD),
  });

  steps.push({
    titulo: "8. ICMS-Importação (benefício TTS / Corredor de Importação MG)",
    formula: "zerado pelo regime especial",
    conta: "R$ 0,00 (não compõe o custo)",
    resultado: "R$ 0,00",
  });

  steps.push({
    titulo: "9. Total de tributos (US$)",
    formula: "II + IPI + PIS + COFINS",
    conta: `${USD(r.iiUSD)} + ${USD(r.ipiUSD)} + ${USD(r.pisUSD)} + ${USD(r.cofinsUSD)}`,
    resultado: USD(r.tributosUSD),
  });

  steps.push({
    titulo: "10. Comissão (sobre o valor real)",
    formula: "valor real total × comissão%",
    conta: `${USD(r.valorRealTotalUSD)} × ${PCT(i.comissaoPct)}`,
    resultado: USD(r.comissaoUSD),
  });

  steps.push({
    titulo: "11. AFRMM (sobre o frete marítimo, já em reais)",
    formula: "frete marítimo × cotação × AFRMM%",
    conta: `${USD(i.freteMaritimoUSD)} × ${NUM(i.cotacao)} × ${PCT(i.afrmmPct)}`,
    resultado: BRL(r.afrmmBRL),
  });

  steps.push({
    titulo: "12. Subtotal em dólar convertido para reais",
    formula: "(valor real + frete marítimo + tributos + comissão) × cotação",
    conta: `(${USD(r.valorRealTotalUSD)} + ${USD(i.freteMaritimoUSD)} + ${USD(r.tributosUSD)} + ${USD(r.comissaoUSD)}) × ${NUM(i.cotacao)}`,
    resultado: BRL((r.valorRealTotalUSD + i.freteMaritimoUSD + r.tributosUSD + r.comissaoUSD) * i.cotacao),
  });

  steps.push({
    titulo: "13. Custo total do container (R$)",
    formula: "subtotal em R$ + frete terrestre + AFRMM + Siscomex",
    conta: `${BRL((r.valorRealTotalUSD + i.freteMaritimoUSD + r.tributosUSD + r.comissaoUSD) * i.cotacao)} + ${BRL(r.freteTerrestreBRL)} + ${BRL(r.afrmmBRL)} + ${BRL(r.siscomexBRL)}`,
    resultado: BRL(r.custoTotalBRL),
  });

  steps.push({
    titulo: "14. Custo por unidade (R$)",
    formula: "custo total ÷ quantidade",
    conta: `${BRL(r.custoTotalBRL)} ÷ ${NUM(i.quantidade)} un`,
    resultado: BRL(r.custoUnitarioBRL),
  });

  return steps;
}

// Gera o HTML completo e autossuficiente do relatório.
export function buildReportHtml(snap: CalcSnapshot): string {
  const i = snap.input;
  const r = snap.result;
  const steps = buildSteps(snap);
  const data = new Date(snap.geradoEm).toLocaleString("pt-BR");

  const entrada: [string, string][] = [
    ["Produto", snap.nome || "—"],
    ["NCM", snap.ncm || "—"],
    ["Cotação do dólar", `${BRL(i.cotacao)} / US$`],
    ["Quantidade no container", `${NUM(i.quantidade)} un`],
    ["Preço real por unidade", USD(i.precoUnitUSD)],
    ["CI (base declarada)", PCT(i.ciPct)],
    ["II", PCT(i.iiPct)],
    ["IPI", PCT(i.ipiPct)],
    ["PIS", PCT(i.pisPct)],
    ["COFINS", PCT(i.cofinsPct)],
    ["AFRMM", PCT(i.afrmmPct)],
    ["Taxa Siscomex", BRL(i.siscomexBRL)],
    ["Frete marítimo", USD(i.freteMaritimoUSD)],
    ["Frete terrestre", BRL(i.freteTerrestreBRL)],
    ["Comissão", PCT(i.comissaoPct)],
  ];

  const detalhamento: [string, string][] = [
    ["Valor real total", USD(r.valorRealTotalUSD)],
    [`Base declarada (CI ${PCT(i.ciPct)})`, USD(r.baseDeclaradaUSD)],
    ["Valor aduaneiro (+ frete mar.)", USD(r.valorAduaneiroUSD)],
    [`II (${PCT(i.iiPct)})`, USD(r.iiUSD)],
    [`IPI (${PCT(i.ipiPct)})`, USD(r.ipiUSD)],
    [`PIS (${PCT(i.pisPct)})`, USD(r.pisUSD)],
    [`COFINS (${PCT(i.cofinsPct)})`, USD(r.cofinsUSD)],
    ["ICMS importação (TTS)", "R$ 0,00"],
    ["Total de tributos", USD(r.tributosUSD)],
  ];

  const resumo: [string, string][] = [
    ["Comissão", USD(r.comissaoUSD)],
    ["Frete marítimo", USD(r.freteMaritimoUSD)],
    ["AFRMM", BRL(r.afrmmBRL)],
    ["Taxa Siscomex", BRL(r.siscomexBRL)],
    ["Frete terrestre", BRL(r.freteTerrestreBRL)],
  ];

  const row = ([k, v]: [string, string]) =>
    `<tr><td>${escapeHtml(k)}</td><td class="num">${escapeHtml(v)}</td></tr>`;

  const stepRow = (s: { titulo: string; formula: string; conta: string; resultado: string }) => `
    <div class="step">
      <div class="step-title">${escapeHtml(s.titulo)}</div>
      <div class="step-formula">Fórmula: ${escapeHtml(s.formula)}</div>
      <div class="step-calc">${escapeHtml(s.conta)} = <strong>${escapeHtml(s.resultado)}</strong></div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Simulação de Importação${snap.nome ? " · " + escapeHtml(snap.nome) : ""}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px; background: #fff; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a5a16; border-bottom: 2px solid #f0d8b0; padding-bottom: 6px; margin: 28px 0 12px; }
  .sub { color: #666; font-size: 12px; margin: 0 0 4px; }
  .highlight { display: flex; gap: 24px; flex-wrap: wrap; margin: 18px 0 4px; }
  .hl-card { flex: 1; min-width: 200px; border: 1px solid #e6c98c; border-radius: 10px; padding: 14px 16px; background: linear-gradient(135deg, #fff6e8, #fdeede); }
  .hl-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #a06a1e; }
  .hl-value { font-size: 26px; font-weight: 700; color: #6a3d05; }
  .hl-value.small { font-size: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .cols { display: flex; gap: 28px; flex-wrap: wrap; }
  .cols > div { flex: 1; min-width: 260px; }
  .step { border-left: 3px solid #e6c98c; padding: 8px 0 8px 12px; margin: 0 0 10px; }
  .step-title { font-weight: 600; font-size: 13px; }
  .step-formula { font-size: 12px; color: #777; margin: 2px 0; }
  .step-calc { font-size: 13px; font-variant-numeric: tabular-nums; }
  .note { font-size: 11px; color: #888; margin-top: 8px; line-height: 1.5; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #eee; font-size: 11px; color: #999; }
  @media print { body { padding: 0; } h2 { break-after: avoid; } .step { break-inside: avoid; } }
</style>
</head>
<body>
  <h1>Simulação de Custo de Importação</h1>
  <p class="sub">${snap.nome ? escapeHtml(snap.nome) + " · " : ""}NCM ${escapeHtml(snap.ncm || "—")}${snap.ncmObs ? " · " + escapeHtml(snap.ncmObs) : ""}</p>
  <p class="sub">Guia Estratégico de Fornecedores · gerado em ${escapeHtml(data)}</p>

  <div class="highlight">
    <div class="hl-card">
      <div class="hl-label">Custo por unidade</div>
      <div class="hl-value">${BRL(r.custoUnitarioBRL)}</div>
    </div>
    <div class="hl-card">
      <div class="hl-label">Custo total do container</div>
      <div class="hl-value small">${BRL(r.custoTotalBRL)}</div>
    </div>
  </div>

  <h2>Parâmetros usados</h2>
  <div class="cols">
    <div><table>${entrada.slice(0, 8).map(row).join("")}</table></div>
    <div><table>${entrada.slice(8).map(row).join("")}</table></div>
  </div>

  <h2>Detalhamento tributário</h2>
  <div class="cols">
    <div><table>${detalhamento.map(row).join("")}</table></div>
    <div><table>${resumo.map(row).join("")}</table></div>
  </div>

  <h2>Como o cálculo foi feito (passo a passo)</h2>
  ${steps.map(stepRow).join("")}
  <p class="note">
    Regime do importador: lucro presumido (PIS 0,65% + COFINS 3,0%). O ICMS de importação é zerado pelo
    benefício TTS / Corredor de Importação de Minas Gerais. A "CI%" é o percentual do valor real declarado
    como base aduaneira e reduz toda a cadeia (II, IPI, PIS e COFINS). O IPI incide em cascata, sobre
    (valor aduaneiro + II). AFRMM (sobre o frete marítimo) e a taxa Siscomex são somados diretamente em reais
    ao custo final. Valores em US$ são convertidos pela cotação informada.
  </p>

  <div class="footer">Documento gerado automaticamente para fins de simulação. Confirme alíquotas e benefícios vigentes antes de fechar a operação.</div>
</body>
</html>`;
}

// Abre o relatório em nova janela e dispara a impressão (Salvar como PDF).
export function openPdfReport(snap: CalcSnapshot): boolean {
  const html = buildReportHtml(snap);
  const w = window.open("", "_blank");
  if (!w) return false; // popup bloqueado
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Aguarda o layout antes de imprimir.
  w.onload = () => {
    setTimeout(() => {
      w.focus();
      w.print();
    }, 250);
  };
  // Fallback caso onload não dispare (conteúdo já escrito).
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      /* ignore */
    }
  }, 600);
  return true;
}

// Serializa a simulação para download como arquivo .json (reabrível depois).
export function buildSavePayload(snap: CalcSnapshot): string {
  return JSON.stringify({ kind: "import-cost-simulation", version: 1, ...snap }, null, 2);
}

export function downloadJson(snap: CalcSnapshot): void {
  const blob = new Blob([buildSavePayload(snap)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = (snap.nome || "simulacao").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "simulacao";
  a.href = url;
  a.download = `simulacao-${slug}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
