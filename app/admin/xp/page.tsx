'use client';

import { useEffect, useState, FormEvent } from 'react';
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
  Award,
  TrendingUp,
  Clock,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { UserSelect } from '@/components/admin/UserSelect';

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

  // Award XP
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [awardAmount, setAwardAmount] = useState('');
  const [awardReason, setAwardReason] = useState('');

  const [awardLoading, setAwardLoading] = useState(false);
  const [awardSuccess, setAwardSuccess] = useState<string | null>(null);
  const [awardError, setAwardError] = useState<string | null>(null);

  // XP summary
  const [xpSummary, setXpSummary] = useState<XPSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // XP history
  const [historyLimit, setHistoryLimit] = useState(20);
  const [history, setHistory] = useState<XPHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Reset XP
  const REQUIRED_PHRASE = 'RESET ALL XP';
  const [confirmText, setConfirmText] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const isFreeman =
    !!user && (user.username === 'freemanpt' || user.email === 'freemanpt');

  // Access control
  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Load XP summary on page load
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'Super Admin' && user.role !== 'Admin') return;

    async function loadSummary() {
      try {
        const token = getToken();
        const res = await fetch('/api/xp/summary', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        const data = await res.json();
        if (res.ok && data.success) setXpSummary(data.summary);
      } catch (err) {
        console.error('Failed to load summary:', err);
      } finally {
        setLoadingSummary(false);
      }
    }

    loadSummary();
  }, [user]);

  // Load history for a selected user
  async function loadHistory(userId?: string) {
    const uid = userId || selectedUserId;
    if (!uid) {
      setHistory([]);
      return;
    }

    setLoadingHistory(true);

    try {
      const params = new URLSearchParams({
        userId: uid,
        limit: String(historyLimit),
      });

      const res = await fetch(`/api/xp/history?${params}`);
      const data = await res.json();

      if (res.ok && data.success) setHistory(data.history);
      else setHistory([]);
    } catch (err) {
      console.error('History error:', err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  // Manual Award XP
  async function handleAwardXP(e: FormEvent) {
    e.preventDefault();
    setAwardError(null);
    setAwardSuccess(null);

    if (!selectedUserId) {
      setAwardError('Seleciona um utilizador.');
      return;
    }

    if (selectedUserId === user?.id) {
      setAwardError('Não podes atribuir XP a ti próprio.');
      return;
    }

    if (!awardAmount || Number(awardAmount) <= 0) {
      setAwardError('Define um valor válido de XP.');
      return;
    }

    if (!awardReason.trim()) {
      setAwardError('Define uma razão.');
      return;
    }

    setAwardLoading(true);

    try {
      const res = await fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
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
        setAwardSuccess(`Atribuído ${awardAmount} XP.`);
        setAwardAmount('');
        setAwardReason('');

        loadHistory(selectedUserId);

        // Refresh summary
        const token = getToken();
        const sRes = await fetch('/api/xp/summary', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        const sData = await sRes.json();
        if (sRes.ok && sData.success) setXpSummary(sData.summary);
      }
    } catch (err) {
      setAwardError('Erro inesperado.');
    } finally {
      setAwardLoading(false);
    }
  }

  // Global reset
  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    if (!isFreeman) {
      setResetError('Apenas freemanpt pode usar esta ferramenta.');
      return;
    }

    if (confirmText !== REQUIRED_PHRASE) {
      setResetError(`Escreve exatamente: ${REQUIRED_PHRASE}`);
      return;
    }

    setResetLoading(true);

    try {
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
        setResetError(data.error || 'Erro ao resetar XP.');
      } else {
        setResetSuccess('XP global resetado com sucesso.');
        setHistory([]);
        setXpSummary({
          total_xp: 0,
          avg_xp_per_user: 0,
          top_user: null,
        });
      }
    } catch {
      setResetError('Erro inesperado.');
    } finally {
      setResetLoading(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950">
        <div className="flex min-h-[calc(100vh-120px)]">

          {/* Sidebar */}
          <AdminSidebar />

          {/* Content */}
          <div className="flex-1 p-6 md:p-10 space-y-12">

            {/* HEADER */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                XP Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Estatísticas, histórico e atribuição manual de XP.
              </p>
            </div>

            {/* AWARD XP */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  Award XP Manually
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                <UserSelect
                  label="Selecionar utilizador"
                  value={selectedUserId}
                  onChange={(v) => {
                    setSelectedUserId(v);
                    loadHistory(v);
                  }}
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
                  onClick={handleAwardXP}
                >
                  {awardLoading && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Award XP
                </Button>
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
                {loadingSummary ? (
                  <p>A carregar...</p>
                ) : (
                  <div className="space-y-3">
                    <p>Total XP: <strong>{xpSummary?.total_xp ?? '-'}</strong></p>
                    <p>Avg per User: <strong>{xpSummary?.avg_xp_per_user ?? '-'}</strong></p>

                    {xpSummary?.top_user && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUserId(xpSummary.top_user!.id);
                          loadHistory(xpSummary.top_user!.id);
                        }}
                      >
                        Ver histórico do top user
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* XP HISTORY */}
            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2 items-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                  XP History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="flex gap-4">
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={historyLimit}
                    onChange={(e) => setHistoryLimit(Number(e.target.value))}
                  />
                  <Button onClick={() => loadHistory()}>
                    Recarregar
                  </Button>
                </div>

                {loadingHistory ? (
                  <p>A carregar histórico...</p>
                ) : history.length === 0 ? (
                  <p className="text-gray-500">Sem histórico.</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((tx) => (
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
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  Global XP Reset
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleReset} className="space-y-4">

                  <Input
                    placeholder="Escreve: RESET ALL XP"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />

                  {resetError && (
                    <p className="text-sm text-red-600">{resetError}</p>
                  )}

                  {resetSuccess && (
                    <p className="text-sm text-green-600">{resetSuccess}</p>
                  )}

                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={!isFreeman || resetLoading}
                  >
                    {resetLoading && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
