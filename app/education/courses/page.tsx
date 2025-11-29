'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  BookOpen,
  Award,
  Lock,
  ArrowRight,
  CheckCircle,
  PenSquare,
  Trophy,
  Target,
} from 'lucide-react';

type Lesson = {
  id: string;
  xp_reward: number;
};

type Module = {
  id: string;
  lessons?: Lesson[];
};

type Course = {
  id: string;
  title: any;
  description: any;
  level?: string | null;
  xp_threshold: number;
  image_url?: string | null;
  modules?: Module[];

  // autoria / stats opcionais, para futuro:
  author_id?: string | null;
  author_name?: string | null;
  author?: string | null;

  total_xp_distributed?: number | null;
  total_completions?: number | null;

  user_progress_percent?: number | null;
  user_completed_lessons?: number | null;
  user_total_lessons?: number | null;
};

export default function CoursesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const userXP = user?.xp_total || 0;

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch('/api/courses?includeModules=true');
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
  }, []);

  // -------------------------------------------------------------------
  // DERIVED METRICS GLOBAIS
  // -------------------------------------------------------------------

  const {
    totalCourses,
    totalLessonsGlobal,
    totalXPGlobal,
    unlockedCourses,
    lockedCourses,
  } = useMemo(() => {
    if (!courses || courses.length === 0) {
      return {
        totalCourses: 0,
        totalLessonsGlobal: 0,
        totalXPGlobal: 0,
        unlockedCourses: 0,
        lockedCourses: 0,
      };
    }

    let lessonsCount = 0;
    let xpSum = 0;
    let unlocked = 0;
    let locked = 0;

    for (const course of courses) {
      const modulesArray: Module[] = Array.isArray(course.modules)
        ? (course.modules as Module[])
        : [];

      const courseLessons = modulesArray.reduce(
        (acc, m) =>
          acc +
          (Array.isArray(m.lessons) ? m.lessons.length : 0),
        0,
      );

      const courseXP = modulesArray.reduce((acc, m) => {
        if (!Array.isArray(m.lessons)) return acc;
        return (
          acc +
          m.lessons.reduce(
            (accL, l) => accL + (l.xp_reward || 0),
            0,
          )
        );
      }, 0);

      lessonsCount += courseLessons;
      xpSum += courseXP;

      const xpRequired = course.xp_threshold ?? 0;
      if (userXP >= xpRequired) unlocked += 1;
      else locked += 1;
    }

    return {
      totalCourses: courses.length,
      totalLessonsGlobal: lessonsCount,
      totalXPGlobal: xpSum,
      unlockedCourses: unlocked,
      lockedCourses: locked,
    };
  }, [courses, userXP]);

  // -------------------------------------------------------------------
  // BADGE DE NÍVEL
  // -------------------------------------------------------------------

  const getLevelBadge = (level?: string | null) => {
    switch (level) {
      case 'beginner':
        return (
          <Badge className="bg-green-600">
            {t('education.level.beginner') || 'Beginner'}
          </Badge>
        );
      case 'intermediate':
        return (
          <Badge className="bg-yellow-600">
            {t('education.level.intermediate') || 'Intermediate'}
          </Badge>
        );
      case 'advanced':
        return (
          <Badge className="bg-red-600">
            {t('education.level.advanced') || 'Advanced'}
          </Badge>
        );
      default:
        return (
          <Badge>
            {t('education.level.unknown') || 'All levels'}
          </Badge>
        );
    }
  };

  // -------------------------------------------------------------------
  // LOADING STATE
  // -------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              {t('courses.loading') || 'Loading courses...'}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // -------------------------------------------------------------------
  // MAIN
  // -------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* HERO + STATS TOP BAR */}
            <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {t('courses.mainTitle') ||
                    t('courses.title') ||
                    'Courses'}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
                  {t('courses.mainSubtitle') ||
                    t('courses.subtitle') ||
                    'Unlock structured learning paths about Web3, the Apertum blockchain and the sports universe. Earn XP as you progress and prove your consistency.'}
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-800 border border-blue-100">
                  <Trophy className="h-3 w-3" />
                  <span>
                    {t('courses.badge.legacyPath') ||
                      'Legacy Education Track · Designed for serious learners'}
                  </span>
                </div>
              </div>

              <div className="w-full md:w-[340px] grid grid-cols-3 md:grid-cols-3 gap-3 text-xs">
                <Card className="col-span-3 md:col-span-1 border-blue-100 bg-blue-50">
                  <CardContent className="py-3 px-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-blue-700 uppercase tracking-wide">
                        {t('courses.stats.courses') || 'Courses'}
                      </span>
                      <Target className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {totalCourses}
                    </div>
                    <p className="text-[11px] text-blue-700">
                      {t('courses.stats.coursesHint') ||
                        'Structured learning paths'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="col-span-3 md:col-span-1 border-emerald-100 bg-emerald-50">
                  <CardContent className="py-3 px-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-emerald-700 uppercase tracking-wide">
                        {t('courses.stats.lessons') || 'Lessons'}
                      </span>
                      <BookOpen className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-900">
                      {totalLessonsGlobal}
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      {t('courses.stats.lessonsHint') ||
                        'Short, focused content'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="col-span-3 md:col-span-1 border-amber-100 bg-amber-50">
                  <CardContent className="py-3 px-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-700 uppercase tracking-wide">
                        {t('courses.stats.xp') || 'XP Available'}
                      </span>
                      <Award className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-amber-900">
                      {totalXPGlobal}
                    </div>
                    <p className="text-[11px] text-amber-700">
                      {t('courses.stats.xpHint') ||
                        'XP you can earn if you go all in'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* BARRA: ESTADO DO UTILIZADOR */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {user ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    {t('courses.yourXP') || 'Your XP'}:{' '}
                    <strong>{userXP}</strong>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 border border-gray-200">
                    <Trophy className="h-3 w-3" />
                    <span>
                      {t('courses.unlockedCount') ||
                        'Unlocked courses'}:{' '}
                      <strong>{unlockedCourses}</strong>
                    </span>
                    <span className="mx-1">·</span>
                    <span>
                      {t('courses.lockedCount') || 'Locked'}:{' '}
                      <strong>{lockedCourses}</strong>
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('courses.loginHint') ||
                      'Create a free account to track your progress and earn XP.'}
                  </p>
                  <Button
                    onClick={() => router.push('/login')}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    {t('auth.login') || 'Login to earn XP'}
                  </Button>
                </div>
              )}
            </div>

            {/* LISTA DE CURSOS */}
            {courses.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  {t('courses.noCourses') ||
                    'No courses available yet. Check back soon!'}
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {courses.map((course) => {
                  const title = getMultilingualContent(
                    course.title,
                    language,
                  );
                  const description = getMultilingualContent(
                    course.description,
                    language,
                  );

                  const modulesArray: Module[] = Array.isArray(
                    course.modules,
                  )
                    ? (course.modules as Module[])
                    : [];

                  const totalModules = modulesArray.length;
                  const totalLessons = modulesArray.reduce(
                    (acc, m) =>
                      acc +
                      (Array.isArray(m.lessons)
                        ? m.lessons.length
                        : 0),
                    0,
                  );
                  const totalXP = modulesArray.reduce((acc, m) => {
                    if (!Array.isArray(m.lessons)) return acc;
                    return (
                      acc +
                      m.lessons.reduce(
                        (accL, l) => accL + (l.xp_reward || 0),
                        0,
                      )
                    );
                  }, 0);

                  const xpRequired = course.xp_threshold ?? 0;
                  const isLocked = userXP < xpRequired;
                  const isCourseCreator =
                    !!user &&
                    !!course.author_id &&
                    course.author_id === user.id;

                  const creatorName =
                    course.author_name ||
                    course.author ||
                    (isCourseCreator
                      ? user.username
                      : 'Admin');

                  const progressPercent =
                    typeof course.user_progress_percent === 'number'
                      ? Math.max(
                          0,
                          Math.min(
                            100,
                            course.user_progress_percent,
                          ),
                        )
                      : null;

                  return (
                    <Card
                      key={course.id}
                      className="flex flex-col overflow-hidden hover:shadow-md transition-shadow bg-white/90 dark:bg-slate-900/90"
                    >
                      {course.image_url && (
                        <div className="w-full h-40 bg-gray-200 overflow-hidden">
                          <img
                            src={course.image_url}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg line-clamp-2 flex items-center gap-2">
                              <span className="truncate">{title}</span>
                              {isCourseCreator && (
                                <Badge className="bg-purple-600 text-white flex items-center gap-1 whitespace-nowrap">
                                  <PenSquare className="h-3 w-3" />
                                  Creator
                                </Badge>
                              )}
                            </CardTitle>
                            {description && (
                              <CardDescription className="mt-1 line-clamp-3 text-xs md:text-sm">
                                {description}
                              </CardDescription>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                              <span>
                                {t('courses.by') || 'By'}{' '}
                                <strong>{creatorName}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {getLevelBadge(course.level)}
                            {xpRequired > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[11px]"
                              >
                                {xpRequired} XP min
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-4">
                        {/* META & STATS DO CURSO */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-blue-600" />
                              <span>
                                {totalModules}{' '}
                                {t('courses.modules') || 'modules'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-blue-600" />
                              <span>
                                {totalLessons}{' '}
                                {t('courses.lessons') || 'lessons'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-blue-600" />
                              <span>
                                {totalXP}{' '}
                                {t('courses.totalXP') || 'XP total'}
                              </span>
                            </div>
                          </div>

                          {typeof course.total_xp_distributed ===
                            'number' ||
                          typeof course.total_completions === 'number' ? (
                            <div className="flex items-center justify-between text-[11px] text-gray-500">
                              <span>
                                {t('courses.statsCard.xpDistributed') ||
                                  'XP distributed'}:{' '}
                                <strong>
                                  {course.total_xp_distributed ?? 0}
                                </strong>
                              </span>
                              <span>
                                {t('courses.statsCard.completions') ||
                                  'Lesson completions'}:{' '}
                                <strong>
                                  {course.total_completions ?? 0}
                                </strong>
                              </span>
                            </div>
                          ) : null}

                          {/* Barra de progresso do curso — opcional se backend já enviar percentagem */}
                          {user && progressPercent !== null && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                                <span>
                                  {t('courses.progress') ||
                                    'Your progress'}
                                </span>
                                <span>{progressPercent}%</span>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-2 bg-blue-600 rounded-full transition-all"
                                  style={{
                                    width: `${progressPercent}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ESTADO LOCKED / UNLOCKED + BOTÃO */}
                        <div className="flex items-center justify-between mt-2">
                          {isLocked && user ? (
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                              <Lock className="h-3 w-3" />
                              <span className="truncate">
                                {t('courses.unlockAt') || 'Unlock at'}{' '}
                                <strong>{xpRequired} XP</strong>
                              </span>
                            </div>
                          ) : isLocked && !user ? (
                            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                              <Lock className="h-3 w-3" />
                              <span className="truncate">
                                {t('courses.loginToUnlock') ||
                                  'Login and earn XP to unlock this course'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                              <CheckCircle className="h-3 w-3" />
                              <span className="truncate">
                                {t('courses.unlocked') ||
                                  'You can access this course'}
                              </span>
                            </div>
                          )}

                          <Link href={`/education/courses/${course.id}`}>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <span className="text-xs">
                                {t('courses.viewDetails') ||
                                  'View course'}
                              </span>
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
