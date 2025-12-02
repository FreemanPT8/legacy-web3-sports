'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  Award,
  TrendingUp,
  Clock,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import { AdminSidebar } from '@/components/admin/AdminSidebar';

type XPSummary = {
  total_xp: number;
  avg_xp_per_user: number;
  top_user: {
    id: string;
    username: string | null;
    xp_total: number;
  } | null;
};

type XPHistoryItem = {
  id: string;
  action: string;
  xp_earned: number;
  created_at: string;
};

export default function XPManagementPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();

  const [recentTransactions, setRecentTransactions] = useState<XPHistoryItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [historyUserId, setHistoryUserId] = useState('');
  const [historyLimit, setHistoryLimit] = useState(20);

  const [awardUserId, setAwardUserId] = useState('');
  const [awardAmount, setAwardAmount] = useState('');
  const [awardReason, setAwardReason] = useState('');

  const [awardLoading, setAwardLoading] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);
  const [awardSuccess, setAwardSuccess] = useState<string | null>(null);

  const [confirmText, setConfirmText] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetResultMessage, setResetResultMessage] = useState<string | null>(null);
  const [resetResultError, setResetResultError] = useState<string | null>(null);

  const [xpSummary, setXpSummary] = useState<XPSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const REQUIRED_PHRASE = 'RESET ALL XP';

  const isFreeman =
    !!user && (user.username === 'freemanpt' || user.email === 'freemanpt');

  // Redirect if not allowed
  useEffect(() => {
    if (!loading && !user) router.push('/login');

    if (
      !loading &&
      user &&
      user.role !== 'Super Admin' &&
      user.role !== 'Admin'
    ) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Load summary + history
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'Super Admin' && user.role !== 'Admin') return;

    const load = async () => {
      try {
        const token = getToken();

        if (token) {
          const summaryRes = await fetch('/api/xp/summary', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          const summaryData = await summaryRes.json();

          if (summaryRes.ok && summaryData.success) {
            setXpSummary(summaryData.summary as XPSummary);
          }
        }

        if (xpSummary?.top_user?.id) {
          await loadHistory(xpSummary.top_user.id);
        }
      } catch (err) {
        console.error('Erro ao carregar XP summary / history:', err);
      } finally {
        setLoadingSummary(false);
        setLoadingData(false);
      }
    };

    load();
  }, [user]);

  // Load history for a user
  async function loadHistory(forUser?: string) {
    const uid = (forUser || historyUserId || '').trim();
    if (!uid) {
      setRecentTransactions([]);
      return;
    }

    setLoadingData(true);

    try {
      const params = new URLSearchParams({
        userId: uid,
        limit: String(historyLimit),
      });

      const res = await fetch(`/api/xp/history?${params}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setRecentTransactions(data.history as XPHistoryItem[]);
      } else {
        setRecentTransactions([]);
        console.error('Histórico falhou:', data.error);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      setRecentTransactions([]);
    } finally {
      setLoadingData(false);
    }
  }

  // Handle Award XP manual
  async function handleAwardXP(e: FormEvent) {
    e.preventDefault();
    setAwardLoading(true);
    setAwardError(null);
    setAwardSuccess(null);

    if (!awardUserId || !awardAmount || !awardReason) {
      setAwardError('Preenche todos os campos.');
      setAwardLoading(false);
      return;
    }

    const token = getToken();
    if (!token) {
      setAwardError('Token inválido. Faz login novamente.');
      setAwardLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/xp/award', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: awardUserId,
          xpAmount: Number(awardAmount),
          action: awardReason,
          referenceId: null,
          referenceType: 'manual_award',
          actionType: null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAwardError(data.error || 'Erro ao atribuir XP.');
      } else {
        setAwardSuccess(`Atribuído ${awardAmount} XP a ${awardUserId}.`);
        setAwardUserId('');
        setAwardAmount('');
        setAwardReason('');

        await loadHistory(awardUserId);

        const summaryRes = await fetch('/api/xp/summary', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const summaryData = await summaryRes.json();
        if (summaryRes.ok && summaryData.success) {
          setXpSummary(summaryData.summary);
        }
      }
    } catch (err) {
      setAwardError('Erro inesperado ao atribuir XP.');
    } finally {
      setAwardLoading(false);
    }
  }

  // Reset XP
  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    setResetResultMessage(null);
    setResetResultError(null);

    if (!isFreeman) {
      setResetResultError('Apenas freemanpt pode fazer reset global.');
      return;
    }

    if (confirmText.trim() !== REQUIRED_PHRASE) {
      setResetResultError(`Escreve exatamente: ${REQUIRED_PHRASE}`);
      return;
    }

    try {
      setSubmittingReset(true);
      const token = getToken();

      const res = await fetch('/api/admin/xp/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setResetResultError(data.error || 'Erro ao resetar XP.');
      } else {
        setResetResultMessage('XP global resetado com sucesso.');
        setRecentTransactions([]);
        setXpSummary({
          total_xp: 0,
          avg_xp_per_user: 0,
          top_user: null,
        });
      }
    } catch {
      setResetResultError('Erro inesperado.');
    } finally {
      setSubmittingReset(false);
    }
  }

  // Loading state
  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin')
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950">
        <div className="flex min-h-[calc(100vh-120px)]">
          <AdminSidebar />

          <div className="flex-1 p-6 md:p-10 space-y-12">

            {/* TITLE */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">XP Management</h1>
              <p className="text-gray-600 dark:text-gray-300">
                Estatísticas, histórico e atribuição manual de XP.
              </p>
            </div>

            {/* AWARD XP */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" /> Award XP Manually
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAwardXP} className="space-y-4">
                  <Input
                    placeholder="User ID"
                    value={awardUserId}
                    onChange={(e) => setAwardUserId(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="XP Amount"
                    value={awardAmount}
                    onChange={(e) => setAwardAmount(e.target.value)}
                  />
                  <Input
                    placeholder="Reason"
                    value={awardReason}
                    onChange={(e) => setAwardReason(e.target.value)}
                  />

                  {awardError && (
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <XCircle className="h-4 w-4" /> {awardError}
                    </p>
                  )}

                  {awardSuccess && (
                    <p className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> {awardSuccess}
                    </p>
                  )}

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={awardLoading}
                    type="submit"
                  >
                    {awardLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Award XP
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* XP SUMMARY */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  XP Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p>Total XP: <strong>{xpSummary?.total_xp ?? '-'}</strong></p>
                  <p>Avg per User: <strong>{xpSummary?.avg_xp_per_user ?? '-'}</strong></p>

                  {xpSummary?.top_user && (
                    <div className="flex items-center gap-4 mt-4">
                      <div>
                        <p className="font-semibold">{xpSummary.top_user.username}</p>
                        <p className="text-xs text-gray-500">{xpSummary.top_user.xp_total} XP</p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setHistoryUserId(xpSummary.top_user!.id);
                          loadHistory(xpSummary.top_user!.id);
                        }}
                      >
                        Ver histórico
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* HISTORY */}
            <Card>
              <CardHeader>
                <CardTitle>XP History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="flex flex-col md:flex-row gap-4">
                  <Input
                    placeholder="User ID"
                    value={historyUserId}
                    onChange={(e) => setHistoryUserId(e.target.value)}
                  />
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={historyLimit}
                    onChange={(e) => setHistoryLimit(Number(e.target.value))}
                  />
                  <Button onClick={() => loadHistory()}>Carregar histórico</Button>
                </div>

                {loadingData ? (
                  <p className="text-gray-500">A carregar...</p>
                ) : recentTransactions.length === 0 ? (
                  <p className="text-gray-500">Sem histórico.</p>
                ) : (
                  <div className="space-y-2">
                    {recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 flex justify-between"
                      >
                        <div>
                          <p className="font-medium">{tx.action}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="font-bold text-green-600">
                          +{tx.xp_earned} XP
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* RESET XP */}
            <Card className="border-red-300">
              <CardHeader>
                <CardTitle className="flex gap-2 items-center">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  Global XP Reset
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetSubmit} className="space-y-4">

                  <Input
                    placeholder="Escreve: RESET ALL XP"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />

                  {resetResultError && (
                    <p className="text-red-600 text-sm">{resetResultError}</p>
                  )}
                  {resetResultMessage && (
                    <p className="text-green-600 text-sm">{resetResultMessage}</p>
                  )}

                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={!isFreeman || submittingReset}
                    className="flex gap-2"
                  >
                    {submittingReset && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Executar reset global
                  </Button>
                </form>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
