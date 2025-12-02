'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

import {
  Users,
  BookOpen,
  FileText,
  Trophy,
  Mail,
  MessageCircle,
  Award,
  BarChart3,
  Settings,
} from 'lucide-react';

import { AdminSidebar } from '@/components/admin/AdminSidebar';

// Charts
import { UserGrowthChart } from '@/components/admin/charts/UserGrowthChart';
import { CourseEngagementChart } from '@/components/admin/charts/CourseEngagementChart';
import { EngagementChart } from '@/components/admin/charts/EngagementChart';

type AdminStats = {
  totalUsers: number;
  totalAdmins: number;
  totalSuperAdmins: number;
  totalCourses: number;
  totalLessons: number;
  totalBlogPosts: number;
  totalOnboardingPending: number;
  totalHouses: number;
  activeHouses: number;
  buildingHouses: number;
  developingHouses: number;
};

type AdvancedStats = {
  userGrowthMonthly: { month: string; users: number }[];
  courseCompletions: { course: string; completions: number }[];
  weeklyEngagement: { week: string; lessons: number; courses: number; blog: number; xp: number }[];
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // CHART DATA (REAL)
  const [userGrowthData, setUserGrowthData] = useState<AdvancedStats['userGrowthMonthly']>([]);
  const [courseEngagementData, setCourseEngagementData] = useState<AdvancedStats['courseCompletions']>([]);
  const [engagementData, setEngagementData] = useState<AdvancedStats['weeklyEngagement']>([]);

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'Admin' && user.role !== 'Super Admin'))) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch base stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const res = await fetch('/api/admin/stats');
        const data = await res.json();

        if (data.success) {
          setStats(data.stats as AdminStats);
        }
      } catch (err) {
        console.error('Error loading admin stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // Fetch advanced analytics
  useEffect(() => {
    const fetchAdvanced = async () => {
      try {
        const res = await fetch('/api/admin/stats/advanced');
        const data = await res.json();

        if (data.success) {
          setUserGrowthData(data.userGrowthMonthly || []);
          setCourseEngagementData(data.courseCompletions || []);
          setEngagementData(data.weeklyEngagement || []);
        }
      } catch (err) {
        console.error('Error loading advanced analytics:', err);
      }
    };

    fetchAdvanced();
  }, []);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950">
        <div className="flex min-h-[calc(100vh-120px)]">
          <AdminSidebar />

          <div className="flex-1 p-6 md:p-10 space-y-12">
            {/* Title */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Realtime analytics & management tools for the entire Legacy platform.
              </p>
            </div>

            {/* TOP STATS */}
            <div className="grid md:grid-cols-4 gap-4 mb-4">
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
                    {loadingStats || !stats ? '—' : stats.totalUsers}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Admins: {stats?.totalAdmins ?? '—'} | Super Admins: {stats?.totalSuperAdmins ?? '—'}
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
                  <div className="text-3xl font-bold">{stats?.totalCourses ?? '—'}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.totalLessons ?? '—'} total lessons
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
                    {stats?.totalBlogPosts ?? '—'}
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
                    {stats?.totalOnboardingPending ?? '—'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ADVANCED ANALYTICS */}
            <div className="space-y-10">
              <h2 className="text-xl font-semibold">📈 Advanced Insights</h2>

              <Card>
                <CardHeader>
                  <CardTitle>User Growth (Monthly)</CardTitle>
                </CardHeader>
                <CardContent>
                  <UserGrowthChart data={userGrowthData} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Course Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <CourseEngagementChart data={courseEngagementData} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Activity (Weekly)</CardTitle>
                </CardHeader>
                <CardContent>
                  <EngagementChart data={engagementData} />
                </CardContent>
              </Card>
            </div>

            {/* Management Blocks */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    User Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/users">Manage Users</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Outras cards mantêm-se iguais */}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
