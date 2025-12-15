'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Trophy } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const { toast } = useToast();

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Link inválido ou em falta. Pede um novo link de recuperação.');
      setStatus('error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      const msg = 'As palavras-passe não coincidem. Verifica e tenta novamente.';
      setError(msg);
      setStatus('error');

      toast({
        title: 'Erro na palavra-passe',
        description: msg,
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      const msg = 'A palavra-passe deve ter pelo menos 6 caracteres.';
      setError(msg);
      setStatus('error');

      toast({
        title: 'Palavra-passe demasiado curta',
        description: msg,
        variant: 'destructive',
      });
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.error ?? 'Não foi possível redefinir a palavra-passe.';
        setStatus('error');
        setError(msg);

        toast({
          title: 'Erro ao redefinir palavra-passe',
          description: msg,
          variant: 'destructive',
        });

        return;
      }

      setStatus('success');

      toast({
        title: 'Palavra-passe atualizada',
        description: 'A tua palavra-passe foi redefinida com sucesso. Já podes entrar.',
      });

      router.push('/login');
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
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000c12] px-4">
        <Card className="w-full max-w-md border border-white/10 bg-[#000c12] shadow-xl">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="flex items-center space-x-2">
                <Trophy className="h-8 w-8 text-cyan-300" />
                <span className="bg-gradient-to-r from-[#1d98a6] via-[#14718f] to-[#126e84] bg-clip-text text-2xl font-bold text-transparent tracking-[0.35em]">
                  LEGACY
                </span>
              </div>
            </div>
            <CardTitle className="text-center text-2xl text-white">Link inválido ou expirado</CardTitle>
            <CardDescription className="text-center text-slate-300">
              O link de redefinição de palavra-passe é inválido, está em falta ou já expirou.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-center text-sm text-slate-300">
            <p>Volta à página de recuperação e pede um novo link de redefinição.</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" onClick={() => router.push('/forgot-password')}>
              Pedir novo link
            </Button>
            <p className="text-center text-sm text-slate-400">
              <Link href="/login" className="text-cyan-300 hover:underline">
                Voltar ao login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#000c12] px-4">
      <Card className="w-full max-w-md border border-white/10 bg-[#000c12] shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-cyan-300" />
              <span className="bg-gradient-to-r from-[#1d98a6] via-[#14718f] to-[#126e84] bg-clip-text text-2xl font-bold text-transparent tracking-[0.35em]">
                LEGACY
              </span>
            </div>
          </div>
          <CardTitle className="text-center text-2xl text-white">Definir nova palavra-passe</CardTitle>
          <CardDescription className="text-center text-slate-300">
            Escolhe uma nova palavra-passe segura para a tua conta.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-100">
                Nova palavra-passe *
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-100">
                Confirmar palavra-passe *
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repete a nova palavra-passe"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                required
              />
            </div>

            {status === 'error' && error && <p className="text-sm text-red-400">{error}</p>}

            {status === 'success' && (
              <p className="text-sm text-emerald-400">A tua palavra-passe foi atualizada. Já podes entrar.</p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? 'A guardar...' : 'Atualizar palavra-passe'}
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

