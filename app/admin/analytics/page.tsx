'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
  import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Users,
  BookOpen,
  Award,
  Target,
  Calendar,
  Activity,
  Layers,
  Bookmark,
  Globe,
  Sparkles,
} from 'lucide-react';

type AdminStats = {
  totalUsers?: number;
  totalAdmins?: number;
  totalSuperAdmins?: number;
  totalCourses?: number;
  totalLessons?: number;
  totalBlogPosts?: number;
  totalOnboardingPending?: number;
  totalHouses?: number;
  activeHouses?: number;
  buildingHouses?: number;
  developingHouses?: number;
};

type UserRow = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  role?: string | null;
  xp_total?: number | null;
  created_at?: string | null;
};

type CourseRow = {
  id: string;
  title?: any;
  published?: boolean | null;
  is_published?: boolean | null;
  lessons?: any[];
};

type BlogRow = {
  id: string;
  title?: any;
  published?: boolean | null;
  status?: string | null;
  views?: number | null;
  xp_total_distributed?: number | null;
};

type OnboardingRow = {
  id: string;
  status?: string | null;
  assigned_to_user_id?: string | null;
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();

  const [stats, setStats] = useState<AdminStats>({});
  const [users, setUsers] = useState<UserRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (
      !loading &&
      user &&
      user.role !== 'Super Admin' &&
      user.role !== 'Admin'
    ) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoadingData(true);
      try {
        const token = getToken();
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        const [
          statsRes,
          usersRes,
          coursesRes,
          blogsRes,
          housesRes,
          onboardingRes,
        ] = await Promise.all([
          fetch('/api/admin/stats', { headers }),
          fetch('/api/admin/users', { headers }),
          fetch('/api/admin/courses', { headers }),
          fetch('/api/admin/blog', { headers }),
          fetch('/api/admin/houses', { headers }),
          fetch('/api/admin/onboarding', { headers }).catch(() => null),
        ]);

        const [
          statsData,
          usersData,
          coursesData,
          blogsData,
          housesData,
          onboardingData,
        ] = await Promise.all([
          statsRes.json(),
          usersRes.json(),
          coursesRes.json(),
          blogsRes.json(),
          housesRes.json(),
          onboardingRes ? onboardingRes.json() : null,
        ]);

        if (statsData?.success) setStats(statsData);
        if (usersData?.success) setUsers(usersData.users || []);
        if (coursesData?.success) setCourses(coursesData.courses || []);
        if (blogsData?.success) setBlogs(blogsData.posts || []);
        if (housesData?.success) setHouses(housesData.houses || []);
        if (onboardingData?.success)
          setOnboarding(onboardingData.submissions || []);
      } catch (err) {
        console.error('Error loading analytics data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchAll();
    }
  }, [user, getToken]);

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin')
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  const totalUsers = stats.totalUsers ?? users.length;
  const totalAdmins = stats.totalAdmins ?? 0;
  const totalSuperAdmins = stats.totalSuperAdmins ?? 0;
  const totalCourses = stats.totalCourses ?? courses.length;
  const totalBlogPosts = stats.totalBlogPosts ?? blogs.length;
  const totalLessons = stats.totalLessons ?? 0;
  const totalOnboardingPending = stats.totalOnboardingPending ?? 0;
  const totalHouses = stats.totalHouses ?? houses.length;
  const housesMissingHead = houses.filter((h) => !h.head).length;

  const activeUsers = users.filter((u) => (u.xp_total || 0) > 0).length;
  const totalXP = users.reduce(
    (acc, u) => acc + (u.xp_total || 0),
    0,
  );

  const topUsers = useMemo(
    () =>
      [...users]
        .sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0))
        .slice(0, 5),
    [users],
  );

  const publishedCourses = courses.filter(
    (c) => c.is_published ?? c.published,
  ).length;
  const draftCourses = totalCourses - publishedCourses;

  const publishedPosts = blogs.filter(
    (p) => p.status === 'published' || p.published,
  ).length;
  const draftPosts = totalBlogPosts - publishedPosts;

  const topBlogByViews = [...blogs]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 3);

  const topBlogByXP = [...blogs]
    .sort((a, b) => (b.xp_total_distributed || 0) - (a.xp_total_distributed || 0))
    .slice(0, 3);

  const onboardingTotal = onboarding.length;
  const onboardingDone = onboarding.filter((o) =>
    ['ONBOARDING_LEGACY', 'ONBOARDING_DAO1', 'ONBOARDING_TELEGRAM'].includes(
      o.status || '',
    ),
  ).length;
  const onboardingConversion =
    onboardingTotal > 0 ? Math.round((onboardingDone / onboardingTotal) * 100) : 0;

  const publishedRateCourses =
    totalCourses > 0 ? Math.round((publishedCourses / totalCourses) * 100) : 0;
  const publishedRateBlog =
    totalBlogPosts > 0 ? Math.round((publishedPosts / totalBlogPosts) * 100) : 0;

  const now = Date.now();
  const dailyActiveUsers = users.filter((u) => {
    if (!u.last_login) return false;
    const ts = new Date(u.last_login).getTime();
    return now - ts <= 24 * 60 * 60 * 1000;
  }).length;
  const completionRateUsers =
    totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

  const onboardingByStatus = onboarding.reduce(
    (acc: Record<string, number>, o) => {
      const st = o.status || 'UNKNOWN';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Platform Analytics</h1>
              <p className="text-gray-600 dark:text-gray-300">
                Users, Onboarding, Courses, Blog, Houses, and Leaderboard at a glance.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="bg-white"
            >
              Refresh
            </Button>
          </div>

          {/* Highlights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Highlights
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-4">
              <Metric label="Onboarding conversion" value={`${onboardingConversion}%`} />
              <Metric label="Courses published" value={`${publishedRateCourses}%`} />
              <Metric label="Blog published" value={`${publishedRateBlog}%`} />
              <Metric
                label="Houses missing Head"
                value={`${housesMissingHead}/${totalHouses}`}
                highlight={housesMissingHead > 0}
              />
            </CardContent>
          </Card>

          {/* Usuários */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-4">
              <Metric label="Total Users" value={totalUsers} />
              <Metric label="Active Users" value={activeUsers} />
              <Metric label="Admins" value={totalAdmins} />
              <Metric label="Super Admins" value={totalSuperAdmins} />
              <Metric
                label="Total XP"
                value={totalXP.toLocaleString()}
                highlight
              />
              <Metric
                label="Avg XP per user"
                value={Math.round(totalXP / (totalUsers || 1))}
              />
            </CardContent>
          </Card>

          {/* Onboarding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-600" />
                Onboarding
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-4">
              <Metric label="Pending (dashboard)" value={totalOnboardingPending} />
              {Object.entries(onboardingByStatus).map(([st, val]) => (
                <Metric key={st} label={st} value={val} />
              ))}
            </CardContent>
          </Card>

          {/* Courses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Courses & Lessons
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-4">
              <Metric label="Total Courses" value={totalCourses} />
              <Metric label="Published" value={publishedCourses} />
              <Metric label="Draft" value={draftCourses} />
              <Metric label="Total Lessons" value={totalLessons} />
            </CardContent>
          </Card>

          {/* Blog */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-purple-600" />
                Blog
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-4">
              <Metric label="Total Posts" value={totalBlogPosts} />
              <Metric label="Published" value={publishedPosts} />
              <Metric label="Draft" value={draftPosts} />
              <Metric
                label="Views (top post)"
                value={topBlogByViews[0]?.views || 0}
              />
              <div className="md:col-span-2 space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Top Posts by Views
                </h4>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
                  {topBlogByViews.map((p) => (
                    <li key={p.id} className="flex justify-between">
                      <span>{p.id.slice(0, 8)}…</span>
                      <span>{p.views || 0} views</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-2 space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Top Posts by XP
                </h4>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
                  {topBlogByXP.map((p) => (
                    <li key={p.id} className="flex justify-between">
                      <span>{p.id.slice(0, 8)}…</span>
                      <span>{p.xp_total_distributed || 0} XP</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Houses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-amber-600" />
                Houses of Sports
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-4">
              <Metric label="Total Houses" value={totalHouses} />
              <Metric
                label="Active"
                value={stats.activeHouses ?? 0}
              />
              <Metric
                label="Building"
                value={stats.buildingHouses ?? 0}
              />
              <Metric
                label="Developing"
                value={stats.developingHouses ?? 0}
              />
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Leaderboard (XP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topUsers.length === 0 ? (
                <p className="text-sm text-gray-500">No users found.</p>
              ) : (
                <div className="space-y-2">
                  {topUsers.map((u, idx) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{idx + 1}</Badge>
                        <div className="text-sm">
                          <div className="font-semibold">
                            {u.full_name || u.username || 'User'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {u.role || 'Member'}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        {u.xp_total || 0} XP
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <Metric label="Daily Active (24h login)" value={dailyActiveUsers} />
              <Metric label="Active Users (XP>0)" value={activeUsers} />
              <Metric label="Engagement rate" value={`${completionRateUsers}%`} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`text-xl font-semibold ${
          highlight ? 'text-blue-700 dark:text-blue-400' : ''
        }`}
      >
        {value}
      </div>
    </div>
  );
}
