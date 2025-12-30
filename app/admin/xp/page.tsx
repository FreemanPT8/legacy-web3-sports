'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Loader2,
  Sparkles,
  Award,
  Zap,
  BookOpen,
  RefreshCcw,
} from 'lucide-react';
import { UserSelect } from '@/components/admin/UserSelect';
import { useToast } from '@/hooks/use-toast';

type AdminStatsSummary = {
  courses?: {
    activeCourses?: number;
    totalCourses?: number;
    xp?: {
      allActions?: {
        total?: number;
        last24h?: number;
        last30d?: number;
      };
    };
  };
  blog?: {
    totalPosts?: number;
  };
  onboarding?: {
    pendingTotal?: number;
  };
};

type RewardConfig = {
  action_type: string;
  label: string;
  description: string;
  min_xp: number;
  max_xp: number;
  creator_bonus_pct?: number | null;
};

type LimitConfig = {
  action_type: string;
  xp_earned: number;
  count: number;
};

type ThresholdConfig = {
  id: string;
  xp_total: number;
  feature_name: string;
  description: string;
};

const MetricCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-white/10 bg-[#04131b] p-4 shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
    <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">{label}</p>
    <p className="mt-2 text-3xl font-semibold text-[#fdd87c]">
      {value.toLocaleString('pt-PT')}
    </p>
  </div>
);

const INPUT_STYLES =
  'bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] border-white/10 text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-cyan-300 focus-visible:ring-offset-0';

const getInputClass = (extra?: string) =>
  extra ? `${INPUT_STYLES} ${extra}` : INPUT_STYLES;

export default function AdminXpPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<AdminStatsSummary | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [xpConfig, setXpConfig] = useState<{
    rewards: RewardConfig[];
    limits: LimitConfig[];
    thresholds: ThresholdConfig[];
  } | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [xpValue, setXpValue] = useState('');
  const [xpAction, setXpAction] = useState<'add' | 'remove'>('add');
  const [reason, setReason] = useState('');
  const [submittingXP, setSubmittingXP] = useState(false);
  const [resettingXP, setResettingXP] = useState(false);

  const isAdmin =
    !!user && (user.role === 'Admin' || user.role === 'Super Admin');
  const isSuperAdminFreeman =
    user?.role === 'Super Admin' && user?.username === 'freemanpt';

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [loading, user, router, isAdmin]);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    try {
      setLoadingStats(true);
      setStatsError(null);
      const response = await fetch('/api/admin/stats', { headers });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setStatsError(data.error || 'Falha ao carregar métricas de XP');
        setStats(null);
        return;
      }
      setStats(data.stats as AdminStatsSummary);
    } catch (error) {
      console.error('Error loading XP stats:', error);
      setStatsError('Falha ao carregar métricas de XP');
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [getToken, isAdmin]);

  const fetchXpConfig = useCallback(async () => {
    if (!isAdmin) return;
    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    try {
      const response = await fetch('/api/admin/xp', { headers });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setConfigError(data.error || 'Falha ao carregar regras de XP');
        setXpConfig(null);
        return;
      }
      setXpConfig({
        rewards: data.rewards || [],
        limits: data.limits || [],
        thresholds: data.thresholds || [],
      });
      setConfigError(null);
    } catch (err) {
      console.error('Error loading xp config', err);
      setConfigError('Falha ao carregar regras de XP');
      setXpConfig(null);
    }
  }, [getToken, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchXpConfig();
    }
  }, [isAdmin, fetchStats, fetchXpConfig]);

  const normalizedAmount = useMemo(() => {
    const numeric = Number(xpValue);
    if (!Number.isFinite(numeric) || numeric === 0) return null;
    return Math.abs(Math.trunc(numeric));
  }, [xpValue]);

  const handleXpAdjustment = async () => {
    if (!selectedUserId || !normalizedAmount || submittingXP) return;
    setSubmittingXP(true);
    try {
      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const amount = xpAction === 'add' ? normalizedAmount : -normalizedAmount;
      const response = await fetch('/api/admin/xp/grant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: selectedUserId,
          xpAmount: amount,
          reason: reason || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Falha ao ajustar XP.');
      }
      toast({
        title: 'XP atualizado',
        description: payload.message || 'XP atualizado com sucesso.',
      });
      setXpValue('');
      setReason('');
      setXpAction('add');
      fetchStats();
    } catch (err: any) {
      console.error('XP adjustment error', err);
      toast({
        title: 'Erro',
        description: err?.message || 'Não foi possível atualizar o XP.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingXP(false);
    }
  };

  const handleResetXP = async () => {
    if (!isSuperAdminFreeman || resettingXP) return;
    if (!confirm('Tem a certeza? O reset global de XP é irreversível.')) {
      return;
    }
    setResettingXP(true);
    try {
      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch('/api/admin/xp/reset', {
        method: 'POST',
        headers,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Falha ao reset global.');
      }
      toast({
        title: 'Reset global',
        description: payload.message || 'XP resetado com sucesso.',
      });
      fetchStats();
    } catch (err: any) {
      console.error('XP reset error', err);
      toast({
        title: 'Erro',
        description: err?.message || 'Não foi possível resetar o XP.',
        variant: 'destructive',
      });
    } finally {
      setResettingXP(false);
    }
  };

  const safeStats = useMemo(
    () => ({
      xpTotal: stats?.courses?.xp?.allActions?.total ?? 0,
      xp24h: stats?.courses?.xp?.allActions?.last24h ?? 0,
      xp30d: stats?.courses?.xp?.allActions?.last30d ?? 0,
      blogPosts: stats?.blog?.totalPosts ?? 0,
      coursesActive: stats?.courses?.activeCourses ?? 0,
      onboardingPending: stats?.onboarding?.pendingTotal ?? 0,
    }),
    [stats],
  );

  const metrics = useMemo(
    () => [
      { label: 'XP total (all actions)', value: safeStats.xpTotal },
      { label: 'XP últimas 24h', value: safeStats.xp24h },
      { label: 'XP últimos 30d', value: safeStats.xp30d },
      { label: 'Posts de blog', value: safeStats.blogPosts },
    ],
    [safeStats],
  );

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
          A carregar XP...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#000c12] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-8 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
          <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10 space-y-3">
            <p className="text-xs uppercase tracking-[0.6em] text-cyan-200">
              LEGACY ADMIN
            </p>
            <h1 className="flex items-center gap-2 text-3xl font-semibold text-[#fdd87c] md:text-4xl">
              <Sparkles className="h-7 w-7 text-amber-300" />
              XP Control Room
            </h1>
            <p className="max-w-3xl text-sm text-slate-100 md:text-base">
              Controla recompensas, limites diarios e thresholds que movem o XP
              publico. Todas as alteracoes ficam registadas no sistema.
            </p>
            {(statsError || configError) && (
              <p className="text-xs text-rose-400">
                {statsError || configError}
              </p>
            )}
          </div>
        </section>

        {xpConfig && (
          <section className="space-y-6">
            <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border border-cyan-400/40 bg-cyan-400/10 text-cyan-100">
                    XP Rules
                  </Badge>
                  <CardTitle className="text-sm font-semibold text-[#fdd87c]">
                    Recompensas, limites e thresholds
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-200">
                  Atualiza com cuidado os valores oficiais usados pelo XP publico.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                      Recompensas
                    </p>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      {xpConfig.rewards.map((reward, index) => (
                        <div
                          key={reward.action_type}
                          className="rounded-xl border border-white/10 bg-[#021824]/80 p-4 shadow-[0_20px_60px_rgba(3,10,25,0.45)]"
                        >
                          <p className="text-sm font-semibold text-white">
                            {reward.label}
                          </p>
                          <p className="text-xs text-slate-400">
                            {reward.description}
                          </p>
                          <div className="mt-3 grid gap-2">
                            <Input
                              type="number"
                              value={reward.min_xp}
                              className={getInputClass()}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                setXpConfig((prev) => {
                                  if (!prev) return prev;
                                  const next = [...prev.rewards];
                                  next[index] = {
                                    ...next[index],
                                    min_xp: Number.isFinite(value)
                                      ? Math.trunc(value)
                                      : 0,
                                  };
                                  return { ...prev, rewards: next };
                                });
                              }}
                              placeholder="XP minimo"
                            />
                            <Input
                              type="number"
                              value={reward.max_xp}
                              className={getInputClass()}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                setXpConfig((prev) => {
                                  if (!prev) return prev;
                                  const next = [...prev.rewards];
                                  next[index] = {
                                    ...next[index],
                                    max_xp: Number.isFinite(value)
                                      ? Math.trunc(value)
                                      : 0,
                                  };
                                  return { ...prev, rewards: next };
                                });
                              }}
                              placeholder="XP maximo"
                            />
                            <Input
                              type="number"
                              value={reward.creator_bonus_pct ?? ''}
                              className={getInputClass()}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                setXpConfig((prev) => {
                                  if (!prev) return prev;
                                  const next = [...prev.rewards];
                                  next[index] = {
                                    ...next[index],
                                    creator_bonus_pct: Number.isFinite(value)
                                      ? value
                                      : null,
                                  };
                                  return { ...prev, rewards: next };
                                });
                              }}
                              placeholder="Bonus criador (%)"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                      Limites diarios
                    </p>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      {xpConfig.limits.map((limit, index) => (
                        <div
                          key={limit.action_type}
                          className="rounded-xl border border-white/10 bg-[#021824]/80 p-4 shadow-[0_20px_60px_rgba(3,10,25,0.45)]"
                        >
                          <p className="text-sm font-semibold text-white">
                            {limit.action_type}
                          </p>
                          <div className="mt-2 grid gap-2">
                            <Input
                              type="number"
                              value={limit.xp_earned}
                              className={getInputClass()}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                setXpConfig((prev) => {
                                  if (!prev) return prev;
                                  const next = [...prev.limits];
                                  next[index] = {
                                    ...next[index],
                                    xp_earned: Number.isFinite(value)
                                      ? Math.trunc(value)
                                      : 0,
                                  };
                                  return { ...prev, limits: next };
                                });
                              }}
                              placeholder="XP diario"
                            />
                            <Input
                              type="number"
                              value={limit.count}
                              className={getInputClass()}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                setXpConfig((prev) => {
                                  if (!prev) return prev;
                                  const next = [...prev.limits];
                                  next[index] = {
                                    ...next[index],
                                    count: Number.isFinite(value)
                                      ? Math.trunc(value)
                                      : 0,
                                  };
                                  return { ...prev, limits: next };
                                });
                              }}
                              placeholder="Maximo de acoes"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                      Thresholds
                    </p>
                    <div className="mt-3 space-y-3">
                      {xpConfig.thresholds.map((threshold, index) => (
                        <div
                          key={threshold.id}
                          className="rounded-xl border border-white/10 bg-[#021824]/80 p-4 shadow-[0_20px_60px_rgba(3,10,25,0.45)]"
                        >
                          <Input
                            type="number"
                            value={threshold.xp_total}
                            className={getInputClass()}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              setXpConfig((prev) => {
                                if (!prev) return prev;
                                const next = [...prev.thresholds];
                                next[index] = {
                                  ...next[index],
                                  xp_total: Number.isFinite(value)
                                    ? Math.trunc(value)
                                    : 0,
                                };
                                return { ...prev, thresholds: next };
                              });
                            }}
                            placeholder="XP total"
                          />
                          <Input
                            className={getInputClass('mt-2')}
                            value={threshold.feature_name}
                            onChange={(event) => {
                              const value = event.target.value;
                              setXpConfig((prev) => {
                                if (!prev) return prev;
                                const next = [...prev.thresholds];
                                next[index] = {
                                  ...next[index],
                                  feature_name: value,
                                };
                                return { ...prev, thresholds: next };
                              });
                            }}
                            placeholder="Recurso liberado"
                          />
                          <Input
                            className={getInputClass('mt-2')}
                            value={threshold.description}
                            onChange={(event) => {
                              const value = event.target.value;
                              setXpConfig((prev) => {
                                if (!prev) return prev;
                                const next = [...prev.thresholds];
                                next[index] = {
                                  ...next[index],
                                  description: value,
                                };
                                return { ...prev, thresholds: next };
                              });
                            }}
                            placeholder="Descricao"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="default"
                    className="gap-2 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_40px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                    onClick={async () => {
                      if (!xpConfig) return;
                      setSavingConfig(true);
                      try {
                        const token = getToken();
                        const headers: HeadersInit = {
                          'Content-Type': 'application/json',
                        };
                        if (token) headers.Authorization = `Bearer ${token}`;
                        const response = await fetch('/api/admin/xp', {
                          method: 'PUT',
                          headers,
                          body: JSON.stringify(xpConfig),
                        });
                        const payload = await response.json();
                        if (!response.ok || !payload.success) {
                          throw new Error(
                            payload.error || 'Falha ao salvar regras.',
                          );
                        }
                        toast({
                          title: 'Configuracao salva',
                          description:
                            payload.message || 'Regras de XP atualizadas.',
                        });
                      } catch (err: any) {
                        console.error('Save xp config', err);
                        setConfigError(err?.message || 'Erro ao salvar.');
                        toast({
                          title: 'Erro',
                          description:
                            err?.message || 'Nao foi possivel salvar.',
                          variant: 'destructive',
                        });
                      } finally {
                        setSavingConfig(false);
                      }
                    }}
                    disabled={savingConfig}
                  >
                    {savingConfig ? 'A guardar...' : 'Guardar regras oficiais'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <section className="space-y-4">
          <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-[#fdd87c]">
                Ajustar XP manualmente
              </CardTitle>
              <CardDescription className="text-xs text-slate-200">
                Escolhe o utilizador e aplica ou remove XP diretamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UserSelect value={selectedUserId} onChange={setSelectedUserId} />
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  placeholder="Amount"
                  type="number"
                  value={xpValue}
                  className={getInputClass()}
                  onChange={(event) => setXpValue(event.target.value)}
                />
                <Select
                  value={xpAction}
                  onValueChange={(value) =>
                    setXpAction(value as 'add' | 'remove')
                  }
                >
                  <SelectTrigger className={getInputClass()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add XP</SelectItem>
                    <SelectItem value="remove">Remove XP</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Reason (optional)"
                  value={reason}
                  className={getInputClass()}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="default"
                  className="gap-2 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_40px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  onClick={handleXpAdjustment}
                  disabled={!selectedUserId || !normalizedAmount || submittingXP}
                >
                  {submittingXP ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Aplicar XP
                </Button>
                {isSuperAdminFreeman && (
                  <Button
                    variant="outline"
                    className="border-white/40 text-rose-300 hover:bg-rose-500/10"
                    onClick={handleResetXP}
                    disabled={resettingXP}
                  >
                    {resettingXP ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    Reset global de XP (freemanpt)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
            <CardHeader>
              <CardTitle className="text-white text-sm font-semibold">
                Metricas principais
              </CardTitle>
              <CardDescription className="text-xs text-slate-300">
                Painel rapido com numeros do XP em tempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                />
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
