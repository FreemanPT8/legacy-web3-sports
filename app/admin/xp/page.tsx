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
import { Loader2, Sparkles, Award, Zap, BookOpen, RefreshCcw } from 'lucide-react';
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
      totalCourses?: number;
      totalModules?: number;
      totalLessons?: number;
    };
  };
  blog?: {
    totalPosts?: number;
    xp?: { total?: number; last24h?: number; last30d?: number };
  };
  onboarding?: {
    pendingTotal?: number;
  };
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

  const [stats, setStats] = useState<AdminStatsSummary | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [xpValue, setXpValue] = useState('');
  const [xpAction, setXpAction] = useState<'add' | 'remove'>('add');
  const [reason, setReason] = useState('');
  const [submittingXP, setSubmittingXP] = useState(false);
  const [resettingXP, setResettingXP] = useState(false);
  const { toast } = useToast();

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
        setStatsError(data.error || 'Failed to load XP stats');
        setStats(null);
        return;
      }

      setStats(data.stats as AdminStatsSummary);
    } catch (error) {
      console.error('Error loading XP stats:', error);
      setStatsError('Failed to load XP stats');
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [getToken, isAdmin]);

  const normalizedAmount = useMemo(() => {
    const numeric = Number(xpValue);
    if (!Number.isFinite(numeric) || numeric === 0) return null;
    return Math.abs(Math.trunc(numeric));
  }, [xpValue]);

  const handleXpAdjustment = async () => {
    if (!selectedUserId || !normalizedAmount || submittingXP) return;

    const amount = xpAction === 'add' ? normalizedAmount : -normalizedAmount;
    setSubmittingXP(true);

    try {
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

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
        description: payload.message || 'O XP foi atualizado com sucesso.',
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

    if (!confirm('Tem a certeza de que quer resetar todo o XP? Esta ação é irreversível.')) {
      return;
    }

    setResettingXP(true);
    try {
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/admin/xp/reset', {
        method: 'POST',
        headers,
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Falha no reset global de XP.');
      }

      toast({
        title: 'Reset global',
        description:
          payload.message || 'XP resetado para todos os utilizadores.',
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

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin, fetchStats]);

  const safeStats = useMemo(() => {
    return {
      xpTotal: stats?.courses?.xp?.allActions?.total ?? 0,
      xp24h: stats?.courses?.xp?.allActions?.last24h ?? 0,
      xp30d: stats?.courses?.xp?.allActions?.last30d ?? 0,
      blogPosts: stats?.blog?.totalPosts ?? 0,
      coursesActive: stats?.courses?.activeCourses ?? 0,
      coursesTotal: stats?.courses?.totalCourses ?? 0,
      onboardingPending: stats?.onboarding?.pendingTotal ?? 0,
    };
  }, [stats]);

  const metrics = useMemo(
    () => [
      { label: 'XP total (all actions)', value: safeStats.xpTotal },
      { label: 'XP últimas 24h', value: safeStats.xp24h },
      { label: 'XP últimos 30d', value: safeStats.xp30d },
      { label: 'Postagens de blog', value: safeStats.blogPosts },
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
            LEGACY Admin — XP
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-amber-300" />
            XP Control Room
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Monitora como XP circula, premia quem importa e detecta fluxos críticos com
            base nos números oficiais.
          </p>
          {statsError && (
            <p className="mt-3 text-xs text-red-400">{statsError}</p>
          )}
        </div>
      </section>

      <section>
        <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-900/60 shadow-2xl mx-auto max-w-6xl">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-500/20 text-amber-100 border border-amber-500/40">
                Pulse
              </Badge>
              <CardTitle className="text-heading text-lg">
                Operação de XP com foco em impacto
              </CardTitle>
            </div>
            <CardDescription className="text-muted-custom text-sm max-w-3xl">
              Conecte as distribuições de XP a ações mensuráveis (posts, cursos, eventos)
              a partir dos dados oficiais do painel admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
              <div className="flex flex-col gap-3 md:flex-row">
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => router.push('/admin/blog')}
                >
                <Sparkles className="h-4 w-4 mr-2" />
                Ver iniciativas que geram XP
              </Button>
              <Button
                className="flex-1 border border-slate-700 bg-slate-950/60 text-slate-100 hover:bg-slate-900"
                onClick={() => router.push('/admin/courses')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Revisar cursos ativos
              </Button>
              <Button
                className="flex-1 border border-blue-600 text-blue-100 bg-blue-950/50 hover:bg-blue-900"
                onClick={() => router.push('/admin/xp')}
              >
                <Award className="h-4 w-4 mr-2" />
                Atualizar regras de recompensa
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3 text-xs">
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-100">
                <p className="font-semibold uppercase tracking-wide text-[11px]">
                  XP total
                </p>
                <p className="text-2xl font-bold mt-1">
                  {safeStats.xpTotal.toLocaleString('pt-PT')}
                </p>
                <p className="text-muted-custom text-[11px]">
                  Métrica puxada direto de /api/admin/stats.
                </p>
              </div>
              <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-blue-100">
                <p className="font-semibold uppercase tracking-wide text-[11px]">
                  Cursos ativos
                </p>
                <p className="text-2xl font-bold mt-1">
                  {safeStats.coursesActive.toLocaleString('pt-PT')}
                </p>
                <p className="text-muted-custom text-[11px]">
                  Atualizado conforme os cursos no dashboard.
                </p>
              </div>
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-100">
                <p className="font-semibold uppercase tracking-wide text-[11px]">
                  Onboardings pendentes
                </p>
                <p className="text-2xl font-bold mt-1">
                  {safeStats.onboardingPending.toLocaleString('pt-PT')}
                </p>
                <p className="text-muted-custom text-[11px]">
                  Acompanhe o pipeline real carregado pelo admin stats.
                </p>
              </div>
              </div>
            </CardContent>
          </Card>
        </section>

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
              Um painel rápido com números reais do XP.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4">
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
  );
}
