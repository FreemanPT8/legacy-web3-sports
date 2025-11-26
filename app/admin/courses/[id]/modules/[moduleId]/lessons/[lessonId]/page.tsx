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

type MultiLang = Record<string, string>;
type LangCodeUnion = (typeof LANGUAGES)[number]['code'];

type Lesson = {
  id: string;
  module_id?: string;
  order: number;
  title: MultiLang;
  description: MultiLang;
  content: MultiLang;
  xp_reward: number;
  xp_threshold: number;
  estimated_time: number;
  image_url?: string | null;
  file_url?: string | null;
};

type Module = {
  id: string;
  title: MultiLang | any;
};

type Course = {
  id: string;
  title: MultiLang | any;
};

function generateBlockId(prefix: string = 'blk') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

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

  const [blocksByLanguage, setBlocksByLanguage] =
    useState<BlocksByLanguage>({});
  const [currentLanguage, setCurrentLanguage] =
    useState<LangCodeUnion>('en');

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

  // Carregar curso + módulo + lição
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !isAdmin) return;
      setLoadingData(true);

      try {
        const token = getToken();

        // 1) Curso e módulos (como na página de overview)
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

        // 2) Lição específica: reutilizamos o endpoint de lista e filtramos
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
            title: 'Error loading lesson',
            description: dataLessons.error || 'Failed to load lessons.',
            variant: 'destructive',
          });
          setLesson(null);
        } else {
          const list: any[] = Array.isArray(dataLessons.lessons)
            ? dataLessons.lessons
            : [];
          const l = list.find((x) => x.id === lessonId);

          if (!l) {
            toast({
              title: 'Lesson not found',
              description: 'The requested lesson does not exist.',
              variant: 'destructive',
            });
            setLesson(null);
          } else {
            const safeTitle: MultiLang = {
              en: '',
              pt: '',
              es: '',
              fr: '',
              it: '',
              de: '',
              ...(l.title || {}),
            };
            const safeDescription: MultiLang = {
              en: '',
              pt: '',
              es: '',
              fr: '',
              it: '',
              de: '',
              ...(l.description || {}),
            };
            const safeContent: MultiLang = {
              en: '',
              pt: '',
              es: '',
              fr: '',
              it: '',
              de: '',
              ...(l.content || {}),
            };

            const normalized: Lesson = {
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
            };

            setLesson(normalized);

            // Inicializar BlockEditor: um bloco HTML por língua
            const initialBlocks: BlocksByLanguage = {};
            LANGUAGES.forEach(({ code }) => {
              const html = safeContent[code] || '';
              if (html && html.trim()) {
                initialBlocks[code] = [
                  {
                    id: generateBlockId('html'),
                    type: 'html',
                    data: { html },
                  },
                ];
              } else {
                initialBlocks[code] = [];
              }
            });
            setBlocksByLanguage(initialBlocks);
          }
        }
      } catch (err) {
        console.error('Error loading lesson for editing:', err);
        toast({
          title: 'Network error',
          description: 'Could not load lesson. Please try again.',
          variant: 'destructive',
        });
        setLesson(null);
      } finally {
        setLoadingData(false);
      }
    };

    if (isAdmin) {
      fetchData();
    }
  }, [courseId, moduleId, lessonId, getToken, isAdmin, user, toast]);

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.name ||
    currentLanguage;

  function updateMLField(
    field: 'title' | 'description',
    lang: LangCodeUnion,
    value: string,
  ) {
    if (!lesson) return;
    setLesson({
      ...lesson,
      [field]: {
        ...(lesson as any)[field],
        [lang]: value,
      },
    });
  }

  function updateField(
    field:
      | 'order'
      | 'xp_reward'
      | 'xp_threshold'
      | 'estimated_time'
      | 'image_url'
      | 'file_url',
    value: any,
  ) {
    if (!lesson) return;
    setLesson({
      ...lesson,
      [field]: value,
    });
  }

  const handleSave = async () => {
    if (!lesson) return;

    // pelo menos um título
    const hasAnyTitle = LANGUAGES.some((l) => {
      const v = lesson.title[l.code];
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

      const content = serializeBlocksByLanguage(blocksByLanguage);

      const payload = {
        title: lesson.title,
        description: lesson.description,
        content,
        xp_reward: lesson.xp_reward ?? 20,
        xp_threshold: lesson.xp_threshold ?? 0,
        order: lesson.order || 1,
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

      toast({
        title: 'Lesson saved',
        description: 'Lesson updated successfully.',
      });

      // refrescar dados com o que veio da API, se quiseres
      // por simplicidade, só limpamos o estado de loading
    } catch (err) {
      console.error('Error saving lesson:', err);
      toast({
        title: 'Network error',
        description: 'Could not save lesson. Please try again.',
        variant: 'destructive',
      });
    }

    setSaving(false);
  };

  if (loading || !user || !isAdmin || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading lesson...
          </p>
        </div>
      </div>
    );
  }

  if (!course || !module || !lesson) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 dark:text-gray-300">
            Course, module or lesson not found.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const courseTitle = getMultilingualContent(
    course.title,
    currentLanguage as any,
  );
  const moduleTitle = getMultilingualContent(
    module.title,
    currentLanguage as any,
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Top bar */}
            <div className="flex justify-between items-center gap-4">
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
                  Edit Lesson
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
                  {' · '}
                  Lesson order:{' '}
                  <span className="font-semibold">{lesson.order}</span>
                </p>
              </div>

              <div className="flex flex-col gap-2 items-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `/education/lessons/${lesson.id}`,
                      '_blank',
                    )
                  }
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview as student
                </Button>
                <Button
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
                  Language for titles, descriptions & content
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
                        setCurrentLanguage(lang.code as LangCodeUnion)
                      }
                    >
                      {lang.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Editor principal */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Conteúdo */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lesson content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Title ({currentLangLabel})</Label>
                      <Input
                        value={lesson.title[currentLanguage] || ''}
                        onChange={(e) =>
                          updateMLField(
                            'title',
                            currentLanguage,
                            e.target.value,
                          )
                        }
                        placeholder="Lesson title"
                        className="text-lg"
                      />
                    </div>

                    <div>
                      <Label>Description ({currentLangLabel})</Label>
                      <Textarea
                        value={lesson.description[currentLanguage] || ''}
                        onChange={(e) =>
                          updateMLField(
                            'description',
                            currentLanguage,
                            e.target.value,
                          )
                        }
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>Body ({currentLangLabel})</Label>
                      <BlockEditor
                        value={blocksByLanguage}
                        onChange={setBlocksByLanguage}
                        initialLanguage={currentLanguage}
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Meta / XP / ficheiros */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lesson settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs">Order</Label>
                      <Input
                        type="number"
                        value={lesson.order}
                        onChange={(e) =>
                          updateField(
                            'order',
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">
                        XP reward (earned when completed)
                      </Label>
                      <Input
                        type="number"
                        value={lesson.xp_reward}
                        onChange={(e) =>
                          updateField(
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
                          updateField(
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
                          updateField(
                            'estimated_time',
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Lesson image URL</Label>
                      <Input
                        type="text"
                        value={lesson.image_url || ''}
                        onChange={(e) =>
                          updateField('image_url', e.target.value || null)
                        }
                        placeholder="https://..."
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">File URL (optional)</Label>
                      <Input
                        type="text"
                        value={lesson.file_url || ''}
                        onChange={(e) =>
                          updateField('file_url', e.target.value || null)
                        }
                        placeholder="https://..."
                        className="mt-1"
                      />
                    </div>
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
