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

# Migração para Banco de Dados Compartilhado (PostgreSQL)

## Fase A: Upgrade para full-stack
- [ ] Executar webdev_add_feature("web-db-user")
- [ ] Verificar que o backend e DB estão funcionando

## Fase B: Schema do banco
- [ ] Tabela `supplier_groups` (id, number, name, legend, color, created_at, updated_at)
- [ ] Tabela `supplier_notes` (id, scope, supplier_id, status, observacoes, fields JSON, group_ids JSON, created_at, updated_at)
- [ ] Tabela `supplier_attachments` (id, note_id, name, type, size, data_url TEXT, category, added_at)
- [ ] Tabela `supplier_quotes` (id, note_id, produto, qtd, moq, preco_fob, lead_time, pagamento, observacao)
- [ ] Tabela `extra_suppliers` (id, group_id, name, chinese_name, category, ncm, city, province, address, contact_name, contact_role, contact_language, moq, price_fob, lead_time, payment_terms, incoterm, notes, phones JSON, emails JSON, links JSON, created_at, updated_at)
- [ ] Tabela `custom_groups` (id, name, description, branch, color, icon, number, promoted, promoted_at, created_at, updated_at)
- [ ] Seed dos 2 grupos iniciais (Aquários & Terrários, Tapete Higiênico Pet)

## Fase C: Rotas de API
- [ ] GET/POST/PUT/DELETE /api/supplier-groups
- [ ] GET/POST/PUT/DELETE /api/supplier-notes/:scope
- [ ] POST/DELETE /api/supplier-notes/:scope/:supplierId/attachments
- [ ] GET/POST/PUT/DELETE /api/extra-suppliers
- [ ] GET/POST/PUT/DELETE /api/custom-groups

## Fase D: Migrar frontend
- [ ] useSupplierGroups.ts → fetch API em vez de IndexedDB
- [ ] useSupplierNotes.ts → fetch API em vez de IndexedDB
- [ ] useExtraSuppliers.ts → fetch API em vez de IndexedDB
- [ ] useCustomGroups.ts → fetch API em vez de IndexedDB

## Fase E: Testar
- [ ] Verificar que dados persistem entre sessões/navegadores
- [ ] Verificar que anexos são salvos e recuperados corretamente
- [ ] Verificar que GrupoDashboard funciona com dados do servidor

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
