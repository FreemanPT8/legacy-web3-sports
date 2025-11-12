'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, MessageSquare, Users, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function ForumPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const canRead = user.xp_total >= 369;
  const canInteract = user.xp_total >= 444;
  const canPost = user.xp_total >= 555;

  if (!canRead) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 flex items-center justify-center py-16">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <CardTitle className="text-2xl">{t('forum.forumLocked')}</CardTitle>
              <CardDescription>
                {t('forum.earnMoreXp')} {369 - user.xp_total} {t('forum.moreXpToUnlock')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min((user.xp_total / 369) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{user.xp_total}/369</span>
              </div>
              <p className="text-sm text-gray-600 text-center">
                {t('forum.completeToEarnXp')}
              </p>
              <Link href="/education/courses">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  {t('forum.startLearning')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{t('forum.communityForum')}</h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {t('forum.communityForumDesc')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className={canRead ? 'border-green-500' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={canRead ? 'bg-green-600' : 'bg-gray-400'}>
                      {canRead ? 'Unlocked' : 'Locked'}
                    </Badge>
                    <span className="text-sm font-semibold">369 XP</span>
                  </div>
                  <CardTitle className="text-lg">Read Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-300">View all forum discussions and topics</p>
                </CardContent>
              </Card>

              <Card className={canInteract ? 'border-green-500' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={canInteract ? 'bg-green-600' : 'bg-gray-400'}>
                      {canInteract ? 'Unlocked' : 'Locked'}
                    </Badge>
                    <span className="text-sm font-semibold">444 XP</span>
                  </div>
                  <CardTitle className="text-lg">Interact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Like posts and leave comments</p>
                  {!canInteract && (
                    <p className="text-xs text-blue-600 mt-2">
                      {444 - user.xp_total} XP to unlock
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className={canPost ? 'border-green-500' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={canPost ? 'bg-green-600' : 'bg-gray-400'}>
                      {canPost ? 'Unlocked' : 'Locked'}
                    </Badge>
                    <span className="text-sm font-semibold">555 XP</span>
                  </div>
                  <CardTitle className="text-lg">Post & Create</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Create topics and post replies</p>
                  {!canPost && (
                    <p className="text-xs text-blue-600 mt-2">
                      {555 - user.xp_total} XP to unlock
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">{t('forum.forumRooms')}</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge>{t('forum.public')}</Badge>
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                    <CardTitle>{t('forum.generalDiscussion')}</CardTitle>
                    <CardDescription>
                      {t('forum.generalDiscussionDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-500" />
                        <span>234 Topics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-500" />
                        <span>1.2k Posts</span>
                      </div>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Browse Topics
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge>{t('forum.public')}</Badge>
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                    <CardTitle>{t('forum.apertumNetwork')}</CardTitle>
                    <CardDescription>
                      {t('forum.apertumNetworkDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-500" />
                        <span>89 Topics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-500" />
                        <span>456 Posts</span>
                      </div>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Browse Topics
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">House</Badge>
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <CardTitle>Swimming Community</CardTitle>
                    <CardDescription>
                      Private room for House of Swimming members
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Join the House of Swimming to access this private room
                    </p>
                    <Button variant="outline" className="w-full">
                      View House
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">House</Badge>
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <CardTitle>Football Community</CardTitle>
                    <CardDescription>
                      Private room for House of Football members
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Join the House of Football to access this private room
                    </p>
                    <Button variant="outline" className="w-full">
                      View House
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader>
                <CardTitle>{t('forum.guidelines')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>Be Respectful:</strong> Treat all members with respect and courtesy
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Stay On Topic:</strong> Keep discussions relevant to Web3 and sports
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Quality Over Quantity:</strong> Thoughtful comments earn more XP
                </p>
                <p className="text-sm text-gray-700">
                  <strong>No Spam:</strong> Repeated or low-quality posts may be moderated
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
