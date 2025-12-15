'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  BookOpen,
  Award,
  Clock,
  CheckCircle,
  PenSquare,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';

type Lesson = {
  id: string;
  title: any;
  xp_reward: number;
  estimated_time?: number | null;
  order?: number | null;
  author_id?: string | null;
  author_name?: string | null;
  isCompleted?: boolean;
  isCreator?: boolean;
  content_has_read_more?: boolean;
};

type Module = {
  id: string;
  title: any;
  order?: number | null;
  author_id?: string | null;
  author_name?: string | null;
  isCreator?: boolean;
  isCompleted?: boolean;
  xp_available?: number;
  xp_distributed?: number;
  lessons?: Lesson[];
};

type Course = {
  id: string;
  title: any;
  description: any;
  level?: string | null;
  xp_threshold: number;
  image_url?: string | null;
  thumbnail_url?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  isCreator?: boolean;
  modules?: Module[];
  total_modules?: number;
  total_lessons?: number;
  total_xp?: number;
  xp_distributed?: number;
  xp_earned_by_user?: number;
};

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;

  const { user, getToken } = useAuth();
  const { language, t } = useLanguage();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  const isAdminUser =
    !!user &&
    (user.role === 'Super Admin' || user.role === 'Admin');

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch(`/api/courses/${courseId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success || !data.course) {
          setCourse(null);
          setNotFound(true);
        } else {
          setCourse(data.course);
          setNotFound(false);
        }
      } catch (error) {
        console.error('Failed to load course detail:', error);
        setCourse(null);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId, getToken]);

  const getLevelBadge = (level?: string | null) => {
    switch (level) {
      case 'beginner':
        return (
          <Badge className="bg-green-600">
            {tr('education.level.beginner', 'Principiante')}
          </Badge>
        );
      case 'intermediate':
        return (
          <Badge className="bg-yellow-600">
            {tr('education.level.intermediate', 'Intermédio')}
          </Badge>
        );
      case 'advanced':
        return (
          <Badge className="bg-red-600">
            {tr('education.level.advanced', 'Avançado')}
          </Badge>
        );
      default:
        return (
          <Badge>
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-slate-200">
              {tr('courses.loading', 'A carregar curso...')}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-50">
              {tr('courses.notFound', 'Curso não encontrado')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {tr(
                'courses.notFoundDescription',
                'O curso que procuras não existe ou não está publicado.',
              )}
            </p>
            <Link
              href="/education/courses"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              {tr('courses.back', 'Voltar aos cursos')}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const title = getMultilingualContent(course.title, language);
  const description = getMultilingualContent(
    course.description,
    language,
  );

  const imageUrl = course.image_url || course.thumbnail_url || null;

  const initials = getInitials(title);

  const totalModules = course.total_modules ?? 0;
  const totalLessons = course.total_lessons ?? 0;
  const totalXP = course.total_xp ?? 0;
  const xpRequired = course.xp_threshold ?? 0;
  const xpDistributed = course.xp_distributed ?? 0;
  const userXpInCourse = course.xp_earned_by_user ?? 0;

  const authorName = course.author_name || 'Admin';
  const isCourseCreator =
    !!course.isCreator ||
    (!!user &&
      ((course.author_id && course.author_id === user.id) ||
        (!course.author_id && isAdminUser)));

  const modules: Module[] = Array.isArray(course.modules)
    ? (course.modules as Module[])
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12]">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="mb-4">
              <Link
                href="/education/courses"
                className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                {tr('courses.back', 'Voltar aos cursos')}
              </Link>
            </div>

            {/* HEADER DO CURSO */}
            <Card className="mb-6 overflow-hidden bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              {/* Thumbnail / Placeholder */}
              {imageUrl ? (
                <div className="w-full h-56 bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-56 bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 flex items-center justify-center">
                  <div className="flex flex-col items-center text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-7 w-7" />
                      <span className="text-2xl font-bold">
                        {initials}
                      </span>
                    </div>
                    <span className="text-[11px] uppercase tracking-wide opacity-80">
                      Legacy Course
                    </span>
                  </div>
                </div>
              )}

              <CardHeader>
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getLevelBadge(course.level)}
                      {isCourseCreator && (
                        <Badge className="bg-purple-600 text-white flex items-center gap-1">
                          <PenSquare className="h-3 w-3" />
                          Creator
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-2xl md:text-3xl text-gray-900 dark:text-gray-50">
                      {title}
                    </CardTitle>

                    {description && (
                      <CardDescription className="text-base text-gray-700 dark:text-gray-300">
                        {description}
                      </CardDescription>
                    )}

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {tr('courses.by', 'Criado por')}{' '}
                      <span className="font-semibold">
                        {authorName}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span>
                        {totalModules}{' '}
                        {tr('courses.modules', 'módulos')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span>
                        {totalLessons}{' '}
                        {tr('courses.lessons', 'lições')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      <span>
                        {totalXP}{' '}
                        {tr('courses.totalXP', 'XP disponível')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-green-600" />
                      <span>
                        {xpDistributed}{' '}
                        {tr('courses.xpDistributed', 'XP já entregue')}
                      </span>
                    </div>
                    {user && (
                      <div className="flex items-center gap-2 text-xs text-blue-900 dark:text-blue-100 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 rounded-full px-3 py-1">
                        <Award className="h-3 w-3" />
                        <span>
                          {tr(
                            'courses.yourXPInCourse',
                            'Tu já ganhaste',
                          )}{' '}
                          <strong>{userXpInCourse} XP</strong>{' '}
                          {tr('courses.inThisCourse', 'neste curso')}
                        </span>
                      </div>
                    )}
                    {xpRequired > 0 && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {tr(
                          'courses.unlockAt',
                          'XP mínimo recomendado',
                        )}
                        : <strong>{xpRequired} XP</strong>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* MÓDULOS & LIÇÕES */}
            {modules.length === 0 ? (
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <CardContent className="py-8 text-center text-gray-500 dark:text-gray-300">
                  {tr(
                    'courses.noModules',
                    'Este curso ainda não tem módulos publicados.',
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {modules.map((mod) => {
                  const modTitle = getMultilingualContent(
                    mod.title,
                    language,
                  );
                  const moduleAuthorName = mod.author_name || 'Admin';

                  const isModuleCreator =
                    !!mod.isCreator ||
                    (!!user &&
                      ((mod.author_id &&
                        mod.author_id === user.id) ||
                        (!mod.author_id && isAdminUser)));

                  const moduleXpAvailable = mod.xp_available ?? 0;
                  const moduleXpDistributed = mod.xp_distributed ?? 0;
                  const moduleIsCompleted =
                    !!mod.isCompleted && !!user && !isModuleCreator;

                  const lessons: Lesson[] = Array.isArray(mod.lessons)
                    ? (mod.lessons as Lesson[])
                    : [];

                  return (
                    <Card
                      key={mod.id}
                      className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-gray-50">
                              {modTitle}
                              {isModuleCreator && (
                                <Badge className="bg-purple-600 text-white flex items-center gap-1">
                                  <PenSquare className="h-3 w-3" />
                                  Creator
                                </Badge>
                              )}
                              {moduleIsCompleted && (
                                <Badge className="bg-green-600 text-white flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Completed
                                </Badge>
                              )}
                            </CardTitle>
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {tr('courses.by', 'Criado por')}{' '}
                              <span className="font-semibold">
                                {moduleAuthorName}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 text-xs text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-1">
                              <Award className="h-3 w-3 text-blue-600" />
                              <span>
                                {moduleXpDistributed} /{' '}
                                {moduleXpAvailable} XP
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {lessons.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {tr(
                              'courses.noLessons',
                              'Ainda não há lições publicadas neste módulo.',
                            )}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {lessons.map((lesson) => {
                              const lessonTitle = getMultilingualContent(
                                lesson.title,
                                language,
                              );
                              const lessonAuthorName =
                                lesson.author_name || 'Admin';

                              const isLessonCreator =
                                !!lesson.isCreator ||
                                (!!user &&
                                  ((lesson.author_id &&
                                    lesson.author_id === user.id) ||
                                    (!lesson.author_id &&
                                      isAdminUser)));

                              const isCompleted =
                                !!lesson.isCompleted && !isLessonCreator;

                              const estimatedMinutes =
                                lesson.estimated_time ?? 10;
                              const lessonHasReadMore =
                                lesson.content_has_read_more ?? false;

                              return (
                                <div
                                  key={lesson.id}
                                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-gray-200 dark:border-gray-700 pt-3"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-900 dark:text-gray-50">
                                        {lessonTitle}
                                      </span>
                                      {isLessonCreator && (
                                        <Badge className="bg-purple-600 text-white flex items-center gap-1">
                                          <PenSquare className="h-3 w-3" />
                                          Creator
                                        </Badge>
                                      )}
                                      {isCompleted && (
                                        <Badge className="bg-green-600 text-white flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          Completed
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                      <span>
                                        {tr(
                                          'courses.by',
                                          'Criado por',
                                        )}{' '}
                                        <span className="font-semibold">
                                          {lessonAuthorName}
                                        </span>
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Award className="h-3 w-3 text-primary" />
                                        {lesson.xp_reward || 0} XP
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-primary" />
                                        {estimatedMinutes} min
                                      </span>
                                    </div>
                                    {lessonHasReadMore && (
                                      <div className="text-[11px] text-sky-500 uppercase tracking-wide">
                                        Continue reading
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-end">
                                    <Link href={`/education/lessons/${lesson.id}`}>
                                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                                        {tr(
                                          'courses.openLesson',
                                          'Abrir lição',
                                        )}
                                        <ArrowRight className="h-3 w-3 ml-1" />
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
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
