'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone, MessageSquare, User, MapPin, Trophy, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingSubmissionsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await fetch('/api/forms/onboarding');
        const data = await response.json();
        if (data.success) {
          setSubmissions(data.submissions);
        }
      } catch (error) {
        console.error('Failed to fetch submissions:', error);
      }
      setLoadingData(false);
    };

    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchSubmissions();
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
    return null;
  }

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const contactedSubmissions = submissions.filter(s => s.status === 'contacted');
  const completedSubmissions = submissions.filter(s => s.status === 'completed');

  const SubmissionCard = ({ submission }: { submission: any }) => (
    <Card key={submission.id} className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-lg">{submission.full_name}</CardTitle>
          <Badge className={
            submission.status === 'pending' ? 'bg-yellow-600' :
            submission.status === 'contacted' ? 'bg-blue-600' :
            'bg-green-600'
          }>
            {submission.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {new Date(submission.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Contact Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{submission.email}</span>
              </div>
              {submission.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{submission.phone}</span>
                </div>
              )}
              {submission.telegram && (
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  <span>{submission.telegram}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{submission.country}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Sports Background</h4>
            <div className="space-y-2 text-sm">
              {submission.sports_category && (
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-gray-500" />
                  <span>{submission.sports_category}</span>
                </div>
              )}
              {submission.sports_role && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{submission.sports_role}</span>
                </div>
              )}
              {submission.organization && (
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Organization:</span> {submission.organization}
                </div>
              )}
              {submission.web3_experience && (
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Web3 Experience:</span>{' '}
                  <Badge variant="outline">{submission.web3_experience}</Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {submission.interests && submission.interests.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {submission.interests.map((interest: string) => (
                <Badge key={interest} variant="outline">{interest}</Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-semibold mb-2">Message</h4>
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
            {submission.message}
          </p>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Mail className="h-4 w-4 mr-2" />
            Contact
          </Button>
          <Button size="sm" variant="outline">
            Mark as Contacted
          </Button>
          <Button size="sm" variant="outline">
            Complete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <Link href="/admin">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Onboarding Submissions</h1>
              <p className="text-gray-600 dark:text-gray-300">Review and respond to personalized onboarding requests</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{pendingSubmissions.length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Need review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Contacted</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{contactedSubmissions.length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">In progress</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{completedSubmissions.length}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Onboarded</p>
                </CardContent>
              </Card>
            </div>

            {loadingData ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">Loading submissions...</p>
              </div>
            ) : (
              <Tabs defaultValue="pending">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="pending">
                    Pending ({pendingSubmissions.length})
                  </TabsTrigger>
                  <TabsTrigger value="contacted">
                    Contacted ({contactedSubmissions.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed ({completedSubmissions.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-6">
                  {pendingSubmissions.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300">No pending submissions</p>
                      </CardContent>
                    </Card>
                  ) : (
                    pendingSubmissions.map(submission => (
                      <SubmissionCard key={submission.id} submission={submission} />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="contacted" className="mt-6">
                  {contactedSubmissions.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300">No contacted submissions</p>
                      </CardContent>
                    </Card>
                  ) : (
                    contactedSubmissions.map(submission => (
                      <SubmissionCard key={submission.id} submission={submission} />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                  {completedSubmissions.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300">No completed submissions</p>
                      </CardContent>
                    </Card>
                  ) : (
                    completedSubmissions.map(submission => (
                      <SubmissionCard key={submission.id} submission={submission} />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
