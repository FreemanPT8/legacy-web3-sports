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
import { Loader2, BarChart3 } from 'lucide-react';

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
  houses?: {
    total: number;
    active: number;
    building: number;
    developing: number;
  };
};

const MetricCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-white/10 bg-[#04131b] p-4 shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
    <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">{label}</p>
    <p className="mt-2 text-3xl font-semibold text-[#fdd87c]">
      {value.toLocaleString('pt-PT')}
    </p>
  </div>
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
        setStatsError(payload.error || 'Falha ao carregar metricas.');
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
    ],
    [safeStats],
  );

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
          A carregar analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full space-y-8 bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#000c12] px-4 py-8 md:px-8">
      <section className="relative mt-2 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-8 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-5xl space-y-3">
          <p className="text-xs uppercase tracking-[0.6em] text-cyan-200">
            LEGACY ADMIN
          </p>
          <h1 className="flex items-center gap-2 text-3xl font-semibold text-[#fdd87c] md:text-4xl">
            <BarChart3 className="h-7 w-7 text-cyan-300" />
            Insights & Analytics
          </h1>
          <p className="text-sm text-slate-100 md:text-base">
            Metricas oficiais do ecossistema para informar decisoes de trafego,
            conteudo e engagement.
          </p>
          {statsError && (
            <p className="text-xs text-rose-400">{statsError}</p>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>

        <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.55)]">
          <CardHeader>
            <CardTitle className="text-[#fdd87c]">
              Houses of Sports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-white/10 bg-[#021824]/80 p-3 shadow-[0_15px_40px_rgba(3,10,25,0.45)]">
                <p className="text-[11px] uppercase text-slate-300">Active</p>
                <p className="text-2xl font-semibold text-[#fdd87c]">{safeStats.houses.active.toLocaleString('pt-PT')}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#021824]/80 p-3 shadow-[0_15px_40px_rgba(3,10,25,0.45)]">
                <p className="text-[11px] uppercase text-slate-300">Building</p>
                <p className="text-2xl font-semibold text-[#fdd87c]">{safeStats.houses.building.toLocaleString('pt-PT')}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#021824]/80 p-3 shadow-[0_15px_40px_rgba(3,10,25,0.45)]">
                <p className="text-[11px] uppercase text-slate-300">Developing</p>
                <p className="text-2xl font-semibold text-[#fdd87c]">{safeStats.houses.developing.toLocaleString('pt-PT')}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#021824]/80 p-3 shadow-[0_15px_40px_rgba(3,10,25,0.45)]">
                <p className="text-[11px] uppercase text-slate-300">Total</p>
                <p className="text-2xl font-semibold text-[#fdd87c]">{safeStats.houses.total.toLocaleString('pt-PT')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200">
              Níveis de XP
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="border-white/40 text-white hover:bg-white/10"
              onClick={() => router.push('/admin/xp')}
            >
              Ver controle de XP
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard
              label="XP total (all actions)"
              value={safeStats.courses.xp?.allActions?.total ?? 0}
            />
            <MetricCard
              label="XP ultimas 24h"
              value={safeStats.courses.xp?.allActions?.last24h ?? 0}
            />
            <MetricCard
              label="XP ultimos 30d"
              value={safeStats.courses.xp?.allActions?.last30d ?? 0}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
