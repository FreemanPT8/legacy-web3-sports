'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import { XP_LEVELS, getXpLevelLabel } from '@/lib/education/xpLevels';
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

const EDUCATION_LANGUAGES = ['pt', 'es', 'en'] as const;
type EducationLanguage = (typeof EDUCATION_LANGUAGES)[number];

const buildLevelCopy = (lang: EducationLanguage) =>
  XP_LEVELS.map((level) => ({
    title: level.translations[lang].title,
    range: level.translations[lang].range,
  }));

const XP_LEVEL_BLOCK_COPY: Record<
  EducationLanguage,
  { title: string; range: string }[]
> = {
  pt: buildLevelCopy('pt'),
  es: buildLevelCopy('es'),
  en: buildLevelCopy('en'),
};

const PREVIEW_LEVELS: Record<
  EducationLanguage,
  { title: string; range: string }[]
> = {
  pt: XP_LEVEL_BLOCK_COPY.pt.slice(0, 4),
  es: XP_LEVEL_BLOCK_COPY.es.slice(0, 4),
  en: XP_LEVEL_BLOCK_COPY.en.slice(0, 4),
};

const BADGE_TIER_THRESHOLD = 2222;

const XP_BADGE_NOTE_COPY: Record<EducationLanguage, string> = {
  pt: 'A partir dos 2 222 XP (nível Sénior) ganhas badges apenas para ranking; já tens acesso a todos os cursos.',
  es: 'Desde los 2 222 XP (nivel Sénior) solo recibes badges para el ranking; todos los cursos ya están desbloqueados.',
  en: 'From 2,222 XP (Senior level) you only collect badges for ranking; every course is already unlocked.',
};

const BADGE_ICON_HINT_COPY: Record<EducationLanguage, string> = {
  pt: 'Ícone dourado = zona de badges/ranking',
  es: 'Icono dorado = zona de badges/ranking',
  en: 'Gold icon = badge/ranking tier',
};

const resolveEducationLanguage = (lang: string): EducationLanguage => {
  if (EDUCATION_LANGUAGES.includes(lang as EducationLanguage)) {
    return lang as EducationLanguage;
  }
  return 'en';
};

const isBadgeTier = (xp: number) => xp >= BADGE_TIER_THRESHOLD;

export default function EducationPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [topCourses, setTopCourses] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const educationLanguage = resolveEducationLanguage(language);
  const xpLevelsCopy = XP_LEVEL_BLOCK_COPY[educationLanguage];
  const previewLevels = PREVIEW_LEVELS[educationLanguage];
  const badgesNoteCopy = XP_BADGE_NOTE_COPY[educationLanguage];
  const badgeIconHint = BADGE_ICON_HINT_COPY[educationLanguage];
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
          <Badge className="border border-[#34d399]/50 bg-gradient-to-r from-[#0f766e] to-[#059669] text-white shadow-[0_8px_20px_rgba(15,118,110,0.35)]">
            {t('education.level.beginner')}
          </Badge>
        );
      case 'intermediate':
        return (
          <Badge className="border border-[#fdd87c]/50 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] shadow-[0_8px_20px_rgba(253,216,124,0.35)]">
            {t('education.level.intermediate')}
          </Badge>
        );
      case 'advanced':
        return (
          <Badge className="border border-[#fb7185]/50 bg-gradient-to-r from-[#f43f5e] to-[#fb7185] text-white shadow-[0_8px_20px_rgba(244,63,94,0.35)]">
            {t('education.level.advanced')}
          </Badge>
        );
      default:
        return (
          <Badge className="border border-white/20 bg-[#04131b] text-white">
            {t('education.level.unknown')}
          </Badge>
        );
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
        <section className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-16 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -left-14 h-64 w-64 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center">
            <div className="relative z-10 flex-1 space-y-6">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                {t('nav.education')}
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-[#fdd87c] md:text-5xl">
                {t('education.hero.title')}
              </h1>
              <p className="text-lg text-slate-100">
                {t('education.hero.subtitle')}
              </p>
              <p className="text-sm text-slate-200">
                {t('education.hero.description')}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  asChild
                  className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                >
                  <Link href="/education/courses" className="flex items-center gap-2">
                    {t('education.viewAll')} {t('education.courses')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/education/xp" className="flex items-center gap-2">
                    {t('education.learnMoreXP')}
                    <BookOpen className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-cyan-200/80">{t('home.trackProgress')}</p>
            </div>

            <div className="flex-1">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border border-white/10 bg-[#04131b]/80 backdrop-blur">
                  <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-cyan-300">
                      <BookOpen className="h-4 w-4" />
                      <span>{t('education.stats.courses')}</span>
                    </div>
                    <CardTitle className="text-3xl font-semibold text-white">
                      {formatStat(stats?.totalCourses)}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-200">
                      {t('home.structuredPaths')}
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border border-white/10 bg-[#04131b]/80 backdrop-blur">
                  <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-cyan-300">
                      <Target className="h-4 w-4" />
                      <span>{t('education.stats.lessons')}</span>
                    </div>
                    <CardTitle className="text-3xl font-semibold text-white">
                      {formatStat(stats?.totalLessons)}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-200">
                      {t('home.learnEarnDesc')}
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border border-white/10 bg-[#04131b]/80 backdrop-blur">
                  <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-cyan-300">
                      <Users className="h-4 w-4" />
                      <span>{t('education.stats.activeUsers')}</span>
                    </div>
                    <CardTitle className="text-3xl font-semibold text-white">
                      {formatStat(stats?.activeUsers)}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-200">
                      {t('home.personalizedOnboardingDesc')}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] py-12">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -right-14 h-56 w-56 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-16 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">
                {t('education.hero.subtitle')}
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[#fdd87c]">
                {t('education.cta.title')}
              </h2>
              <p className="mt-3 text-sm text-slate-200">
                Acede a conteúdos exclusivos, missões e badges quando crias uma conta e entras na Academia Web3.
              </p>
              <div className="mt-6 space-y-3 text-sm text-slate-200">
                <p>1. {t('education.step.join') || 'Regista-te gratuitamente.'}</p>
                <p>2. {t('education.step.startHere') || 'Completa o curso COMEÇA AQUI.'}</p>
                <p>3. {t('education.step.unlock') || 'Desbloqueia níveis e badges.'}</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  >
                    {t('cta.startJourney')}
                  </Button>
                </Link>
                {!user && (
                  <Link href="/login">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/40 text-white hover:bg-white/10"
                    >
                      {t('auth.login')}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#000c12]/60 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <h3 className="text-xl font-semibold text-white mb-4">
                {t('education.previewLevels') || 'Pré-visualização dos níveis'}
              </h3>
              <div className="space-y-3 text-sm">
                {previewLevels.map((item) => (
                  <div
                    key={`${item.title}-${item.range}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#04131b] px-4 py-3"
                  >
                    <span className="font-semibold text-white">{item.title}</span>
                    <span className="text-slate-200">{item.range}</span>
                  </div>
                ))}
                <p className="text-xs text-slate-200">
                  {t('education.previewHint') || 'Regista-te para ver a timeline completa, badges e cursos disponíveis em cada nível.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* STATS + PROGRESSO PESSOAL */}
        <section className="relative overflow-hidden py-16 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#031b27]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -left-12 h-52 w-52 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-16 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl px-6">
            <div className="space-y-10">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  <p className="mt-4 text-slate-200">
                    {t('education.loadingStats')}
                  </p>
                </div>
              ) : (
                <div className="mb-4 grid gap-6 md:grid-cols-4">
                  <Card className="text-center border border-white/10 bg-[#04131b] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
                    <CardContent className="pt-6">
                        <BookOpen className="h-10 w-10 text-primary mx-auto mb-3" />
                        <div className="text-3xl font-bold text-white">
                          {stats?.totalCourses || 0}
                        </div>
                        <div className="text-sm text-slate-200">
                          {t('education.stats.courses')}
                        </div>
                      </CardContent>
                    </Card>
                  <Card className="text-center border border-white/10 bg-[#04131b] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
                    <CardContent className="pt-6">
                      <Target className="h-10 w-10 text-cyan-400 mx-auto mb-3" />
                        <div className="text-3xl font-bold text-white">
                          {stats?.totalLessons || 0}
                        </div>
                        <div className="text-sm text-slate-200">
                          {t('education.stats.lessons')}
                        </div>
                      </CardContent>
                    </Card>
                  <Card className="text-center border border-white/10 bg-[#04131b] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
                    <CardContent className="pt-6">
                      <Users className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                        <div className="text-3xl font-bold text-white">
                          {stats?.activeUsers || 0}
                        </div>
                        <div className="text-sm text-slate-200">
                          {t('education.stats.activeUsers')}
                        </div>
                      </CardContent>
                    </Card>
                  <Card className="text-center border border-white/10 bg-[#04131b] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
                    <CardContent className="pt-6">
                      <Zap className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                        <div className="text-3xl font-bold text-white">
                          {stats?.totalXPDistributed?.toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-slate-200">
                          {t('education.stats.xpDistributed')}
                        </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {user && (
                <Card className="mb-4 border border-white/10 bg-[#04131b]/80 backdrop-blur">
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

        <section className="relative overflow-hidden bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] py-12" id="levels">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-14 -right-12 h-48 w-48 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-14 h-56 w-56 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl px-6">
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-[0.5em] text-cyan-400">Academia em níveis</p>
              <h2 className="mt-2 text-3xl font-semibold text-[#fdd87c]">Desbloqueia conteúdos progressivos</h2>
              <p className="mt-2 text-sm text-slate-200">
                Vê um sneak peek dos caminhos disponíveis. Depois de entrares, poderás acompanhar o teu progresso em tempo real.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {previewLevels.map((item) => (
                <div
                  key={`${item.title}-${item.range}-grid`}
                  className="rounded-2xl border border-white/10 bg-[#04131b] px-4 py-6 text-center text-white"
                >
                  <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-200">{item.range}</p>
                  <p className="mt-4 text-xs text-slate-200">
                    {t('education.previewcta') || 'Disponível após login.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CURSOS EM DESTAQUE */}
        <section className="relative overflow-hidden py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-14 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>
          <div className="relative container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#fdd87c]">
                    {t('education.featured.title')}
                  </h2>
                  <p className="text-lg text-slate-200">
                    {t('education.featuredDesc') ||
                      'Start your learning journey with our most popular courses'}
                  </p>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  </div>
                ) : topCourses.length === 0 ? (
                  <Card className="border border-white/10 bg-[#04131b]">
                    <CardContent className="text-center py-12">
                      <BookOpen className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-200">
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
                          className="border border-white/10 bg-[#04131b] hover:border-cyan-400/70 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] transition-all"
                        >
                        <CardHeader>
                          <div className="flex justify-between items-start mb-2">
                            {getLevelBadge(course.level)}
                                <Badge
                                  variant="outline"
                                  className="border-[#5af3ff]/50 bg-[#00141f]/80 text-[#5af3ff]"
                                >
                                {course.xp_required} XP
                              </Badge>
                            </div>
                              <CardTitle className="text-xl text-white">
                                {title}
                              </CardTitle>
                              <CardDescription className="line-clamp-2 text-slate-200">
                                {description}
                              </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm text-slate-200">
                                <BookOpen className="h-4 w-4 text-cyan-300" />
                                <span>
                                  {modulesArray.length} {t('education.modules')} /{' '}
                                  {lessonsCount} {t('education.lessons')}
                                </span>
                              </div>
                            {isLocked ? (
                              <Button
                                variant="outline"
                                className="w-full border-white/30 text-slate-200 hover:bg-white/10"
                                disabled
                              >
                                {t('education.unlockAt') || 'Unlock at'}{' '}
                                {course.xp_required} XP
                              </Button>
                            ) : (
                              <Link href={`/education/courses/${course.id}`}>
                                  <Button className="w-full bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_25px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]">
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
                      className="border-white/40 text-white hover:bg-white/10"
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
        <section className="relative overflow-hidden px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-14 -left-12 h-60 w-60 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl">
            <div className="grid items-center gap-12 md:grid-cols-2">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#fdd87c]">
                    {t('education.xp.title')}
                  </h2>
                  <p className="mb-6 text-lg text-slate-200">
                    {t('education.xp.description')}
                  </p>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <BookOpen className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-semibold text-white">
                          {t('education.completeLessons')}
                        </div>
                        <div className="text-slate-200">
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
                        <div className="text-slate-200">
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
                        <div className="text-slate-200">
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
                        <div className="text-slate-200">
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
                        className="border-white/40 text-white hover:bg-white/10"
                      >
                        {t('education.learnMoreXP')}
                      </Button>
                    </Link>
                  </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#020b16] to-[#04131b] p-8 shadow-[0_25px_60px_rgba(3,10,25,0.65)]">
                  <h3 className="text-xl font-bold mb-6 text-center text-cyan-100">
                    {t('education.xpLevels')}
                  </h3>
                <div className="space-y-3 text-sm">
                  {xpLevelsCopy.map((item) => (
                    <div
                      key={`${item.title}-${item.range}`}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-[#04131b] px-4 py-3"
                    >
                      <span className="font-semibold text-white">
                        {item.title}
                      </span>
                      <span className="text-sm text-cyan-100">
                        {item.range}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
                  <Award className="h-4 w-4 text-amber-300" />
                  <p className="text-left text-amber-50">{badgesNoteCopy}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LEADERBOARD */}
          <section className="relative overflow-hidden px-6 py-16">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#031b27]" />
              <div className="absolute -top-24 -left-14 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
              <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            </div>
            <div className="relative mx-auto max-w-6xl">
              <div className="mx-auto max-w-6xl">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#fdd87c]">
                  {t('education.leaderboard.title')}
                  </h2>
                  <p className="text-lg text-slate-200">
                    See who's leading the way in Web3 education
                  </p>
                </div>
                <div className="mb-6 flex items-center justify-center gap-2 text-sm text-slate-200">
                  <Award className="h-4 w-4 text-amber-300" />
                  <span>{badgeIconHint}</span>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  </div>
                ) : leaderboard.length === 0 ? (
                  <Card className="border border-white/10 bg-[#04131b]">
                    <CardContent className="text-center py-12">
                      <Trophy className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-200">
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
                            'border border-white/10 bg-[#04131b]',
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
                                : 'text-slate-300'
                            }`}
                          >
                            #{index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-lg text-white">
                              {learner.username}
                            </div>
                            <div className="text-sm text-slate-200">
                              {learner.country}
                            </div>
                          </div>
                            <div className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isBadgeTier(learner.xp_total) && (
                                <span className="inline-flex" title={badgeIconHint}>
                                  <Award
                                    className="h-4 w-4 text-amber-300"
                                    aria-label="Badge tier"
                                  />
                                </span>
                              )}
                              <div className="text-2xl font-bold text-primary">
                                {learner.xp_total}
                              </div>
                            </div>
                            <div className="text-sm text-slate-200">
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
                          className="border-white/40 text-white hover:bg-white/10"
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
        <section className="relative overflow-hidden py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-16 -left-14 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-5xl px-6 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#fdd87c]">
                {t('education.cta.title')}
              </h2>
            <p className="text-xl text-cyan-100 mb-8 max-w-2xl mx-auto">
              {t('education.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="px-8 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  >
                    {t('cta.startJourney')}
                  </Button>
                </Link>
              ) : (
                <Link href="/education/courses">
                  <Button
                    size="lg"
                    className="px-8 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  >
                    {t('cta.explore')} Courses
                  </Button>
                </Link>
              )}
              <Link href="/blog">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 border-white/40 text-white hover:bg-white/10"
                >
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
