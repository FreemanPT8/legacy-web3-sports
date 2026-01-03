'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

import { getMultilingualContent } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { CourseHubV2 } from '@/components/education/CourseHubV2';
import { LevelTimeline, type ProgressFetchState } from '@/components/education/LevelTimeline';
import { LevelSections } from '@/components/education/LevelSections';
import { NextUnlockCTA } from '@/components/education/NextUnlockCTA';

import {
  HeroContent,
  HeroDescription,
  HeroEyebrow,
  HeroSection,
  HeroTextColumn,
  HeroTitle,
} from '@/components/sections/HeroSection';

import type { ProgressSummary } from '@/lib/education/progressSummary';
import { buildFallbackProgressSummary } from '@/lib/education/fallbackSummary';

import {
  getLevelTranslation,
  resolveLevelSlugFromCourse,
  type LevelLanguage,
} from '@/lib/education/xpLevels';

import { START_HERE_FALLBACK_ID, START_HERE_SLUG } from '@/lib/education/unlockLogic';

import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle,
  Info,
  Lock,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
} from 'lucide-react';

type Lesson = {
  id: string;
  xp_reward: number;
  xpReward?: number | null;
};

type Module = {
  id: string;
  lessons?: Lesson[];
  xp_reward?: number | null;
  xpReward?: number | null;
  metadata?: { xpReward?: number };
};

type Course = {
  id: string;
  title: any;
  description: any;
  slug?: string | null;
  level?: string | null;
  academy_level_slug?: string | null;
  academyLevelSlug?: string | null;
  xp_threshold: number;
  xpThreshold?: number | null;
  xp_reward?: number | null;
  xp_reward_on_complete?: number | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  modules?: Module[];
  curriculum?: {
    metadata?: {
      xpReward?: number;
      academyLevelSlug?: string | null;
      xpThreshold?: number | null;
    };
  };
  isCreator?: boolean;
  total_modules?: number;
  total_lessons?: number;
  completions_count?: number;
};

const USE_COURSE_HUB_V2 = process.env.NEXT_PUBLIC_EDU_COURSE_HUB_V2 === 'true';

/** ---------- UI Tokens (99: menos ruído, mais hierarquia) ---------- */
const UI = {
  eyebrow: 'text-xs uppercase tracking-[0.55em] text-cyan-300',
  heroTitle: 'leading-[1.05] font-bold tracking-tight text-[#fdd87c] text-4xl md:text-6xl',
  sectionTitle: 'text-2xl md:text-3xl font-bold tracking-tight text-[#fdd87c]',
  sectionSubtitle: 'mt-3 text-sm text-slate-200 leading-relaxed',
  body: 'text-sm text-slate-200 leading-relaxed',
  bodyMuted: 'text-sm text-slate-300 leading-relaxed',
  micro: 'text-xs text-slate-300',

  panel:
    'relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] shadow-[0_25px_60px_rgba(2,10,20,0.65)]',
  cardSurface: 'rounded-2xl border border-white/10 bg-[#04131b]/80 backdrop-blur',
  haloCyan: 'absolute -top-20 -right-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl',
  haloGold: 'absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-[#fdd87c]/10 blur-3xl',

  ctaPrimary:
    'bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]',
  ctaOutline: 'border-white/40 text-white hover:bg-white/10',

  input:
    'h-11 w-full rounded-2xl border border-white/15 bg-[#000c12]/60 px-4 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40',

  chip:
    'inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#000c12]/60 px-4 py-2 text-sm text-slate-200',

  modePill:
    'inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#000c12]/40 p-1',
  modeBtn:
    'flex-1 rounded-xl px-4 py-2 text-sm transition',
};

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const clamp0 = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

const getModuleBonusXP = (module: Module) => {
  if (typeof module?.xp_reward === 'number') return module.xp_reward;
  if (typeof module?.xpReward === 'number') return module.xpReward;
  if (typeof module?.metadata?.xpReward === 'number') return module.metadata.xpReward;
  return 0;
};

const getCourseCompletionBonus = (course: Course) => {
  if (typeof course?.xp_reward === 'number') return course.xp_reward;
  if (typeof course?.xp_reward_on_complete === 'number') return course.xp_reward_on_complete;
  if (typeof course?.curriculum?.metadata?.xpReward === 'number') return course.curriculum.metadata.xpReward;
  return 0;
};

const getLessonReward = (lesson: Lesson) => {
  if (typeof lesson?.xp_reward === 'number') return lesson.xp_reward;
  if (typeof lesson?.xpReward === 'number') return lesson.xpReward;
  return 0;
};

const formatTotalXP = (course: Course, modules: Module[]) => {
  const lessonsXP = modules.reduce((acc, module) => {
    if (!Array.isArray(module.lessons)) return acc;
    return acc + module.lessons.reduce((sum, lesson) => sum + getLessonReward(lesson), 0);
  }, 0);

  const moduleBonusXP = modules.reduce((acc, module) => acc + getModuleBonusXP(module), 0);
  const courseBonusXP = getCourseCompletionBonus(course);

  return lessonsXP + moduleBonusXP + courseBonusXP;
};

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

export default function CoursesPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  const { language, t } = useLanguage();

  // Gate real (página fechada para utilizadores sem login)
  useEffect(() => {
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent('/education/courses')}`);
    }
  }, [user, router]);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(!USE_COURSE_HUB_V2);

  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [progressState, setProgressState] = useState<ProgressFetchState>('idle');

  const [viewMode, setViewMode] = useState<'path' | 'catalog'>('path');

  // Catálogo: anti-ruído
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [sort, setSort] = useState<'recommended' | 'xp_asc' | 'xp_desc' | 'title'>('recommended');

  const userXP = user?.xp_total || 0;

  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  /** ---------------- Data fetch: legacy catalog (quando hub v2 está OFF) ---------------- */
  useEffect(() => {
    if (USE_COURSE_HUB_V2 || !user) return;

    const fetchCourses = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch('/api/courses?includeModules=true', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          console.error('Failed to load courses:', data.error);
          setCourses([]);
        } else {
          setCourses(data.courses || []);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchCourses();
  }, [getToken, user]);

  /** ---------------- Progress summary (logged-in) ---------------- */
  useEffect(() => {
    if (!user) {
      setProgressSummary(null);
      setProgressState('anonymous');
      return;
    }

    const controller = new AbortController();

    const fetchSummary = async () => {
      setProgressState('loading');
      try {
        const token = getToken();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch('/api/education/progress', {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Failed to load progress summary');

        const data = await response.json();
        if (!data.success || !data.summary) throw new Error('Invalid progress response');

        setProgressSummary(data.summary as ProgressSummary);
        setProgressState('success');
      } catch (error: any) {
        if (error?.name === 'AbortError') return;

        console.error('Failed to load progress summary', error);
        setProgressSummary(
          buildFallbackProgressSummary({
            xpTotal: user.xp_total,
            startCourseSlug: START_HERE_FALLBACK_ID,
          }),
        );
        setProgressState('fallback');
      }
    };

    void fetchSummary();
    return () => controller.abort();
  }, [user, getToken]);

  /** ---------------- Derived: Start Here progress ---------------- */
  const startLessonsTotal = progressSummary?.startHere?.totalLessons ?? 0;
  const startLessonsDone = progressSummary?.startHere?.completedLessons ?? 0;

  const startCourseProgressPercent = useMemo(() => {
    if (startLessonsTotal > 0) {
      return Math.min(100, Math.round((startLessonsDone / startLessonsTotal) * 100));
    }
    return progressSummary?.startHere?.progressPercent ?? 0;
  }, [startLessonsTotal, startLessonsDone, progressSummary]);

  const earnedBadges = progressSummary?.badges?.earned.length ?? 0;
  const availableLanguagesCount = Array.isArray(progressSummary?.startCourse?.available_languages)
    ? progressSummary?.startCourse?.available_languages.length ?? 0
    : 3;

  /** ---------------- Level badge on course cards ---------------- */
  const xpLevelLanguage = ((language as LevelLanguage) || 'pt') as LevelLanguage;

  const getLevelBadge = (course: Course) => {
    const baseClass =
      'border border-white/15 bg-cyan-500/15 text-cyan-100 text-[11px] uppercase tracking-[0.3em] rounded-full px-3 py-1';
    const translation =
      getLevelTranslation(resolveLevelSlugFromCourse(course as any), xpLevelLanguage) || null;

    return (
      <Badge variant="outline" className={baseClass}>
        {translation?.title || tr('education.level.unknown', 'Todos os níveis')}
      </Badge>
    );
  };

  const getInitials = (text: string) => {
    if (!text) return 'LG';
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return ((words[0][0] || '') + (words[1][0] || '')).toUpperCase();
  };

  /** ---------------- COMEÇA AQUI href (best-effort) ---------------- */
  const startHereCourseHref = useMemo(() => {
    if (USE_COURSE_HUB_V2) return '/education';
    const startCourse =
      courses.find((c) => (c.slug && c.slug === START_HERE_SLUG) || c.id === START_HERE_FALLBACK_ID) || null;
    return startCourse ? `/education/courses/${startCourse.id}` : '/education';
  }, [courses]);

  /** ---------------- Next locked course (para CTA final inteligente) ---------------- */
  const nextLockedCourse = useMemo(() => {
    if (USE_COURSE_HUB_V2 || courses.length === 0) return null;

    const sorted = [...courses].sort((a, b) => (a.xp_threshold ?? 0) - (b.xp_threshold ?? 0));
    return sorted.find((c) => (c.xp_threshold ?? 0) > userXP) || null;
  }, [courses, userXP]);

  const nextLockedMeta = useMemo(() => {
    if (!nextLockedCourse) return null;
    const xpRequired = clamp0(nextLockedCourse.xp_threshold ?? 0);
    const missing = clamp0(xpRequired - userXP);
    return { xpRequired, missing };
  }, [nextLockedCourse, userXP]);

  /** ---------------- 99: decidir quando mostrar NextUnlockCTA ----------------
   *  - Mostra SEMPRE no modo "Percurso"
   *  - No modo "Catálogo" só aparece se: COMEÇA AQUI incompleto OU existe curso bloqueado (há próximo desbloqueio)
   */
  const showNextUnlockCTA = useMemo(() => {
    if (viewMode === 'path') return true;
    if (startCourseProgressPercent < 100) return true;
    if (nextLockedMeta && nextLockedMeta.missing > 0) return true;
    return false;
  }, [nextLockedMeta, startCourseProgressPercent, viewMode]);

  /** ---------------- Recomendação “próximo passo” (1 CTA) ---------------- */
  const nextStep = useMemo(() => {
    const startHereIncomplete = startCourseProgressPercent < 100;

    if (startHereIncomplete) {
      return {
        eyebrow: tr('courses.nextStep.eyebrow', 'FOCO'),
        title: tr('courses.nextStep.title', 'O teu próximo passo'),
        desc: tr(
          'courses.nextStep.startHereDesc',
          'Conclui o COMEÇA AQUI. Ganhas método, evitas atalhos, e sobes o teu nível real.',
        ),
        ctaLabel: tr('courses.nextStep.continue', 'Continuar COMEÇA AQUI'),
        href: startHereCourseHref,
        mode: 'start_here' as const,
      };
    }

    if (USE_COURSE_HUB_V2) {
      return {
        eyebrow: tr('courses.nextStep.eyebrow', 'FOCO'),
        title: tr('courses.nextStep.title', 'O teu próximo passo'),
        desc: tr(
          'courses.nextStep.hubDesc',
          'Escolhe “Percurso” se queres contexto. Escolhe “Catálogo” se já tens intenção clara.',
        ),
        ctaLabel: tr('courses.nextStep.openCatalog', 'Ir para o catálogo'),
        href: '#catalog',
        mode: 'hub' as const,
      };
    }

    if (!nextLockedCourse) {
      return {
        eyebrow: tr('courses.nextStep.eyebrow', 'FOCO'),
        title: tr('courses.nextStep.title', 'O teu próximo passo'),
        desc: tr(
          'courses.nextStep.allUnlockedDesc',
          'Tens tudo desbloqueado por XP. Agora ganha vantagem: escolhe um curso e termina-o.',
        ),
        ctaLabel: tr('courses.nextStep.openCatalog', 'Abrir catálogo'),
        href: '#catalog',
        mode: 'all' as const,
      };
    }

    const courseTitle = getMultilingualContent(nextLockedCourse.title, language);
    const desc =
      stripHtml(getMultilingualContent(nextLockedCourse.description, language)) ||
      tr('courses.nextStep.defaultLockedDesc', 'Este é o próximo desbloqueio lógico no teu patamar.');

    return {
      eyebrow: tr('courses.nextStep.eyebrow', 'FOCO'),
      title: tr('courses.nextStep.title', 'O teu próximo passo'),
      desc: `${courseTitle} — ${desc}`,
      ctaLabel: tr('courses.nextStep.seeCourse', 'Ver o próximo desbloqueio'),
      href: `/education/courses/${nextLockedCourse.id}`,
      meta: nextLockedMeta,
      mode: 'next_unlock' as const,
    };
  }, [language, nextLockedCourse, nextLockedMeta, startCourseProgressPercent, startHereCourseHref, tr]);

  /** ---------------- Catálogo: lista limpa com pesquisa/filtro/ordem ---------------- */
  const catalogCourses = useMemo(() => {
    if (USE_COURSE_HUB_V2) return [];
    const q = normalize(query);

    const list = courses.filter((course) => {
      const title = normalize(getMultilingualContent(course.title, language) || '');
      const desc = normalize(stripHtml(getMultilingualContent(course.description, language) || ''));
      const matches = !q || title.includes(q) || desc.includes(q);

      const xpRequired = clamp0(course.xp_threshold ?? 0);
      const locked = userXP < xpRequired;

      const passesFilter = filter === 'all' || (filter === 'locked' ? locked : !locked);
      return matches && passesFilter;
    });

    const withScore = list.map((c) => {
      const xpRequired = clamp0(c.xp_threshold ?? 0);
      const locked = userXP < xpRequired;
      const missing = clamp0(xpRequired - userXP);
      // recommended: desbloqueados primeiro; depois o “mais perto”
      const score = (locked ? 100000 : 0) + missing;
      return { c, xpRequired, locked, missing, score };
    });

    const sorted = [...withScore].sort((a, b) => {
      if (sort === 'xp_asc') return a.xpRequired - b.xpRequired;
      if (sort === 'xp_desc') return b.xpRequired - a.xpRequired;
      if (sort === 'title') {
        const at = normalize(getMultilingualContent(a.c.title, language) || '');
        const bt = normalize(getMultilingualContent(b.c.title, language) || '');
        return at.localeCompare(bt);
      }
      if (a.locked !== b.locked) return a.locked ? 1 : -1;
      return a.score - b.score;
    });

    return sorted.map((x) => x.c);
  }, [courses, filter, language, query, sort, userXP]);

  /** ---------------- Stats “chips” (99: sem cartões) ---------------- */
  const quickStats = useMemo(() => {
    if (USE_COURSE_HUB_V2) return null;
    const total = courses.length;
    const unlocked = courses.filter((c) => userXP >= clamp0(c.xp_threshold ?? 0)).length;
    return { total, unlocked };
  }, [courses, userXP]);

  // Loading screen (legacy)
  if (!USE_COURSE_HUB_V2 && loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
            <p className="text-slate-300">{tr('courses.loading', 'A carregar cursos...')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Enquanto o redirect acontece (user ainda null), evita flash de UI
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1">
          <HeroSection className="px-6 py-16" overlayVariant="inverse">
            <div className="relative mx-auto max-w-4xl">
              <HeroContent className="text-center space-y-4">
                <HeroEyebrow>{tr('courses.gate.eyebrow', 'ACADEMIA — CURSOS')}</HeroEyebrow>
                <HeroTitle className={UI.heroTitle}>
                  {tr('courses.gate.title', 'Conteúdo privado. Academia gratuita.')}
                </HeroTitle>
                <HeroDescription className="text-base text-slate-100">
                  {tr(
                    'courses.gate.desc',
                    'O login existe para guardar progresso, XP e desbloqueios. O conteúdo é gratuito.',
                  )}
                </HeroDescription>
                <HeroDescription className={UI.bodyMuted}>
                  {tr('courses.gate.micro', 'Sem hype. Sem pressa. Com método.')}
                </HeroDescription>
                <div className="pt-2">
                  <Button
                    onClick={() => router.push(`/login?next=${encodeURIComponent('/education/courses')}`)}
                    className={cn(UI.ctaPrimary, 'w-full sm:w-auto')}
                  >
                    {tr('courses.gate.cta', 'Entrar / Criar conta')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </HeroContent>
            </div>
          </HeroSection>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl space-y-10">

            {/* HERO (99): 2 decisões, 0 spam, 1 foco */}
            <HeroSection className="px-6 py-14" overlayVariant="inverse">
              <div className="relative mx-auto max-w-6xl">
                <HeroContent className="lg:items-center">
                  <HeroTextColumn>
                    <HeroEyebrow>{tr('nav.courses', 'ACADEMIA — CURSOS')}</HeroEyebrow>

                    <HeroTitle className={UI.heroTitle}>
                      {tr('courses.hero.title', 'Aprende Web3 com método. Sem ruído.')}
                    </HeroTitle>

                    <HeroDescription className="text-base text-slate-100">
                      {tr(
                        'courses.hero.subtitle',
                        'Percurso dá-te contexto. Catálogo dá-te liberdade. O resto é disciplina.',
                      )}
                    </HeroDescription>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Button
                        size="lg"
                        className={cn(UI.ctaPrimary, 'w-full sm:w-auto')}
                        onClick={() => {
                          setViewMode('path');
                          const el = document.getElementById('path');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        {tr('courses.hero.primary', 'Seguir percurso')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>

                      <Button
                        size="lg"
                        variant="outline"
                        className={cn(UI.ctaOutline, 'w-full sm:w-auto')}
                        onClick={() => {
                          setViewMode('catalog');
                          const el = document.getElementById('catalog');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        {tr('courses.hero.secondary', 'Abrir catálogo')}
                        <BookOpen className="ml-2 h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={UI.chip}>
                          <Sparkles className="h-4 w-4 text-[#fdd87c]" />
                          <span className={UI.bodyMuted}>
                            {tr('courses.hero.xp', 'O teu XP')}:{' '}
                            <strong className="text-white">{userXP.toLocaleString()}</strong>
                          </span>
                        </span>

                        <span className={UI.chip}>
                          <Award className="h-4 w-4 text-[#fdd87c]" />
                          <span className={UI.bodyMuted}>
                            {tr('courses.hero.badges', 'Badges ganhos')}:{' '}
                            <strong className="text-white">{earnedBadges}</strong>
                          </span>
                        </span>

                        <span className={UI.chip}>
                          <BookOpen className="h-4 w-4 text-cyan-300" />
                          <span className={UI.bodyMuted}>
                            {tr('courses.hero.lang', 'Idiomas')}:{' '}
                            <strong className="text-white">{availableLanguagesCount}</strong>
                          </span>
                        </span>

                        <Link href="/education/xp" className="text-sm text-cyan-200 hover:text-cyan-100">
                          {tr('courses.hero.howXp', 'Como ganhar XP')}
                        </Link>
                      </div>

                      {/* COMEÇA AQUI compacto (1 CTA + progress bar) */}
                      <div className="rounded-2xl border border-white/10 bg-[#000c12]/45 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-[0.35em] text-[#fdd87c]">
                              {tr('courses.startHere.label', 'COMEÇA AQUI')}
                            </p>
                            <p className={UI.body}>
                              {startCourseProgressPercent < 100
                                ? tr(
                                    'courses.startHere.copy.incomplete',
                                    'Se não concluiste, esta é a tua melhor decisão: base sólida, menos erros, mais velocidade.',
                                  )
                                : tr(
                                    'courses.startHere.copy.done',
                                    'Boa. Agora escolhe um curso e termina-o. A diferença está na execução.',
                                  )}
                            </p>
                          </div>

                          <Link href={startHereCourseHref}>
                            <Button size="sm" className={cn(UI.ctaPrimary, 'whitespace-nowrap')}>
                              {startCourseProgressPercent < 100
                                ? tr('courses.startHere.cta', 'Continuar')
                                : tr('courses.startHere.cta2', 'Rever')}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                        </div>

                        <div className="mt-4">
                          <div className="h-2 w-full rounded-full bg-white/10">
                            <div
                              className="h-2 rounded-full bg-[#fdd87c]/80"
                              style={{
                                width: `${Math.max(0, Math.min(100, startCourseProgressPercent))}%`,
                              }}
                            />
                          </div>
                          <p className="mt-2 text-xs text-slate-300">
                            {tr('courses.startHere.progress', 'Progresso')}:{' '}
                            <span className="text-white font-semibold">{startCourseProgressPercent}%</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </HeroTextColumn>

                  {/* Painel lateral: modo + regra (sem botões extra) */}
                  <div className="w-full rounded-3xl border border-white/10 bg-[#000c12]/50 p-6 backdrop-blur space-y-4">
                    <p className={UI.eyebrow}>{tr('courses.hero.panel', 'MODO')}</p>

                    <div className={UI.modePill}>
                      <button
                        type="button"
                        onClick={() => setViewMode('path')}
                        className={cn(
                          UI.modeBtn,
                          viewMode === 'path'
                            ? 'bg-white/10 text-white'
                            : 'bg-transparent text-slate-200 hover:bg-white/5',
                        )}
                      >
                        {tr('courses.mode.path', 'Percurso')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('catalog')}
                        className={cn(
                          UI.modeBtn,
                          viewMode === 'catalog'
                            ? 'bg-white/10 text-white'
                            : 'bg-transparent text-slate-200 hover:bg-white/5',
                        )}
                      >
                        {tr('courses.mode.catalog', 'Catálogo')}
                      </button>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4 space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200">
                        {tr('courses.rule.label', 'REGRA SIMPLES')}
                      </p>
                      <p className={UI.body}>
                        {tr(
                          'courses.rule.copy',
                          'Um curso de cada vez. Termina. Só depois avanças. Isto cria capacidade real.',
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <Info className="h-4 w-4 text-cyan-300" />
                        <span>{tr('courses.rule.note', 'Os desbloqueios protegem-te de atalhos fracos.')}</span>
                      </div>
                    </div>

                    <div className="text-sm text-slate-200">
                      <Link href="/education/glossary" className="hover:text-white">
                        {tr('courses.quick.glossary', 'Glossário')}
                      </Link>{' '}
                      <span className="text-white/20">·</span>{' '}
                      <Link href="/blog" className="hover:text-white">
                        {tr('courses.quick.blog', 'Blog')}
                      </Link>
                    </div>
                  </div>
                </HeroContent>
              </div>
            </HeroSection>

            {/* O TEU PRÓXIMO PASSO (1 CTA, sempre) */}
            <section className={cn(UI.panel, 'px-6 py-8')}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
              </div>

              <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
                <div className="space-y-3">
                  <p className={UI.eyebrow}>{nextStep.eyebrow}</p>
                  <h2 className={UI.sectionTitle}>{nextStep.title}</h2>
                  <p className={UI.sectionSubtitle}>{nextStep.desc}</p>

                  {nextStep.mode === 'next_unlock' && nextStep.meta?.missing ? (
                    <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#000c12]/40 px-4 py-3">
                      <Target className="h-4 w-4 text-cyan-300" />
                      <span className={UI.bodyMuted}>
                        {tr('courses.nextStep.missing', 'Faltam-te')}{' '}
                        <span className="font-semibold text-white">
                          {nextStep.meta.missing.toLocaleString()}
                        </span>{' '}
                        XP
                      </span>
                      <span className="text-white/20">|</span>
                      <Link href="/education/xp" className="text-sm text-cyan-200 hover:text-cyan-100">
                        {tr('courses.nextStep.how', 'Ver rotas de XP')}
                      </Link>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3">
                  <Link href={nextStep.href}>
                    <Button className={cn(UI.ctaPrimary, 'w-full')}>
                      {nextStep.ctaLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>

                  <p className={cn(UI.micro, 'text-center')}>
                    {tr('courses.nextStep.micro', 'Escolhe. Avança. Regista progresso.')}
                  </p>
                </div>
              </div>
            </section>

            {/* PERCURSO (só quando faz sentido) */}
            {viewMode === 'path' ? (
              <>
                <section id="path" className={cn(UI.panel, 'px-6 py-6')}>
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-20 -right-12 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />
                    <div className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
                  </div>
                  <div className="relative space-y-3">
                    <p className={UI.eyebrow}>{tr('courses.path.eyebrow', 'PERCURSO')}</p>
                    <h2 className={UI.sectionTitle}>
                      {tr('courses.path.title', 'Níveis não são status. São contexto.')}
                    </h2>
                    <p className={UI.sectionSubtitle}>
                      {tr(
                        'courses.path.desc',
                        'O mesmo tema pode ser útil ou perigoso, depende da base. O percurso reduz ruído.',
                      )}
                    </p>
                    <div className="pt-2">
                      <LevelTimeline summary={progressSummary} state={progressState} />
                    </div>
                  </div>
                </section>

                <section id="levels" className={cn(UI.panel, 'px-6 py-8')}>
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-16 -left-16 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
                    <div className="absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-[#5af3ff]/10 blur-3xl" />
                  </div>
                  <div className="relative">
                    <LevelSections summary={progressSummary} />
                  </div>
                </section>
              </>
            ) : null}

            {/* CATÁLOGO / HUB */}
            <section id="catalog" className={cn(UI.panel, 'px-6 py-8')}>
              <div className="absolute inset-0 pointer-events-none">
                <div className={UI.haloCyan} />
                <div className={UI.haloGold} />
              </div>

              <div className="relative flex flex-col gap-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <p className={UI.eyebrow}>{tr('courses.catalogHeader.eyebrow', 'CATÁLOGO')}</p>
                    <h2 className={UI.sectionTitle}>{tr('courses.mainTitle', 'Cursos')}</h2>
                    <p className={UI.sectionSubtitle}>
                      {tr('courses.mainSubtitle', 'Entra num curso com intenção. Um de cada vez. Termina.')}
                    </p>
                  </div>

                  {!USE_COURSE_HUB_V2 && quickStats ? (
                    <div className="flex flex-wrap gap-2">
                      <span className={UI.chip}>
                        <BookOpen className="h-4 w-4 text-cyan-300" />
                        <span className={UI.bodyMuted}>
                          {tr('courses.stats.total', 'Total')}:{' '}
                          <strong className="text-white">{quickStats.total}</strong>
                        </span>
                      </span>

                      <span className={UI.chip}>
                        <CheckCircle className="h-4 w-4 text-emerald-300" />
                        <span className={UI.bodyMuted}>
                          {tr('courses.stats.unlocked', 'Desbloqueados')}:{' '}
                          <strong className="text-white">{quickStats.unlocked}</strong>
                        </span>
                      </span>

                      {nextLockedMeta?.missing ? (
                        <span className={UI.chip}>
                          <Target className="h-4 w-4 text-cyan-300" />
                          <span className={UI.bodyMuted}>
                            {tr('courses.stats.next', 'Próximo desbloqueio')}:{' '}
                            <strong className="text-white">{nextLockedMeta.missing.toLocaleString()}</strong> XP
                          </span>
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Controlos do catálogo (99: fortes, mas discretos) */}
                {!USE_COURSE_HUB_V2 ? (
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={tr('courses.search.placeholder', 'Pesquisar por título ou descrição…')}
                        className={cn(UI.input, 'pl-11')}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#000c12]/40 px-3 py-2 text-sm text-slate-200">
                        <SlidersHorizontal className="h-4 w-4 text-cyan-300" />
                        {tr('courses.filters.label', 'Filtros')}
                      </span>

                      <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className={cn(
                          'rounded-2xl border px-4 py-2 text-sm transition',
                          filter === 'all'
                            ? 'border-cyan-400/40 bg-cyan-500/10 text-white'
                            : 'border-white/15 bg-[#000c12]/40 text-slate-200 hover:bg-white/5',
                        )}
                      >
                        {tr('courses.filters.all', 'Todos')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setFilter('unlocked')}
                        className={cn(
                          'rounded-2xl border px-4 py-2 text-sm transition',
                          filter === 'unlocked'
                            ? 'border-emerald-400/40 bg-emerald-500/10 text-white'
                            : 'border-white/15 bg-[#000c12]/40 text-slate-200 hover:bg-white/5',
                        )}
                      >
                        {tr('courses.filters.unlocked', 'Desbloqueados')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setFilter('locked')}
                        className={cn(
                          'rounded-2xl border px-4 py-2 text-sm transition',
                          filter === 'locked'
                            ? 'border-[#fdd87c]/40 bg-[#fdd87c]/10 text-white'
                            : 'border-white/15 bg-[#000c12]/40 text-slate-200 hover:bg-white/5',
                        )}
                      >
                        {tr('courses.filters.locked', 'Bloqueados')}
                      </button>

                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as any)}
                        className={cn(
                          'h-10 rounded-2xl border border-white/15 bg-[#000c12]/60 px-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40',
                        )}
                      >
                        <option value="recommended">{tr('courses.sort.recommended', 'Ordem recomendada')}</option>
                        <option value="xp_asc">{tr('courses.sort.xpAsc', 'XP (baixo→alto)')}</option>
                        <option value="xp_desc">{tr('courses.sort.xpDesc', 'XP (alto→baixo)')}</option>
                        <option value="title">{tr('courses.sort.title', 'Título (A→Z)')}</option>
                      </select>
                    </div>
                  </div>
                ) : null}

                {/* Conteúdo */}
                <div className="mt-2">
                  {USE_COURSE_HUB_V2 ? (
                    <CourseHubV2 />
                  ) : catalogCourses.length === 0 ? (
                    <Card className="border border-white/10 bg-[#000c12]/80">
                      <CardContent className="py-10 text-center text-slate-300">
                        {tr('courses.noResults', 'Sem resultados com estes filtros.')}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {catalogCourses.map((course) => {
                        const title = getMultilingualContent(course.title, language);
                        const description = stripHtml(getMultilingualContent(course.description, language));

                        const modulesArray: Module[] = Array.isArray(course.modules)
                          ? (course.modules as Module[])
                          : [];

                        const totalModules = course.total_modules ?? modulesArray.length;

                        const totalLessons =
                          course.total_lessons ??
                          modulesArray.reduce(
                            (acc, m) => acc + (Array.isArray(m.lessons) ? m.lessons.length : 0),
                            0,
                          );

                        const totalXP = formatTotalXP(course, modulesArray);

                        const xpRequired = clamp0(course.xp_threshold ?? 0);
                        const isLocked = userXP < xpRequired;
                        const missing = clamp0(xpRequired - userXP);

                        const imageUrl = course.image_url || course.thumbnail_url || null;
                        const initials = getInitials(title);

                        return (
                          <Card
                            key={course.id}
                            className={cn(
                              UI.cardSurface,
                              'flex h-full flex-col overflow-hidden shadow-[0_30px_65px_rgba(3,10,25,0.55)] transition hover:border-cyan-400/70 hover:shadow-[0_0_35px_rgba(34,211,238,0.35)]',
                            )}
                          >
                            <div className="relative overflow-hidden border border-white/10 bg-[#000c12]">
                              {imageUrl ? (
                                <img src={imageUrl} alt={title} className="h-40 w-full object-cover" />
                              ) : (
                                <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-[#020b16] via-[#000c12] to-[#04131b]">
                                  <div className="flex flex-col items-center text-white">
                                    <div className="mb-1 flex items-center gap-2">
                                      <BookOpen className="h-6 w-6 text-[#fdd87c]" />
                                      <span className="text-xl font-bold text-white">{initials}</span>
                                    </div>
                                    <span className="text-[11px] uppercase tracking-[0.3em] text-white/70">
                                      {tr('courses.defaultCourseLabel', 'Curso Legacy')}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="absolute right-3 top-3">{getLevelBadge(course)}</div>
                            </div>

                            <CardHeader className="space-y-3 pb-3">
                              <div className="space-y-2">
                                <CardTitle className="text-lg font-semibold text-white">{title}</CardTitle>

                                <div className="flex flex-wrap items-center gap-2">
                                  {xpRequired > 0 ? (
                                    <Badge
                                      variant="outline"
                                      className="border-[#fdd87c]/40 bg-[#fdd87c]/10 text-[#fdd87c] text-[11px] uppercase tracking-[0.3em]"
                                    >
                                      {xpRequired.toLocaleString()} XP
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="border-white/15 bg-white/5 text-slate-200 text-[11px] uppercase tracking-[0.3em]"
                                    >
                                      {tr('courses.xp.none', 'Sem bloqueio por XP')}
                                    </Badge>
                                  )}

                                  {isLocked && xpRequired > 0 ? (
                                    <Badge
                                      variant="outline"
                                      className="border-white/20 bg-[#000c12]/40 text-slate-200 text-[11px] uppercase tracking-[0.3em]"
                                    >
                                      {tr('courses.locked', 'Bloqueado')}
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="border-emerald-400/25 bg-emerald-500/10 text-emerald-100 text-[11px] uppercase tracking-[0.3em]"
                                    >
                                      {tr('courses.unlockedShort', 'Desbloqueado')}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <CardDescription className="text-sm text-slate-200 leading-relaxed line-clamp-4 min-h-[72px]">
                                {description || tr('courses.noDescription', 'Descrição breve indisponível.')}
                              </CardDescription>
                            </CardHeader>

                            <CardContent className="flex flex-1 flex-col justify-between space-y-4 pt-0">
                              <div className={cn('flex flex-col gap-2', UI.body)}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-[#5af3ff]" />
                                    <span>
                                      {totalModules} {tr('courses.modules', 'módulos')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-[#5af3ff]" />
                                    <span>
                                      {totalLessons} {tr('courses.lessons', 'lições')}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 text-base text-white">
                                  <Award className="h-4 w-4 text-[#fdd87c]" />
                                  <span>
                                    {totalXP} {tr('courses.totalXP', 'XP disponível')}
                                  </span>
                                </div>

                                {/* 99: detalhes opcionais, sem ruído */}
                                <details className="mt-1 rounded-2xl border border-white/10 bg-[#000c12]/35 px-4 py-3">
                                  <summary className="cursor-pointer select-none text-sm text-slate-200 hover:text-white">
                                    {tr('courses.details', 'Detalhes')}
                                  </summary>
                                  <div className="mt-2 text-sm text-slate-300 space-y-2">
                                    <p>
                                      <span className="text-slate-200">{tr('courses.details.note', 'Nota:')}</span>{' '}
                                      {tr('courses.details.copy', 'Não colecciones cursos. Colecciona conclusões.')}
                                    </p>
                                    {typeof course.completions_count === 'number' ? (
                                      <p className="text-xs text-slate-400">
                                        {tr('courses.details.completions', 'Conclusões registadas:')}{' '}
                                        <span className="text-slate-200 font-semibold">{course.completions_count}</span>
                                      </p>
                                    ) : null}
                                  </div>
                                </details>
                              </div>

                              {/* 99: 1 botão sempre */}
                              <div className="mt-2 flex flex-col gap-3">
                                {isLocked ? (
                                  <>
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2 rounded-full border border-white/20 bg-[#04131b] px-3 py-1 text-xs text-slate-200">
                                        <Lock className="h-3 w-3 text-[#fdd87c]" />
                                        <span>
                                          {tr('courses.unlockAt', 'Desbloqueia aos')}{' '}
                                          <strong>{xpRequired.toLocaleString()} XP</strong>
                                        </span>
                                      </div>

                                      <div className="text-xs text-slate-300">
                                        {tr('courses.missing', 'Faltam')}{' '}
                                        <span className="font-semibold text-white">{missing.toLocaleString()}</span> XP
                                      </div>
                                    </div>

                                    <Link href={`/education/courses/${course.id}`}>
                                      <Button size="sm" variant="outline" className={cn(UI.ctaOutline, 'w-full')}>
                                        {tr('courses.learnMore', 'Ver detalhes do curso')}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                      </Button>
                                    </Link>

                                    <p className={cn(UI.micro, 'text-slate-400')}>
                                      {tr(
                                        'courses.locked.micro',
                                        'Se queres acelerar, vai ao “Como ganhar XP” e escolhe uma rota curta.',
                                      )}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 rounded-full border border-cyan-400/70 bg-cyan-500/10 px-3 py-1 text-xs text-white">
                                      <CheckCircle className="h-3 w-3 text-[#5af3ff]" />
                                      <span>{tr('courses.unlocked', 'Já podes aceder a este curso')}</span>
                                    </div>

                                    <Link href={`/education/courses/${course.id}`}>
                                      <Button size="sm" className={cn(UI.ctaPrimary, 'w-full')}>
                                        {tr('courses.open', 'Abrir curso')}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                      </Button>
                                    </Link>
                                  </>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* NEXT UNLOCK CTA (99: só aparece quando importa) */}
        {showNextUnlockCTA ? (
          <section className="mt-10">
            <div className="container mx-auto px-4 max-w-5xl">
              <div className={cn(UI.panel, 'px-6 py-8')}>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute -top-16 -right-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
                </div>
                <div className="relative">
                  <NextUnlockCTA summary={progressSummary} state={progressState} />
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
