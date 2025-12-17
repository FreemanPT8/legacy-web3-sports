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
  xp_reward?: number | null;
  xpReward?: number | null;
};

type Course = {
  id: string;
  title: any;
  description: any;
  level?: string | null;
  xp_threshold: number;
  xp_reward?: number | null;
  xp_reward_on_complete?: number | null;
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

const getModuleBonusXP = (module: Module) => {
  if (typeof module?.xp_reward === 'number') return module.xp_reward;
  if (typeof module?.xpReward === 'number') return module.xpReward;
  return 0;
};

const getCourseCompletionBonus = (course: Course) => {
  if (typeof course?.xp_reward === 'number') return course.xp_reward;
  if (typeof course?.xp_reward_on_complete === 'number') {
    return course.xp_reward_on_complete;
  }
  return 0;
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
    const baseClass =
      'border border-primary/70 bg-black/40 text-cyan-100 text-[11px] uppercase tracking-[0.3em] rounded-full px-3 py-1';

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
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
      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            {/* Hero */}
            <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                  {tr('nav.courses', 'Cursos')}
                </p>
                <h1 className="mb-2 text-3xl font-semibold text-white md:text-4xl">
                  {tr('courses.mainTitle', 'Cursos')}
                </h1>
                <p className="max-w-2xl text-sm text-slate-300">
                  {tr(
                    'courses.mainSubtitle',
                    'Percursos estruturados sobre Web3, a blockchain Apertum e o ecossistema desportivo. Ganha XP à medida que avanças.',
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {user ? (
                  <>
                    <span className="text-slate-300">
                      {tr('courses.yourXP', 'O teu XP')}:{' '}
                      <strong>{userXP}</strong>
                    </span>
                    <Badge
                      variant="outline"
                      className="border-primary/70 bg-black/40 text-cyan-100 text-[11px] uppercase tracking-[0.3em]"
                    >
                      {tr('courses.loggedIn', 'Sessão iniciada')}
                    </Badge>
                  </>
                ) : (
                  <Button onClick={() => router.push('/login')}>
                    {tr('auth.login', 'Inicia sessão para ganhar XP')}
                  </Button>
                )}
              </div>
            </div>

            {courses.length === 0 ? (
              <Card className="border border-white/10 bg-[#000c12]">
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
                  const description = getMultilingualContent(
                    course.description,
                    language,
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

                  const lessonsXP = modulesArray.reduce((acc, m) => {
                    if (!Array.isArray(m.lessons)) return acc;
                    return (
                      acc +
                      m.lessons.reduce(
                        (accL, l) => accL + (l.xp_reward || 0),
                        0,
                      )
                    );
                  }, 0);

                  const moduleBonusXP = modulesArray.reduce(
                    (acc, module) => acc + getModuleBonusXP(module),
                    0,
                  );

                  const courseBonusXP = getCourseCompletionBonus(course);
                  const computedTotalXP = lessonsXP + moduleBonusXP + courseBonusXP;
                  const totalXP =
                    typeof course.total_xp === 'number' && course.total_xp > 0
                      ? course.total_xp
                      : computedTotalXP;

                  const xpDistributed = course.xp_distributed_total ?? 0;

                  const xpRequired = course.xp_threshold ?? 0;
                  const isLocked = userXP < xpRequired;

                  const authorName = course.author_name || 'Admin';
                  const isCourseCreator = !!course.isCreator;

                  const imageUrl =
                    course.image_url || course.thumbnail_url || null;

                  const initials = getInitials(title);

                  return (
                    <Card
                      key={course.id}
                      className="flex flex-col overflow-hidden border border-white/10 bg-[#000c12] hover:border-primary/70 hover:shadow-[0_0_25px_rgba(45,212,191,0.25)] transition-all"
                    >
                      {/* Thumbnail / Placeholder */}
                      {imageUrl ? (
                        <div className="h-40 w-full overflow-hidden border border-white/10 bg-[#000c12]">
                          <img
                            src={imageUrl}
                            alt={title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-400">
                          <div className="flex flex-col items-center text-white">
                            <div className="mb-1 flex items-center gap-2">
                              <BookOpen className="h-6 w-6" />
                              <span className="text-xl font-bold">
                                {initials}
                              </span>
                            </div>
                            <span className="text-[11px] uppercase tracking-[0.3em] opacity-80">
                              Legacy Course
                            </span>
                          </div>
                        </div>
                      )}

                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="flex items-center gap-2 text-lg text-white line-clamp-2">
                              {title}
                              {isCourseCreator && (
                                <Badge className="flex items-center gap-1 bg-[#14718f] text-white">
                                  <PenSquare className="h-3 w-3" />
                                  Creator
                                </Badge>
                              )}
                            </CardTitle>
                            {description && (
                              <CardDescription className="mt-1 line-clamp-3 text-slate-300">
                                {description}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {getLevelBadge(course.level)}
                            {xpRequired > 0 && (
                              <Badge
                                variant="outline"
                                className="border-primary/70 bg-black/40 text-cyan-100 text-[11px] uppercase tracking-[0.3em]"
                              >
                                {xpRequired} XP min
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="flex flex-1 flex-col justify-between space-y-4 pt-0">
                        <div className="flex flex-col gap-2 text-sm text-slate-300">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-cyan-300" />
                              <span>
                                {totalModules}{' '}
                                {tr('courses.modules', 'módulos')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-cyan-300" />
                              <span>
                                {totalLessons}{' '}
                                {tr('courses.lessons', 'lições')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-cyan-300" />
                            <span>
                              {totalXP}{' '}
                              {tr('courses.totalXP', 'XP disponível')}
                              {xpDistributed > 0 && (
                                <>
                                  {' · '}
                                  <span className="text-[11px] text-slate-400">
                                    {xpDistributed} XP já distribuído
                                  </span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          {isLocked ? (
                            <div className="flex items-center gap-2 rounded-full border border-amber-400 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
                              <Lock className="h-3 w-3" />
                              <span>
                                {tr('courses.unlockAt', 'Desbloqueia aos')}{' '}
                                <strong>{xpRequired} XP</strong>
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-full border border-emerald-400 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                              <CheckCircle className="h-3 w-3" />
                              <span>
                                {tr(
                                  'courses.unlocked',
                                  'Já podes aceder a este curso',
                                )}
                              </span>
                            </div>
                          )}

                          <Link href={`/education/courses/${course.id}`}>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                              disabled={isLocked && !user}
                            >
                              <span className="text-xs">
                                {tr('courses.viewDetails', 'Ver curso')}
                              </span>
                              <ArrowRight className="ml-1 h-3 w-3" />
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
