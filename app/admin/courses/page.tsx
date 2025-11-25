'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Eye,
  Edit,
  Trash2,
  Lock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Course = {
  id: string;
  title: any;
  description: any;
  image_url?: string | null;
  is_published?: boolean;
  published?: boolean;
  level?: string | null;
};

type PermissionsResponse = {
  success: boolean;
  error?: string;
  permissions?: {
    canManageCourses?: boolean;
    [key: string]: any;
  };
};

// Helper: extrair título sempre como string
function getCourseTitle(course: Course): string {
  const raw = course.title;

  if (!raw) return 'Untitled course';

  if (typeof raw === 'string') {
    return raw || 'Untitled course';
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, string | undefined>;
    const candidates = [obj.en, obj.pt, obj.es, obj.fr, obj.it, obj.de];
    const found = candidates.find(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );
    return found || 'Untitled course';
  }

  return 'Untitled course';
}

// Helper: extrair descrição sempre como string
function getCourseDescription(course: Course): string {
  const raw = course.description;
  if (!raw) return 'No description';

  if (typeof raw === 'string') {
    return raw || 'No description';
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, string | undefined>;
    const candidates = [obj.en, obj.pt, obj.es, obj.fr, obj.it, obj.de];
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

  // Proteção básica
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

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
        const response = await fetch('/api/admin/courses', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

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

    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchCourses();
    }
  }, [user, getToken, toast]);

  // 🔥 apagar curso com confirmação por nome
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

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin') ||
    !permissionsLoaded
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  const publishedCourses = courses.filter(
    (c: any) => c.is_published ?? c.published,
  );
  const draftCourses = courses.filter(
    (c: any) => !(c.is_published ?? c.published),
  );

  const levelLabel = (course: Course) => course.level || 'Beginner';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <Link href="/admin">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div className="flex justify-between items-center gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">
                    Course Management
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Create, edit, and manage courses, modules, and lessons.
                  </p>
                  {!canManageCourses && (
                    <p className="mt-2 text-sm text-amber-700 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      You can view courses, but you don&apos;t have permission
                      to create or edit them.
                    </p>
                  )}
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
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Total Courses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{courses.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Published
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {publishedCourses.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Draft
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {draftCourses.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {loadingData ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-300">
                    Loading courses...
                  </p>
                </CardContent>
              </Card>
            ) : courses.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    No courses yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create your first course to get started
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

                  return (
                    <Card
                      key={course.id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        {course.image_url && (
                          <div className="w-full h-40 bg-gray-200 rounded-lg mb-4 overflow-hidden">
                            <img
                              src={course.image_url}
                              alt={title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg">
                            {title}
                          </CardTitle>
                          <Badge
                            className={
                              isPublished ? 'bg-green-600' : 'bg-yellow-600'
                            }
                          >
                            {isPublished ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {description}
                        </p>
                        <div className="text-sm text-gray-500 mb-4">
                          Level: {levelLabel(course)}
                        </div>
                        <div className="flex gap-2">
                          {/* View → agora vai para gestão de módulos do curso */}
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

                          {/* Editar meta do curso */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={!canManageCourses}
                            onClick={() => {
                              if (!canManageCourses) return;
                              router.push(
                                `/admin/courses/${course.id}/edit`,
                              );
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>

                          {/* Delete – apenas Super Admin */}
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
