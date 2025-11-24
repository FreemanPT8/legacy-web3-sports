'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Lock,
  BookOpen,
  Award,
  Eye,
} from 'lucide-react';
import {
  RichContentBuilder,
  type ContentBlock,
} from '@/components/admin/content/RichContentBuilder';

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

interface Lesson {
  id: string;
  order: number;
  titles: Record<LangCode, string>;
  descriptions: Record<LangCode, string>;
  contentBlocksByLang: Record<LangCode, ContentBlock[]>;
  duration_minutes: number;
  xp_reward: number;
  xp_threshold: number;
}

interface Module {
  id: string;
  order: number;
  titles: Record<LangCode, string>;
  descriptions: Record<LangCode, string>;
  lessons: Lesson[];
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      const d = block.data;
      switch (block.type) {
        case 'heading':
          return d.text ? `<h2>${d.text}</h2>` : '';
        case 'subheading':
          return d.text ? `<h3>${d.text}</h3>` : '';
        case 'paragraph':
          return d.text ? `<p>${d.text}</p>` : '';
        case 'image':
          if (!d.url) return '';
          return `<p><img src="${d.url}" alt="${d.alt || ''}" /></p>`;
        case 'video':
          if (!d.url) return '';
          return `<p><a href="${d.url}" target="_blank" rel="noopener noreferrer">Watch video</a></p>`;
        case 'button':
          if (!d.url) return '';
          return `<p><a href="${d.url}" class="btn-primary">${d.buttonLabel || 'Click'}</a></p>`;
        case 'divider':
          return '<hr />';
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
}

export default function CreateCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, getToken } = useAuth();

  const [saving, setSaving] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageCourses, setCanManageCourses] = useState(false);

  const [currentLanguage, setCurrentLanguage] = useState<LangCode>('en');

  const [course, setCourse] = useState({
    title: {
      en: '',
      pt: '',
      es: '',
      fr: '',
      it: '',
      de: '',
    } as Record<LangCode, string>,
    description: {
      en: '',
      pt: '',
      es: '',
      fr: '',
      it: '',
      de: '',
    } as Record<LangCode, string>,
    level: 'beginner',
    xp_threshold: 0,
    published: false,
  });

  const [modules, setModules] = useState<Module[]>([]);

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

  // Helpers para módulos e lições
  const addModule = () => {
    const baseTexts: Record<LangCode, string> = {
      en: '',
      pt: '',
      es: '',
      fr: '',
      it: '',
      de: '',
    };
    const newModule: Module = {
      id: createId(),
      order: modules.length + 1,
      titles: { ...baseTexts },
      descriptions: { ...baseTexts },
      lessons: [],
    };
    setModules((prev) => [...prev, newModule]);
  };

  const removeModule = (moduleId: string) => {
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  };

  const updateModuleTitle = (moduleId: string, value: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              titles: { ...m.titles, [currentLanguage]: value },
            }
          : m,
      ),
    );
  };

  const updateModuleDescription = (moduleId: string, value: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              descriptions: { ...m.descriptions, [currentLanguage]: value },
            }
          : m,
      ),
    );
  };

  const addLesson = (moduleId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;

        const baseText: Record<LangCode, string> = {
          en: '',
          pt: '',
          es: '',
          fr: '',
          it: '',
          de: '',
        };

        const baseBlocks: Record<LangCode, ContentBlock[]> = {
          en: [],
          pt: [],
          es: [],
          fr: [],
          it: [],
          de: [],
        };

        const newLesson: Lesson = {
          id: createId(),
          order: m.lessons.length + 1,
          titles: { ...baseText },
          descriptions: { ...baseText },
          contentBlocksByLang: { ...baseBlocks },
          duration_minutes: 10,
          xp_reward: 20,
          xp_threshold: 0,
        };

        return {
          ...m,
          lessons: [...m.lessons, newLesson],
        };
      }),
    );
  };

  const removeLesson = (moduleId: string, lessonId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.filter((l) => l.id !== lessonId),
        };
      }),
    );
  };

  const updateLessonField = (
    moduleId: string,
    lessonId: string,
    field:
      | 'titles'
      | 'descriptions'
      | 'duration_minutes'
      | 'xp_reward'
      | 'xp_threshold',
    value: any,
  ) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id !== lessonId) return l;

            if (field === 'titles') {
              return {
                ...l,
                titles: { ...l.titles, [currentLanguage]: value as string },
              };
            }

            if (field === 'descriptions') {
              return {
                ...l,
                descriptions: {
                  ...l.descriptions,
                  [currentLanguage]: value as string,
                },
              };
            }

            return {
              ...l,
              [field]: value,
            } as Lesson;
          }),
        };
      }),
    );
  };

  const updateLessonBlocks = (
    moduleId: string,
    lessonId: string,
    lang: LangCode,
    blocks: ContentBlock[],
  ) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            return {
              ...l,
              contentBlocksByLang: {
                ...l.contentBlocksByLang,
                [lang]: blocks,
              },
            };
          }),
        };
      }),
    );
  };

  // Estatísticas rápidas para o painel lateral
  const totalModules = modules.length;
  const totalLessons = modules.reduce(
    (acc, m) => acc + m.lessons.length,
    0,
  );
  const totalXP = modules.reduce(
    (acc, m) =>
      acc +
      m.lessons.reduce((accL, l) => accL + (l.xp_reward || 0), 0),
    0,
  );

  const handleSave = async () => {
    if (!user || !canManageCourses) {
      toast({
        title: 'Not allowed',
        description: 'You do not have permission to manage courses.',
        variant: 'destructive',
      });
      return;
    }

    if (!course.title.en.trim()) {
      toast({
        title: 'Missing title',
        description: 'Please add at least an English title for the course.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const token = getToken();

      // Converter blocos de cada lição em HTML por língua
      const modulesForApi = modules.map((m, moduleIndex) => ({
        order: m.order || moduleIndex + 1,
        titles: m.titles,
        descriptions: m.descriptions,
        lessons: m.lessons.map((l, lessonIndex) => {
          const content: Record<string, string> = {};
          for (const lang of LANGUAGES) {
            const code = lang.code as LangCode;
            const blocks = l.contentBlocksByLang[code] || [];
            content[code] = blocksToHtml(blocks);
          }
          return {
            order: l.order || lessonIndex + 1,
            titles: l.titles,
            descriptions: l.descriptions,
            content,
            xp_reward: l.xp_reward,
            xp_threshold: l.xp_threshold,
            estimated_time: l.duration_minutes,
          };
        }),
      }));

      const res = await fetch('/api/admin/courses/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          course: {
            title: course.title,
            description: course.description,
            level: course.level,
            xp_threshold: course.xp_threshold,
            published: course.published,
          },
          modules: modulesForApi,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Error saving course',
          description: data.error || 'Failed to create course.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      router.push('/admin/courses');
    } catch (err) {
      console.error('Failed to save course:', err);
      toast({
        title: 'Network error',
        description: 'Could not save course. Please try again.',
        variant: 'destructive',
      });
    }
    setSaving(false);
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

  if (!canManageCourses) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <Lock className="h-10 w-10 text-amber-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">No permission</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You don&apos;t have permission to create or edit courses. Please
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

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.name ||
    currentLanguage;

  const previewTitle =
    course.title[currentLanguage] ||
    course.title.en ||
    'Untitled course';
  const previewDescription =
    course.description[currentLanguage] ||
    course.description.en ||
    '';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <Link href="/admin/courses">
                  <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Courses
                  </Button>
                </Link>
                <h1 className="text-3xl font-bold">Create New Course</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Design a complete learning journey with modules, lessons and
                  XP-based progression.
                </p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Course'}
              </Button>
            </div>

            {/* Layout em 2 colunas: Builder + Painel Lateral */}
            <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
              {/* Coluna esquerda: Builder */}
              <div className="space-y-6">
                {/* COURSE INFO */}
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
                            setCourse((prev) => ({
                              ...prev,
                              title: {
                                ...prev.title,
                                [currentLanguage]: e.target.value,
                              },
                            }))
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
                            setCourse((prev) => ({
                              ...prev,
                              description: {
                                ...prev.description,
                                [currentLanguage]: e.target.value,
                              },
                            }))
                          }
                          placeholder="Enter course description"
                          rows={4}
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
                            setCourse((prev) => ({ ...prev, level: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">
                              Intermediate
                            </SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>XP Required to Unlock (course)</Label>
                        <Input
                          type="number"
                          value={course.xp_threshold}
                          onChange={(e) =>
                            setCourse((prev) => ({
                              ...prev,
                              xp_threshold: parseInt(e.target.value) || 0,
                            }))
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
                          setCourse((prev) => ({
                            ...prev,
                            published: checked,
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* MODULES & LESSONS */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Course Structure</CardTitle>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Build modules and lessons. Each lesson can have rich
                          content, XP rewards and XP thresholds.
                        </p>
                      </div>
                      <Button onClick={addModule} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Module
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {modules.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No modules yet. Click &quot;Add Module&quot; to start
                        designing the journey.
                      </div>
                    ) : (
                      modules.map((module, moduleIndex) => (
                        <Card
                          key={module.id}
                          className="border-2 border-blue-100 bg-white"
                        >
                          <CardHeader className="bg-blue-50/60">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-blue-700 mb-1">
                                  Module {moduleIndex + 1}
                                </p>
                                <Input
                                  value={module.titles[currentLanguage]}
                                  onChange={(e) =>
                                    updateModuleTitle(
                                      module.id,
                                      e.target.value,
                                    )
                                  }
                                  placeholder={`Module title (${currentLangLabel})`}
                                  className="text-sm font-semibold"
                                />
                              </div>
                              <div className="flex gap-2 items-center">
                                <Button
                                  onClick={() => addLesson(module.id)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Lesson
                                </Button>
                                <Button
                                  onClick={() => removeModule(module.id)}
                                  size="sm"
                                  variant="destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3">
                              <Textarea
                                value={module.descriptions[currentLanguage]}
                                onChange={(e) =>
                                  updateModuleDescription(
                                    module.id,
                                    e.target.value,
                                  )
                                }
                                placeholder={`Module description (${currentLangLabel})`}
                                rows={2}
                                className="text-xs"
                              />
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4 space-y-3">
                            {module.lessons.length === 0 ? (
                              <div className="text-xs text-gray-500 border border-dashed rounded-lg p-3 text-center">
                                No lessons in this module yet. Add your first
                                lesson.
                              </div>
                            ) : (
                              module.lessons.map((lesson, lessonIndex) => (
                                <Card
                                  key={lesson.id}
                                  className="bg-blue-50/60 border-blue-100"
                                >
                                  <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-xs text-blue-700 mb-1">
                                          Lesson {lessonIndex + 1}
                                        </p>
                                        <Input
                                          value={lesson.titles[currentLanguage]}
                                          onChange={(e) =>
                                            updateLessonField(
                                              module.id,
                                              lesson.id,
                                              'titles',
                                              e.target.value,
                                            )
                                          }
                                          placeholder={`Lesson title (${currentLangLabel})`}
                                          className="text-sm font-medium"
                                        />
                                      </div>
                                      <Button
                                        onClick={() =>
                                          removeLesson(module.id, lesson.id)
                                        }
                                        size="sm"
                                        variant="ghost"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    <div>
                                      <Label className="text-xs">
                                        Lesson Short Description (
                                        {currentLangLabel})
                                      </Label>
                                      <Textarea
                                        value={
                                          lesson.descriptions[currentLanguage]
                                        }
                                        onChange={(e) =>
                                          updateLessonField(
                                            module.id,
                                            lesson.id,
                                            'descriptions',
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Short description"
                                        rows={2}
                                        className="text-xs"
                                      />
                                    </div>

                                    <div>
                                      <Label className="text-xs">
                                        Lesson Content ({currentLangLabel})
                                      </Label>
                                      <RichContentBuilder
                                        blocks={
                                          lesson.contentBlocksByLang[
                                            currentLanguage
                                          ] || []
                                        }
                                        onChange={(blocks) =>
                                          updateLessonBlocks(
                                            module.id,
                                            lesson.id,
                                            currentLanguage,
                                            blocks,
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <Label className="text-xs">
                                          Duration (minutes)
                                        </Label>
                                        <Input
                                          type="number"
                                          value={lesson.duration_minutes}
                                          onChange={(e) =>
                                            updateLessonField(
                                              module.id,
                                              lesson.id,
                                              'duration_minutes',
                                              parseInt(e.target.value) || 0,
                                            )
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">
                                          XP Reward
                                        </Label>
                                        <Input
                                          type="number"
                                          value={lesson.xp_reward}
                                          onChange={(e) =>
                                            updateLessonField(
                                              module.id,
                                              lesson.id,
                                              'xp_reward',
                                              parseInt(e.target.value) || 0,
                                            )
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">
                                          XP Required to Unlock (lesson)
                                        </Label>
                                        <Input
                                          type="number"
                                          value={lesson.xp_threshold}
                                          onChange={(e) =>
                                            updateLessonField(
                                              module.id,
                                              lesson.id,
                                              'xp_threshold',
                                              parseInt(e.target.value) || 0,
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Coluna direita: Summary + Preview */}
              <div className="space-y-4">
                {/* Course Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Course Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                          Modules
                        </span>
                        <span className="font-semibold">
                          {totalModules}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                          Lessons
                        </span>
                        <span className="font-semibold">
                          {totalLessons}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-blue-600" />
                          Total XP Available
                        </span>
                        <span className="font-semibold">{totalXP}</span>
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Level</span>
                        <Badge variant="outline" className="capitalize">
                          {course.level}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Course XP Threshold</span>
                        <Badge variant="outline">
                          {course.xp_threshold} XP
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status</span>
                        <Badge
                          className={
                            course.published ? 'bg-green-600' : 'bg-yellow-600'
                          }
                        >
                          {course.published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Live Preview simples */}
                <Card className="border-blue-200">
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-600" />
                      Course Preview
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {currentLangLabel}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        Title
                      </div>
                      <div className="font-semibold">
                        {previewTitle || 'Untitled course'}
                      </div>
                    </div>
                    {previewDescription && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Description
                        </div>
                        <p className="text-gray-700 dark:text-gray-200 line-clamp-4">
                          {previewDescription}
                        </p>
                      </div>
                    )}

                    <div className="border-t pt-3 space-y-2">
                      <div className="text-xs text-gray-500 mb-1">
                        Structure preview
                      </div>
                      {modules.length === 0 ? (
                        <p className="text-xs text-gray-400">
                          No modules yet.
                        </p>
                      ) : (
                        <ul className="space-y-1 max-h-48 overflow-y-auto text-xs">
                          {modules.map((m, i) => (
                            <li key={m.id}>
                              <span className="font-semibold">
                                {i + 1}.{' '}
                                {m.titles[currentLanguage] ||
                                  m.titles.en ||
                                  'Untitled module'}
                              </span>
                              {m.lessons.length > 0 && (
                                <ul className="ml-4 list-disc">
                                  {m.lessons.map((l) => (
                                    <li key={l.id}>
                                      {l.titles[currentLanguage] ||
                                        l.titles.en ||
                                        'Untitled lesson'}{' '}
                                      <span className="text-[10px] text-gray-500">
                                        • {l.xp_reward} XP
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
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
