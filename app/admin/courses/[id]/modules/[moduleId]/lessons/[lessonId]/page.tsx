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

import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
} from 'lucide-react';

import {
  BlockEditor,
  type BlocksByLanguage,
  type LangCode,
  serializeBlocksByLanguage,
} from '@/components/admin/content/BlockEditor';

type MultiLang = Record<string, string>;

type LessonRecord = {
  id: string;
  module_id: string | null;
  title: MultiLang;
  description: MultiLang;
  content: MultiLang;
  xp_reward?: number | null;
  xp_threshold?: number | null;
  estimated_time?: number | null;
  image_url?: string | null;
  file_url?: string | null;
  order?: number | null;
};

const LANGUAGES: { code: LangCode; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
];

export default function LessonEditorPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const moduleId = params.moduleId as string;
  const lessonId = params.lessonId as string;

  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [currentLanguage, setCurrentLanguage] =
    useState<LangCode>('en');
  const [lesson, setLesson] = useState<LessonRecord | null>(null);
  const [blocksByLang, setBlocksByLang] =
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

  // Helper: garantir objeto multilíngua completo
  function ensureMultiLang(raw: any): MultiLang {
    const base: MultiLang = {
      en: '',
      pt: '',
      es: '',
      fr: '',
      it: '',
      de: '',
    };
    if (raw && typeof raw === 'object') {
      return { ...base, ...raw };
    }
    return base;
  }

  // Carregar lição
  useEffect(() => {
    const fetchLesson = async () => {
      if (!isAdmin) return;
      setLoadingData(true);
      try {
        const token = getToken();
        const res = await fetch(`/api/lessons/${lessonId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success || !data.lesson) {
          toast({
            title: 'Error loading lesson',
            description: data.error || 'Failed to load lesson data.',
            variant: 'destructive',
          });
          setLesson(null);
          setLoadingData(false);
          return;
        }

        const l = data.lesson as LessonRecord;

        const safeTitle = ensureMultiLang(l.title);
        const safeDescription = ensureMultiLang(l.description);
        const safeContent = ensureMultiLang(l.content);

        setLesson({
          ...l,
          title: safeTitle,
          description: safeDescription,
          content: safeContent,
          xp_reward: l.xp_reward ?? 20,
          xp_threshold: l.xp_threshold ?? 0,
          estimated_time: l.estimated_time ?? 10,
          image_url: l.image_url ?? null,
          file_url: l.file_url ?? null,
          order: l.order ?? 0,
        });

        // Inicializar blocos: um bloco HTML por língua com o conteúdo atual
        const initialBlocks: BlocksByLanguage = {};
        LANGUAGES.forEach(({ code }) => {
          const html = safeContent[code] || '';
          if (html && html.trim()) {
            initialBlocks[code] = [
              {
                id: `html_${code}_${Math.random()
                  .toString(36)
                  .slice(2, 9)}`,
                type: 'html',
                data: { html },
              },
            ];
          } else {
            initialBlocks[code] = [];
          }
        });
        setBlocksByLang(initialBlocks);
      } catch (err) {
        console.error('Error fetching lesson for editor:', err);
        toast({
          title: 'Network error',
          description: 'Could not load lesson for editing.',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchLesson();
  }, [lessonId, getToken, isAdmin, toast]);

  // Helpers multilíngua
  function updateLessonMLField(
    field: 'title' | 'description',
    lang: LangCode,
    value: string,
  ) {
    setLesson((prev) => {
      if (!prev) return prev;
      const nextField: MultiLang = {
        ...prev[field],
        [lang]: value,
      };
      return {
        ...prev,
        [field]: nextField,
      };
    });
  }

  function getLessonMLField(
    field: 'title' | 'description',
    lang: LangCode,
  ) {
    if (!lesson) return '';
    const raw = lesson[field];
    return raw?.[lang] || '';
  }

  // Helpers simples
  function updateLessonField(
    field:
      | 'xp_reward'
      | 'xp_threshold'
      | 'estimated_time'
      | 'image_url'
      | 'file_url',
    value: any,
  ) {
    setLesson((prev) =>
      prev
        ? {
            ...prev,
            [field]: value,
          }
        : prev,
    );
  }

  async function handleSave() {
    if (!lesson) return;

    // Título em pelo menos uma língua
    const hasAnyTitle = Object.values(lesson.title || {}).some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );

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
      // Serializar blocos → HTML por língua
      const contentByLang = serializeBlocksByLanguage(blocksByLang);

      const token = getToken();
      const res = await fetch(`/api/admin/lessons/${lesson.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: lesson.title,
          description: lesson.description,
          content: contentByLang,
          xp_reward: lesson.xp_reward ?? 20,
          xp_threshold: lesson.xp_threshold ?? 0,
          order: lesson.order ?? 0,
          estimated_time: lesson.estimated_time ?? 10,
          image_url: lesson.image_url ?? null,
          file_url: lesson.file_url ?? null,
        }),
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
        description: 'Lesson content was saved successfully.',
      });

      if (data.lesson) {
        setLesson((prev) =>
          prev
            ? {
                ...prev,
                ...data.lesson,
              }
            : prev,
        );
      }
    } catch (err) {
      console.error('Error saving lesson from editor:', err);
      toast({
        title: 'Network error',
        description: 'Could not save lesson. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (
    loading ||
    !user ||
    !isAdmin ||
    loadingData ||
    !lesson
  ) {
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

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.name ||
    currentLanguage;

  const titleForCurrentLang = getLessonMLField(
    'title',
    currentLanguage,
  );
  const descForCurrentLang = getLessonMLField(
    'description',
    currentLanguage,
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto space-y-6">
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
                  Lesson Editor
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Advanced block editor for this lesson. Changes are
                  saved to the same HTML content used on the public site.
                </p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save lesson'}
              </Button>
            </div>

            {/* Linguagem */}
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

            {/* Layout principal: meta + editor */}
            <div className="grid lg:grid-cols-[2fr,3fr] gap-6">
              {/* Coluna esquerda: meta */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Lesson Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Title ({currentLangLabel})</Label>
                      <Input
                        className="mt-1"
                        value={titleForCurrentLang}
                        onChange={(e) =>
                          updateLessonMLField(
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
                        value={descForCurrentLang}
                        onChange={(e) =>
                          updateLessonMLField(
                            'description',
                            currentLanguage,
                            e.target.value,
                          )
                        }
                        placeholder="Short description of this lesson"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>XP reward (on completion)</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          value={lesson.xp_reward ?? 0}
                          onChange={(e) =>
                            updateLessonField(
                              'xp_reward',
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>XP threshold (min XP to unlock)</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          value={lesson.xp_threshold ?? 0}
                          onChange={(e) =>
                            updateLessonField(
                              'xp_threshold',
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Estimated time (minutes)</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          value={lesson.estimated_time ?? 0}
                          onChange={(e) =>
                            updateLessonField(
                              'estimated_time',
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>File URL (optional)</Label>
                        <Input
                          className="mt-1"
                          type="text"
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
                    </div>

                    <div>
                      <Label>Lesson image URL</Label>
                      <div className="flex gap-2 mt-1 items-center">
                        <Input
                          type="text"
                          value={lesson.image_url || ''}
                          onChange={(e) =>
                            updateLessonField(
                              'image_url',
                              e.target.value || null,
                            )
                          }
                          placeholder="https://..."
                        />
                        {lesson.image_url && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              window.open(
                                lesson.image_url || '',
                                '_blank',
                              )
                            }
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Coluna direita: BlockEditor */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Content blocks (all languages)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BlockEditor
                      value={blocksByLang}
                      onChange={setBlocksByLang}
                      initialLanguage={currentLanguage}
                    />
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
