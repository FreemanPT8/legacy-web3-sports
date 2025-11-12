# 🔧 COMO CORRIGIR O ERRO 404 NA PÁGINA /admin

## ❌ Problema
Ao clicar no link "Painel Admin" aparece:
```
Page not found
Looks like you've followed a broken link...
```

## ✅ SOLUÇÃO IMEDIATA

### Se está no NETLIFY:

#### Opção A: Mudar para Vercel (RECOMENDADO)
Next.js funciona melhor no Vercel. Siga os passos em `DEPLOY_INSTRUCTIONS.md`.

#### Opção B: Ficar no Netlify (Requer configuração extra)

1. **Instale o plugin Next.js do Netlify:**
```bash
npm install -D @netlify/plugin-nextjs
```

2. **Adicione ao `package.json`:**
```json
{
  "dependencies": {
    "@netlify/plugin-nextjs": "^5.0.0"
  }
}
```

3. **Crie/atualize `netlify.toml`:**
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

4. **No Netlify Dashboard:**
   - Vá em **Deploys** → **Trigger deploy** → **Clear cache and deploy site**

### Se está no VERCEL:

O erro 404 geralmente é por:

#### 1. Variáveis de Ambiente em Falta
No Vercel Dashboard → Settings → Environment Variables, adicione:
```
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_supabase
JWT_SECRET=seu_secret_jwt_32_chars_minimo
```

#### 2. Usuário Sem Permissão Admin
Execute no Supabase SQL Editor:
```sql
UPDATE users
SET role = 'Super Admin'
WHERE email = 'seu-email@exemplo.com';
```

#### 3. Build Cache Antigo
No Vercel Dashboard:
- Vá em **Deployments**
- Clique nos 3 pontos → **Redeploy**
- Marque "Use existing build cache" = **OFF**

---

## 🔍 DIAGNÓSTICO

### Teste 1: Verificar se está autenticado
1. Abra o site
2. Faça login
3. Abra o menu do utilizador (canto superior direito)
4. Se vir "Painel Admin" = ✅ Configuração correta

### Teste 2: Verificar role no Supabase
```sql
SELECT id, email, username, role
FROM users
WHERE email = 'seu-email@exemplo.com';
```

Deve retornar `role = 'Super Admin'` ou `'Admin'`

### Teste 3: Verificar variáveis de ambiente
No terminal do seu computador:
```bash
# Vercel
vercel env pull

# Netlify
netlify env:list
```

---

## 🚨 ERRO COMUM: Página carrega mas depois redireciona

**Causa:** A página `/admin/page.tsx` tem verificação de autenticação que redireciona se não for admin.

**Solução:** Certifique-se que:
1. Está logado
2. Seu usuário tem role = 'Admin' ou 'Super Admin'
3. As variáveis de ambiente estão corretas

---

## 🎯 SOLUÇÃO DEFINITIVA PASSO-A-PASSO

### 1. No seu computador (local):
```bash
# Teste se build funciona
npm run build

# Se houver erros, corrija-os antes de continuar
```

### 2. No Supabase Dashboard:
```sql
-- Verificar/corrigir role
SELECT email, role FROM users;

-- Se necessário, atualizar
UPDATE users SET role = 'Super Admin' WHERE email = 'SEU_EMAIL';
```

### 3. No Vercel/Netlify Dashboard:
- Adicione TODAS as variáveis de ambiente
- Faça **Clear cache and redeploy**

### 4. Teste novamente:
```
https://seu-site.com/admin
```

---

## ✅ CHECKLIST RÁPIDO

- [ ] Build local sem erros
- [ ] Variáveis de ambiente configuradas no hosting
- [ ] Usuário tem role = 'Admin' ou 'Super Admin' no Supabase
- [ ] Cache limpo e site re-deployed
- [ ] Testou fazer login antes de acessar /admin
- [ ] Verificou console do browser (F12) por erros

---

## 🎉 RESULTADO ESPERADO

Após seguir os passos, ao acessar `/admin` você deve ver:

```
Admin Dashboard
Manage LEGACY platform content and users

[Cards coloridos com estatísticas]
- Total Users
- Active Courses
- Blog Posts
- Pending Onboarding

[8 Cards de navegação com gradientes]
- User Management
- Course Management
- Blog Management
- Onboarding Submissions
- Forum Moderation
- XP Management
- Analytics
- Platform Settings
```

---

**Se ainda assim não funcionar:**
1. Exporte os logs de erro (console do browser + dashboard do hosting)
2. Verifique se o arquivo `/app/admin/page.tsx` existe no repositório
3. Confirme que a branch correta foi deployada
