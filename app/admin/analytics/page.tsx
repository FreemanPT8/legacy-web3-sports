'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, Globe2, Activity } from 'lucide-react';

type AdminStats = {
  users?: {
    total: number;
    superAdmins: number;
    admins: number;
    members: number;
    new24h: number;
    new30d: number;
  };
  courses?: {
    totalCourses: number;
    activeCourses: number;
    totalModules: number;
    totalLessons: number;
    xp?: {
      allActions: {
        total: number;
        last24h: number;
        last30d: number;
      };
    };
  };
  blog?: {
    totalPosts: number;
    xp: { total: number; last24h: number; last30d: number };
    views: { total: number; logged: number };
    topPosts: {
      last7d: { id: string; title: any; views: number }[];
      last30d: { id: string; title: any; views: number }[];
    };
  };
  onboarding?: {
    pendingTotal: number;
    pendingPorAbrir: number;
    pendingByStatus: Record<string, number>;
  };
  houses?: {
    total: number;
    active: number;
    building: number;
    developing: number;
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

const TopList = ({
  title,
  items,
}: {
  title: string;
  items: { id: string; title: any; views: number }[];
}) => (
  <Card className="border-custom border-dashed bg-card-custom">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-heading">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-sm text-body">
      {items && items.length > 0 ? (
        items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3"
          >
            <span className="truncate">
              {typeof item.title === 'string'
                ? item.title
                : (item.title as any)?.pt ??
                  (item.title as any)?.en ??
                  item.title ??
                  'Sem título'}
            </span>
            <span className="font-semibold">
              {item.views.toLocaleString('pt-PT')}
            </span>
          </div>
        ))
      ) : (
        <p className="text-xs text-muted-custom">Sem dados</p>
      )}
    </CardContent>
  </Card>
);

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const isAdmin =
    !!user && (user.role === 'Admin' || user.role === 'Super Admin');

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingStats(true);
    setStatsError(null);

    try {
      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/admin/stats', { headers });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setStatsError(payload.error || 'Falha ao carregar métricas.');
        setStats(null);
        return;
      }

      setStats(payload.stats || null);
    } catch (error: any) {
      console.error('Erro carregando analytics:', error);
      setStatsError(error?.message || 'Erro inesperado.');
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [getToken, isAdmin]);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [loading, user, router, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin, fetchStats]);

  const safeStats = useMemo(() => {
    return {
      users: stats?.users ?? {
        total: 0,
        superAdmins: 0,
        admins: 0,
        members: 0,
        new24h: 0,
        new30d: 0,
      },
      courses: stats?.courses ?? {
        totalCourses: 0,
        activeCourses: 0,
        totalModules: 0,
        totalLessons: 0,
        xp: {
          allActions: { total: 0, last24h: 0, last30d: 0 },
        },
      },
      blog: stats?.blog ?? {
        totalPosts: 0,
        xp: { total: 0, last24h: 0, last30d: 0 },
        views: { total: 0, logged: 0 },
        topPosts: { last7d: [], last30d: [] },
      },
      onboarding: stats?.onboarding ?? {
        pendingTotal: 0,
        pendingPorAbrir: 0,
        pendingByStatus: {},
      },
      houses: stats?.houses ?? {
        total: 0,
        active: 0,
        building: 0,
        developing: 0,
      },
    };
  }, [stats]);

  const metrics = useMemo(
    () => [
      { label: 'Total de utilizadores', value: safeStats.users.total },
      { label: 'Cursos ativos', value: safeStats.courses.activeCourses },
      { label: 'Blog posts publicados', value: safeStats.blog.totalPosts },
      { label: 'Onboardings pendentes', value: safeStats.onboarding.pendingTotal },
    ],
    [safeStats],
  );

  const onboardingEntries = useMemo(
    () => Object.entries(safeStats.onboarding.pendingByStatus),
    [safeStats.onboarding.pendingByStatus],
  );

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-custom">
          <Loader2 className="h-5 w-5 animate-spin" />
          A carregar analytics...
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
            LEGACY Admin — Analytics
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-cyan-300" />
            Insights & Analytics
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Métricas oficiais do ecossistema para informar decisões de tráfego, conteúdo e engajamento.
          </p>
          {statsError && (
            <p className="mt-3 text-xs text-red-400">{statsError}</p>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <Card className="bg-card-custom border-custom shadow-lg shadow-slate-950/40">
          <CardHeader>
            <CardTitle className="text-heading text-sm font-semibold">
              Indicadores principais
            </CardTitle>
            <CardDescription className="text-muted-custom text-xs">
              Dados frescos diretamente do /api/admin/stats.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4">
            {loadingStats ? (
              <div className="md:col-span-4 text-center text-sm text-muted-custom">
                A carregar métricas...
              </div>
            ) : (
              metrics.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} />
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="text-heading flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-blue-400" />
                Top blog posts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TopList title="Últimos 7 dias" items={safeStats.blog.topPosts.last7d} />
              <TopList title="Últimos 30 dias" items={safeStats.blog.topPosts.last30d} />
            </CardContent>
          </Card>

          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="text-heading">
                Onboarding pipeline
              </CardTitle>
              <CardDescription className="text-xs text-muted-custom">
                Agrupamento real por estados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {onboardingEntries.length > 0 ? (
                <div className="grid gap-2">
                  {onboardingEntries.map(([status, value]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60 text-xs"
                    >
                      <span>{status}</span>
                      <span className="font-semibold">{value.toLocaleString('pt-PT')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-custom">Sem dados</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="text-heading">
                Houses of Sports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-muted-custom uppercase text-[11px]">Active</p>
                  <p className="text-2xl font-semibold text-heading">{safeStats.houses.active.toLocaleString('pt-PT')}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-muted-custom uppercase text-[11px]">Building</p>
                  <p className="text-2xl font-semibold text-heading">{safeStats.houses.building.toLocaleString('pt-PT')}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-muted-custom uppercase text-[11px]">Developing</p>
                  <p className="text-2xl font-semibold text-heading">{safeStats.houses.developing.toLocaleString('pt-PT')}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-muted-custom uppercase text-[11px]">Total</p>
                  <p className="text-2xl font-semibold text-heading">{safeStats.houses.total.toLocaleString('pt-PT')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3 border-t border-slate-800/70 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-custom">
              Níveis de XP
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="border border-blue-500/60 text-blue-100 hover:bg-blue-950/40"
              onClick={() => router.push('/admin/xp')}
            >
              Ver controle de XP
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard
              label="XP total (all actions)"
              value={safeStats.courses.xp.allActions.total}
            />
            <MetricCard
              label="XP últimas 24h"
              value={safeStats.courses.xp.allActions.last24h}
            />
            <MetricCard
              label="XP últimos 30d"
              value={safeStats.courses.xp.allActions.last30d}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
