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

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'Admin' && user.role !== 'Super Admin'))) {
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

  if (loading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950">
        <div className="flex min-h-[calc(100vh-120px)]">
          {/* Sidebar unificada */}
          <AdminSidebar />

          {/* Conteúdo principal */}
          <div className="flex-1 p-6 md:p-10">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-1">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage LEGACY platform content, users and sports Houses.
              </p>
            </div>

            {/* Top stats */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
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
                    Admins: {loadingStats || !stats ? '—' : stats.totalAdmins} | Super
                    Admins: {loadingStats || !stats ? '—' : stats.totalSuperAdmins}
                  </p>
                </CardContent>
              </Card>

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
                    {loadingStats || !stats ? '—' : stats.totalCourses}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {loadingStats || !stats ? '—' : stats.totalLessons} total lessons
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
                    {loadingStats || !stats ? '—' : stats.totalBlogPosts}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Multilingual content
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-orange-500" />
                    Pending Onboarding
                  </CardTitle>
                  <CardDescription>
                    New House / platform requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loadingStats || !stats ? '—' : stats.totalOnboardingPending}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Houses stats */}
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
                    {loadingStats || !stats ? '—' : stats.totalHouses}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Houses
                  </CardTitle>
                  <CardDescription>
                    Head of House + min. core team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loadingStats || !stats ? '—' : stats.activeHouses}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    In Construction / Development
                  </CardTitle>
                  <CardDescription>
                    Reserved or early-stage Houses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">
                    Building:{' '}
                    {loadingStats || !stats ? '—' : stats.buildingHouses}
                  </div>
                  <div className="text-lg font-semibold">
                    Developing:{' '}
                    {loadingStats || !stats ? '—' : stats.developingHouses}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main management cards */}
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
                    View platform statistics, user engagement, and growth metrics.
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
