# Nota interna — Governança manual das Houses

Publico alvo: Admins e Super Admins que lidam com onboarding / governaça das Houses.

## Porque mudámos

- **Sem auto-criação**: o antigo fallback criava Houses vazias automaticamente, causando churn e Head assignments sem supervisão.
- **Pool única de pedidos**: utilizadores sem House ativa entram em `sport_pool_entries` com `status='pending'` até que uma House exista.
- **Capacidade ilimitada** (por agora): `monthly_capacity` é apenas indicador e já não bloqueia pedidos.

## Fluxo oficial

1. **Onboarding do utilizador**
   - `/signup` guarda `primary_sport_id` + `primary_country_code`.
   - `syncUserHouseMembership` tenta ligar à House existente.
   - Se não existir, o utilizador entra na pool (`queueSportPendingEntry`) e recebe `requires_sport_assignment = true`.

2. **Admin cria a House**
   - Apenas perfis com `Manage Houses of Sports` (ou Super Admin) veem o botão “Nova House”.
   - `/api/admin/houses` valida `canManageHouses` antes de chamar `ensureHouseForSportCountry`.
   - Depois de criar, o painel dispara `syncHouseMembersBySportCountry` para puxar utilizadores da pool.

3. **Processar a pool**
   - `/admin/houses/overview` mostra o backlog manual (CTA backlog).
   - Scripts (`scripts/process_sport_pending_pool.ts`) podem ser usados para lotes grandes.
   - Quando um utilizador recebe House válida, o script marca a entrada como `assigned` e limpa `requires_sport_assignment`.

4. **Alertas**
   - `/api/admin/houses/alerts/run` & `/api/admin/houses/alerts/scan` só criam alertas `cta.pending` quando pedidos ultrapassam o SLA (48h por defeito).
   - Cron oficial: `GET/POST /api/admin/houses/alerts/run` com `x-cron-secret`.

## O que os Admins precisam de fazer

- **Auditar a pool** diariamente: ver CTA backlog e sport pools para decidir quais Houses criar a seguir.
- **Criar Houses manualmente** sempre que houver massa crítica num par `desporto/país`.
- **Garantir que apenas Admins autorizados** recebem o flag `Manage Houses of Sports` (ver `/admin/users` → cards de permissões).
- **Executar sincronismos** sempre que uma House nova é criada (botão no painel ou script de backlog).
- **Comunicar com os Heads**: quando a House é criada, enviar briefing e garantir que o Head sabe que pedidos pendentes ainda estavam na pool.

## Próximos passos

- Validar esta nota com a equipa de operations.
- Guardar um resumo no Notion interno e apontar para este ficheiro.
- Reforçar durante o próximo all-hands que pedidos podem ficar retidos na pool se a House não existir — é responsabilidade dos Admins criar/atribuir.
