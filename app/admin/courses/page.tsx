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
} from 'lucide-react';

type Course = {
  id: string;
  title: any;
  description: any;
  image_url?: string | null;
  is_published?: boolean;
  published?: boolean;
  level?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  xp_total_distributed?: number | null;
  xp_creator_distributed?: number | null;
  modules?: any[];
};

type PermissionsResponse = {
  success: boolean;
  error?: string;
  permissions?: {
    canManageCourses?: boolean;
    [key: string]: any;
  };
};

// Helpers para título/descrição seguros
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

export default function CoursesManagementPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageCourses, setCanManageCourses] = useState(false);

  const isSuperAdmin = user?.role === 'Super Admin';
  const isAdmin =
    !!user && (user.role === 'Super Admin' || user.role === 'Admin');

  // Proteção básica por role
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

  // Buscar permissões finas
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
        const res = await fetch('/api/admin/permissions', {
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
          '/api/admin/courses?includeModules=true',
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
      `To confirm deletion, type the course name exactly:\n\n${title}\n\nThis will permanently delete the course and all its modules and lessons.`,
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
      <div className="w-full">
        <p className="text-sm text-blue-100/90">A carregar cursos…</p>
      </div>
    );
  }

  const publishedCourses = courses.filter(
    (c: any) => c.is_published ?? c.published,
  );
  const draftCourses = courses.filter(
    (c: any) => !(c.is_published ?? c.published),
  );
  const totalModules = courses.reduce(
    (acc, c: any) => acc + ((c.modules || []).length || 0),
    0,
  );
  const totalLessons = courses.reduce((acc, c: any) => {
    const modules = c.modules || [];
    const lessons = modules.flatMap((m: any) => m.lessons || []);
    return acc + lessons.length;
  }, 0);

  const levelLabel = (course: Course) => course.level || 'Beginner';

  return (
    <div className="w-full space-y-8">
      {/* HERO - consistente com /admin e /admin/users */}
      <section className="mt-2 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4 py-6 md:px-6 md:py-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl">
          <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 mb-3 border border-white/10">
            LEGACY Admin — Courses
          </span>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Course Management
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Cria, organiza e afina cursos, módulos e lições. Aqui
            controlas o motor educativo do LEGACY — o que existe,
            o que está publicado e o que ainda está em draft.
          </p>

          {!canManageCourses && (
            <p className="mt-3 text-xs text-amber-300 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Podes ver os cursos, mas não tens permissão para
              criar ou editar conteúdo.
            </p>
          )}
        </div>
      </section>

      {/* ACTION PANEL */}
      <section>
        <div className="max-w-6xl mx-auto">
          <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-emerald-800/60 shadow-xl">
            <CardHeader className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-100 border border-emerald-500/40">
                  Playbook
                </Badge>
                <CardTitle className="text-heading text-lg">
                  Ações imediatas para acelerar os cursos
                </CardTitle>
              </div>
              <CardDescription className="text-muted-custom max-w-3xl">
                Organize lançamentos, mantenha módulos engajando e conecte cada update com XP e impacto real.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col gap-3 md:flex-row">
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
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
                  className="flex-1 border border-slate-700 bg-slate-950/60 text-slate-100 hover:bg-slate-900 disabled:opacity-60"
                  disabled={!canManageCourses}
                  onClick={() => {
                    if (!canManageCourses) return;
                    toast({
                      title: 'Adicionar módulo',
                      description:
                        'Abra um curso e use o builder de módulos/lessons para adicionar conteúdo passo a passo.',
                    });
                  }}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Adicionar módulo
                </Button>
                <Button
                  className="flex-1 border border-blue-600 text-blue-100 hover:bg-blue-900 bg-blue-950/50"
                  onClick={() => router.push('/admin/courses')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Rever portfólio
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3 text-xs">
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-100">
                  <p className="font-semibold text-[11px] uppercase tracking-wide">
                    Cursos ativos
                  </p>
                  <p className="text-sm font-bold mt-1">
                    {publishedCourses.length} publicados
                  </p>
                  <p className="text-muted-custom text-[11px]">
                    Foque em transformar 3 deles em experiências multimídia.
                  </p>
                </div>
                <div className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-purple-100">
                  <p className="font-semibold text-[11px] uppercase tracking-wide">
                    Módulos / lições
                  </p>
                  <p className="text-sm font-bold mt-1">
                    {totalModules} módulos · {totalLessons} lições
                  </p>
                  <p className="text-muted-custom text-[11px]">
                    Cada módulo concluído gera potencial de XP e retenção.
                  </p>
                </div>
                <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-blue-100">
                  <p className="font-semibold text-[11px] uppercase tracking-wide">
                    Engajamento
                  </p>
                  <p className="text-sm font-bold mt-1">
                    {draftCourses.length} rascunhos
                  </p>
                  <p className="text-muted-custom text-[11px]">
                    Finalize e publique para ativar XP em massa.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL */}
      <section className="pb-2">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* HEADER + BOTÃO */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-heading">
                Cursos, módulos e lições
              </h2>
              <p className="text-sm text-muted-custom">
                Visão geral rápida do portefólio de cursos e da
                estrutura de módulos/lessons.
              </p>
            </div>
            <Link
              href={canManageCourses ? '/admin/courses/create' : '#'}
              aria-disabled={!canManageCourses}
            >
              <Button
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!canManageCourses}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Course
              </Button>
            </Link>
          </div>

          {/* STATS */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-card-custom border-custom">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-heading">
                  Total Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-heading">
                  {courses.length}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-custom border-custom">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-heading">
                  Published
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-400">
                  {publishedCourses.length}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-custom border-custom">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-heading">
                  Draft
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-400">
                  {draftCourses.length}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-custom border-custom">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-heading">
                  Modules / Lessons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-heading">
                  {totalModules} modules
                </div>
                <div className="text-sm text-muted-custom">
                  {totalLessons} lessons
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LISTA DE CURSOS */}
          {loadingData ? (
            <Card className="bg-card-custom border-custom">
              <CardContent className="text-center py-12 text-body">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
                <p className="mt-4 text-sm text-muted-custom">
                  Loading courses...
                </p>
              </CardContent>
            </Card>
          ) : courses.length === 0 ? (
            <Card className="bg-card-custom border-custom">
              <CardContent className="text-center py-12 text-body">
                <BookOpen className="h-16 w-16 text-muted-custom mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-heading">
                  No courses yet
                </h3>
                <p className="text-sm text-muted-custom mb-6">
                  Cria o teu primeiro curso para começar a construir o
                  legado educativo.
                </p>
                <Link
                  href={canManageCourses ? '/admin/courses/create' : '#'}
                  aria-disabled={!canManageCourses}
                >
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={!canManageCourses}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Course
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course: any) => {
                const title = getCourseTitle(course);
                const description = getCourseDescription(course);
                const isPublished = course.is_published ?? course.published;
                const isCreator = !!user && course.author_id === user.id;
                const xpTotal = course.xp_total_distributed ?? 0;
                const xpCreator = course.xp_creator_distributed ?? 0;
                const modulesCount = (course.modules || []).length;
                const lessonsCount = (course.modules || []).reduce(
                  (acc: number, m: any) =>
                    acc + ((m.lessons || []).length || 0),
                  0,
                );

                return (
                  <Card
                    key={course.id}
                    className="hover:shadow-lg hover:shadow-slate-950/40 transition-shadow bg-card-custom border-custom text-body"
                  >
                    <CardHeader>
                      {course.image_url && (
                        <div className="w-full h-40 rounded-lg mb-4 overflow-hidden bg-slate-900/60">
                          <SafeImage
                            src={course.image_url}
                            alt={title}
                            className="w-full h-full object-cover"
                            width={800}
                            height={200}
                          />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2 text-heading">
                            {title}
                            {isCreator && (
                              <Badge
                                variant="outline"
                                className="border-blue-500 text-blue-400"
                              >
                                Creator
                              </Badge>
                            )}
                          </CardTitle>
                          {course.author_name && (
                            <p className="text-xs text-muted-custom">
                              By {course.author_name}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={
                            isPublished ? 'bg-emerald-600' : 'bg-amber-500'
                          }
                        >
                          {isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-custom mb-4 line-clamp-2">
                        {description}
                      </p>
                      <div className="text-sm text-muted-custom mb-4">
                        Level: {levelLabel(course)}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs mb-4">
                        <Badge variant="outline" className="border-custom">
                          {xpTotal} XP distributed
                        </Badge>
                        <Badge variant="outline" className="border-custom">
                          {modulesCount} modules · {lessonsCount} lessons
                        </Badge>
                        {isCreator && (
                          <Badge
                            variant="outline"
                            className="border-blue-500 text-blue-400"
                          >
                            Creator share: {xpCreator} XP
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            router.push(
                              `/admin/courses/${course.id}/modules`,
                            )
                          }
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
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
                          className="disabled:opacity-60 disabled:cursor-not-allowed"
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
