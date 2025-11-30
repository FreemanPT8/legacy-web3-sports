'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ContentTracker } from '@/components/ContentTracker';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  PenSquare,
} from 'lucide-react';

interface Lesson {
  id: string;
  title: any;
  description: any;
  content: any;
  xp_reward: number;
  estimated_time?: number;
  order: number;
  module_id: string;
  author_id?: string | null;
  author_name?: string | null;
  created_at?: string | null;
}

interface ModuleWithLessons {
  id: string;
  title: any;
  course_id: string;
  lessons: Lesson[];
  author_id?: string | null;
  author_name?: string | null;
}

interface LessonStats {
  completedCount: number;
  totalXpDistributed: number;
}

interface LessonApiResponse {
  success: boolean;
  lesson: Lesson;
  module: ModuleWithLessons;
  isCompleted: boolean;
  isCreator: boolean;
  stats?: LessonStats;
}

export default function LessonPage() {
  const params = useParams();
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [module, setModule] = useState<ModuleWithLessons | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [stats, setStats] = useState<LessonStats | null>(null);
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [prevLesson, setPrevLesson] = useState<Lesson | null>(null);

  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  useEffect(() => {
    const fetchLesson = async () => {
      setLoading(true);

      try {
        const lessonId = params.id as string;
        const userId = user?.id || '';
        const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';

        const res = await fetch(`/api/lessons/${lessonId}${query}`);
        const data: LessonApiResponse = await res.json();

        if (!res.ok || !data.success || !data.lesson || !data.module) {
          setLesson(null);
          setModule(null);
          setIsCompleted(false);
          setIsCreator(false);
          setStats(null);
          setNextLesson(null);
          setPrevLesson(null);
          return;
        }

        const fetchedLesson = data.lesson;
        const fetchedModule = data.module;

        setLesson(fetchedLesson);
        setModule(fetchedModule);

        const creatorFlag = data.isCreator === true;
        setIsCreator(creatorFlag);
        setIsCompleted(creatorFlag ? false : data.isCompleted);

        setStats(data.stats ?? null);

        // Calcular prev/next com base na ordem
        if (Array.isArray(fetchedModule.lessons)) {
          const ordered = [...fetchedModule.lessons].sort(
            (a, b) => (a.order || 0) - (b.order || 0),
          );

          const idx = ordered.findIndex((l) => l.id === fetchedLesson.id);

          setPrevLesson(idx > 0 ? ordered[idx - 1] : null);
          setNextLesson(idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null);
        }
      } catch (err) {
        console.error('Failed to fetch lesson:', err);
        setLesson(null);
        setModule(null);
        setIsCompleted(false);
        setIsCreator(false);
        setStats(null);
        setNextLesson(null);
        setPrevLesson(null);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchLesson();
  }, [params.id, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              {tr('lessons.loading', 'A carregar lição...')}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!lesson || !module) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {tr('lessons.notFound', 'Lição não encontrada')}
              </h3>
              <p className="text-gray-600 mb-4">
                {tr(
                  'lessons.notFoundDescription',
                  'Esta lição não existe ou foi removida.',
                )}
              </p>
              <Link href="/education/courses">
                <Button>
                  {tr('lessons.backToCourses', 'Voltar aos cursos')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const title = getMultilingualContent(lesson.title, language);
  const description = getMultilingualContent(lesson.description, language);
  const content = getMultilingualContent(lesson.content, language);
  const moduleTitle = getMultilingualContent(module.title, language);

  const durationMinutes = lesson.estimated_time ?? 10;
  const creatorName = lesson.author_name || (lesson.author_id ? 'Creator' : 'Admin');
  const createdAtStr = lesson.created_at
    ? new Date(lesson.created_at).toLocaleDateString()
    : '-';

  const completedCount = stats?.completedCount ?? 0;
  const totalXpDistributed = stats?.totalXpDistributed ?? 0;

  const backHref = module.course_id
    ? `/education/courses/${module.course_id}`
    : '/education/courses';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Back */}
            <div className="mb-6">
              <Link href={backHref}>
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {tr('lessons.backToCourse', 'Voltar ao curso')}
                </Button>
              </Link>
            </div>

            {/* HEADER */}
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline">{moduleTitle}</Badge>

                  {isCreator ? (
                    <Badge className="bg-purple-600 text-white flex items-center gap-1">
                      <PenSquare className="h-3 w-3" />
                      {tr('lessons.creatorBadge', 'Creator')}
                    </Badge>
                  ) : isCompleted ? (
                    <Badge className="bg-green-600 text-white flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {tr('lessons.completedBadge', 'Concluída')}
                    </Badge>
                  ) : null}
                </div>

                <CardTitle className="text-3xl">{title}</CardTitle>

                {description && (
                  <p className="text-gray-600 text-lg mt-2">
                    {description}
                  </p>
                )}
              </CardHeader>

              <CardContent>
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {durationMinutes}{' '}
                      {tr('lessons.minutes', 'minutos')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span>
                      {lesson.xp_reward}{' '}
                      {tr('lessons.xpReward', 'XP por conclusão')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* META INFO */}
            <Card className="mb-6">
              <CardContent className="py-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <span className="block text-xs uppercase text-gray-500 mb-1">
                      {tr('lessons.meta.creator', 'Criador')}
                    </span>
                    <span className="font-semibold">{creatorName}</span>
                  </div>

                  <div>
                    <span className="block text-xs uppercase text-gray-500 mb-1">
                      {tr('lessons.meta.createdAt', 'Criada em')}
                    </span>
                    <span>{createdAtStr}</span>
                  </div>

                  <div>
                    <span className="block text-xs uppercase text-gray-500 mb-1">
                      {tr('lessons.meta.completedTimes', 'Conclusões')}
                    </span>
                    <span>
                      {completedCount}{' '}
                      {tr('lessons.meta.times', 'vezes')}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs uppercase text-gray-500 mb-1">
                      {tr('lessons.meta.xpDistributed', 'XP distribuído')}
                    </span>
                    <span>{totalXpDistributed} XP</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CONTENT + TRACKER */}
            <Card className="mb-6">
              <CardContent className="prose prose-lg max-w-none py-8">
                <ContentTracker
                  userId={user?.id ?? null}
                  contentId={lesson.id}
                  contentType="lesson"
                  xpReward={lesson.xp_reward}
                  estimatedMinutes={durationMinutes}
                  initialCompleted={isCompleted && !isCreator}
                  isAuthor={isCreator}
                  onComplete={() => setIsCompleted(true)}
                >
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                </ContentTracker>
              </CardContent>
            </Card>

            {/* COMPLETION MESSAGE (ONLY NON-CREATORS) */}
            {isCompleted && !isCreator && (
              <Card className="mb-6 bg-green-50 border-green-200">
                <CardContent className="py-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-1">
                    {tr('lessons.completedTitle', 'Lição concluída!')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {tr(
                      'lessons.completedDescription',
                      'Ganhaste {xp} XP por completar esta lição.',
                    ).replace('{xp}', String(lesson.xp_reward))}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* NAVIGATION */}
            <div className="flex justify-between gap-4">
              {prevLesson ? (
                <Link
                  href={`/education/lessons/${prevLesson.id}`}
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {tr('lessons.previous', 'Anterior')}:{' '}
                    {getMultilingualContent(prevLesson.title, language)}
                  </Button>
                </Link>
              ) : (
                <div className="flex-1" />
              )}

              {nextLesson ? (
                <Link
                  href={`/education/lessons/${nextLesson.id}`}
                  className="flex-1"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    {tr('lessons.next', 'Seguinte')}:{' '}
                    {getMultilingualContent(nextLesson.title, language)}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link href={backHref} className="flex-1">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    {tr('lessons.backToCourseCta', 'Voltar ao curso')}
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
