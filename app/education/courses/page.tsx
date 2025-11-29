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
  thumbnail_url?: string | null;
  modules?: Module[];

  author_id?: string | null;
  author_name?: string | null;
  total_modules?: number;
  total_lessons?: number;
  total_xp?: number;
  isCreator?: boolean;
};

export default function CoursesPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  const { language, t } = useLanguage();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const userXP = user?.xp_total || 0;

  // Helper para usar t() sem aparecer "courses.xxx" quando a chave não existe
  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  useEffect(() => {
    const fetchCourses = async () => {
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
              {tr('courses.loading', 'A carregar cursos...')}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // --- Stats globais (para os cards no topo) -----------------------------

  const totalCourses = courses.length;

  const totalModulesAll = courses.reduce((acc, course) => {
    const modules = Array.isArray(course.modules) ? course.modules : [];
    return acc + modules.length;
  }, 0);

  const totalLessonsAll = courses.reduce((acc, course) => {
    const modules = Array.isArray(course.modules) ? course.modules : [];
    return (
      acc +
      modules.reduce((mAcc, m) => {
        const lessons = Array.isArray(m.lessons) ? m.lessons : [];
        return mAcc + lessons.length;
      }, 0)
    );
  }, 0);

  const totalXPAll = courses.reduce((acc, course) => {
    if (typeof course.total_xp === 'number') {
      return acc + course.total_xp;
    }

    const modules = Array.isArray(course.modules) ? course.modules : [];
    const courseXP = modules.reduce((mAcc, m) => {
      const lessons = Array.isArray(m.lessons) ? m.lessons : [];
      return (
        mAcc +
        lessons.reduce(
          (lAcc, l) => lAcc + (l.xp_reward || 0),
          0,
        )
      );
    }, 0);

    return acc + courseXP;
  }, 0);

  const unlockedCourses = user
    ? courses.filter((c) => userXP >= (c.xp_threshold ?? 0)).length
    : 0;
  const lockedCourses = totalCourses - unlockedCourses;

  // ----------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Hero */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {tr(
                    'courses.mainTitle',
                    'Cursos de Educação Web3',
                  )}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
                  {tr(
                    'courses.mainSubtitle',
                    'Cursos completos sobre tecnologia blockchain, rede Apertum e Web3 no desporto.',
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {user ? (
                  <>
                    <span className="text-gray-600 dark:text-gray-300">
                      O teu XP:{' '}
                      <strong>{userXP}</strong>
                    </span>
                    <Badge variant="outline">
                      {tr('courses.loggedIn', 'Sessão iniciada')}
                    </Badge>
                  </>
                ) : (
                  <Button
                    onClick={() => router.push('/login')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {tr(
                      'auth.login',
                      'Inicia sessão para ganhar XP',
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Cards de estatísticas gerais */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="py-4 flex flex-col gap-1">
                  <span className="text-xs uppercase text-gray-500">
                    {tr('courses.stats.courses', 'Cursos')}
                  </span>
                  <span className="text-2xl font-bold">
                    {totalCourses}
                  </span>
                  <span className="text-xs text-gray-500">
                    {unlockedCourses} desbloqueados • {lockedCourses} bloqueados
                  </span>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4 flex flex-col gap-1">
                  <span className="text-xs uppercase text-gray-500">
                    {tr('courses.stats.lessons', 'Módulos & Lições')}
                  </span>
                  <span className="text-2xl font-bold">
                    {totalModulesAll} módulos • {totalLessonsAll} lições
                  </span>
                  <span className="text-xs text-gray-500">
                    {tr(
                      'courses.stats.lessonsHint',
                      'Conteúdo estruturado para ir passo a passo.',
                    )}
                  </span>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4 flex flex-col gap-1">
                  <span className="text-xs uppercase text-gray-500">
                    {tr('courses.stats.xp', 'XP disponível')}
                  </span>
                  <span className="text-2xl font-bold">
                    {totalXPAll}
                  </span>
                  <span className="text-xs text-gray-500">
                    {tr(
                      'courses.stats.xpHint',
                      'XP total que podes ganhar nestes cursos.',
                    )}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Lista de cursos */}
            {courses.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  {tr(
                    'courses.noCourses',
                    'Ainda não há cursos disponíveis. Volta em breve!',
                  )}
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

                  const totalModules =
                    typeof course.total_modules === 'number'
                      ? course.total_modules
                      : modulesArray.length;

                  const totalLessons =
                    typeof course.total_lessons === 'number'
                      ? course.total_lessons
                      : modulesArray.reduce(
                          (acc, m) =>
                            acc +
                            (Array.isArray(m.lessons)
                              ? m.lessons.length
                              : 0),
                          0,
                        );

                  const totalXP =
                    typeof course.total_xp === 'number'
                      ? course.total_xp
                      : modulesArray.reduce((acc, m) => {
                          if (!Array.isArray(m.lessons)) return acc;
                          return (
                            acc +
                            m.lessons.reduce(
                              (accL, l) =>
                                accL + (l.xp_reward || 0),
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

                  const authorName =
                    course.author_name || 'Admin';

                  const imageUrl =
                    course.image_url ||
                    course.thumbnail_url ||
                    null;

                  return (
                    <Card
                      key={course.id}
                      className="flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {imageUrl && (
                        <div className="w-full h-40 bg-gray-200 overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-3">
                          <div>
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
                            <div className="mt-2 text-xs text-gray-500">
                              {tr('courses.by', 'Criado por')}{' '}
                              <span className="font-semibold">
                                {authorName}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {getLevelBadge(course.level)}
                            {xpRequired > 0 && (
                              <Badge
                                variant="outline"
                                className="text-xs"
                              >
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
                              {tr('courses.modules', 'módulos')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            <span>
                              {totalLessons}{' '}
                              {tr('courses.lessons', 'lições')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-blue-600" />
                            <span>
                              {totalXP}{' '}
                              {tr(
                                'courses.totalXP',
                                'XP disponível',
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {isLocked ? (
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                              <Lock className="h-3 w-3" />
                              <span>
                                {tr(
                                  'courses.unlockAt',
                                  'Desbloqueia com',
                                )}{' '}
                                <strong>{xpRequired} XP</strong>
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>
                                {tr(
                                  'courses.unlocked',
                                  'Podes aceder a este curso',
                                )}
                              </span>
                            </div>
                          )}

                          <Link href={`/education/courses/${course.id}`}>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              disabled={isLocked && !user}
                            >
                              <span className="text-xs">
                                {tr(
                                  'courses.viewDetails',
                                  'Ver curso',
                                )}
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
