'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Award,
  TrendingUp,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

type XpSummary = {
  total_xp_awarded: number;
  unique_users_with_xp: number;
  top_user?: {
    id: string;
    username: string;
    xp_total: number;
  } | null;
};

export default function XPManagementPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();

  const [recentTransactions, setRecentTransactions] = useState<any[]>(
    [],
  );
  const [loadingData, setLoadingData] =
    useState<boolean>(true);

  const [summary, setSummary] = useState<XpSummary | null>(
    null,
  );
  const [summaryLoading, setSummaryLoading] =
    useState<boolean>(true);

  // Form award manual
  const [targetUserId, setTargetUserId] = useState('');
  const [xpAmount, setXpAmount] = useState('');
  const [reason, setReason] = useState('');
  const [awardLoading, setAwardLoading] =
    useState<boolean>(false);
  const [awardError, setAwardError] = useState<string | null>(
    null,
  );
  const [awardSuccess, setAwardSuccess] =
    useState<string | null>(null);

  // Reset XP (função já criada anteriormente)
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetLoading, setResetLoading] =
    useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(
    null,
  );
  const [resetSuccess, setResetSuccess] =
    useState<string | null>(null);

  // Guardar role/redirect
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

  // Função para carregar transações
  const loadTransactions = useCallback(async () => {
    try {
      const response = await fetch('/api/xp/history');
      const data = await response.json();
      if (data.success) {
        setRecentTransactions(
          data.transactions?.slice(0, 50) || [],
        );
      }
    } catch (error) {
      console.error(
        'Failed to fetch transactions:',
        error,
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Função para carregar summary
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch('/api/xp/summary');
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary || null);
      } else {
        setSummary(null);
      }
    } catch (error) {
      console.error('Failed to fetch XP summary:', error);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Efeitos para carregar dados
  useEffect(() => {
    if (
      user &&
      (user.role === 'Super Admin' || user.role === 'Admin')
    ) {
      loadTransactions();
      loadSummary();
    }
  }, [user, loadTransactions, loadSummary]);

  // Handler para award manual de XP
  const handleAwardXp = async () => {
    setAwardError(null);
    setAwardSuccess(null);

    const trimmedUserId = targetUserId.trim();
    const xpNum = Number(xpAmount);

    if (!trimmedUserId) {
      setAwardError('Tens de indicar o ID do utilizador.');
      return;
    }
    if (!Number.isFinite(xpNum) || xpNum === 0) {
      setAwardError(
        'O valor de XP deve ser um número diferente de zero.',
      );
      return;
    }

    try {
      setAwardLoading(true);
      const token = getToken();
      const res = await fetch('/api/admin/xp/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        body: JSON.stringify({
          userId: trimmedUserId,
          xpAmount: xpNum,
          reason:
            reason.trim() ||
            'Manual XP grant (admin)',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAwardError(
          data.error ||
            'Não foi possível atribuir XP.',
        );
        return;
      }

      setAwardSuccess(
        `XP atribuído com sucesso: ${xpNum} XP ao utilizador ${trimmedUserId}.`,
      );
      setTargetUserId('');
      setXpAmount('');
      setReason('');

      // Recarregar summary e histórico
      loadSummary();
      setLoadingData(true);
      await loadTransactions();
    } catch (error) {
      console.error('Error awarding XP manually:', error);
      setAwardError(
        'Erro inesperado ao atribuir XP.',
      );
    } finally {
      setAwardLoading(false);
    }
  };

  // Handler de reset (usa o endpoint /api/admin/xp/reset já existente)
  const handleResetXp = async () => {
    setResetError(null);
    setResetSuccess(null);

    if (!user || user.username !== 'freemanpt') {
      setResetError(
        'Apenas o utilizador freemanpt pode efetuar este reset.',
      );
      return;
    }

    if (resetConfirm.trim() !== 'RESET XP TESTS') {
      setResetError(
        'Tens de escrever exatamente "RESET XP TESTS" para confirmar.',
      );
      return;
    }

    try {
      setResetLoading(true);
      const token = getToken();
      const res = await fetch('/api/admin/xp/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setResetError(
          data.error ||
            'Não foi possível fazer o reset do XP.',
        );
        return;
      }

      setResetSuccess(
        'XP global de testes foi reiniciado com sucesso.',
      );
      setResetConfirm('');

      // Recarregar summary e histórico
      loadSummary();
      setLoadingData(true);
      await loadTransactions();
    } catch (error) {
      console.error('Error resetting XP:', error);
      setResetError(
        'Erro inesperado ao fazer reset do XP.',
      );
    } finally {
      setResetLoading(false);
    }
  };

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' &&
      user.role !== 'Admin')
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const isFreeman =
    user.username === 'freemanpt';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <Link href="/admin">
                <Button
                  variant="ghost"
                  className="mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                XP Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Gestão central de XP: atribuição
                manual, estatísticas e histórico.
              </p>
            </div>

            {/* TOP GRID */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Award manual */}
              <Card className="md:col-span-2">
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
                      <Input
                        placeholder="Cola aqui o ID do utilizador"
                        value={targetUserId}
                        onChange={(e) =>
                          setTargetUserId(
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          XP Amount
                        </label>
                        <Input
                          type="number"
                          placeholder="ex: 100"
                          value={xpAmount}
                          onChange={(e) =>
                            setXpAmount(
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Reason
                        </label>
                        <Input
                          placeholder="ex: Bónus manual de admin"
                          value={reason}
                          onChange={(e) =>
                            setReason(
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>

                    {awardError && (
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {awardError}
                      </p>
                    )}
                    {awardSuccess && (
                      <p className="text-sm text-green-700">
                        {awardSuccess}
                      </p>
                    )}

                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleAwardXp}
                      disabled={awardLoading}
                    >
                      {awardLoading
                        ? 'A atribuir XP...'
                        : 'Award XP'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* XP Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    XP Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summaryLoading ? (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        A carregar estatísticas...
                      </p>
                    </div>
                  ) : !summary ? (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Não foi possível carregar as
                      estatísticas de XP.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-300">
                          Total XP Awarded
                        </span>
                        <span className="font-bold text-xl">
                          {summary.total_xp_awarded}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-300">
                          Users with XP
                        </span>
                        <span className="font-bold text-xl">
                          {
                            summary.unique_users_with_xp
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-300">
                          Top Earner
                        </span>
                        <span className="font-bold text-sm text-right">
                          {summary.top_user ? (
                            <>
                              {
                                summary.top_user
                                  .username
                              }
                              <span className="block text-xs text-gray-500">
                                {
                                  summary.top_user
                                    .xp_total
                                }{' '}
                                XP
                              </span>
                            </>
                          ) : (
                            '-'
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Reset XP global (apenas freemanpt, fase testes) */}
            <Card className="mb-8 border-red-300 bg-red-50 dark:bg-red-950/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <ShieldAlert className="h-5 w-5" />
                  Reset XP de Testes (Global)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                  Esta ação apaga todos os registos de XP
                  (lições, blog, transações, limites
                  diários) e repõe o XP total de todos os
                  utilizadores para 0. **Apenas para fase
                  de testes.**
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                  Só o utilizador{' '}
                  <strong>freemanpt</strong> pode usar
                  este botão. Para confirmar, escreve
                  exatamente:{' '}
                  <code className="px-1 py-0.5 bg-red-100 dark:bg-red-900 rounded">
                    RESET XP TESTS
                  </code>
                </p>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <Input
                    placeholder="RESET XP TESTS"
                    value={resetConfirm}
                    onChange={(e) =>
                      setResetConfirm(e.target.value)
                    }
                    className="sm:max-w-xs"
                  />
                  <Button
                    variant="destructive"
                    onClick={handleResetXp}
                    disabled={
                      resetLoading ||
                      !isFreeman
                    }
                  >
                    {resetLoading
                      ? 'A fazer reset...'
                      : 'Reset XP de Testes'}
                  </Button>
                </div>

                {resetError && (
                  <p className="mt-2 text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {resetError}
                  </p>
                )}
                {resetSuccess && (
                  <p className="mt-2 text-sm text-green-700">
                    {resetSuccess}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Histórico de transações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Recent XP Transactions (
                  {recentTransactions.length})
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
                          <p className="font-medium">
                            {tx.action}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            User ID:{' '}
                            {tx.user_id
                              ? `${tx.user_id.substring(
                                  0,
                                  8,
                                )}...`
                              : '—'}{' '}
                            •{' '}
                            {new Date(
                              tx.created_at,
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {tx.xp_earned > 0
                              ? `+${tx.xp_earned} XP`
                              : `${tx.xp_earned} XP`}
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
