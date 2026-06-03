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
