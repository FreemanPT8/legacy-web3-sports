# Daily Combo Missions – QA & Manual Verification

## Overview
The XP system now inclui três rotas diárias (Rota Rápida, Rota Base e Rota Séria) que funcionam como combos acumulativos. Cada combo:

- Soma leituras no glossário, blog e lições ao longo do dia CET (reinicia às 00h CET).
- Desbloqueia XP extra (15 / 21 / 33 XP) assim que os requisitos mínimos forem atingidos nessa ordem.
- Regista o progresso na tabela `daily_combo_progress` e completa automaticamente a missão correspondente em `user_missions`.
- Está exposto no endpoint `GET /api/missions/generate?userId=X` em `combo_progress`.

Este documento descreve o plano de QA manual utilizado para validar o fluxo end-to-end.

## Pré‑requisitos
1. Utilizador autenticado com acesso ao glossário, blog e lições.
2. Cron de `POST /api/missions/generate` já executado para gerar as três missões do dia.
3. Base de dados com as migrações novas (`daily_combo_progress` + metadata em `daily_missions`).

## Testes Manuais

### 1. Rota Rápida (3 termos + 1 blog)
1. Abrir `/education/glossary` e consumir 3 termos distintos (confirmar XP no toast).
2. Ler 1 blog post completo.
3. Validar:
   - `/api/missions/generate?userId=X` > `combo_progress.glossary_count === 3` e `blog_count === 1`.
   - Missão `combo_quick` aparece como `completed` e XP extra de 15 registado em `xp_transactions`.
   - `/education/xp` mostra cartão "Rota Rápida" como concluído e CTA desativado.

### 2. Rota Base (acumula +2 termos, +1 lição)
1. Consumir mais 2 termos de glossário (total >=5) e completar 1 lição.
2. Confirmar que o XP de 21 foi creditado, `combo_base` marcado como concluído e `/dashboard` mostra badge verde.

### 3. Rota Séria (acumula +5 termos, +1 blog, +1 lição)
1. Acrescentar términos até ter >=10, leituras de blog >=2 e lições >=2.
2. Verificar que o XP extra de 33 entra e as UI’s (dashboard/admin) exibem o estado final.

### 4. CET Reset
1. Forçar data CET seguinte (pode usar `psql` para atualizar `daily_combo_progress.combo_date` para ontem).
2. Recarregar `/education/xp` e `/dashboard` – contadores devem voltar a 0 e os cartões reativados.
3. Confirmar que novas leituras incrementam os contadores desde zero.

### 5. API Contract
1. `GET /api/missions/generate?userId=X` deve incluir:
   ```jsonc
   {
     "success": true,
     "missions": [...],
     "combo_progress": {
       "glossary_count": 5,
       "blog_count": 1,
       "lesson_count": 1,
       "quick_completed": true,
       "base_completed": false,
       "serious_completed": false
     }
   }
   ```
2. Confirmar que cada missão traz `metadata.combo` com os requisitos oficiais.

## Resultados
- **Ambiente:** main @ commit `8ef30eb+`.
- **Estado:** PASS – todas as etapas acima foram executadas manualmente em desenvolvimento e replicadas em staging. Os XP extras apareceram em `xp_transactions` e na UI sem regressões.

> Qualquer alteração futura na lógica de XP deve repetir estes passos para garantir o alinhamento entre API, dashboards e admin.
