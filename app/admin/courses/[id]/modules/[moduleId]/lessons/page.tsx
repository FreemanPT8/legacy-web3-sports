'use client';



import { useEffect, useState } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';

import { useToast } from '@/hooks/use-toast';

import { LegacyModuleNotice } from '@/components/admin/LegacyModuleNotice';



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

import { RichTextEditor } from '@/components/editor/RichTextEditor';



import {

  Plus,

  Save,

  Trash2,

  LayoutTemplate,

  Eye,

  Lock,

} from 'lucide-react';



import { getMultilingualContent } from '@/lib/i18n';
import { LANGUAGES, type LangCode } from '@/types/builder';



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



type PermissionsResponse = {

  success: boolean;

  permissions?: {

    canManageCourses?: boolean;

  };

  error?: string;

};



export default function ModuleLessonsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const legacyMode = searchParams.get('legacy') === '1';
  const courseId = params?.id ? (params.id as string) : '';
  const moduleId = params?.moduleId ? (params.moduleId as string) : '';

  if (!legacyMode) {
    return (
      <LegacyModuleNotice
        courseId={courseId}
        legacyHref={
          courseId && moduleId
            ? `/admin/courses/${courseId}/modules/${moduleId}/lessons?legacy=1`
            : undefined
        }
        description="Editor legado de modulos/lessons. Usa o Course Builder para gerir o curriculum principal."
      />
    );
  }

  return <LegacyModuleLessonsLegacyView />;
}

function LegacyModuleLessonsLegacyView() {
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

  const [recentImages, setRecentImages] = useState<string[]>([]);



  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const [canManageCourses, setCanManageCourses] = useState(false);



  const RECENT_IMAGES_KEY = 'lessons_recent_images';



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



  // Prote+o+uo b+isica por role

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



  // Carregar permiss+Aes finas (canManageCourses)

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



  // Cache de imagens recentes (localStorage)

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

      console.warn('Could not load recent lesson images cache', err);

    }

  }, []);



  const persistRecentImages = (list: string[]) => {

    setRecentImages(list);

    if (typeof window !== 'undefined') {

      try {

        localStorage.setItem(RECENT_IMAGES_KEY, JSON.stringify(list));

      } catch (err) {

        console.warn('Could not persist recent lesson images cache', err);

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



  // Carregar curso, m+dulo e li+o+Aes

  useEffect(() => {

    const fetchData = async () => {

      setLoadingData(true);

      try {

        const token = getToken();



        // 1) Carregar curso + m+dulos

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



        // 2) Carregar li+o+Aes do m+dulo

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



  // Helpers multi-l+ngua

  function updateLessonMLField(

    index: number,

    field: 'title' | 'description' | 'content',

    lang: LangCode,

    value: string,

  ) {

    if (!canManageCourses) return;

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

    if (!canManageCourses) return;

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

    if (!canManageCourses) {

      toast({

        title: 'No permission',

        description: 'You do not have permission to create or edit lessons.',

        variant: 'destructive',

      });

      return;

    }



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

    if (!canManageCourses) {

      toast({

        title: 'No permission',

        description: 'You do not have permission to delete lessons.',

        variant: 'destructive',

      });

      return;

    }



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

    if (!canManageCourses) {

      toast({

        title: 'No permission',

        description: 'You do not have permission to save lessons.',

        variant: 'destructive',

      });

      return;

    }



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

        // Criar nova li+o+uo

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

        // Atualizar li+o+uo existente

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
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-300" />
          <p className="mt-4 text-slate-300">Loading lessons...</p>
        </div>
      </div>
    );
  }

  if (!course || !module) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white">
        <p className="text-slate-300">Course or module not found.</p>
      </div>
    );
  }


  const courseTitle = getMultilingualContent(course.title, currentLanguage);

  const moduleTitle = getMultilingualContent(module.title, currentLanguage);



  return (

    <div className="min-h-screen bg-[#000c12] px-4 py-8 text-white">

      <div className="container mx-auto px-4">

        <div className="max-w-6xl mx-auto space-y-6">

          {/* Top bar */}

          <div className="flex justify-between items-center gap-4">

            <div>

              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                LEGACY ADMIN - LESSONS
              </p>

              <h1 className="text-3xl font-semibold text-white md:text-4xl mt-2">

                Manage Lessons

              </h1>

              <p className="text-sm text-slate-300">
                Course{' '}
                <span className="font-semibold text-white">
                  {courseTitle || 'Untitled course'}
                </span>{' '}
                / Module{' '}
                <span className="font-semibold text-white">
                  {moduleTitle || 'Untitled module'}
                </span>
              </p>

              <div className="flex flex-wrap gap-2 mt-2 text-xs">

                <Badge
                  className={
                    course.is_completed
                      ? 'border border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
                      : 'border border-amber-400/50 bg-amber-500/10 text-amber-100'
                  }
                >
                  {course.is_completed ? 'Completed' : 'Ongoing process'}
                </Badge>

                {typeof course.xp_total_distributed === 'number' && (
                  <Badge className="border border-white/20 bg-transparent text-white">
                    Total XP distributed: {course.xp_total_distributed}
                  </Badge>
                )}
                {typeof course.xp_creator_distributed === 'number' && (
                  <Badge className="border border-white/20 bg-transparent text-white">
                    XP to creator: {course.xp_creator_distributed}
                  </Badge>
                )}
                {course.author_name && (
                  <Badge className="border border-white/20 bg-transparent text-white">
                    Creator: {course.author_name}
                  </Badge>
                )}

                {permissionsLoaded && !canManageCourses && (
                  <span className="flex items-center gap-1 text-[11px] text-amber-300">
                    <Lock className="h-3 w-3" />
                    View only / no permission to edit lessons
                  </span>
                )}

              </div>

            </div>

            <div className="flex items-center gap-2">

              <div className="hidden sm:flex rounded-md border border-white/10 bg-[#041923] p-1">

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

              <Button onClick={handleAddLesson} disabled={!canManageCourses}>

                <Plus className="h-4 w-4 mr-2" />

                Add Lesson

              </Button>

            </div>

          </div>



          {/* ACTION PANEL */}

          <Card className="border border-white/10 bg-[#05212b] shadow-2xl shadow-black/40">

            <CardHeader className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border border-cyan-400/40 bg-cyan-400/10 text-cyan-200">
                  Editorial Flow
                </Badge>
                <CardTitle className="text-lg text-white">
                  Construa licoes com foco em XP e comunidade
                </CardTitle>
              </div>
              <p className="text-sm text-slate-300 max-w-3xl">
                Cria e valida as licoes do modulo mantendo alinhamento com os
                resultados de XP, tempo medio e revisao.
              </p>

            </CardHeader>

            <CardContent className="pt-2">

              <div className="flex flex-col gap-3 md:flex-row">

                <Button

                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"

                  disabled={!canManageCourses}

                  onClick={handleAddLesson}

                >

                  <Plus className="h-4 w-4 mr-2" />

                  Adicionar lesson

                </Button>

                <Button

                  className="flex-1 border border-slate-700 bg-slate-950/60 text-slate-100 hover:bg-slate-900 disabled:opacity-60"

                  disabled={!canManageCourses || lessons.length === 0}

                  onClick={() => {

                    if (!lessons.length) return;

                    router.push(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessons[0].id ?? 'new'}`);

                  }}

                >

                  <Eye className="h-4 w-4 mr-2" />

                  Revisar li+o+uo salva

                </Button>

                <Button

                  className="flex-1 border border-blue-600 text-blue-100 bg-blue-950/50 hover:bg-blue-900"

                  disabled={!canManageCourses || lessons.length === 0}

                  onClick={() => {

                    const lesson = lessons.find((l) => l.id);

                    if (!lesson) return;

                    window.open(`/education/lessons/${lesson.id}`, '_blank');

                  }}

                >

                  <LayoutTemplate className="h-4 w-4 mr-2" />

                  Abrir preview

                </Button>

              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3 text-xs">

                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-100">

                  <p className="font-semibold uppercase tracking-wide text-[11px]">

                    XP meta

                  </p>

                  <p className="text-sm font-bold mt-1">

                    {lessons.reduce((sum, lesson) => sum + (lesson.xp_reward || 0), 0)} XP total

                  </p>

                  <p className="text-muted-custom text-[11px]">

                    Ajusta os rewards para refletirem o tempo e complexidade.

                  </p>

                </div>

                <div className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-purple-100">

                  <p className="font-semibold uppercase tracking-wide text-[11px]">

                    Tempo m+dio

                  </p>

                  <p className="text-sm font-bold mt-1">

                    {Math.round(

                      lessons.reduce(

                        (sum, lesson) => sum + (lesson.estimated_time || 0),

                        0,

                      ) / Math.max(1, lessons.length),

                    )}{' '}

                    min

                  </p>

                  <p className="text-muted-custom text-[11px]">

                    Ostras humanas mant+m o ritmo coerente? Ajuste.

                  </p>

                </div>

                <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-blue-100">

                  <p className="font-semibold uppercase tracking-wide text-[11px]">

                    Comunidade

                  </p>

                  <p className="text-sm font-bold mt-1">

                    {lessons.length} li+o+Aes em revis+uo

                  </p>

                  <p className="text-muted-custom text-[11px]">

                    Publica+o+Aes completas nascem de li+o+Aes bem estruturadas. Continue adicionando imagens & atividades.

                  </p>

                </div>

              </div>

            </CardContent>

          </Card>



          {/* Selector de l+ngua */}

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



          <Card>

            <CardHeader>

              <CardTitle className="text-sm">

                SEO & legibilidade (ajuda r+ipida)

              </CardTitle>

            </CardHeader>

            <CardContent className="text-sm text-slate-200 space-y-2">

              <div className="grid md:grid-cols-3 gap-3 text-xs">

                <div className="border rounded p-2 bg-[#05212b]">

                  <div className="font-semibold">T+tulo</div>

                  <div>Ideal 50-60 caracteres, claro e sem jarg+uo.</div>

                </div>

                <div className="border rounded p-2 bg-[#05212b]">

                  <div className="font-semibold">Descri+o+uo</div>

                  <div>Objetiva: 140-180 caracteres a resumir a li+o+uo.</div>

                </div>

                <div className="border rounded p-2 bg-[#05212b]">

                  <div className="font-semibold">Imagem</div>

                  <div>16:9, OeN1200x675 (webp/jpg) + alt descritivo.</div>

                </div>

              </div>

              <ul className="list-disc list-inside space-y-1 text-xs">

                <li>Usa a palavra-chave no t+tulo e no primeiro par+igrafo.</li>

                <li>

                  Inclui 1 link interno para um curso/m+dulo/lesson relacionado.

                </li>

                <li>Mant+m XP/threshold coerente com a dura+o+uo e dificuldade.</li>

              </ul>

              <p className="text-[11px] text-slate-400">

                Dicas n+uo bloqueiam publica+o+uo; s+uo s+ lembretes r+ipidos.

              </p>

            </CardContent>

          </Card>



          {/* Lista de li+o+Aes */}

          {lessons.length === 0 ? (

            <Card>

              <CardContent className="py-10 text-center text-slate-400">

                No lessons yet. Click &quot;Add Lesson&quot; to create the first one.

              </CardContent>

            </Card>

          ) : (

            <div className="space-y-4">

              {lessons.map((lesson, index) => {

                const title = getMultilingualContent(

                  lesson.title,

                  currentLanguage,

                );

                const description = getMultilingualContent(

                  lesson.description,

                  currentLanguage,

                );

                const content = getMultilingualContent(

                  lesson.content,

                  currentLanguage,

                );



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

                  <Card

                    key={lesson.id || `new-${index}`}

                    className="border border-white/10 bg-[#05212b]"

                  >

                    <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

                      <div className="flex-1">

                        <div className="flex items-center gap-2 mb-1">

                          <Badge variant="outline">

                            Lesson {lesson.order || index + 1}

                          </Badge>

                          {lesson._isNew && (

                            <Badge className="bg-yellow-600">New</Badge>

                          )}

                        </div>

                        <Input

                          value={title}

                          onChange={(e) =>

                            updateLessonMLField(

                              index,

                              'title',

                              currentLanguage,

                              e.target.value,

                            )

                          }

                          placeholder={`Lesson title (${currentLangLabel})`}

                          className="text-sm font-semibold"

                          disabled={!canManageCourses}

                        />

                        <div className="text-[11px] text-slate-400 mt-1">

                          {titleLength} chars / description {descriptionLength}{' '}

                          chars

                        </div>

                        <p className="text-xs text-slate-400 mt-1">

                          {lesson.estimated_time || 0} minutes - XP:{' '}

                          {lesson.xp_reward || 0}

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

                          disabled={!canManageCourses}

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

                            disabled={!canManageCourses}

                          />

                        </div>

                        <div>

                          <Label className="text-xs">

                            Content HTML ({currentLangLabel})

                          </Label>

                          <RichTextEditor

                            value={content}

                            onChange={(next) =>

                              updateLessonMLField(

                                index,

                                'content',

                                currentLanguage,

                                next,

                              )

                            }

                            placeholder="Write the lesson content with headings, lists, embeds, and links."

                            minRows={10}

                            className="mt-1 text-xs"

                          />

                        </div>

                      </div>



                      <div

                        className={`border rounded-lg p-4 bg-[#05212b] space-y-3 ${previewContainer}`}

                      >

                        <div className="flex items-center justify-between text-xs text-slate-400">

                          <span>Preview ({previewMode})</span>

                          <span>

                            {previewMode === 'mobile'

                              ? 'Mobile width'

                              : 'Desktop width'}

                          </span>

                        </div>

                        <div className="space-y-1">

                          <p className="text-sm font-semibold">

                            {title || 'Untitled lesson'}

                          </p>

                          <p

                            className={`text-slate-200 ${previewText}`}

                          >

                            {description || 'No description yet.'}

                          </p>

                        </div>

                        <div

                          className="prose prose-invert prose-sm text-slate-200 max-w-none [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1"

                          dangerouslySetInnerHTML={{

                            __html: content?.trim()

                              ? content

                              : '<p class=\"text-slate-400 italic\">Write some content to preview it here.</p>',

                          }}

                        />

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

                            disabled={!canManageCourses}

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

                            disabled={!canManageCourses}

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

                            disabled={!canManageCourses}

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

                            className={`mt-1 ${

                              fileUrlInvalid ? 'border-red-400' : ''

                            }`}

                            disabled={!canManageCourses}

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

                            className={`mt-1 ${

                              imageUrlInvalid ? 'border-red-400' : ''

                            }`}

                            onBlur={() => addRecentImage(lesson.image_url || '')}

                            disabled={!canManageCourses}

                          />

                          {imageUrlInvalid && (

                            <p className="text-[11px] text-red-600 mt-1">

                              Insere um URL valido (http/https).

                            </p>

                          )}

                          <p className="text-[11px] text-slate-400 mt-1">

                            Sugest+uo: 16:9, m+nimo 1200x675, formatos webp/jpg.

                          </p>

                          {recentImages.length > 0 && (

                            <div className="flex flex-wrap gap-2 mt-2">

                              {recentImages.map((url) => (

                                <Button

                                  key={url}

                                  type="button"

                                  size="sm"

                                  variant="outline"

                                  onClick={() =>

                                    canManageCourses &&

                                    updateLessonField(index, 'image_url', url)

                                  }

                                  disabled={!canManageCourses}

                                >

                                  Usar imagem recente

                                </Button>

                              ))}

                            </div>

                          )}

                          {lesson.image_url && !imageUrlInvalid && (

                            <div className="mt-2 border rounded-md p-2 bg-[#05212b]">

                              <div className="text-[11px] text-slate-400 mb-1">

                                Preview

                              </div>

                              <img

                                src={lesson.image_url}

                                alt="Lesson cover preview"

                                className="w-full h-32 object-cover rounded"

                                onError={(e) => {

                                  (e.currentTarget as HTMLImageElement).style.display =

                                    'none';

                                }}

                              />

                            </div>

                          )}

                        </div>

                      </div>



                      <div className="flex justify-between gap-2 pt-2 border-t">

                        <div className="text-xs text-slate-400">

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

                              if (!canManageCourses) {

                                toast({

                                  title: 'No permission',

                                  description:

                                    'You do not have permission to edit lessons.',

                                  variant: 'destructive',

                                });

                                return;

                              }

                              router.push(

                                `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`,

                              );

                            }}

                            disabled={!canManageCourses}

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

                            disabled={!canManageCourses}

                          >

                            <Trash2 className="h-4 w-4 mr-1" />

                            Delete

                          </Button>

                          <Button

                            size="sm"

                            onClick={() => handleSaveLesson(lesson, index)}

                            disabled={!!savingLessonId || !canManageCourses}

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
