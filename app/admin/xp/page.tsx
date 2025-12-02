// app/admin/xp/page.tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
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
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/admin/UserSelect';

type XpSummary = {
  total_xp: number;
  avg_xp_per_user: number;
  top_user: string | null;
};

type XpHistoryItem = {
  id: string;
  action: string;
  xp_earned: number;
  created_at: string;
};

export default function XPManagementPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [awardAmount, setAwardAmount] = useState<string>('');
  const [awardReason, setAwardReason] = useState<string>('');
  const [awardLoading, setAwardLoading] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);
  const [awardSuccess, setAwardSuccess] = useState<string | null>(null);

  const [history, setHistory] = useState<XpHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [xpSummary, setXpSummary] = useState<XpSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'Super Admin';

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoadingSummary(true);
      try {
        const token = getToken();
        const res = await fetch('/api/admin/xp/summary', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setXpSummary(null);
        } else {
          setXpSummary({
            total_xp: data.summary?.total_xp ?? 0,
            avg_xp_per_user: data.summary?.avg_xp_per_user ?? 0,
            top_user: data.summary?.top_user ?? null,
          });
        }
      } catch (err) {
        console.error('Error fetching XP summary:', err);
        setXpSummary(null);
      } finally {
        setLoadingSummary(false);
      }
    };

    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchSummary();
    }
  }, [user, getToken]);

  const loadHistory = async (userId?: string) => {
    if (!userId) {
      setHistory([]);
      return;
    }
    try {
      setHistoryLoading(true);
      const token = getToken();
      const res = await fetch(`/api/admin/xp/history?userId=${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setHistory([]);
      } else {
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error loading XP history:', err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  async function handleAwardXP(e?: FormEvent) {
    e?.preventDefault();
    setAwardError(null);
    setAwardSuccess(null);

    if (!selectedUserId) {
      setAwardError('Seleciona um utilizador.');
      return;
    }

    const amount = Number(awardAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setAwardError('Valor de XP inválido.');
      return;
    }

    if (!awardReason.trim()) {
      setAwardError('Indica uma razão.');
      return;
    }

    try {
      setAwardLoading(true);
      const token = getToken();
      const res = await fetch('/api/admin/xp/award', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: selectedUserId,
          amount,
          reason: awardReason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAwardError(data.error || 'Erro ao atribuir XP.');
        return;
      }

      setAwardSuccess('XP atribuído com sucesso.');
      setAwardAmount('');
      setAwardReason('');
      loadHistory(selectedUserId);
      // refresca resumo
      setXpSummary((prev) =>
        prev
          ? {
              ...prev,
              total_xp: (prev.total_xp ?? 0) + amount,
              avg_xp_per_user: prev.avg_xp_per_user, // sem recálculo aqui
            }
          : prev,
      );
    } catch (err) {
      setAwardError('Erro inesperado.');
    } finally {
      setAwardLoading(false);
    }
  }

  async function handleResetXP() {
    if (!isSuperAdmin) {
      setResetError('Apenas Super Admin pode resetar XP.');
      return;
    }

    const confirmed = window.confirm(
      'Tem a certeza que quer resetar o XP de todos os utilizadores?',
    );
    if (!confirmed) return;

    try {
      setResetLoading(true);
      setResetError(null);
      setResetSuccess(null);

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
    <div className="space-y-12">
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
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total XP</p>
                <p className="text-2xl font-bold">
                  {xpSummary?.total_xp ?? 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average per user</p>
                <p className="text-2xl font-bold">
                  {xpSummary?.avg_xp_per_user?.toFixed(2) ?? '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Top user</p>
                <p className="text-2xl font-bold">
                  {xpSummary?.top_user || '-'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* XP HISTORY */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            XP History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center mb-4">
            <UserSelect
              label="Filtrar histórico por utilizador"
              value={selectedUserId}
              onChange={(v) => {
                setSelectedUserId(v);
                loadHistory(v);
              }}
            />
            <Button variant="outline" onClick={() => loadHistory(selectedUserId)}>
              Refresh
            </Button>
          </div>

          {historyLoading ? (
            <p>A carregar histórico...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">
              Sem transações de XP para este utilizador.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{item.action}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600">
                    +{item.xp_earned} XP
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RESET XP GLOBAL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            Global XP Reset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Esta operação zera o XP de todos os utilizadores. Só Super Admin
            pode executar.
          </p>
          {resetError && (
            <p className="text-sm text-red-600">{resetError}</p>
          )}
          {resetSuccess && (
            <p className="text-sm text-green-600">{resetSuccess}</p>
          )}
          <Button
            variant="destructive"
            disabled={resetLoading || !isSuperAdmin}
            onClick={handleResetXP}
          >
            {resetLoading && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            Reset global XP
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
