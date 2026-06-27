// =============================================================================
// calcReport.ts — geração do relatório da simulação (PDF imprimível + JSON).
//
// Não depende de bibliotecas externas: monta um HTML autossuficiente e abre a
// caixa de impressão do navegador (o usuário escolhe "Salvar como PDF").
// O relatório traz os parâmetros de entrada, o resultado, o detalhamento
// tributário e a EXPLICAÇÃO passo a passo de cada conta com os números reais.
// =============================================================================
import { computeImportCost, type ImportTaxInput, type ImportTaxResult } from "./importTax";

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
    titulo: "3. Seguro internacional",
    formula: "base declarada × seguro%",
    conta: `${USD(r.baseDeclaradaUSD)} × ${PCT(i.seguroPct)}`,
    resultado: USD(r.seguroUSD),
  });

  steps.push({
    titulo:
      r.freteMaritimoModo === "chines"
        ? "4. Valor aduaneiro (frete pago ao chinês NÃO entra na base)"
        : "4. Valor aduaneiro (base da cadeia tributária)",
    formula:
      r.freteMaritimoModo === "chines"
        ? "base declarada + seguro (frete fora, sem imposto)"
        : "base declarada + frete marítimo + seguro",
    conta:
      r.freteMaritimoModo === "chines"
        ? `${USD(r.baseDeclaradaUSD)} + ${USD(r.seguroUSD)}`
        : `${USD(r.baseDeclaradaUSD)} + ${USD(i.freteMaritimoUSD)} + ${USD(r.seguroUSD)}`,
    resultado: USD(r.valorAduaneiroUSD),
  });

  steps.push({
    titulo: "5. II — Imposto de Importação",
    formula: "valor aduaneiro × II%",
    conta: `${USD(r.valorAduaneiroUSD)} × ${PCT(i.iiPct)}`,
    resultado: USD(r.iiUSD),
  });

  steps.push({
    titulo: "6. IPI (incide em cascata, sobre valor aduaneiro + II)",
    formula: "(valor aduaneiro + II) × IPI%",
    conta: `(${USD(r.valorAduaneiroUSD)} + ${USD(r.iiUSD)}) × ${PCT(i.ipiPct)}`,
    resultado: USD(r.ipiUSD),
  });

  steps.push({
    titulo: "7. PIS-Importação",
    formula: "valor aduaneiro × PIS-Importação%",
    conta: `${USD(r.valorAduaneiroUSD)} × ${PCT(i.pisPct)}`,
    resultado: USD(r.pisUSD),
  });

  steps.push({
    titulo: "8. COFINS-Importação",
    formula: "valor aduaneiro × COFINS-Importação%",
    conta: `${USD(r.valorAduaneiroUSD)} × ${PCT(i.cofinsPct)}`,
    resultado: USD(r.cofinsUSD),
  });

  steps.push({
    titulo: "9. ICMS-Importação (benefício TTS / Corredor de Importação MG)",
    formula: "zerado pelo regime especial (estadual)",
    conta: "R$ 0,00 (não compõe o custo)",
    resultado: "R$ 0,00",
  });

  steps.push({
    titulo: "10. Total de tributos (US$)",
    formula: "II + IPI + PIS-Imp. + COFINS-Imp.",
    conta: `${USD(r.iiUSD)} + ${USD(r.ipiUSD)} + ${USD(r.pisUSD)} + ${USD(r.cofinsUSD)}`,
    resultado: USD(r.tributosUSD),
  });

  steps.push({
    titulo: "11. Comissão (sobre o valor real)",
    formula: "valor real total × comissão%",
    conta: `${USD(r.valorRealTotalUSD)} × ${PCT(i.comissaoPct)}`,
    resultado: USD(r.comissaoUSD),
  });

  steps.push({
    titulo: "12. AFRMM (sobre o frete marítimo, já em reais)",
    formula: "frete marítimo × cotação × AFRMM%",
    conta: `${USD(i.freteMaritimoUSD)} × ${NUM(i.cotacao)} × ${PCT(i.afrmmPct)}`,
    resultado: BRL(r.afrmmBRL),
  });

  steps.push({
    titulo:
      r.freteMaritimoModo === "chines"
        ? "13. Subtotal em dólar convertido para reais (frete pago ao chinês entra só no custo)"
        : "13. Subtotal em dólar convertido para reais",
    formula: "(valor real + frete marítimo + seguro + tributos + comissão) × cotação",
    conta: `(${USD(r.valorRealTotalUSD)} + ${USD(i.freteMaritimoUSD)} + ${USD(r.seguroUSD)} + ${USD(r.tributosUSD)} + ${USD(r.comissaoUSD)}) × ${NUM(i.cotacao)}`,
    resultado: BRL((r.valorRealTotalUSD + i.freteMaritimoUSD + r.seguroUSD + r.tributosUSD + r.comissaoUSD) * i.cotacao),
  });

  steps.push({
    titulo: "14. Custo total do container (R$)",
    formula: "subtotal em R$ + frete terrestre + AFRMM + Siscomex + despesas portuárias",
    conta: `${BRL((r.valorRealTotalUSD + i.freteMaritimoUSD + r.seguroUSD + r.tributosUSD + r.comissaoUSD) * i.cotacao)} + ${BRL(r.freteTerrestreBRL)} + ${BRL(r.afrmmBRL)} + ${BRL(r.siscomexBRL)} + ${BRL(r.despesasPortoBRL)}`,
    resultado: BRL(r.custoTotalBRL),
  });

  steps.push({
    titulo: "15. Custo por unidade (R$)",
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
    ["Seguro", PCT(i.seguroPct)],
    ["PIS-Importação", PCT(i.pisPct)],
    ["COFINS-Importação", PCT(i.cofinsPct)],
    ["AFRMM", PCT(i.afrmmPct)],
    ["Taxa Siscomex", BRL(i.siscomexBRL)],
    ["Frete marítimo", USD(i.freteMaritimoUSD)],
    ["Frete marítimo (entrada)", r.freteMaritimoModo === "chines" ? "Pago ao chinês (sem imposto)" : "Dentro da CI (com imposto)"],
    ["Frete terrestre", BRL(i.freteTerrestreBRL)],
    ["Despesas portuárias (Santos)", BRL(i.despesasPortoBRL)],
    ["Comissão", PCT(i.comissaoPct)],
  ];

  const detalhamento: [string, string][] = [
    ["Valor real total", USD(r.valorRealTotalUSD)],
    [`Base declarada (CI ${PCT(i.ciPct)})`, USD(r.baseDeclaradaUSD)],
    [`Seguro (${PCT(i.seguroPct)})`, USD(r.seguroUSD)],
    [r.freteMaritimoModo === "chines" ? "Valor aduaneiro (frete fora — sem imposto)" : "Valor aduaneiro (+ frete + seguro)", USD(r.valorAduaneiroUSD)],
    [`II (${PCT(i.iiPct)})`, USD(r.iiUSD)],
    [`IPI (${PCT(i.ipiPct)})`, USD(r.ipiUSD)],
    [`PIS-Imp. (${PCT(i.pisPct)})`, USD(r.pisUSD)],
    [`COFINS-Imp. (${PCT(i.cofinsPct)})`, USD(r.cofinsUSD)],
    ["ICMS importação (TTS)", "R$ 0,00"],
    ["Total de tributos", USD(r.tributosUSD)],
  ];

  const resumo: [string, string][] = [
    ["Comissão", USD(r.comissaoUSD)],
    ["Frete marítimo", USD(r.freteMaritimoUSD)],
    ["AFRMM", BRL(r.afrmmBRL)],
    ["Taxa Siscomex", BRL(r.siscomexBRL)],
    ["Frete terrestre", BRL(r.freteTerrestreBRL)],
    ["Despesas portuárias (Santos)", BRL(r.despesasPortoBRL)],
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
    PIS-Importação (2,1%) e COFINS-Importação (9,65%) incidem sobre o valor aduaneiro e são pagos na DI para
    liberar a carga. O ICMS de importação é zerado pelo benefício TTS / Corredor de Importação de Minas Gerais
    — que é estadual e não afeta PIS/COFINS (federais). A "CI%" é o percentual do valor real declarado como
    base aduaneira e reduz toda a cadeia (seguro, II, IPI, PIS e COFINS). O seguro internacional (0,40% da base
    declarada) compõe o valor aduaneiro. O IPI incide em cascata, sobre (valor aduaneiro + II). AFRMM (sobre o
    frete marítimo), a taxa Siscomex e as despesas portuárias de Santos (container 40 pés) são somados
    diretamente em reais ao custo final. Valores em US$ são convertidos pela cotação informada.
  </p>

  <div class="footer">Documento gerado automaticamente para fins de simulação. Confirme alíquotas e benefícios vigentes antes de fechar a operação.</div>
</body>
</html>`;
}

// Nome de arquivo amigável a partir do produto.
function slugify(nome: string): string {
  return (nome || "simulacao").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "simulacao";
}

// Gera o PDF diretamente no navegador e dispara o download — SEM janela de impressão.
// Usa jsPDF + autotable: desenha o PDF a partir dos dados estruturados (vetorial,
// confiável, não depende de renderização de DOM/canvas).
export async function downloadPdfReport(snap: CalcSnapshot): Promise<boolean> {
  try {
    const { jsPDF } = await import("jspdf");
    const autoTableMod = await import("jspdf-autotable");
    const autoTable = (autoTableMod as { default?: unknown }).default as (
      doc: unknown,
      opts: unknown,
    ) => void;

    const i = snap.input;
    const r = snap.result;
    const steps = buildSteps(snap);
    const data = new Date(snap.geradoEm).toLocaleString("pt-BR");

    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentW = pageW - margin * 2;
    let y = margin;

    // Paleta
    const brown: [number, number, number] = [106, 61, 5];
    const amber: [number, number, number] = [138, 90, 22];
    const grey: [number, number, number] = [120, 120, 120];

    // Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...brown);
    doc.text("Simulação de Custo de Importação", margin, y + 4);
    y += 9;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...grey);
    const sub1 = `${snap.nome ? snap.nome + " · " : ""}NCM ${snap.ncm || "—"}${snap.ncmObs ? " · " + snap.ncmObs : ""}`;
    doc.text(sub1, margin, y);
    y += 5;
    doc.text(`Guia Estratégico de Fornecedores · gerado em ${data}`, margin, y);
    y += 8;

    // Cards de destaque
    const cardH = 18;
    const cardW = (contentW - 6) / 2;
    const drawCard = (x: number, label: string, value: string, big: boolean) => {
      doc.setFillColor(253, 238, 222);
      doc.setDrawColor(230, 201, 140);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
      doc.setFontSize(8);
      doc.setTextColor(...amber);
      doc.setFont("helvetica", "normal");
      doc.text(label.toUpperCase(), x + 4, y + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(big ? 17 : 13);
      doc.setTextColor(...brown);
      doc.text(value, x + 4, y + 14);
    };
    drawCard(margin, "Custo por unidade", BRL(r.custoUnitarioBRL), true);
    drawCard(margin + cardW + 6, "Custo total do container", BRL(r.custoTotalBRL), false);
    y += cardH + 8;

    const sectionTitle = (t: string) => {
      if (y > 262) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...amber);
      doc.text(t.toUpperCase(), margin, y);
      y += 2;
      doc.setDrawColor(240, 216, 176);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    };

    const pairTable = (rows: [string, string][]) => {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        body: rows,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 1.6, textColor: [40, 40, 40] },
        columnStyles: {
          0: { cellWidth: contentW * 0.62 },
          1: { cellWidth: contentW * 0.38, halign: "right" as const },
        },
        // linha separadora sutil
        didDrawCell: () => {},
      });
      // @ts-expect-error lastAutoTable é anexado pelo plugin
      y = (doc.lastAutoTable?.finalY ?? y) + 6;
    };

    const entrada: [string, string][] = [
      ["Produto", snap.nome || "—"],
      ["NCM", snap.ncm || "—"],
      ["Cotação do dólar", `${BRL(i.cotacao)} / US$`],
      ["Quantidade no container", `${NUM(i.quantidade)} un`],
      ["Preço real por unidade", USD(i.precoUnitUSD)],
      ["CI (base declarada)", PCT(i.ciPct)],
      ["II", PCT(i.iiPct)],
      ["IPI", PCT(i.ipiPct)],
      ["Seguro", PCT(i.seguroPct)],
      ["PIS-Importação", PCT(i.pisPct)],
      ["COFINS-Importação", PCT(i.cofinsPct)],
      ["AFRMM", PCT(i.afrmmPct)],
      ["Taxa Siscomex", BRL(i.siscomexBRL)],
      ["Frete marítimo", USD(i.freteMaritimoUSD)],
      ["Frete marítimo (entrada)", r.freteMaritimoModo === "chines" ? "Pago ao chinês (sem imposto)" : "Dentro da CI (com imposto)"],
      ["Frete terrestre", BRL(i.freteTerrestreBRL)],
      ["Despesas portuárias (Santos)", BRL(i.despesasPortoBRL)],
      ["Comissão", PCT(i.comissaoPct)],
    ];

    const detalhamento: [string, string][] = [
      ["Valor real total", USD(r.valorRealTotalUSD)],
      [`Base declarada (CI ${PCT(i.ciPct)})`, USD(r.baseDeclaradaUSD)],
      [`Seguro (${PCT(i.seguroPct)})`, USD(r.seguroUSD)],
      [r.freteMaritimoModo === "chines" ? "Valor aduaneiro (frete fora — sem imposto)" : "Valor aduaneiro (+ frete + seguro)", USD(r.valorAduaneiroUSD)],
      [`II (${PCT(i.iiPct)})`, USD(r.iiUSD)],
      [`IPI (${PCT(i.ipiPct)})`, USD(r.ipiUSD)],
      [`PIS-Imp. (${PCT(i.pisPct)})`, USD(r.pisUSD)],
      [`COFINS-Imp. (${PCT(i.cofinsPct)})`, USD(r.cofinsUSD)],
      ["ICMS importação (TTS)", "R$ 0,00"],
      ["Total de tributos", USD(r.tributosUSD)],
      ["Comissão", USD(r.comissaoUSD)],
      ["AFRMM", BRL(r.afrmmBRL)],
      ["Taxa Siscomex", BRL(r.siscomexBRL)],
      ["Frete terrestre", BRL(r.freteTerrestreBRL)],
      ["Despesas portuárias (Santos)", BRL(r.despesasPortoBRL)],
    ];

    sectionTitle("Parâmetros usados");
    pairTable(entrada);

    sectionTitle("Detalhamento tributário");
    pairTable(detalhamento);

    sectionTitle("Como o cálculo foi feito (passo a passo)");
    const stepRows = steps.map((s) => [`${s.titulo}\nFórmula: ${s.formula}\n${s.conta} = ${s.resultado}`]);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: stepRows,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: { top: 1.5, bottom: 3, left: 3, right: 2 }, textColor: [40, 40, 40], lineColor: [230, 201, 140], lineWidth: { left: 0.8, top: 0, right: 0, bottom: 0 } },
      columnStyles: { 0: { cellWidth: contentW } },
    });
    // @ts-expect-error lastAutoTable é anexado pelo plugin
    y = (doc.lastAutoTable?.finalY ?? y) + 6;

    if (y > 250) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...grey);
    const nota =
      "PIS-Importação (2,1%) e COFINS-Importação (9,65%) incidem sobre o valor aduaneiro e são pagos na DI para liberar a carga. O ICMS de importação é zerado pelo benefício TTS / Corredor de Importação de Minas Gerais — que é estadual e não afeta PIS/COFINS (federais). A CI% é o percentual do valor real declarado como base aduaneira e reduz toda a cadeia (seguro, II, IPI, PIS e COFINS). O seguro internacional (0,40% da base declarada) compõe o valor aduaneiro. O IPI incide em cascata, sobre (valor aduaneiro + II). AFRMM (sobre o frete marítimo), a taxa Siscomex e as despesas portuárias de Santos (container 40 pés) são somados diretamente em reais ao custo final. Valores em US$ são convertidos pela cotação informada. Documento gerado automaticamente para fins de simulação — confirme alíquotas e benefícios vigentes antes de fechar a operação.";
    const notaLines = doc.splitTextToSize(nota, contentW);
    doc.text(notaLines, margin, y);

    doc.save(`simulacao-${slugify(snap.nome)}.pdf`);
    return true;
  } catch {
    return false;
  }
}

// Serializa a simulação para download como arquivo .json (reabrível depois).
export function buildSavePayload(snap: CalcSnapshot): string {
  return JSON.stringify({ kind: "import-cost-simulation", version: 1, ...snap }, null, 2);
}

// ---------------------------------------------------------------------------
// Importacao de simulacao salva (.json) — valida o payload e devolve o snapshot.
// ---------------------------------------------------------------------------
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function isValidInput(o: unknown): o is ImportTaxInput {
  if (!o || typeof o !== "object") return false;
  const i = o as Record<string, unknown>;
  const required = [
    "cotacao",
    "precoUnitUSD",
    "quantidade",
    "ciPct",
    "iiPct",
    "ipiPct",
    "pisPct",
    "cofinsPct",
    "seguroPct",
    "freteMaritimoUSD",
    "freteTerrestreBRL",
    "comissaoPct",
    "afrmmPct",
    "siscomexBRL",
    "despesasPortoBRL",
  ];
  if (!required.every((k) => isFiniteNumber(i[k]))) return false;
  // freteMaritimoModo é opcional, mas se vier precisa ser um dos valores válidos.
  if (i.freteMaritimoModo !== undefined && i.freteMaritimoModo !== "ci" && i.freteMaritimoModo !== "chines") {
    return false;
  }
  return true;
}

export interface ParseResult {
  ok: boolean;
  snapshot?: CalcSnapshot;
  error?: string;
}

// Recebe o texto cru do arquivo .json e tenta reconstruir um CalcSnapshot válido.
// Recalcula o resultado a partir do input (fonte da verdade), ignorando o
// `result` salvo — assim a simulação reaberta reflete sempre a lógica atual.
export function parseImportedSnapshot(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Arquivo não é um JSON válido." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Conteúdo do arquivo não é reconhecido." };
  }
  const p = parsed as Record<string, unknown>;
  if (p.kind !== "import-cost-simulation") {
    return { ok: false, error: "Este arquivo não é uma simulação de importação salva por esta calculadora." };
  }
  if (!isValidInput(p.input)) {
    return { ok: false, error: "A simulação está incompleta ou corrompida (parâmetros inválidos)." };
  }
  const input = p.input as ImportTaxInput;
  const snapshot: CalcSnapshot = {
    nome: typeof p.nome === "string" ? p.nome : "",
    ncm: typeof p.ncm === "string" ? p.ncm : "",
    ncmObs: typeof p.ncmObs === "string" ? p.ncmObs : undefined,
    geradoEm: isFiniteNumber(p.geradoEm) ? (p.geradoEm as number) : Date.now(),
    input,
    result: computeImportCost(input),
  };
  return { ok: true, snapshot };
}

// ---------------------------------------------------------------------------
// Comparacao de dois cenarios — diferenca de imposto e custo final.
// ---------------------------------------------------------------------------
export interface ScenarioDiff {
  custoTotalA: number;
  custoTotalB: number;
  custoTotalDelta: number; // B - A
  custoTotalDeltaPct: number; // (B - A) / A * 100 (0 se A = 0)
  custoUnitarioA: number;
  custoUnitarioB: number;
  custoUnitarioDelta: number;
  tributosBRL_A: number; // tributos convertidos em R$ pela cotacao do cenario
  tributosBRL_B: number;
  tributosDelta: number; // B - A (em R$)
}

// Converte o total de tributos (US$) em R$ pela cotacao do proprio cenario.
function tributosEmBRL(snap: CalcSnapshot): number {
  return snap.result.tributosUSD * snap.input.cotacao;
}

export function compareScenarios(a: CalcSnapshot, b: CalcSnapshot): ScenarioDiff {
  const custoTotalA = a.result.custoTotalBRL;
  const custoTotalB = b.result.custoTotalBRL;
  const tributosBRL_A = tributosEmBRL(a);
  const tributosBRL_B = tributosEmBRL(b);
  return {
    custoTotalA,
    custoTotalB,
    custoTotalDelta: custoTotalB - custoTotalA,
    custoTotalDeltaPct: custoTotalA !== 0 ? ((custoTotalB - custoTotalA) / custoTotalA) * 100 : 0,
    custoUnitarioA: a.result.custoUnitarioBRL,
    custoUnitarioB: b.result.custoUnitarioBRL,
    custoUnitarioDelta: b.result.custoUnitarioBRL - a.result.custoUnitarioBRL,
    tributosBRL_A,
    tributosBRL_B,
    tributosDelta: tributosBRL_B - tributosBRL_A,
  };
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
