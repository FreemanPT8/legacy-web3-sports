'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Globe, Mail, Database, Shield } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <Link href="/admin">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Platform Settings</h1>
              <p className="text-gray-600 dark:text-gray-300">Configure platform settings and integrations</p>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Globe className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Platform name, description, and basic configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">Platform Name</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">LEGACY</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">Supported Languages</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">6 languages (EN, PT, ES, FR, IT, DE)</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">Default Language</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">English</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>XP & Gamification</CardTitle>
                  <CardDescription>Configure XP rewards and thresholds</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">Profile Unlock</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">99 XP required</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">Forum Access</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">369 XP required</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">7-Day Streak Bonus</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">222 XP reward</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">Daily Mission XP</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">12 XP per mission</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    To change these values, edit lib/xp.ts and redeploy
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Mail className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Email Configuration</CardTitle>
                  <CardDescription>Email service and notifications settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">Email Service</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Resend (if configured)</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">Welcome Emails</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Enabled</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">Streak Bonus Emails</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Enabled</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Configure Email:</strong> Add RESEND_API_KEY to environment variables in Vercel
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Database className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Database & Storage</CardTitle>
                  <CardDescription>Supabase database configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">Database Provider</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Supabase PostgreSQL</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">Row Level Security</p>
                        <p className="text-sm text-green-600">Enabled on all tables</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">Migrations</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Up to date</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-yellow-900">Important Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2 text-sm text-yellow-900">
                    <li>All configuration changes require a redeploy to take effect</li>
                    <li>Environment variables are managed in Vercel dashboard</li>
                    <li>Database schema changes must be applied via migrations</li>
                    <li>XP thresholds are defined in lib/xp.ts</li>
                    <li>Always test changes in development before deploying to production</li>
                  </ul>
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
