'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Trophy } from 'lucide-react';

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
            Recuperar palavra-passe
          </CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-300">
            Introduz o email com que te registaste. Vamos enviar um link para definires
            uma nova palavra-passe.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Label className="block text-sm font-medium mb-1" htmlFor="email">
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

            {status === 'error' && error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {status === 'success' && (
              <p className="text-sm text-green-600">
                Se esse email estiver registado, enviámos um link de recuperação.
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'A enviar...' : 'Enviar link de recuperação'}
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
