// app/admin/courses/[id]/modules/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Image as ImageIcon,
  Lock,
} from 'lucide-react';

import { getMultilingualContent } from '@/lib/i18n';
import { LegacyModuleNotice } from '@/components/admin/LegacyModuleNotice';
import { LANGUAGES, type LangCode } from '@/types/builder';

type Lesson = {
  id: string;
};

type Module = {
  id?: string;
  order: number;
  title: any;
  description: any;
  xp_threshold: number;
  xp_reward: number;
  image_url?: string | null;
  published?: boolean;
  is_completed?: boolean;
  lessons?: Lesson[];
  _isNew?: boolean;
};

type Course = {
  id: string;
  title: any;
  level?: string | null;
};

type PermissionsResponse = {
  success: boolean;
  permissions?: {
    canManageCourses?: boolean;
  };
  error?: string;
};

export default function CourseModulesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const legacyMode = searchParams.get('legacy') === '1';
  const courseId = params?.id?.toString() || '';

  if (!legacyMode) {
    return <LegacyModuleNotice courseId={courseId} />;
  }

  return <LegacyModulesEditor />;
}

function LegacyModulesEditor() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [currentLanguage, setCurrentLanguage] =
    useState<LangCode>('en');
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageCourses, setCanManageCourses] = useState(false);

  const isAdmin =
    user && (user.role === 'Super Admin' || user.role === 'Admin');

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

  // Carregar permissoes finas
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
        if (!res.ok || !data.success) {
          setCanManageCourses(false);
        } else {
          setCanManageCourses(Boolean(data.permissions?.canManageCourses));
        }
      } catch (error) {
        console.error('Unexpected error fetching permissions:', error);
        setCanManageCourses(false);
      } finally {
        setPermissionsLoaded(true);
      }
    };

    fetchPermissions();
  }, [user, loading, getToken]);

  // Carregar curso + modulos
  useEffect(() => {
    const fetchCourse = async () => {
      setLoadingData(true);
      try {
        const token = getToken();
        const res = await fetch(`/api/admin/courses/${courseId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          console.error('Failed to load course:', data);
          toast({
            title: 'Error loading course',
            description: data.error || 'Failed to load course data.',
            variant: 'destructive',
          });
          setCourse(null);
          setModules([]);
        } else {
          const c = data.course as Course & { modules?: any[] };
          setCourse(c);

          const mods: Module[] = Array.isArray(c.modules)
            ? c.modules
                .slice()
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((m) => ({
                  id: m.id,
                  order: m.order ?? 0,
                  title: m.title,
                  description: m.description,
                  xp_threshold: m.xp_threshold ?? 0,
                  xp_reward: m.xp_reward ?? 0,
                  image_url: m.image_url ?? null,
                  published: m.published ?? false,
                  is_completed: m.is_completed ?? false,
                  lessons: m.lessons || [],
                }))
            : [];

          setModules(mods);
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        toast({
          title: 'Network error',
          description: 'Could not load course data.',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    if (isAdmin) {
      fetchCourse();
    }
  }, [courseId, getToken, isAdmin, toast]);

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.name ||
    currentLanguage;

  // Helpers multi-lingua
  function updateModuleTitle(
    index: number,
    lang: LangCode,
    value: string,
  ) {
    if (!canManageCourses) return;
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== index) return m;
        const raw = m.title || {};
        const obj =
          typeof raw === 'object' && raw !== null ? { ...raw } : {};
        (obj as any)[lang] = value;
        return { ...m, title: obj };
      }),
    );
  }

  function updateModuleDescription(
    index: number,
    lang: LangCode,
    value: string,
  ) {
    if (!canManageCourses) return;
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== index) return m;
        const raw = m.description || {};
        const obj =
          typeof raw === 'object' && raw !== null ? { ...raw } : {};
        (obj as any)[lang] = value;
        return { ...m, description: obj };
      }),
    );
  }

  function updateModuleField(
    index: number,
    field:
      | 'xp_threshold'
      | 'xp_reward'
      | 'order'
      | 'image_url'
      | 'published'
      | 'is_completed',
    value: any,
  ) {
    if (!canManageCourses) return;
    setModules((prev) =>
      prev.map((m, i) =>
        i === index
          ? {
              ...m,
              [field]: value,
            }
          : m,
      ),
    );
  }

  const handleAddModule = () => {
    if (!canManageCourses) {
      toast({
        title: 'No permission',
        description: 'You do not have permission to create or edit modules.',
        variant: 'destructive',
      });
      return;
    }

    setModules((prev) => {
      const nextOrder =
        prev.length > 0
          ? Math.max(...prev.map((m) => m.order || 0)) + 1
          : 1;

      const emptyLangs: Record<string, string> = {};
      LANGUAGES.forEach((l) => {
        emptyLangs[l.code] = '';
      });

      const newModule: Module = {
        _isNew: true,
        order: nextOrder,
        title: { ...emptyLangs },
        description: { ...emptyLangs },
        xp_threshold: 0,
        xp_reward: 0,
        image_url: null,
        published: false,
        is_completed: false,
        lessons: [],
      };

      return [...prev, newModule];
    });
  };

  const handleDeleteModule = async (module: Module, index: number) => {
    if (!canManageCourses) {
      toast({
        title: 'No permission',
        description: 'You do not have permission to delete modules.',
        variant: 'destructive',
      });
      return;
    }

    if (!module.id) {
      setModules((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    const moduleTitle =
      getMultilingualContent(module.title, currentLanguage) ||
      `Module ${module.order || index + 1}`;

    const typed = window.prompt(
      `To confirm, type the module name exactly:\n\n${moduleTitle}`,
      '',
    );

    if (typed === null) return;

    if (typed.trim() !== moduleTitle.trim()) {
      toast({
        title: 'Name does not match',
        description:
          'The module was not deleted because the name you typed does not match.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(
        `/api/admin/courses/${courseId}/modules/${module.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({
          title: 'Error deleting module',
          description: data.error || 'Failed to delete module.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Module deleted',
        description: 'The module was deleted successfully.',
      });

      setModules((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error('Error deleting module:', err);
      toast({
        title: 'Network error',
        description: 'Could not delete module. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveModule = async (module: Module, index: number) => {
    if (!canManageCourses) {
      toast({
        title: 'No permission',
        description: 'You do not have permission to save modules.',
        variant: 'destructive',
      });
      return;
    }

    const token = getToken();

    const title = module.title || {};
    const hasAnyTitle = LANGUAGES.some((lang) => {
      const v = (title as any)[lang.code];
      return typeof v === 'string' && v.trim().length > 0;
    });

    if (!hasAnyTitle) {
      toast({
        title: 'Missing title',
        description:
          'Please add a module title in at least one language.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: module.title,
        description: module.description,
        xp_threshold: module.xp_threshold ?? 0,
        xp_reward: module.xp_reward ?? 0,
        image_url: module.image_url ?? null,
        order: module.order || index + 1,
        published: !!module.published,
        is_completed: !!module.is_completed,
      };

      let res: Response;
      if (!module.id) {
        res = await fetch(`/api/admin/courses/${courseId}/modules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(
          `/api/admin/courses/${courseId}/modules/${module.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          },
        );
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({
          title: 'Error saving module',
          description: data.error || 'Failed to save module.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      const savedModule = data.module as Module;

      toast({
        title: 'Module saved',
        description: 'Module data was saved successfully.',
      });

      setModules((prev) =>
        prev.map((m, i) =>
          i === index
            ? {
                ...savedModule,
                _isNew: false,
              }
            : m,
        ),
      );
    } catch (err) {
      console.error('Error saving module:', err);
      toast({
        title: 'Network error',
        description: 'Could not save module. Please try again.',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  if (
    loading ||
    !user ||
    !isAdmin ||
    !permissionsLoaded ||
    loadingData
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-300" />
          <p className="mt-4 text-slate-300">
            Loading modules...
          </p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12]">
        <p className="text-slate-300">
          Course not found.
        </p>
      </div>
    );
  }

  const courseTitle = getMultilingualContent(
    course.title,
    currentLanguage,
  );

  return (
    <div className="min-h-screen bg-[#000c12] px-4 py-8 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top bar */}
          <div className="flex justify-between items-center gap-4">
            <div>
              <Link href="/admin/courses">
                <Button variant="ghost" className="mb-2">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Courses
                </Button>
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Manage Modules
              </h1>
              <p className="text-sm text-slate-300">
                Course:{' '}
                <span className="font-semibold">
                  {courseTitle || 'Untitled course'}
                </span>
              </p>
              {permissionsLoaded && !canManageCourses && (
                <div className="flex items-center gap-1 text-[11px] text-amber-700 mt-1">
                  <Lock className="h-3 w-3" />
                  View only  you don&apos;t have permission to edit modules
                </div>
              )}
            </div>
            <Button onClick={handleAddModule} disabled={!canManageCourses}>
              <Plus className="h-4 w-4 mr-2" />
              Add Module
            </Button>
          </div>

          {/* Selector de lingua */}
          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader>
              <CardTitle className="text-sm">
                Language for titles & descriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <Badge
                    key={lang.code}
                    variant={
                      currentLanguage === lang.code ? 'default' : 'outline'
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
            </CardContent>
          </Card>

          {/* Lista de modulos */}
          {modules.length === 0 ? (
            <Card className="border border-white/10 bg-[#05212b]">
              <CardContent className="py-10 text-center text-slate-400">
                No modules yet. Click &quot;Add Module&quot; to create the first
                one.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {modules.map((module, index) => {
                const title = getMultilingualContent(
                  module.title,
                  currentLanguage,
                );
                const description = getMultilingualContent(
                  module.description,
                  currentLanguage,
                );

                const lessonsCount = Array.isArray(module.lessons)
                  ? module.lessons.length
                  : 0;

                return (
                  <Card
                    key={module.id || `new-${index}`}
                    className="border border-white/10 bg-[#05212b]"
                  >
                    <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            Module {module.order || index + 1}
                          </Badge>
                          <Badge
                            className={
                              module.published
                                ? 'bg-green-600'
                                : 'bg-yellow-600'
                            }
                          >
                            {module.published ? 'Published' : 'Draft'}
                          </Badge>
                          {module.is_completed && (
                            <Badge className="bg-blue-600">
                              Completed (XP active)
                            </Badge>
                          )}
                          {module._isNew && (
                            <Badge className="bg-yellow-600">New</Badge>
                          )}
                        </div>
                        <Input
                          value={title}
                          onChange={(e) =>
                            updateModuleTitle(
                              index,
                              currentLanguage,
                              e.target.value,
                            )
                          }
                          placeholder={`Module title (${currentLangLabel})`}
                          className="text-sm font-semibold bg-[#000c12] border-white/10 text-white placeholder:text-xs placeholder:text-slate-400"
                          disabled={!canManageCourses}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          {lessonsCount} lessons in this module
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 w-full md:w-56">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Order</Label>
                          <Input
                            type="number"
                            value={module.order}
                            onChange={(e) =>
                              updateModuleField(
                                index,
                                'order',
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="h-8 text-xs bg-[#000c12] border-white/10 text-white placeholder:text-xs placeholder:text-slate-400"
                            disabled={!canManageCourses}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (module.image_url) {
                              window.open(module.image_url, '_blank');
                            }
                          }}
                        >
                          <ImageIcon className="h-4 w-4 mr-1" />
                          Image
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs">
                          Description ({currentLangLabel})
                        </Label>
                        <Textarea
                          value={description}
                          onChange={(e) =>
                            updateModuleDescription(
                              index,
                              currentLanguage,
                              e.target.value,
                            )
                          }
                          rows={2}
                          className="mt-1 text-xs bg-[#000c12] border-white/10 text-white placeholder:text-xs placeholder:text-slate-400"
                          disabled={!canManageCourses}
                        />
                      </div>

                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs">
                            XP threshold (min XP to unlock module)
                          </Label>
                          <Input
                            type="number"
                            value={module.xp_threshold}
                            onChange={(e) =>
                              updateModuleField(
                                index,
                                'xp_threshold',
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="mt-1 bg-[#000c12] border-white/10 text-white placeholder:text-xs placeholder:text-slate-400"
                            disabled={!canManageCourses}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">
                            XP reward (extra XP when module completed)
                          </Label>
                          <Input
                            type="number"
                            value={module.xp_reward}
                            onChange={(e) =>
                              updateModuleField(
                                index,
                                'xp_reward',
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="mt-1 bg-[#000c12] border-white/10 text-white placeholder:text-xs placeholder:text-slate-400"
                            disabled={!canManageCourses}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Module image URL</Label>
                          <Input
                            type="text"
                            value={module.image_url || ''}
                            onChange={(e) =>
                              updateModuleField(
                                index,
                                'image_url',
                                e.target.value || null,
                              )
                            }
                            placeholder="https://..."
                            className="mt-1 bg-[#000c12] border-white/10 text-white placeholder:text-xs placeholder:text-slate-400"
                            disabled={!canManageCourses}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Status</Label>
                          <div className="mt-1 space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={!!module.published}
                                onCheckedChange={(checked) =>
                                  updateModuleField(
                                    index,
                                    'published',
                                    checked,
                                  )
                                }
                                disabled={!canManageCourses}
                              />
                              <span>
                                {module.published ? 'Published' : 'Draft'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={!!module.is_completed}
                                onCheckedChange={(checked) =>
                                  updateModuleField(
                                    index,
                                    'is_completed',
                                    checked,
                                  )
                                }
                                disabled={!canManageCourses}
                              />
                              <span>
                                {module.is_completed
                                  ? 'Completed (XP active)'
                                  : 'Not completed'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-400">
                        Marking a module as completed with a positive XP reward
                        will automatically grant that XP to all users who have
                        already finished all lessons in this module (once).
                      </div>

                      <div className="flex justify-between gap-2 pt-2 border-t">
                        <div className="text-xs text-slate-400">
                          {lessonsCount === 0
                            ? 'No lessons yet.'
                            : `${lessonsCount} lesson${
                                lessonsCount === 1 ? '' : 's'
                              } in this module.`}
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!module.id) {
                                toast({
                                  title: 'Save module first',
                                  description:
                                    'You need to save the module before managing lessons.',
                                });
                                return;
                              }
                              router.push(
                                `/admin/courses/${courseId}/modules/${module.id}/lessons`,
                              );
                            }}
                          >
                            Manage lessons
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDeleteModule(module, index)
                            }
                            disabled={!canManageCourses}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleSaveModule(module, index)
                            }
                            disabled={saving || !canManageCourses}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {saving ? 'Saving...' : 'Save module'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
