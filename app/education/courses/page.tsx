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
  isCreator?: boolean;
  total_modules?: number;
  total_lessons?: number;
  total_xp?: number;
  xp_distributed_total?: number;
};

export default function CoursesPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  const { language, t } = useLanguage();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const userXP = user?.xp_total || 0;

  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch(
          '/api/courses?includeModules=true',
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

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

  const getInitials = (text: string) => {
    if (!text) return 'LG';
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (
      (words[0][0] || '') + (words[1][0] || '')
    ).toUpperCase();
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Hero */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {tr('courses.mainTitle', 'Cursos')}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
                  {tr(
                    'courses.mainSubtitle',
                    'Percursos estruturados sobre Web3, a blockchain Apertum e o ecossistema desportivo. Ganha XP à medida que avanças.',
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {user ? (
                  <>
                    <span className="text-gray-600 dark:text-gray-300">
                      {tr('courses.yourXP', 'O teu XP')}:{' '}
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
                    course.total_modules ??
                    modulesArray.length;

                  const totalLessons =
                    course.total_lessons ??
                    modulesArray.reduce(
                      (acc, m) =>
                        acc +
                        (Array.isArray(m.lessons)
                          ? m.lessons.length
                          : 0),
                      0,
                    );

                  const totalXP =
                    course.total_xp ??
                    modulesArray.reduce((acc, m) => {
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

                  const xpDistributed =
                    course.xp_distributed_total ?? 0;

                  const xpRequired = course.xp_threshold ?? 0;
                  const isLocked = userXP < xpRequired;

                  const authorName =
                    course.author_name || 'Admin';
                  const isCourseCreator = !!course.isCreator;

                  const imageUrl =
                    course.image_url ||
                    course.thumbnail_url ||
                    null;

                  const initials = getInitials(title);

                  return (
                    <Card
                      key={course.id}
                      className="flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Thumbnail / Placeholder */}
                      {imageUrl ? (
                        <div className="w-full h-40 bg-gray-200 overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 flex items-center justify-center">
                          <div className="flex flex-col items-center text-white">
                            <div className="flex items-center gap-2 mb-1">
                              <BookOpen className="h-6 w-6" />
                              <span className="text-xl font-bold">
                                {initials}
                              </span>
                            </div>
                            <span className="text-[11px] uppercase tracking-wide opacity-80">
                              Legacy Course
                            </span>
                          </div>
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
                            <p className="mt-2 text-xs text-gray-500">
                              {tr('courses.by', 'Criado por')}{' '}
                              <span className="font-semibold">
                                {authorName}
                              </span>
                            </p>
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
                        <div className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
                          <div className="flex items-center justify-between">
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
                          </div>

                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-blue-600" />
                            <span>
                              {totalXP}{' '}
                              {tr(
                                'courses.totalXP',
                                'XP disponível',
                              )}
                              {xpDistributed > 0 && (
                                <>
                                  {' · '}
                                  <span className="text-[11px] text-gray-500">
                                    {xpDistributed} XP já distribuído
                                  </span>
                                </>
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
                                  'Desbloqueia aos',
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
                                  'Já podes aceder a este curso',
                                )}
                              </span>
                            </div>
                          )}

                          <Link
                            href={`/education/courses/${course.id}`}
                          >
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
