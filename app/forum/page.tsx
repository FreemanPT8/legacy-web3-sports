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
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto" />
          <p className="mt-4 text-sm text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const canRead = user.xp_total >= 369;
  const canInteract = user.xp_total >= 444;
  const canPost = user.xp_total >= 555;

  if (!canRead) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <Card className="max-w-md border border-white/10 bg-[#000c12] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <CardHeader className="text-center">
              <Lock className="h-16 w-16 text-white/70 mx-auto mb-4" />
              <CardTitle className="text-2xl text-white">
                {t('forum.forumLocked')}
              </CardTitle>
              <CardDescription className="text-sm text-slate-300">
                {t('forum.earnMoreXp')} {369 - user.xp_total}{' '}
                {t('forum.moreXpToUnlock')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#05212b] rounded-full h-3">
                  <div
                    className="bg-cyan-400 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min((user.xp_total / 369) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-white">
                  {user.xp_total}/369
                </span>
              </div>
              <p className="text-sm text-slate-300 text-center">
                {t('forum.completeToEarnXp')}
              </p>
              <Link href="/education/courses">
                <Button className="w-full border border-white/30 text-slate-200">
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

  const accessLevels = [
    { label: 'Read Access', xp: 369, unlocked: canRead },
    { label: 'Interact', xp: 444, unlocked: canInteract },
    { label: 'Post & Create', xp: 555, unlocked: canPost },
  ];

  const rooms = [
    {
      title: t('forum.generalDiscussion'),
      desc: t('forum.generalDiscussionDesc'),
      badge: t('forum.public'),
      topics: '234 Topics',
      posts: '1.2k Posts',
      icon: Users,
    },
    {
      title: t('forum.apertumNetwork'),
      desc: t('forum.apertumNetworkDesc'),
      badge: t('forum.public'),
      topics: '89 Topics',
      posts: '456 Posts',
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />

      <main className="flex-1 py-8">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mb-8 border-b border-white/10 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.6em] text-cyan-300">
              LEGACY FORUM
            </p>
            <h1 className="mt-1 text-3xl md:text-4xl font-bold text-white">
              {t('forum.communityForum')}
            </h1>
            <p className="text-sm text-slate-300">
              {t('forum.communityForumDesc')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {accessLevels.map((level) => (
              <Card
                key={level.label}
                className={`border border-white/10 bg-[#000c12] shadow-[0_18px_45px_rgba(0,0,0,0.45)] ${
                  level.unlocked ? 'border-cyan-500/70' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      className={
                        level.unlocked
                          ? 'bg-cyan-500 text-white'
                          : 'bg-[#05212b] text-slate-300'
                      }
                    >
                      {level.unlocked ? 'Unlocked' : 'Locked'}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-300">
                      {level.xp} XP
                    </span>
                  </div>
                  <CardTitle className="text-lg text-white">
                    {level.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-300">
                    {level.label === 'Read Access' &&
                      'View all forum discussions and topics'}
                    {level.label === 'Interact' &&
                      'Like posts and leave comments'}
                    {level.label === 'Post & Create' &&
                      'Create topics and post replies'}
                  </p>
                  {!level.unlocked && (
                    <p className="text-xs text-cyan-200 mt-2">
                      {level.xp - user.xp_total} XP to unlock
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-8 space-y-4">
            <h2 className="text-2xl font-bold text-white">
              {t('forum.forumRooms')}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {rooms.map((room) => (
                <Card
                  key={room.title}
                  className="border border-white/10 bg-[#000c12]"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-cyan-500/10 text-cyan-100 border border-white/10">
                        {room.badge}
                      </Badge>
                      <room.icon className="h-5 w-5 text-slate-300" />
                    </div>
                    <CardTitle className="text-white">{room.title}</CardTitle>
                    <CardDescription className="text-sm text-slate-300">
                      {room.desc}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-cyan-300" />
                        <span>{room.topics}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-cyan-300" />
                        <span>{room.posts}</span>
                      </div>
                    </div>
                    <Button className="w-full border border-white/30 text-slate-200">
                      Browse Topics
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {[1, 2].map((item) => (
                <Card
                  key={`house-${item}`}
                  className="border border-white/10 bg-[#000c12]"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="border-white/30 text-slate-300 bg-transparent">
                        House
                      </Badge>
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <CardTitle className="text-white">
                      {item === 1 ? 'Swimming Community' : 'Football Community'}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-300">
                      Private room for House of{' '}
                      {item === 1 ? 'Swimming' : 'Football'} members
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-slate-300">
                      Join the House of{' '}
                      {item === 1 ? 'Swimming' : 'Football'} to access this
                      private room
                    </p>
                    <Button
                      variant="outline"
                      className="w-full border-white/30 text-slate-200"
                    >
                      View House
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="bg-gradient-to-br from-[#020b16] via-[#020b18] to-[#000c12] border border-primary/40">
            <CardHeader>
              <CardTitle className="text-white">{t('forum.guidelines')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-cyan-100">
                <strong>Be Respectful:</strong> Treat all members with respect and
                courtesy
              </p>
              <p className="text-sm text-cyan-100">
                <strong>Stay On Topic:</strong> Keep discussions relevant to Web3
                and sports
              </p>
              <p className="text-sm text-cyan-100">
                <strong>Quality Over Quantity:</strong> Thoughtful comments earn
                more XP
              </p>
              <p className="text-sm text-cyan-100">
                <strong>No Spam:</strong> Repeated or low-quality posts may be
                moderated
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
