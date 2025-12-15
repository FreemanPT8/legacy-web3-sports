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
    <div className="rounded-lg border border-border bg-card/80 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">
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
    <Card className="border border-dashed border-border bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {items && items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate text-foreground">
                {(item.title as any)?.pt ??
                  (item.title as any)?.en ??
                  item.title ??
                  '—'}
              </span>
              <span className="font-semibold text-foreground">
                {(item.views ?? 0).toLocaleString('pt-PT')}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">Sem dados</p>
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
    <div className="w-full space-y-8">
      {/* HERO */}
      <section className="mt-2 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4 py-6 md:px-6 md:py-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl">
          <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 mb-3 border border-white/10">
            LEGACY Admin — Overview
          </span>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Visão rápida sobre utilizadores, cursos, blog,
            onboarding e Houses of Sports. Um painel para
            perceber se o LEGACY está a crescer de forma
            saudável ou se algo precisa da tua atenção.
          </p>

          {statsError && (
            <p className="mt-3 text-xs text-red-400">{statsError}</p>
          )}
        </div>
      </section>

      {/* BLOCOS PRINCIPAIS */}
      <section className="space-y-8">
        {/* USERS */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-custom">
            Utilizadores
          </h2>
          <Card className="bg-card-custom border-custom shadow-lg shadow-slate-950/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-heading">
                <Users className="h-5 w-5 text-blue-400" />
                Users
              </CardTitle>
              <CardDescription className="text-muted-custom">
                Base de utilizadores e registos recentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-4 text-body">
              <div className="rounded-lg border-custom bg-card-custom p-3">
                <p className="text-xs text-muted-custom">Total</p>
                <p className="text-3xl font-bold text-heading">
                  {loadingStats ? '...' : formatNumber(safeStats.users.total)}
                </p>
                <p className="text-xs text-muted-custom mt-1">
                  Super Admin: {formatNumber(safeStats.users.superAdmins)} |{' '}
                  Admin: {formatNumber(safeStats.users.admins)} | Members:{' '}
                  {formatNumber(safeStats.users.members)}
                </p>
              </div>
              <div className="rounded-lg border-custom bg-card-custom p-3">
                <p className="text-xs text-muted-custom">Novos (24h)</p>
                <p className="text-3xl font-bold text-heading">
                  {formatNumber(safeStats.users.new24h)}
                </p>
                <p className="text-xs text-muted-custom mt-1">
                  Últimas 24 horas
                </p>
              </div>
              <div className="rounded-lg border-custom bg-card-custom p-3">
                <p className="text-xs text-muted-custom">Novos (30d)</p>
                <p className="text-3xl font-bold text-heading">
                  {formatNumber(safeStats.users.new30d)}
                </p>
                <p className="text-xs text-muted-custom mt-1">
                  Últimos 30 dias
                </p>
              </div>
              <div className="rounded-lg border-custom bg-card-custom p-3">
                <p className="text-xs text-muted-custom">
                  XP Total (todas ações)
                </p>
                <p className="text-xl font-semibold text-heading">
                  {formatNumber(safeStats.courses.xp.allActions.total)}
                </p>
                <p className="text-[11px] text-muted-custom">
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-custom">
            Conteúdo educativo
          </h2>
          <Card className="bg-card-custom border-custom shadow-lg shadow-blue-950/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-heading">
                <BookOpen className="h-5 w-5 text-emerald-400" />
                Active Courses
              </CardTitle>
              <CardDescription className="text-muted-custom">
                Cursos, módulos, lições e distribuição de XP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-body">
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
                <Card className="border-custom border-dashed bg-card-custom">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-heading">
                      <Activity className="h-4 w-4 text-emerald-400" />
                      XP Distribuído (Total)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-body">
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
                <Card className="border-custom border-dashed bg-card-custom">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-heading">
                      <TrendingUp className="h-4 w-4 text-blue-400" />
                      XP (Últimas 24h)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-body">
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
                <Card className="border-custom border-dashed bg-card-custom">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-heading">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                      XP (Últimos 30d)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-body">
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-custom">
            Blog & Educação contínua
          </h2>
          <Card className="bg-card-custom border-custom shadow-lg shadow-purple-950/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-heading">
                <FileText className="h-5 w-5 text-purple-400" />
                Blog Posts
              </CardTitle>
              <CardDescription className="text-muted-custom">
                Publicados, XP distribuído e visualizações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-body">
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
                <Card className="border-custom border-dashed bg-card-custom">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-heading">
                      <BarChart3 className="h-4 w-4 text-slate-300" />
                      Visualizações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-body">
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-custom">
            Onboarding & Leads
          </h2>
          <Card className="bg-card-custom border-custom shadow-lg shadow-orange-950/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-heading">
                <Mail className="h-5 w-5 text-orange-400" />
                Pending Onboarding
              </CardTitle>
              <CardDescription className="text-muted-custom">
                Estados e responsáveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-body">
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
                      className="rounded border-custom bg-card-custom p-3"
                    >
                      <div className="font-semibold text-heading">
                        {status}
                      </div>
                      <div className="text-sm text-body">{count}</div>
                    </div>
                  ))}
                </div>
              )}
              {Object.keys(safeStats.onboarding.byResponsible || {}).length >
                0 && (
                <div className="space-y-2 text-xs">
                  <div className="font-semibold text-heading">
                    Responsáveis (by user_id)
                  </div>
                  <div className="grid md:grid-cols-4 gap-2">
                    {Object.entries(safeStats.onboarding.byResponsible).map(
                      ([uid, count]) => (
                        <div
                          key={uid}
                          className="rounded border-custom bg-card-custom p-2"
                        >
                          <div className="text-[11px] text-muted-custom break-all">
                            {uid}
                          </div>
                          <div className="text-sm font-semibold text-body">
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-custom">
            Houses of Sports
          </h2>
          <Card className="bg-card-custom border-custom shadow-lg shadow-amber-950/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-heading">
                <Building2 className="h-5 w-5 text-amber-400" />
                Houses of Sports
              </CardTitle>
              <CardDescription className="text-muted-custom">
                Visão geral de estado.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-4 text-body">
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
        <div className="space-y-4 border-t border-slate-800/70 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-heading">
              Advanced Insights
            </h2>

            <Button
              variant="outline"
              size="sm"
              className="border-blue-500/60 text-blue-100 hover:bg-blue-950/40"
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
              <Card className="bg-card-custom border-custom">
                <CardHeader>
                  <CardTitle className="text-heading">
                    User Growth (Monthly)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-body">
                  {loadingAdvanced && !advanced ? (
                    <p className="text-sm text-muted-custom">
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
              <Card className="bg-card-custom border-custom">
                <CardHeader>
                  <CardTitle className="text-heading">
                    Course Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-body">
                  {loadingAdvanced && !advanced ? (
                    <p className="text-sm text-muted-custom">
                      A carregar...
                    </p>
                  ) : (
                    <CourseEngagementChart data={courseEngagementData} />
                  )}
                </CardContent>
              </Card>

              {/* Weekly Engagement */}
              <Card className="bg-card-custom border-custom">
                <CardHeader>
                  <CardTitle className="text-heading">
                    User Activity (Weekly)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-body">
                  {loadingAdvanced && !advanced ? (
                    <p className="text-sm text-muted-custom">
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
