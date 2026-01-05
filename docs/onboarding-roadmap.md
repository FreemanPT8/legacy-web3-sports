# Legacy Onboarding — Plano de Implementação

## 1. Fundamentos & backend (Fase 1)
- **Modelos de dados**: desenhar tabelas `houses`, `house_heads`, `onboarding_popups`, `onboarding_triggers`, `onboarding_logs`, `onboarding_metrics`.
- **API pública**:
  - `GET /api/onboarding/house?house=slug` → devolve sequência ativa + analytics.
  - `GET /api/onboarding/logs?userId=` → estado/cooldown por utilizador.
  - `POST /api/onboarding/logs` → regista ações (deliver/cta/dismiss) com assinatura anti-fraude.
- **Motor de triggers**: serviço (cron/edge função) que lê eventos XP/conteúdo, aplica limites globais e agenda pop-ups em `onboarding_queue`.
- **Segurança**: autenticação JWT para users, headers internos para chamadas do painel, validação do Termo antes de permitir `POST/PUT`.

## 2. Painel Admin (Fase 2)
- **Listagem por House**: tabela com pop-ups (estado, trigger, idioma, métricas).
- **Editor avançado**:
  - multi-idioma PT/EN/ES com validação.
  - campos de CTA com regex + preview.
  - definição de triggers (XP min/max + eventos + dependências).
- **Fluxo de publicação**: estados `draft -> ready -> published`, histórico, revisão dupla opcional.
- **Templates**: biblioteca oficial (5 referenciais) duplicável por House.

## 3. Experiência do utilizador (Fase 3)
- **Modal global**: componente em nível `_app` com contexto para ouvir eventos do motor, suportar mobile, foco/ARIA, lock de 3s com feedback.
- **Persistência local**: storage por utilizador para evitar pop-ups repetidos, mesmo se mudar de página antes do lock terminar.
- **Fallbacks**: se API falhar, usar demo + alertar Operações.
- **Integração com features**: CTAs podem abrir checklists internas, formularios DAO1, House Hub, etc., com tracking.

## 4. Analytics & reporting (Fase 4)
- **Dashboards**: CTR por pop-up, completions, tempo até CTA, drop-offs por House/período.
- **Alertas**: thresholds (ex.: CTR < 20%, bloqueios > 5) disparam alertas para Heads/Operações.
- **Exports**: CSV/JSON para auditorias, incluindo logs assinados.

## 5. Governança & compliance (Fase 5)
- **Termo de responsabilidade**: fluxo digital (checkbox + assinatura + timestamp) bloqueando edição se expirado (>90 dias).
- **Auditoria**: logs imutáveis por pop-up (quem alterou, diff), revisões automáticas de copy (detetar linguagem proibida).
- **Limites**: enforcement central para 1 pop-up/dia, 3/semana, cooldown configurable por House.
- **DAO1 / contacto humano**: workflow com aprovação manual, estado (pendente/aprovado/recusado) e logs.

## 6. QA, testes e rollout (Fase 6)
- **Testes unitários**: motor de triggers, limites, API.
- **Testes E2E**: simular fluxos (XP 0 → 500+) em PT/EN/ES.
- **Testes de carga**: garantir que o motor lida com milhares de eventos sem duplicar pop-ups.
- **Rollout progressivo**: piloto (1-2 Houses), recolha feedback, ajusta métricas, depois abertura global.

## Próximos passos imediatos
1. Criar API `GET /api/onboarding/house` conectada ao mock atual.
2. Atualizar `/education/xp` para usar essa API em vez de importar dados diretamente.
3. Expandir `/admin/onboarding` com listagem das mensagens e integração futura com a API.
