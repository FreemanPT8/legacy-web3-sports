# House Governance & Onboarding - QA Checklist

This checklist covers the features introduced in the House governance plan.
Executar estes testes sempre que formos lancar uma nova versao ou depois de
alteracoes estruturais.

> Nota: a capacidade mensal e apenas um indicador visual. O bloqueio automatico
> foi removido; acompanhamos apenas o backlog de CTAs e a pressao das pools.

## Ambiente / Pre-requisitos

1. Configurar `HOUSE_ALERT_CRON_SECRET` e validar que o cron externo consegue
   chamar `GET /api/cron/house-alerts`.
2. Preparar pelo menos uma House com os campos e conteudo preenchidos
   (`mission_i18n`, `support_model_i18n`, `culture_i18n`, etc.).
3. Criar uma conta Admin/Super Admin para testar convites e governanca.
4. Garantir que a base de dados contem alguns registos em `house_feedback`
   e `house_join_requests`.

## 1. Pagina publica + CTA consciente

| Teste | Passos | Expectativa |
| ----- | ------ | ----------- |
| Header & blocos | Abrir `/houses/[houseKey]`. | Todos os blocos renderizados com paleta `/education/xp`. |
| CTA backlog | Submeter varias vezes ate simular pico. | Pedidos continuam a entrar em `house_join_requests` (sem 429, capacidade ilimitada). |
| Aceitacao termo | Depois de submeter, confirmar entradas em `house_join_requests` e `house_term_acceptances`. |

## 2. Area privada

1. Entrar como membro confirmado. Verificar cartoes:
   - Progresso (metricas corretas).
   - Conteudos recomendados (sequencia de pop-ups).
   - Cultura e mensagens.
2. Entrar com utilizador sem membership -> ver aviso de acesso restrito.
3. Utilizador nao autenticado -> CTA "Iniciar sessao".

## 3. Termos do Head

1. Usar `/admin/houses/[id]/head` para trocar Head:
   - Deve pedir conta Super Admin.
   - Verificar `house_history` com acao `head.assigned`.
2. Criar convite em `/admin/houses/[id]/page` (secao "Convites Head").
3. Abrir `https://.../head/invite?token=...`:
   - Sem login -> redireciona para login.
   - Com login valido -> aceitar e ver sucesso.
   - Confirmar `house_head_invites.status = accepted` e `house_heads` atualizado.

## 4. Painel Admin - Overview & Perfil

1. `/admin/houses/overview`:
   - Totais, top Houses, alertas e pressao estao preenchidos.
   - Botao "Executar scan" cria alertas apenas quando CTAs pendentes ultrapassam o SLA configurado (capacidade ilimitada).
2. `/admin/houses/[id]/page`:
   - Capacidade/governanca alteravel. Depois de guardar, verificar `house_history` com `governance.updated`.
   - Metricas qualitativas mostram totais e barras.
   - Notas internas adicionam registos em `house_notes`.

## 5. Metricas qualitativas

1. Inserir dados em `house_feedback` (positive/neutral/negative).
2. Confirmar que `/api/admin/houses/[id]/metrics` reflete os numeros e que o painel os apresenta.

## 6. Sistema de alertas

1. Criar pedidos em `house_join_requests` com `status='pending'` e manipular `created_at`
   para estar alem do SLA (`HOUSE_ALERTS_PENDING_SLA_HOURS`, 48h por defeito).
2. Clicar no botao "Executar scan" **ou** chamar `POST /api/admin/houses/alerts/run?secret=...`
   -> verificar entrada `cta.pending` em `house_alerts`.
3. Invocar `GET /api/cron/house-alerts` com `x-cron-secret` -> deve gerar o mesmo resultado.
4. Aprovar/rejeitar pedidos ou ajustar `created_at` para dentro do SLA -> confirmar `status='resolved'`.

## 7. Documentacao / QA final

- Guardar capturas das principais paginas para referencia visual.
- Atualizar este ficheiro quando surgirem novos blocos ou regras.
- Antes do launch, executar os testes acima em staging e anotar o resultado.

> Referencias: `docs/house-profile-spec.md`, `docs/admin-houses-overview.md`.
