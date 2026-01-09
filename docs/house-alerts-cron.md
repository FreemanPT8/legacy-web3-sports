# House Alerts Cron Runner

Para que o sistema de alertas deixe de depender manualmente do botão “varrer alertas” no painel,
podemos agendar um cron job (Vercel Cron, GitHub Actions ou um worker dedicado) que invoque
o endpoint `POST /api/admin/houses/alerts/scan` periodicamente (ex.: de hora em hora).

## 1. Configurar uma rota “cron-safe”

- Usa uma Vercel Cron configurada com `POST https://<project>.vercel.app/api/admin/houses/alerts/scan`.
- Adiciona uma env `CRON_SHARED_SECRET` e valida-a no route (para evitar chamadas públicas).

## 2. Script auxiliar

`node scripts/house-alerts-cron.js <cronUrl>`

Este script foi adicionado para quem quiser correr localmente ou dentro de um worker dedicado.

## 3. Plano de implementação

1. Criar env `CRON_SHARED_SECRET` e validar no route `alerts/scan`.
2. Configurar Vercel Cron (ex.: `0 * * * *`).
3. Atualizar docs/checklists para incluir validação no Sprint 6/QA.
