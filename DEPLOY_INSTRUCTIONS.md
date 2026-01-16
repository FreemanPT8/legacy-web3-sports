# 🚀 GUIA DE DEPLOY - LEGACY Platform
## ✅ PRÉ-REQUISITOS
Antes de fazer deploy, certifique-se que tem:
1. **Conta Supabase** com database configurada
2. **Variáveis de ambiente** configuradas
3. **Build local sem erros** (`npm run build`)
---
## 🎯 OPÇÃO 1: DEPLOY NO VERCEL (RECOMENDADO)
O Vercel é a melhor opção para Next.js e oferece excelente performance.
### Passo 1: Instalar Vercel CLI
```bash
npm i -g vercel
```
### Passo 2: Login no Vercel
```bash
vercel login
```
### Passo 3: Deploy
```bash
vercel --prod
```
### Passo 4: Configurar Variáveis de Ambiente no Vercel
No dashboard do Vercel (https://vercel.com/dashboard):
1. Vá para **Settings** → **Environment Variables**
2. Adicione as seguintes variáveis:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_min_32_chars
RESEND_API_KEY=your_resend_api_key (opcional)
FROM_EMAIL=noreply@yourdomain.com (opcional)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```
3. **Redeploy** após adicionar as variáveis
---
## 🎯 OPÇÃO 2: DEPLOY NO NETLIFY
### Passo 1: Instalar Netlify CLI
```bash
npm i -g netlify-cli
```
### Passo 2: Login no Netlify
```bash
netlify login
```
### Passo 3: Instalar Plugin Next.js
```bash
npm install -D @netlify/plugin-nextjs
```
### Passo 4: Deploy
```bash
netlify deploy --prod
```
### Passo 5: Configurar Variáveis de Ambiente no Netlify
No dashboard do Netlify:
1. Vá para **Site settings** → **Environment variables**
2. Adicione as mesmas variáveis listadas acima
**IMPORTANTE:** Após adicionar variáveis, faça um **clear cache and deploy** no Netlify.
---
## 🔧 VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS
### Supabase (OBRIGATÓRIO)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```
**Como obter:**
1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie a **URL** e a **anon public key**
### JWT Secret (OBRIGATÓRIO)
```env
JWT_SECRET=um_texto_aleatorio_com_minimo_32_caracteres_aqui
```
**Como gerar:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
### Email (OPCIONAL - para notificações)
```env
RESEND_API_KEY=re_xxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
```
### URL da Aplicação
```env
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```
---
## 🗄️ CONFIGURAÇÃO DA DATABASE
### 1. Executar Migrações
As migrações já estão em `supabase/migrations/`. No Supabase Dashboard:
1. Vá em **SQL Editor**
2. Execute cada arquivo de migração na ordem:
   - `20251103162942_create_initial_schema.sql`
   - `20251104000000_fix_missions_system.sql`
   - `20251111000000_create_notifications.sql`
### 2. Criar Primeiro Super Admin
Execute no SQL Editor:
```sql
-- Trocar 'seu-email@exemplo.com' pelo seu email real
UPDATE users
SET role = 'Super Admin'
WHERE email = 'seu-email@exemplo.com';
```
---
## ✅ CHECKLIST PRÉ-DEPLOY
- [ ] Build local sem erros: `npm run build`
- [ ] Variáveis de ambiente configuradas
- [ ] Migrações executadas no Supabase
- [ ] Primeiro Super Admin criado
- [ ] `.env` NÃO está no git (verificar .gitignore)
- [ ] Domínio configurado (se aplicável)
---
## 🐛 TROUBLESHOOTING
### Erro: "Page not found" no /admin
**Causa:** Variáveis de ambiente não configuradas ou usuário sem permissão.
**Solução:**
1. Verifique se as variáveis estão corretas no dashboard
2. Verifique se seu usuário tem role = 'Admin' ou 'Super Admin'
3. Limpe o cache e faça redeploy
### Erro: "Failed to fetch"
**Causa:** CORS ou variáveis de ambiente incorretas.
**Solução:**
1. Verifique `NEXT_PUBLIC_SUPABASE_URL`
2. Verifique `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Certifique-se que as RLS policies estão ativas
### Página em branco
**Causa:** JavaScript não está a carregar.
**Solução:**
1. Verifique o console do navegador
2. Limpe o cache do browser
3. Verifique se o build foi bem-sucedido
---
## 🎉 PÓS-DEPLOY
Após o deploy com sucesso:
1. **Teste o login:** Crie uma conta e faça login
2. **Aceda ao admin:** Menu do usuário → "Painel Admin"
3. **Configure conteúdo:** Crie cursos e posts
4. **Convide testers:** Partilhe o link da plataforma
---
## 📞 SUPORTE
Se encontrar problemas:
1. Verifique os logs no dashboard (Vercel/Netlify)
2. Verifique os logs do Supabase
3. Reveja este guia completamente
**Status do Build:** ✅ Build completo sem erros
**Última atualização:** 12 Nov 2025
