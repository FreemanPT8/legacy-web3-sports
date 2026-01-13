# Checklist de Deploy - LEGACY Platform

Use esta checklist para garantir que tudo está pronto para o deploy.

---

## Pré-Deploy

### Supabase
- [x] Projeto Supabase criado
- [x] Migrações executadas
- [x] RLS policies configuradas
- [x] Credenciais no .env
- [ ] Testar conexão (executar `npm run dev` localmente)

### Código
- [x] Build de produção testado (`npm run build`)
- [x] Sem erros críticos de TypeScript
- [x] Configuração Next.js otimizada
- [x] Vercel.json configurado
- [ ] .env.example atualizado

### GitHub
- [ ] Repositório criado no GitHub
- [ ] Repositório configurado como Private
- [ ] Git inicializado localmente
- [ ] Código commitado
- [ ] Push para GitHub concluído

---

## Durante o Deploy na Vercel

### Configuração Inicial
- [ ] Projeto importado do GitHub
- [ ] Framework Next.js detectado automaticamente
- [ ] Configurações default aceites

### Variáveis de Ambiente
- [ ] `NEXT_PUBLIC_SUPABASE_URL` adicionada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` adicionada
- [ ] `JWT_SECRET` adicionada
- [ ] `FROM_EMAIL` adicionada
- [ ] `NEXT_PUBLIC_APP_URL` adicionada (com URL da Vercel)
- [ ] `RESEND_API_KEY` adicionada (opcional)

### Build e Deploy
- [ ] Deploy iniciado
- [ ] Build completado sem erros
- [ ] URL de produção gerado
- [ ] Aplicação acessível no browser

---

## Pós-Deploy

### Verificação Funcional
- [ ] Página inicial carrega corretamente
- [ ] Sistema de registo funciona
- [ ] Sistema de login funciona
- [ ] Dashboard do utilizador acessível
- [ ] Dados aparecem no Supabase após registo
- [ ] XP system atribui pontos corretamente
- [ ] Imagens e assets carregam corretamente

### Testes de Integração
- [ ] Criar conta de teste real
- [ ] Fazer login com conta de teste
- [ ] Testar criação de conteúdo (post, comentário)
- [ ] Verificar notificações
- [ ] Testar navegação entre páginas
- [ ] Verificar responsive design (mobile/desktop)

### Admin
- [ ] Login admin funciona (`superadmin` / `admin123`)
- [ ] Dashboard admin acessível
- [ ] Ferramentas de moderação funcionam

### Houses of Sports
- [ ] Backfill de sources da pool executado (`npm run backfill:pool-sources`)
- [ ] Pool pendente processada (`npm run sync:pool-pending`)
- [ ] Members sincronizados para todas as Houses (`npm run sync:houses`)

### Performance
- [ ] Tempo de carregamento < 3 segundos
- [ ] Sem erros no console do browser
- [ ] Imagens otimizadas
- [ ] Assets carregam de CDN

---

## Preparação para Testers

### Documentação
- [ ] Link de acesso preparado
- [ ] Instruções de registo preparadas
- [ ] Email/mensagem para testers redigida
- [ ] Canal de feedback definido (email, Discord, etc.)

### Comunicação
- [ ] Lista de testers preparada
- [ ] Mensagem enviada com:
  - Link da aplicação
  - Instruções de registo
  - O que testar
  - Como reportar bugs
  - Contacto para suporte

### Monitorização
- [ ] Acesso aos logs da Vercel configurado
- [ ] Acesso ao dashboard do Supabase
- [ ] Sistema de notificação de erros (se aplicável)

---

## Durante o Período de Testes

### Monitoria Diária
- [ ] Verificar logs de erros na Vercel
- [ ] Verificar atividade no Supabase
- [ ] Responder a feedback dos testers
- [ ] Documentar bugs reportados

### Updates Frequentes
- [ ] Processo de update estabelecido:
  1. [ ] Fazer alterações localmente
  2. [ ] Testar localmente (`npm run dev`)
  3. [ ] Commit para Git
  4. [ ] Push para GitHub
  5. [ ] Vercel deploy automático
  6. [ ] Verificar que update funcionou
  7. [ ] Avisar testers se necessário

---

## Preparação para Launch Público

### Qualidade
- [ ] Todos os bugs críticos corrigidos
- [ ] Features principais testadas e funcionais
- [ ] Performance otimizada
- [ ] UX refinada com base em feedback

### Conteúdo
- [ ] Conteúdo de qualidade criado pelos testers
- [ ] Moderação de conteúdo inadequado
- [ ] Dados de teste (se houver) removidos ou marcados

### Infraestrutura
- [ ] Considerar upgrade de planos (se necessário):
  - [ ] Vercel Pro (se tráfego > 100GB/mês)
  - [ ] Supabase Pro (se DB > 500MB)
- [ ] Domínio personalizado configurado (opcional)
- [ ] SSL/HTTPS funcionando
- [ ] Backups configurados

### Marketing
- [ ] Landing page finalizada
- [ ] Materiais promocionais preparados
- [ ] Estratégia de lançamento definida
- [ ] Canais de divulgação identificados

---

## Métricas de Sucesso

### Técnicas
- Uptime: > 99.5%
- Tempo de resposta: < 2s
- Taxa de erro: < 1%

### Utilizadores
- Registo de testers: 10 utilizadores
- Taxa de retenção: > 70%
- Engagement: uso regular da plataforma

### Conteúdo
- Posts criados: Meta definida
- Interações: Comentários, likes
- Conclusões de lições: Progressão no XP

---

## Rollback Plan

Se algo correr mal:

### Problema: Build falhou
**Solução:**
1. Verificar logs na Vercel
2. Testar build localmente
3. Corrigir erro
4. Novo commit e push

### Problema: Aplicação não funciona após deploy
**Solução:**
1. Vercel → Deployments
2. Encontrar último deploy funcional
3. Clicar nos três pontos → "Promote to Production"
4. Corrigir problema localmente
5. Novo deploy quando corrigido

### Problema: Variáveis de ambiente incorretas
**Solução:**
1. Vercel → Settings → Environment Variables
2. Editar variável incorreta
3. Deployments → Redeploy

### Problema: Supabase não responde
**Solução:**
1. Verificar status do Supabase
2. Verificar limites do plano gratuito
3. Verificar RLS policies
4. Contactar suporte Supabase se necessário

---

## Contactos Úteis

**Suporte Técnico:**
- Vercel: [vercel.com/support](https://vercel.com/support)
- Supabase: [supabase.com/support](https://supabase.com/support)
- Next.js: [nextjs.org/docs](https://nextjs.org/docs)

**Comunidades:**
- Vercel Discord
- Supabase Discord
- Next.js GitHub Discussions

---

## Status Final

- [ ] **PRONTO PARA DEPLOY**: Todas as checklist items pré-deploy completadas
- [ ] **DEPLOY CONCLUÍDO**: Todas as checklist items durante deploy completadas
- [ ] **TESTES INICIADOS**: Todas as checklist items pós-deploy completadas
- [ ] **PRONTO PARA PRODUÇÃO**: Todas as checklist items de preparação completadas

---

**Data de Deploy:** _________________

**URL de Produção:** _________________

**Notas:**
_______________________________________________________
_______________________________________________________
_______________________________________________________

---

**Boa sorte com o deploy!** 🚀
