// app/admin/courses/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SafeImage } from '@/app/components/SafeImage';

import {
  BookOpen,
  Plus,
  Eye,
  Edit,
  Trash2,
  Lock,
  Award,
  Users,
  PenSquare,
} from 'lucide-react';

type Course = {
  id: string;
  title: any;
  description: any;
  image_url?: string | null;
  curriculum?: {
    topics?: Array<{
      lessons?: any[];
      quizzes?: any[];
    }>;
  };
  is_published?: boolean;
  published?: boolean;
  level?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  xp_total_distributed?: number | null;
  xp_creator_distributed?: number | null;
  modules?: any[];
};

const LEVEL_OPTIONS = [
  { value: 'all', label: 'Todos os níveis' },
  { value: 'cadete', label: 'Cadete' },
  { value: 'infantil', label: 'Infantil' },
  { value: 'juvenil', label: 'Juvenil' },
  { value: 'junior', label: 'Júnior' },
  { value: 'senior', label: 'Sénior' },
  { value: 'hall-of-fame', label: 'Hall of Fame' },
  { value: 'master', label: 'Master' },
  { value: 'lenda', label: 'Lenda' },
];

const LEVEL_NORMALIZATION: Record<string, string> = {
  cadete: 'cadete',
  cadet: 'cadete',
  cadets: 'cadete',
  beginner: 'cadete',
  infantil: 'infantil',
  youth: 'infantil',
  juvenile: 'juvenil',
  juvenis: 'juvenil',
  juveniles: 'juvenil',
  intermediate: 'juvenil',
  junior: 'junior',
  juniors: 'junior',
  'júnior': 'junior',
  senior: 'senior',
  seniors: 'senior',
  'sénior': 'senior',
  legend: 'lenda',
  lenda: 'lenda',
  master: 'master',
  'hall of fame': 'hall-of-fame',
  hall: 'hall-of-fame',
  'hall da fama': 'hall-of-fame',
  'hall-of-fame': 'hall-of-fame',
};

type CurriculumSnapshot = {
  topics: number;
  lessons: number;
  quizzes: number;
};

const getCurriculumSnapshot = (course: Course): CurriculumSnapshot => {
  const topics = Array.isArray(course.curriculum?.topics)
    ? course.curriculum!.topics || []
    : [];
  let lessons = 0;
  let quizzes = 0;
  topics.forEach((topic: any) => {
    if (Array.isArray(topic?.lessons)) {
      lessons += topic.lessons.length;
    }
    if (Array.isArray(topic?.quizzes)) {
      quizzes += topic.quizzes.length;
    }
  });
  return {
    topics: topics.length,
    lessons,
    quizzes,
  };
};

const getLegacyModuleSnapshot = (course: Course): {
  modules: number;
  lessons: number;
} => {
  const modules = Array.isArray(course.modules) ? course.modules : [];
  const lessons = modules.reduce(
    (sum: number, module: any) =>
      sum + (Array.isArray(module?.lessons) ? module.lessons.length : 0),
    0,
  );
  return { modules: modules.length, lessons };
};

type PermissionsResponse = {
  success: boolean;
  error?: string;
  permissions?: {
    canManageCourses?: boolean;
    [key: string]: any;
  };
};

// Helpers para titulo/descricao seguros
function getCourseTitle(course: Course): string {
  const raw = course.title;
  if (!raw) return 'Untitled course';
  if (typeof raw === 'string') return raw || 'Untitled course';

  if (typeof raw === 'object') {
    const obj = raw as Record<string, string | undefined>;
    const candidates = [obj.pt, obj.en, obj.es, obj.fr, obj.it, obj.de];
    const found = candidates.find(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );
    return found || 'Untitled course';
  }

  return 'Untitled course';
}

function getCourseDescription(course: Course): string {
  const raw = course.description;
  if (!raw) return 'No description';
  if (typeof raw === 'string') return raw || 'No description';

  if (typeof raw === 'object') {
    const obj = raw as Record<string, string | undefined>;
    const candidates = [obj.pt, obj.en, obj.es, obj.fr, obj.it, obj.de];
    const found = candidates.find(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );
    return found || 'No description';
  }

  return 'No description';
}

const stripHtml = (value: string) =>
  value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-PT', {
    maximumFractionDigits: 0,
  }).format(value);

const getLessonReward = (lesson: any) => {
  if (typeof lesson?.xp_reward === 'number') return lesson.xp_reward;
  if (typeof lesson?.xpReward === 'number') return lesson.xpReward;
  return 0;
};

const getModuleBonus = (moduleLike: any) => {
  if (typeof moduleLike?.xp_reward === 'number') return moduleLike.xp_reward;
  if (typeof moduleLike?.xpReward === 'number') return moduleLike.xpReward;
  if (
    moduleLike?.metadata &&
    typeof moduleLike.metadata.xpReward === 'number'
  ) {
    return moduleLike.metadata.xpReward;
  }
  return 0;
};

const getCourseCompletionBonus = (course: Course) => {
  if (typeof (course as any)?.xp_reward === 'number') return (course as any).xp_reward;
  if (
    typeof (course as any)?.xp_reward_on_complete === 'number'
  ) {
    return (course as any).xp_reward_on_complete;
  }
  if (
    (course as any)?.curriculum?.metadata &&
    typeof (course as any).curriculum.metadata.xpReward === 'number'
  ) {
    return (course as any).curriculum.metadata.xpReward;
  }
  return 0;
};

const buildStatsFromTopics = (topics: any[], course: Course) => {
  const totalLessons = topics.reduce(
    (acc, topic) =>
      acc + (Array.isArray(topic?.lessons) ? topic.lessons.length : 0),
    0,
  );

  const lessonsXP = topics.reduce((acc, topic) => {
    if (!Array.isArray(topic?.lessons)) return acc;
    return (
      acc +
      topic.lessons.reduce(
        (sum: number, lesson: any) => sum + getLessonReward(lesson),
        0,
      )
    );
  }, 0);

  const moduleBonus = topics.reduce(
    (acc, topic) => acc + getModuleBonus(topic),
    0,
  );

  const totalXP =
    lessonsXP + moduleBonus + getCourseCompletionBonus(course);

  return {
    totalModules: topics.length,
    totalLessons,
    totalXP,
  };
};

const buildStatsFromLegacyModules = (modules: any[], course: Course) => {
  const lessonsCount = modules.reduce(
    (acc, module) =>
      acc + (Array.isArray(module?.lessons) ? module.lessons.length : 0),
    0,
  );

  const lessonsXP = modules.reduce((acc, module) => {
    if (!Array.isArray(module?.lessons)) return acc;
    return (
      acc +
      module.lessons.reduce(
        (sum: number, lesson: any) => sum + getLessonReward(lesson),
        0,
      )
    );
  }, 0);

  const moduleBonus = modules.reduce(
    (acc, module) => acc + getModuleBonus(module),
    0,
  );

  const totalXP =
    lessonsXP + moduleBonus + getCourseCompletionBonus(course);

  return {
    totalModules: modules.length,
    totalLessons: lessonsCount,
    totalXP,
  };
};

const getCourseStats = (course: Course) => {
  const curriculumTopics = Array.isArray(course?.curriculum?.topics)
    ? course.curriculum?.topics || []
    : [];
  if (curriculumTopics.length > 0) {
    return buildStatsFromTopics(curriculumTopics, course);
  }

  const legacyModules = Array.isArray(course?.modules)
    ? course.modules || []
    : [];
  return buildStatsFromLegacyModules(legacyModules, course);
};

const normalizeLevelValue = (value?: string | null): string | null => {
  if (!value) return null;
  const normalized = value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return LEVEL_NORMALIZATION[normalized] || normalized || null;
};

export default function CoursesManagementPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageCourses, setCanManageCourses] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const isSuperAdmin = user?.role === 'Super Admin';
  const isAdmin =
    !!user && (user.role === 'Super Admin' || user.role === 'Admin');

  // Protecao basica por role
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!isAdmin) {
      router.push('/dashboard');
    }
  }, [user, loading, isAdmin, router]);

  // Buscar permissoes finas
  useEffect(() => {
    if (loading || !user) return;

    if (user.role === 'Super Admin') {
      setCanManageCourses(true);
      setPermissionsLoaded(true);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const token = getToken();
        const res = await fetch('/api/admin/permissions/self', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data: PermissionsResponse = await res.json();

        if (!res.ok || !data.success || !data.permissions) {
          console.error('Error loading permissions for current user:', data);
          setCanManageCourses(false);
          setPermissionsLoaded(true);
          return;
        }

        setCanManageCourses(!!data.permissions.canManageCourses);
        setPermissionsLoaded(true);
      } catch (err) {
        console.error('Unexpected error fetching permissions:', err);
        setCanManageCourses(false);
        setPermissionsLoaded(true);
      }
    };

    fetchPermissions();
  }, [user, loading, getToken]);

  // Buscar cursos
  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingData(true);
      try {
        const token = getToken();
        const response = await fetch(
          '/api/admin/courses',
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        const data = await response.json();
        if (response.ok && data.success) {
          setCourses(data.courses || []);
        } else {
          console.error('Error loading courses:', data);
          toast({
            title: 'Error loading courses',
            description: data.error || 'Failed to load courses.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error);
        toast({
          title: 'Network error',
          description: 'Could not load courses. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    if (isAdmin) {
      fetchCourses();
    }
  }, [isAdmin, getToken, toast]);

  // Apagar curso
  const handleDeleteCourse = async (course: Course) => {
    if (!canManageCourses || !isSuperAdmin) {
      toast({
        title: 'Not allowed',
        description: 'Only Super Admin can delete courses.',
        variant: 'destructive',
      });
      return;
    }

    const title = getCourseTitle(course);

    const typed = window.prompt(
      `To confirm deletion, type the course name exactly:\n\n${title}\n\nThis will permanently delete the course and all its topics and lessons.`,
      '',
    );

    if (typed === null) return;

    if (typed.trim() !== title.trim()) {
      toast({
        title: 'Name does not match',
        description:
          'The course was not deleted because the name you typed does not match.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({
          title: 'Error deleting course',
          description: data.error || 'Failed to delete course.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Course deleted',
        description: 'The course and related content were deleted.',
      });

      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    } catch (err) {
      console.error('Error deleting course:', err);
      toast({
        title: 'Network error',
        description: 'Could not delete course. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading || !user || !isAdmin || !permissionsLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] text-white">
        <p className="text-sm text-slate-200">A carregar cursos...</p>
      </div>
    );
  }

  const publishedCourses = courses.filter(
    (c: any) => c.is_published ?? c.published,
  );
  const draftCourses = courses.filter(
    (c: any) => !(c.is_published ?? c.published),
  );
  const totalSnapshot = courses.reduce(
    (acc, course) => {
      const curriculum = getCurriculumSnapshot(course);
      const legacy = getLegacyModuleSnapshot(course);
      const topics = curriculum.topics || legacy.modules;
      const lessons = curriculum.lessons || legacy.lessons;
      return {
        topics: acc.topics + topics,
        lessons: acc.lessons + lessons,
        quizzes: acc.quizzes + curriculum.quizzes,
      };
    },
    { topics: 0, lessons: 0, quizzes: 0 },
  );
  const totalTopics = totalSnapshot.topics;
  const totalLessons = totalSnapshot.lessons;

  const levelLabel = (course: Course) => course.level || 'Beginner';
  const filteredCourses = courses.filter((course) => {
    if (levelFilter === 'all') return true;
    const normalized = normalizeLevelValue(levelLabel(course));
    return normalized === levelFilter;
  });
  const noCoursesAvailable = courses.length === 0;
  const noFilteredCourses = !noCoursesAvailable && filteredCourses.length === 0;

  return (
    <div className="min-h-screen w-full space-y-8 bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#000c12] px-4 py-6 text-white md:px-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-10 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-10 h-64 w-64 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl space-y-4">
          <p className="text-xs uppercase tracking-[0.6em] text-cyan-200">
            LEGACY ADMIN - COURSES
          </p>
          <h1 className="text-3xl font-semibold text-[#fdd87c] md:text-4xl">
            Course Management
          </h1>
          <p className="text-sm text-slate-100 md:text-base">
            Cria, organiza e afina cursos, topicos e licoes. Aqui controlas o
            motor educativo do LEGACY para saber o que esta publicado e o que
            ainda esta em draft.
          </p>

          {!canManageCourses && (
            <p className="mt-3 flex items-center gap-2 text-xs text-amber-200">
              <Lock className="h-4 w-4" />
              Podes ver os cursos, mas nao tens permissao para criar ou editar
              conteudo.
            </p>
          )}
        </div>
      </section>

      {/* ACTION PANEL */}
      <section>
        <div className="max-w-6xl mx-auto">
          <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
            <CardHeader className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border border-emerald-400/50 bg-emerald-400/10 text-emerald-100">
                  Playbook
                </Badge>
                <CardTitle className="text-lg text-[#fdd87c]">
                  Acoes imediatas para acelerar os cursos
                </CardTitle>
              </div>
              <CardDescription className="max-w-3xl text-slate-200">
                Organiza lancamentos, mantem topicos engajando e conecta cada
                update com XP e impacto real.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col gap-3 md:flex-row">
                <Button
                  className="flex-1 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_40px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045] disabled:opacity-60"
                  disabled={!canManageCourses}
                  onClick={() => {
                    if (!canManageCourses) return;
                    router.push('/admin/courses/create');
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar novo curso
                </Button>
                <Button
                  className="flex-1 border border-white/30 bg-transparent text-white hover:bg-white/10 disabled:opacity-60"
                  disabled={!canManageCourses}
                  onClick={() => {
                    if (!canManageCourses) return;
                    toast({
                        title: 'Adicionar topico',
                      description:
                        'Abra um curso e usa o builder de topicos/licoes para adicionar conteudo passo a passo.',
                    });
                  }}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Adicionar topico
                </Button>
                <Button
                  className="flex-1 border border-white/30 bg-transparent text-white hover:bg-white/10"
                  onClick={() => router.push('/admin/courses')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Rever portfolio
                </Button>
              </div>
              <div className="mt-4 grid gap-3 text-xs md:grid-cols-3">
                <div className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-emerald-100 shadow-[0_15px_35px_rgba(2,20,20,0.45)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide">
                    Cursos ativos
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {publishedCourses.length} publicados
                  </p>
                  <p className="text-[11px] text-slate-200">
                    Foque em transformar 3 deles em experiencias multimidia.
                  </p>
                </div>
                <div className="rounded-lg border border-purple-400/40 bg-purple-400/10 px-3 py-2 text-purple-100 shadow-[0_15px_35px_rgba(15,10,45,0.4)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide">
                    Topicos / licoes
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {totalTopics} topicos / {totalLessons} licoes
                  </p>
                  <p className="text-[11px] text-slate-200">
                    Cada topico concluido gera potencial de XP e retencao.
                  </p>
                </div>
                <div className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-cyan-100 shadow-[0_15px_35px_rgba(5,30,40,0.45)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide">
                    Engajamento
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {draftCourses.length} rascunhos
                  </p>
                  <p className="text-[11px] text-slate-200">
                    Finalize e publique para ativar XP em massa.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CONTEUDO PRINCIPAL */}
      <section className="pb-2">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* HEADER + BOTAO */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-[#fdd87c]">
                Cursos, topicos e licoes
              </h2>
              <p className="text-sm text-slate-200">
                Visao geral rapida do portefolio de cursos e da estrutura de
                topicos/licoes.
              </p>
            </div>
            <Link
              href={canManageCourses ? '/admin/courses/create' : '#'}
              aria-disabled={!canManageCourses}
            >
              <Button
                className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_40px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canManageCourses}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Course
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#04131b] p-4 shadow-[0_15px_45px_rgba(3,10,25,0.55)]">
            <label className="text-xs uppercase tracking-[0.4em] text-cyan-200">
              Filtro por nível
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-300">
                Mostra apenas cursos do nível selecionado.
              </p>
              <select
                className="w-full rounded-lg border border-white/15 bg-[#000c12] px-3 py-2 text-sm text-white shadow-inner focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 sm:w-60"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* STATS */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border border-white/10 bg-[#04131b] shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#fdd87c]">
                  Total Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#fdd87c]">
                  {courses.length}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-[#04131b] shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#fdd87c]">
                  Published
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-300">
                  {publishedCourses.length}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-[#04131b] shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#fdd87c]">
                  Draft
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-300">
                  {draftCourses.length}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-[#04131b] shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#fdd87c]">
                  Modules / Lessons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-[#fdd87c]">
                  {totalTopics} topics
                </div>
                <div className="text-sm text-slate-200">
                  {totalLessons} lessons
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LISTA DE CURSOS */}
          {loadingData ? (
            <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
              <CardContent className="py-12 text-center text-slate-200">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-300" />
                <p className="mt-4 text-sm text-slate-200">
                  Loading courses...
                </p>
              </CardContent>
            </Card>
          ) : noCoursesAvailable ? (
            <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
              <CardContent className="py-12 text-center text-slate-200">
                <BookOpen className="mx-auto mb-4 h-16 w-16 text-cyan-200" />
                <h3 className="mb-2 text-xl font-semibold text-[#fdd87c]">
                  No courses yet
                </h3>
                <p className="mb-6 text-sm text-slate-200">
                  Cria o teu primeiro curso para comecar a construir o
                  legado educativo.
                </p>
                <Link
                  href={canManageCourses ? '/admin/courses/create' : '#'}
                  aria-disabled={!canManageCourses}
                >
                  <Button
                    className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_40px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canManageCourses}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Course
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : noFilteredCourses ? (
            <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
              <CardContent className="py-12 text-center text-slate-200 space-y-4">
                <p className="text-lg font-semibold text-[#fdd87c]">
                  Nenhum curso encontrado para este nível
                </p>
                <p className="text-sm text-slate-300">
                  Ajusta o filtro para ver outros cursos disponíveis.
                </p>
                <Button
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10"
                  onClick={() => setLevelFilter('all')}
                >
                  Limpar filtro
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course: any) => {
                const title = getCourseTitle(course);
                const description = stripHtml(getCourseDescription(course));
                const isPublished = course.is_published ?? course.published;
                const isCreator = !!user && course.author_id === user.id;
                const completionsCount =
                  course.completions_count ??
                  course.total_completions ??
                  0;
                const { totalModules, totalLessons, totalXP } =
                  getCourseStats(course);
                const xpDistributed = totalXP;
                const curriculumStats = getCurriculumSnapshot(course);
                const legacyStats = getLegacyModuleSnapshot(course);
                const topicsCount =
                  curriculumStats.topics || legacyStats.modules;
                const lessonsCount =
                  curriculumStats.lessons || legacyStats.lessons;
                const level = levelLabel(course);
                const imageUrl = course.image_url || null;
                const xpRequired = course.xp_threshold ?? 0;

                return (
                  <Card
                    key={course.id}
                    className="flex flex-col overflow-hidden border border-white/10 bg-[#04131b] text-slate-200 transition-all shadow-[0_25px_70px_rgba(3,10,25,0.65)] hover:border-cyan-300/60"
                  >
                    <div className="relative overflow-hidden border-b border-white/10 bg-[#021824]/80">
                      {imageUrl ? (
                        <SafeImage
                          src={imageUrl}
                          alt={title}
                          width={800}
                          height={320}
                          className="h-40 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-400">
                          <div className="flex flex-col items-center text-white">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-6 w-6" />
                              <span className="text-lg font-semibold">
                                Legacy Course
                              </span>
                            </div>
                            <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">
                              Curriculum
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <Badge className="border border-white/30 bg-black/50 text-[11px] uppercase tracking-[0.3em]">
                          {level}
                        </Badge>
                        {isCreator && (
                          <Badge className="bg-[#14718f] text-white flex items-center gap-1">
                            <PenSquare className="h-3 w-3" />
                            Creator
                          </Badge>
                        )}
                      </div>
                      <div className="absolute right-3 top-3">
                        <Badge
                          className={
                            isPublished ? 'bg-emerald-500 text-black' : 'bg-amber-400 text-black'
                          }
                        >
                          {isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </div>

                    <CardHeader className="space-y-2 pb-0">
                      <CardTitle className="min-h-[3.2rem] line-clamp-2 text-xl leading-tight text-[#fdd87c]">
                        {title}
                      </CardTitle>
                      {course.author_name && (
                        <p className="text-xs text-slate-300">
                          By {course.author_name}
                        </p>
                      )}
                      {description && (
                        <p className="text-sm text-slate-200 line-clamp-3">
                          {description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col justify-between space-y-4 pt-4">
                      <div className="space-y-4 text-sm text-slate-200">
                        <div className="rounded-2xl border border-white/10 bg-[#021824]/80 px-4 py-3 shadow-[0_20px_60px_rgba(3,10,25,0.45)]">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-200">
                                <Award className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-cyan-200">
                                  XP já distribuído
                                </p>
                                <p className="text-2xl font-semibold text-[#fdd87c] leading-tight">
                                  {formatNumber(xpDistributed)} XP
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                Conclusões
                              </p>
                              <p className="text-xl font-semibold text-[#fdd87c]">
                                {formatNumber(completionsCount)}
                              </p>
                              <p className="text-[11px] text-slate-300">
                                {completionsCount === 1 ? 'utilizador' : 'utilizadores'}
                              </p>
                            </div>
                          </div>
                          <p className="mt-3 text-[11px] text-slate-300">
                            Soma de XP das lições + bónus finais definidos para o curso.
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-white/10 bg-[#04131b]/80 px-3 py-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">
                              XP disponível
                            </p>
                            <p className="text-2xl font-semibold text-[#fdd87c] leading-tight">
                              {formatNumber(totalXP)} XP
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Total de recompensas possíveis no currículo atual.
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-[#04131b]/80 px-3 py-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">
                              Estrutura
                            </p>
                            <p className="text-lg font-semibold text-[#fdd87c]">
                              {(topicsCount || totalModules) || 0} módulos
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {(lessonsCount || totalLessons) || 0} lições
                            </p>
                          </div>
                        </div>
                        {xpRequired > 0 && (
                          <p className="text-xs text-slate-300">
                            XP mínimo recomendado: {formatNumber(xpRequired)} XP
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-white/40 text-white hover:bg-white/10"
                          onClick={() =>
                            router.push(
                              course.id
                                ? `/education/courses/${course.id}`
                                : '/education/courses',
                            )
                          }
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={
                            !canManageCourses ||
                            (!isSuperAdmin && !isCreator)
                          }
                          onClick={() => {
                            if (
                              !canManageCourses ||
                              (!isSuperAdmin && !isCreator)
                            )
                              return;
                            router.push(`/admin/courses/${course.id}/edit`);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/30 text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!canManageCourses || !isSuperAdmin}
                          onClick={() => handleDeleteCourse(course)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
