'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, FileText, Mail, Building2 } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { UserGrowthChart } from '@/components/admin/charts/UserGrowthChart';
import { CourseEngagementChart } from '@/components/admin/charts/CourseEngagementChart';
import { EngagementChart } from '@/components/admin/charts/EngagementChart';

type AdminStats = {
  totalUsers: number;
  totalAdmins: number;
  totalSuperAdmins: number;
  activeCourses: number;
  totalCourses: number;
  totalLessons: number;
  totalBlogPosts: number;
  totalOnboardingPending: number;
  onboardingByStatus?: Record<string, number>;
  totalHouses: number;
  activeHouses: number;
  buildingHouses: number;
  developingHouses: number;
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

  const safeStats = useMemo(
    () => ({
      totalUsers: stats?.totalUsers ?? 0,
      totalAdmins: stats?.totalAdmins ?? 0,
      totalSuperAdmins: stats?.totalSuperAdmins ?? 0,
      activeCourses: stats?.activeCourses ?? 0,
      totalCourses: stats?.totalCourses ?? 0,
      totalLessons: stats?.totalLessons ?? 0,
      totalBlogPosts: stats?.totalBlogPosts ?? 0,
      totalOnboardingPending: stats?.totalOnboardingPending ?? 0,
      onboardingByStatus: stats?.onboardingByStatus ?? {},
      totalHouses: stats?.totalHouses ?? 0,
      activeHouses: stats?.activeHouses ?? 0,
      buildingHouses: stats?.buildingHouses ?? 0,
      developingHouses: stats?.developingHouses ?? 0,
    }),
    [stats],
  );

  const onboardingStatusEntries = useMemo(
    () => Object.entries(safeStats.onboardingByStatus || {}),
    [safeStats.onboardingByStatus],
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950">
        <div className="flex min-h-[calc(100vh-120px)]">
          {/* Sidebar fixa */}
          <AdminSidebar />

          {/* Conteúdo principal */}
          <div className="flex-1 p-6 md:p-10 space-y-10">
            {/* TÍTULO */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Realtime analytics & management tools for the entire Legacy platform.
              </p>

              {statsError && (
                <p className="mt-2 text-sm text-red-600">{statsError}</p>
              )}
            </div>

            {/* TOP STATS - dados principais */}
            <div className="grid md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Total Users
                  </CardTitle>
                  <CardDescription>Active user base</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loadingStats ? '...' : safeStats.totalUsers}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Admins: {safeStats.totalAdmins} | Super Admins:{' '}
                    {safeStats.totalSuperAdmins}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-green-600" />
                    Active Courses
                  </CardTitle>
                  <CardDescription>Courses + lessons</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loadingStats ? '...' : safeStats.activeCourses}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {safeStats.totalCourses} total courses |{' '}
                    {safeStats.totalLessons} lessons
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    Blog Posts
                  </CardTitle>
                  <CardDescription>Published articles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loadingStats ? '...' : safeStats.totalBlogPosts}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-orange-500" />
                    Pending Onboarding
                  </CardTitle>
                  <CardDescription>New user onboarding forms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loadingStats ? '...' : safeStats.totalOnboardingPending}
                  </div>
                  {onboardingStatusEntries.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                      {onboardingStatusEntries.map(([status, count]) => (
                        <div
                          key={status}
                          className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1"
                        >
                          {status}: {count}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-600" />
                    Houses of Sports
                  </CardTitle>
                  <CardDescription>Status overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loadingStats ? '...' : safeStats.totalHouses}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                    <div className="rounded bg-green-50 dark:bg-green-900/20 px-2 py-1 text-green-700 dark:text-green-200">
                      Active: {safeStats.activeHouses}
                    </div>
                    <div className="rounded bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-blue-700 dark:text-blue-200">
                      Building: {safeStats.buildingHouses}
                    </div>
                    <div className="rounded bg-purple-50 dark:bg-purple-900/20 px-2 py-1 text-purple-700 dark:text-purple-200">
                      Developing: {safeStats.developingHouses}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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
        </div>
      </main>

      <Footer />
    </div>
  );
}
