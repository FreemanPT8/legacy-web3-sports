# Guia de Deploy na Vercel - LEGACY Platform

## Visão Geral

Este guia explica como fazer o deploy da plataforma LEGACY na Vercel para que os testers possam aceder 24/7 através de um link público.

**IMPORTANTE:** Os dados dos utilizadores ficam no Supabase. Pode fazer deploys ilimitados que os dados NUNCA são perdidos!

---

## Pré-requisitos

1. Conta GitHub (gratuita) - [github.com](https://github.com)
2. Conta Vercel (gratuita) - [vercel.com](https://vercel.com)
3. Projeto Supabase já configurado (já tem!)

---

## Passo 1: Preparar o Repositório GitHub

### 1.1 Criar Repositório no GitHub

1. Aceda a [github.com/new](https://github.com/new)
2. Nome do repositório: `legacy-platform` (ou o nome que preferir)
3. Escolha **Private** (para manter privado durante testes)
4. NÃO adicione README, .gitignore ou license (já existem no projeto)
5. Clique em **Create repository**

### 1.2 Preparar o Projeto Localmente

No terminal, na pasta do projeto, execute:

```bash
# Inicializar Git (se ainda não estiver inicializado)
git init

# Adicionar todos os ficheiros
git add .

# Criar o primeiro commit
git commit -m "Initial commit - Ready for deployment"

# Conectar ao repositório GitHub
git remote add origin https://github.com/SEU-USERNAME/legacy-platform.git

# Enviar o código para o GitHub
git branch -M main
git push -u origin main
```

**NOTA:** Substitua `SEU-USERNAME` pelo seu username do GitHub.

---

## Passo 2: Deploy na Vercel

### 2.1 Importar Projeto

1. Aceda a [vercel.com](https://vercel.com) e faça login
2. Clique em **Add New...** → **Project**
3. Selecione **Import Git Repository**
4. Escolha o repositório `legacy-platform`
5. Clique em **Import**

### 2.2 Configurar Variáveis de Ambiente

Na página de configuração do projeto:

1. Expanda a secção **Environment Variables**
2. Adicione as seguintes variáveis (uma de cada vez):

```
NEXT_PUBLIC_SUPABASE_URL
https://fnkixbcxhwjiiuvhamgn.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZua2l4YmN4aHdqaWl1dmhhbWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODM4NzcsImV4cCI6MjA3Nzc1OTg3N30.2UGMkkBaN55l5sBbMm81G0eHnVw61ayHamARk5lhARw

JWT_SECRET
JuxtpTPTICEvsgB5GSIMrrvtxGcB49vT/BLjxbVuH90=

FROM_EMAIL
onboarding@resend.dev

NEXT_PUBLIC_APP_URL
https://SEU-PROJETO.vercel.app
```

**NOTA:** O `NEXT_PUBLIC_APP_URL` será o URL que a Vercel lhe der. Pode adicionar isto DEPOIS do primeiro deploy e fazer re-deploy.

**RESEND_API_KEY** é opcional (para emails). Pode deixar em branco por agora.

### 2.3 Deploy

1. Clique em **Deploy**
2. Aguarde 2-5 minutos enquanto o build é executado
3. Quando ver "Congratulations!" o deploy está completo!

---

## Passo 3: Configurar URL Final

### 3.1 Obter o URL da Aplicação

Após o deploy:
1. Verá o URL: `https://legacy-platform-xyz123.vercel.app`
2. Copie este URL

### 3.2 Atualizar Variável de Ambiente

1. No dashboard da Vercel, vá a **Settings** → **Environment Variables**
2. Encontre `NEXT_PUBLIC_APP_URL`
3. Edite e cole o URL que copiou
4. Clique em **Save**

### 3.3 Re-deploy

1. Vá a **Deployments**
2. Clique nos três pontos do último deploy
3. Selecione **Redeploy**
4. Confirme

---

## Passo 4: Verificar o Deploy

### 4.1 Testar a Aplicação

1. Abra o URL: `https://seu-projeto.vercel.app`
2. Teste o registo de utilizador
3. Teste o login
4. Verifique que os dados aparecem no Supabase

### 4.2 Criar Conta de Teste

1. Registe-se com email de teste
2. Verifique que o XP system funciona
3. Teste criar conteúdo (post no fórum, etc.)
4. Verifique que tudo fica guardado no Supabase

---

## Passo 5: Partilhar com Testers

### 5.1 URL de Acesso

Envie aos testers:
```
URL: https://seu-projeto.vercel.app
Instruções: Clique em "Sign Up" para criar conta
```

### 5.2 Credenciais Admin (opcional)

Se quiser que alguns testers tenham acesso admin:
```
Username: superadmin
Password: admin123
URL Admin: https://seu-projeto.vercel.app/admin
```

---

## Como Fazer Updates (Workflow Diário)

### Cenário: Fez mudanças no Bolt e quer atualizar a aplicação

```bash
# 1. Copie os ficheiros alterados do Bolt para o seu projeto local

# 2. Adicione as mudanças ao Git
git add .

# 3. Faça commit
git commit -m "Update: descrição das mudanças"

# 4. Envie para o GitHub
git push

# 5. A Vercel faz deploy automático em 2-3 minutos!
```

**RESULTADO:** Os testers veem as mudanças (podem ter de refrescar a página) mas TODO o conteúdo criado continua intacto!

---

## Perguntas Frequentes

### Os dados são perdidos quando faço novo deploy?

**NÃO!** Os dados estão no Supabase (base de dados separada). Pode fazer 1000 deploys que os dados continuam lá.

### Como adiciono novos testers?

Envie o URL. Eles registam-se normalmente através do botão "Sign Up".

### Posso mudar o URL?

Sim! Na Vercel, vá a **Settings** → **Domains** e adicione um domínio personalizado (ou use subdomínio gratuito da Vercel).

### Quanto custa?

**GRATUITO** para até 100GB de bandwidth/mês (suficiente para centenas de utilizadores).

### E se o Supabase ficar cheio?

O plano gratuito do Supabase tem 500MB de base de dados. Para 10-50 testers é mais que suficiente.

### Como vejo os erros?

Na Vercel, vá a **Deployment** → **Runtime Logs** para ver logs em tempo real.

### Posso ter múltiplos ambientes (teste e produção)?

Sim! Crie branches no Git:
- `main` → Deploy de produção
- `development` → Deploy de teste

A Vercel cria URLs separados para cada branch automaticamente!

---

## Resolução de Problemas

### Build falhou

1. Verifique os logs na Vercel
2. Execute localmente: `npm run build`
3. Corrija os erros
4. Faça novo push para o GitHub

### Variáveis de ambiente não funcionam

1. Verifique que começam com `NEXT_PUBLIC_` (para variáveis do cliente)
2. Faça re-deploy após adicionar variáveis
3. Limpe cache: Settings → General → Clear Cache

### URL não funciona

1. Aguarde 5-10 minutos após o deploy
2. Tente em modo anónimo (incognito)
3. Limpe cache do browser

---

## Próximos Passos

Após os testes:

1. **Manter este deploy** - Simplesmente continue a usá-lo como produção
2. **Migrar para domínio próprio** - Adicione domínio personalizado nas settings
3. **Escalar** - A Vercel escala automaticamente quando mais utilizadores entrarem

---

## Suporte

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)

---

**Resumo Final:**

1. GitHub: Guardar código
2. Vercel: Hospedar aplicação (GRÁTIS, 24/7)
3. Supabase: Guardar dados (GRÁTIS)
4. Updates: Push para GitHub → Deploy automático
5. Dados: NUNCA são perdidos, ficam no Supabase

**Está tudo pronto para deploy!** 🚀
