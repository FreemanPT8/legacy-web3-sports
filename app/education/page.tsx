'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import {
  XP_LEVELS,
  getXpLevelLabel,
} from '@/lib/education/xpLevels';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Award,
  BookOpen,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

export default function EducationPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [topCourses, setTopCourses] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/education/stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
          setTopCourses(data.topCourses);
          setLeaderboard(data.topLeaderboard);
        }
      } catch (error) {
        console.error('Failed to fetch education stats:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'beginner':
        return (
          <Badge className="bg-emerald-600 text-white">
            {t('education.level.beginner')}
          </Badge>
        );
      case 'intermediate':
        return (
          <Badge className="bg-amber-500 text-black">
            {t('education.level.intermediate')}
          </Badge>
        );
      case 'advanced':
        return (
          <Badge className="bg-rose-600 text-white">
            {t('education.level.advanced')}
          </Badge>
        );
      default:
        return <Badge>{t('education.level.unknown')}</Badge>;
    }
  };

  const getLevel = (xp: number) => getXpLevelLabel(xp);

  const formatStat = (value?: number | null) => {
    if (value === null || value === undefined) {
      return loading ? '...' : '0';
    }
    return value.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#000c12] text-white flex flex-col">
      <Header />

      <main className="flex-1 space-y-16">
        {/* HERO */}
        <section className="relative isolate overflow-hidden bg-[#000c12] px-6 py-16">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center">
            <div className="relative z-10 flex-1 space-y-6">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                {t('nav.education')}
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                {t('education.hero.title')}
              </h1>
              <p className="text-lg text-slate-200">
                {t('education.hero.subtitle')}
              </p>
              <p className="text-sm text-slate-300">
                {t('education.hero.description')}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" variant="default" asChild>
                  <Link href="/education/courses" className="flex items-center gap-2">
                    {t('education.viewAll')} {t('education.courses')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/education/xp" className="flex items-center gap-2">
                    {t('education.learnMoreXP')}
                    <BookOpen className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-slate-300">{t('home.trackProgress')}</p>
            </div>

            <div className="flex-1">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border border-white/10 bg-[#05212b]">
                  <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-cyan-300">
                      <BookOpen className="h-4 w-4" />
                      <span>{t('education.stats.courses')}</span>
                    </div>
                    <CardTitle className="text-3xl font-semibold text-white">
                      {formatStat(stats?.totalCourses)}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-300">
                      {t('home.structuredPaths')}
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border border-white/10 bg-[#05212b]">
                  <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-cyan-300">
                      <Target className="h-4 w-4" />
                      <span>{t('education.stats.lessons')}</span>
                    </div>
                    <CardTitle className="text-3xl font-semibold text-white">
                      {formatStat(stats?.totalLessons)}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-300">
                      {t('home.learnEarnDesc')}
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border border-white/10 bg-[#05212b]">
                  <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-cyan-300">
                      <Users className="h-4 w-4" />
                      <span>{t('education.stats.activeUsers')}</span>
                    </div>
                    <CardTitle className="text-3xl font-semibold text-white">
                      {formatStat(stats?.activeUsers)}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-300">
                      {t('home.personalizedOnboardingDesc')}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* STATS + PROGRESSO PESSOAL */}
        <section className="py-16 bg-[#000c12]">
          <div className="mx-auto max-w-6xl px-6">
            <div className="space-y-10">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  <p className="mt-4 text-slate-300">
                    {t('education.loadingStats')}
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-4 gap-6 mb-4">
                  <Card className="text-center border border-white/10 bg-[#000c12] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
                    <CardContent className="pt-6">
                        <BookOpen className="h-10 w-10 text-primary mx-auto mb-3" />
                        <div className="text-3xl font-bold text-white">
                          {stats?.totalCourses || 0}
                        </div>
                        <div className="text-sm text-slate-300">
                          {t('education.stats.courses')}
                        </div>
                      </CardContent>
                    </Card>
                  <Card className="text-center border border-white/10 bg-[#000c12] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
                    <CardContent className="pt-6">
                      <Target className="h-10 w-10 text-cyan-400 mx-auto mb-3" />
                        <div className="text-3xl font-bold text-white">
                          {stats?.totalLessons || 0}
                        </div>
                        <div className="text-sm text-slate-300">
                          {t('education.stats.lessons')}
                        </div>
                      </CardContent>
                    </Card>
                  <Card className="text-center border border-white/10 bg-[#000c12] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
                    <CardContent className="pt-6">
                      <Users className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                        <div className="text-3xl font-bold text-white">
                          {stats?.activeUsers || 0}
                        </div>
                        <div className="text-sm text-slate-300">
                          {t('education.stats.activeUsers')}
                        </div>
                      </CardContent>
                    </Card>
                  <Card className="text-center border border-white/10 bg-[#000c12] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
                    <CardContent className="pt-6">
                      <Zap className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                        <div className="text-3xl font-bold text-white">
                          {stats?.totalXPDistributed?.toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-slate-300">
                          {t('education.stats.xpDistributed')}
                        </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {user && (
                <Card className="mb-4 border border-white/10 bg-[#05212b]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Star className="h-6 w-6 text-amber-400" />
                      {t('education.myProgress')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <div className="text-sm text-cyan-100/80 mb-1">
                          {t('dashboard.currentXp') || 'Current XP'}
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {user.xp_total} XP
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-cyan-100/80 mb-1">
                          {t('dashboard.level')}
                        </div>
                        <div className="text-xl font-semibold text-emerald-300">
                          {getLevel(user.xp_total)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-cyan-100/80 mb-1">
                          {t('dashboard.streak')}
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {user.streak_count} {t('dashboard.days')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>

        {/* CURSOS EM DESTAQUE */}
        <section className="py-16 bg-[#05212b]">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                    {t('education.featured.title')}
                  </h2>
                  <p className="text-lg text-slate-300">
                    {t('education.featuredDesc') ||
                      'Start your learning journey with our most popular courses'}
                  </p>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  </div>
                ) : topCourses.length === 0 ? (
                  <Card className="border border-white/10 bg-[#000c12]">
                    <CardContent className="text-center py-12">
                      <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-300">
                        {t('education.noCourses') || 'No courses available yet'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {topCourses.slice(0, 3).map((course) => {
                    const title = getMultilingualContent(
                      course.title,
                      language,
                    );
                    const description = getMultilingualContent(
                      course.description,
                      language,
                    );
                    const isLocked =
                      course.xp_required > (user?.xp_total || 0);
                    const modulesArray = Array.isArray(course.modules)
                      ? course.modules
                      : [];
                    const lessonsCount = modulesArray.reduce(
                      (acc: number, mod: any) => {
                        const lessonsArray = Array.isArray(mod.lessons)
                          ? mod.lessons
                          : [];
                        return acc + lessonsArray.length;
                      },
                      0,
                    );

                    return (
                        <Card
                          key={course.id}
                          className="border border-white/10 bg-[#000c12] hover:border-primary/70 hover:shadow-[0_0_25px_rgba(45,212,191,0.25)] transition-all"
                        >
                        <CardHeader>
                          <div className="flex justify-between items-start mb-2">
                            {getLevelBadge(course.level)}
                                <Badge
                                  variant="outline"
                                  className="border-primary/70 bg-black/40 text-cyan-100"
                                >
                                {course.xp_required} XP
                              </Badge>
                            </div>
                              <CardTitle className="text-xl text-white">
                                {title}
                              </CardTitle>
                              <CardDescription className="line-clamp-2 text-slate-300">
                                {description}
                              </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm text-slate-300">
                                <BookOpen className="h-4 w-4 text-cyan-300" />
                                <span>
                                  {modulesArray.length} {t('education.modules')} /{' '}
                                  {lessonsCount} {t('education.lessons')}
                                </span>
                              </div>
                            {isLocked ? (
                              <Button
                                variant="outline"
                                className="w-full border-white/30 text-slate-300"
                                disabled
                              >
                                {t('education.unlockAt') || 'Unlock at'}{' '}
                                {course.xp_required} XP
                              </Button>
                            ) : (
                              <Link href={`/education/courses/${course.id}`}>
                                  <Button className="w-full">
                                  {t('education.startCourse') || 'Start Course'}
                                </Button>
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <div className="text-center">
                  <Link href="/education/courses">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-primary text-primary hover:bg-[#000c12]"
                    >
                    {t('education.viewAll') || t('dashboard.viewAll')}{' '}
                    {t('education.courses')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SISTEMA DE XP */}
        <section className="bg-[#000c12] px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 md:grid-cols-2">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                    {t('education.xp.title')}
                  </h2>
                  <p className="mb-6 text-lg text-slate-300">
                    {t('education.xp.description')}
                  </p>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <BookOpen className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-semibold text-white">
                          {t('education.completeLessons')}
                        </div>
                        <div className="text-slate-300">
                          {t('education.completeLessonsDesc')}
                        </div>
                      </div>
                    </div>
                  <div className="flex items-start gap-3">
                    <Award className="h-6 w-6 text-amber-400 flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-semibold text-white">
                        {t('education.readArticles')}
                      </div>
                        <div className="text-slate-300">
                        {t('education.readArticlesDesc')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-semibold text-white">
                        {t('education.forumParticipation')}
                      </div>
                        <div className="text-slate-300">
                        {t('education.forumParticipationDesc')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-6 w-6 text-cyan-400 flex-shrink-0 mt-1" />
                    <div>
                        <div className="font-semibold text-white">
                        {t('education.dailyStreaks')}
                      </div>
                        <div className="text-slate-300">
                        {t('education.dailyStreaksDesc')}
                      </div>
                    </div>
                  </div>
                </div>
                  <div className="mt-8">
                    <Link href="/education/xp">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-white/40 text-slate-100 hover:bg-[#000c12]"
                      >
                        {t('education.learnMoreXP')}
                      </Button>
                    </Link>
                  </div>
              </div>

              <div className="bg-gradient-to-br from-[#020b16] to-[#000c12] p-8 rounded-2xl border border-white/10">
                  <h3 className="text-xl font-bold mb-6 text-center text-cyan-100">
                    {t('education.xpLevels')}
                  </h3>
                <div className="space-y-3 text-sm">
                  {XP_LEVELS.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-[#000c12] px-4 py-3"
                    >
                      <span className="font-semibold text-white">
                        {item.label}
                      </span>
                      <span className="text-sm text-cyan-100">
                        {item.range}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LEADERBOARD */}
          <section className="bg-[#05212b] px-6 py-16">
            <div className="mx-auto max-w-6xl">
              <div className="mx-auto max-w-6xl">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                  {t('education.leaderboard.title')}
                  </h2>
                  <p className="text-lg text-slate-300">
                    See who's leading the way in Web3 education
                  </p>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  </div>
                ) : leaderboard.length === 0 ? (
                  <Card className="border border-white/10 bg-[#000c12]">
                    <CardContent className="text-center py-12">
                      <Trophy className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-300">
                        {t('education.noLeaderboard')}
                      </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="space-y-4 mb-8">
                      {leaderboard.slice(0, 5).map((learner, index) => (
                        <Card
                          key={learner.id}
                          className={cn(
                            'border border-white/10 bg-[#000c12]',
                            index < 3 ? 'ring-1 ring-primary/60' : '',
                          )}
                        >
                        <CardContent className="flex items-center gap-4 p-6">
                          <div
                            className={`text-2xl font-bold ${
                              index === 0
                                ? 'text-amber-400'
                                : index === 1
                                ? 'text-white'
                                : index === 2
                                ? 'text-orange-400'
                                : 'text-slate-400'
                            }`}
                          >
                            #{index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-lg text-white">
                              {learner.username}
                            </div>
                            <div className="text-sm text-slate-300">
                              {learner.country}
                            </div>
                          </div>
                            <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {learner.xp_total}
                            </div>
                            <div className="text-sm text-slate-300">
                              XP
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                    <div className="text-center">
                      <Link href="/education/leaderboard">
                        <Button
                          size="lg"
                          variant="outline"
                          className="border-primary text-primary hover:bg-[#000c12]"
                        >
                        View Full Leaderboard
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-16 bg-gradient-to-r from-[#1d98a6] via-[#14718f] to-[#126e84]">
          <div className="mx-auto max-w-5xl px-6 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                {t('education.cta.title')}
              </h2>
            <p className="text-xl text-cyan-100 mb-8 max-w-2xl mx-auto">
              {t('education.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <Link href="/signup">
                  <Button size="lg" className="px-8">
                    {t('cta.startJourney')}
                  </Button>
                </Link>
              ) : (
                <Link href="/education/courses">
                  <Button size="lg" className="px-8">
                    {t('cta.explore')} Courses
                  </Button>
                </Link>
              )}
              <Link href="/blog">
                <Button size="lg" variant="outline" className="px-8">
                  {t('cta.exploreBlog')}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
