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
  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
    <p className="text-xs uppercase text-muted-custom">{label}</p>
    <p className="text-3xl font-semibold text-heading">
      {value.toLocaleString('pt-PT')}
    </p>
  </div>
);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-custom">
          <Loader2 className="h-5 w-5 animate-spin" />
          A carregar XP...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <section className="mt-2 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4 py-6 md:px-6 md:py-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-5xl">
          <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 mb-3 border border-white/10">
            LEGACY Admin · XP
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-amber-300" />
            XP Control Room
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-3xl">
            Central para editar as regras oficiais de recompensa, limites diários,
            streaks e thresholds que movem o ecossistema.
          </p>
          {(statsError || configError) && (
            <p className="mt-3 text-xs text-red-400">
              {statsError || configError}
            </p>
          )}
        </div>
      </section>

      {xpConfig && (
        <section className="space-y-6">
          <Card className="bg-card-custom border-custom shadow-lg shadow-amber-950/40">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-100 border border-blue-500/40">
                  XP Rules
                </Badge>
                <CardTitle className="text-heading text-sm font-semibold">
                  Recompensas, limites e thresholds
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-custom">
                Atualize de forma segura os valores oficiais usados pelo XP público.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <p className="text-xs uppercase text-muted-custom tracking-[0.4em]">
                    Recompensas
                  </p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {xpConfig.rewards.map((reward, index) => (
                      <div
                        key={reward.action_type}
                        className="rounded-lg border border-slate-800 p-4"
                      >
                        <p className="text-sm font-semibold text-heading">
                          {reward.label}
                        </p>
                        <p className="text-xs text-muted-custom">
                          {reward.description}
                        </p>
                        <div className="mt-3 grid gap-2">
                          <Input
                            type="number"
                            value={reward.min_xp}
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
                            placeholder="XP mínimo"
                          />
                          <Input
                            type="number"
                            value={reward.max_xp}
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
                            placeholder="XP máximo"
                          />
                          <Input
                            type="number"
                            value={reward.creator_bonus_pct ?? ''}
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
                            placeholder="Bônus criador (%)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase text-muted-custom tracking-[0.4em]">
                    Limites diários
                  </p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {xpConfig.limits.map((limit, index) => (
                      <div
                        key={limit.action_type}
                        className="rounded-lg border border-slate-800 p-4"
                      >
                        <p className="text-sm font-semibold text-heading">
                          {limit.action_type}
                        </p>
                        <div className="mt-2 grid gap-2">
                          <Input
                            type="number"
                            value={limit.xp_earned}
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
                            placeholder="XP diário"
                          />
                          <Input
                            type="number"
                            value={limit.count}
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
                            placeholder="Máximo de ações"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase text-muted-custom tracking-[0.4em]">
                    Thresholds
                  </p>
                  <div className="mt-3 space-y-3">
                    {xpConfig.thresholds.map((threshold, index) => (
                      <div
                        key={threshold.id}
                        className="rounded-lg border border-slate-800 p-4"
                      >
                        <Input
                          type="number"
                          value={threshold.xp_total}
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
                          className="mt-2"
                          value={threshold.feature_name}
                          onChange={(event) => {
                            const value = event.target.value;
                            setXpConfig((prev) => {
                              if (!prev) return prev;
                              const next = [...prev.thresholds];
                              next[index] = { ...next[index], feature_name: value };
                              return { ...prev, thresholds: next };
                            });
                          }}
                          placeholder="Recurso liberado"
                        />
                        <Input
                          className="mt-2"
                          value={threshold.description}
                          onChange={(event) => {
                            const value = event.target.value;
                            setXpConfig((prev) => {
                              if (!prev) return prev;
                              const next = [...prev.thresholds];
                              next[index] = { ...next[index], description: value };
                              return { ...prev, thresholds: next };
                            });
                          }}
                          placeholder="Descrição"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
                        throw new Error(payload.error || 'Falha ao salvar regras.');
                      }
                      toast({
                        title: 'Configuração salva',
                        description: payload.message || 'Regras de XP atualizadas.',
                      });
                    } catch (err: any) {
                      console.error('Save xp config', err);
                      setConfigError(err?.message || 'Erro ao salvar.');
                      toast({
                        title: 'Erro',
                        description: err?.message || 'Não foi possível salvar.',
                        variant: 'destructive',
                      });
                    } finally {
                      setSavingConfig(false);
                    }
                  }}
                  disabled={savingConfig}
                >
                  {savingConfig ? 'Salvando...' : 'Salvar regras oficiais'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-4">
        <Card className="bg-card-custom border-custom shadow-lg shadow-amber-950/40">
          <CardHeader>
            <CardTitle className="text-heading text-sm font-semibold">
              Ajustar XP manualmente
            </CardTitle>
            <CardDescription className="text-xs text-muted-custom">
              Selecione um utilizador e aplique ou remova XP diretamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <UserSelect value={selectedUserId} onChange={setSelectedUserId} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Amount"
                type="number"
                value={xpValue}
                onChange={(event) => setXpValue(event.target.value)}
              />
              <Select
                value={xpAction}
                onValueChange={(value) => setXpAction(value as 'add' | 'remove')}
              >
                <SelectTrigger>
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
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={handleXpAdjustment}
                disabled={!selectedUserId || !normalizedAmount || submittingXP}
              >
                {submittingXP ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Aplicar XP
              </Button>
              {isSuperAdminFreeman && (
                <Button
                  variant="outline"
                  className="text-red-400 border-red-500"
                  onClick={handleResetXP}
                  disabled={resettingXP}
                >
                  {resettingXP ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCcw className="h-4 w-4 mr-2" />
                  )}
                  Reset global de XP (freemanpt)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <Card className="bg-card-custom border-custom shadow-lg shadow-amber-950/40">
          <CardHeader>
            <CardTitle className="text-heading text-sm font-semibold">
              Métricas principais
            </CardTitle>
            <CardDescription className="text-xs text-muted-custom">
              Um painel rápido com números em tempo real do XP.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
