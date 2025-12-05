'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Trophy } from 'lucide-react';

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
      const msg = 'As passwords não coincidem. Verifica e tenta novamente.';
      setError(msg);
      setStatus('error');

      toast({
        title: 'Erro na password',
        description: msg,
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      const msg = 'A password deve ter pelo menos 6 caracteres.';
      setError(msg);
      setStatus('error');

      toast({
        title: 'Password demasiado curta',
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
          title: 'Erro ao redefinir password',
          description: msg,
          variant: 'destructive',
        });

        return;
      }

      setStatus('success');

      toast({
        title: 'Password atualizada',
        description: 'A tua palavra-passe foi redefinida com sucesso. Já podes entrar.',
      });

      // pequena pausa opcional: aqui podemos redirecionar logo
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

  // Caso não exista token na URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-950 dark:to-gray-900 px-4">
        <Card className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="flex items-center space-x-2">
                <Trophy className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  LEGACY
                </span>
              </div>
            </div>
            <CardTitle className="text-2xl text-center">
              Link inválido ou expirado
            </CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300">
              O link de redefinição de palavra-passe é inválido, está em falta ou já expirou.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-center text-gray-600 dark:text-gray-300">
            <p>
              Volta à página de recuperação e pede um novo link de redefinição.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => router.push('/forgot-password')}
            >
              Pedir novo link
            </Button>
            <p className="text-sm text-center text-gray-600 dark:text-gray-300">
              <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                Voltar ao login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Fluxo normal com token válido
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-950 dark:to-gray-900 px-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                LEGACY
              </span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            Definir nova palavra-passe
          </CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-300">
            Escolhe uma nova palavra-passe segura para a tua conta.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova palavra-passe *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar palavra-passe *</Label>
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

            {status === 'error' && error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {status === 'success' && (
              <p className="text-sm text-green-600">
                A tua palavra-passe foi atualizada. Já podes entrar.
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'A guardar...' : 'Atualizar palavra-passe'}
            </Button>

            <p className="text-sm text-center text-gray-600 dark:text-gray-300">
              <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                Voltar ao login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
