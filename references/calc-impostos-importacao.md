# Cadeia de impostos de importação + Benefício TTS/Corredor de Importação (MG)

## 1. Cadeia federal (em cascata) — base de cálculo de cada tributo

| Tributo | Esfera | Base de cálculo | Alíquota típica |
|---|---|---|---|
| **II** (Imp. Importação) | Federal | **Valor Aduaneiro (CIF)** = FOB + frete int. + seguro int. (+ capatazias/AFRMM) | 0%–35% (por NCM) |
| **IPI** | Federal | **CIF + II** | 0%–300% (por NCM; maioria baixo) |
| **PIS-Importação** | Federal | CIF (+ ... ver nota) | 2,1% (não-cumulativo) / 1,65% (cumulativo) |
| **COFINS-Importação** | Federal | CIF (+ ...) | 9,65% (não-cum.) / 7,6% (cum.) |
| **ICMS-Importação** | Estadual | **(CIF + II + IPI + PIS + COFINS + desp. aduaneiras) "por dentro"** | 4% / 12% / 18% (por estado/NCM) |

> Observação: há divergência de fontes sobre a base de PIS/COFINS. A regra clássica (Lei 10.865/2004, pós decisão STF) é **PIS/COFINS = alíquota × Valor Aduaneiro** (sem incluir ICMS na base, após a tese). Algumas fontes simplificadas usam CIF+II+IPI. Vou **confirmar com o usuário** qual ele usa; por padrão adoto PIS/COFINS sobre o Valor Aduaneiro.

### ICMS "por dentro" (gross-up)
ICMS = (Base sem ICMS) × aliq / (1 − aliq), onde Base sem ICMS = CIF + II + IPI + PIS + COFINS + despesas.

### Adicionais
- **AFRMM**: 8% sobre o frete marítimo (entra na base do II). (No caso do Fernando, o frete marítimo já está sendo tratado; confirmar se quer AFRMM.)
- **Taxa Siscomex**: valor fixo por DI (~R$ 214,50 1ª adição). Opcional.

## 2. Benefício de MG — TTS / Corredor de Importação (Decreto 48.589/2023 RICMS; Resolução 5.793/2024)

**Natureza:** regime especial para empresas **atacadistas/revenda** de importados, desembaraço preferencialmente em MG.

**Mecânica principal:**
- **Diferimento do ICMS na importação (entrada):** NÃO se recolhe ICMS no desembaraço (ICMS importação = 0 no ato). O ICMS é recolhido só na **venda** (saída), com alíquota reduzida via **crédito presumido**.
- Acaba com acúmulo de crédito e melhora fluxo de caixa.

**Carga efetiva de ICMS na SAÍDA (crédito presumido):**

Operação **interna (dentro de MG)**:
- alíquota 25% → crédito presumido 5% → recolhe **20%**
- alíquota 18% → crédito presumido 4% → recolhe **14%**
- alíquota 12% → crédito presumido 4% → recolhe **8%**
- produtos Lista Camex 12% → crédito presumido 9% → recolhe **3%**

Operação **interestadual**:
- alíquota 4% → crédito presumido 2,5% → recolhe **1,5%**
- Lista Camex 12% → CP 9% → recolhe **3%**
- Lista Camex 7% → CP 4% → recolhe **3%**

> Ponto-chave para a calculadora: com o Corredor, **o ICMS no custo de importação (desembaraço) é ZERO** (diferido). O ICMS efetivo aparece na **venda**, sobre o preço de venda, com a alíquota reduzida acima. Ou seja: para o **custo de aquisição/importação**, o benefício zera o ICMS de entrada — é o maior impacto no landed cost.

## 3. Como integrar à calculadora do Fernando (já existente)
Campos atuais: cotação dólar, preço real US$/un, qtd container, CI% (base declarada reduzida), alíquota imposto% (editável), frete marítimo US$, frete terrestre R$, comissão Bety%.

Plano:
- Manter o fluxo atual ("imposto" genérico que ele já usa) E adicionar um **card paralelo "Cadeia tributária (TTS-MG)"** que detalha II, IPI, PIS, COFINS e ICMS, mostrando o ICMS de importação **diferido (R$ 0)** pelo Corredor e o ICMS de venda (informativo) com a alíquota efetiva escolhida.
- Base = sobre o **valor declarado** (CI% do valor real) conforme prática do Fernando, + frete marítimo (como ele já faz).
- Alíquotas II/IPI/PIS/COFINS/ICMS **editáveis** (ele simula muitos cenários e o NCM muda tudo).

## Dúvidas a confirmar com o usuário (Fase 2)
1. Regime: Lucro Real (PIS/COFINS 2,1%+9,65%) ou Presumido/Simples (1,65%+7,6%)?
2. Base do PIS/COFINS: só Valor Aduaneiro (padrão atual) ou CIF+II+IPI?
3. Quer IPI no cálculo? (muitos revenda têm IPI 0). Alíquota?
4. ICMS: como o Corredor difere o ICMS de entrada, confirmar se ele quer mostrar ICMS importação = 0 e exibir a alíquota efetiva de venda (interna MG x interestadual) só como referência.
5. Incluir AFRMM (8% do frete) e Taxa Siscomex? 
6. A "base declarada" (CI%) reduz a base de TODOS os tributos (II/IPI/PIS/COFINS) ou só do II?
