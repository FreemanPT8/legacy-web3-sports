'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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
  Eye,
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
      allActions: { total: number; last24h: number; last30d: number };
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

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3 bg-white">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-semibold">{(value ?? 0).toLocaleString('pt-PT')}</p>
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
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {items && items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3">
              <span className="truncate">{(item.title as any)?.pt ?? (item.title as any)?.en ?? item.title ?? '—'}</span>
              <span className="font-semibold">{(item.views ?? 0).toLocaleString('pt-PT')}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-500">Sem dados</p>
        )}
      </CardContent>
    </Card>
  );
}

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
        setAdvancedError(
          dataAdv.error || 'Failed to load advanced insights',
        );
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
      members: (stats?.totalUsers ?? 0) - (stats?.totalAdmins ?? 0) - (stats?.totalSuperAdmins ?? 0),
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
    <div className="space-y-10">
      {/* TÍTULO */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Realtime analytics & management tools for the entire Legacy platform.
        </p>

        {statsError && (
          <p className="mt-2 text-sm text-red-600">{statsError}</p>
        )}
      </div>

      {/* USERS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Users
          </CardTitle>
          <CardDescription>User base and recent signups.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-4">
          <div className="rounded-lg border p-3 bg-white">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-3xl font-bold">{loadingStats ? '...' : formatNumber(safeStats.users.total)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Super Admin: {formatNumber(safeStats.users.superAdmins)} | Admin:{' '}
              {formatNumber(safeStats.users.admins)} | Members:{' '}
              {formatNumber(safeStats.users.members)}
            </p>
          </div>
          <div className="rounded-lg border p-3 bg-white">
            <p className="text-xs text-gray-500">Novos (24h)</p>
            <p className="text-3xl font-bold">{formatNumber(safeStats.users.new24h)}</p>
            <p className="text-xs text-gray-500 mt-1">Últimas 24 horas</p>
          </div>
          <div className="rounded-lg border p-3 bg-white">
            <p className="text-xs text-gray-500">Novos (30d)</p>
            <p className="text-3xl font-bold">{formatNumber(safeStats.users.new30d)}</p>
            <p className="text-xs text-gray-500 mt-1">Últimos 30 dias</p>
          </div>
          <div className="rounded-lg border p-3 bg-white">
            <p className="text-xs text-gray-500">XP Total (todas ações)</p>
            <p className="text-xl font-semibold">
              {formatNumber(safeStats.courses.xp.allActions.total)}
            </p>
            <p className="text-[11px] text-gray-500">
              24h: {formatNumber(safeStats.courses.xp.allActions.last24h)} | 30d:{' '}
              {formatNumber(safeStats.courses.xp.allActions.last30d)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* COURSES / MODULES / LESSONS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-600" />
            Active Courses
          </CardTitle>
          <CardDescription>Courses, modules, lessons and XP distribution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <StatTile label="Courses (published)" value={safeStats.courses.activeCourses} />
            <StatTile label="Total Courses" value={safeStats.courses.totalCourses} />
            <StatTile label="Modules" value={safeStats.courses.totalModules} />
            <StatTile label="Lessons" value={safeStats.courses.totalLessons} />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  XP Distribuído (Total)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>Cursos: {formatNumber(safeStats.courses.xp.totalCourses)}</div>
                <div>Módulos: {formatNumber(safeStats.courses.xp.totalModules)}</div>
                <div>Lições: {formatNumber(safeStats.courses.xp.totalLessons)}</div>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  XP (Últimas 24h)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>Cursos: {formatNumber(safeStats.courses.xp.last24h.courses)}</div>
                <div>Módulos: {formatNumber(safeStats.courses.xp.last24h.modules)}</div>
                <div>Lições: {formatNumber(safeStats.courses.xp.last24h.lessons)}</div>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  XP (Últimos 30d)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>Cursos: {formatNumber(safeStats.courses.xp.last30d.courses)}</div>
                <div>Módulos: {formatNumber(safeStats.courses.xp.last30d.modules)}</div>
                <div>Lições: {formatNumber(safeStats.courses.xp.last30d.lessons)}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* BLOG */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Blog Posts
          </CardTitle>
          <CardDescription>Publicados, XP distribuído e visualizações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <StatTile label="Publicados" value={safeStats.blog.totalPosts} />
            <StatTile label="XP total (blog)" value={safeStats.blog.xp.total} />
            <StatTile label="XP 24h" value={safeStats.blog.xp.last24h} />
            <StatTile label="XP 30d" value={safeStats.blog.xp.last30d} />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4 text-slate-600" />
                  Visualizações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>Total: {formatNumber(safeStats.blog.views.total)}</div>
                <div>Users com login: {formatNumber(safeStats.blog.views.logged)}</div>
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
          <TopList title="Top 365 dias" items={safeStats.blog.topPosts.last365d} />
        </CardContent>
      </Card>

      {/* ONBOARDING */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-500" />
            Pending Onboarding
          </CardTitle>
          <CardDescription>Estados e responsáveis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <StatTile label="Pendentes (total)" value={safeStats.onboarding.pendingTotal} />
            <StatTile label="Por abrir" value={safeStats.onboarding.pendingPorAbrir} />
            <StatTile label="Estados distintos" value={onboardingStatusEntries.length} />
          </div>
          {onboardingStatusEntries.length > 0 && (
            <div className="grid md:grid-cols-3 gap-3 text-xs">
              {onboardingStatusEntries.map(([status, count]) => (
                <div key={status} className="rounded border p-3 bg-white">
                  <div className="font-semibold">{status}</div>
                  <div className="text-sm">{count}</div>
                </div>
              ))}
            </div>
          )}
          {Object.keys(safeStats.onboarding.byResponsible || {}).length > 0 && (
            <div className="space-y-2 text-xs">
              <div className="font-semibold">Responsáveis (by user_id)</div>
              <div className="grid md:grid-cols-4 gap-2">
                {Object.entries(safeStats.onboarding.byResponsible).map(([uid, count]) => (
                  <div key={uid} className="rounded border p-2 bg-white">
                    <div className="text-[11px] text-gray-500 break-all">{uid}</div>
                    <div className="text-sm font-semibold">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* HOUSES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            Houses of Sports
          </CardTitle>
          <CardDescription>Status overview.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-4">
          <StatTile label="Total" value={safeStats.houses.total} />
          <StatTile label="Active" value={safeStats.houses.active} />
          <StatTile label="Building" value={safeStats.houses.building} />
          <StatTile label="Developing" value={safeStats.houses.developing} />
        </CardContent>
      </Card>

      {/* BOTÃO + INSIGHTS AVANÇADOS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Advanced Insights
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? 'Esconder insights' : 'Mostrar insights'}
          </Button>
        </div>

        {showAdvanced && (
          <div className="space-y-8">
            {advancedError && (
              <p className="text-sm text-red-600">{advancedError}</p>
            )}

            {/* User Growth */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth (Monthly)</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAdvanced && !advanced ? (
                  <p className="text-sm text-gray-500">A carregar...</p>
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
            <Card>
              <CardHeader>
                <CardTitle>Course Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAdvanced && !advanced ? (
                  <p className="text-sm text-gray-500">A carregar...</p>
                ) : (
                  <CourseEngagementChart data={courseEngagementData} />
                )}
              </CardContent>
            </Card>

            {/* Weekly Engagement */}
            <Card>
              <CardHeader>
                <CardTitle>User Activity (Weekly)</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAdvanced && !advanced ? (
                  <p className="text-sm text-gray-500">A carregar...</p>
                ) : (
                  <EngagementChart data={weeklyEngagementData} />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
