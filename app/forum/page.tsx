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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  const canRead = user.xp_total >= 369;
  const canInteract = user.xp_total >= 444;
  const canPost = user.xp_total >= 555;

  if (!canRead) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <Card className="max-w-md bg-card/80 border border-border shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <CardHeader className="text-center">
              <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-2xl text-foreground">
                {t('forum.forumLocked')}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {t('forum.earnMoreXp')} {369 - user.xp_total}{' '}
                {t('forum.moreXpToUnlock')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (user.xp_total / 369) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {user.xp_total}/369
                </span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t('forum.completeToEarnXp')}
              </p>
              <Link href="/education/courses">
                <Button className="w-full">
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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 py-8">
        <div className="mx-auto w-full max-w-6xl px-4">
            <div className="mb-8 border-b border-border pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">
                LEGACY FORUM
              </p>
              <h1 className="mt-1 text-3xl md:text-4xl font-bold mb-2 text-foreground">
                {t('forum.communityForum')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('forum.communityForumDesc')}
              </p>
            </div>

            {/* Níveis de acesso por XP */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card
                className={`bg-card/80 border border-border ${
                  canRead ? 'border-emerald-500/70' : ''
                } shadow-[0_18px_45px_rgba(0,0,0,0.45)]`}
              >
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        className={
                          canRead
                            ? 'bg-emerald-500 text-emerald-50'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {canRead ? 'Unlocked' : 'Locked'}
                      </Badge>
                      <span className="text-sm font-semibold text-muted-foreground">
                        369 XP
                      </span>
                    </div>
                    <CardTitle className="text-lg text-foreground">
                      Read Access
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      View all forum discussions and topics
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`bg-card/80 border border-border ${
                    canInteract ? 'border-emerald-500/70' : ''
                  } shadow-[0_18px_45px_rgba(0,0,0,0.45)]`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        className={
                          canInteract
                            ? 'bg-emerald-500 text-emerald-50'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {canInteract ? 'Unlocked' : 'Locked'}
                      </Badge>
                      <span className="text-sm font-semibold text-muted-foreground">
                        444 XP
                      </span>
                    </div>
                    <CardTitle className="text-lg text-foreground">
                      Interact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Like posts and leave comments
                    </p>
                    {!canInteract && (
                      <p className="text-xs text-primary mt-2">
                        {444 - user.xp_total} XP to unlock
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card
                  className={`bg-card/80 border border-border ${
                    canPost ? 'border-emerald-500/70' : ''
                  } shadow-[0_18px_45px_rgba(0,0,0,0.45)]`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        className={
                          canPost
                            ? 'bg-emerald-500 text-emerald-50'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {canPost ? 'Unlocked' : 'Locked'}
                      </Badge>
                      <span className="text-sm font-semibold text-muted-foreground">
                        555 XP
                      </span>
                    </div>
                    <CardTitle className="text-lg text-foreground">
                      Post & Create
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Create topics and post replies
                    </p>
                    {!canPost && (
                      <p className="text-xs text-primary mt-2">
                        {555 - user.xp_total} XP to unlock
                      </p>
                    )}
                  </CardContent>
                </Card>
            </div>

            {/* Rooms / Categorias */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-foreground">
                  {t('forum.forumRooms')}
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="bg-card/80 border border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge>{t('forum.public')}</Badge>
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-foreground">
                        {t('forum.generalDiscussion')}
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {t('forum.generalDiscussionDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span>234 Topics</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>1.2k Posts</span>
                        </div>
                      </div>
                      <Button className="w-full">
                        Browse Topics
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/80 border border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge>{t('forum.public')}</Badge>
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-foreground">
                        {t('forum.apertumNetwork')}
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {t('forum.apertumNetworkDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span>89 Topics</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>456 Posts</span>
                        </div>
                      </div>
                      <Button className="w-full">
                        Browse Topics
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/80 border border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">House</Badge>
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-foreground">
                        Swimming Community
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        Private room for House of Swimming members
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Join the House of Swimming to access this private room
                      </p>
                      <Button variant="outline" className="w-full">
                        View House
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/80 border border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">House</Badge>
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-foreground">
                        Football Community
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        Private room for House of Football members
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
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
            <Card className="bg-gradient-to-br from-[#020b16] via-[#020b18] to-[#000c12] border border-primary/40">
              <CardHeader>
                <CardTitle className="text-foreground">
                  {t('forum.guidelines')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-cyan-100">
                  <strong>Be Respectful:</strong> Treat all members with
                  respect and courtesy
                </p>
                <p className="text-sm text-cyan-100">
                  <strong>Stay On Topic:</strong> Keep discussions relevant to
                  Web3 and sports
                </p>
                <p className="text-sm text-cyan-100">
                  <strong>Quality Over Quantity:</strong> Thoughtful comments
                  earn more XP
                </p>
                <p className="text-sm text-cyan-100">
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
