'use client';

import {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  BookOpen,
  FileText,
  Mail,
  Building2,
  Activity,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { UserGrowthChart } from '@/components/admin/charts/UserGrowthChart';
import { CourseEngagementChart } from '@/components/admin/charts/CourseEngagementChart';
import { EngagementChart } from '@/components/admin/charts/EngagementChart';

type AdminStats = {
  // legacy flat (compat)
  totalUsers?: number;
  totalAdmins?: number;
  totalSuperAdmins?: number;
  activeCourses?: number;
  totalCourses?: number;
  totalLessons?: number;
  totalBlogPosts?: number;
  totalOnboardingPending?: number;
  onboardingByStatus?: Record<string, number>;
  totalHouses?: number;
  activeHouses?: number;
  buildingHouses?: number;
  developingHouses?: number;
  // structured
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
    xp: {
      totalCourses: number;
      totalModules: number;
      totalLessons: number;
      last24h: { courses: number; modules: number; lessons: number };
      last30d: { courses: number; modules: number; lessons: number };
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
      last365d: { id: string; title: any; views: number }[];
    };
  };
  onboarding?: {
    pendingTotal: number;
    pendingByStatus: Record<string, number>;
    pendingPorAbrir: number;
    byResponsible: Record<string, number>;
  };
  houses?: {
    total: number;
    active: number;
    building: number;
    developing: number;
  };
};

type AdvancedStats = {
  userGrowth: { month?: string; date?: string; count: number }[];
  courseEngagement: { course: string; completions: number }[];
  weeklyEngagement: {
    week: string;
    lessons: number;
    courses: number;
    blog: number;
    xp: number;
  }[];
};

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#04131b] p-4 shadow-[0_20px_55px_rgba(3,10,25,0.55)]">
      <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-[#fdd87c]">
        {(value ?? 0).toLocaleString('pt-PT')}
      </p>
    </div>
  );
}

function TopList({
  title,
  items,
}: {
  title: string;
  items: { id: string; title: any; views: number }[];
}) {
  return (
    <Card className="border border-dashed border-white/20 bg-[#04131b] shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-[#fdd87c]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-200">
        {items && items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate text-slate-100">
                {(item.title as any)?.pt ??
                  (item.title as any)?.en ??
                  item.title ??
                  '—'}
              </span>
              <span className="font-semibold text-slate-100">
                {(item.views ?? 0).toLocaleString('pt-PT')}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400">Sem dados</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [advanced, setAdvanced] = useState<AdvancedStats | null>(null);
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isAdmin =
    !!user && (user.role === 'Admin' || user.role === 'Super Admin');

  // Guard de acesso
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [user, loading, router, isAdmin]);

  const loadStats = useCallback(async () => {
    if (!isAdmin) return;

    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      setLoadingStats(true);
      setStatsError(null);

      const res = await fetch('/api/admin/stats', { headers });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatsError(data.error || 'Failed to load stats');
        setStats(null);
      } else {
        setStats(data.stats as AdminStats);
      }
    } catch (err) {
      console.error('Error loading admin stats:', err);
      setStatsError('Failed to load stats');
    } finally {
      setLoadingStats(false);
    }
  }, [getToken, isAdmin]);

  const loadAdvancedStats = useCallback(async () => {
    if (!isAdmin) return;

    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      setLoadingAdvanced(true);
      setAdvancedError(null);

      const resAdv = await fetch('/api/admin/stats/advanced', { headers });
      const dataAdv = await resAdv.json();

      if (!resAdv.ok || !dataAdv.success) {
        console.warn('Advanced stats unavailable:', dataAdv.error);
        setAdvancedError(dataAdv.error || 'Failed to load advanced insights');
      } else {
        setAdvanced(dataAdv.data as AdvancedStats);
      }
    } catch (err) {
      console.error('Error loading advanced stats:', err);
      setAdvancedError('Failed to load advanced insights');
    } finally {
      setLoadingAdvanced(false);
    }
  }, [getToken, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
    }
  }, [isAdmin, loadStats]);

  useEffect(() => {
    if (showAdvanced && isAdmin && !advanced && !loadingAdvanced) {
      loadAdvancedStats();
    }
  }, [showAdvanced, isAdmin, advanced, loadingAdvanced, loadAdvancedStats]);

  const safeStats = useMemo(() => {
    const users = stats?.users || {
      total: stats?.totalUsers ?? 0,
      superAdmins: stats?.totalSuperAdmins ?? 0,
      admins: stats?.totalAdmins ?? 0,
      members:
        (stats?.totalUsers ?? 0) -
        (stats?.totalAdmins ?? 0) -
        (stats?.totalSuperAdmins ?? 0),
      new24h: 0,
      new30d: 0,
    };

    const courses = stats?.courses || {
      totalCourses: stats?.totalCourses ?? 0,
      activeCourses: stats?.activeCourses ?? 0,
      totalModules: 0,
      totalLessons: stats?.totalLessons ?? 0,
      xp: {
        totalCourses: 0,
        totalModules: 0,
        totalLessons: 0,
        last24h: { courses: 0, modules: 0, lessons: 0 },
        last30d: { courses: 0, modules: 0, lessons: 0 },
        allActions: { total: 0, last24h: 0, last30d: 0 },
      },
    };

    const blog = stats?.blog || {
      totalPosts: stats?.totalBlogPosts ?? 0,
      xp: { total: 0, last24h: 0, last30d: 0 },
      views: { total: 0, logged: 0 },
      topPosts: { last7d: [], last30d: [], last365d: [] },
    };

    const onboarding = stats?.onboarding || {
      pendingTotal: stats?.totalOnboardingPending ?? 0,
      pendingByStatus: stats?.onboardingByStatus ?? {},
      pendingPorAbrir: 0,
      byResponsible: {},
    };

    const houses = stats?.houses || {
      total: stats?.totalHouses ?? 0,
      active: stats?.activeHouses ?? 0,
      building: stats?.buildingHouses ?? 0,
      developing: stats?.developingHouses ?? 0,
    };

    return { users, courses, blog, onboarding, houses };
  }, [stats]);

  const onboardingStatusEntries = useMemo(
    () => Object.entries(safeStats.onboarding.pendingByStatus || {}),
    [safeStats.onboarding.pendingByStatus],
  );

  const userGrowthData = useMemo(
    () =>
      (advanced?.userGrowth || []).map((item, index) => ({
        date: item.date || item.month || `M${index + 1}`,
        count: item.count ?? 0,
      })),
    [advanced],
  );

  const courseEngagementData = useMemo(
    () =>
      (advanced?.courseEngagement || []).map((item) => ({
        course: item.course,
        completions: item.completions ?? 0,
      })),
    [advanced],
  );

  const weeklyEngagementData = useMemo(
    () =>
      (advanced?.weeklyEngagement || []).map((item) => ({
        week: item.week,
        lessons: item.lessons ?? 0,
        courses: item.courses ?? 0,
        blog: item.blog ?? 0,
        xp: item.xp ?? 0,
      })),
    [advanced],
  );

  if (loading || !user) return null;

  const formatNumber = (n: number) =>
    typeof n === 'number' ? n.toLocaleString('pt-PT') : '0';

  return (
    <div className="w-full space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-10 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -left-10 h-56 w-56 rounded-full bg-[#fdd87c]/15 blur-3xl" />
          <div className="absolute -bottom-16 -right-12 h-64 w-64 rounded-full bg-[#5af3ff]/15 blur-3xl" />
        </div>
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.6em] text-cyan-200">
            LEGACY ADMIN
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[#fdd87c]">
            Admin Dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-100">
            Visão rápida sobre utilizadores, cursos, blog, onboarding e Houses of
            Sports. Usa este painel para perceber se o LEGACY cresce de forma
            saudável ou se algo precisa da tua atenção.
          </p>
          {statsError && (
            <p className="mt-3 text-xs text-rose-400">{statsError}</p>
          )}
        </div>
      </section>

      {/* BLOCOS PRINCIPAIS */}
      <section className="space-y-8">
        {/* USERS */}
        <div className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.4em] text-cyan-200">
            Utilizadores
          </h2>
          <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-[#fdd87c]">
                <Users className="h-5 w-5 text-blue-400" />
                Users
              </CardTitle>
              <CardDescription className="text-slate-200">
                Base de utilizadores e registos recentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-slate-200 md:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-[#021824]/80 p-3 shadow-[0_15px_40px_rgba(3,10,25,0.5)]">
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-3xl font-bold text-[#fdd87c]">
                  {loadingStats ? '...' : formatNumber(safeStats.users.total)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Super Admin: {formatNumber(safeStats.users.superAdmins)} |{' '}
                  Admin: {formatNumber(safeStats.users.admins)} | Members:{' '}
                  {formatNumber(safeStats.users.members)}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#021824]/80 p-3 shadow-[0_15px_40px_rgba(3,10,25,0.5)]">
                <p className="text-xs text-slate-400">Novos (24h)</p>
                <p className="text-3xl font-bold text-[#fdd87c]">
                  {formatNumber(safeStats.users.new24h)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Últimas 24 horas
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#021824]/80 p-3 shadow-[0_15px_40px_rgba(3,10,25,0.5)]">
                <p className="text-xs text-slate-400">Novos (30d)</p>
                <p className="text-3xl font-bold text-[#fdd87c]">
                  {formatNumber(safeStats.users.new30d)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Últimos 30 dias
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#021824]/80 p-3 shadow-[0_15px_40px_rgba(3,10,25,0.5)]">
                <p className="text-xs text-slate-400">
                  XP Total (todas ações)
                </p>
                <p className="text-xl font-semibold text-[#fdd87c]">
                  {formatNumber(safeStats.courses.xp.allActions.total)}
                </p>
                <p className="text-[11px] text-slate-400">
                  24h:{' '}
                  {formatNumber(safeStats.courses.xp.allActions.last24h)} | 30d:{' '}
                  {formatNumber(safeStats.courses.xp.allActions.last30d)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COURSES / MODULES / LESSONS */}
        <div className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.4em] text-cyan-200">
            Conteúdo educativo
          </h2>
          <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#fdd87c]">
                <BookOpen className="h-5 w-5 text-emerald-400" />
                Active Courses
              </CardTitle>
              <CardDescription className="text-slate-200">
                Cursos, módulos, lições e distribuição de XP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-200">
              <div className="grid md:grid-cols-4 gap-4">
                <StatTile
                  label="Courses (published)"
                  value={safeStats.courses.activeCourses}
                />
                <StatTile
                  label="Total Courses"
                  value={safeStats.courses.totalCourses}
                />
                <StatTile
                  label="Modules"
                  value={safeStats.courses.totalModules}
                />
                <StatTile
                  label="Lessons"
                  value={safeStats.courses.totalLessons}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border border-dashed border-white/20 bg-[#04131b] shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-[#fdd87c]">
                      <Activity className="h-4 w-4 text-emerald-400" />
                      XP Distribuído (Total)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-200">
                    <div>
                      Cursos:{' '}
                      {formatNumber(safeStats.courses.xp.totalCourses)}
                    </div>
                    <div>
                      Módulos:{' '}
                      {formatNumber(safeStats.courses.xp.totalModules)}
                    </div>
                    <div>
                      Lições:{' '}
                      {formatNumber(safeStats.courses.xp.totalLessons)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-dashed border-white/20 bg-[#04131b] shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-[#fdd87c]">
                      <TrendingUp className="h-4 w-4 text-blue-400" />
                      XP (Últimas 24h)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-200">
                    <div>
                      Cursos:{' '}
                      {formatNumber(safeStats.courses.xp.last24h.courses)}
                    </div>
                    <div>
                      Módulos:{' '}
                      {formatNumber(safeStats.courses.xp.last24h.modules)}
                    </div>
                    <div>
                      Lições:{' '}
                      {formatNumber(safeStats.courses.xp.last24h.lessons)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-dashed border-white/20 bg-[#04131b] shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-[#fdd87c]">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                      XP (Últimos 30d)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-200">
                    <div>
                      Cursos:{' '}
                      {formatNumber(safeStats.courses.xp.last30d.courses)}
                    </div>
                    <div>
                      Módulos:{' '}
                      {formatNumber(safeStats.courses.xp.last30d.modules)}
                    </div>
                    <div>
                      Lições:{' '}
                      {formatNumber(safeStats.courses.xp.last30d.lessons)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BLOG */}
        <div className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.4em] text-cyan-200">
            Blog & Educação contínua
          </h2>
          <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#fdd87c]">
                <FileText className="h-5 w-5 text-purple-400" />
                Blog Posts
              </CardTitle>
              <CardDescription className="text-slate-200">
                Publicados, XP distribuído e visualizações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-200">
              <div className="grid md:grid-cols-4 gap-4">
                <StatTile
                  label="Publicados"
                  value={safeStats.blog.totalPosts}
                />
                <StatTile
                  label="XP total (blog)"
                  value={safeStats.blog.xp.total}
                />
                <StatTile
                  label="XP 24h"
                  value={safeStats.blog.xp.last24h}
                />
                <StatTile
                  label="XP 30d"
                  value={safeStats.blog.xp.last30d}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border border-dashed border-white/20 bg-[#04131b] shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-[#fdd87c]">
                      <BarChart3 className="h-4 w-4 text-slate-200" />
                      Visualizações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-slate-200">
                    <div>
                      Total:{' '}
                      {formatNumber(safeStats.blog.views.total)}
                    </div>
                    <div>
                      Users com login:{' '}
                      {formatNumber(safeStats.blog.views.logged)}
                    </div>
                  </CardContent>
                </Card>
                <TopList
                  title="Top 7 dias"
                  items={safeStats.blog.topPosts.last7d}
                />
                <TopList
                  title="Top 30 dias"
                  items={safeStats.blog.topPosts.last30d}
                />
              </div>
              <TopList
                title="Top 365 dias"
                items={safeStats.blog.topPosts.last365d}
              />
            </CardContent>
          </Card>
        </div>

        {/* ONBOARDING */}
        <div className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.4em] text-cyan-200">
            Onboarding & Leads
          </h2>
          <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#fdd87c]">
                <Mail className="h-5 w-5 text-orange-400" />
                Pending Onboarding
              </CardTitle>
              <CardDescription className="text-slate-200">
                Estados e responsáveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-200">
              <div className="grid md:grid-cols-3 gap-4">
                <StatTile
                  label="Pendentes (total)"
                  value={safeStats.onboarding.pendingTotal}
                />
                <StatTile
                  label="Por abrir"
                  value={safeStats.onboarding.pendingPorAbrir}
                />
                <StatTile
                  label="Estados distintos"
                  value={onboardingStatusEntries.length}
                />
              </div>
              {onboardingStatusEntries.length > 0 && (
                <div className="grid md:grid-cols-3 gap-3 text-xs">
                  {onboardingStatusEntries.map(([status, count]) => (
                    <div
                      key={status}
                      className="rounded border border-white/10 bg-[#021824]/80 p-3 shadow-[0_15px_40px_rgba(3,10,25,0.45)]"
                    >
                      <div className="font-semibold text-[#fdd87c]">
                        {status}
                      </div>
                      <div className="text-sm text-slate-200">{count}</div>
                    </div>
                  ))}
                </div>
              )}
              {Object.keys(safeStats.onboarding.byResponsible || {}).length >
                0 && (
                <div className="space-y-2 text-xs">
                  <div className="font-semibold text-[#fdd87c]">
                    Responsáveis (by user_id)
                  </div>
                  <div className="grid md:grid-cols-4 gap-2">
                    {Object.entries(safeStats.onboarding.byResponsible).map(
                      ([uid, count]) => (
                        <div
                          key={uid}
                          className="rounded border border-white/10 bg-[#021824]/80 p-2 shadow-[0_10px_30px_rgba(3,10,25,0.45)]"
                        >
                          <div className="text-[11px] text-slate-200 break-all">
                            {uid}
                          </div>
                          <div className="text-sm font-semibold text-slate-200">
                            {count}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* HOUSES */}
        <div className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.4em] text-cyan-200">
            Houses of Sports
          </h2>
          <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#fdd87c]">
                <Building2 className="h-5 w-5 text-amber-400" />
                Houses of Sports
              </CardTitle>
              <CardDescription className="text-slate-200">
                Visão geral de estado.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-4 text-slate-200">
              <StatTile label="Total" value={safeStats.houses.total} />
              <StatTile label="Active" value={safeStats.houses.active} />
              <StatTile label="Building" value={safeStats.houses.building} />
              <StatTile
                label="Developing"
                value={safeStats.houses.developing}
              />
            </CardContent>
          </Card>
        </div>

        {/* BOTÃO + INSIGHTS AVANÇADOS */}
        <div className="space-y-4 border-t border-white/10 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-[#fdd87c]">
              Advanced Insights
            </h2>

            <Button
              variant="default"
              size="sm"
              className={`bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_40px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045] ${
                showAdvanced ? 'opacity-90' : ''
              }`}
              onClick={() => setShowAdvanced((prev) => !prev)}
            >
              {showAdvanced ? 'Esconder insights' : 'Mostrar insights'}
            </Button>
          </div>

          {showAdvanced && (
            <div className="space-y-8">
              {advancedError && (
                <p className="text-sm text-red-400">{advancedError}</p>
              )}

              {/* User Growth */}
              <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-[0.4em] text-cyan-200">
                    User Growth (Monthly)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-200">
                  {loadingAdvanced && !advanced ? (
                    <p className="text-sm text-slate-200">
                      A carregar...
                    </p>
                  ) : (
                    <UserGrowthChart
                      data={
                        userGrowthData.length
                          ? userGrowthData
                          : [
                              { date: 'M-1', count: 0 },
                              { date: 'M-2', count: 0 },
                            ]
                      }
                    />
                  )}
                </CardContent>
              </Card>

              {/* Course Engagement */}
              <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-[0.4em] text-cyan-200">
                    Course Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-200">
                  {loadingAdvanced && !advanced ? (
                    <p className="text-sm text-slate-200">
                      A carregar...
                    </p>
                  ) : (
                    <CourseEngagementChart data={courseEngagementData} />
                  )}
                </CardContent>
              </Card>

              {/* Weekly Engagement */}
              <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-[0.4em] text-cyan-200">
                    User Activity (Weekly)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-200">
                  {loadingAdvanced && !advanced ? (
                    <p className="text-sm text-slate-200">
                      A carregar...
                    </p>
                  ) : (
                    <EngagementChart data={weeklyEngagementData} />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
