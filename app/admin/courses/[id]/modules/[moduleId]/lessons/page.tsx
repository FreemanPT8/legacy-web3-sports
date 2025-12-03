'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

import {
  Plus,
  Save,
  Trash2,
  LayoutTemplate,
  Eye,
} from 'lucide-react';

import { getMultilingualContent } from '@/lib/i18n';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
] as const;

type LangCode = (typeof LANGUAGES)[number]['code'];

type Lesson = {
  id?: string;
  module_id?: string;
  order: number;
  title: any;
  description: any;
  content: any;
  xp_reward: number;
  xp_threshold: number;
  estimated_time: number;
  image_url?: string | null;
  file_url?: string | null;
  // published?: boolean; // ⚠ quando existir na BD
  _isNew?: boolean;
};

type Module = {
  id: string;
  title: any;
};

type Course = {
  id: string;
  title: any;
  author_name?: string | null;
  is_completed?: boolean | null;
  xp_total_distributed?: number;
  xp_creator_distributed?: number;
};

export default function ModuleLessonsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const moduleId = params.moduleId as string;

  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<LangCode>('en');
  const [loadingData, setLoadingData] = useState(true);
  const [savingLessonId, setSavingLessonId] = useState<string | 'new' | null>(
    null,
  );
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>(
    'desktop',
  );
  const isValidUrl = (value: string) => {
    if (!value.trim()) return true;
    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const isAdmin =
    user && (user.role === 'Super Admin' || user.role === 'Admin');

  // Proteção básica
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

  // Carregar curso, módulo e lições
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const token = getToken();

        // 1) Carregar curso + módulos
        const resCourse = await fetch(`/api/admin/courses/${courseId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const dataCourse = await resCourse.json();
        if (!resCourse.ok || !dataCourse.success) {
          toast({
            title: 'Error loading course',
            description: dataCourse.error || 'Failed to load course.',
            variant: 'destructive',
          });
          setCourse(null);
          setModule(null);
        } else {
          const c = dataCourse.course as Course & { modules?: any[] };
          setCourse(c);

          const foundModule =
            Array.isArray(c.modules) &&
            c.modules.find((m: any) => m.id === moduleId);

          if (!foundModule) {
            toast({
              title: 'Module not found',
              description: 'The module does not exist for this course.',
              variant: 'destructive',
            });
            setModule(null);
          } else {
            setModule({
              id: foundModule.id,
              title: foundModule.title,
            });
          }
        }

        // 2) Carregar lições do módulo
        const resLessons = await fetch(
          `/api/admin/courses/${courseId}/modules/${moduleId}/lessons`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        const dataLessons = await resLessons.json();
        if (!resLessons.ok || !dataLessons.success) {
          toast({
            title: 'Error loading lessons',
            description: dataLessons.error || 'Failed to load lessons.',
            variant: 'destructive',
          });
          setLessons([]);
        } else {
          const ls: Lesson[] = Array.isArray(dataLessons.lessons)
            ? dataLessons.lessons
                .slice()
                .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                .map((l: any) => ({
                  id: l.id,
                  module_id: l.module_id,
                  order: l.order ?? 0,
                  title: l.title,
                  description: l.description,
                  content: l.content,
                  xp_reward: l.xp_reward ?? 20,
                  xp_threshold: l.xp_threshold ?? 0,
                  estimated_time: l.estimated_time ?? 10,
                  image_url: l.image_url ?? null,
                  file_url: l.file_url ?? null,
                  // published: l.published ?? false,
                }))
            : [];

          setLessons(ls);
        }
      } catch (err) {
        console.error('Error loading module lessons:', err);
        toast({
          title: 'Network error',
          description: 'Could not load module lessons.',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    if (isAdmin) {
      fetchData();
    }
  }, [courseId, moduleId, getToken, isAdmin, toast]);

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.name ||
    currentLanguage;

  // Helpers multi-língua
  function updateLessonMLField(
    index: number,
    field: 'title' | 'description' | 'content',
    lang: LangCode,
    value: string,
  ) {
    setLessons((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const raw = (l as any)[field] || {};
        const obj =
          typeof raw === 'object' && raw !== null ? { ...raw } : {};
        (obj as any)[lang] = value;
        return { ...l, [field]: obj };
      }),
    );
  }

  function updateLessonField(
    index: number,
    field:
      | 'order'
      | 'xp_reward'
      | 'xp_threshold'
      | 'estimated_time'
      | 'image_url'
      | 'file_url',
    value: any,
  ) {
    setLessons((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              [field]: value,
            }
          : l,
      ),
    );
  }

  const handleAddLesson = () => {
    setLessons((prev) => {
      const nextOrder =
        prev.length > 0
          ? Math.max(...prev.map((l) => l.order || 0)) + 1
          : 1;

      const emptyLangs: Record<string, string> = {};
      LANGUAGES.forEach((l) => {
        emptyLangs[l.code] = '';
      });

      const newLesson: Lesson = {
        _isNew: true,
        module_id: moduleId,
        order: nextOrder,
        title: { ...emptyLangs },
        description: { ...emptyLangs },
        content: { ...emptyLangs },
        xp_reward: 20,
        xp_threshold: 0,
        estimated_time: 10,
        image_url: null,
        file_url: null,
      };

      return [...prev, newLesson];
    });
  };

  const handleDeleteLesson = async (lesson: Lesson, index: number) => {
    if (!lesson.id) {
      setLessons((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    const lessonTitle =
      getMultilingualContent(lesson.title, currentLanguage) ||
      `Lesson ${lesson.order || index + 1}`;

    const typed = window.prompt(
      `To confirm, type the lesson name exactly:\n\n${lessonTitle}`,
      '',
    );

    if (typed === null) return;

    if (typed.trim() !== lessonTitle.trim()) {
      toast({
        title: 'Name does not match',
        description:
          'The lesson was not deleted because the name you typed does not match.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`/api/admin/lessons/${lesson.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({
          title: 'Error deleting lesson',
          description: data.error || 'Failed to delete lesson.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Lesson deleted',
        description: 'The lesson was deleted successfully.',
      });

      setLessons((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error('Error deleting lesson:', err);
      toast({
        title: 'Network error',
        description: 'Could not delete lesson. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveLesson = async (lesson: Lesson, index: number) => {
    const token = getToken();

    const title = lesson.title || {};
    const hasAnyTitle = LANGUAGES.some((lang) => {
      const v = (title as any)[lang.code];
      return typeof v === 'string' && v.trim().length > 0;
    });

    if (!hasAnyTitle) {
      toast({
        title: 'Missing title',
        description:
          'Please add a lesson title in at least one language.',
        variant: 'destructive',
      });
      return;
    }

    setSavingLessonId(lesson.id || 'new');

    try {
      const payload = {
        title: lesson.title,
        description: lesson.description,
        content: lesson.content,
        xp_reward: lesson.xp_reward ?? 20,
        xp_threshold: lesson.xp_threshold ?? 0,
        order: lesson.order || index + 1,
        estimated_time: lesson.estimated_time ?? 10,
        image_url: lesson.image_url ?? null,
        file_url: lesson.file_url ?? null,
      };

      let res: Response;
      if (!lesson.id) {
        // Criar nova lição
        res = await fetch(
          `/api/admin/courses/${courseId}/modules/${moduleId}/lessons`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          },
        );
      } else {
        // Atualizar lição existente
        res = await fetch(`/api/admin/lessons/${lesson.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({
          title: 'Error saving lesson',
          description: data.error || 'Failed to save lesson.',
          variant: 'destructive',
        });
        setSavingLessonId(null);
        return;
      }

      const savedLesson = data.lesson as Lesson;

      toast({
        title: 'Lesson saved',
        description: 'Lesson data was saved successfully.',
      });

      setLessons((prev) =>
        prev.map((l, i) =>
          i === index
            ? {
                ...savedLesson,
                _isNew: false,
              }
            : l,
        ),
      );
    } catch (err) {
      console.error('Error saving lesson:', err);
      toast({
        title: 'Network error',
        description: 'Could not save lesson. Please try again.',
        variant: 'destructive',
      });
    }
    setSavingLessonId(null);
  };

  if (loading || !user || !isAdmin || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading lessons...
          </p>
        </div>
      </div>
    );
  }

  if (!course || !module) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-300">
          Course or module not found.
        </p>
      </div>
    );
  }

  const courseTitle = getMultilingualContent(course.title, currentLanguage);
  const moduleTitle = getMultilingualContent(module.title, currentLanguage);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top bar */}
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Manage Lessons
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Course:{' '}
                <span className="font-semibold">
                  {courseTitle || 'Untitled course'}
                </span>
                {' · '}
                Module:{' '}
                <span className="font-semibold">
                  {moduleTitle || 'Untitled module'}
                </span>
              </p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                <Badge className={course.is_completed ? 'bg-green-600' : 'bg-yellow-600'}>
                  {course.is_completed ? 'Completed' : 'Ongoing process'}
                </Badge>
                {typeof course.xp_total_distributed === 'number' && (
                  <Badge variant="outline">
                    Total XP distributed: {course.xp_total_distributed}
                  </Badge>
                )}
                {typeof course.xp_creator_distributed === 'number' && (
                  <Badge variant="outline">
                    XP to creator: {course.xp_creator_distributed}
                  </Badge>
                )}
                {course.author_name && (
                  <Badge variant="secondary">Creator: {course.author_name}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex bg-white dark:bg-gray-900 rounded-md border p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  onClick={() => setPreviewMode('desktop')}
                >
                  Desktop
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  onClick={() => setPreviewMode('mobile')}
                >
                  Mobile
                </Button>
              </div>
              <Button onClick={handleAddLesson}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lesson
              </Button>
            </div>
          </div>

          {/* Selector de língua */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Language for titles, descriptions & content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <Badge
                    key={lang.code}
                    variant={currentLanguage === lang.code ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setCurrentLanguage(lang.code as LangCode)}
                  >
                    {lang.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lista de lições */}
          {lessons.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-gray-500">
                No lessons yet. Click &quot;Add Lesson&quot; to create the first one.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson, index) => {
                const title = getMultilingualContent(lesson.title, currentLanguage);
                const description = getMultilingualContent(
                  lesson.description,
                  currentLanguage,
                );
                const content = getMultilingualContent(lesson.content, currentLanguage);

                const savingThis = savingLessonId === (lesson.id || 'new');
                const titleLength = (title || '').length;
                const descriptionLength = (description || '').length;
                const fileUrlInvalid =
                  !!lesson.file_url && !isValidUrl(lesson.file_url || '');
                const imageUrlInvalid =
                  !!lesson.image_url && !isValidUrl(lesson.image_url || '');
                const previewContainer =
                  previewMode === 'mobile' ? 'max-w-xs' : 'max-w-2xl';
                const previewText =
                  previewMode === 'mobile'
                    ? 'text-sm leading-relaxed'
                    : 'text-base leading-relaxed';

                return (
                  <Card key={lesson.id || `new-${index}`} className="border-blue-100">
                    <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">Lesson {lesson.order || index + 1}</Badge>
                          {lesson._isNew && <Badge className="bg-yellow-600">New</Badge>}
                        </div>
                        <Input
                          value={title}
                          onChange={(e) =>
                            updateLessonMLField(index, 'title', currentLanguage, e.target.value)
                          }
                          placeholder={`Lesson title (${currentLangLabel})`}
                          className="text-sm font-semibold"
                        />
                        <div className="text-[11px] text-gray-500 mt-1">
                          {titleLength} chars / description {descriptionLength} chars
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {lesson.estimated_time || 0} minutes - XP: {lesson.xp_reward || 0}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 w-full md:w-40">
                        <Label className="text-xs">Order</Label>
                        <Input
                          type="number"
                          value={lesson.order}
                          onChange={(e) =>
                            updateLessonField(
                              index,
                              'order',
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">
                            Description ({currentLangLabel})
                          </Label>
                          <Textarea
                            value={description}
                            onChange={(e) =>
                              updateLessonMLField(
                                index,
                                'description',
                                currentLanguage,
                                e.target.value,
                              )
                            }
                            rows={3}
                            className="text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">
                            Content HTML ({currentLangLabel})
                          </Label>
                          <Textarea
                            value={content}
                            onChange={(e) =>
                              updateLessonMLField(
                                index,
                                'content',
                                currentLanguage,
                                e.target.value,
                              )
                            }
                            rows={6}
                            className="text-xs mt-1 font-mono"
                            placeholder="<p>HTML for this lesson...</p>"
                          />
                        </div>
                      </div>

                      <div
                        className={`border rounded-lg p-4 bg-white dark:bg-gray-900 space-y-2 ${previewContainer}`}
                      >
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Preview ({previewMode})</span>
                          <span>
                            {previewMode === 'mobile' ? 'Mobile width' : 'Desktop width'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            {title || 'Untitled lesson'}
                          </p>
                          <p className={`text-gray-700 dark:text-gray-200 ${previewText}`}>
                            {description || 'No description yet.'}
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs">
                            XP reward (earned when completed)
                          </Label>
                          <Input
                            type="number"
                            value={lesson.xp_reward}
                            onChange={(e) =>
                              updateLessonField(
                                index,
                                'xp_reward',
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">
                            XP threshold (min XP to unlock)
                          </Label>
                          <Input
                            type="number"
                            value={lesson.xp_threshold}
                            onChange={(e) =>
                              updateLessonField(
                                index,
                                'xp_threshold',
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">
                            Estimated time (minutes)
                          </Label>
                          <Input
                            type="number"
                            value={lesson.estimated_time}
                            onChange={(e) =>
                              updateLessonField(
                                index,
                                'estimated_time',
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">File URL</Label>
                          <Input
                            type="text"
                            value={lesson.file_url || ''}
                            onChange={(e) =>
                              updateLessonField(
                                index,
                                'file_url',
                                e.target.value || null,
                              )
                            }
                            placeholder="https://..."
                            className={`mt-1 ${fileUrlInvalid ? 'border-red-400' : ''}`}
                          />
                          {fileUrlInvalid && (
                            <p className="text-[11px] text-red-600 mt-1">
                              Insere um URL valido (http/https).
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Lesson image URL</Label>
                          <Input
                            type="text"
                            value={lesson.image_url || ''}
                            onChange={(e) =>
                              updateLessonField(
                                index,
                                'image_url',
                                e.target.value || null,
                              )
                            }
                            placeholder="https://..."
                            className={`mt-1 ${imageUrlInvalid ? 'border-red-400' : ''}`}
                          />
                          {imageUrlInvalid && (
                            <p className="text-[11px] text-red-600 mt-1">
                              Insere um URL valido (http/https).
                            </p>
                          )}
                          {lesson.image_url && !imageUrlInvalid && (
                            <div className="mt-2 border rounded-md p-2 bg-white">
                              <div className="text-[11px] text-gray-500 mb-1">Preview</div>
                              <img
                                src={lesson.image_url}
                                alt="Lesson cover preview"
                                className="w-full h-32 object-cover rounded"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between gap-2 pt-2 border-t">
                        <div className="text-xs text-gray-500">
                          Lesson ID: {lesson.id ? lesson.id : 'Not saved yet'}
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!lesson.id) {
                                toast({
                                  title: 'Save lesson first',
                                  description:
                                    'You need to save the lesson before opening the advanced editor.',
                                  variant: 'destructive',
                                });
                                return;
                              }
                              router.push(
                                `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`,
                              );
                            }}
                          >
                            <LayoutTemplate className="h-4 w-4 mr-1" />
                            Open editor
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!lesson.id) {
                                toast({
                                  title: 'Save lesson first',
                                  description:
                                    'You need to save the lesson before previewing it as a student.',
                                  variant: 'destructive',
                                });
                                return;
                              }
                              window.open(
                                `/education/lessons/${lesson.id}`,
                                '_blank',
                              );
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteLesson(lesson, index)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveLesson(lesson, index)}
                            disabled={!!savingLessonId}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {savingThis ? 'Saving...' : 'Save lesson'}
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


