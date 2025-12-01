'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  LayoutDashboard,
} from 'lucide-react';

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

  // PROTEÇÃO DE ACESSO
  useEffect(() => {
    if (!loading && (!user || (user.role !== 'Admin' && user.role !== 'Super Admin'))) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // CARREGAR ESTATÍSTICAS
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (data.success) setStats(data.stats as AdminStats);
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

        {/* LAYOUT EM 2 COLUNAS: MENU LATERAL + CONTEÚDO */}
        <div className="flex min-h-[calc(100vh-120px)]">

          {/* -------------------------------------- */}
          {/* MENU LATERAL FIXO */}
          {/* -------------------------------------- */}
          <aside
            className="
              w-64
              bg-white dark:bg-gray-900
              border-r border-gray-200 dark:border-gray-800
              p-6
              hidden md:flex flex-col gap-6
              sticky top-0 h-[calc(100vh-120px)]
            "
          >
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                <LayoutDashboard className="h-5 w-5 text-blue-600" />
                Admin Panel
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ferramentas de gestão
              </p>
            </div>

            <nav className="flex flex-col gap-2">

              {/* Users */}
              <Link href="/admin/users">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </Button>
              </Link>

              {/* Courses */}
              <Link href="/admin/courses">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <BookOpen className="h-4 w-4" />
                  Courses
                </Button>
              </Link>

              {/* Blog */}
              <Link href="/admin/blog">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  Blog
                </Button>
              </Link>

              {/* Houses */}
              <Link href="/admin/houses">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Houses of Sports
                </Button>
              </Link>

              {/* Onboarding */}
              <Link href="/admin/onboarding">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Mail className="h-4 w-4" />
                  Onboarding
                </Button>
              </Link>

              {/* Forum */}
              <Link href="/admin/forum">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Forum
                </Button>
              </Link>

              {/* XP */}
              <Link href="/admin/xp">
                <Button variant="ghost" className="w-full justify-start gap-2 text-blue-700">
                  <Award className="h-4 w-4" />
                  XP Management
                </Button>
              </Link>

              {/* Analytics */}
              <Link href="/admin/analytics">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Button>
              </Link>

              {/* Settings */}
              <Link href="/admin/settings/permissions">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  Permissions
                </Button>
              </Link>

            </nav>
          </aside>

          {/* -------------------------------------- */}
          {/* CONTEÚDO PRINCIPAL */}
          {/* -------------------------------------- */}
          <div className="flex-1 p-6 md:p-10">

            {/* Header do Painel */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-1">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage LEGACY platform content, users and sports Houses.
              </p>
            </div>

            {/* Estatísticas rápidas */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">

              {/* TOTAL USERS */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Total Users
                  </CardTitle>
                  <CardDescription>This month&apos;s user base</CardDescription>
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

              {/* COURSES */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-green-600" />
                    Active Courses
                  </CardTitle>
                  <CardDescription>Courses and lessons</CardDescription>
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

              {/* BLOG */}
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
                  <p className="text-xs text-gray-500 mt-1">Multilingual content</p>
                </CardContent>
              </Card>

              {/* ONBOARDING */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap=2">
                    <Mail className="h-4 w-4 text-orange-500" />
                    Pending Onboarding
                  </CardTitle>
                  <CardDescription>New House / platform requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats?.totalOnboardingPending ?? '—'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Houses */}
            <div className="grid md:grid-cols-3 gap-4 mb-10">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Sports Houses
                  </CardTitle>
                  <CardDescription>Total Houses of Sports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats?.totalHouses ?? '—'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Houses</CardTitle>
                  <CardDescription>Head of House + team</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats?.activeHouses ?? '—'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">In Construction / Development</CardTitle>
                  <CardDescription>Early-stage Houses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">
                    Building: {stats?.buildingHouses ?? '—'}
                  </div>
                  <div className="text-lg font-semibold">
                    Developing: {stats?.developingHouses ?? '—'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CARDS DE GESTÃO PRINCIPAL */}
            <div className="grid md:grid-cols-3 gap-6 mb-20">
              
              {/* USERS */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    View, edit, and manage user accounts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/users">Manage Users</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* COURSES */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    Course Management
                  </CardTitle>
                  <CardDescription>
                    Organise courses, modules and lessons.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/courses">Manage Courses</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* BLOG */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Blog Management
                  </CardTitle>
                  <CardDescription>
                    Create and publish articles.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/blog">Manage Blog</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* HOUSES */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Houses of Sports
                  </CardTitle>
                  <CardDescription>
                    Manage Houses, Heads and teams.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/houses">Manage Houses</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* ONBOARDING */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-orange-500" />
                    Onboarding Submissions
                  </CardTitle>
                  <CardDescription>
                    Personalised onboarding requests.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/onboarding">View Submissions</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* FORUM */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                    Forum Moderation
                  </CardTitle>
                  <CardDescription>
                    Moderate discussions and reports.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/forum">Moderate Forum</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* XP */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    XP Management
                  </CardTitle>
                  <CardDescription>
                    Award, adjust and analyse XP.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/xp">Manage XP</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* ANALYTICS */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                    Analytics
                  </CardTitle>
                  <CardDescription>
                    Track progress and engagement.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/admin/analytics">View Analytics</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* SETTINGS */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-600" />
                    Permissions & Settings
                  </CardTitle>
                  <CardDescription>
                    Manage admin-level roles & policy.
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
