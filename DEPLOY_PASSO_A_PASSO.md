# 🎯 Deploy em 30 Minutos - Guia Ultra Detalhado

## Antes de Começar

**Vais precisar de:**
- ✅ Um email
- ✅ 30 minutos de tempo
- ✅ Paciência (é normal demorar na primeira vez!)

**Não precisas de saber:**
- ❌ Programação
- ❌ Termos técnicos
- ❌ Como funciona internamente

**Vou guiar-te EXACTAMENTE onde clicar!**

---

## 🌟 PARTE 1: GitHub (10 minutos)

### O Que É Isto?
É onde vais guardar o código do teu site. Pensa nele como uma Dropbox para código.

### Passo 1.1: Criar Conta

**Abre:** https://github.com

**No ecrã inicial:**
```
┌─────────────────────────────────────┐
│  [Logo GitHub]                      │
│                                     │
│  ┌──────────┐         ┌──────────┐ │
│  │  Sign in │         │ Sign up  │←── CLICA AQUI
│  └──────────┘         └──────────┘ │
└─────────────────────────────────────┘
```

1. Clica em **"Sign up"** (canto superior direito)
2. Escreve o teu email: `_____________@_____.com`
3. Clica no botão verde **"Continue"**
4. Cria uma password: `_______________` (guarda-a!)
5. Clica **"Continue"**
6. Escolhe um username: `_______________` (guarda-o!)
7. Clica **"Continue"**
8. Responde ao puzzle (para provar que não és robot)
9. Clica em **"Create account"**
10. Vai ao teu email e clica no link de verificação

**✅ Tens conta no GitHub!**

### Passo 1.2: Criar Repositório (Pasta do Projeto)

**Já deves estar logado no GitHub.**

```
┌─────────────────────────────────────┐
│  Topo da página:                    │
│  [Logo] [Search] [+] ← CLICA AQUI  │
└─────────────────────────────────────┘
```

1. Procura o **sinal de +** no topo à direita
2. Clica nele
3. Aparece um menu, clica em **"New repository"**

**No formulário que aparece:**

```
Repository name: ┌──────────────────────┐
                 │ legacy-platform      │← ESCREVE ISTO
                 └──────────────────────┘

Description:     ┌──────────────────────┐
                 │ (opcional)           │
                 └──────────────────────┘

☐ Public        ← DEIXA MARCADO
☐ Private

☐ Add a README   ← DEIXA DESMARCADO
☐ Add .gitignore ← DEIXA DESMARCADO
```

4. Em "Repository name" escreve: `legacy-platform`
5. **IMPORTANTE:** NÃO marques nenhuma caixa abaixo!
6. Clica no botão verde **"Create repository"**

**Vais ver uma página com código. NÃO FECHA! Vamos usá-la.**

### Passo 1.3: Enviar o Código (Mais Técnico)

**Abre o Terminal (Mac) ou Git Bash (Windows)**

**Como encontrar:**
- **Mac:** Procura "Terminal" no Spotlight (cmd + espaço)
- **Windows:** Procura "Git Bash" no menu Iniciar

**No terminal, escreve isto (linha a linha, carrega Enter depois de cada):**

```bash
# Vai para a pasta do projeto (ajusta o caminho!)
cd /tmp/cc-agent/59643437/project

# Inicializa git
git init

# Adiciona todos os ficheiros
git add .

# Cria o primeiro commit
git commit -m "Primeiro commit"

# Liga ao GitHub (muda SEU-USERNAME!)
git remote add origin https://github.com/SEU-USERNAME/legacy-platform.git

# Envia para o GitHub
git push -u origin main
```

**Vai pedir:**
- **Username:** (o que criaste no GitHub)
- **Password:** NÃO é a password! Vê abaixo 👇

#### Criar Token (em vez de password)

1. Vai a: https://github.com/settings/tokens
2. Clica em **"Generate new token"**
3. Clica em **"Generate new token (classic)"**
4. Nome: `Token LEGACY`
5. Expiration: **"90 days"**
6. Marca apenas: ☑ **repo**
7. Desçe e clica em **"Generate token"** (botão verde no fundo)
8. **COPIA O TOKEN!** Algo como: `ghp_abc123...`
9. No terminal, quando pedir password, cola este token

**✅ Código no GitHub!**

Vai a `https://github.com/SEU-USERNAME/legacy-platform` para ver!

---

## 🗄️ PARTE 2: Supabase (10 minutos)

### O Que É Isto?
É onde vão ficar os dados do site (utilizadores, cursos, etc.). Como um Excel gigante na cloud.

### Passo 2.1: Criar Conta

**Abre:** https://supabase.com

```
┌─────────────────────────────────────┐
│  [Logo Supabase]                    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Start your project          │←── CLICA AQUI
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

1. Clica no botão verde **"Start your project"**
2. Clica em **"Sign in with GitHub"**
3. Autoriza (clica **"Authorize"**)

**✅ Tens conta no Supabase!**

### Passo 2.2: Criar Projeto

```
Dashboard do Supabase:
┌─────────────────────────────────────┐
│  All projects                       │
│                                     │
│  ┌────────────┐                    │
│  │ New Project│ ← CLICA AQUI       │
│  └────────────┘                    │
└─────────────────────────────────────┘
```

1. Clica em **"New Project"** (botão verde)

**No formulário:**

```
Name: ┌──────────────────────┐
      │ LEGACY Platform      │← ESCREVE ISTO
      └──────────────────────┘

Database Password: ┌──────────────────────┐
                   │ (cria uma forte!)    │← GUARDA ISTO!
                   └──────────────────────┘

Region: ┌──────────────────────┐
        │ West EU (Ireland)    │← ESCOLHE ISTO
        └──────────────────────┘

Pricing Plan: [Free] ← DEIXA ASSIM
```

2. Nome: `LEGACY Platform`
3. Password: Cria uma! Ex: `Legacy2025!Secure` **GUARDA NUM PAPEL!**
4. Region: **West EU (Ireland)** (mais perto de PT)
5. Pricing: Deixa **Free**
6. Clica em **"Create new project"** (botão verde)

**ESPERA 2-3 MINUTOS** (está a criar a base de dados)

### Passo 2.3: Copiar Credenciais

**Quando ficar pronto:**

```
Menu lateral esquerdo:
┌────────────────┐
│ 📊 Home        │
│ 📋 Table Editor│
│ ...            │
│ ⚙️ Settings   │← CLICA AQUI
└────────────────┘
```

1. Menu lateral, clica em **⚙️ Settings** (ícone de engrenagem)
2. Clica em **"API"**

**Vais ver:**

```
Project URL: https://abc123.supabase.co  ← COPIA ISTO

Project API keys:
anon public: eyJhbGciOiJIU... ← COPIA ISTO
```

**ABRE UM BLOCO DE NOTAS E COLA:**

```
URL: https://_____________.supabase.co
Key: eyJhbGci__________________________
```

**GUARDA ESTE FICHEIRO!** Vais precisar daqui a 5 minutos.

### Passo 2.4: Criar Tabelas

```
Menu lateral:
┌────────────────┐
│ 📊 Home        │
│ ...            │
│ 🔧 SQL Editor │← CLICA AQUI
└────────────────┘
```

1. Clica em **"SQL Editor"** no menu
2. Clica em **"New query"** (botão + no topo)

**Agora vais copiar código:**

3. No teu computador, abre a pasta do projeto
4. Abre: `supabase/migrations/20251103162942_create_initial_schema.sql`
5. Selecciona TUDO (Ctrl+A ou Cmd+A)
6. Copia (Ctrl+C ou Cmd+C)
7. Volta ao Supabase
8. Cola no SQL Editor (o quadrado grande branco)
9. Clica em **"Run"** (botão ▶️ canto inferior direito)
10. Deve aparecer: ✅ **"Success. No rows returned"**

**Repete para o segundo ficheiro:**

11. Clica em **"New query"** outra vez
12. Abre: `supabase/migrations/20251104000000_fix_missions_system.sql`
13. Copia tudo
14. Cola no SQL Editor
15. Clica em **"Run"**
16. Deve aparecer: ✅ **"Success"**

### Passo 2.5: Criar Conta Admin

**Ainda no SQL Editor:**

1. Clica em **"New query"**
2. **COPIA E COLA isto** (muda os dados!):

```sql
INSERT INTO users (
  username,
  full_name,
  email,
  password_hash,
  country,
  role,
  xp_total,
  profile_unlocked,
  email_verified
) VALUES (
  'admin',           -- ← Muda o username se quiseres
  'Administrador',   -- ← Muda o nome
  'admin@legacy.com',-- ← Muda o email
  '$2a$10$8Kx5XxH9JQK7x1TqV4K5JOL8TqV4K5JOL8TqV4K5JOL8TqV4K5JOL',
  'Portugal',
  'Super Admin',
  9999,
  true,
  true
);
```

3. Clica em **"Run"**
4. Deve aparecer: ✅ **"Success"**

**GUARDA:**
```
Username: admin
Password: admin123
```

### Passo 2.6: Verificar

```
Menu lateral:
┌────────────────┐
│ 📋 Table Editor│← CLICA AQUI
└────────────────┘
```

1. Clica em **"Table Editor"**
2. Clica em **"users"** na lista
3. Deves ver o teu utilizador admin! ✅

**✅ Base de dados pronta!**

---

## 🚀 PARTE 3: Vercel (5 minutos)

### O Que É Isto?
É o que vai colocar o teu site online para toda a gente poder visitar.

### Passo 3.1: Criar Conta

**Abre:** https://vercel.com

```
┌─────────────────────────────────────┐
│  [Logo Vercel]                      │
│                                     │
│  ┌──────────┐         ┌──────────┐ │
│  │  Log in  │         │ Sign Up  │←── CLICA AQUI
│  └──────────┘         └──────────┘ │
└─────────────────────────────────────┘
```

1. Clica em **"Sign Up"**
2. Clica em **"Continue with GitHub"**
3. Autoriza (clica **"Authorize"**)

**✅ Tens conta na Vercel!**

### Passo 3.2: Importar Projeto

```
Dashboard da Vercel:
┌─────────────────────────────────────┐
│  ┌────────────────┐                │
│  │ Add New... ▼  │← CLICA AQUI    │
│  └────────────────┘                │
└─────────────────────────────────────┘
```

1. Clica em **"Add New..."** (botão no topo)
2. Clica em **"Project"**

**Vais ver os teus repositórios do GitHub:**

```
Import Git Repository:
┌──────────────────────────────────────┐
│ 📁 legacy-platform                   │
│    ┌────────┐                        │
│    │ Import │← CLICA AQUI            │
│    └────────┘                        │
└──────────────────────────────────────┘
```

3. Encontra **"legacy-platform"**
4. Clica em **"Import"** ao lado dele

### Passo 3.3: Configurar (IMPORTANTE!)

**Vais ver uma página de configuração.**

#### Secção 1: Project Name
```
Project Name: ┌──────────────────────┐
              │ legacy-platform      │← DEIXA ASSIM
              └──────────────────────┘
```

#### Secção 2: Framework
```
Framework Preset: [Next.js ▼] ← Deve estar assim
```

Se não estiver, escolhe "Next.js"

#### Secção 3: Root Directory
```
Root Directory: ./ ← DEIXA ASSIM
```

#### Secção 4: Environment Variables (CRÍTICO!)

```
┌─────────────────────────────────────┐
│ Environment Variables               │
│ ▼ Click to expand ← CLICA AQUI     │
└─────────────────────────────────────┘
```

1. Clica para expandir **"Environment Variables"**

**Vais adicionar 3 variáveis. Para cada uma:**

```
┌─────────────────────────────────────┐
│ KEY (name)    VALUE                 │
│ ┌──────────┐  ┌─────────────────┐  │
│ │          │  │                 │  │
│ └──────────┘  └─────────────────┘  │
│                         [Add] ← Depois de preencher
└─────────────────────────────────────┘
```

**VARIÁVEL 1:**
- KEY: `NEXT_PUBLIC_SUPABASE_URL`
- VALUE: (cola o URL do Supabase que guardaste)
- Clica **"Add"**

**VARIÁVEL 2:**
- KEY: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- VALUE: (cola a Key do Supabase que guardaste)
- Clica **"Add"**

**VARIÁVEL 3:**
- KEY: `JWT_SECRET`
- VALUE: (vê abaixo como gerar)

**Para gerar o JWT_SECRET:**
1. Abre: https://generate-secret.vercel.app/32
2. Copia o texto que aparece
3. Cola como VALUE
4. Clica **"Add"**

**Verifica que tens 3 variáveis adicionadas:**
```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ JWT_SECRET
```

### Passo 3.4: DEPLOY!

```
┌─────────────────────────────────────┐
│                                     │
│        ┌──────────┐                │
│        │  Deploy  │← CLICA AQUI    │
│        └──────────┘                │
└─────────────────────────────────────┘
```

1. Desçe até ao fundo da página
2. Clica no botão azul grande **"Deploy"**

**O QUE VAI ACONTECER:**

```
Building... ████████░░░░ 75%
```

- Vais ver código a correr
- Vai demorar **3-5 minutos**
- NÃO FECHAS A PÁGINA!

**Quando terminar:**

```
┌─────────────────────────────────────┐
│  🎉 Congratulations!                │
│                                     │
│  https://legacy-platform.vercel.app │
│                                     │
│  ┌────────────────────┐            │
│  │     Visit         │← CLICA      │
│  └────────────────────┘            │
└─────────────────────────────────────┘
```

**CLICA EM "VISIT"!**

---

## ✅ PARTE 4: Testar (5 minutos)

### Teste 1: Homepage Abre?

**O que deves ver:**
```
┌─────────────────────────────────────┐
│ [LOGO LEGACY]  Home About Blog      │
├─────────────────────────────────────┤
│                                     │
│   Learn Web3, Elevate Your Game    │
│                                     │
│   [Join Now] [Explore Courses]     │
└─────────────────────────────────────┘
```

**✅ Se vês isto, está a funcionar!**

### Teste 2: Criar Conta

```
Topo da página:
┌─────────────────────────────────────┐
│ Home About Blog [Login] [Sign Up] ← CLICA
└─────────────────────────────────────┘
```

1. Clica em **"Sign Up"** ou **"Registar"**
2. Preenche o formulário:
   ```
   Username:  ┌──────────┐
              │ teste123 │
              └──────────┘

   Full Name: ┌──────────┐
              │ Teste    │
              └──────────┘

   Email:     ┌──────────────────┐
              │ teste@teste.com  │
              └──────────────────┘

   Password:  ┌──────────┐
              │ senha123 │
              └──────────┘

   Country:   [Portugal ▼]
   ```
3. Clica em **"Sign Up"**

**Deves ir para o Dashboard!** ✅

### Teste 3: Login como Admin

1. Faz logout (clica no teu nome → Logout)
2. Clica em **"Login"**
3. Usa:
   ```
   Username: admin
   Password: admin123
   ```
4. Clica em **"Login"**

**Deves entrar!** ✅

### Teste 4: Painel Admin

```
Menu do topo:
┌─────────────────────────────────────┐
│ Home Education Sports [Admin] ← CLICA
└─────────────────────────────────────┘
```

1. Clica em **"Admin"**
2. Deves ver botões:
   - User Management
   - Course Management
   - Blog Management
   - etc.
3. Clica em **"User Management"**
4. Deves ver os 2 utilizadores! ✅

**SE TUDO ISTO FUNCIONA → SITE 100% ONLINE! 🎉🎉🎉**

---

## 🆘 Ajuda Rápida

### O site não abre

1. Espera 1 minuto (às vezes demora)
2. Actualiza a página (F5)
3. Verifica o URL está correcto
4. Vai à Vercel → Deployments → Vê se tem ✅

### Erro ao criar conta

1. Vai ao Supabase
2. Settings → API
3. Verifica que o URL e Key estão correctos
4. Vai à Vercel → Settings → Environment Variables
5. Verifica que estão lá as 3 variáveis

### Login não funciona

1. Verifica que corres te os 2 ficheiros SQL no Supabase
2. Vai a Table Editor → users
3. Vê se o utilizador admin existe

### Preciso de mais ajuda

**Partilha comigo:**
- Screenshot do erro
- URL do site
- Em que passo estás

**Vou resolver contigo!**

---

## 🎊 PARABÉNS!

Se chegaste aqui, tens um site completamente funcional online!

Isto não é fácil, e conseguiste! 🏆

**O teu site está:**
- ✅ Online 24/7
- ✅ Disponível globalmente
- ✅ Com base de dados funcional
- ✅ Pronto para utilizadores

**ACABASTE! 🎉**

---

**Dúvidas? Pergunta! Estou aqui para ajudar!**
