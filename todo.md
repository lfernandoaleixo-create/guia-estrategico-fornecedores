# Adicionar Fornecedores + Migrar Contato + Promoção a Dashboard

## Fase 1 — Modelo de dados
- [x] Criar `useCustomGroups` (id, nome, ramo, cor, promotedToDashboard?, createdAt)
- [x] Criar `useExtraSuppliers` (fornecedores avulsos cadastrados na 4ª aba — separados dos 3 scopes)
- [x] Helper `migrateSupplier(fromScope, toScope, supplierId)` movendo SupplierNoteEntry + custom suppliers + extras
- [x] Incluir custom-groups e extra-suppliers no backup .json (v4)

## Fase 2 — Página /adicionar
- [x] Layout próprio (mesmo padrão visual da home/dashboards)
- [x] Seção "Grupos Personalizados" (CRUD + ramo + cor + indicador de quantos fornecedores)
- [x] Seção "Cadastrar Fornecedor Avulso" (formulário com select de grupo)
- [x] Listagem agrupada por grupo personalizado, com botão "Promover a dashboard independente"

## Fase 3 — 4º card na home
- [x] Card "+ Adicionar Fornecedores" no grid de dashboards
- [x] Rota /adicionar registrada em App.tsx
- [x] Manter padrão visual editorial premium

## Fase 4 — Migrar Contato
- [x] Componente `MigrateButton` reutilizável (modal com select de destino + confirmação)
- [x] Integrar no SupplierNotesPanel (header)
- [x] Destinos: Aquário, Tapete, Yiwu, qualquer dashboard promovido, qualquer Grupo Personalizado
- [x] Toast de sucesso após migrar; redirecionar/colapsar painel

## Fase 5 — Promoção a Dashboard
- [x] Botão "Promover a dashboard" no card do grupo personalizado
- [x] Confirmar com modal
- [x] Marcar grupo como promotedToDashboard=true
- [x] Renderizar card extra na home para cada grupo promovido (mesmo layout dos 3)
- [x] Rota dinâmica /grupo/:groupId que reaproveita layout padrão (lista + anotações + grupos)

## Fase 6 — Validação e checkpoint
- [x] Build limpo, TS limpo
- [x] Testar criar grupo, cadastrar fornecedor, promover, migrar
- [x] Salvar checkpoint final

---

# Migração para Banco de Dados Compartilhado (implementado em MySQL/Drizzle + tRPC)
> Nota: implementado com MySQL/Drizzle (em vez de PostgreSQL) e API via tRPC (em vez de REST). O objetivo de cada item foi cumprido — ver seção CONCLUÍDA abaixo.

## Fase A: Upgrade para full-stack
- [x] Executar webdev_add_feature("web-db-user")
- [x] Verificar que o backend e DB estão funcionando

## Fase B: Schema do banco
- [x] Tabela `supplier_groups` (id, number, name, legend, color, created_at, updated_at)
- [x] Tabela `supplier_notes` (id, scope, supplier_id, status, observacoes, fields JSON, group_ids JSON, created_at, updated_at) — anexos e cotações armazenados como JSON na própria nota (attachments / quoteRows)
- [x] Anexos cobertos (campo JSON `attachments` em supplier_notes, em vez de tabela separada)
- [x] Cotações cobertas (campo JSON `quoteRows` em supplier_notes, em vez de tabela separada)
- [x] Tabela `extra_suppliers` (id, group_id, name, chinese_name, category, ncm, city, province, address, contact_name, contact_role, contact_language, moq, price_fob, lead_time, payment_terms, incoterm, notes, phones JSON, emails JSON, links JSON, created_at, updated_at)
- [x] Tabela `custom_groups` (id, name, description, branch, color, number, promotedToDashboard, promotedAt, created_at, updated_at) — schema final não usa coluna `icon` (ícone derivado no frontend); o boolean é `promotedToDashboard`
- [x] Seed idempotente dos 2 grupos iniciais em código (`seedSupplierGroups` em server/db.ts, chamado no startup do servidor) — Aquários & Terrários (Nº 01) e Tapete Higiênico Pet (Nº 02), com ids idênticos ao seed do frontend (sem duplicar)

## Fase C: Rotas de API (implementadas como procedures tRPC no router `data`)
- [x] supplierGroups: list / upsert / bulkUpsert / delete
- [x] notes: listByScope / upsert / delete (anexos via campo JSON na própria nota)
- [x] Anexos: persistidos no upsert da nota (campo JSON attachments)
- [x] suppliers (extra_suppliers): list / upsert / delete
- [x] groups (custom_groups): list / upsert / delete

## Fase D: Migrar frontend
- [x] useSupplierGroups.ts → tRPC em vez de IndexedDB
- [x] useSupplierNotes.ts → tRPC em vez de IndexedDB
- [x] useExtraSuppliers.ts → tRPC em vez de IndexedDB
- [x] useCustomGroups.ts → tRPC em vez de IndexedDB

## Fase E: Testar
- [x] Verificar que dados persistem entre sessões/navegadores (validado via API + testes vitest)
- [x] Verificar que anexos são salvos e recuperados corretamente (campo JSON attachments, parseAttachments no backup)
- [x] Verificar que GrupoDashboard funciona com dados do servidor (usa useExtraSuppliers + SupplierNotesPanel via tRPC)

## Migração para Banco Compartilhado — CONCLUÍDA (Jun/2026)
- [x] Upgrade para full-stack (tRPC + Express + MySQL/Drizzle)
- [x] Schema com 6 tabelas migrado (`pnpm db:push`): users, custom_groups, extra_suppliers, supplier_notes, supplier_groups, custom_suppliers
- [x] Backend: helpers em server/db.ts + router tRPC `data` (publicProcedure, sem login)
- [x] useCustomGroups.ts migrado para tRPC (polling 5s)
- [x] useExtraSuppliers.ts migrado para tRPC (polling 5s)
- [x] useSupplierNotes.ts migrado para tRPC (status, observações, anexos, cotações, grupos)
- [x] useCustomSuppliers.ts migrado para tRPC
- [x] useSupplierGroups.ts migrado para tRPC (seed Nº 01 e Nº 02)
- [x] backup.ts migrado para API tRPC
- [x] useDiary.ts (dashboard Aquário) migrado: agora é um wrapper sobre useSupplierNotes("aquario") — última dependência de IndexedDB eliminada
- [x] Seed dos grupos Nº 01 (Aquários & Terrários) e Nº 02 (Tapete Higiênico Pet) garantido no banco
- [x] Verificado: 0 referências residuais ao IndexedDB no client
- [x] 0 erros TypeScript / LSP
- [x] 7/7 testes vitest passando (groups, suppliers, notes, supplierGroups + bulkUpsert, customSuppliers, auth)
- [x] Validado backend via API: bulkUpsert grava e list retorna os 2 grupos
- [x] Checkpoint final salvo


## Anotações/Diário nos Dashboards Promovidos (CONCLUÍDO Jun/2026)
- [x] Generalizar `scope` de ReportPanel para `string` (aceitar `grupo-{id}`), com `tone` e paleta de PDF configuráveis via props
- [x] Generalizar `scope` de UploadMetrics para `string` (aceitar `grupo-{id}`)
- [x] Adicionar seção "Anotações / Diário" no GrupoDashboard com mesmo layout dos dashboards principais (UploadMetrics + ReportPanel com status, total, anexos e detalhamento)
- [x] ReportPanel no grupo considera todos os fornecedores do grupo (allSupplierIds) e resolve nomes via useExtraSuppliers
- [x] Abas "Fornecedores" / "Anotações / Diário" no GrupoDashboard
- [x] Validado via browser: status (Não visitado=1), uploads, detalhamento e PDF renderizam corretamente
- [x] 11/11 testes vitest passando + 0 erros TypeScript
- [x] Testar 'Exportar PDF' na aba Diário do dashboard promovido e confirmar geração (títulos limpos, sem glitch de caracteres)
- [x] Limpar dados de teste do banco (apenas 2 grupos canônicos restantes)
- [x] Salvar checkpoint final

## Cadastro de fornecedor dentro do dashboard promovido
- [x] Modal de cadastro embutido no GrupoDashboard (sem navegar para /adicionar)
- [x] Botões "Adicionar fornecedor" e "Cadastrar primeiro fornecedor" abrem o modal e gravam com o groupId do dashboard atual
- [x] Validar no browser que a página se mantém fixa e o fornecedor aparece na lista
- [x] Aba "Anotações / Diário" lista cada fornecedor do grupo com painel completo (status, informações, upload catálogos/fotos/cotações)
- [x] Painel do Diário lê automaticamente os dados do cadastro do fornecedor (prefilled) e permite editar pelo lápis
- [x] Escrever/rodar teste vitest cobrindo criação de fornecedor com groupId (12/12 passando)
- [x] Limpar fornecedor de teste do banco
- [x] Salvar checkpoint

## Grupos personalizados no seletor "Grupos do Fornecedor"
- [x] GroupPicker passa a listar também os grupos personalizados (custom_groups), além dos compartilhados fixos (com tag PERS.)
- [x] Seleção persiste corretamente (sem colisão de IDs entre as duas fontes)
- [x] Validar no browser que os novos grupos aparecem como chips selecionáveis
- [x] GroupSummaryCards reconhece grupos personalizados nas agregações
- [x] Aba Diário reordenada: Métricas e Relatório no topo, lista de fornecedores depois
- [x] Rodar testes vitest (12/12) e salvar checkpoint

## Chips de grupo no card recolhido do Diário
- [x] Mapa id->info unindo grupos compartilhados + personalizados no GrupoDashboard
- [x] Cabeçalho do card recolhido mostra status + anexos + chips dos grupos marcados (cor do grupo, tag PERS. no tooltip)
- [x] Validado no browser (Fornecedor 1 exibe chip "Nº 05 Fornecedores de jóias")
- [x] Teste vitest cobrindo persistência de groupIds na nota (13/13 passando)

## Download/visualização de anexos
- [x] Download de anexo robusto (data URL → Blob + objectURL) funcionando em qualquer navegador/celular
- [x] Botão "Visualizar" (abrir em nova aba) ao lado de Baixar
- [x] Validar no browser (baixar = PDF íntegro 4 páginas; visualizar = abre em nova aba) e salvar checkpoint

## Visualizador de anexos em overlay (lightbox)
- [x] Botão "olho" abre o documento em um modal por cima da página (sem sair do dashboard)
- [x] PDFs e imagens renderizam dentro do modal
- [x] Fechar ao clicar fora (backdrop) e com tecla Esc
- [x] Validar no browser (PDF abriu em overlay; fechou ao clicar fora) e salvar checkpoint

## Correção: PDF bloqueado pelo Chrome no lightbox
- [x] Substituir iframe(blob) por pdf.js renderizando em canvas dentro do modal
- [x] Paginação/scroll de todas as páginas do PDF
- [x] Imagens continuam funcionando no modal
- [x] Fallback de download para tipos não suportados
- [x] Validar no preview e salvar checkpoint

## Correção CRÍTICA: erro no 2º upload de anexo + perda de dados preenchidos
Causa: anexos gravados como base64 dentro da mesma linha de supplier_notes; ao anexar o 2º arquivo o payload reenvia todos os anexos (inflado ~33% por base64), estoura o limite de corpo da requisição e falha — e como tudo é salvo no mesmo registro, o funcionário perde status/observações/campos digitados.

- [x] Criar endpoint server REST /api/upload-attachment (busboy multipart) que envia ao S3 (storagePut) e faz append da referência { key, url } na nota
- [x] Migrar SupplierAttachment para guardar fileKey/url em vez de dataUrl (mantendo compat com dataUrl legado)
- [x] addAttachment: enviar arquivo ao S3 e gravar SOMENTE a referência no banco
- [x] Desacoplar upload de anexo do salvamento de texto (falha de upload não pode apagar status/observações/campos)
- [x] Preservar/restaurar estado de texto quando um upload falhar (não perder o que o usuário digitou)
- [x] Visualização (PdfCanvas/img) e download funcionando tanto para anexos novos (url) quanto legados (base64)
- [x] Indicador de "enviando…" por categoria durante o upload
- [x] Atualizar testes vitest (nota persiste sem depender de base64; mock do upload) — 15/15 passando
- [x] Validar no preview: upload ponta a ponta via API (2 arquivos sem erro, append correto, S3 200); checkpoint salvo
- [x] Barra de progresso real (%) por arquivo durante o upload (via XHR upload.onprogress) por categoria

## Correção DEFINITIVA: INSERT supplier_notes falha por base64 (print do usuário)
Causa real confirmada pelo print: o INSERT em supplier_notes falha porque attachments/quoteRows ainda podem conter dataUrl base64 (registros legados e anexos de cotação). Ao salvar texto, o entryToPayload reenvia esse base64 e o INSERT estoura — perdendo os dados.

- [x] Blindar server `notes.upsert`: ao receber attachments/quoteRows com dataUrl base64, fazer upload ao S3 e substituir por url/fileKey antes de gravar (nunca gravar base64) — server/sanitizeNote.ts
- [x] Sanitizar quoteRows no servidor (remover qualquer dataUrl embutido)
- [x] Rotina de migração única para mover anexos legados (base64) existentes no banco para o S3 — executada (1 registro saneado; banco agora com 0 base64)
- [x] Teste vitest: upsert com dataUrl base64 resulta em linha sem base64 (somente url/fileKey) — 20/20 passando
- [x] Validar no preview com upload REAL pela interface: 2 catálogos anexados em sequência (o 2º que quebrava) com URL do S3, sem erro
- [x] Salvar checkpoint
- [x] Migração passa a logar as chaves S3 geradas (rastreabilidade/recuperação futura)

## Incidente durante validação (transparência)
Durante a limpeza dos arquivos de teste, um UPDATE zerou o campo `attachments` do registro extra_mpy78fo0_rb0tz1, que continha também o anexo real "Dossie_Fornecedor_99GoldData_Vietna.pdf". O arquivo não é recuperável de forma íntegra (log truncado; chave S3 com hash desconhecido).
- [x] Restaurar "Dossie_Fornecedor_99GoldData_Vietna.pdf": arquivo original reenviado pelo usuário, validado (84.623 bytes, 4 páginas), enviado ao S3 e reanexado no fornecedor 99 GOLD DATA (grupo Nº 04)
- [x] Confirmar que a correção em si está intacta e o banco está livre de base64 (0 ocorrências)

## Restauração do Dossie + correção de renderização de PDF do S3
- [x] Identificada causa do "Não foi possível renderizar o PDF": /manus-storage faz redirect 307 para S3 (cross-origin sem CORS) e o pdf.js não consegue ler os bytes via fetch
- [x] Nova rota REST /api/attachment-file?key=... faz stream dos bytes do S3 na MESMA ORIGEM (sem redirect/CORS) — server/uploadRoute.ts
- [x] Helper attachmentStreamSrc no client: PDF e download passam a usar a rota de stream (compat com data URL legado)
- [x] PdfCanvas renderiza o Dossie corretamente (validado no preview: 4 páginas legíveis)
- [x] Testes vitest da lógica de stream (5) — total 25/25 passando
- [x] Salvar checkpoint final

## Barra de pesquisa de fornecedores na aba "Anotações / Diário"
- [x] Adicionar campo de busca por nome do fornecedor na aba Diário de cada dashboard (centralizado no ReportPanel, compartilhado por Aquário, Tapete, Yiwu e dashboards promovidos/grupos)
- [x] Filtrar a lista de fornecedores do diário em tempo real pelo termo digitado (case-insensitive, ignora acentos)
- [x] Estado vazio quando nenhum fornecedor casa com a busca + botão limpar (X) + contador "N de M"
- [x] Teste vitest da lógica de busca (5) — total 30/30 passando
- [x] Validar no preview (busca "gold" filtra; "xyz" mostra estado vazio) e salvar checkpoint

## Cadastro: destinos completos + enviar ao diário do dashboard
- [x] Seletor de grupo no /adicionar lista TODOS os destinos: 3 dashboards fixos (Aquário/Tapete/Yiwu) + todos os grupos personalizados (optgroups)
- [x] Ao salvar em destino fixo, cadastrar via useCustomSuppliers(scope) (aparece no diário do dashboard fixo)
- [x] Ao salvar em grupo personalizado, manter modelo ExtraSupplier (comportamento atual)
- [x] Após salvar, banner com botão "Ir para Anotações/Diário" que navega ao destino certo (Aquário: ?view=diario; Tapete/Yiwu: /anotacoes; grupo: /grupo/:id?tab=diario)
- [x] Abrir aba Diário via query param nos dashboards fixos (Aquário ?view) e no GrupoDashboard (?tab)
- [x] Relatório e cards de grupo dos 3 dashboards fixos resolvem o NOME do fornecedor manual (antes mostravam o id interno)
- [x] Teste vitest do ciclo create/list/delete de custom suppliers por scope (31/31 passando)
- [x] Validar no preview (destino Tapete: toast + banner + nome resolvido no relatório) e salvar checkpoint

## Planilha de Análise de Viabilidade (Tapete) — calculadora em cotações/catálogos
- [x] Tabela `viability_sheets` (scope, supplierId, data JSON com seções/linhas, createdAt, updatedAt) + migração aplicada
- [x] Helpers em server/db.ts (getViabilitySheet, upsertViabilitySheet) + procedures tRPC (data.viabilitySheets.get/upsert)
- [x] Hook client useViabilitySheet(scope, supplierId) com auto-save no banco compartilhado
- [x] Componente ViabilitySheetDialog: colunas Produto|Qtd|Preço Venda|Margem%|Preço Unit Fornecedor|Preço Unit Desejado|Preço pacote Desejado|Preço pacote Atual|Atende?
- [x] Fórmulas: G=H/C, I=C*F, J=IF(I<H,"SIM","NÃO"); campos editáveis amarelo (D,H) e laranja fornecedor (F)
- [x] Adicionar Seção e Adicionar Linha + remover; cores de seção alternadas
- [x] Ícone/botão de calculadora ("Calcular") nas seções Cotações e Catálogos do painel do fornecedor
- [x] Modal abre a planilha do fornecedor, recalcula automaticamente e salva no banco; não fecha por clique acidental fora
- [x] Teste vitest das fórmulas + ciclo get/upsert/update da planilha (40/40 passando) + validação no preview
- [x] Checkpoint salvo

## Planilha de Viabilidade (Tapete) — tela cheia + template idêntico ao Excel
- [x] Definir template-base idêntico ao Excel (seções 60x80 e 55x60 com 4 linhas cada, valores e fórmulas)
- [x] makeDefaultSheet do scope "tapete" usa o template-base pré-preenchido
- [x] Todos os fornecedores de Tapete iniciam com o template; edições salvam por fornecedor
- [x] Converter o modal em visão de tela cheia (largura total via style inline 100vw/100vh)
- [x] Scroll horizontal para ver todas as colunas sem cortes
- [x] Ajustar testes vitest (40/40 passando) e validar no preview (tela cheia confirmada 1280x1100)
- [x] Salvar checkpoint

## Classificação de preço ao aprovar fornecedor
- [x] Ao marcar "Fornecedor aprovado", exibir 3 opções: Preço Excelente / Preço Bom / Preço Ruim
- [x] Salvar a classificação em fields.precoClassificacao (excelente|bom|ruim) por fornecedor, no banco compartilhado
- [x] Exibir selo da classificação no card/cabeçalho do fornecedor (cor por tipo) — Tapete (2 locais), GrupoDashboard, Aquário (DiaryCard), Yiwu
- [x] Selo desaparece se o status deixar de ser "fornecedor-aprovado"
- [x] Teste vitest: persistência da classificação e remoção ao desaprovar (41/41 passando)
- [x] Validar no preview + checkpoint

## Selos de grupos no card RECOLHIDO (todos os dashboards)
- [x] Criar componente reutilizável GroupBadges (lê grupos compartilhados + personalizados por groupIds)
- [x] Selos com cor/número/nome do grupo; só aparecem se o fornecedor tiver groupIds
- [x] Inserir no cabeçalho do card recolhido: Tapete, Aquário (DiaryCard), Yiwu (GrupoDashboard já tem; CustomSuppliersSection não exibe status/grupos no recolhido)
- [x] Validar no preview + checkpoint


## Selos de grupos no card RECOLHIDO de todos os dashboards (CONCLUÍDO Jun/2026)
- [x] Criar componente reutilizável GroupBadges (grupos compartilhados + personalizados)
- [x] Tapete: exibir selos de grupo no cabeçalho recolhido (2 locais)
- [x] Aquário (DiaryCard): trocar render local por GroupBadges (inclui grupos personalizados)
- [x] Yiwu (Anotacoes): trocar render local por GroupBadges (inclui grupos personalizados)
- [x] GrupoDashboard: já exibia chips de grupo (mantido)
- [x] Validado no preview: selo "Nº 02 Tapete Higiênico Pet" aparece nos cards recolhidos do Tapete
- [x] 41/41 testes vitest passando + 0 erros TypeScript
- [x] Salvar checkpoint


## Filtro por clique nos cards de status (ReportPanel — todos os dashboards)
- [x] Card de status clicável: filtra a lista de detalhamento por aquele status
- [x] Clicar de novo no mesmo card desmarca (volta a mostrar todos) + botão Limpar filtro
- [x] Destaque visual (anel/borda) no card ativo + acessibilidade (button/aria-pressed)
- [x] Aplicar o filtro junto com período e busca por nome (statusFiltered)
- [x] Teste vitest do helper de filtro por status (6 testes)
- [x] Validar no preview + checkpoint


## Seção "Grupos de Fornecedores": listar TODOS os grupos (todos os dashboards)
- [x] Incluir grupos personalizados (custom_groups) + compartilhados na listagem, ordenados por número
- [x] Atualização automática conforme novos grupos são criados (polling/refetch já existente)
- [x] Tag PERS. nos personalizados (somente leitura; criados/editados na aba Adicionar Fornecedores)
- [x] Validar no preview + checkpoint


## Classificação Fabricante Direto x Trader/Intermediário (todos os dashboards)
- [x] Dois checkboxes no card expandido do fornecedor (Direto / Trader), mutuamente exclusivos, salvos em fields.tipoFornecedor
- [x] Selo claro no card RECOLHIDO mostrando Direto ou Trader (Tapete, Aquário, Yiwu, GrupoDashboard)
- [x] Filtro por tipo (Direto / Trader) no ReportPanel
- [x] Teste vitest do helper (persistência + filtro) — server/tipoFilter.test.ts, 11 testes
- [x] Validar no preview + checkpoint (cfe88d83)

## Classificação editável Aquário/Terrário (dashboard Aquário)
- [x] SUBTIPO_CONFIG (Aquário/Terrário) + helper, salvo em fields.subtipoAquario
- [x] Seletor de subtipo no card expandido do dashboard Aquário (SupplierNotesPanel, só escopo aquario)
- [x] Selo escolhido tem prioridade sobre supplier.category no card recolhido (DiaryCard)
- [x] Teste vitest da config/helper de subtipo (subtipoAquario.test.ts, 7 testes — 78/78 no total)
- [x] Validar no preview + checkpoint

## Correção do visualizador: planilhas e scroll horizontal
- [x] Visualizador embutido para planilhas (xls/xlsx/csv) no modal — renderizar como tabela (SheetJS) em vez de "não pode ser pré-visualizado"
- [x] Corrigir scroll horizontal do PDF no modal (atualmente só rola vertical) — container com overflow-x auto + largura mínima do conteúdo
- [x] Validar no preview (abrir planilha xls e PDF com zoom; rolar lateralmente) + checkpoint


## Selo de especialidade no card recolhido de fornecedor manual
- [x] Exibir selo 🐟 Aquário / 🦎 Terrário no card recolhido do CustomSupplierCard (scope aquario), lendo fields.subtipoAquario — validado no preview: Guangzhou Jiarong agora mostra 🐟 Aquário mesmo recolhido
- [x] Verificar que o selo de especialidade aparece SEMPRE que marcado, tanto em fornecedor manual quanto do catálogo (marcar/trocar/desmarcar reflete no card recolhido) — validado no preview com ciclo completo

## Grupo Nº 00 como primeiro card da home (Opção A)
- [x] Permitir número de grupo = 0 no modal Editar/Novo grupo (campo Número e validação saveGroup)
- [x] Na home, ordenar grupos promovidos por number (crescente); grupo com number 0 vem ANTES dos 3 dashboards principais (primeiro card)
- [x] Eyebrow do grupo 00 = "DASHBOARD 00"; demais cards permanecem 01, 02, 03...
- [x] Validar no preview: Central de Documentos aparece como 1º card com DASHBOARD 00 · Grupo Nº 00 (confirmado)

## Anotações/Diário como visão inicial em todos os dashboards
- [x] Aquário: viewMode inicial = "diario" (era "lista")
- [x] GrupoDashboard (novos/promovidos): tab inicial = "diario" (era "fornecedores")
- [x] Tapete: raiz redireciona para /anotacoes; menu reordenado (Anotações 1º); Painel Geral movido para /painel
- [x] Yiwu: raiz redireciona para /anotacoes; menu reordenado (Anotações 1º); Visão Geral movida para /visao-geral; breadcrumb Home ajustado
- [x] Validar no preview que cada dashboard abre no Diário/Anotações (Aquário, Tapete, Yiwu e GrupoDashboard confirmados)

## Mover "Anotações / Diário" para o TOPO do menu lateral
- [x] Aquário: item "Anotações / Diário" movido para o TOPO da sidebar (acima de Categorias) com separador
- [x] Tapete: "Anotações / Diário" já era o 1º item do menu (confirmado)
- [x] Yiwu: "Anotações / Diário" já era o 1º item do menu (confirmado)
- [x] Validar no preview: Aquário confirmado com Anotações/Diário no topo

## Replicar fornecedores nas abas Aquário/Terrário conforme classificação no Diário
- [x] Ler entradas de notas (useSupplierNotes "aquario") e montar mapa supplierId -> subtipoAquario (aquario/terrario)
- [x] No filtro de categoria do Aquário, a especialidade marcada no Diário tem prioridade sobre s.category (replica nas abas, sem remover do Diário)
- [x] Incluir fornecedores manuais (customSuppliers) classificados na lista filtrada por categoria (faixa "Cadastrados manualmente" via ClassifiedCustomList)
- [x] Atualizar contadores das categorias (Aquários/Terrários) para refletir os classificados (Aquário subiu para 12)
- [x] Validar no preview: manuais classificados como Aquário aparecem na aba Aquários de Vidro; Terrário sem manuais; nada removido do Diário (confirmado)


## Corrigir desmarque da especialidade (bug de merge no upsertEntry)
Causa: handleSubtipoClick faz `delete nextFields.subtipoAquario` ao desmarcar, mas upsertEntry faz merge ({...base.fields, ...patch.fields}); a chave deletada não é removida do banco, então o selo continua aparecendo após reload.
- [x] handleSubtipoClick: ao desmarcar, definir subtipoAquario = "" (string vazia) em vez de delete, para o merge persistir a remoção
- [x] Tratar subtipoAquario "" como ausência em: painel (active), CustomSupplierCard (selo), Home do Aquário (effectiveCategory, contadores, ClassifiedCustomList)
- [x] Validar no preview: marcar -> selo aparece; trocar -> muda; desmarcar -> some após reload (contador Terrários 12->11->12; selo some/volta no card recolhido)
- [x] Teste vitest de regressão (string vazia persiste no merge; delete não) — 80/80 passando


## Central de Documentos — Grupo Nº 00 (Fornecedores Parceiros → Assuntos → Anexos)
Escopo: SOMENTE o dashboard do Grupo Nº 00. Demais dashboards/grupos intocados.
Modelo: Parceiro (nome + nome chinês opcional) → vários Assuntos/Temas (título + observações) → vários Anexos (qualquer tipo, via S3, até 20 MB).
- [x] Schema: tabela `partner_topics` (id, partnerId, scope, title, notes, sortOrder, createdAt, updatedAt) + push
- [x] db.ts: helpers list/upsert/delete de partner_topics (por partnerId/scope)
- [x] routers/data.ts: router `partnerTopics` (list, upsert, delete) com zod
- [x] uploadRoute.ts: upload genérico aceita scope=`parceiro-<partnerId>` e supplierId=`<topicId>` (validado)
- [x] Hook client `usePartnerTopics(partnerId)` (tRPC, polling + reload pós-mutação)
- [x] UI: detectar Grupo Nº 00 (number === 0) no GrupoDashboard e renderizar a Central de Documentos (em vez do modelo comercial), mantendo a aba Anotações/Diário
- [x] UI: formulário simplificado de Parceiro (só Nome + Nome Chinês) ao cadastrar/editar no Grupo 00 (título e botão do modal ajustados para "parceiro")
- [x] UI: dentro do parceiro expandido, listar/criar/editar/excluir Assuntos; cada assunto com título, observações e área de anexos (reuso do uploader S3 + TopicAttachments com preview/visualizar/baixar/remover)
- [x] Teste vitest: helper/normalização de partner_topics e ordenação (84/84 passando)
- [x] Validar no preview: criar parceiro Betty → assunto "Vidro" → anexar PDF → reload persiste (confirmado)
- [x] Checkpoint
