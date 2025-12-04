'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  Save,
  Lock,
  Award,
  BookOpen,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';

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
  { code: 'pt', name: 'Portuguese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'it', name: 'Italian' },
  { code: 'de', name: 'German' },
] as const;

type LangCode = (typeof LANGUAGES)[number]['code'];

export default function CreateCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, getToken } = useAuth();

  const [saving, setSaving] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageCourses, setCanManageCourses] = useState(false);
  const [recentImages, setRecentImages] = useState<string[]>([]);

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
    xp_reward_on_complete: 0,
    image_url: '',
    published: false,
    is_completed: false,
  });
  const isValidUrl = (value: string) => {
    if (!value.trim()) return true;
    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };
  const hasImage = !!course.image_url && course.image_url.trim().length > 0;
  const imageUrlError =
    hasImage && !isValidUrl(course.image_url)
      ? 'Insere um URL valido (http/https).'
      : '';

  const RECENT_IMAGES_KEY = 'course_recent_images';

  // cache simples de imagens recentes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(RECENT_IMAGES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecentImages(parsed.filter((u) => typeof u === 'string'));
      }
    } catch (err) {
      console.warn('Could not load recent images cache', err);
    }
  }, []);

  const persistRecentImages = (list: string[]) => {
    setRecentImages(list);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(RECENT_IMAGES_KEY, JSON.stringify(list));
      } catch (err) {
        console.warn('Could not persist recent images cache', err);
      }
    }
  };

  const addRecentImage = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || !isValidUrl(trimmed)) return;
    const next = [trimmed, ...recentImages.filter((i) => i !== trimmed)].slice(
      0,
      5,
    );
    persistRecentImages(next);
  };
  // Proteção básica: só Admin / Super Admin
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

  const handleSave = async () => {
    if (!user || !canManageCourses) {
      toast({
        title: 'Not allowed',
        description: 'You do not have permission to manage courses.',
        variant: 'destructive',
      });
      return;
    }

    // Pelo menos um título em QUALQUER língua
    const hasAnyTitle = Object.values(course.title).some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );

    if (!hasAnyTitle) {
      toast({
        title: 'Missing title',
        description:
          'Please add a title in at least one language. You can translate to the other languages later.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const token = getToken();

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
            xp_reward_on_complete: course.xp_reward_on_complete,
            image_url: course.image_url || null,
            published: course.published,
          },
          modules: [],
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

      const createdCourse = data.course;

      toast({
        title: 'Course created',
        description: 'You can now add modules and lessons to this course.',
      });

      // Ir diretamente para gestão de módulos
      router.push(`/admin/courses/${createdCourse.id}/modules`);
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
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <Lock className="h-10 w-10 text-amber-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">No permission</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You don&apos;t have permission to create or edit courses. Please
              contact a Super Admin if you think this is a mistake.
            </p>
          </div>
        </main>
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
  const currentTitle =
    (course.title[currentLanguage] || course.title.en || '').trim();
  const currentDescription =
    (course.description[currentLanguage] || course.description.en || '').trim();
  const titleLength = currentTitle.length;
  const descriptionLength = currentDescription.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Create New Course</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Start by defining the core information of the course. You&apos;ll add modules and lessons afterwards.
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

          {/* Layout em 2 colunas: meta + preview */}
          <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
            {/* Coluna esquerda: meta do curso */}
            <div className="space-y-6">
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
                        variant={currentLanguage === lang.code ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setCurrentLanguage(lang.code as LangCode)}
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
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>XP Required to Unlock</Label>
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

                  {/* Imagem + XP extra */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Course image URL</Label>
                      <div className="flex gap-2 items-center mt-1">
                        <Input
                          type="text"
                          value={course.image_url}
                          onChange={(e) =>
                            setCourse((prev) => ({
                              ...prev,
                              image_url: e.target.value,
                            }))
                          }
                          onBlur={(e) => addRecentImage(e.target.value)}
                          placeholder="https://..."
                          className={imageUrlError ? 'border-red-400' : undefined}
                        />
                        {course.image_url && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => window.open(course.image_url, '_blank')}
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {imageUrlError && (
                        <p className="text-[11px] text-red-600 mt-1">
                          {imageUrlError}
                        </p>
                      )}
                      {!imageUrlError && hasImage && (
                        <div className="mt-2 rounded-md border bg-white p-2">
                          <div className="text-[11px] text-gray-500 mb-1">
                            Thumbnail preview
                          </div>
                          <img
                            src={course.image_url}
                            alt="Course cover preview"
                            className="h-32 w-full object-cover rounded"
                            loading="lazy"
                          />
                        </div>
                      )}
                      {recentImages.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-[11px] text-gray-500">
                            Recent images
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {recentImages.map((url) => (
                              <button
                                key={url}
                                type="button"
                                onClick={() =>
                                  setCourse((prev) => ({
                                    ...prev,
                                    image_url: url,
                                  }))
                                }
                                className="w-20 h-14 rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <img
                                  src={url}
                                  alt="Recent cover"
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                    <div>
                      <Label>XP reward (on course completion)</Label>
                      <Input
                        type="number"
                        value={course.xp_reward_on_complete}
                        onChange={(e) =>
                          setCourse((prev) => ({
                            ...prev,
                            xp_reward_on_complete: parseInt(e.target.value) || 0,
                          }))
                        }
                        min={0}
                        placeholder="0"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Users will earn this XP once they complete all required content for this course.
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 border-t pt-4">
                    <div className="flex items-center justify-between">
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
                    <div className="flex items-center justify-between">
                      <Label>Completed</Label>
                      <Switch
                        checked={course.is_completed}
                        onCheckedChange={(checked) =>
                          setCourse((prev) => ({
                            ...prev,
                            is_completed: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coluna direita: Summary + Preview */}
            <div className="space-y-4">
              {/* Course Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Course Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        Modules
                      </span>
                      <span className="font-semibold">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        Lessons
                      </span>
                      <span className="font-semibold">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-blue-600" />
                        Total XP Available
                      </span>
                      <span className="font-semibold">0</span>
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
                      <Badge variant="outline">{course.xp_threshold} XP</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <Badge className={course.published ? 'bg-green-600' : 'bg-yellow-600'}>
                        {course.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Completion</span>
                      <Badge className={course.is_completed ? 'bg-green-600' : 'bg-yellow-600'}>
                        {course.is_completed ? 'Completed' : 'Ongoing process'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SEO helper */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">SEO helper</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Title length</span>
                    <Badge variant="outline">{titleLength} chars</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Description length</span>
                    <Badge variant="outline">
                      {descriptionLength} chars
                    </Badge>
                  </div>
                  <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-300 space-y-1">
                    <li>Use a clear benefit in the title.</li>
                    <li>Add a concise summary (150–160 chars) for search/social.</li>
                    <li>Include 1–2 relevant keywords naturally.</li>
                    <li>Add a good cover image with alt text on publish.</li>
                  </ul>
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
                    <div className="text-xs text-gray-500 mb-1">Title</div>
                    <div className="font-semibold">
                      {previewTitle || 'Untitled course'}
                    </div>
                  </div>
                  {previewDescription && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Description</div>
                      <p className="text-gray-700 dark:text-gray-200 line-clamp-4">
                        {previewDescription}
                      </p>
                    </div>
                  )}
                  <div className="border-t pt-3 space-y-2">
                    <div className="text-xs text-gray-500 mb-1">
                      Structure preview
                    </div>
                    <p className="text-xs text-gray-400">
                      You will add modules and lessons after creating the course.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
