

# Rastreamento de Abertura e Visualizacao de Solicitacoes

## Resumo

Quando um atendente clicar para abrir uma solicitacao, o sistema registrara automaticamente o momento da visualizacao (sem popup). Solicitacoes nao visualizadas permanecerao como "Novo". Apos abertas sem resposta, terao o status "Visualizado". Todo o ciclo (abertura, evolucao, conclusao) sera contabilizado nas metricas de atendimento.

## Mudancas Propostas

### 1. Novo status "visualizado" no banco de dados

Migracao SQL para:
- Adicionar `first_viewed_at` (timestamp) e `first_viewed_by` (uuid) na tabela `complaints` para registrar quem e quando abriu pela primeira vez
- Atualizar a constraint `complaints_status_check` para incluir o status `visualizado`

### 2. Registro automatico ao abrir o modal

Quando o `ComplaintDetailModal` abrir com uma solicitacao no status "novo":
- Atualizar o status para `visualizado` automaticamente
- Preencher `first_viewed_at` com o timestamp atual e `first_viewed_by` com o ID do usuario logado
- Registrar entrada no `complaint_audit_log` com a acao "viewed"

Isso acontece silenciosamente, sem popup ou confirmacao.

### 3. Novo badge visual "Visualizado"

Adicionar o status "visualizado" nos componentes:
- `ComplaintStatusBadge` -- badge roxo/lilas para diferenciar de "Novo" (amarelo) e "Em Analise" (azul)
- `statusLabels` em `useComplaints.ts`
- `SolicitacoesList` no monitoramento
- Filtros de status nos componentes de filtragem

### 4. Metricas atualizadas

- `useComplaintStats` contabilizara `visualizado` como uma categoria separada (ex: `viewed`)
- O tempo entre `first_viewed_at` e a mudanca para `em_analise` ou `resolvido` passara a compor o calculo do TMA
- O badge de notificacoes (`useMenuBadges`) considerara apenas `novo` (nao visualizado) para contagem

### 5. Indicacao visual na tabela de Solicitacoes

Na pagina `/solicitacoes`, solicitacoes com status "novo" terao destaque visual (fonte bold ou indicador de "nao lido") para facilitar a identificacao de itens pendentes de abertura.

---

## Detalhes Tecnicos

**Migracao SQL:**
```sql
ALTER TABLE public.complaints 
  ADD COLUMN IF NOT EXISTS first_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_viewed_by UUID;

ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
ALTER TABLE public.complaints ADD CONSTRAINT complaints_status_check 
  CHECK (status = ANY (ARRAY[
    'novo', 'visualizado', 'em_analise', 'resolvido', 'fechado',
    'pending', 'in_progress', 'resolved', 'closed'
  ]));
```

**Arquivos modificados:**
- `src/components/complaints/ComplaintDetailModal.tsx` -- logica de auto-marcacao ao abrir
- `src/components/complaints/ComplaintStatusBadge.tsx` -- novo badge "Visualizado"
- `src/hooks/useComplaints.ts` -- statusLabels, stats com `viewed`, logica de marcacao
- `src/pages/Solicitacoes.tsx` -- destaque visual para itens "novo"
- `src/components/monitoring/SolicitacoesList.tsx` -- statusMap atualizado
- `src/hooks/useMenuBadges.ts` -- badges contam apenas "novo"
- Migracao SQL para novas colunas e constraint

**Fluxo de status:**
```text
novo --> visualizado --> em_analise --> resolvido --> fechado
 (criado)  (abriu modal)  (iniciou trabalho)  (concluiu)  (arquivou)
```

