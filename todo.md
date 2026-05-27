# Adicionar Fornecedores + Migrar Contato + Promoção a Dashboard

## Fase 1 — Modelo de dados
- [ ] Criar `useCustomGroups` (id, nome, ramo, cor, promotedToDashboard?, createdAt)
- [ ] Criar `useExtraSuppliers` (fornecedores avulsos cadastrados na 4ª aba — separados dos 3 scopes)
- [ ] Helper `migrateSupplier(fromScope, toScope, supplierId)` movendo SupplierNoteEntry + custom suppliers + extras
- [ ] Incluir custom-groups e extra-suppliers no backup .json (v4)

## Fase 2 — Página /adicionar
- [ ] Layout próprio (mesmo padrão visual da home/dashboards)
- [ ] Seção "Grupos Personalizados" (CRUD + ramo + cor + indicador de quantos fornecedores)
- [ ] Seção "Cadastrar Fornecedor Avulso" (formulário com select de grupo)
- [ ] Listagem agrupada por grupo personalizado, com botão "Promover a dashboard independente"

## Fase 3 — 4º card na home
- [ ] Card "+ Adicionar Fornecedores" no grid de dashboards
- [ ] Rota /adicionar registrada em App.tsx
- [ ] Manter padrão visual editorial premium

## Fase 4 — Migrar Contato
- [ ] Componente `MigrateButton` reutilizável (modal com select de destino + confirmação)
- [ ] Integrar no SupplierNotesPanel (header)
- [ ] Destinos: Aquário, Tapete, Yiwu, qualquer dashboard promovido, qualquer Grupo Personalizado
- [ ] Toast de sucesso após migrar; redirecionar/colapsar painel

## Fase 5 — Promoção a Dashboard
- [ ] Botão "Promover a dashboard" no card do grupo personalizado
- [ ] Confirmar com modal
- [ ] Marcar grupo como promotedToDashboard=true
- [ ] Renderizar card extra na home para cada grupo promovido (mesmo layout dos 3)
- [ ] Rota dinâmica /grupo/:groupId que reaproveita layout padrão (lista + anotações + grupos)

## Fase 6 — Validação e checkpoint
- [ ] Build limpo, TS limpo
- [ ] Testar criar grupo, cadastrar fornecedor, promover, migrar
- [ ] Salvar checkpoint final
