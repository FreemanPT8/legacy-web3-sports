# QA checklist for education experience
## Scope
- Landing /education (unauthenticated/guest experience)
- Immersive /education/courses (authenticated, xp-based)
- API /api/education/progress
## Test Matrix
1. **Anon visitor**
   - Hit /education ? hero, stats, preview cards visible, CTAs to signup/login.
   - Hit /education/courses ? StartHereHero/Timeline/Levels show fallback messages + buttons disabled, NextUnlock CTA hidden.
2. **Newly registered user (0 XP)**
   - Login ? /education/courses shows StartHereHero with 0% progress, timeline locked, LevelSections showing “Nível bloqueado”.
   - Featured courses still gated by xp thresholds.
3. **User com Start Here completo (=99 XP)**
   - Validate progress summary updates timeline (Cadete desbloqueado, Juvenis bloqueado).
   - LevelSections: Cadete cards sem lock, outros com lock.
   - Featured cards aplicam glow apenas quando xp = threshold.
4. **User avançado (= Juvenis)**
   - Timeline mostra múltiplos níveis desbloqueados, badge strip com conquistas.
   - LevelSections accordion funciona em mobile (<768px) e desktop.
5. **API & Error states**
   - Forçar falha de /api/education/progress ? /education/courses deve mostrar mensagens de erro em StartHereHero/Timeline/CTA.
   - RLS/permissions: endpoint acessível apenas autenticados (verificar status 401). 
## Registo / device coverage
- Browsers: Chrome/Edge (desktop), Safari/Chrome (mobile emulation).
- Breakpoints: 375px, 768px, 1440px.
- A11y: tab order nos CTAs, focus-visible em LevelSections accordion, contraste em cards locked.
## Rollout
- Deploy ? smoke test 
pm run typecheck && npm run test:unlock + manual checks acima.
- Monitor métricas: cliques em “Ver cursos” na landing, hits ao /education/courses pós-login.
