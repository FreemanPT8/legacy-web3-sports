'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type AcceptState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'needs-login' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export default function HeadInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const token = searchParams?.get('token') ?? '';
  const [state, setState] = useState<AcceptState>({ status: 'idle' });

  const loginUrl = useMemo(() => {
    const current = `/head/invite?token=${encodeURIComponent(token || '')}`;
    return `/login?next=${encodeURIComponent(current)}`;
  }, [token]);

  const handleAccept = async () => {
    if (!token) {
      setState({ status: 'error', message: 'Token em falta. Usa o link completo enviado pelo Legacy.' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const response = await fetch('/api/head-invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (response.status === 401) {
        setState({ status: 'needs-login' });
        return;
      }
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Falha ao aceitar convite.');
      }
      setState({ status: 'success' });
      setTimeout(() => {
        router.push('/admin/houses');
      }, 1600);
    } catch (error: any) {
      setState({
        status: 'error',
        message: error?.message || 'Não foi possível aceitar o convite. Tenta novamente.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#010913] via-[#02121c] to-[#04131b] text-white">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 md:px-6">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#021125]/90 via-[#03182e]/80 to-[#04243c]/80 p-6 shadow-[0_35px_90px_rgba(3,10,25,0.55)] md:p-10">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.55em] text-cyan-300">
            <ShieldCheck className="h-4 w-4" />
            convite oficial legacy
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-[#fdd87c]">Aceitar convite para Head of House</h1>
          <p className="mt-2 text-sm text-white/80">
            Antes de prosseguir, garante que estás autenticado com a conta Admin/Super Admin associada ao Legacy.
          </p>
        </section>

        <Card className="border-white/10 bg-[#020c18]/85">
          <CardHeader>
            <CardTitle className="text-white">Confirmação do convite</CardTitle>
            <CardDescription className="text-white/70">
              O token valida o teu acesso como Head da House. Só avança se reconheces o pedido e aceitas as
              responsabilidades oficiais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!token ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                Link inválido. Solicita novamente o convite ao Super Admin.
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
                  <p className="font-semibold text-white">Token</p>
                  <p className="mt-1 font-mono text-xs text-cyan-200">{token.slice(0, 32)}...</p>
                </div>
                {state.status === 'needs-login' ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    <p className="font-semibold text-amber-200">Autenticação necessária</p>
                    <p className="mt-1">Entra com a tua conta Legacy para aceitar o convite.</p>
                  </div>
                ) : null}
                {state.status === 'error' ? (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {state.message}
                  </div>
                ) : null}
                {state.status === 'success' ? (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    Convite aceite com sucesso. A redirecionar-te para o painel de Houses.
                  </div>
                ) : null}

                {!user && state.status !== 'success' ? (
                  <Button
                    variant="secondary"
                    className="w-full bg-white/10 text-white hover:bg-white/20"
                    asChild
                  >
                    <Link href={loginUrl}>Iniciar sessão antes de aceitar</Link>
                  </Button>
                ) : null}

                <Button
                  className="w-full bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1f1500] hover:opacity-90"
                  disabled={state.status === 'loading' || state.status === 'success' || !token || loading}
                  onClick={handleAccept}
                >
                  {state.status === 'loading' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A validar convite...
                    </>
                  ) : (
                    <>
                      Aceitar convite
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
