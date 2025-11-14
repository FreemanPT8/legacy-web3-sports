'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

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
        setStatus('error');
        setError(data.error ?? 'Não foi possível enviar o email.');
        return;
      }

      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError('Erro inesperado. Tenta novamente mais tarde.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          Recuperar palavra-passe
        </h1>
        <p className="text-sm text-center text-gray-500">
          Introduz o email com que te registaste. Vamos enviar um link para definires
          uma nova palavra-passe.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
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

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-md bg-blue-600 text-white py-2 text-sm font-medium disabled:opacity-60"
          >
            {status === 'loading' ? 'A enviar...' : 'Enviar link de recuperação'}
          </button>
        </form>

        <div className="text-center text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
