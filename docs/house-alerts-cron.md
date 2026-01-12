# House Alerts Cron Runner

O sistema de alertas monitoriza apenas CTAs manuais que ficaram pendentes para
além do SLA configurado (a capacidade mensal é ilimitada). Para evitar depender
do botão manual no painel, usa o endpoint protegido `POST /api/admin/houses/alerts/run`
que dispara o mesmo scan server-side.

## 1. Configurar execução segura

- Define a env `HOUSES_ALERTS_CRON_SECRET` com um token aleatório nas deploys.
- Agenda um Vercel Cron (ex.: `0 * * * *`) apontando para
  `https://<project>.vercel.app/api/admin/houses/alerts/run` com o header
  `x-cron-secret: <HOUSES_ALERTS_CRON_SECRET>`. Em execuções locais podes enviar
  `?secret=<...>` no query string.
- O endpoint responde com `{ success, scanned, triggered, resolved, warnings }`.
  Qualquer warning indica falha a carregar alertas ou pedidos de uma House
  específica.

## 2. Execução manual

- `/api/admin/houses/alerts/scan` continua disponível para Admin / Super Admin
  autenticados. Serve como botão “Executar scan” no painel.
- O scan cria alertas `cta.pending` sempre que existirem pedidos
  (`house_join_requests.status='pending'`) com `created_at` superior a
  `HOUSE_ALERTS_PENDING_SLA_HOURS` (48h por omissão). Sem pedidos em atraso, o
  alerta aberto é resolvido automaticamente.

## 3. Checklist rápido

1. Confirmar `HOUSES_ALERTS_CRON_SECRET` nas envs de staging/produção.
2. Configurar o cron (Vercel Cron, worker, etc.) chamando `/alerts/run`.
3. Atualizar o QA para validar alertas com CTAs pendentes e garantir que não há
   mais bloqueio por capacidade.
