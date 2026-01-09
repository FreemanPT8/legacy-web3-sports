# House Governance & Onboarding – QA Checklist

This checklist covers the features introduced in the House governance plan.
Executar estes testes sempre que formos lançar uma nova versão ou depois de
alterações estruturais.

## Ambiente / Pré-requisitos

1. Configurar `HOUSE_ALERT_CRON_SECRET` e validar que o cron externo consegue
   chamar `GET /api/cron/house-alerts`.
2. Preparar pelo menos uma House com os campos e conteúdo preenchidos
   (`mission_i18n`, `support_model_i18n`, `culture_i18n`, etc.).
3. Criar uma conta Admin/Super Admin para testar convites e governação.
4. Garantir que a base de dados contém alguns registos em `house_events`,
   `house_feedback` e `house_join_requests`.

## 1. Página pública + CTA consciente

| Teste | Passos | Expectativa |
| ----- | ------ | ----------- |
| Header & blocos | Abrir `/houses/[houseKey]`. | Todos os blocos renderizados com paleta `/education/xp`. |
| CTA capacidade | Submeter várias vezes até exceder `monthly_capacity`. | Receber erro 429 “capacidade atingida”. |
| Aceitação termo | Após submissão válida, confirmar em `house_join_requests` e `house_term_acceptances`. |

## 2. Área privada

1. Entrar como membro confirmado. Verificar cartões:
   - Progresso (métricas corretas).
   - Conteúdos recomendados (sequência de pop-ups).
   - Cultura e mensagens.
   - Eventos: listar itens de `house_events` com visibilidade `members`.
2. Entrar com utilizador sem membership → ver aviso de acesso restrito.
3. Utilizador não autenticado → CTA “Iniciar sessão”.

## 3. Termos do Head

1. Usar `/admin/houses/[id]/head` para trocar Head:
   - Deve pedir conta Super Admin.
   - Verificar `house_history` com ação `head.assigned`.
2. Criar convite em `/admin/houses/[id]/page` (secção “Convites Head”).
3. Abrir `https://.../head/invite?token=...`:
   - Sem login → redirecionar para login.
   - Com login válido → aceitar e ver sucesso.
   - Confirmar `house_head_invites.status = accepted` e `house_heads` atualizado.

## 4. Painel Admin – Overview & Perfil

1. `/admin/houses/overview`:
   - Totais, top Houses, alertas e pressão estão preenchidos.
   - Botão “Executar scan” cria alertas se capacidade for excedida.
2. `/admin/houses/[id]/page`:
   - Capacidade/governança alterável. Após guardar, verificar `house_history` com `governance.updated`.
   - Métricas qualitativas mostram totais e barras.
   - Notas internas adicionam registos em `house_notes`.

## 5. Métricas qualitativas

1. Inserir dados em `house_feedback` (positive/neutral/negative).
2. Confirmar que `/api/admin/houses/[id]/metrics` reflete números e que o painel os apresenta.

## 6. Sistema de alertas

1. Criar pedidos pendentes suficientes para atingir >80% da capacidade.
2. Clicar no botão “Executar scan” → verificar entrada em `house_alerts`.
3. Invocar `GET /api/cron/house-alerts` com `x-cron-secret` → deve gerar o mesmo resultado.
4. Resolver manualmente no painel e confirmar `status = resolved`.

## 7. Documentação / QA final

- Guardar capturas de ecrã das principais páginas para referência visual.
- Atualizar este ficheiro quando surgirem novos blocos ou regras.
- Antes do launch, executar os testes acima em staging e anotar o resultado.

> Referências: `docs/house-profile-spec.md`, `docs/admin-houses-overview.md`.
