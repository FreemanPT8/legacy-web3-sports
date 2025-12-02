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

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // 🔹 Dados mock temporários (até ligarmos ao backend avançado)
  const userGrowthData = [
    { date: 'Jan', count: 120 },
    { date: 'Feb', count: 150 },
    { date: 'Mar', count: 210 },
    { date: 'Apr', count: 280 },
    { date: 'May', count: 320 },
    { date: 'Jun', count: 400 },
  ];

  const courseEngagementData = [
    { course: 'Blockchain Basics', completions: 72 },
    { course: 'Apertum Explorer', completions: 63 },
    { course: 'DAO1 Tools', completions: 51 },
    { course: 'Security & Web3', completions: 34 },
  ];

  const engagementData = [
    { week: 'Week 1', lessons: 22, courses: 8, blog: 12, xp: 180 },
    { week: 'Week 2', lessons: 31, courses: 12, blog: 19, xp: 260 },
    { week: 'Week 3', lessons: 27, courses: 10, blog: 17, xp: 220 },
    { week: 'Week 4', lessons: 40, courses: 15, blog: 21, xp: 340 },
  ];

  useEffect(() => {
    if (
      !loading &&
      (!user || (user.role !== 'Admin' && user.role !== 'Super Admin'))
    ) {
      router.push('/login');
    }
  }, [user, loading, router]);

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

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950">
        <div className="flex min-h-[calc(100vh-120px)]">
          {/* Sidebar fixa do painel admin */}
          <AdminSidebar />

          {/* Conteúdo principal */}
          <div className="flex-1 p-6 md:p-10 space-y-12">
            {/* Título */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Realtime analytics & management tools for the entire Legacy
                platform.
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
                    Admins: {stats?.totalAdmins ?? '—'} | Super Admins:{' '}
                    {stats?.totalSuperAdmins ?? '—'}
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
                    {stats?.totalCourses ?? '—'}
                  </div>
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

            {/* 📊 ADVANCED INSIGHTS (CHARTS) */}
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

            {/* BLOCO DE GESTÃO PRINCIPAL (links para secções admin) */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    View, edit, and manage user accounts and permissions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/users">Manage Users</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    Course Management
                  </CardTitle>
                  <CardDescription>
                    Create, edit, and organize courses, modules, and lessons.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/courses">Manage Courses</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Blog Management
                  </CardTitle>
                  <CardDescription>
                    Create and publish blog articles in multiple languages.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/blog">Manage Blog</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Houses of Sports
                  </CardTitle>
                  <CardDescription>
                    Manage Houses, Heads of House and House Moderators.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/houses">Manage Houses</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-orange-500" />
                    Onboarding Submissions
                  </CardTitle>
                  <CardDescription>
                    Review and respond to personalized onboarding requests.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/onboarding">View Submissions</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                    Forum Moderation
                  </CardTitle>
                  <CardDescription>
                    Monitor and moderate forum discussions and content.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/forum">Moderate Forum</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    XP Management
                  </CardTitle>
                  <CardDescription>
                    Manually award or adjust user XP and view transactions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/xp">Manage XP</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                    Analytics
                  </CardTitle>
                  <CardDescription>
                    View platform statistics, user engagement, and growth
                    metrics.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/analytics">View Analytics</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-600" />
                    Platform Settings & Permissions
                  </CardTitle>
                  <CardDescription>
                    Configure platform settings and manage admin permissions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/settings/permissions">Permissions</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
