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
import { removeReadMoreMarker } from '@/lib/read-more';

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

  const getLocalizedText = (value: any, fallback: string) => {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    return getMultilingualContent(value, language) || fallback;
  };

  const getLessonXP = (lesson: Lesson) => {
    if (typeof lesson?.xp_reward === 'number') return lesson.xp_reward;
    if (typeof (lesson as any)?.xpReward === 'number') {
      return (lesson as any).xpReward;
    }
    return 0;
  };

  const getLessonDuration = (lesson: Lesson) => {
    if (typeof lesson?.estimated_time === 'number') {
      return lesson.estimated_time;
    }
    if (typeof (lesson as any)?.duration_minutes === 'number') {
      return (lesson as any).duration_minutes;
    }
    return 10;
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

const sanitizeCourseDescription = (html: string) =>
  removeReadMoreMarker(html || '').replace(
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    '',
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
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
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h1 className="text-2xl font-semibold mb-2 text-white">
              {tr('courses.notFound', 'Curso não encontrado')}
            </h1>
            <p className="text-slate-300 mb-4">
              {tr(
                'courses.notFoundDescription',
                'O curso que procuras não existe ou não está publicado.',
              )}
            </p>
            <Link
              href="/education/courses"
              className="inline-flex items-center gap-2 text-cyan-300 hover:underline"
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

  const title = getLocalizedText(
    course.title,
    tr('courses.untitled', 'Curso sem título'),
  );
  const descriptionRaw = getLocalizedText(
    course.description,
    '',
  );
  const descriptionHtml = sanitizeCourseDescription(descriptionRaw);
  const hasDescription = descriptionHtml.trim().length > 0;

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
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="mb-4">
              <Link
                href="/education/courses"
                className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                {tr('courses.back', 'Voltar aos cursos')}
              </Link>
            </div>

            {/* HEADER DO CURSO */}
            <Card className="mb-6 overflow-hidden border border-white/10 bg-[#000c12]">
              {/* Thumbnail / Placeholder */}
              {imageUrl ? (
                <div className="w-full h-72 md:h-[420px] border-b border-white/10 bg-[#000c12] overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              ) : (
                <div className="w-full h-72 md:h-[420px] bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 flex items-center justify-center">
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

              <CardHeader className="space-y-6">
                <div className="flex flex-wrap justify-between items-start gap-6">
                  <div className="space-y-4 max-w-3xl">
                    <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                      {tr('nav.education', 'WEB3 ACADEMY')}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {getLevelBadge(course.level)}
                      {isCourseCreator && (
                        <Badge className="bg-[#14718f] text-white flex items-center gap-1">
                          <PenSquare className="h-3 w-3" />
                          Creator
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-3xl font-semibold text-white">
                      {title}
                    </CardTitle>

                    {hasDescription && (
                      <div
                        className="text-sm leading-relaxed text-slate-200 space-y-3 [&_strong]:text-white"
                        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                      />
                    )}

                    <div className="text-xs text-slate-400">
                      {tr('courses.by', 'Criado por')}{' '}
                      <span className="font-semibold text-white">
                        {authorName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    {
                      key: 'modules',
                      label: tr('courses.modules', 'Módulos'),
                      value: `${totalModules}`,
                      icon: <BookOpen className="h-5 w-5 text-cyan-300" />,
                    },
                    {
                      key: 'lessons',
                      label: tr('courses.lessons', 'Lições'),
                      value: `${totalLessons}`,
                      icon: <BookOpen className="h-5 w-5 text-cyan-300" />,
                    },
                    {
                      key: 'availableXP',
                      label: tr('courses.totalXP', 'XP disponível'),
                      value: `${totalXP} XP`,
                      icon: <Award className="h-5 w-5 text-cyan-300" />,
                    },
                    {
                      key: 'distributedXP',
                      label: tr('courses.xpDistributed', 'XP já entregue'),
                      value: `${xpDistributed} XP`,
                      icon: <Award className="h-5 w-5 text-cyan-300" />,
                    },
                    {
                      key: 'userXP',
                      label: user
                        ? tr('courses.yourXPInCourse', 'Tu já ganhaste')
                        : tr('courses.trackProgress', 'Acompanha o teu XP'),
                      value: user
                        ? `${userXpInCourse} XP`
                        : tr('courses.loginToTrack', 'Inicia sessão'),
                      icon: user ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <Lock className="h-5 w-5 text-slate-400" />
                      ),
                    },
                  ].map((stat) => (
                    <div
                      key={stat.key}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#05212b]/70 px-3 py-3"
                    >
                      {stat.icon}
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                          {stat.label}
                        </p>
                        <p className="text-base font-semibold text-white">
                          {stat.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {xpRequired > 0 && (
                  <div className="text-xs text-slate-400">
                    {tr('courses.unlockAt', 'XP mínimo recomendado')}: <strong className="text-white">{xpRequired} XP</strong>
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* MÓDULOS & LIÇÕES */}
            {modules.length === 0 ? (
              <Card className="border border-white/10 bg-[#000c12]">
                <CardContent className="py-8 text-center text-slate-300">
                  {tr(
                    'courses.noModules',
                    'Este curso ainda não tem módulos publicados.',
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
              {modules.map((mod, moduleIndex) => {
                const moduleLabel = tr('courses.moduleLabel', 'Tópico');
                const modTitle = getLocalizedText(
                  mod.title,
                  `${moduleLabel} ${moduleIndex + 1}`,
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
                      className="border border-white/10 bg-[#05212b]"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2 text-white">
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
                            <div className="mt-1 text-xs text-slate-400">
                              {tr('courses.by', 'Criado por')}{' '}
                              <span className="font-semibold">
                                {moduleAuthorName}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 text-xs text-slate-300">
                            <div className="flex items-center gap-1">
                              <Award className="h-4 w-4 text-cyan-300" />
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
                          <p className="text-xs text-slate-400">
                            {tr(
                              'courses.noLessons',
                              'Ainda não há lições publicadas neste módulo.',
                            )}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {lessons.map((lesson, lessonIndex) => {
                              const lessonLabel = tr(
                                'courses.lessonLabel',
                                'Lição',
                              );
                              const lessonTitle = getLocalizedText(
                                lesson.title,
                                `${lessonLabel} ${lesson.order ?? lessonIndex + 1}`,
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
                                getLessonDuration(lesson);
                              const lessonXP = getLessonXP(lesson);
                              const lessonHasReadMore =
                                lesson.content_has_read_more ?? false;

                              return (
                                <div
                                  key={lesson.id}
                                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-white/10 pt-3"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-white">
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
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
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
                                          <Award className="h-4 w-4 text-cyan-300" />
                                          {lessonXP} XP
                                        </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-4 w-4 text-cyan-300" />
                                        {estimatedMinutes} min
                                      </span>
                                    </div>
                                    {lessonHasReadMore && (
                                      <div className="text-[11px] text-cyan-300 uppercase tracking-wide">
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
