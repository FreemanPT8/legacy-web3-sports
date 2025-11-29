'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Award,
  TrendingUp,
  Clock,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

export default function XPManagementPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estado para o reset global de XP
  const [confirmText, setConfirmText] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetResultMessage, setResetResultMessage] = useState<string | null>(
    null,
  );
  const [resetResultError, setResetResultError] = useState<string | null>(null);

  const REQUIRED_PHRASE = 'RESET ALL XP';

  const isFreeman =
    !!user && (user.username === 'freemanpt' || user.email === 'freemanpt');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (
      !loading &&
      user &&
      user.role !== 'Super Admin' &&
      user.role !== 'Admin'
    ) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/xp/history');
        const data = await response.json();
        if (data.success) {
          setRecentTransactions(data.transactions?.slice(0, 50) || []);
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      }
      setLoadingData(false);
    };

    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchTransactions();
    }
  }, [user]);

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    setResetResultMessage(null);
    setResetResultError(null);

    if (!isFreeman) {
      setResetResultError(
        'Esta ação está limitada ao utilizador freemanpt durante a fase de testes.',
      );
      return;
    }

    if (confirmText.trim() !== REQUIRED_PHRASE) {
      setResetResultError(
        `Para confirmar, escreve exatamente: ${REQUIRED_PHRASE}`,
      );
      return;
    }

    try {
      setSubmittingReset(true);

      const token = getToken();
      if (!token) {
        setResetResultError(
          'Sessão inválida. Faz login novamente e tenta outra vez.',
        );
        setSubmittingReset(false);
        return;
      }

      const res = await fetch('/api/admin/xp/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setResetResultError(
          data.error ||
            'Ocorreu um erro ao tentar fazer reset global do XP.',
        );
      } else {
        setResetResultMessage(
          'Reset global de XP concluído com sucesso para todos os utilizadores e criadores.',
        );
        setConfirmText('');
      }
    } catch (error) {
      console.error('Erro ao chamar /api/admin/xp/reset:', error);
      setResetResultError(
        'Erro inesperado ao comunicar com o servidor. Tenta novamente em alguns segundos.',
      );
    } finally {
      setSubmittingReset(false);
    }
  }

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin')
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <Link href="/admin">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                XP Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manually award or adjust user XP, view transaction history and
                usar ferramentas avançadas de reset (fase de testes)
              </p>
            </div>

            {/* Linha superior: Award XP + Stats */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" />
                    Award XP Manually
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        User ID
                      </label>
                      <Input placeholder="Enter user ID" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        XP Amount
                      </label>
                      <Input type="number" placeholder="e.g. 100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Reason
                      </label>
                      <Input placeholder="e.g. Manual bonus award" />
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Award XP
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    XP Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">
                        Total XP Awarded
                      </span>
                      <span className="font-bold text-xl">-</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">
                        Avg XP per User
                      </span>
                      <span className="font-bold text-xl">-</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">
                        Top Earner
                      </span>
                      <span className="font-bold text-xl">-</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cartão de Reset Global de XP (apenas freemanpt) */}
            <Card className="mb-8 border-red-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  Global XP Reset (testing only)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      Esta ação:
                    </p>
                    <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1">
                      <li>Remove todo o histórico de XP (lições, blog, etc.)</li>
                      <li>Coloca o XP total de todos os utilizadores a 0</li>
                      <li>
                        Deve ser usada apenas na fase de testes para limpar o
                        Legacy antes de um novo ciclo
                      </li>
                    </ul>
                    <p className="mt-2 text-xs text-red-700 font-semibold">
                      Operação destrutiva e irreversível.
                    </p>
                  </div>

                  {!isFreeman && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Apenas o utilizador <strong>freemanpt</strong> pode
                      executar este reset global de XP.
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Passo de confirmação
                    </label>
                    <p className="text-xs text-gray-500 mb-1">
                      Para confirmar que não estás a clicar por engano, escreve
                      exatamente a frase abaixo:
                    </p>
                    <div className="rounded-md bg-gray-100 dark:bg-gray-900 px-3 py-2 text-xs font-mono text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
                      {REQUIRED_PHRASE}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="confirm-reset"
                      className="text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Escreve a frase exata para prosseguir
                    </label>
                    <Input
                      id="confirm-reset"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Escreve aqui a frase de confirmação..."
                      disabled={submittingReset || !isFreeman}
                    />
                  </div>

                  {resetResultError && (
                    <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
                      {resetResultError}
                    </div>
                  )}

                  {resetResultMessage && (
                    <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-800">
                      {resetResultMessage}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-gray-500 max-w-xs">
                      Esta ferramenta será removida quando o Legacy sair da fase
                      de testes públicos.
                    </p>

                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={submittingReset || !isFreeman}
                      className="flex items-center gap-2"
                    >
                      {submittingReset && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {submittingReset
                        ? 'A fazer reset...'
                        : 'Executar reset global de XP'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Histórico de transações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Recent XP Transactions ({recentTransactions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      Loading transactions...
                    </p>
                  </div>
                ) : recentTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-300">
                      No transactions yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{tx.action}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            User ID: {tx.user_id.substring(0, 8)}... •{' '}
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            +{tx.xp_earned} XP
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
