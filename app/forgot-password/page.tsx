'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trophy } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.error ?? 'Não foi possível enviar o email.';
        setStatus('error');
        setError(msg);

        toast({
          title: 'Erro ao enviar email',
          description: msg,
          variant: 'destructive',
        });

        return;
      }

      setStatus('success');
      toast({
        title: 'Email enviado',
        description: 'Se esse email estiver registado, enviámos um link de recuperação.',
      });
    } catch (err) {
      console.error(err);
      const msg = 'Erro inesperado. Tenta novamente mais tarde.';
      setStatus('error');
      setError(msg);

      toast({
        title: 'Erro inesperado',
        description: msg,
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#000c12] px-4">
      <Card className="w-full max-w-md border border-white/10 bg-[#000c12] shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-cyan-300" />
              <span className="bg-gradient-to-r from-[#1d98a6] via-[#14718f] to-[#126e84] bg-clip-text text-2xl font-bold text-transparent">
                LEGACY
              </span>
            </div>
          </div>
          <CardTitle className="text-center text-2xl text-white">Recuperar palavra-passe</CardTitle>
          <CardDescription className="text-center text-slate-300">
            Introduz o email com que te registaste. Vamos enviar-te um link para definires uma nova palavra-passe.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1 block text-sm font-medium text-slate-100" htmlFor="email">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="o.teu@email.com"
              />
            </div>

            {status === 'error' && error && <p className="text-sm text-red-400">{error}</p>}

            {status === 'success' && (
              <p className="text-sm text-emerald-400">
                Se esse email estiver registado, enviámos um link de recuperação.
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? 'A enviar...' : 'Enviar link de recuperação'}
            </Button>

            <p className="text-center text-sm text-slate-400">
              <Link href="/login" className="text-cyan-300 hover:underline">
                Voltar ao login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

