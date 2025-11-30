'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Award,
  Clock,
  CheckCircle,
  PenSquare,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import { ContentTracker } from '@/components/ContentTracker';

type Lesson = {
  id: string;
  title: any;
  description: any;
  content: any;
  xp_reward: number;
  estimated_time?: number | null;
  order?: number | null;
  module_id?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  created_at?: string;
};

type ModuleLessonLink = {
  id: string;
  title: any;
  order?: number | null;
};

type LessonModule = {
  id: string;
  title: any;
  course_id?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  lessons: ModuleLessonLink[];
};

type LessonStats = {
  completedCount: number;
  totalXpDistributed: number;
};

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const { user, getToken } = useAuth();
  const { language, t } = useLanguage();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [moduleData, setModuleData] = useState<LessonModule | null>(
    null,
  );
  const [stats, setStats] = useState<LessonStats | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isCreator, setIsCreator] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  const isAdminUser =
    !!user &&
    (user.role === 'Super Admin' || user.role === 'Admin');

  // ---------------------------------------------------------------------------
  // FETCH DA LIÇÃO (inclui stats + flags isCompleted / isCreator)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId) return;
      setLoading(true);
      try {
        const token = getToken();
        const userId = user?.id ?? '';
        const paramsStr = userId ? `?userId=${userId}` : '';
        const res = await fetch(
          `/api/lessons/${lessonId}${paramsStr}`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        const data = await res.json();

        if (!res.ok || !data.success || !data.lesson) {
          setLesson(null);
          setModuleData(null);
          setStats(null);
          setIsCompleted(false);
          setIsCreator(false);
          setNotFound(true);
        } else {
          setLesson(data.lesson as Lesson);
          setModuleData(
            (data.module || null) as LessonModule | null,
          );
          setStats(
            (data.stats || null) as LessonStats | null,
          );
          setIsCompleted(!!data.isCompleted);
          setIsCreator(!!data.isCreator);
          setNotFound(false);
        }
      } catch (error) {
        console.error('Failed to load lesson detail:', error);
        setLesson(null);
        setModuleData(null);
        setStats(null);
        setIsCompleted(false);
        setIsCreator(false);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, getToken, user?.id]);

  // ---------------------------------------------------------------------------
  // DERIVADOS (título, descrição, conteúdo, prev/next)
  // ---------------------------------------------------------------------------
  const title = useMemo(
    () =>
      lesson
        ? getMultilingualContent(lesson.title, language)
        : '',
    [lesson, language],
  );

  const description = useMemo(
    () =>
      lesson
        ? getMultilingualContent(lesson.description, language)
        : '',
    [lesson, language],
  );

  const contentHtml = useMemo(
    () =>
      lesson
        ? getMultilingualContent(lesson.content, language)
        : '',
    [lesson, language],
  );

  const estimatedMinutes = lesson?.estimated_time ?? 10;
  const xpReward = lesson?.xp_reward ?? 0;

  const moduleTitle = useMemo(
    () =>
      moduleData
        ? getMultilingualContent(moduleData.title, language)
        : '',
    [moduleData, language],
  );

  const moduleLessonsSorted: ModuleLessonLink[] = useMemo(() => {
    if (!moduleData || !Array.isArray(moduleData.lessons)) {
      return [];
    }
    return moduleData.lessons
      .slice()
      .sort(
        (a: ModuleLessonLink, b: ModuleLessonLink) =>
          (a.order || 0) - (b.order || 0),
      );
  }, [moduleData]);

  const { prevLesson, nextLesson } = useMemo(() => {
    if (!moduleLessonsSorted.length || !lessonId) {
      return { prevLesson: null as ModuleLessonLink | null, nextLesson: null as ModuleLessonLink | null };
    }
    const index = moduleLessonsSorted.findIndex(
      (l) => l.id === lessonId,
    );
    if (index === -1) {
      return { prevLesson: null, nextLesson: null };
    }
    const prev =
      index > 0 ? moduleLessonsSorted[index - 1] : null;
    const next =
      index < moduleLessonsSorted.length - 1
        ? moduleLessonsSorted[index + 1]
        : null;
    return { prevLesson: prev, nextLesson: next };
  }, [moduleLessonsSorted, lessonId]);

  const authorName =
    lesson?.author_name ||
    (isCreator && user ? user.username : 'Admin');

  // ---------------------------------------------------------------------------
  // LOADING / NOT FOUND
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              {tr(
                'lessons.loading',
                'A carregar lição...',
              )}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !lesson) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center px-4">
            <h1 className="text-2xl font-bold mb-2">
              {tr('lessons.notFound', 'Lição não encontrada')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {tr(
                'lessons.notFoundDescription',
                'A lição que procuras não existe ou não está publicada.',
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/education/courses"
                className="inline-flex items-center gap-2 text-blue-600 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                {tr(
                  'lessons.backToCourses',
                  'Voltar aos cursos',
                )}
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const showCompletedBadge =
    !!isCompleted && !isCreator;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* NAV SUPERIOR */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.back()
                  }
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {tr(
                    'lessons.back',
                    'Voltar',
                  )}
                </Button>
                {moduleData?.course_id && (
                  <Link
                    href={`/education/courses/${moduleData.course_id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {tr(
                      'lessons.backToCourse',
                      'Ver curso completo',
                    )}
                  </Link>
                )}
              </div>

              <div className="flex gap-2">
                {prevLesson && (
                  <Link
                    href={`/education/lessons/${prevLesson.id}`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      {tr(
                        'lessons.prev',
                        'Anterior',
                      )}
                    </Button>
                  </Link>
                )}
                {nextLesson && (
                  <Link
                    href={`/education/lessons/${nextLesson.id}`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      {tr(
                        'lessons.next',
                        'Seguinte',
                      )}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* CARD PRINCIPAL */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {tr(
                          'lessons.lesson',
                          'Lição',
                        )}
                      </Badge>
                      {isCreator && (
                        <Badge className="bg-purple-600 text-white flex items-center gap-1">
                          <PenSquare className="h-3 w-3" />
                          Creator
                        </Badge>
                      )}
                      {showCompletedBadge && (
                        <Badge className="bg-green-600 text-white flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Completed
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-2xl md:text-3xl">
                      {title}
                    </CardTitle>

                    {description && (
                      <CardDescription className="text-base text-gray-700 dark:text-gray-300">
                        {description}
                      </CardDescription>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>
                        {tr(
                          'lessons.by',
                          'Criado por',
                        )}{' '}
                        <span className="font-semibold">
                          {authorName}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3 w-3 text-blue-600" />
                        {xpReward} XP
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-600" />
                        {estimatedMinutes}{' '}
                        {tr(
                          'lessons.minutes',
                          'min',
                        )}
                      </span>
                      {moduleTitle && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3 text-gray-500" />
                          {tr(
                            'lessons.module',
                            'Módulo',
                          )}
                          :{' '}
                          <span className="font-medium">
                            {moduleTitle}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* STATS DA LIÇÃO */}
                  <div className="flex flex-col items-end gap-2 text-xs">
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                      <Users className="h-3 w-3 text-blue-600" />
                      <span>
                        {tr(
                          'lessons.completedCount',
                          'Leituras concluídas',
                        )}
                        :{' '}
                        <strong>
                          {stats?.completedCount ?? 0}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                      <Award className="h-3 w-3 text-emerald-600" />
                      <span>
                        {tr(
                          'lessons.totalXpDistributed',
                          'XP distribuído',
                        )}
                        :{' '}
                        <strong>
                          {stats?.totalXpDistributed ?? 0} XP
                        </strong>
                      </span>
                    </div>
                    {isCreator && (
                      <p className="mt-1 text-[11px] text-amber-700 max-w-xs text-right">
                        {tr(
                          'lessons.creatorInfo',
                          'Não ganhas XP por leres a tua própria lição. Recebes 19% do XP que cada utilizador ganha na primeira conclusão.',
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* TRACKER + CONTEÚDO */}
                <ContentTracker
                  contentId={lesson.id}
                  contentType="lesson"
                  xpReward={xpReward}
                  estimatedMinutes={estimatedMinutes}
                  initialCompleted={isCompleted}
                  userId={user?.id ?? null}
                  isAuthor={isCreator}
                >
                  <article className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
                    {contentHtml ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: contentHtml,
                        }}
                      />
                    ) : (
                      <p className="text-gray-500">
                        {tr(
                          'lessons.noContent',
                          'Ainda não há conteúdo disponível para esta lição.',
                        )}
                      </p>
                    )}
                  </article>
                </ContentTracker>
              </CardContent>
            </Card>

            {/* NAV INFERIOR */}
            <div className="flex flex-wrap justify-between gap-3 mt-4">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.back()
                  }
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {tr(
                    'lessons.back',
                    'Voltar',
                  )}
                </Button>
                {moduleData?.course_id && (
                  <Link
                    href={`/education/courses/${moduleData.course_id}`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <BookOpen className="h-3 w-3" />
                      {tr(
                        'lessons.viewCourse',
                        'Ver curso',
                      )}
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex gap-2">
                {prevLesson && (
                  <Link
                    href={`/education/lessons/${prevLesson.id}`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      {tr(
                        'lessons.prev',
                        'Anterior',
                      )}
                    </Button>
                  </Link>
                )}
                {nextLesson && (
                  <Link
                    href={`/education/lessons/${nextLesson.id}`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      {tr(
                        'lessons.next',
                        'Seguinte',
                      )}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
