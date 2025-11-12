# 🚀 Guia Completo de Deploy - Do Zero ao Site Online

## Para Quem Nunca Fez Deploy de um Site

Este guia assume que nunca fizeste deploy de nada e vou explicar tudo desde o início.

---

## 📚 Índice

1. [O Que Vais Fazer - Visão Geral](#visão-geral)
2. [Passo 1: Preparar o GitHub](#passo-1-github)
3. [Passo 2: Configurar o Supabase](#passo-2-supabase)
4. [Passo 3: Fazer Deploy na Vercel](#passo-3-vercel)
5. [Passo 4: Testar o Site](#passo-4-testar)
6. [Passo 5: Resolver Problemas](#passo-5-problemas)

---

## 🎯 Visão Geral: O Que Vais Fazer

### Imagina que estás a construir uma casa:

1. **GitHub** = O teu "arquivo de plantas da casa"
   - Guarda todo o código do teu projeto
   - Como uma Dropbox mas para código
   - Grátis e usado por milhões de programadores

2. **Supabase** = A "cave/armazém da casa"
   - Guarda todos os dados (utilizadores, cursos, posts)
   - É a tua base de dados online
   - Como um Excel gigante na cloud

3. **Vercel** = A "empresa de construção"
   - Pega no teu código e coloca-o online
   - Torna o teu site acessível na internet
   - Grátis para projetos pessoais

### O Que Vai Acontecer:
1. Vais guardar o código no GitHub (5 minutos)
2. Vais criar uma base de dados no Supabase (10 minutos)
3. Vais fazer o site ficar online com Vercel (5 minutos)
4. **Total: ~20 minutos até teres o site a funcionar!**

---

## 📝 Passo 1: Preparar o GitHub

### O Que É o GitHub? (ELI5)
Imagina que estás a escrever um livro com mais pessoas. O GitHub é como uma biblioteca onde:
- Guardas todas as versões do livro
- Podes ver o que mudou
- Outros podem colaborar
- Está sempre seguro na cloud

### 1.1: Criar Conta no GitHub (se ainda não tens)

**Vai a:** https://github.com

1. Clica em **"Sign up"** (Registar) no canto superior direito
2. Preenche:
   - Email: `o_teu_email@exemplo.com`
   - Password: (escolhe uma password forte)
   - Username: (escolhe um nome de utilizador)
3. Clica em **"Create account"**
4. Verifica o teu email e clica no link de confirmação
5. Escolhe o plano **"Free"** (Grátis)

### 1.2: Instalar Git no Teu Computador

**O Que É o Git?**
É um programa que te permite enviar código para o GitHub. Pensa nele como o "carteiro" que leva o teu código até ao GitHub.

#### No Mac:
```bash
# Abre o Terminal (procura "Terminal" no Spotlight)
# Copia e cola este comando:
git --version
```
- Se aparecer um número (ex: `git version 2.39.0`) → já tens Git instalado! ✅
- Se pedir para instalar → clica "Install" e espera

#### No Windows:
1. Vai a: https://git-scm.com/download/win
2. Descarrega o instalador
3. Executa o ficheiro descarregado
4. Clica "Next" em tudo (configuração padrão está boa)
5. No fim, abre "Git Bash" (procura no menu Iniciar)

### 1.3: Configurar Git pela Primeira Vez

**Abre o Terminal/Git Bash** e copia estes comandos (um de cada vez):

```bash
# Diz ao Git quem és (usa o teu nome)
git config --global user.name "O Teu Nome"

# Diz ao Git o teu email (o mesmo do GitHub)
git config --global user.email "o_teu_email@exemplo.com"
```

### 1.4: Criar Repositório no GitHub

**O Que É um Repositório?**
É como uma "pasta" no GitHub onde vais guardar o teu projeto.

1. Vai a: https://github.com
2. Clica no **"+"** no canto superior direito
3. Clica em **"New repository"**
4. Preenche:
   - **Repository name:** `legacy-platform` (ou o nome que quiseres)
   - **Description:** `Plataforma de educação Web3 gamificada`
   - Deixa como **"Public"** (público)
   - ❌ **NÃO** marques "Add a README file"
5. Clica em **"Create repository"** (botão verde)

**Vais ver uma página com instruções. NÃO FECHAS ESTA PÁGINA!** Vamos usá-la já a seguir.

### 1.5: Enviar o Teu Código Para o GitHub

**Volta ao Terminal/Git Bash** e navega até à pasta do projeto:

```bash
# Substitui /caminho/para/projeto pelo caminho real
cd /tmp/cc-agent/59643437/project
```

**Agora copia estes comandos, um de cada vez:**

```bash
# Passo 1: Inicializa o Git nesta pasta
git init

# Passo 2: Adiciona todos os ficheiros
git add .

# Passo 3: Cria o primeiro "save point" (commit)
git commit -m "Primeiro commit: plataforma LEGACY completa"

# Passo 4: Diz ao Git onde está o teu GitHub
# ⚠️ IMPORTANTE: Substitui "SEU-USERNAME" pelo teu nome de utilizador do GitHub
git remote add origin https://github.com/SEU-USERNAME/legacy-platform.git

# Passo 5: Envia tudo para o GitHub
git push -u origin main
```

**Pode pedir password:**
- Username: (o teu username do GitHub)
- Password: ❌ **NÃO uses a tua password normal!**

**Precisas de um "Personal Access Token":**

#### Como Criar um Token:
1. Vai a: https://github.com/settings/tokens
2. Clica em **"Generate new token"** → **"Generate new token (classic)"**
3. Dá-lhe um nome: `Token LEGACY`
4. Em "Expiration": escolhe **"90 days"**
5. Marca apenas: **repo** (vai marcar tudo relacionado)
6. Clica em **"Generate token"** no fundo da página
7. **COPIA O TOKEN!** (só aparece uma vez)
8. Usa este token como password quando o Git pedir

**Pronto! O teu código está no GitHub! 🎉**

Vai a `https://github.com/SEU-USERNAME/legacy-platform` e vais ver todos os teus ficheiros!

---

## 🗄️ Passo 2: Configurar o Supabase

### O Que É o Supabase? (ELI5)
Imagina que tens uma caderneta onde escreves informações:
- Nomes de utilizadores
- Cursos criados
- Posts do blog

O Supabase é isso mas online, super rápido, e pode ter milhões de linhas. É como ter uma secretária que nunca se esquece de nada e trabalha 24/7.

### 2.1: Criar Conta no Supabase

1. Vai a: https://supabase.com
2. Clica em **"Start your project"** (botão verde)
3. Clica em **"Sign in with GitHub"**
4. Autoriza o Supabase (clica "Authorize")
5. Já tens conta! ✅

### 2.2: Criar um Projeto Novo

1. Clica em **"New Project"** (botão verde)
2. Preenche:
   - **Name:** `LEGACY Platform`
   - **Database Password:** (cria uma password forte e **GUARDA-A!**)
     - Exemplo: `Legacy2025!Secure`
     - ⚠️ **MUITO IMPORTANTE:** Guarda num local seguro!
   - **Region:** Escolhe **"West EU (Ireland)"** (mais perto de Portugal)
   - **Pricing Plan:** Deixa em **"Free"** (Grátis)
3. Clica em **"Create new project"**
4. **Espera 2-3 minutos** (está a criar a base de dados)

### 2.3: Copiar as Credenciais

Quando o projeto estiver pronto:

1. No menu lateral esquerdo, clica em **"Settings"** (⚙️ ícone de engrenagem)
2. Clica em **"API"**
3. Vais ver uma página com informações. Copia estes valores:

**Abre um bloco de notas e copia:**

```
URL do Projeto:
[Copia o que está em "Project URL"]

Chave Anon (Pública):
[Copia o que está em "anon public"]

⚠️ NUNCA partilhes a "service_role" key!
```

**Exemplo de como vai ficar:**
```
URL: https://xyzabc123.supabase.co
Chave: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBh...
```

### 2.4: Criar as Tabelas da Base de Dados

Agora vais "construir" a base de dados - criar as "prateleiras" onde vão ficar os dados.

1. No menu lateral, clica em **"SQL Editor"**
2. Clica em **"New query"** (botão + no topo)
3. **Abre o ficheiro no teu computador:**
   - Vai à pasta do projeto
   - Abre `supabase/migrations/20251103162942_create_initial_schema.sql`
4. **Copia TODO o conteúdo** desse ficheiro
5. **Cola** no SQL Editor do Supabase
6. Clica em **"Run"** (botão ▶️ no canto inferior direito)
7. Espera ~10 segundos
8. Deve aparecer **"Success. No rows returned"** ✅

**Repete o processo para o segundo ficheiro:**
9. Clica em **"New query"** novamente
10. Abre `supabase/migrations/20251104000000_fix_missions_system.sql`
11. Copia e cola no SQL Editor
12. Clica em **"Run"**
13. Deve aparecer sucesso novamente ✅

### 2.5: Criar o Utilizador Admin

Vais criar a tua conta de Super Admin.

1. Ainda no **SQL Editor**, clica em **"New query"**
2. **Copia este código** (substitui os valores):

```sql
-- Criar Super Admin
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
  'o_teu_username',  -- ← Muda isto
  'O Teu Nome',      -- ← Muda isto
  'teu@email.com',   -- ← Muda isto
  '$2a$10$8Kx5XxH9JQK7x1TqV4K5JOL8TqV4K5JOL8TqV4K5JOL8TqV4K5JOL',  -- Password: admin123
  'Portugal',
  'Super Admin',
  9999,
  true,
  true
);
```

3. Clica em **"Run"**
4. Deve aparecer **"Success"** ✅

**Guarda estas credenciais:**
```
Username: o_teu_username
Password: admin123
⚠️ Depois do deploy, muda esta password!
```

### 2.6: Verificar Que Tudo Funciona

1. No menu lateral, clica em **"Table Editor"**
2. Clica em **"users"** na lista de tabelas
3. Deves ver o teu utilizador criado! ✅
4. Clica em outras tabelas (`courses`, `blog_posts`, etc.) para ver que existem

**Pronto! A base de dados está pronta! 🎉**

---

## 🚀 Passo 3: Fazer Deploy na Vercel

### O Que É a Vercel? (ELI5)
Imagina que construíste uma casa (o teu código) e precisas de um terreno onde a colocar. A Vercel é esse terreno + dá-te a morada (URL) para as pessoas visitarem.

A Vercel é:
- Grátis para projetos pessoais
- Super rápida
- Faz deploy automático quando mudas código
- Muito fácil de usar

### 3.1: Criar Conta na Vercel

1. Vai a: https://vercel.com
2. Clica em **"Sign Up"** (canto superior direito)
3. Clica em **"Continue with GitHub"**
4. Autoriza a Vercel (clica "Authorize")
5. Já tens conta! ✅

### 3.2: Importar o Projeto do GitHub

1. No dashboard da Vercel, clica em **"Add New..."** → **"Project"**
2. Vais ver uma lista dos teus repositórios do GitHub
3. Encontra **"legacy-platform"** (ou o nome que deste)
4. Clica em **"Import"** ao lado dele

### 3.3: Configurar o Projeto

Vais ver uma página de configuração:

#### 3.3.1: Project Name
- Deixa como está OU muda para algo como `legacy-platform-production`

#### 3.3.2: Framework Preset
- Deve detectar automaticamente **"Next.js"** ✅
- Se não detectar, escolhe "Next.js" no menu

#### 3.3.3: Root Directory
- Deixa **"./"** (raiz do projeto)

#### 3.3.4: Build and Output Settings
- Deixa tudo como está (configuração automática)

#### 3.3.5: Environment Variables (MAIS IMPORTANTE!)

Clica em **"Environment Variables"** para expandir.

**Vais adicionar 3 variáveis:**

**Variável 1:**
- **Name (KEY):** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** [Cola o URL do Supabase que copiaste antes]
- Clica **"Add"**

**Variável 2:**
- **Name (KEY):** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** [Cola a chave Anon do Supabase]
- Clica **"Add"**

**Variável 3:**
- **Name (KEY):** `JWT_SECRET`
- **Value:** (vais gerar um segredo aleatório)

**Como gerar um JWT_SECRET:**

Opção A - Usar um site (mais fácil):
1. Vai a: https://generate-secret.vercel.app/32
2. Copia o texto que aparece
3. Cola como valor do `JWT_SECRET`

Opção B - No terminal:
```bash
openssl rand -base64 32
```
4. Copia o resultado e usa como `JWT_SECRET`

**Exemplo de como devem ficar as variáveis:**
```
NEXT_PUBLIC_SUPABASE_URL = https://xyzabc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6...
JWT_SECRET = JuxtpTPTICEvsgB5GSIMrrvtxGcB49vT...
```

#### 3.3.6: Deploy!

**Clica no botão "Deploy"** (botão azul grande)

**O Que Vai Acontecer:**
1. A Vercel vai descarregar o código do GitHub
2. Vai instalar todas as dependências (bibliotecas)
3. Vai compilar o projeto
4. Vai colocar online

**Isto demora ~3-5 minutos.** Vais ver:
- Um ecrã com logs a correr (código a aparecer)
- Uma barra de progresso
- Cada passo a completar ✅

**Quando terminar, vais ver:**
- 🎉 Confettis a cair
- Um botão **"Visit"**
- Um URL tipo: `https://legacy-platform.vercel.app`

### 3.4: Testar o Site

1. Clica em **"Visit"** ou copia o URL
2. O teu site deve abrir! 🎉
3. Se apareceu a homepage, **FUNCIONOU!** ✅

---

## ✅ Passo 4: Testar Tudo

### 4.1: Testar a Homepage

1. O site deve carregar e mostrar a página inicial
2. Deve haver um menu no topo
3. Deve haver informação sobre a plataforma

**Se isto funciona → Continua!**

### 4.2: Testar Registo de Utilizador

1. Clica em **"Sign Up"** / **"Registar"** no menu
2. Preenche o formulário:
   - Username: `teste123`
   - Nome completo: `Utilizador Teste`
   - Email: `teste@exemplo.com`
   - Password: `senha123`
   - País: (escolhe um)
3. Clica em **"Sign Up"**
4. Deves ser redirecionado para o Dashboard ✅

**Se funcionou → A base de dados está ligada!** 🎉

### 4.3: Testar Login como Admin

1. Faz logout (clica no teu nome e depois "Logout")
2. Clica em **"Login"**
3. Usa as credenciais do admin que criaste:
   - Username: `o_teu_username`
   - Password: `admin123`
4. Clica em **"Login"**
5. Deves entrar no Dashboard

### 4.4: Testar Painel Admin

1. No menu, clica em **"Admin"**
2. Deves ver o painel administrativo
3. Clica em **"User Management"**
4. Deves ver os 2 utilizadores:
   - O admin (tu)
   - O utilizador teste

**Se tudo isto funciona → O site está 100% operacional!** 🎉🎉🎉

---

## 🔧 Passo 5: Resolver Problemas Comuns

### Problema 1: "Application Error" no Site

**Causa:** Faltam variáveis de ambiente

**Solução:**
1. Vai ao dashboard da Vercel
2. Clica no teu projeto
3. Vai a **"Settings"** (menu no topo)
4. Clica em **"Environment Variables"**
5. Verifica que tens as 3 variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `JWT_SECRET`
6. Se falta alguma, adiciona
7. Vai a **"Deployments"** (menu no topo)
8. Clica nos **"..."** do último deploy
9. Clica em **"Redeploy"**

### Problema 2: "Failed to fetch" ao fazer login

**Causa:** Base de dados não configurada

**Solução:**
1. Vai ao Supabase
2. Verifica que corres te os 2 ficheiros SQL
3. Vai a **"Table Editor"**
4. Verifica que existem as tabelas `users`, `courses`, etc.
5. Se não existem, corre os ficheiros SQL novamente

### Problema 3: Build falha na Vercel

**Causa:** Erro no código ou dependências

**Solução:**
1. Vai a **"Deployments"** na Vercel
2. Clica no deploy que falhou
3. Lê o log de erros (texto vermelho)
4. Procura a primeira linha de erro
5. Partilha comigo e ajudo-te a resolver

### Problema 4: Site muito lento

**Causa:** Região errada do Supabase

**Solução:**
- Já escolheste West EU no início ✅
- Se não, cria um projeto novo no Supabase

---

## 📋 Checklist Final

Antes de considerares o deploy completo, verifica:

- [ ] O site abre em `https://...vercel.app` ✅
- [ ] Consegues ver a homepage ✅
- [ ] Consegues criar uma conta nova ✅
- [ ] Consegues fazer login ✅
- [ ] Consegues aceder ao painel admin ✅
- [ ] Consegues ver a lista de utilizadores no admin ✅
- [ ] O menu funciona e todas as páginas carregam ✅

**Se tudo está ✅ → Deploy completo! 🎉**

---

## 🎯 Próximos Passos

### Depois do Deploy Funcionar:

1. **Mudar a Password do Admin**
   - Faz login como admin
   - Vai ao perfil
   - Muda a password de `admin123` para algo seguro

2. **Configurar Domínio Próprio** (Opcional)
   - Podes comprar um domínio (ex: `legacy.com`)
   - Na Vercel, vai a Settings → Domains
   - Adiciona o teu domínio

3. **Configurar Email** (Opcional)
   - Cria conta no Resend.com
   - Adiciona `RESEND_API_KEY` nas variáveis de ambiente
   - Os utilizadores recebem emails de boas-vindas

4. **Criar Conteúdo**
   - Login como admin
   - Vai a `/admin/courses` e cria o primeiro curso
   - Vai a `/admin/blog` e cria o primeiro post

5. **Convidar Colaboradores**
   - Cria contas para a tua equipa
   - Promove-os a Admin no painel de utilizadores

---

## 🆘 Preciso de Ajuda!

### Se Algo Não Funcionar:

**Partilha comigo:**
1. Em que passo estás
2. O que aconteceu vs o que esperavas
3. Screenshot do erro (se houver)
4. URL do deploy (se já existe)

**Vou ajudar-te a resolver!**

---

## 🎊 Parabéns!

Se chegaste até aqui e o site está online, **fizeste deploy de uma aplicação web completa!**

Isto não é fácil e muitas pessoas desistem. Tu conseguiste! 🏆

O teu site está agora:
- ✅ Online 24/7
- ✅ Acessível de qualquer lugar do mundo
- ✅ Com base de dados funcional
- ✅ Pronto para receber utilizadores

**Bem-vindo à comunidade de desenvolvedores!** 👨‍💻👩‍💻

---

**Criado com ❤️ para ser fácil de seguir**
**Se tiveres dúvidas, pergunta! Estou aqui para ajudar.**
