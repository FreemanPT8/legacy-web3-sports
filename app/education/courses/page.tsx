'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
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
import { StartHereHero } from '@/components/education/StartHereHero';
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
import { getLevelTranslation, resolveLevelSlugFromCourse, type LevelLanguage } from '@/lib/education/xpLevels';
import { START_HERE_FALLBACK_ID, START_HERE_SLUG } from '@/lib/education/unlockLogic';

import { BookOpen, Award, Lock, ArrowRight, CheckCircle, PenSquare, Users } from 'lucide-react';

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
  metadata?: {
    xpReward?: number;
  };
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
    topics?: Module[];
  };
  author_id?: string | null;
  author_name?: string | null;
  isCreator?: boolean;
  total_modules?: number;
  total_lessons?: number;
  total_xp?: number;
  xp_distributed_total?: number;
  completions_count?: number;
};

const USE_COURSE_HUB_V2 = process.env.NEXT_PUBLIC_EDU_COURSE_HUB_V2 === 'true';

/** ---------- Typography + UI Tokens (coerência absoluta) ---------- */
const UI = {
  eyebrow: 'text-xs uppercase tracking-[0.5em] text-cyan-300',
  heroTitle: 'leading-[0.98] font-bold tracking-tight text-[#fdd87c] text-4xl sm:text-5xl md:text-6xl',
  sectionTitle: 'mt-3 text-3xl md:text-4xl font-bold tracking-tight text-[#fdd87c]',
  sectionSubtitle: 'mt-4 text-sm text-slate-200',
  body: 'text-sm text-slate-200',
  bodyMuted: 'text-sm text-slate-300',
  highlight: 'text-xs text-cyan-200/80',
  cardTitle: 'text-lg font-semibold text-white',
  cardDesc: 'text-sm text-slate-200 leading-relaxed',
  micro: 'text-xs text-slate-200',
  goldStatLabel: 'text-[11px] uppercase tracking-[0.4em] text-[#fdd87c]',
  cyanValue: 'text-2xl font-semibold text-[#5af3ff]',
  panel:
    'relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] shadow-[0_25px_60px_rgba(2,10,20,0.65)]',
  cardSurface: 'rounded-2xl border border-white/10 bg-[#04131b]/80 backdrop-blur',
  statCard:
    'rounded-2xl border border-white/15 bg-[#000c12]/40 px-4 py-3 text-center shadow-lg shadow-black/40',
  haloCyan: 'absolute -top-20 -right-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl',
  haloGold: 'absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-[#fdd87c]/10 blur-3xl',
  ctaPrimary:
    'bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]',
  ctaOutline: 'border-white/40 text-white hover:bg-white/10',
};

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

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

const clamp0 = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
const isFlagTrue = (value: unknown): boolean => value === true;

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

  const userXP = user?.xp_total || 0;

  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  const scrollToId = useCallback((id: string) => {
    if (typeof window === 'undefined') return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const goPath = useCallback(() => {
    setViewMode('path');
    // dá tempo ao React para renderizar a secção
    requestAnimationFrame(() => scrollToId('path'));
  }, [scrollToId]);

  const goCatalog = useCallback(() => {
    setViewMode('catalog');
    requestAnimationFrame(() => scrollToId('catalog'));
  }, [scrollToId]);

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
    const translation = getLevelTranslation(resolveLevelSlugFromCourse(course as any), xpLevelLanguage) || null;

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

  /** ---------------- “O teu próximo passo” (recomendação robusta) ---------------- */
  const nextStep = useMemo(() => {
    // prioridade 1: COMEÇA AQUI se ainda não está concluído
    const startHereIncomplete = startCourseProgressPercent < 100;

    const startHereGuess =
      (!USE_COURSE_HUB_V2
        ? courses.find((c) => (c.slug && c.slug === START_HERE_SLUG) || c.id === START_HERE_FALLBACK_ID)
        : null) || null;

    if (startHereIncomplete) {
      return {
        title: tr('courses.nextStep.startHereTitle', 'Continua o COMEÇA AQUI'),
        desc: tr(
          'courses.nextStep.startHereDesc',
          'Se não concluíste, esta é a tua melhor decisão: base sólida, menos erros, mais velocidade.',
        ),
        ctaLabel: tr('courses.nextStep.continue', 'Continuar'),
        href: startHereGuess ? `/education/courses/${startHereGuess.id}` : '/education/courses',
        xpMissing: 0,
        mode: 'start_here' as const,
      };
    }

    // se não temos catálogo (hub v2), orientação simples
    if (USE_COURSE_HUB_V2 || courses.length === 0) {
      return {
        title: tr('courses.nextStep.generalTitle', 'Escolhe um passo com intenção'),
        desc: tr('courses.nextStep.generalDesc', 'Segue o percurso sugerido ou abre o catálogo se já souberes o que procuras.'),
        ctaLabel: tr('courses.nextStep.openCatalog', 'Abrir catálogo'),
        href: '/education/courses',
        xpMissing: 0,
        mode: 'general' as const,
      };
    }

    // próximo desbloqueio por XP
    const sorted = [...courses].sort((a, b) => (a.xp_threshold ?? 0) - (b.xp_threshold ?? 0));
    const nextLocked = sorted.find((c) => (c.xp_threshold ?? 0) > userXP) || null;

    if (!nextLocked) {
      return {
        title: tr('courses.nextStep.allUnlockedTitle', 'Tens acesso ao catálogo completo'),
        desc: tr('courses.nextStep.allUnlockedDesc', 'Agora a diferença está na disciplina: escolhe um curso e termina-o.'),
        ctaLabel: tr('courses.nextStep.pickCourse', 'Escolher curso'),
        href: '/education/courses',
        xpMissing: 0,
        mode: 'all_unlocked' as const,
      };
    }

    const xpRequired = clamp0(nextLocked.xp_threshold ?? 0);
    const missing = clamp0(xpRequired - userXP);

    const courseTitle = getMultilingualContent(nextLocked.title, language);
    const descriptionRaw = stripHtml(getMultilingualContent(nextLocked.description, language));
    const desc =
      descriptionRaw ||
      tr('courses.nextStep.defaultLockedDesc', 'Este é o próximo desbloqueio lógico no teu patamar actual.');

    return {
      title: tr('courses.nextStep.lockedTitle', 'O teu próximo desbloqueio'),
      desc,
      ctaLabel: tr('courses.nextStep.seeCourse', 'Ver curso'),
      href: `/education/courses/${nextLocked.id}`,
      xpMissing: missing,
      xpRequired,
      courseTitle,
      mode: 'next_unlock' as const,
    };
  }, [courses, language, startCourseProgressPercent, tr, userXP]);

  const courseOverviewStats = [
    {
      key: 'courses',
      label: tr('courses.stats.availableCourses', 'Cursos ativos'),
      value: USE_COURSE_HUB_V2 ? tr('courses.stats.hubActive', 'Hub ativo') : courses.length.toString(),
    },
    {
      key: 'badges',
      label: tr('courses.stats.badgesEarned', 'Badges ganhos'),
      value: earnedBadges.toString(),
    },
    {
      key: 'languages',
      label: tr('courses.stats.languages', 'Idiomas'),
      value: availableLanguagesCount.toString(),
    },
  ];

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

  // Enquanto o redirect acontece, evita flash
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1">
          <HeroSection className="px-6 py-16" overlayVariant="inverse">
            <div className="relative mx-auto max-w-4xl">
              <HeroContent className="text-center space-y-4">
                <HeroEyebrow>{tr('courses.gate.eyebrow', 'ACADEMIA — CURSOS')}</HeroEyebrow>
                <HeroTitle className={UI.heroTitle}>{tr('courses.gate.title', 'Conteúdo privado. Academia gratuita.')}</HeroTitle>
                <HeroDescription className="text-base text-slate-100">
                  {tr('courses.gate.desc', 'O login existe para guardar progresso, XP e desbloqueios. O conteúdo é gratuito.')}
                </HeroDescription>
                <HeroDescription className={UI.sectionSubtitle}>{tr('courses.gate.micro', 'Sem hype. Sem pressa. Com método.')}</HeroDescription>
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
            {/* HERO 95+ (menos ruído, mais posição) */}
            <HeroSection className="px-6 py-10 md:py-12" overlayVariant="inverse">
              <div className="relative mx-auto max-w-6xl">
                <HeroContent className="lg:items-center">
                  <HeroTextColumn>
                    <HeroEyebrow>{tr('nav.courses', 'CURSOS')}</HeroEyebrow>

                    <HeroTitle className={UI.heroTitle}>
                      {tr('courses.hero99.title', 'Web3 não se aprende rápido. Aprende-se certo.')}
                    </HeroTitle>

                    <HeroDescription className="text-base text-slate-100 max-w-2xl">
                      {tr(
                        'courses.hero99.subtitle',
                        'O Legacy dá-te um percurso com contexto e um catálogo com controlo. A diferença está no método — e no que escolhes ignorar.',
                      )}
                    </HeroDescription>

                    <div className="mt-5 max-w-2xl rounded-2xl border border-white/10 bg-[#000c12]/40 px-4 py-3">
                      <p className={cn(UI.body, 'leading-relaxed')}>
                        <span className="font-semibold text-white">
                          {tr('courses.hero99.lawLabel', 'Regra nº1:')}
                        </span>{' '}
                        {tr(
                          'courses.hero99.law',
                          'Um curso de cada vez. Termina. Só depois avanças. Isto cria capacidade real.',
                        )}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Button size="lg" onClick={goPath} className={cn(UI.ctaPrimary)}>
                        {tr('courses.hero99.primary', 'Entrar no percurso')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>

                      <Button size="lg" variant="outline" onClick={goCatalog} className={cn(UI.ctaOutline)}>
                        {tr('courses.hero99.secondary', 'Ver catálogo')}
                        <BookOpen className="ml-2 h-4 w-4" />
                      </Button>
                    </div>

                    <p className={cn(UI.highlight, 'mt-3')}>
                      {tr('courses.hero99.note', 'Progresso, XP e desbloqueios ficam guardados no teu perfil.')}
                    </p>
                  </HeroTextColumn>

                  {/* Coluna direita: “silêncio premium” (sem painel MODO aqui) */}
                  <div className="hidden lg:block w-full">
                    <div className="relative h-full min-h-[220px] rounded-3xl border border-white/10 bg-[#000c12]/35 backdrop-blur">
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute -top-14 -right-12 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
                        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[#fdd87c]/10 blur-3xl" />
                      </div>
                      <div className="relative p-6 space-y-3">
                        <p className={cn(UI.eyebrow, 'text-cyan-200')}>{tr('courses.hero99.rightEyebrow', 'DISCIPLINA')}</p>
                        <p className={cn(UI.body, 'max-w-md')}>
                          {tr(
                            'courses.hero99.rightCopy',
                            'A maioria perde dinheiro por aprender fora de ordem. Aqui aprendes por camadas: base, contexto, decisão.',
                          )}
                        </p>
                        <p className={cn('text-xs text-slate-300')}>
                          {tr('courses.hero99.rightMicro', 'Sem atalhos. Sem promessas. Só progresso verificável.')}
                        </p>
                      </div>
                    </div>
                  </div>
                </HeroContent>
              </div>
            </HeroSection>

            {/* STICKY BAR (MODO + atalhos) */}
            <div className="sticky top-4 z-30">
              <div className="mx-auto max-w-6xl">
                <div
                  className={cn(
                    'rounded-2xl border border-white/10 bg-[#000c12]/70 backdrop-blur px-3 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.35)]',
                  )}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={cn(UI.eyebrow, 'text-cyan-200')}>{tr('courses.mode.label', 'MODO')}</span>

                      <div className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-[#000c12]/50 p-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={goPath}
                          className={cn(
                            'rounded-xl px-4',
                            viewMode === 'path' ? 'bg-white/10 text-white' : 'bg-transparent text-slate-200 hover:bg-white/5',
                          )}
                        >
                          {tr('courses.mode.path', 'Percurso')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={goCatalog}
                          className={cn(
                            'rounded-xl px-4',
                            viewMode === 'catalog' ? 'bg-white/10 text-white' : 'bg-transparent text-slate-200 hover:bg-white/5',
                          )}
                        >
                          {tr('courses.mode.catalog', 'Catálogo')}
                        </Button>
                      </div>

                      <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-[#000c12]/40 px-3 py-1">
                        <span className="text-xs text-slate-200">
                          <span className="text-slate-300">{tr('courses.mode.ruleLead', 'Regra:')}</span>{' '}
                          {tr('courses.mode.rule', 'um curso de cada vez. Termina.')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-[#000c12]/40 px-3 py-1 text-xs text-slate-200">
                        {tr('courses.yourXP', 'O teu XP')}: <span className="font-semibold text-white">{userXP.toLocaleString()}</span>
                      </span>

                      <Link href="/blog">
                        <Button size="sm" variant="outline" className={UI.ctaOutline}>
                          {tr('courses.quick.blog', 'Blog')}
                        </Button>
                      </Link>
                      <Link href="/education/glossary">
                        <Button size="sm" variant="outline" className={UI.ctaOutline}>
                          {tr('courses.quick.glossary', 'Glossário')}
                        </Button>
                      </Link>
                      <Link href="/education/xp">
                        <Button size="sm" variant="outline" className={UI.ctaOutline}>
                          {tr('courses.quick.xp', 'Como ganhar XP')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* O TEU PRÓXIMO PASSO */}
            <section className={cn(UI.panel, 'px-6 py-8')}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
              </div>

              <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div className="space-y-3">
                  <p className={UI.eyebrow}>{tr('courses.nextStep.eyebrow', 'FOCO')}</p>
                  <h2 className={UI.sectionTitle}>{tr('courses.nextStep.title', 'O teu próximo passo')}</h2>

                  <p className={UI.sectionSubtitle}>
                    {nextStep.mode === 'next_unlock' ? (
                      <>
                        <span className="font-semibold text-white">{(nextStep as any).courseTitle}</span>
                        <span className="text-slate-200"> — {nextStep.desc}</span>
                      </>
                    ) : (
                      nextStep.desc
                    )}
                  </p>

                  {nextStep.mode === 'next_unlock' && (nextStep as any).xpMissing > 0 ? (
                    <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#000c12]/40 px-4 py-3">
                      <span className={UI.body}>
                        {tr('courses.nextStep.missing', 'Faltam-te')}{' '}
                        <span className="font-semibold text-white">{(nextStep as any).xpMissing.toLocaleString()}</span> XP
                      </span>
                      <span className={cn('text-xs text-slate-300')}>
                        {tr('courses.nextStep.route', 'Rota rápida: 1 lição + 2 artigos + 5 termos no glossário.')}
                      </span>
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

                  {nextStep.mode === 'next_unlock' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Link href="/blog">
                        <Button variant="outline" className={cn(UI.ctaOutline, 'w-full')}>
                          {tr('courses.nextStep.blogCta', 'Ganhar XP no blog')}
                        </Button>
                      </Link>
                      <Link href="/education/glossary">
                        <Button variant="outline" className={cn(UI.ctaOutline, 'w-full')}>
                          {tr('courses.nextStep.glossaryCta', 'Ganhar XP no glossário')}
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <p className={cn(UI.micro, 'text-slate-400')}>{tr('courses.nextStep.micro', 'Uma decisão. Um passo. Progresso real.')}</p>
                  )}
                </div>
              </div>
            </section>

            {/* START HERE HERO (mantém) */}
            <section className={cn(UI.panel, 'px-6 py-8')}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-16 -left-10 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
              </div>
              <div className="relative">
                <StartHereHero summary={progressSummary} state={progressState} preferredLanguage={language} />
              </div>
            </section>

            {/* PERCURSO (timeline + níveis) */}
            {viewMode === 'path' ? (
              <>
                <section id="path" className={cn(UI.panel, 'px-6 py-6')}>
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-20 -right-12 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />
                    <div className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
                  </div>
                  <div className="relative space-y-3">
                    <p className={UI.eyebrow}>{tr('courses.path.eyebrow', 'VISÃO')}</p>
                    <h2 className={UI.sectionTitle}>{tr('courses.path.title', 'Níveis não são status. São contexto.')}</h2>
                    <p className={UI.sectionSubtitle}>
                      {tr('courses.path.desc', 'O mesmo curso pode ser útil — ou perigoso — dependendo do que já dominas. O percurso existe para reduzir ruído.')}
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
            ) : (
              <section id="path" className={cn(UI.panel, 'px-6 py-6')}>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute -top-16 -right-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
                  <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
                </div>
                <div className="relative space-y-3">
                  <p className={UI.eyebrow}>{tr('courses.catalog.eyebrow', 'MODO')}</p>
                  <h2 className={UI.sectionTitle}>{tr('courses.catalog.title', 'Explorar serve para quem já sabe o que procura.')}</h2>
                  <p className={UI.sectionSubtitle}>
                    {tr('courses.catalog.desc', 'Se estás no início, volta ao “Percurso”. É onde ganhas base mais rápido — e com menos ruído.')}
                  </p>
                </div>
              </section>
            )}

            {/* CATÁLOGO / HUB */}
            <section id="catalog" className={cn(UI.panel, 'px-6 py-8')}>
              <div className="absolute inset-0 pointer-events-none">
                <div className={UI.haloCyan} />
                <div className={UI.haloGold} />
              </div>

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className={UI.eyebrow}>{tr('courses.catalogHeader.eyebrow', 'CATÁLOGO')}</p>
                  <h2 className={UI.sectionTitle}>{tr('courses.mainTitle', 'Cursos')}</h2>
                  <p className={UI.sectionSubtitle}>
                    {tr('courses.mainSubtitle', 'Cursos estruturados sobre Web3, a blockchain Apertum e o ecossistema. Ganhas XP com consistência — lições, blog e glossário.')}
                  </p>
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
                  {courseOverviewStats.map((stat) => (
                    <div key={stat.key} className={UI.statCard}>
                      <p className={UI.goldStatLabel}>{stat.label}</p>
                      <p className={UI.cyanValue}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className={cn(
                    'inline-flex items-center gap-3 rounded-full border border-white/15 bg-[#000c12]/80 px-4 py-2 md:text-base shadow-[0_10px_30px_rgba(3,12,20,0.5)]',
                    UI.bodyMuted,
                  )}
                >
                  <span>
                    {tr('courses.yourXP', 'O teu XP')}: <strong className="text-white">{userXP.toLocaleString()}</strong>
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">{tr('courses.loggedIn', 'Sessão iniciada')}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href="/blog">
                    <Button size="sm" variant="outline" className={UI.ctaOutline}>
                      {tr('cta.exploreBlog', 'Explorar Blog')}
                    </Button>
                  </Link>
                  <Link href="/education/glossary">
                    <Button size="sm" variant="outline" className={UI.ctaOutline}>
                      {tr('cta.openGlossary', 'Abrir Glossário')}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mt-8">
                {USE_COURSE_HUB_V2 ? (
                  <CourseHubV2 />
                ) : courses.length === 0 ? (
                  <Card className="border border-white/10 bg-[#000c12]/80">
                    <CardContent className="py-10 text-center text-slate-300">
                      {tr('courses.noCourses', 'Ainda não há cursos disponíveis. Volta em breve!')}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {courses.map((course) => {
                      const title = getMultilingualContent(course.title, language);
                      const description = stripHtml(getMultilingualContent(course.description, language));

                      const modulesArray: Module[] = Array.isArray(course.modules)
                        ? (course.modules as Module[])
                        : [];
                      const topicsArray: Module[] = Array.isArray(course.curriculum?.topics)
                        ? (course.curriculum?.topics as Module[])
                        : [];
                      const modulesList = modulesArray.length > 0 ? modulesArray : topicsArray;
                      const totalModules = course.total_modules ?? modulesList.length;

                      const totalLessons =
                        course.total_lessons ??
                        modulesList.reduce(
                          (acc, m) => acc + (Array.isArray(m.lessons) ? m.lessons.length : 0),
                          0,
                        );

                      const totalXP = formatTotalXP(course, modulesList);
                      const completionsCount =
                        course.completions_count ??
                        (course as any)?.completionsCount ??
                        (course as any)?.total_completions ??
                        0;

                      const xpRequired = clamp0(course.xp_threshold ?? 0);
                      const isLocked = userXP < xpRequired;

                      const isCourseCreator = isFlagTrue(course.isCreator);
                      const imageUrl = course.image_url || course.thumbnail_url || null;
                      const initials = getInitials(title);

                      const missing = clamp0(xpRequired - userXP);

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
                              <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-[#020b16] via-[#000c12] to-[#04131b] text-cyan-100">
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

                            {(isCourseCreator || xpRequired > 0) && (
                              <div className="absolute left-3 right-16 top-3 flex flex-wrap items-center gap-2">
                                {isCourseCreator && (
                                  <Badge className="flex items-center gap-1 border-white/20 bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white">
                                    <PenSquare className="h-3 w-3" />
                                    {tr('courses.creator', 'Creator')}
                                  </Badge>
                                )}
                                {xpRequired > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="border-[#fdd87c]/40 bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[#fdd87c]"
                                  >
                                    {xpRequired} XP
                                  </Badge>
                                )}
                                {isLocked && xpRequired > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="border-white/30 bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-100"
                                  >
                                    {tr('courses.preparing', 'Em preparação')}
                                  </Badge>
                                )}
                              </div>
                            )}

                            <div className="absolute right-3 top-3">{getLevelBadge(course)}</div>
                          </div>

                          <CardHeader className="space-y-3 pb-3">
                            <div>
                              <CardTitle
                                className={cn(UI.cardTitle, 'line-clamp-2 min-h-[3.25rem] leading-snug')}
                              >
                                {title}
                              </CardTitle>
                            </div>

                            <CardDescription className={cn(UI.cardDesc, 'line-clamp-4 min-h-[72px]')}>
                              {description || tr('courses.noDescription', 'Descrição breve indisponível.')}
                            </CardDescription>
                          </CardHeader>

                          <CardContent className="flex flex-1 flex-col justify-between space-y-4 pt-0">
                            <div className={cn('flex flex-col gap-2', UI.body)}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4 text-[#5af3ff]" />
                                  <span>
                                    {totalModules} {tr('courses.modules', 'tópicos')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4 text-[#5af3ff]" />
                                  <span>
                                    {totalLessons} {tr('courses.lessons', 'lições')}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-base text-white">
                                  <Award className="h-4 w-4 text-[#fdd87c]" />
                                  <span>
                                    {totalXP} {tr('courses.totalXP', 'XP disponível')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-300">
                                  <Users className="h-4 w-4 text-[#5af3ff]" />
                                  <span>
                                    {completionsCount} {tr('courses.completions', 'utilizadores concluíram')}
                                  </span>
                                </div>
                              </div>
                            </div>

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

                                  <div className="grid grid-cols-2 gap-2">
                                    <Link href={`/education/courses/${course.id}`}>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full border-white/50 bg-black/40 text-white hover:bg-black/60"
                                      >
                                        <span className="text-xs font-semibold">{tr('courses.learnMore', 'Saber mais')}</span>
                                      </Button>
                                    </Link>

                                    <Link href="/education/xp">
                                      <Button size="sm" className={cn(UI.ctaPrimary, 'w-full')}>
                                        <span className="text-xs font-semibold">{tr('courses.gainXp', 'Ganhar XP')}</span>
                                        <ArrowRight className="ml-1 h-3 w-3" />
                                      </Button>
                                    </Link>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 rounded-full border border-cyan-400/70 bg-cyan-500/10 px-3 py-1 text-xs text-white">
                                    <CheckCircle className="h-3 w-3 text-[#5af3ff]" />
                                    <span>{tr('courses.unlocked', 'Já podes aceder a este curso')}</span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <Link href={`/education/courses/${course.id}`}>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full border-white/50 bg-black/40 text-white hover:bg-black/60"
                                      >
                                        <span className="text-xs font-semibold">{tr('courses.learnMore', 'Saber mais')}</span>
                                      </Button>
                                    </Link>

                                    <Link href={`/education/courses/${course.id}`}>
                                      <Button size="sm" className={cn(UI.ctaPrimary, 'w-full')}>
                                        <span className="text-xs font-semibold">{tr('courses.viewDetails', 'Ver curso')}</span>
                                        <ArrowRight className="ml-1 h-3 w-3" />
                                      </Button>
                                    </Link>
                                  </div>
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
            </section>
          </div>
        </div>

        {/* NEXT UNLOCK CTA */}
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
      </main>
      <Footer />
    </div>
  );
}
