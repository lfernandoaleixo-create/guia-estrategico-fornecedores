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


## Central de Documentos — simplificar (remover Diário/status) — Grupo Nº 00
Escopo: SOMENTE Grupo Nº 00. Demais dashboards mantêm a aba Anotações/Diário e os status comerciais.
- [x] No modo Central (isCentral): ocultar a barra de abas (sem "Anotações / Diário"); mostrar só a Central de Documentos
- [x] No modo Central: não renderizar a seção do Diário (status, métricas, relatório PDF)
- [x] Garantir que ?tab=diario no Grupo 00 não exibe nada comercial (isCentral força a seção de documentos)
- [x] Verificar TypeScript e rodar vitest (sem erros; 84/84)
- [x] Validar no preview: Grupo 00 mostra apenas parceiros/assuntos/anexos, sem aba Diário (confirmado com ?tab=diario)
- [x] Checkpoint


## Classificações MACRO (Home) — agrupar dashboards por macro
Escopo: nova camada acima dos dashboards. Macro = número + nome (ex.: "1. PET"). Cada dashboard/subgrupo pertence a no máximo 1 macro. Ordem definida pelo usuário gera numeração 1.1, 1.2, 1.3.

### Dados / Backend
- [x] Schema: tabela `macros` (id, number, name, color, itemsJson [ordered list de itens], createdAt, updatedAt). Item = { kind: "dashboard"|"subgroup", refId, label, href, subtipo? }
- [x] db.ts: helpers listMacros / upsertMacro / bulkUpsertMacros / deleteMacro
- [x] routers/data.ts: router `macros` (list, upsert, bulkUpsert, delete) com zod
- [x] pnpm db:push e verificar tabela criada (CREATE TABLE macros; nenhuma tabela existente alterada)

### Hook cliente
- [x] Hook `useMacros()` (tRPC, polling 5s + reload pós-mutação): createMacro/updateMacro/deleteMacro/reorder + atribuir/remover itens

### UI gestão de macros (Home)
- [x] Botão "Criar classificação MACRO" na Home (abre modal: número + nome + cor) — MacroManager + botão pendente de wire na Home
- [x] Editar macro: escolher itens (dashboards/subgrupos disponíveis), ordenar (↑/↓ define 1.1, 1.2, 1.3), remover
- [x] Catálogo de itens atribuíveis: 3 dashboards fixos (Aquário com 2 subitens Terrário/Aquário, Tapete, Yiwu) + grupos promovidos (macroCatalog.ts)
- [x] Garantir vínculo único: ao atribuir um item a um macro, remover de outro macro (assignItem)

### Home agrupada por macro
- [x] Render: seções por macro (título "Nº · Nome") com cards numerados hierarquicamente (1.1, 1.2…) + seção "Sem classificação" + card Adicionar
- [x] Aquário separado em 2 cards: Terrário (/aquario?subtipo=terrario) e Aquário (/aquario?subtipo=aquario); dashboard lê ?subtipo e abre filtrado
- [x] Botão "Classificações" no header abre o MacroManager; TypeScript sem erros
- [x] Seção "Sem classificação" para dashboards não atribuídos a nenhum macro (mantém card Adicionar)
- [x] Atualizar contadores/labels do hero conforme nova contagem (acessos + classificações macro)

### Dashboard Aquários (filtro por subtipo)
- [x] Ler ?subtipo=terrario|aquario e aplicar filtro inicial (mostra SOMENTE etiquetados daquela especialidade)
- [x] Não classificados aparecem SOMENTE na visão geral (sem filtro); filtros Terrário/Aquário não os incluem (effectiveCategory já garante isso)
- [x] Rótulo da especialidade do fornecedor passa a exibir numeração do macro: "1.1 - Terrário" / "1.2 - Aquário" (botões do painel + selo do card recolhido em DiaryCard e CustomSupplierCard; via useSubtipoHierLabel)

### Testes / Validação
- [x] Teste vitest: normalização/ordenação de macros e geração da numeração hierárquica (10 novos; 94/94 no total)
- [x] Validar no preview: criar macro "1 · PET", atribuir Terrário(1.1)/Aquário(1.2)/Tapete(1.3), reload persiste; atalho 1.1 abre /aquario?subtipo=terrario com 11 fornecedores Terrário (não classificados só na visão geral); badges 1.1/1.2 nos cards manuais
- [x] Checkpoint


## Refinos Macros + Aquário (rodada 2)

### Categorias contextuais no dashboard
- [x] No /aquario?subtipo=aquario: esconder categoria "Terrários para Répteis" da barra lateral
- [x] No /aquario?subtipo=terrario: esconder categoria "Aquários de Vidro" da barra lateral
- [x] Demais categorias (Todos, Equipamentos, Mercados & Feiras) permanecem; visão geral (sem subtipo) mostra tudo

### Cor accent por card na Home
- [x] Card Aquário com accent VERDE (antes vermelho/coral)
- [x] Card Terrário mantém vermelho; Tapete Higiênico azul

### Macro recolhido + reordenação
- [x] Seção de macro na Home começa recolhida (expande ao clicar no cabeçalho)
- [x] Setas para cima/baixo ao lado de cada card de macro na Home para reordenar os macros entre si (persistir ordem)

### Testes / Validação
- [x] vitest da ordenação de macros (mover) e helper de categorias visíveis por subtipo (server/macroOrder.test.ts — 10 testes; total 104/104)
- [x] Validar no preview: cores (Aquário verde, Terrário vermelho, Tapete azul), recolher/expandir, reordenar macros (PET 1→2→1), categorias contextuais
- [x] Checkpoint

## Filtro por especialidade + botão Duplicar fornecedor (rodada 3)

### Filtro por especialidade (Aquário x Terrário)
- [x] Fornecedor marcado como Terrário (subtipoAquario=terrario) deve SUMIR da visão Aquário (?subtipo=aquario) e aparecer só em Terrário (validado: Jiarong sumiu do Aquário)
- [x] Fornecedor marcado como Aquário some da visão Terrário
- [x] Fornecedores SEM especialidade definida NÃO aparecem nas visões filtradas (só na visão geral); na visão geral todos aparecem
- [x] Aplicado na seção de manuais do Diário (CustomSuppliersSection) via filterSubtipo + specialtyById

### Botão Duplicar fornecedor
- [x] Botão "⧉ Duplicar para outra negociação" no card do fornecedor manual
- [x] Copia dados de cadastro (nome, zh, contatos, cidade, província, categoria, links, telefones, emails)
- [x] Cria NOVO cadastro independente (novo id) com especialidade à escolha (Aquário/Terrário)
- [x] Negociação ZERADA (não herda status/observações/anexos/cotações da origem) — validado
- [x] Destinos v1: dentro do Aquário (Terrário↔Aquário); sufixo no nome para diferenciar

### Testes / Validação
- [x] vitest do helper de filtro por subtipo (customSupplierFilter.test.ts, 8 testes) e da duplicação (duplicateSupplier.test.ts, 8 testes) — total 120/120
- [x] Validar no preview (Jiarong some do Aquário; duplicar gera cadastro novo zerado e visível só na especialidade escolhida)
- [x] Checkpoint

## Métricas separadas por especialidade (rodada 4)

- [x] ReportPanel ganha seletor de especialidade: Todos / 🐟 Aquário / 🦎 Terrário
- [x] Métricas de status (Não visitado, Contato feito, ...) recalculam pela especialidade selecionada
- [x] Tipo de fornecedor (Fabricante/Trader), Total e anexos também respeitam o filtro de especialidade
- [x] Especialidade de cada fornecedor = fields.subtipoAquario; fallback = category original (aquario/terrario/equipamento)
- [x] Quando aberto via ?subtipo=aquario|terrario, o relatório já inicia naquele filtro
- [x] Helper puro de classificação de especialidade + vitest (specialtyReport.test.ts, 13 testes; total 133/133)
- [x] Validar no preview (Todos 37 / Aquário 11 / Terrário 13; métricas recalculam) e checkpoint

## Subgrupos numerados livres (macro.sub) — Entrega A
- [x] Tabela `subgroups` no schema (id, macroNumber, sub, name, color, createdAt, updatedAt) + push
- [x] Procedures tRPC data.subgroups (list/upsert/bulkUpsert/delete)
- [x] Hook useSubgroups (CRUD, validação de macro existente, polling 5s)
- [x] Helper puro subgroupNumber.ts (parse "1.4" -> {macro:1, sub:4}, validação, format, ordenação)
- [x] Bloquear criação se o macro digitado não existir (avisar para criar antes) — validado no browser ("9.1" rejeitado)
- [x] Cadastro de fornecedor: seletor/criação de subgrupo com número livre macro.sub + nome (SubgroupPicker em CustomSupplierFormDialog)
- [x] Persistir vínculo do subgrupo na nota do fornecedor (fields.subgroupId)
- [x] Selo do subgrupo (número + nome + cor) no card recolhido (useSubtipoHierLabel em DiaryCard/SupplierNotesPanel/CustomSupplierCard)
- [x] Filtro e métricas por subgrupo/especialidade (specialtyReport.ts + ReportPanel, substitui o filtro fixo Aquário/Terrário)
- [x] Separação total por dashboard: nada de terrário no Aquário e vice-versa (via scope + especialidade efetiva)
- [x] Migração: Aquários & Terrários -> subgrupos 1.1 Terrário e 1.2 Aquário no macro PET, re-vinculando fornecedores existentes (migrateSubtipo.ts + MigrateSubtipoButton; validado no browser: 5 fornecedores, 2 subgrupos)
- [x] vitest dos helpers (parse/numeração/validação) e da migração (subgroupNumber 18 + migrateSubtipo 8; total 159/159)
- [x] Validar no preview e checkpoint (migração, bloqueio de macro inexistente e criação válida 1.4 testados; dados de teste limpos; checkpoint salvo)

## Métricas de Uploads separadas por especialidade (Aquário/Terrário)
- [x] UploadMetrics aceita filtro de especialidade (specialtyEnabled + subtipoById + categoryById) com seletor Todos/🐟 Aquário/🦎 Terrário
- [x] Contagem de anexos respeita a especialidade efetiva de cada fornecedor (reaproveita matchesSpecialty)
- [x] Ligar na Home do Aquário (passar specialtyById/categoryById); demais dashboards inalterados
- [x] Validar no preview (Todos 5/4/9 · Aquário 2/1/3 · Terrário 3/3/6; somas batem) — TS limpo, 159/159 testes; checkpoint salvo

## GroupsManager → Subgrupos (macro.sub) nos dashboards
- [x] Converter GroupsManager para operar sobre useSubgroups (em vez de supplier_groups)
- [x] Renomear UI: "Grupos de fornecedores" → "Subgrupos"; botão "+ Novo grupo" → "+ Novo subgrupo"; modal "Novo/Editar subgrupo"
- [x] Campo Número no formato macro.sub (ex.: 1.3) + dica "Macros disponíveis: N (NOME)"; validar com validateSubgroupNumber (bloqueia macro inexistente/formato/duplicado)
- [x] Lista exibe subgrupos reais (1.1, 1.2…) ordenados, com editar/excluir (aviso ao excluir)
- [x] Ocultar numeração antiga: supplier_groups e grupos personalizados somem desta seção (GroupSummaryCards/GroupBadges removidos; dados preservados no banco)
- [x] Manter compatibilidade com Aquário/Tapete/Yiwu (mesmo componente compartilhado)
- [x] TS limpo + testes passando (159/159) + validado no preview (criado/removido 2.1 Marmita) + checkpoint

## Selo do subgrupo (macro.sub) no card recolhido de TODO fornecedor
- [x] DiaryCard (catálogo Aquário): ler fields.subgroupId e exibir selo "2.1 · Nome" via SubgroupBadge/useSubgroups (qualquer macro, não só Aquário/Terrário)
- [x] SupplierNotesPanel/Tapete/Yiwu: selo de subgrupo (SubgroupBadge) no cabeçalho recolhido
- [x] CustomSupplierCard: selo macro.sub já exibido a partir de fields.subgroupId
- [x] Número derivado do macro: usar formatSubgroupNumber(macroNumber, sub); reflete mudanças automaticamente
- [x] TS limpo + testes + validado no preview (selos 1.1/1.2 nos cards) + checkpoint

## Botão "Criar novo Macro" + reordenação preserva número/nome
- [x] Mover o botão "Classificações" do header para baixo, ao lado do título "Acesso direto à inteligência" (junto do "X / Y ativos"), com o texto "Criar novo Macro"
- [x] Schema: adicionar coluna `orderIndex` (int, default 0) à tabela `macros` + pnpm db:push (migration 0006; orderIndex inicializado = number)
- [x] db.ts/router: orderIndex incluído (macroInput + InsertMacroRow no upsert/bulkUpsert/list)
- [x] useMacros: ordena por orderIndex (fallback number); reorderMacros atualiza SOMENTE orderIndex (não mexe em number/name)
- [x] Numeração hierárquica (1.1…) e subgrupos (macroNumber) intactos ao reordenar (hierLabel usa m.number)
- [x] TS limpo + 159/159 testes + validado no preview (descer PET → ordem trocou mas Nº1 PET / Nº2 Utensílios mantidos; ordem restaurada) + checkpoint

## Renomear "grupo" -> "subgrupo" e adicionar fornecedor dentro de cada macro
- [x] Página Adicionar: card "Adicionar Fornecedores" — "Novos grupos" -> "Novos subgrupos", descrição -> subgrupos
- [x] Página Adicionar: bloco "Grupos Personalizados (N)" -> "Subgrupos Personalizados (N)"; texto e botão "Novo subgrupo"
- [x] Modal de criação: "Novo/Editar subgrupo"; "Número/Nome do subgrupo"; "Criar subgrupo"; placeholder e toasts
- [x] Varredura: GrupoDashboard (header SUBGRUPO Nº, rebaixar, scopeLabel) e Home (cards promovidos) renomeados; TS limpo
- [x] Adicionar botão/card "Adicionar fornecedor" dentro de cada seção de macro na Home
- [x] Ao adicionar a partir de um macro: fixar o número do macro e pedir só a 2ª parte do subgrupo (ex.: 1.__ Coleira de Cachorro)
- [x] TS limpo + testes + validar no preview + checkpoint

## Botão "Adicionar fornecedor" por macro na Home (Jun/2026)
- [x] Botão "Adicionar fornecedor em N · Nome" dentro de cada macro expandido na Home
- [x] SubgroupPicker: prop fixedMacroNumber (chips filtrados por macro + prefixo "N." fixo no modo criar, usuário digita só o sub)
- [x] CustomSupplierFormDialog: repasse de fixedMacroNumber ao SubgroupPicker
- [x] AddSupplierToMacroDialog: cria fornecedor (scope aquario) + grava vínculo de subgrupo na nota, com macro pré-fixado
- [x] Renomear todas as ocorrências de "grupo" para "subgrupo" (fotos anexadas)
- [x] Testes do caminho "macro fixo" em subgroupNumber.test.ts (164 testes verdes) + TS limpo
- [x] Validado no preview (macro 1 PET: chips 1.1/1.2 filtrados, prefixo "1." fixo, sugestão "3")

## Parceiro Chinês Responsável + filtro global por parceiro (Jun/2026)
- [x] Persistir lista de parceiros chineses (multi-nomes) por fornecedor (em fields da nota: partners JSON ou campo dedicado)
- [x] Editor "Parceiro Chinês Responsável" no painel do fornecedor: input para escrever o nome + cardzinhos removíveis (suporta vários)
- [x] Agregação global: dado um parceiro, listar todos os macros → subgrupos → fornecedores ligados a ele (todos os scopes), incluindo co-parceiros e anexos
- [x] Filtro por parceiro na página inicial (Home) com autosugestão dos nomes já cadastrados
- [x] Resultados organizados por macro/subgrupo, navegáveis até o fornecedor para baixar documentos
- [x] Testes vitest da agregação parceiro→fornecedores + normalização de nomes (12 novos testes)
- [x] TS limpo + validar no preview + checkpoint

## Ajustes Jun/2026 (2)
- [x] Remover/ocultar a seção "SUBGRUPOS" (bloco "+ Novo subgrupo" + chips) dos dashboards (aquario, tapete, yiwu) + imports limpos
- [x] Ocultar o card avulso "Adicionar Fornecedores" da área "Sem classificação macro" (cada macro já tem seu próprio botão "Adicionar fornecedor") — validado no preview

## Ajustes Jun/2026 (3)
- [x] Seletor de subgrupo (por macro): mostrar TODOS os subgrupos do macro, incluindo acessos do MacroManager (ex.: 1.3 Tapete), criando o vínculo de subgrupo automaticamente ao selecionar
- [x] Remover a seção "SUBGRUPOS" que ainda aparece DENTRO dos dashboards (residual) — confirmado: já não havia bloco nos dashboards
- [x] Eliminar a duplicação de selo no card do fornecedor (DiaryCard + CustomSupplierCard): mantido só o selo de subgrupo com ícone (🦎/🐟)
- [x] Remover o seletor "ESPECIALIDADE DO FORNECEDOR" (Aquário/Terrário) do painel do fornecedor
- [x] TS limpo + 183 testes + validado no preview + checkpoint (inclui ícone automático do subgrupo)

## Ajustes Jun/2026 (4)
- [x] Mover o bloco "Parceiro Chinês Responsável" para o TOPO do painel do fornecedor (acima do Subgrupo)
- [x] Deixar o bloco mais destacado (cartão com borda/fundo de acento, título maior, ícone reforçado)
- [x] TS limpo + 183 testes + validado no preview + checkpoint


## Fase — Migrar fornecedor Yiwu para macro (com subgrupo)
- [x] Helper puro `migrateToMacro.ts` (payload CustomSupplier + payload ExtraSupplier + nota completa por destino)
- [x] Teste vitest do helper puro (8 testes, total 191 passando)
- [x] Componente `MigrateToMacroButton` (escolhe macro já criado → escolhe item real do macro: subgrupo do Aquário OU grupo promovido, com rótulo macro.sub)
- [x] Cadastro no destino correto: grupo promovido → ExtraSupplier(groupId); subgrupo Aquário → CustomSupplier(aquario)+subtipo; dashboard fixo → CustomSupplier(scope). Copia status/observações/cotações. Marca a origem Yiwu como "Migrado → destino" (sem apagar histórico)
- [x] Integrar botão no SupplierNotesPanel (cabeçalho completo + barra compacta) visível apenas no Yiwu, ao lado de "Migrar contato"
- [x] Lista do Yiwu: oculta migrados por padrão + filtro "Migrados (N)" + selo "Migrado → destino" no card + migrados fora dos contadores de status
- [x] Validar TS (0 erros) e rodar testes (191 passando)
- [x] Validado no preview: migração para subgrupo (HongchenFirm → 2.1) e para grupo promovido (YangguangFirm → Marmita Plástica, contagem subiu)
- [x] Limpeza dos dados de teste: removido ExtraSupplier "YangguangFirm" e notas órfãs; banco com 15 ExtraSuppliers reais, 42 notas, 0 notas Yiwu de teste
- [x] Validação de persistência: procedures `data.notes.upsert` e `data.suppliers`/`data.extraSuppliers` são `publicProcedure` (gravam sem login); fluxos cobertos por testes vitest de persistência. Confirmação visual final cabe ao usuário no site publicado

## Fase — Numeração nova + separação Aquário/Terrário (Jun/2026)
- [x] Home: cards de grupos promovidos dentro de macro usam rótulo hierárquico macro.sub (eyebrow/subtitle), sem "Subgrupo Nº XX" antigo
- [x] Home: cards de grupos promovidos fora de macro mostram só o nome do ramo (sem número antigo)
- [x] GrupoDashboard: selo do cabeçalho e scopeLabel do ReportPanel usam macro.sub; selo nos cards de fornecedor sem "Nº XX"
- [x] Adicionar.tsx: removida numeração antiga (toast/atalho, lista de subgrupos, seletor de destino); badge numérico trocado por marcador
- [x] GroupBadges: removido "Nº XX", mantendo ponto colorido + nome
- [x] Aquário/Terrário: quando aberto por ?subtipo, a lista exclui a especialidade oposta (trava em filteredSuppliers)

## Ajustes Jun/2026 (5) — Card de migração + documentos no filtro da Home
- [x] Unificar a migração em UM único card "Migrar contato" com fluxo Macro → Subgrupo → migra e some da origem (reaproveita MigrateToMacroButton; título do modal e textos dos passos atualizados)
- [x] Liberar o fluxo macro→subgrupo para QUALQUER dashboard (não só Yiwu): Aquário, Terrário, Tapete, Yiwu e grupos promovidos
- [x] Remover o card antigo "Migrar contato" (MigrateButton) do SupplierNotesPanel (cabeçalho + barra compacta) e excluir o arquivo órfão
- [x] Ocultar migrados em TODOS os dashboards via ReportPanel central: filtro "Migrados (N)" + selo "Migrado" + migrados fora dos contadores (teste vitest migratedVisibility)
- [x] Filtro por parceiro na Home: VISUALIZAR e BAIXAR cada documento direto dali (sem botão que joga para o dashboard) — validado no preview (PDF + planilha)
- [x] Reaproveitar o lightbox/visualizador (PdfCanvas/SheetCanvas/img) e o stream de anexos (/api/attachment-file) na Home (módulo attachmentViewer.tsx)
- [x] TS limpo + 196 testes vitest passando + validado no preview (documentos PDF/planilha abrem e baixam na Home) + checkpoint

## Ajustes Jun/2026 (6) — Tradução CN⇄PT nos documentos
- [x] Eyebrow dos cards de entrada: Terrário mostra "TERRÁRIO", Aquário mostra "AQUÁRIO" (não mais "AQUÁRIOS & TERRÁRIOS")
- [x] Procedure de tradução no servidor (data.translate.toPt): LLM com saída JSON estruturada, filtra CJK, cache em memória, processa em blocos
- [x] Visualizador de planilha: toggle 中文/PT que traduz células CN⇄PT com cache no cliente (alternância instantânea)
- [x] Visualizador de PDF: modo PT com painel de tradução do texto por página; modo 中文 mostra o original renderizado
- [x] Download: menu de idioma (中文 original / Português) — planilha gera .xlsx-PT, PDF gera .txt-PT
- [x] TS limpo + 201 testes vitest passando + validado no preview (tradução CN⇄PT da planilha + alternância instantânea + menu de download por idioma) + checkpoint

## Correções Jun/2026 (7) — Bugs do visualizador de documentos
- [x] BUG: nomes das abas da planilha (过滤器, 增氧泵, UV灯系列...) não traduzem no modo PT — incluir wb.SheetNames na tradução e exibir nome traduzido
- [x] BUG: conteúdo da página de fundo vazando por trás do modal — renderizar lightbox em portal no body, fundo opaco + backdrop-blur, travar scroll
- [x] Atualizar/adicionar testes vitest (sheetTranslationCells, 206 passando)
- [x] TS limpo + testes passando + checkpoint

## Correções Jun/2026 (8) — Menu "Baixar em" recortado pela borda do modal
- [x] BUG: dropdown "Baixar em" cortado pela borda do modal (overflow) — trocar position absolute por fixed posicionado via getBoundingClientRect do botão Baixar
- [x] z-index máximo no menu/backdrop para ficar acima de tudo; reposiciona ao reabrir
- [x] TS limpo + validado no preview (menu aparece inteiro, ambas opções visíveis) + checkpoint

## Correções Jun/2026 (9) — Remover filtro de grupos antigos do Yiwu
- [x] BUG: barra "Grupos:" na página de Anotações do Yiwu mostrava classificações antigas (Nº 01 Aquários & Terrários, Nº 02 Tapete Higiênico Pet) que não se aplicam — bloco do filtro removido (grupos seguem intactos no banco)
- [x] TS limpo + validado no preview (label "Grupos:" não existe mais na página) + checkpoint

## Feature Jun/2026 (10) — Migrar contato para "Sem classificação macro" (Yiwu)
- [x] No modal "Migrar contato" (MigrateToMacroButton), adicionar no Passo 1 a opção "Sem classificação macro" além dos macros existentes (sempre visível quando há macros)
- [x] Ao escolher "Sem classificação", o Passo 2 lista os destinos sem macro (dashboards/subgrupos/grupos não atribuídos a nenhum macro — inclui Yiwu); estado vazio explicativo quando não há destino
- [x] Reaproveitar createInDestination existente; o destino Yiwu cria CustomSupplier scope "yiwu"
- [x] Evitar listar a própria origem como destino (opção A)
- [x] 5 testes de unidade em unclassifiedDestinations.test.ts (origem Yiwu → vazio; origem Tapete/Aquário → Yiwu disponível) — 206 testes verdes
- [x] TS limpo + validado no preview (opção aparece no topo do Passo 1) + checkpoint

## Feature Jun/2026 (11) — Serviço de tradução de documentos completo
- [x] Trocar subtítulo da Home "Selecione um acesso" → "Classificação geral de grupos macro"
- [x] Backend: tradução genérica (qualquer idioma estrangeiro → PT) via isTranslatable() — chinês/CJK + inglês, preserva PT
- [x] Backend: OCR multimodal (ocrTranslateImage) + procedure data.translate.ocrImage para imagens e páginas de PDF
- [x] Frontend: toggle Original⇄PT aparece sempre para imagem/PDF/planilha (validado no preview com NOMOYPET .xlsx, Mclanzoo .pdf e Cota_o.jpg)
- [x] Frontend: suporte a tradução de imagens (via OCR) no visualizador — painel lado a lado Original/PT (validado: Cota_o.jpg traduzida com tabela de preços em PT)
- [x] Frontend: PDF sem texto → fallback OCR por página, com estados de carregamento (validado: Mclanzoo.pdf traduzido página a página com "Traduzindo o conteúdo…")
- [x] Download traduzido: .xlsx (planilha), .txt (PDF/imagem) — handleDownloadPt por tipo
- [x] Testes vitest + validar no preview + checkpoint — 217 testes verdes (inclui attachmentTranslateToggle.test.ts cobrindo toggle por tipo e formato de download)
- [x] FIX: toggle Original/PT não aparecia em planilha em inglês (NOMOYPET). Decisão: mostrar o toggle SEMPRE para planilhas e PDFs (independe de detecção frágil de idioma); imagens mantêm OCR. Evita falsos negativos.
- [x] FIX: anexos do painel de fornecedor abriam um visualizador duplicado (AttachmentPreviewModal local, sem tradução). Unificado para usar o AttachmentLightbox (com toggle Original/PT, OCR e download por idioma).
- [x] FIX (causa raiz da tradução): o useEffect de reset do AttachmentLightbox tinha `imageOcr` (objeto não memoizado) nas deps, fazendo `setLang("zh")` rodar a cada render e reverter o idioma logo após clicar em "PT". Corrigido para depender apenas de `attachment?.id` (reset via ref estável). Tradução EN→PT agora aplica nas células.
- [x] TESTE: server/sheetTranslatableEnglish.test.ts cobre a heurística de tradução EN→PT (frases traduzem; números/preços/dimensões/códigos não). Suíte completa: 210 testes verdes.

## Feature 12 — Dashboard automático por subgrupo (macro.sub)

Problema: ao cadastrar um fornecedor num subgrupo NOVO dentro de um macro (ex.: 1.4 Coleira de cachorro), o fornecedor é salvo (scope aquario + fields.subgroupId) mas não aparece em nenhum dashboard navegável. A Home só mostra cards fixos e grupos personalizados promovidos; o dashboard /aquario só filtra Aquário/Terrário.

- [x] Criar página SubgroupDashboard em /subgrupo/:id (reaproveita visual do GrupoDashboard)
- [x] Listar customSuppliers (scope aquario) com fields.subgroupId === id, com busca, cadastro/edição e SupplierNotesPanel (anexos + tradução)
- [x] Registrar rota /subgrupo/:id em App.tsx
- [x] Na Home, renderizar os subgrupos de cada macro (useSubgroups.byMacro) como cards extras, linkando para /subgrupo/:id, no mesmo padrão visual
- [x] Garantir contagem de fornecedores por subgrupo no card
- [x] Validar no preview com 1.4 Coleira de cachorro (Zé Coleiras) + criar fornecedor + subgrupo novo 1.5 de uma vez (card surge na Home, dashboard navegável)
- [x] FIX UX: criar subgrupo novo no formulário não apaga mais o nome do fornecedor já digitado (effect de reset deixou de depender de subgroupId)
- [x] Helpers puros subgroupFilter.ts (filtro/contagem/busca) compartilhados entre página e Home
- [x] TESTE: server/subgroupFilter.test.ts (19 testes). Suíte completa: 231 testes verdes. TypeScript sem erros. Checkpoint salvo.


## Feature 13 — Excluir subgrupo pelo card (Home)

- [x] Adicionar botão de excluir no card de subgrupo da Home (com confirmação via AlertDialog)
- [x] Ao excluir, desvincular os fornecedores (limpar fields.subgroupId das notas do scope aquario)
- [x] Atualizar a contagem/lista após exclusão (reload)
- [x] Validar no preview removendo 1.1 Terrário e 1.2 Aquário (subgrupos de teste)
- [x] Teste vitest do helper de desvínculo + checkpoint

## Feature 13 — Excluir subgrupo pelo card (Home)
- [x] DashboardCard: prop opcional `onDelete` + botão de lixeira (Trash2) no hover (canto superior esquerdo)
- [x] useSupplierNotes: adicionar `upsertEntryAsync` (versão que aguarda persistência)
- [x] Home: estados `subgroupToDelete`/`deletingSubgroup` + `deleteSubgroup` do hook
- [x] Home: handler `handleDeleteSubgroup` (desvincula fornecedores e depois deleteSubgroup)
- [x] Home: passar `onDelete`/`deleteTitle` aos cards de subgrupo
- [x] Home: AlertDialog de confirmação (não window.confirm)
- [x] Type-check + testes verdes
- [x] Validar no preview excluindo subgrupos 1.1 e 1.2 de teste (PET)
- [x] Checkpoint

## Feature 14 — Excluir cards de acesso fixos e macros inteiros (Home)
Confirmado com o usuário: excluir card de acesso fixo = apenas oculta do portal (Home), sem apagar dados dos fornecedores do dashboard correspondente. Excluir macro = remove a classificação e desvincula (não apaga) os itens.

- [x] Persistir lista de cards de acesso fixos ocultos (hook useHiddenCards + tabela app_settings + procedures settings.get/set)
- [x] Botão de lixeira + AlertDialog nos cards de acesso fixos (Terrário, Aquário, Tapete, Yiwu)
- [x] Excluir macro inteiro (deleteMacro) com AlertDialog (camada aditiva: itens voltam para Sem classificação, nada é apagado)
- [x] Painel "Cards removidos" no fim da Home com botão Restaurar (reversível)
- [x] Testes de unidade da lógica de ocultar/excluir (server/hiddenCards.test.ts — 11 testes)
- [x] Validado no preview: remover Terrário (7→6), restaurar (6→7), lixeira de macro presente. Suíte: 247 testes verdes. TypeScript sem erros.


## Feature 15 — Trocar a cor dos cards/dashboards dentro dos macros
Permitir que o usuário escolha a cor de cada card. Subgrupos e grupos promovidos já têm color persistido (updateSubgroup/updateGroup). Cards de acesso fixos usam override em app_settings (chave cardColors: key->cor).

- [x] Botão de paleta no DashboardCard (hover, ao lado da lixeira) que abre popover com 8 cores (SUBGROUP_PALETTE)
- [x] Subgrupo: ao escolher cor -> updateSubgroup(id, { color })
- [x] Grupo promovido: ao escolher cor -> updateGroup(id, { color })
- [x] Card fixo: hook useCardColors (app_settings cardColors) -> override de accent na Home
- [x] Derivar os 4 tons (accent/soft/bg/border) via deriveAccent (cardAccent.ts)
- [x] Testes de unidade (server/cardColors.test.ts — 11 testes: deriveAccent + parseCardColors)
- [x] Validado no preview: card Aquário vermelho->azul, persistido após reload. Suíte: 258 testes verdes. TypeScript sem erros.


## Feature 16 — Reposicionar botões de ação + paleta de cores ampliada
- [x] Reposicionar lixeira+paleta para o canto superior direito (agrupados, sem cobrir o eyebrow/título); pr-24 no eyebrow
- [x] Ampliar CARD_COLOR_PALETTE para 47 cores organizadas por matiz (claro/médio/escuro) + Cinza e Branco gelo
- [x] Popover com grade de 7 colunas + scroll + campo de cor personalizada (color picker nativo + input hex + OK)
- [x] Overlay para fechar o popover ao clicar fora
- [x] Testes atualizados (server/cardColors.test.ts: paleta >= 40, rótulos, deriveAccent para toda a paleta) — 260 testes verdes
- [x] Validado no preview: botões no canto direito sem sobrepor texto; Yiwu trocado para índigo e restaurado para laranja


## Feature 17 — Gerenciar parceiros chineses do filtro (cadastrar/excluir)
Parceiros do filtro deixam de ser apenas derivados de fornecedores. Agora há parceiros avulsos persistidos em app_settings (chave managedPartners), unidos aos derivados.

- [x] Hook useManagedPartners (parceiros avulsos persistidos em app_settings, chave managedPartners)
- [x] parseManagedPartners robusto (JSON array, dedup por forma normalizada, descarta vazios/corrompidos)
- [x] União das sugestões: derivados de fornecedores + avulsos (sem duplicar, ordem alfabética pt-BR)
- [x] Cadastrar parceiro: Enter no campo ou botão "Cadastrar 'X'" no dropdown -> aparece como chip na hora
- [x] Excluir parceiro: botão "x" no chip; bloqueado (com aviso) quando há fornecedores/macros vinculados; avulso sem vínculo some
- [x] Chips diferenciam visualmente vinculados (roxo) vs avulsos sem vínculo (cinza)
- [x] Testes de unidade (server/managedPartners.test.ts — 13 testes: parse, união, regra de exclusão, dedup)
- [x] Validado no preview: cadastrei "Carol" (chip Betty·Carol·Lilly), excluí Carol (voltou a Betty·Lilly). Suíte: 273 testes verdes. TypeScript sem erros.


## Feature 18 — Reverter cadastro avulso + relação entre co-parceiros
Fernando: o cadastro de parceiros acontece DENTRO do fornecedor (campo "Parceiro Chinês Responsável"), não na Home. O filtro da Home só lista parceiros derivados de fornecedores. Novidade: co-parceiros do MESMO fornecedor ficam relacionados — filtrar Betty mostra Betty + Lilly (co-responsáveis) e vice-versa.

- [x] Reverter PartnerFilterPanel: remover useManagedPartners, botão Cadastrar, opção de cadastro no dropdown e botão de exclusão dos chips
- [x] Chips voltam a ser apenas atalho para selecionar o parceiro (sem "x" de excluir)
- [x] Ao filtrar um parceiro, exibir chips de co-parceiros relacionados (derivados do mesmo fornecedor) clicáveis (troca o filtro)
- [x] Garantir dedup e exclusão do próprio nome da lista de relacionados
- [x] Testes de unidade da agregação de co-parceiros
- [x] Validar no preview filtrando Betty (mostra Lilly relacionada) + checkpoint
- [x] Corrigir agregação: fornecedores de Aquário por subtipo (Terrário/Aquário) com subgroupId vazio passam a ser associados ao macro (item subgroup:scope:subtipo)

## Feature 19 — Tradução só para Word/Excel + parceiro no card recolhido
Fernando: PDF não compensa traduzir (lento e desconfigura). Manter tradução apenas para Word e Excel (velocidade + precisão, sem desconfigurar). Além disso, exibir os parceiros chineses cadastrados no card recolhido do fornecedor, para boa visualização.

- [x] Restringir tradução do visualizador apenas a planilhas (xlsx/csv/ods) e Word (docx) — remover toggle Original/PT de PDF e imagem
- [x] Implementar tradução de Word (.docx) preservando formatação (gera .docx-PT) via JSZip + edição de document.xml
- [x] PDF continua abrindo no visualizador, porém com download simples (sem opção PT)
- [x] Exibir chips de "Parceiro Chinês" no card recolhido do fornecedor (junto de status/anexos/grupo)
- [x] Garantir que o card recolhido fique legível com 1+ parceiros (truncar/limitar com "+N")
- [x] Testes/validação no preview (Word PT validado: preview + download .docx-PT preservando tabela/estilos; chip Betty no card recolhido)

## Feature 21 — Card de subgrupo: eyebrow com nome + subtítulo editável
Fernando: o rótulo do topo do card de subgrupo deve mostrar o nome do dashboard (igual aos outros), e o texto colorido do meio ("Subgrupo do macro") deve ser editável para escrever o que quiser.

- [x] Adicionar coluna `subtitle` (texto livre, opcional) na tabela subgroups + migração (pnpm db:push)
- [x] Eyebrow do card de subgrupo passa a exibir o nome do dashboard (card da Home + topo do dashboard); numeração mantida no badge lateral
- [x] Subtítulo do card de subgrupo passa a usar `subtitle` (fallback "Subgrupo do macro" quando vazio)
- [x] UI para editar o subtítulo do subgrupo (edição inline com lápis no topo do dashboard do subgrupo)
- [x] Procedure/db helper para salvar subtitle do subgrupo (coluna subtitle + subgroupInput + upsertSubgroup)
- [x] Testes (subgroupSubtitle.test.ts) + validado no preview (editar/persistir/fallback) — 303 testes passando

## Feature 22 — Melhorar tradução de planilha + download de PDF como arquivo
Fernando: (1) algumas traduções deixam termos no idioma original (cabeçalhos/nome de fornecedor com "(广)", unidades 只/个/支/盒, células mistas "Motor 389元 Rotor 135元"); (2) ao baixar PDF, está vindo como link em vez de salvar o arquivo .pdf no computador.

- [x] Melhorar heurística isTranslatableText (cliente + servidor): script não-latino SEMPRE traduz; removido o guard t.length<2 para CJK (pega texto misto e 1 caractere)
- [x] Traduzir unidades comuns (只/个/支/盒/件/双/对/套/袋/瓶/卷/元) mesmo isoladas — prompt do LLM reforçado com lista e regra "sem resíduo de chinês"
- [x] Garantir tradução de texto misto e nome de fornecedor com sufixo entre parênteses ((广)=Cantão) — prompt proíbe deixar CJK no resultado
- [x] Corrigir download de PDF: Blob reembalado com MIME correto (application/pdf via mimeForName/blobWithCorrectType) + fallback <a download>; salva o binário .pdf
- [x] Testes (mimeForName/blobWithCorrectType, CJK isolado, texto misto, nome com parênteses) — suíte 318 verde, TypeScript limpo

## Feature 23 — Métricas/Relatório no dashboard de SUBGRUPO
Fernando: ao criar subgrupos (ex.: 1.4 Coleiras pra cachorro), o dashboard do subgrupo só lista fornecedores — não mostra as métricas de upload nem o relatório de status (como os outros dashboards).

- [x] Adicionado prop opcional `supplierIds?: string[]` ao UploadMetrics: quando presente, conta apenas anexos desses fornecedores (dashboards atuais inalterados)
- [x] SubgroupDashboard agora exibe o painel "Métricas de uploads" restrito aos fornecedores do subgrupo (scope aquario + supplierIds)
- [x] SubgroupDashboard agora exibe o "Relatório de Atividades" (ReportPanel) com entries/allSupplierIds só do subgrupo + resolveSupplierName + Exportar PDF
- [x] Seção só aparece quando o subgrupo tem fornecedores (estado vazio coberto)
- [x] Teste subgroupMetrics.test.ts (contagem por supplierIds) + suíte 322 verde + TypeScript limpo + validado no preview (subgrupo 1.4)

## Feature 24 — Macro recém-criado (vazio) não aparece na Home
Fernando criou o Macro "Documentos" e ele não apareceu. Causa: Home.tsx linha ~601 faz `if (totalAcessos === 0) return null;`, ocultando macros sem itens/subgrupos.

- [x] Renderiza macros mesmo quando vazios (removido o `return null` por totalAcessos===0)
- [x] Estado vazio do macro: card pontilhado com mensagem + botão "Adicionar fornecedor" já existente funciona
- [x] Reordenar/excluir continuam funcionando para macro vazio (botões no cabeçalho)
- [x] Validado no preview: macro "4 · Documentos · 0 acessos" agora aparece na lista
- [x] Teste macroEmptyVisible.test.ts + suíte 325 verde + TypeScript limpo

## Feature 25 — Permitir número 0 no macro
Fernando quer poder definir o número do macro como 0 (ex.: "0 · Documentos"). Hoje há guardas `> 0` no cliente que bloqueiam o 0.

- [x] useMacros.createMacro: aceita número fornecido >= 0 (0 explícito respeitado); undefined/NaN = automático; Set de usados corrigido para não descartar 0
- [x] MacroManager.handleCreate: envia number quando campo preenchido (inclusive 0), undefined quando vazio
- [x] MacroManager edição inline: permite n >= 0 e min={0} nos inputs
- [x] Servidor já aceita z.number().int() (0 ok) — sem mudança
- [x] Teste macroNumberZero.test.ts + suíte 331 verde + TypeScript limpo + validado no preview (criado "0 · Central Zero" e removido)

## Feature 26 — Potencial do fornecedor + Resumo da negociação
Fernando quer, dentro de cada fornecedor (todos os dashboards/cards/subgrupos): (a) ticar o POTENCIAL = Alto (verde) / Médio (laranja) / Baixo (vermelho), aparecendo também no card recolhido; (b) um campo de texto livre "Resumo da negociação", similar a Observações.

- [x] useSupplierNotes.ts: tipo Potencial + POTENCIAL_CONFIG (alto/verde, medio/laranja, baixo/vermelho) + POTENCIAL_ORDER; armazenado em fields.potencial e fields.resumoNegociacao (sem migração de schema)
- [x] SupplierNotesPanel.tsx: bloco "Potencial do fornecedor" (3 botões mutuamente exclusivos, padrão handleTipoClick) — salva no clique
- [x] SupplierNotesPanel.tsx: campo "Resumo da negociação" (textarea) com estado próprio + sync + persistido no handleSave (merge em fields)
- [x] PotentialBadge.tsx: novo selo para o card recolhido (padrão TipoBadge)
- [x] CustomSupplierCard.tsx + GrupoDashboard (cards de catálogo): exibem PotentialBadge no cabeçalho recolhido ao lado dos selos existentes
- [x] Teste supplierPotential.test.ts (POTENCIAL_CONFIG, badge resolve, resumo persiste) + suíte 339 verde + TypeScript limpo + validado no preview (marcado 🟢 Alto + resumo, persistiu após reload)

## Feature 27 — Botão "Resumo das Negociações" (painel de visão executiva, só leitura)
Fernando quer um botão no topo da Home (à direita do cabeçalho, perto de "7 ACESSOS · ATUALIZADO MAI/2026") chamado "Resumo das Negociações". Ao clicar, abre um PAINEL amplo e grande (modal/overlay) sobre a home, em modo somente leitura, voltado aos gestores (sem cadastro/diário/anotações operacionais). Não mexer em nada do que já está pronto — apenas acrescentar. O conteúdo do painel será definido conforme instruções do Fernando.

- [x] Adicionado botão "Resumo das Negociações" no cabeçalho da Home (à esquerda do selo de acessos), sem alterar itens existentes
- [x] Criado NegotiationSummaryPanel (modal/overlay amplo max-w-5xl) só leitura, com cabeçalho, conteúdo rolável, fechar via X/ESC/clique fora
- [x] Nível 1: lista compacta de macros (número · nome · contagem de subgrupos); Nível 2: ao clicar, mostra subgrupos do macro (compacto) com botão voltar
- [x] Validado no preview: painel abre, lista macros, clica em Utensílios/Casa → mostra 2.1 Marmita Plástica
- [x] Níveis seguintes (Nível 3): fornecedores ticados por acesso com nome, potencial, preço, status livre, resumo opcional e endereço com mapa/satélite + filtros combináveis (concluído)
- [x] Teste da lógica do painel + suíte verde + TypeScript limpo (negotiationAccesses.test.ts, 345 verdes)

- [x] Painel Resumo: no Nível 2, mostrar TODOS os acessos do macro = união de macro.items (dashboards/subgrupos/grupos, ex.: Terrário, Aquário, Tapete do PET) + subgrupos da tabela `subgroups` (byMacro). Hoje só lia `subgroups`, por isso o PET aparecia vazio.

## Feature 28 — Ticagem de Preço sempre visível + Status livre editável
Fernando quer, dentro de CADA fornecedor: (a) uma ticagem de Preço com 3 opções — Ótimo (verde), Bom (azul), Ruim (vermelho) — sempre visível (não só quando aprovado); (b) um campo de status LIVRE editável (texto) onde ele escreve o que quiser.

- [x] PRECO_CONFIG ajustado: excelente="Preço Ótimo" (verde), bom="Preço Bom" (AZUL), ruim="Preço Ruim" (vermelho)
- [x] Ticagem de Preço sempre visível no SupplierNotesPanel (independente do status)
- [x] Campo "Status (livre)" editável em fields.statusLivre (textarea/input), persistido no handleSave
- [x] Exibir status livre no card recolhido (badge/linha)
- [x] Atualizar testes (cores/labels do preço + persistência do status livre), validar no preview e salvar checkpoint
- [x] Remover seção de filtro "Status / Apenas com status preenchido" do Nível 3 (mantidos Potencial e Preço)

## Feature 29 — Nível 3 do Resumo das Negociações + filtros combináveis
- [x] Corrigir duplicação em supplier_notes (unique scope+supplierId, upsert atômico, dedup do banco)
- [x] Mapear associação fornecedor↔subgrupo (fields.subgroupId) e endereços por escopo
- [x] Nível 3: ao abrir Resumo → Macro → Subgrupo, listar fornecedores que tenham potencial OU preço OU status livre ticado
- [x] Para cada fornecedor: nome, potencial, preço, status livre (somente esse), resumo (só se houver texto)
- [x] Endereço clicável → mapa principal + opção satélite (localização na China)
- [x] Filtros combináveis (potencial + preço + status), múltiplos ao mesmo tempo
- [x] Testes de unidade (seleção/filtragem) verdes
- [x] Validar no preview e salvar checkpoint

## Feature 30 — Nada pode sumir ao salvar (blindar persistência de observações/campos)
- [x] Reproduzir a perda de observações ao salvar e identificar a causa raiz (cliente → servidor → banco)
- [x] Garantir merge não-destrutivo de fields/observações/anexos no save (nunca sobrescrever com vazio)
- [x] Corrigir resets indevidos de estado (useEffect) que apagam o que foi digitado
- [x] Testes de regressão cobrindo save parcial sem perder campos existentes
- [x] Validar no preview (observações + status + preço + resumo persistem) e checkpoint

## Feature 31 — Enriquecimento do Nível 3 + Mapa com rotas
- [x] Estender NegotiationSupplier: tipoFornecedor, parceiros (todos), anexos por categoria (nomes), city/province/district/address separados
- [x] groupAttachmentsByCategory (módulo puro) com testes
- [x] useNegotiationLevel3 passa district dos CustomSuppliers
- [x] Card do Nível 3: selos por extenso e maiores ("Potencial Alto", "Preço Bom")
- [x] Card do Nível 3: tipo de fornecedor (Fabricante Direto / Trader)
- [x] Card do Nível 3: parceiro(s) chinês(es) — todos, sem cortar
- [x] Card do Nível 3: anexos por categoria com contagem + nomes completos (sem truncar)
- [x] SupplierMapDialog: cabeçalho mostra cidade/distrito/província além do endereço
- [x] SupplierMapDialog: seção Rotas (destino, modos carro/transporte/a pé, distância em km e tempo) via DirectionsService/DirectionsRenderer
- [x] Map.tsx: biblioteca "routes" adicionada ao script do Google Maps
- [x] Testes do Nível 3 atualizados (district, tipo, parceiros, anexos) — 385 verdes, TypeScript limpo

## Correção — Permitir subgrupos no macro 0 (ex.: Documentos → 0.1, 0.2, 0.3)
- [x] parseSubgroupNumber passa a aceitar macro 0 e sub 0 (rejeita apenas negativos)
- [x] validateSubgroupNumber/SubgroupPicker/GroupsManager liberam criação no macro 0
- [x] Testes atualizados (parse 0.1/0.3/1.0, validação no macro 0, duplicado 0.1) — 387 verdes, TS limpo

## Feature 32 — Anexos clicáveis + status + modos ferroviários
- [x] Card N3: cada anexo com botão visualizar (olho) e baixar
- [x] Card N3: bloco de anexos mais compacto e alinhado à direita
- [x] Card N3: prefixar status livre com "Status: " (ex.: "Status: Parado em nós")
- [x] Mapa: adicionar modo "Trem" (TRANSIT + RAIL) e "Trem bala" (HIGH_SPEED_TRAIN)
- [x] Testes atualizados + suíte verde + TS limpo

## Feature 33 — Subgrupo mesclado + anexos rápidos
- [x] buildAccesses: subgrupo numerado mescla na posição/ícone do item de macro (sem reordenar nem trocar logo)
- [x] Endpoint /api/attachment-file: streaming + suporte a Range + download direto (?download=1)
- [x] downloadAttachment: link direto (sem baixar blob inteiro no navegador)
- [x] PdfCanvas: carrega PDF por URL com Range (renderização progressiva)
- [x] Testes atualizados (387 verdes) e typecheck limpo

## Feature 34 — Pastas nomeadas nos anexos
- [x] Modelo: adicionar campo opcional `folder` em SupplierAttachment
- [x] Backend de upload: aceitar e preservar `folder`
- [x] UI fornecedor: criar pastas com nome livre (sem limite)
- [x] UI fornecedor: upload de pasta pronta (webkitdirectory) agrupando pelo nome da pasta
- [x] Resumo das Negociações: exibir pastas (nome + arquivos com olho/baixar) além dos avulsos por categoria
- [x] Testes + typecheck + checkpoint

## Feature 34 — Pastas nomeadas nos anexos
- [x] Modelo: adicionar campo opcional `folder` em SupplierAttachment
- [x] Backend de upload: aceitar e preservar `folder`
- [x] UI fornecedor: criar pasta (nome livre, sem limite)
- [x] UI fornecedor: enviar pasta pronta (webkitdirectory)
- [x] UI fornecedor: anexar arquivos dentro de pasta
- [x] groupAttachmentsByCategory exclui anexos com pasta
- [x] groupAttachmentsByFolder agrupa por pasta
- [x] Resumo das Negociações exibe pastas (nome + arquivos com olho/baixar)
- [x] Testes de pastas + suíte verde (390)

## Feature 35 — Correção de bugs (resumo + duplicação)
- [x] Corrigir duplicação de dashboard ao marcar subgrupo (Home.tsx: subgroupCardsByMacro exclui subgrupos cujo nome coincide com itens do macro)
- [x] Corrigir potencial/preço/status não aparecendo no Resumo das Negociações (buildAccesses preserva source/refId do dashboard próprio — tapete/yiwu/grupo — em vez de forçar base "aquario"; só itens da base aquário viram "aquario-subgroup")
- [x] Testes (392 verdes) + typecheck (limpo) + checkpoint

## Feature 36 — Corrigir "não consigo desmarcar potencial/preço" no painel de anotações
- [x] Causa: upsertEntry fazia MERGE dos fields (base + patch); ao desmarcar, a chave removida reaparecia (valor antigo no banco preservado)
- [x] upsertEntry/upsertEntryAsync ganham flag `replaceFields`; quando true, o patch.fields SUBSTITUI integralmente os fields (permite remover chave)
- [x] SupplierNotesPanel passa replaceFields:true em potencial/preço/tipo/status/parceiros/subgrupo/handleSave (sempre envia o objeto completo)
- [x] Chamadas parciais ({ subgroupId }) em Home.tsx/SubgroupDashboard.tsx mantêm o merge (sem o flag)
- [x] Função pura resolveNextFields + teste de regressão (resolveNextFields.test.ts, 6 testes) — 398 verdes, TS limpo
