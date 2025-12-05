'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, MessageSquare, Users, TrendingUp } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-body">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const canRead = user.xp_total >= 369;
  const canInteract = user.xp_total >= 444;
  const canPost = user.xp_total >= 555;

  if (!canRead) {
    return (
      <div className="min-h-screen flex flex-col bg-page">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <Card className="max-w-md bg-card border-custom">
            <CardHeader className="text-center">
              <Lock className="h-16 w-16 text-muted-custom mx-auto mb-4" />
              <CardTitle className="text-2xl text-heading">
                {t('forum.forumLocked')}
              </CardTitle>
              <CardDescription className="text-body">
                {t('forum.earnMoreXp')} {369 - user.xp_total}{' '}
                {t('forum.moreXpToUnlock')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-800 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (user.xp_total / 369) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-heading">
                  {user.xp_total}/369
                </span>
              </div>
              <p className="text-sm text-body text-center">
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
    <div className="min-h-screen flex flex-col bg-page">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-heading">
                {t('forum.communityForum')}
              </h1>
              <p className="text-lg text-body">
                {t('forum.communityForumDesc')}
              </p>
            </div>

            {/* Níveis de acesso por XP */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card
                className={`bg-card border-custom ${
                  canRead ? 'border-emerald-500' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      className={canRead ? 'bg-emerald-600' : 'bg-gray-500'}
                    >
                      {canRead ? 'Unlocked' : 'Locked'}
                    </Badge>
                    <span className="text-sm font-semibold text-body">
                      369 XP
                    </span>
                  </div>
                  <CardTitle className="text-lg text-heading">
                    Read Access
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-body">
                    View all forum discussions and topics
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`bg-card border-custom ${
                  canInteract ? 'border-emerald-500' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      className={canInteract ? 'bg-emerald-600' : 'bg-gray-500'}
                    >
                      {canInteract ? 'Unlocked' : 'Locked'}
                    </Badge>
                    <span className="text-sm font-semibold text-body">
                      444 XP
                    </span>
                  </div>
                  <CardTitle className="text-lg text-heading">
                    Interact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-body">
                    Like posts and leave comments
                  </p>
                  {!canInteract && (
                    <p className="text-xs text-blue-400 mt-2">
                      {444 - user.xp_total} XP to unlock
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card
                className={`bg-card border-custom ${
                  canPost ? 'border-emerald-500' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      className={canPost ? 'bg-emerald-600' : 'bg-gray-500'}
                    >
                      {canPost ? 'Unlocked' : 'Locked'}
                    </Badge>
                    <span className="text-sm font-semibold text-body">
                      555 XP
                    </span>
                  </div>
                  <CardTitle className="text-lg text-heading">
                    Post & Create
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-body">
                    Create topics and post replies
                  </p>
                  {!canPost && (
                    <p className="text-xs text-blue-400 mt-2">
                      {555 - user.xp_total} XP to unlock
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Rooms / Categorias */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-heading">
                {t('forum.forumRooms')}
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-card border-custom">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge>{t('forum.public')}</Badge>
                      <Users className="h-5 w-5 text-muted-custom" />
                    </div>
                    <CardTitle className="text-heading">
                      {t('forum.generalDiscussion')}
                    </CardTitle>
                    <CardDescription className="text-body">
                      {t('forum.generalDiscussionDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-body">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-custom" />
                        <span>234 Topics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-custom" />
                        <span>1.2k Posts</span>
                      </div>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Browse Topics
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-card border-custom">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge>{t('forum.public')}</Badge>
                      <Users className="h-5 w-5 text-muted-custom" />
                    </div>
                    <CardTitle className="text-heading">
                      {t('forum.apertumNetwork')}
                    </CardTitle>
                    <CardDescription className="text-body">
                      {t('forum.apertumNetworkDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-body">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-custom" />
                        <span>89 Topics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-custom" />
                        <span>456 Posts</span>
                      </div>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Browse Topics
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-card border-custom">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">House</Badge>
                      <Lock className="h-5 w-5 text-muted-custom" />
                    </div>
                    <CardTitle className="text-heading">
                      Swimming Community
                    </CardTitle>
                    <CardDescription className="text-body">
                      Private room for House of Swimming members
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-body">
                      Join the House of Swimming to access this private room
                    </p>
                    <Button variant="outline" className="w-full">
                      View House
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-card border-custom">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">House</Badge>
                      <Lock className="h-5 w-5 text-muted-custom" />
                    </div>
                    <CardTitle className="text-heading">
                      Football Community
                    </CardTitle>
                    <CardDescription className="text-body">
                      Private room for House of Football members
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-body">
                      Join the House of Football to access this private room
                    </p>
                    <Button variant="outline" className="w-full">
                      View House
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Guidelines */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-900/60">
              <CardHeader>
                <CardTitle className="text-heading">
                  {t('forum.guidelines')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-blue-100">
                  <strong>Be Respectful:</strong> Treat all members with
                  respect and courtesy
                </p>
                <p className="text-sm text-blue-100">
                  <strong>Stay On Topic:</strong> Keep discussions relevant to
                  Web3 and sports
                </p>
                <p className="text-sm text-blue-100">
                  <strong>Quality Over Quantity:</strong> Thoughtful comments
                  earn more XP
                </p>
                <p className="text-sm text-blue-100">
                  <strong>No Spam:</strong> Repeated or low-quality posts may be
                  moderated
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
