'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import { CourseHubV2 } from '@/components/education/CourseHubV2';
import { StartHereHero } from '@/components/education/StartHereHero';
import { LevelTimeline, type ProgressFetchState } from '@/components/education/LevelTimeline';
import { LevelSections } from '@/components/education/LevelSections';
import { NextUnlockCTA } from '@/components/education/NextUnlockCTA';
import type { ProgressSummary } from '@/lib/education/progressSummary';
import { buildFallbackProgressSummary } from '@/lib/education/fallbackSummary';
import {
  START_HERE_FALLBACK_ID,
  START_HERE_SLUG,
} from '@/lib/education/unlockLogic';

const INFANTIL_COURSE_IDS = ['416b0b74-ec44-4aea-be62-50c3ee60af29'];
const INFANTIL_COURSE_SLUGS = ['416b0b74-ec44-4aea-be62-50c3ee60af29'];
import {
  BookOpen,
  Award,
  Lock,
  ArrowRight,
  CheckCircle,
  PenSquare,
  Users,
} from 'lucide-react';

type Lesson = {
  id: string;
  xp_reward: number;
  xpReward?: number | null;
};

type Module = {
  id: string;
  lessons?: Lesson[];
  xp_reward?: number | null;
  xpReward?: number | null;
  metadata?: {
    xpReward?: number;
  };
};

type Course = {
  id: string;
  title: any;
  description: any;
  slug?: string | null;
  level?: string | null;
  xp_threshold: number;
  xp_reward?: number | null;
  xp_reward_on_complete?: number | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  modules?: Module[];
  curriculum?: {
    metadata?: {
      xpReward?: number;
    };
  };
  author_id?: string | null;
  author_name?: string | null;
  isCreator?: boolean;
  total_modules?: number;
  total_lessons?: number;
  total_xp?: number;
  xp_distributed_total?: number;
  completions_count?: number;
};

const getModuleBonusXP = (module: Module) => {
  if (typeof module?.xp_reward === 'number') return module.xp_reward;
  if (typeof module?.xpReward === 'number') return module.xpReward;
  if (typeof module?.metadata?.xpReward === 'number') {
    return module.metadata.xpReward;
  }
  return 0;
};

const getCourseCompletionBonus = (course: Course) => {
  if (typeof course?.xp_reward === 'number') return course.xp_reward;
  if (typeof course?.xp_reward_on_complete === 'number') {
    return course.xp_reward_on_complete;
  }
  if (typeof course?.curriculum?.metadata?.xpReward === 'number') {
    return course.curriculum.metadata.xpReward;
  }
  return 0;
};

const getLessonReward = (lesson: Lesson) => {
  if (typeof lesson?.xp_reward === 'number') return lesson.xp_reward;
  if (typeof lesson?.xpReward === 'number') return lesson.xpReward;
  return 0;
};

const formatTotalXP = (course: Course, modules: Module[]) => {
  const lessonsXP = modules.reduce((acc, module) => {
    if (!Array.isArray(module.lessons)) return acc;
    return (
      acc +
      module.lessons.reduce(
        (sum, lesson) => sum + getLessonReward(lesson),
        0,
      )
    );
  }, 0);

  const moduleBonusXP = modules.reduce(
    (acc, module) => acc + getModuleBonusXP(module),
    0,
  );

  const courseBonusXP = getCourseCompletionBonus(course);
  return lessonsXP + moduleBonusXP + courseBonusXP;
};

const stripHtml = (value: string) =>
  value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const USE_COURSE_HUB_V2 =
  process.env.NEXT_PUBLIC_EDU_COURSE_HUB_V2 === 'true';

export default function CoursesPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  const { language, t } = useLanguage();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(!USE_COURSE_HUB_V2);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [progressState, setProgressState] = useState<ProgressFetchState>('idle');

  const userXP = user?.xp_total || 0;
  const xpTotalValue = progressSummary?.xp?.total ?? userXP ?? 0;
  const startLessonsTotal = progressSummary?.startHere?.totalLessons ?? 0;
  const startLessonsDone = progressSummary?.startHere?.completedLessons ?? 0;
  const startCourseProgressPercent =
    startLessonsTotal > 0
      ? Math.min(100, Math.round((startLessonsDone / startLessonsTotal) * 100))
      : progressSummary?.startHere?.progressPercent ?? 0;
  const unlockedLevelsCount =
    progressSummary?.levels?.filter((level) => level.isUnlocked).length ?? 0;
  const visibleLevelsCount = progressSummary?.levels
    ? progressSummary.levels.filter((level) => level.isVisible).length ||
      progressSummary.levels.length
    : 0;
  const earnedBadges = progressSummary?.badges?.earned.length ?? 0;
  const availableLanguagesCount = Array.isArray(
    progressSummary?.startCourse?.available_languages,
  )
    ? progressSummary?.startCourse?.available_languages.length ?? 0
    : 3;
  const levelSummary = progressSummary?.xp?.currentLevel;

  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  const courseOverviewStats = [
    {
      key: 'courses',
      label: tr('courses.stats.availableCourses', 'Cursos ativos'),
      value: USE_COURSE_HUB_V2
        ? tr('courses.stats.hubActive', 'Hub ativo')
        : courses.length.toString(),
    },
    {
      key: 'badges',
      label: tr('courses.stats.badgesEarned', 'Badges ganhos'),
      value: earnedBadges.toString(),
    },
    {
      key: 'languages',
      label: tr('courses.stats.languages', 'Idiomas'),
      value: availableLanguagesCount.toString(),
    },
  ];

  useEffect(() => {
    if (USE_COURSE_HUB_V2) {
      return;
    }
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch('/api/courses?includeModules=true', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          console.error('Failed to load courses:', data.error);
          setCourses([]);
        } else {
          setCourses(data.courses || []);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [getToken]);

  useEffect(() => {
    if (!user) {
      setProgressSummary(null);
      setProgressState('anonymous');
      return;
    }
    const controller = new AbortController();
    const fetchSummary = async () => {
      setProgressState('loading');
      try {
        const token = getToken();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch('/api/education/progress', {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to load progress summary');
        const data = await response.json();
        if (!data.success || !data.summary) {
          throw new Error('Invalid progress response');
        }
        setProgressSummary(data.summary as ProgressSummary);
        setProgressState('success');
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return;
        }
        console.error('Failed to load progress summary', error);
        setProgressSummary(
          buildFallbackProgressSummary({
            xpTotal: user.xp_total,
            startCourseSlug: START_HERE_FALLBACK_ID,
          }),
        );
        setProgressState('fallback');
      }
    };
    void fetchSummary();
    return () => controller.abort();
  }, [user, getToken]);

  const getLevelBadge = (course: Course) => {
    const level = course.level?.toLowerCase() ?? '';
    const slug = ((course as any)?.slug || '').toString().toLowerCase();
    const infantilLabel = tr('courses.level.infantil', 'Infantil');
    const baseClass =
      'border border-white/15 bg-cyan-500/15 text-cyan-100 text-[11px] uppercase tracking-[0.3em] rounded-full px-3 py-1';

    if (
      INFANTIL_COURSE_SLUGS.includes(slug) ||
      INFANTIL_COURSE_IDS.includes(course.id)
    ) {
      return (
        <Badge variant="outline" className={baseClass}>
          {infantilLabel}
        </Badge>
      );
    }

    switch (level) {
      case 'beginner':
        return (
          <Badge variant="outline" className={baseClass}>
            {tr('education.level.beginner', 'Principiante')}
          </Badge>
        );
      case 'intermediate':
        return (
          <Badge variant="outline" className={baseClass}>
            {tr('education.level.intermediate', 'Intermédio')}
          </Badge>
        );
      case 'advanced':
        return (
          <Badge variant="outline" className={baseClass}>
            {tr('education.level.advanced', 'Avançado')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className={baseClass}>
            {tr('education.level.unknown', 'Todos os níveis')}
          </Badge>
        );
    }
  };

  const getInitials = (text: string) => {
    if (!text) return 'LG';
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return ((words[0][0] || '') + (words[1][0] || '')).toUpperCase();
  };

  if (!USE_COURSE_HUB_V2 && loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
            <p className="text-slate-300">
              {tr('courses.loading', 'A carregar cursos...')}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl space-y-10">
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-8 shadow-2xl shadow-black/40">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-16 -left-10 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
              </div>
              <div className="relative">
                <StartHereHero
                  summary={progressSummary}
                  state={progressState}
                  preferredLanguage={language}
                />
              </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#031b27] px-6 py-6 shadow-[0_25px_60px_rgba(2,10,20,0.65)]">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-20 -right-12 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
              </div>
              <div className="relative">
                <LevelTimeline summary={progressSummary} state={progressState} />
              </div>
            </section>

            <section
              id="levels"
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#020c18] via-[#00141f] to-[#021c27] px-6 py-8 shadow-[0_25px_60px_rgba(2,10,20,0.65)]"
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-16 -left-16 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
                <div className="absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-[#5af3ff]/10 blur-3xl" />
              </div>
              <div className="relative">
                <LevelSections summary={progressSummary} />
              </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-8 shadow-[0_25px_60px_rgba(2,10,20,0.65)]">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-20 -right-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-[#fdd87c]/10 blur-3xl" />
              </div>
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                    {tr('nav.courses', 'Cursos')}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-[#fdd87c] md:text-4xl">
                    {tr('courses.mainTitle', 'Cursos')}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-100">
                    {tr(
                      'courses.mainSubtitle',
                      'Percursos estruturados sobre Web3, a blockchain Apertum e o ecossistema desportivo. Ganha XP à medida que avanças.',
                    )}
                  </p>
                </div>
                <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
                  {courseOverviewStats.map((stat) => (
                    <div
                      key={stat.key}
                      className="rounded-2xl border border-white/15 bg-[#000c12]/40 px-4 py-3 text-center shadow-lg shadow-black/40"
                    >
                      <p className="text-[11px] uppercase tracking-[0.4em] text-[#fdd87c]">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[#5af3ff]">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-[#000c12]/80 px-4 py-2 text-sm text-slate-300 md:text-base shadow-[0_10px_30px_rgba(3,12,20,0.5)]">
                  {user ? (
                    <>
                      <span>
                        {tr('courses.yourXP', 'O teu XP')}:{' '}
                        <strong className="text-white">{userXP.toLocaleString()}</strong>
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                        {tr('courses.loggedIn', 'Sessão iniciada')}
                      </span>
                    </>
                  ) : (
                    tr('courses.loginReminder', 'Autentica-te para acompanhar o teu progresso.')
                  )}
                </div>
                {!user && (
                  <Button
                    onClick={() => router.push('/login')}
                    className="w-full bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] transition hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045] sm:w-auto"
                  >
                    {tr('auth.login', 'Inicia sessão para ganhar XP')}
                  </Button>
                )}
              </div>
              <div className="mt-8">
                {USE_COURSE_HUB_V2 ? (
                  <CourseHubV2 />
                ) : courses.length === 0 ? (
                  <Card className="border border-white/10 bg-[#000c12]/80">
                    <CardContent className="py-10 text-center text-slate-300">
                      {tr(
                        'courses.noCourses',
                        'Ainda não há cursos disponíveis. Volta em breve!',
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {courses.map((course) => {
                  const title = getMultilingualContent(course.title, language);
                  const description = stripHtml(
                    getMultilingualContent(
                      course.description,
                      language,
                    ),
                  );

                  const modulesArray: Module[] = Array.isArray(course.modules)
                    ? (course.modules as Module[])
                    : [];

                  const totalModules = course.total_modules ?? modulesArray.length;

                  const totalLessons =
                    course.total_lessons ??
                    modulesArray.reduce(
                      (acc, m) =>
                        acc +
                        (Array.isArray(m.lessons) ? m.lessons.length : 0),
                      0,
                    );

                  const totalXP = formatTotalXP(course, modulesArray);
                  const completionsCount =
                    course.completions_count ??
                    (course as any)?.completionsCount ??
                    (course as any)?.total_completions ??
                    0;

                  const xpRequired = course.xp_threshold ?? 0;
                  const isLocked = userXP < xpRequired;

                  const isCourseCreator = !!course.isCreator;

                  const imageUrl =
                    course.image_url || course.thumbnail_url || null;

                  const initials = getInitials(title);



                  return (

                    <Card
                      key={course.id}
                      className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#04131b] shadow-[0_30px_65px_rgba(3,10,25,0.55)] transition hover:border-cyan-400/70 hover:shadow-[0_0_35px_rgba(34,211,238,0.35)]"
                    >
                      <div className="relative overflow-hidden border border-white/10 bg-[#000c12]">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={title}
                            className="h-40 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-[#020b16] via-[#000c12] to-[#04131b] text-cyan-100">
                            <div className="flex flex-col items-center text-white">
                              <div className="mb-1 flex items-center gap-2">
                                <BookOpen className="h-6 w-6 text-[#fdd87c]" />
                                <span className="text-xl font-bold text-white">
                                  {initials}
                                </span>
                              </div>
                              <span className="text-[11px] uppercase tracking-[0.3em] text-white/70">
                                {tr('courses.defaultCourseLabel', 'Curso Legacy')}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="absolute right-3 top-3">
                          {getLevelBadge(course)}
                        </div>
                      </div>

                      <CardHeader className="space-y-3 pb-3">
                        <div>
                          <CardTitle className="text-lg text-white">{title}</CardTitle>

                          {isCourseCreator && (
                            <div className="mt-2">
                              <Badge className="flex w-fit items-center gap-1 border border-white/20 bg-[#14718f] text-white">
                                <PenSquare className="h-3 w-3" />
                                Creator
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {xpRequired > 0 && (
                            <Badge
                              variant="outline"
                              className="border-[#fdd87c]/40 bg-[#fdd87c]/10 text-[#fdd87c] text-[11px] uppercase tracking-[0.3em]"
                            >
                              {xpRequired} XP
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-slate-300 line-clamp-4 min-h-[72px]">
                          {description ||
                            tr(
                              'courses.noDescription',
                              'Descrição breve indisponível.',
                            )}
                        </p>
                      </CardHeader>

                      <CardContent className="flex flex-1 flex-col justify-between space-y-4 pt-0">
                        <div className="flex flex-col gap-2 text-sm text-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-[#5af3ff]" />
                              <span>
                                {totalModules}{' '}
                                {tr('courses.modules', 'módulos')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-[#5af3ff]" />
                              <span>
                                {totalLessons}{' '}
                                {tr('courses.lessons', 'lições')}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-base text-white">
                              <Award className="h-4 w-4 text-[#fdd87c]" />
                              <span>
                                {totalXP}{' '}
                                {tr('courses.totalXP', 'XP disponível')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-300">
                              <Users className="h-4 w-4 text-[#5af3ff]" />
                              <span>
                                {completionsCount}{' '}
                                {tr(
                                  'courses.completions',
                                  'utilizadores concluíram',
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          {isLocked ? (
                            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-[#04131b] px-3 py-1 text-xs text-slate-200">
                              <Lock className="h-3 w-3 text-[#fdd87c]" />
                              <span>
                                {tr('courses.unlockAt', 'Desbloqueia aos')}{' '}
                                <strong>{xpRequired} XP</strong>
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-full border border-cyan-400/70 bg-cyan-500/10 px-3 py-1 text-xs text-white">
                              <CheckCircle className="h-3 w-3 text-[#5af3ff]" />
                              <span>
                                {tr(
                                  'courses.unlocked',
                                  'Já podes aceder a este curso',
                                )}
                              </span>
                            </div>
                          )}

                          <div className="flex flex-1 items-center justify-end gap-2">
                            <Link href={`/education/courses/${course.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-white/50 bg-black/40 text-white hover:bg-black/60"
                              >
                                <span className="text-xs font-semibold">
                                  {tr('courses.learnMore', 'Saber mais')}
                                </span>
                              </Button>
                            </Link>
                            <Link href={`/education/courses/${course.id}`}>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                                disabled={isLocked && !user}
                              >
                                <span className="text-xs font-semibold">
                                  {tr('courses.viewDetails', 'Ver curso')}
                                </span>
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>


                  );


                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
    <section className="mt-10">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-8 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -right-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>
          <div className="relative">
            <NextUnlockCTA summary={progressSummary} state={progressState} />
          </div>
        </div>
      </div>
    </section>
      </main>
      <Footer />
    </div>
  );
}
