# ✅ Checklist de Deploy - Imprime e Segue

## 📋 ANTES DE COMEÇAR

**Preparação (2 minutos):**
- [ ] Tenho 30 minutos livres
- [ ] Tenho um email para usar
- [ ] Tenho papel e caneta para anotar passwords
- [ ] Li o guia DEPLOY_PASSO_A_PASSO.md

---

## 🐙 PARTE 1: GITHUB (10 min)

### Criar Conta
- [ ] Fui a https://github.com
- [ ] Cliquei em "Sign up"
- [ ] Criei conta com email: `________________`
- [ ] Username escolhido: `________________`
- [ ] Password anotada: ✅
- [ ] Email verificado (cliquei no link)

### Criar Repositório
- [ ] Cliquei no "+" no topo
- [ ] Cliquei em "New repository"
- [ ] Nome: `legacy-platform`
- [ ] Deixei "Public" marcado
- [ ] NÃO marquei nenhuma caixa
- [ ] Cliquei em "Create repository"
- [ ] Página com instruções aberta (não fechei)

### Enviar Código
- [ ] Abri Terminal (Mac) ou Git Bash (Windows)
- [ ] Corri: `cd /caminho/para/projeto`
- [ ] Corri: `git init`
- [ ] Corri: `git add .`
- [ ] Corri: `git commit -m "Primeiro commit"`
- [ ] Criei Token em: https://github.com/settings/tokens
- [ ] Token anotado: `ghp_________________`
- [ ] Corri: `git remote add origin ...` (ajustei username)
- [ ] Corri: `git push -u origin main`
- [ ] Usei token como password
- [ ] Código aparece no GitHub ✅

**✅ GitHub completo!** Url: `https://github.com/_______/legacy-platform`

---

## 🗄️ PARTE 2: SUPABASE (10 min)

### Criar Conta
- [ ] Fui a https://supabase.com
- [ ] Cliquei em "Start your project"
- [ ] Cliquei em "Sign in with GitHub"
- [ ] Autorizei

### Criar Projeto
- [ ] Cliquei em "New Project"
- [ ] Nome: `LEGACY Platform`
- [ ] Password DB: `________________` (ANOTEI!)
- [ ] Region: `West EU (Ireland)`
- [ ] Pricing: `Free`
- [ ] Cliquei em "Create new project"
- [ ] Esperei 2-3 minutos ⏳

### Copiar Credenciais
- [ ] Fui a Settings → API
- [ ] Copiei URL: `https://_______________.supabase.co`
- [ ] Copiei Key anon: `eyJhbGci________________`
- [ ] Guardei num ficheiro de texto ✅

### Criar Tabelas
- [ ] Fui a SQL Editor
- [ ] Cliquei em "New query"
- [ ] Abri: `supabase/migrations/20251103162942_create_initial_schema.sql`
- [ ] Copiei TODO o conteúdo
- [ ] Colei no SQL Editor
- [ ] Cliquei em "Run" ▶️
- [ ] Vi "Success" ✅

- [ ] Cliquei em "New query" outra vez
- [ ] Abri: `supabase/migrations/20251104000000_fix_missions_system.sql`
- [ ] Copiei TODO o conteúdo
- [ ] Colei no SQL Editor
- [ ] Cliquei em "Run" ▶️
- [ ] Vi "Success" ✅

### Criar Admin
- [ ] SQL Editor → "New query"
- [ ] Copiei o código SQL do guia (ajustei dados)
- [ ] Username do admin: `________________`
- [ ] Password: `admin123` (mudar depois!)
- [ ] Cliquei em "Run"
- [ ] Vi "Success" ✅

### Verificar
- [ ] Fui a Table Editor
- [ ] Cliquei em "users"
- [ ] Vi o meu utilizador admin ✅

**✅ Supabase completo!**

---

## 🚀 PARTE 3: VERCEL (5 min)

### Criar Conta
- [ ] Fui a https://vercel.com
- [ ] Cliquei em "Sign Up"
- [ ] Cliquei em "Continue with GitHub"
- [ ] Autorizei

### Importar Projeto
- [ ] Cliquei em "Add New..." → "Project"
- [ ] Encontrei "legacy-platform"
- [ ] Cliquei em "Import"

### Configurar
- [ ] Project Name: deixei como está
- [ ] Framework: verificou "Next.js" ✅
- [ ] Root Directory: deixei "./"

#### Environment Variables (IMPORTANTE!)
- [ ] Cliquei em "Environment Variables" para expandir

**Variável 1:**
- [ ] KEY: `NEXT_PUBLIC_SUPABASE_URL`
- [ ] VALUE: (colei URL do Supabase)
- [ ] Cliquei em "Add"

**Variável 2:**
- [ ] KEY: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] VALUE: (colei Key do Supabase)
- [ ] Cliquei em "Add"

**Variável 3:**
- [ ] Fui a: https://generate-secret.vercel.app/32
- [ ] Copiei o segredo
- [ ] KEY: `JWT_SECRET`
- [ ] VALUE: (colei o segredo)
- [ ] Cliquei em "Add"

- [ ] Verifiquei que tenho 3 variáveis ✅

### Deploy
- [ ] Desci até ao fundo
- [ ] Cliquei em "Deploy" (botão azul)
- [ ] Esperei 3-5 minutos ⏳
- [ ] Vi confetti! 🎉
- [ ] Cliquei em "Visit"

**✅ Site online!** URL: `https://________________.vercel.app`

---

## ✅ PARTE 4: TESTAR (5 min)

### Teste 1: Homepage
- [ ] Site abre
- [ ] Vejo o menu
- [ ] Vejo "Learn Web3, Elevate Your Game"

### Teste 2: Criar Conta
- [ ] Cliquei em "Sign Up"
- [ ] Preenchi formulário (username: teste123)
- [ ] Cliquei em "Sign Up"
- [ ] Fui para o Dashboard ✅

### Teste 3: Login Admin
- [ ] Fiz logout
- [ ] Cliquei em "Login"
- [ ] Username: `admin`
- [ ] Password: `admin123`
- [ ] Entrei ✅

### Teste 4: Painel Admin
- [ ] Cliquei em "Admin" no menu
- [ ] Vi o painel administrativo
- [ ] Cliquei em "User Management"
- [ ] Vi 2 utilizadores (admin + teste123) ✅

---

## 🎊 DEPLOY COMPLETO!

**Se todos os ✅ estão marcados:**

### 🎯 Conseguiste!

**O teu site está:**
- ✅ Online 24/7
- ✅ Acessível globalmente
- ✅ Com base de dados funcional
- ✅ Pronto para utilizadores

### 📝 Anota Estas Informações:

```
🌐 URL do Site:
https://_________________.vercel.app

🐙 GitHub:
https://github.com/_______/legacy-platform

🗄️ Supabase:
https://_____________.supabase.co

🔐 Admin:
Username: __________
Password: admin123 (MUDAR URGENTE!)

⏰ Data do Deploy: ___/___/2025
```

---

## 🔄 PRÓXIMAS ACÇÕES

### Imediato (Hoje):
- [ ] Mudar password do admin
  1. Login como admin
  2. Ir ao perfil
  3. Mudar password

### Próximos Dias:
- [ ] Criar primeiro curso (Admin → Courses → Create)
- [ ] Criar primeiro post de blog (Admin → Blog → Create)
- [ ] Convidar equipa (criar contas e promover a Admin)

### Opcional:
- [ ] Comprar domínio próprio (ex: legacy.pt)
- [ ] Configurar email (Resend.com)
- [ ] Adicionar conteúdo de teste

---

## 🆘 SE ALGO CORRER MAL

### Site não abre:
1. Esperar 1 minuto
2. Refrescar página (F5)
3. Ir a Vercel → Deployments → verificar estado

### Erro ao criar conta:
1. Verificar variáveis de ambiente na Vercel
2. Verificar URL e Key do Supabase estão correctos

### Login não funciona:
1. Verificar que corri os 2 ficheiros SQL
2. Ver se utilizador existe em Supabase → Table Editor → users

### Outra coisa:
- Ver DEPLOY_PASSO_A_PASSO.md secção "Ajuda"
- Anotar erro exacto
- Tirar screenshot
- Pedir ajuda com detalhes

---

## 💪 MOTIVAÇÃO

**Fazer deploy não é fácil!**

Se chegaste aqui, és capaz de:
- ✅ Trabalhar com Git e GitHub
- ✅ Configurar bases de dados
- ✅ Fazer deploy de aplicações web
- ✅ Gerir servidores cloud

**Isto é o que programadores profissionais fazem!**

**Parabéns! 🎉👏**

---

**Imprime esta checklist e vai marcando os ✅ à medida que avanças!**
**Boa sorte! Tu consegues! 💪**
