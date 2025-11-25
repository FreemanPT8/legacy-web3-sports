'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Lock } from 'lucide-react';

type PermissionsResponse = {
  success: boolean;
  error?: string;
  permissions?: {
    canManageCourses?: boolean;
    [key: string]: any;
  };
};

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
];

type LangCode = (typeof LANGUAGES)[number]['code'];

type CoursePayload = {
  title: Record<LangCode, string>;
  description: Record<LangCode, string>;
  level: string;
  xp_threshold: number;
  published: boolean;
  image_url?: string | null;
};

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user, loading, getToken } = useAuth();

  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageCourses, setCanManageCourses] = useState(false);

  const [loadingCourse, setLoadingCourse] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentLanguage, setCurrentLanguage] = useState<LangCode>('en');

  const [course, setCourse] = useState<CoursePayload | null>(null);

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

  // Verificar permissões finas (canManageCourses)
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

  // Carregar dados do curso
  useEffect(() => {
    const fetchCourse = async () => {
      if (!user) return;
      setLoadingCourse(true);
      try {
        const token = getToken();
        const res = await fetch(`/api/admin/courses/${params.id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success || !data.course) {
          console.error('Error loading course for edit:', data);
          toast({
            title: 'Error',
            description: data.error || 'Failed to load course.',
            variant: 'destructive',
          });
          router.push('/admin/courses');
          return;
        }

        const c = data.course;

        const normalizeJsonb = (
          raw: any,
        ): Record<LangCode, string> => {
          if (!raw || typeof raw !== 'object') {
            return {
              en: '',
              pt: '',
              es: '',
              fr: '',
              it: '',
              de: '',
            };
          }
          const obj = raw as Record<string, string>;
          return {
            en: obj.en || '',
            pt: obj.pt || '',
            es: obj.es || '',
            fr: obj.fr || '',
            it: obj.it || '',
            de: obj.de || '',
          };
        };

        const payload: CoursePayload = {
          title: normalizeJsonb(c.title),
          description: normalizeJsonb(c.description),
          level: c.level || 'beginner',
          xp_threshold:
            typeof c.xp_threshold === 'number' ? c.xp_threshold : 0,
          published: !!c.published,
          image_url: c.image_url ?? null,
        };

        setCourse(payload);
      } catch (error) {
        console.error('Failed to fetch course for edit:', error);
        toast({
          title: 'Network error',
          description:
            'Could not load course data. Please try again.',
          variant: 'destructive',
        });
        router.push('/admin/courses');
      } finally {
        setLoadingCourse(false);
      }
    };

    if (user) {
      fetchCourse();
    }
  }, [user, getToken, params.id, router, toast]);

  const handleSave = async () => {
    if (!user || !canManageCourses || !course) {
      toast({
        title: 'Not allowed',
        description:
          'You do not have permission to edit courses.',
        variant: 'destructive',
      });
      return;
    }

    const hasAnyTitle = Object.values(course.title).some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );

    if (!hasAnyTitle) {
      toast({
        title: 'Missing title',
        description:
          'Please add a title in at least one language.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/courses/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Error updating course',
          description: data.error || 'Failed to update course.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      toast({
        title: 'Course updated',
        description: 'The course was updated successfully.',
      });

      router.push('/admin/courses');
    } catch (err) {
      console.error('Failed to update course:', err);
      toast({
        title: 'Network error',
        description: 'Could not update course. Please try again.',
        variant: 'destructive',
      });
      setSaving(false);
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
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!canManageCourses) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <Lock className="h-10 w-10 text-amber-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">
              No permission
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You don&apos;t have permission to edit courses. Please
              contact a Super Admin if you think this is a mistake.
            </p>
            <Link href="/admin/courses">
              <Button variant="outline">Back to courses</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadingCourse || !course) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              Loading course...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.name ||
    currentLanguage;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Button
                  variant="ghost"
                  className="mb-2"
                  onClick={() => router.push('/admin/courses')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Courses
                </Button>
                <h1 className="text-3xl font-bold">
                  Edit Course
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Update title, description, level, XP requirement and
                  publish status.
                </p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selector de língua */}
                <div className="flex gap-2 flex-wrap">
                  {LANGUAGES.map((lang) => (
                    <Badge
                      key={lang.code}
                      variant={
                        currentLanguage === lang.code
                          ? 'default'
                          : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setCurrentLanguage(lang.code as LangCode)
                      }
                    >
                      {lang.name}
                    </Badge>
                  ))}
                </div>

                {/* Título + descrição */}
                <div className="space-y-4">
                  <div>
                    <Label>Title ({currentLangLabel})</Label>
                    <Input
                      value={course.title[currentLanguage]}
                      onChange={(e) =>
                        setCourse((prev) =>
                          prev
                            ? {
                                ...prev,
                                title: {
                                  ...prev.title,
                                  [currentLanguage]: e.target.value,
                                },
                              }
                            : prev,
                        )
                      }
                      placeholder="Enter course title"
                      className="text-lg"
                    />
                  </div>

                  <div>
                    <Label>Description ({currentLangLabel})</Label>
                    <Textarea
                      value={course.description[currentLanguage]}
                      onChange={(e) =>
                        setCourse((prev) =>
                          prev
                            ? {
                                ...prev,
                                description: {
                                  ...prev.description,
                                  [currentLanguage]:
                                    e.target.value,
                                },
                              }
                            : prev,
                        )
                      }
                      placeholder="Enter course description"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label>Course Image URL (optional)</Label>
                    <Input
                      value={course.image_url || ''}
                      onChange={(e) =>
                        setCourse((prev) =>
                          prev
                            ? {
                                ...prev,
                                image_url:
                                  e.target.value.trim() === ''
                                    ? null
                                    : e.target.value,
                              }
                            : prev,
                        )
                      }
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Level + XP threshold */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Level</Label>
                    <Select
                      value={course.level}
                      onValueChange={(value) =>
                        setCourse((prev) =>
                          prev
                            ? { ...prev, level: value }
                            : prev,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">
                          Beginner
                        </SelectItem>
                        <SelectItem value="intermediate">
                          Intermediate
                        </SelectItem>
                        <SelectItem value="advanced">
                          Advanced
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>XP Required to Unlock (course)</Label>
                    <Input
                      type="number"
                      value={course.xp_threshold}
                      onChange={(e) =>
                        setCourse((prev) =>
                          prev
                            ? {
                                ...prev,
                                xp_threshold:
                                  parseInt(e.target.value) || 0,
                              }
                            : prev,
                        )
                      }
                      min={0}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Label>Published</Label>
                  <Switch
                    checked={course.published}
                    onCheckedChange={(checked) =>
                      setCourse((prev) =>
                        prev
                          ? { ...prev, published: checked }
                          : prev,
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
