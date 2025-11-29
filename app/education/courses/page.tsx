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

  author_id?: string | null;
  author?: string | null;
  author_name?: string | null;
  author_username?: string | null;
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

  const getLevelBadge = (level?: string | null) => {
    switch (level) {
      case 'beginner':
        return (
          <Badge className="bg-green-600">
            {t('education.level.beginner') || 'Principiante'}
          </Badge>
        );
      case 'intermediate':
        return (
          <Badge className="bg-yellow-600">
            {t('education.level.intermediate') || 'Intermédio'}
          </Badge>
        );
      case 'advanced':
        return (
          <Badge className="bg-red-600">
            {t('education.level.advanced') || 'Avançado'}
          </Badge>
        );
      default:
        return (
          <Badge>
            {t('education.level.unknown') || 'Todos os níveis'}
          </Badge>
        );
    }
  };

  // ------------------------------------------------------------------
  // STATS GLOBAIS
  // ------------------------------------------------------------------
  const { totalCourses, totalLessons, totalXP } = useMemo(() => {
    const totalCourses = courses.length;

    let totalLessons = 0;
    let totalXP = 0;

    for (const course of courses) {
      const modulesArray: Module[] = Array.isArray(course.modules)
        ? (course.modules as Module[])
        : [];

      for (const m of modulesArray) {
        const lessonsArray: Lesson[] = Array.isArray(m.lessons)
          ? (m.lessons as Lesson[])
          : [];

        totalLessons += lessonsArray.length;
        totalXP += lessonsArray.reduce(
          (acc, l) => acc + (l.xp_reward || 0),
          0,
        );
      }
    }

    return { totalCourses, totalLessons, totalXP };
  }, [courses]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              {t('courses.loading') || 'A carregar cursos...'}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* HERO + STATS TOP */}
            <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {t('courses.mainTitle') ||
                    t('courses.title') ||
                    'Cursos de Educação Web3'}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
                  {t('courses.mainSubtitle') ||
                    t('courses.subtitle') ||
                    'Cursos completos sobre tecnologia blockchain, rede Apertum e Web3 no desporto.'}
                </p>
                {user && (
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                    O teu XP:{' '}
                    <span className="font-semibold">{userXP}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                <Card className="border-blue-100 bg-blue-50/60">
                  <CardContent className="py-3 px-4">
                    <div className="text-[11px] uppercase text-blue-700 mb-1">
                      {t('courses.stats.courses') || 'Cursos'}
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {totalCourses}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 bg-emerald-50/60">
                  <CardContent className="py-3 px-4">
                    <div className="text-[11px] uppercase text-emerald-700 mb-1">
                      {t('courses.stats.lessons') || 'Lições'}
                    </div>
                    <div className="text-2xl font-bold text-emerald-900">
                      {totalLessons}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-amber-100 bg-amber-50/60">
                  <CardContent className="py-3 px-4">
                    <div className="text-[11px] uppercase text-amber-700 mb-1">
                      {t('courses.stats.xp') || 'XP disponível'}
                    </div>
                    <div className="text-2xl font-bold text-amber-900">
                      {totalXP}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* LISTA DE CURSOS */}
            {courses.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  {t('courses.noCourses') ||
                    'Ainda não há cursos disponíveis. Volta em breve!'}
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
                  const totalLessonsCourse = modulesArray.reduce(
                    (acc, m) =>
                      acc +
                      (Array.isArray(m.lessons) ? m.lessons.length : 0),
                    0,
                  );
                  const totalXPCourse = modulesArray.reduce(
                    (acc, m) => {
                      if (!Array.isArray(m.lessons)) return acc;
                      return (
                        acc +
                        m.lessons.reduce(
                          (accL, l) =>
                            accL + (l.xp_reward || 0),
                          0,
                        )
                      );
                    },
                    0,
                  );

                  const xpRequired = course.xp_threshold ?? 0;
                  const isLocked = userXP < xpRequired;

                  const isCourseCreator =
                    !!user &&
                    !!course.author_id &&
                    course.author_id === user.id;

                  const creatorName =
                    course.author_name ||
                    course.author_username ||
                    course.author ||
                    (isCourseCreator
                      ? user.username
                      : 'Admin');

                  return (
                    <Card
                      key={course.id}
                      className="flex flex-col overflow-hidden hover:shadow-md transition-shadow"
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
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-2 flex items-center gap-2">
                              {title}
                              {isCourseCreator && (
                                <Badge className="bg-purple-600 text-white flex items-center gap-1">
                                  <PenSquare className="h-3 w-3" />
                                  Creator
                                </Badge>
                              )}
                            </CardTitle>
                            {description && (
                              <CardDescription className="mt-1 line-clamp-3">
                                {description}
                              </CardDescription>
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                              By <span className="font-semibold">{creatorName}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {getLevelBadge(course.level)}
                            {xpRequired > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {xpRequired} XP min
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-4">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            <span>
                              {totalModules}{' '}
                              {t('courses.modules') || 'módulos'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            <span>
                              {totalLessonsCourse}{' '}
                              {t('courses.lessons') || 'lições'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-blue-600" />
                            <span>
                              {totalXPCourse}{' '}
                              {t('courses.totalXP') || 'XP total'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {isLocked ? (
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                              <Lock className="h-3 w-3" />
                              <span>
                                {t('courses.unlockAt') || 'Desbloqueia com'}{' '}
                                <strong>{xpRequired} XP</strong>
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>
                                {t('courses.unlocked') ||
                                  'Podes aceder a este curso'}
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
                                  'Ver curso'}
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
