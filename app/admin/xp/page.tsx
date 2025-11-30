'use client';

import { useEffect, useState } from 'react';
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
  RefreshCcw,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

type XpSummary = {
  total_xp_awarded: number;
  total_users_with_xp: number;
  average_xp_per_user: number;
  top_earner?: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    xp_total: number;
  } | null;
};

type XpTransaction = {
  id: string;
  user_id: string;
  action: string;
  xp_earned: number;
  created_at: string;
};

type SimpleUser = {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
};

export default function XPManagementPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();

  const [recentTransactions, setRecentTransactions] = useState<XpTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [summary, setSummary] = useState<XpSummary | null>(null);
  const [users, setUsers] = useState<SimpleUser[]>([]);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [xpAmount, setXpAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [grantStatus, setGrantStatus] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);

  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // Proteção de rota
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
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

  // Carregar summary, history e users
  useEffect(() => {
    const fetchAll = async () => {
      if (
        !user ||
        (user.role !== 'Super Admin' && user.role !== 'Admin')
      ) {
        return;
      }

      setLoadingData(true);
      try {
        const token = getToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // Summary
        const summaryRes = await fetch('/api/xp/summary', {
          headers,
        });
        const summaryData = await summaryRes.json();
        if (summaryRes.ok && summaryData.success) {
          setSummary(summaryData.summary as XpSummary);
        } else {
          setSummary(null);
        }

        // History
        const historyRes = await fetch('/api/xp/history', {
          headers,
        });
        const historyData = await historyRes.json();
        if (historyRes.ok && historyData.success) {
          setRecentTransactions(
            (historyData.transactions || []).slice(0, 50),
          );
        } else {
          setRecentTransactions([]);
        }

        // Users para dropdown
        const usersRes = await fetch('/api/admin/users/list', {
          headers,
        });
        const usersData = await usersRes.json();
        if (usersRes.ok && usersData.success) {
          setUsers(usersData.users || []);
        } else {
          setUsers([]);
        }
      } catch (error) {
        console.error('Failed to fetch XP admin data:', error);
        setSummary(null);
        setRecentTransactions([]);
        setUsers([]);
      } finally {
        setLoadingData(false);
      }
    };

    if (
      user &&
      (user.role === 'Super Admin' || user.role === 'Admin')
    ) {
      fetchAll();
    }
  }, [user, getToken]);

  const handleGrantXp = async () => {
    setGrantStatus(null);
    setGrantError(null);

    if (!selectedUserId) {
      setGrantError('Seleciona um utilizador.');
      return;
    }

    if (!xpAmount) {
      setGrantError('Indica o valor de XP a atribuir.');
      return;
    }

    const amount = Number(xpAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      setGrantError('O valor de XP deve ser um número diferente de zero.');
      return;
    }

    setIsGranting(true);
    try {
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch('/api/admin/xp/grant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: selectedUserId,
          xpAmount: amount,
          reason,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao atribuir XP.');
      }

      setGrantStatus(
        `XP atualizado com sucesso. Novo total: ${data.newXpTotal} XP.`,
      );
      setXpAmount('');
      // Mantém reason para repetir facilmente, ou limpa se preferires:
      // setReason('');

      // Recarregar summary + history
      // Simples: forçar novo fetch através de repetir o efeito
      // mais simples é chamar novamente /api/xp/summary e /api/xp/history aqui:
      try {
        const token2 = getToken();
        const headers2: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token2 ? { Authorization: `Bearer ${token2}` } : {}),
        };

        const [summaryRes2, historyRes2] = await Promise.all([
          fetch('/api/xp/summary', { headers: headers2 }),
          fetch('/api/xp/history', { headers: headers2 }),
        ]);

        const summaryData2 = await summaryRes2.json();
        if (summaryRes2.ok && summaryData2.success) {
          setSummary(summaryData2.summary as XpSummary);
        }

        const historyData2 = await historyRes2.json();
        if (historyRes2.ok && historyData2.success) {
          setRecentTransactions(
            (historyData2.transactions || []).slice(0, 50),
          );
        }
      } catch (innerError) {
        console.error(
          'Failed to refresh summary/history after grant:',
          innerError,
        );
      }
    } catch (error: any) {
      console.error('Error granting XP:', error);
      setGrantError(
        error?.message || 'Ocorreu um erro ao atribuir XP.',
      );
    } finally {
      setIsGranting(false);
    }
  };

  const handleResetXp = async () => {
    setResetStatus(null);
    setResetError(null);

    // Exigimos o texto exato
    const requiredText = 'RESET-ALL-XP';

    if (resetConfirmInput.trim() !== requiredText) {
      setResetError(
        `Para confirmar o reset escreve exatamente: ${requiredText}`,
      );
      return;
    }

    setIsResetting(true);
    try {
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch('/api/admin/xp/reset', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          confirmText: resetConfirmInput.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao fazer reset.');
      }

      setResetStatus('XP de testes foi completamente reiniciado.');
      setResetConfirmInput('');

      // Depois de reset, também faz sentido limpar summary e history
      setSummary(null);
      setRecentTransactions([]);
    } catch (error: any) {
      console.error('Error resetting XP:', error);
      setResetError(
        error?.message || 'Ocorreu um erro ao fazer reset ao XP.',
      );
    } finally {
      setIsResetting(false);
    }
  };

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin')
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading...
          </p>
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
                Gerir XP global: atribuir manualmente, ver estatísticas
                e histórico, e resetar XP de testes.
              </p>
            </div>

            <div className="grid lg:grid-cols-[2fr,1.5fr] gap-6 mb-8">
              {/* Card: Atribuir XP manualmente */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" />
                    Award / Ajustar XP Manualmente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Utilizador
                      </label>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700"
                        value={selectedUserId}
                        onChange={(e) =>
                          setSelectedUserId(e.target.value)
                        }
                      >
                        <option value="">
                          Seleciona um utilizador...
                        </option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.username}
                            {u.full_name
                              ? ` — ${u.full_name}`
                              : ''}
                            {u.email ? ` (${u.email})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        XP (pode ser positivo ou negativo)
                      </label>
                      <Input
                        type="number"
                        placeholder="ex: 100 ou -50"
                        value={xpAmount}
                        onChange={(e) => setXpAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Motivo
                      </label>
                      <Input
                        placeholder="ex: Bónus manual, correção de XP, etc."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                    {grantError && (
                      <p className="text-sm text-red-600">
                        {grantError}
                      </p>
                    )}
                    {grantStatus && (
                      <p className="text-sm text-green-600">
                        {grantStatus}
                      </p>
                    )}
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleGrantXp}
                      disabled={isGranting}
                    >
                      {isGranting ? 'A atribuir XP...' : 'Award XP'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Card: Estatísticas + Reset */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      XP Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingData && !summary ? (
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          A carregar estatísticas...
                        </p>
                      </div>
                    ) : !summary ? (
                      <p className="text-sm text-gray-500">
                        Ainda não há estatísticas calculadas.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-gray-600 dark:text-gray-300">
                            Total XP Awarded
                          </span>
                          <span className="font-bold text-xl">
                            {summary.total_xp_awarded ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-gray-600 dark:text-gray-300">
                            Users with XP
                          </span>
                          <span className="font-bold text-xl">
                            {summary.total_users_with_xp ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-gray-600 dark:text-gray-300">
                            Avg XP per User
                          </span>
                          <span className="font-bold text-xl">
                            {Math.round(
                              summary.average_xp_per_user ?? 0,
                            )}
                          </span>
                        </div>
                        {summary.top_earner && (
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-300">
                              Top Earner
                            </span>
                            <span className="font-bold text-sm text-right">
                              {summary.top_earner.username ||
                                summary.top_earner.full_name ||
                                summary.top_earner.user_id.substring(
                                  0,
                                  8,
                                ) +
                                  '...'}
                              <span className="block text-xs text-gray-400">
                                {summary.top_earner.xp_total} XP
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <ShieldAlert className="h-5 w-5" />
                      Reset XP de Testes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      Esta ação apaga todas as transações de XP, completions
                      de lições/blog e volta a pôr o XP de todos os utilizadores
                      a zero. <strong>Apenas para fase de testes.</strong>
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      Para confirmar, escreve exatamente:{' '}
                      <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                        RESET-ALL-XP
                      </code>
                    </p>
                    <Input
                      placeholder="RESET-ALL-XP"
                      value={resetConfirmInput}
                      onChange={(e) =>
                        setResetConfirmInput(e.target.value)
                      }
                      className="mb-2"
                    />
                    {resetError && (
                      <p className="text-xs text-red-600 mb-2">
                        {resetError}
                      </p>
                    )}
                    {resetStatus && (
                      <p className="text-xs text-green-600 mb-2">
                        {resetStatus}
                      </p>
                    )}
                    <Button
                      variant="destructive"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={handleResetXp}
                      disabled={isResetting}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {isResetting
                        ? 'A fazer reset...'
                        : 'Reset XP de Testes'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Histórico */}
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
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
                            User ID:{' '}
                            {tx.user_id.substring(0, 8)}
                            ...
                            {' • '}
                            {new Date(
                              tx.created_at,
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={
                              'font-bold ' +
                              (tx.xp_earned >= 0
                                ? 'text-green-600'
                                : 'text-red-500')
                            }
                          >
                            {tx.xp_earned >= 0 ? '+' : ''}
                            {tx.xp_earned} XP
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
