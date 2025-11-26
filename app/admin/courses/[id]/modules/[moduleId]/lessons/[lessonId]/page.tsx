'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
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

import { ArrowLeft, Save, Eye } from 'lucide-react';

import {
  BlockEditor,
  type BlocksByLanguage,
  type LangCode,
  serializeBlocksByLanguage,
} from '@/components/admin/content/BlockEditor';

import { getMultilingualContent } from '@/lib/i18n';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
] as const;

type Lesson = {
  id: string;
  module_id?: string;
  order: number;
  title: Record<string, string>;
  description: Record<string, string>;
  content: Record<string, string>;
  xp_reward: number;
  xp_threshold: number;
  estimated_time: number;
  image_url?: string | null;
  file_url?: string | null;
  published?: boolean | null;
};

type Module = {
  id: string;
  title: any;
};

type Course = {
  id: string;
  title: any;
};

export default function LessonAdvancedEditorPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const moduleId = params.moduleId as string;
  const lessonId = params.lessonId as string;

  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);

  const [currentLanguage, setCurrentLanguage] = useState<LangCode>('en');
  const [blocksByLanguage, setBlocksByLanguage] =
    useState<BlocksByLanguage>({});

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

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

  // Carregar curso, módulo e lesson
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const token = getToken();

        // 1) Curso + módulos (para mostrar títulos)
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

        // 2) Carregar lesson
        const resLesson = await fetch(`/api/admin/lessons/${lessonId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const dataLesson = await resLesson.json();
        if (!resLesson.ok || !dataLesson.success || !dataLesson.lesson) {
          toast({
            title: 'Error loading lesson',
            description: dataLesson.error || 'Failed to load lesson.',
            variant: 'destructive',
          });
          setLesson(null);
          return;
        }

        const l = dataLesson.lesson as Lesson & {
          title?: any;
          description?: any;
          content?: any;
        };

        // Normalizar objetos multi-língua
        const baseLangs: Record<string, string> = {};
        LANGUAGES.forEach((lng) => {
          baseLangs[lng.code] = '';
        });

        const safeTitle = {
          ...baseLangs,
          ...(l.title || {}),
        };

        const safeDescription = {
          ...baseLangs,
          ...(l.description || {}),
        };

        const safeContent = {
          ...baseLangs,
          ...(l.content || {}),
        };

        setLesson({
          id: l.id,
          module_id: l.module_id,
          order: l.order ?? 1,
          title: safeTitle,
          description: safeDescription,
          content: safeContent,
          xp_reward: l.xp_reward ?? 20,
          xp_threshold: l.xp_threshold ?? 0,
          estimated_time: l.estimated_time ?? 10,
          image_url: l.image_url ?? null,
          file_url: l.file_url ?? null,
          published: l.published ?? false,
        });

        // Inicializar blocksByLanguage a partir do HTML existente:
        const initialBlocks: BlocksByLanguage = {};
        LANGUAGES.forEach(({ code }) => {
          const html = safeContent[code] || '';
          if (html && html.trim()) {
            initialBlocks[code as LangCode] = [
              {
                id: `html_${code}`,
                type: 'html',
                data: { html },
              },
            ];
          } else {
            initialBlocks[code as LangCode] = [];
          }
        });
        setBlocksByLanguage(initialBlocks);
      } catch (err) {
        console.error('Error loading advanced lesson editor:', err);
        toast({
          title: 'Network error',
          description: 'Could not load lesson. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    if (isAdmin) {
      fetchData();
    }
  }, [courseId, moduleId, lessonId, getToken, isAdmin, toast]);

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.name ||
    currentLanguage;

  const courseTitle = course
    ? getMultilingualContent(course.title, currentLanguage)
    : '';
  const moduleTitle = module
    ? getMultilingualContent(module.title, currentLanguage)
    : '';

  function updateLessonText(
    field: 'title' | 'description',
    lang: LangCode,
    value: string,
  ) {
    setLesson((prev) => {
      if (!prev) return prev;
      const raw = prev[field] || {};
      const obj =
        typeof raw === 'object' && raw !== null ? { ...raw } : {};
      obj[lang] = value;
      return { ...prev, [field]: obj };
    });
  }

  function updateLessonField(
    field:
      | 'order'
      | 'xp_reward'
      | 'xp_threshold'
      | 'estimated_time'
      | 'image_url'
      | 'file_url'
      | 'published',
    value: any,
  ) {
    setLesson((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  const handleSave = async () => {
    if (!lesson) return;

    const hasAnyTitle = LANGUAGES.some((lng) => {
      const v = lesson.title?.[lng.code];
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

    setSaving(true);
    try {
      const token = getToken();

      // Serializar blocos → HTML por língua
      const serializedContent = serializeBlocksByLanguage(
        blocksByLanguage,
      );

      const payload = {
        title: lesson.title,
        description: lesson.description,
        content: serializedContent,
        xp_reward: lesson.xp_reward ?? 20,
        xp_threshold: lesson.xp_threshold ?? 0,
        order: lesson.order ?? 1,
        estimated_time: lesson.estimated_time ?? 10,
        image_url: lesson.image_url ?? null,
        file_url: lesson.file_url ?? null,
      };

      const res = await fetch(`/api/admin/lessons/${lesson.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({
          title: 'Error saving lesson',
          description: data.error || 'Failed to save lesson.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      const updated = data.lesson as Lesson;

      toast({
        title: 'Lesson saved',
        description: 'Lesson updated successfully.',
      });

      setLesson((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
            }
          : updated,
      );
    } catch (err) {
      console.error('Error saving lesson (advanced editor):', err);
      toast({
        title: 'Network error',
        description: 'Could not save lesson. Please try again.',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  const handlePreview = () => {
    if (!lesson?.id) {
      toast({
        title: 'Save lesson first',
        description:
          'You need to save the lesson before opening the public preview.',
        variant: 'destructive',
      });
      return;
    }

    // Preview = mesma página que o aluno veria
    const url = `/education/lessons/${lesson.id}?preview=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading || !user || !isAdmin || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading lesson editor...
          </p>
        </div>
      </div>
    );
  }

  if (!lesson || !course || !module) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 dark:text-gray-300">
            Lesson, course or module not found.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const currentTitle = lesson.title?.[currentLanguage] || '';
  const currentDescription =
    lesson.description?.[currentLanguage] || '';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Top bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <Button
                  variant="ghost"
                  className="mb-2"
                  onClick={() =>
                    router.push(
                      `/admin/courses/${courseId}/modules/${moduleId}/lessons`,
                    )
                  }
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Lessons
                </Button>
                <h1 className="text-2xl md:text-3xl font-bold mb-1">
                  Edit Lesson (Advanced)
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
              </div>

              <div className="flex gap-2 flex-wrap justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>

            {/* Selector de língua */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Language for title, description & content blocks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
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
              </CardContent>
            </Card>

            {/* Meta + Block editor */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: title, description + blocks */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lesson content ({currentLangLabel})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Title ({currentLangLabel})</Label>
                      <Input
                        className="mt-1"
                        value={currentTitle}
                        onChange={(e) =>
                          updateLessonText(
                            'title',
                            currentLanguage,
                            e.target.value,
                          )
                        }
                        placeholder="Lesson title"
                      />
                    </div>

                    <div>
                      <Label>Description ({currentLangLabel})</Label>
                      <Textarea
                        className="mt-1"
                        rows={3}
                        value={currentDescription}
                        onChange={(e) =>
                          updateLessonText(
                            'description',
                            currentLanguage,
                            e.target.value,
                          )
                        }
                        placeholder="Short summary of the lesson"
                      />
                    </div>

                    <div>
                      <Label>Blocks ({currentLangLabel})</Label>
                      <p className="text-xs text-gray-500 mb-2">
                        Build the lesson body using blocks (headings,
                        paragraphs, lists, images, buttons...). This
                        will be converted into HTML for the student view.
                      </p>
                      <BlockEditor
                        value={blocksByLanguage}
                        onChange={setBlocksByLanguage}
                        initialLanguage={currentLanguage}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: meta settings */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lesson settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Order in module</Label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={lesson.order}
                        onChange={(e) =>
                          updateLessonField(
                            'order',
                            parseInt(e.target.value) || 1,
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label>XP reward (earned on completion)</Label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={lesson.xp_reward}
                        onChange={(e) =>
                          updateLessonField(
                            'xp_reward',
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label>XP threshold (minimum XP to unlock)</Label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={lesson.xp_threshold}
                        onChange={(e) =>
                          updateLessonField(
                            'xp_threshold',
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label>Estimated time (minutes)</Label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={lesson.estimated_time}
                        onChange={(e) =>
                          updateLessonField(
                            'estimated_time',
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label>Lesson image URL</Label>
                      <Input
                        type="text"
                        className="mt-1"
                        value={lesson.image_url || ''}
                        onChange={(e) =>
                          updateLessonField(
                            'image_url',
                            e.target.value || null,
                          )
                        }
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <Label>File URL (PDF, slides, etc.)</Label>
                      <Input
                        type="text"
                        className="mt-1"
                        value={lesson.file_url || ''}
                        onChange={(e) =>
                          updateLessonField(
                            'file_url',
                            e.target.value || null,
                          )
                        }
                        placeholder="https://..."
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Tips for great lessons
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-1 text-gray-700">
                    <p>• Start with a clear heading and short intro.</p>
                    <p>• Use subheadings to break long content.</p>
                    <p>• Use lists for steps, tips or key ideas.</p>
                    <p>• Add images or videos to make it visual.</p>
                    <p>• End with a short recap or call-to-action.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
