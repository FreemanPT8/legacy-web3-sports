# Deploy Rápido - 5 Minutos

## Resumo Ultra-Rápido

**O que vai acontecer:**
1. Código vai para GitHub
2. GitHub conecta à Vercel
3. Vercel cria link público 24/7
4. Testers acedem ao link e registam-se
5. Dados ficam no Supabase (nunca se perdem!)

---

## Passos Rápidos

### 1. GitHub (2 minutos)

```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/SEU-USERNAME/legacy-platform.git
git push -u origin main
```

### 2. Vercel (3 minutos)

1. [vercel.com](https://vercel.com) → Login → **New Project**
2. Import `legacy-platform` do GitHub
3. Adicionar variáveis de ambiente (copiar do .env):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `JWT_SECRET`
   - `FROM_EMAIL`
   - `NEXT_PUBLIC_APP_URL` (usar o URL que a Vercel der)
4. **Deploy**
5. Aguardar 2-3 minutos

### 3. Partilhar com Testers

```
Olá!

Acede à plataforma LEGACY:
https://seu-projeto.vercel.app

Clica em "Sign Up" para criar a tua conta.

Qualquer problema, contacta-me!
```

---

## Variáveis de Ambiente (copiar do .env)

```env
NEXT_PUBLIC_SUPABASE_URL=https://fnkixbcxhwjiiuvhamgn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZua2l4YmN4aHdqaWl1dmhhbWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODM4NzcsImV4cCI6MjA3Nzc1OTg3N30.2UGMkkBaN55l5sBbMm81G0eHnVw61ayHamARk5lhARw
JWT_SECRET=JuxtpTPTICEvsgB5GSIMrrvtxGcB49vT/BLjxbVuH90=
FROM_EMAIL=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=https://SEU-PROJETO.vercel.app
```

---

## Fazer Updates Depois

```bash
# Editar código localmente
git add .
git commit -m "Update: nova funcionalidade"
git push

# A Vercel faz deploy automático!
# Testers veem mudanças mas dados continuam lá
```

---

## FAQ Ultra-Rápido

**Os dados são perdidos?**
❌ NÃO! Estão no Supabase separadamente.

**Quanto custa?**
✅ GRÁTIS (até 100GB/mês de bandwidth)

**Posso fazer updates?**
✅ SIM! Ilimitados. Push para GitHub = Deploy automático.

**Testers veem as mudanças?**
✅ SIM! Refrescam a página e veem.

**Dados dos testers ficam?**
✅ SIM! Tudo fica no Supabase para sempre.

---

## Guia Completo

Para instruções detalhadas, veja: `VERCEL_DEPLOYMENT_GUIDE.md`

---

**Status:** ✅ Projeto testado e pronto para deploy!
