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
};

type Module = {
  id: string;
  title: any;
  order?: number | null;
  author_id?: string | null;
  author_name?: string | null;
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
};

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;

  const { user, getToken } = useAuth();
  const { language, t } = useLanguage();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // helper simples para evitar mostrar "courses.xyz" no UI
  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
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
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center px-4">
            <h1 className="text-2xl font-bold mb-2">
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
              className="inline-flex items-center gap-2 text-blue-600 hover:underline"
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

  const imageUrl =
    course.image_url ||
    course.thumbnail_url ||
    null;

  const totalModules = course.total_modules ?? 0;
  const totalLessons = course.total_lessons ?? 0;
  const totalXP = course.total_xp ?? 0;
  const xpRequired = course.xp_threshold ?? 0;

  const authorName = course.author_name || 'Admin';
  const isCourseCreator =
    !!user &&
    !!course.author_id &&
    course.author_id === user.id;

  const modules: Module[] = Array.isArray(course.modules)
    ? (course.modules as Module[])
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
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
            <Card className="mb-6 overflow-hidden">
              {imageUrl && (
                <div className="w-full h-56 bg-gray-200 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
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

                    <CardTitle className="text-2xl md:text-3xl">
                      {title}
                    </CardTitle>

                    {description && (
                      <CardDescription className="text-base text-gray-700 dark:text-gray-300">
                        {description}
                      </CardDescription>
                    )}

                    <div className="text-xs text-gray-500">
                      {tr('courses.by', 'Criado por')}{' '}
                      <span className="font-semibold">
                        {authorName}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span>
                        {totalModules} {tr('courses.modules', 'módulos')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span>
                        {totalLessons} {tr('courses.lessons', 'lições')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-blue-600" />
                      <span>
                        {totalXP}{' '}
                        {tr('courses.totalXP', 'XP disponível')}
                      </span>
                    </div>
                    {xpRequired > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
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
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
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
                  const moduleAuthorName =
                    mod.author_name || 'Admin';

                  const isModuleCreator =
                    !!user &&
                    !!mod.author_id &&
                    mod.author_id === user.id;

                  const lessons: Lesson[] = Array.isArray(mod.lessons)
                    ? (mod.lessons as Lesson[])
                    : [];

                  return (
                    <Card key={mod.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {modTitle}
                              {isModuleCreator && (
                                <Badge className="bg-purple-600 text-white flex items-center gap-1">
                                  <PenSquare className="h-3 w-3" />
                                  Creator
                                </Badge>
                              )}
                            </CardTitle>
                            <div className="mt-1 text-xs text-gray-500">
                              {tr('courses.by', 'Criado por')}{' '}
                              <span className="font-semibold">
                                {moduleAuthorName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {lessons.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            {tr(
                              'courses.noLessons',
                              'Ainda não há lições publicadas neste módulo.',
                            )}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {lessons.map((lesson) => {
                              const lessonTitle =
                                getMultilingualContent(
                                  lesson.title,
                                  language,
                                );
                              const lessonAuthorName =
                                lesson.author_name || 'Admin';

                              const isLessonCreator =
                                !!user &&
                                !!lesson.author_id &&
                                lesson.author_id === user.id;

                              const isCompleted =
                                !!lesson.isCompleted && !isLessonCreator;

                              const estimatedMinutes =
                                lesson.estimated_time ?? 10;

                              return (
                                <div
                                  key={lesson.id}
                                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t pt-3"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">
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
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
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
                                        <Award className="h-3 w-3 text-blue-600" />
                                        {lesson.xp_reward || 0} XP
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-blue-600" />
                                        {estimatedMinutes} min
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-end">
                                    <Link
                                      href={`/education/lessons/${lesson.id}`}
                                    >
                                      <Button size="sm">
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
