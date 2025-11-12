'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, MessageSquare, FileText, Settings, TrendingUp, Award, Mail } from 'lucide-react';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  userGrowth: string;
  activeCourses: number;
  totalCourses: number;
  totalLessons: number;
  publishedPosts: number;
  totalPosts: number;
  pendingOnboarding: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchStats();
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300">Manage LEGACY platform content and users</p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="text-2xl font-bold text-gray-400">...</div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
                      <p className={`text-sm ${stats?.userGrowth.includes('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {stats?.userGrowth || '0%'} this month
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Courses</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="text-2xl font-bold text-gray-400">...</div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{stats?.activeCourses || 0}</div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{stats?.totalLessons || 0} total lessons</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Blog Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="text-2xl font-bold text-gray-400">...</div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{stats?.totalPosts || 0}</div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{stats?.publishedPosts || 0} published</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending Onboarding</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="text-2xl font-bold text-gray-400">...</div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{stats?.pendingOnboarding || 0}</div>
                      <p className="text-sm text-yellow-600">
                        {(stats?.pendingOnboarding || 0) > 0 ? 'Needs review' : 'All reviewed'}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link href="/admin/users">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <Users className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      View, edit, and manage user accounts and permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Manage Users
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/courses">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <BookOpen className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>Course Management</CardTitle>
                    <CardDescription>
                      Create, edit, and organize courses, modules, and lessons
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Manage Courses
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/blog">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <FileText className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>Blog Management</CardTitle>
                    <CardDescription>
                      Create and publish blog articles in multiple languages
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Manage Blog
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/onboarding">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <Mail className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>Onboarding Submissions</CardTitle>
                    <CardDescription>
                      Review and respond to personalized onboarding requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      View Submissions
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/forum">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <MessageSquare className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>Forum Moderation</CardTitle>
                    <CardDescription>
                      Monitor and moderate forum discussions and content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Moderate Forum
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/xp">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <Award className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>XP Management</CardTitle>
                    <CardDescription>
                      Manually award or adjust user XP and view transactions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Manage XP
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/analytics">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <TrendingUp className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>Analytics</CardTitle>
                    <CardDescription>
                      View platform statistics, user engagement, and growth metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      View Analytics
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/settings">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <Settings className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>Platform Settings</CardTitle>
                    <CardDescription>
                      Configure platform settings, features, and integrations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Settings
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform events and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { user: 'john_doe', action: 'completed Introduction to Blockchain course', time: '5 minutes ago' },
                    { user: 'maria_silva', action: 'earned 222 XP from 7-day streak', time: '12 minutes ago' },
                    { user: 'ahmed_khan', action: 'joined House of Football', time: '23 minutes ago' },
                    { user: 'sophie_martin', action: 'submitted onboarding form', time: '1 hour ago' },
                    { user: 'carlos_rodriguez', action: 'reached Level 5 (500 XP)', time: '2 hours ago' }
                  ].map((activity, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                          {activity.user[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{activity.user}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{activity.action}</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
