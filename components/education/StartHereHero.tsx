'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Globe, ArrowRight, CheckCircle, Shield, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProgressSummary } from '@/lib/education/progressSummary';
import type { ProgressFetchState } from '@/components/education/LevelTimeline';
import type { LevelCourseSummary } from '@/lib/education/unlockEngine';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { XP_LEVELS } from '@/lib/education/xpLevels';
import { useAuth } from '@/contexts/AuthContext';
import type { Language } from '@/lib/i18n';

const LANGUAGE_METADATA: Record<string, { label: string; code: string }> = {
  pt: { label: 'Português', code: 'PT' },
  es: { label: 'Español', code: 'ES' },
  en: { label: 'English', code: 'EN' },
};

type SupportedHeroLanguage = 'pt' | 'es' | 'en';

type HeroCopy = {
  badge: string;
  contentAvailable: string;
  currentLevel: string;
  xpHint: string;
  maxLevel: string;
  completed: string;
  startCta: string;
  continueCta: string;
  reviewCta: string;
  viewRoadmap: string;
  loginTitle: string;
  loginHeading: string;
  loginDescription: string;
  loginAction: string;
  loading: string;
  fallback: string;
  error: string;
  progress: string;
  lessons: (done: number, total: number) => string;
  lessonsSync: string;
  lessonsEmpty: string;
  nextContentLabel: string;
};

const HERO_COPY: Record<SupportedHeroLanguage, HeroCopy> = {
  en: {
    badge: 'Academia Web3 Legacy',
    contentAvailable: 'Content available in',
    currentLevel: 'Current level',
    xpHint: 'to',
    maxLevel: 'Max level unlocked',
    completed: 'Course completed — you can advance to Cadets',
    startCta: 'Start course',
    continueCta: 'Continue course',
    reviewCta: 'Review course',
    viewRoadmap: 'View paths',
    loginTitle: 'First step',
    loginHeading: 'START HERE is locked',
    loginDescription: 'Create an account or sign in to unlock the mandatory course in Portuguese, Spanish and English.',
    loginAction: 'Sign in',
    loading: 'Loading course progress...',
    fallback: 'Showing progress based on your local XP. Once the server syncs you will see full details.',
    error: 'We could not load the initial course state. Please try again later.',
    progress: 'PROGRESS',
    lessons: (done, total) => `${done}/${total} lessons`,
    lessonsSync: 'Syncing lessons...',
    lessonsEmpty: '0 lessons tracked',
    nextContentLabel: 'Next content',
  },
  pt: {
    badge: 'Academia Web3 Legacy',
    contentAvailable: 'Conteúdo disponível em',
    currentLevel: 'Nível atual',
    xpHint: 'para',
    maxLevel: 'Nível máximo desbloqueado',
    completed: 'Curso concluído — podes avançar para Cadetes',
    startCta: 'Começar Curso',
    continueCta: 'Continuar Curso',
    reviewCta: 'Rever Curso',
    viewRoadmap: 'Ver Percursos',
    loginTitle: 'Primeiro passo',
    loginHeading: 'COMEÇA AQUI está bloqueado',
    loginDescription: 'Cria conta ou autentica-te para desbloquear o curso obrigatório em Português, Espanhol e Inglês.',
    loginAction: 'Iniciar sessão',
    loading: 'A carregar progresso do curso...',
    fallback: 'Estamos a mostrar o progresso deste curso com base no teu XP local. Assim que o servidor sincronizar vais ver todos os detalhes.',
    error: 'Não foi possível carregar o estado do curso inicial. Tenta novamente mais tarde.',
    progress: 'PROGRESSO',
    lessons: (done, total) => `${done}/${total} lições`,
    lessonsSync: 'A sincronizar lições...',
    lessonsEmpty: '0 lições registadas',
    nextContentLabel: 'Próximo conteúdo',
  },
  es: {
    badge: 'Academia Web3 Legacy',
    contentAvailable: 'Contenido disponible en',
    currentLevel: 'Nivel actual',
    xpHint: 'para',
    maxLevel: 'Nivel máximo desbloqueado',
    completed: 'Curso completado — puedes avanzar a Cadetes',
    startCta: 'Comenzar curso',
    continueCta: 'Continuar curso',
    reviewCta: 'Revisar curso',
    viewRoadmap: 'Ver recorridos',
    loginTitle: 'Primer paso',
    loginHeading: 'EMPIEZA AQUÍ está bloqueado',
    loginDescription: 'Crea una cuenta o inicia sesión para desbloquear el curso obligatorio en Portugués, Español e Inglés.',
    loginAction: 'Iniciar sesión',
    loading: 'Cargando progreso del curso...',
    fallback: 'Mostramos tu progreso según tu XP local. Cuando el servidor sincronice verás todos los detalles.',
    error: 'No ha sido posible cargar el estado del curso inicial. Inténtalo más tarde.',
    progress: 'PROGRESO',
    lessons: (done, total) => `${done}/${total} lecciones`,
    lessonsSync: 'Sincronizando lecciones...',
    lessonsEmpty: '0 lecciones registradas',
    nextContentLabel: 'Próximo contenido',
  },
};

const HERO_TIPS: Record<SupportedHeroLanguage, Array<{ label: string; description: string; href: (slug: string) => string }>> = {
  en: [
    { label: 'Explore Courses', description: 'Choose new modules to earn XP quickly.', href: () => '/education/courses' },
    { label: 'Back to START HERE', description: 'Finish missing lessons to unlock Cadets.', href: (slug) => `/education/courses/${slug}` },
    { label: 'Read the Blog', description: 'Learn daily and gain extra XP from activities.', href: () => '/blog' },
  ],
  pt: [
    { label: 'Explorar Cursos', description: 'Escolhe novos módulos para acumular XP rapidamente.', href: () => '/education/courses' },
    { label: 'Voltar ao COMEÇA AQUI', description: 'Completa lições em falta para desbloquear Cadetes.', href: (slug) => `/education/courses/${slug}` },
    { label: 'Ler o Blog', description: 'Aprende diariamente e garante XP adicional por atividade.', href: () => '/blog' },
  ],
  es: [
    { label: 'Explorar Cursos', description: 'Elige nuevos módulos para acumular XP rápidamente.', href: () => '/education/courses' },
    { label: 'Volver a EMPIEZA AQUÍ', description: 'Termina las lecciones pendientes para desbloquear Cadetes.', href: (slug) => `/education/courses/${slug}` },
    { label: 'Leer el Blog', description: 'Aprende cada día y consigue XP adicional por actividad.', href: () => '/blog' },
  ],
};

const TITLE_FALLBACK: Record<SupportedHeroLanguage, string> = {
  pt: 'COMEÇA AQUI',
  es: 'EMPIEZA AQUÍ',
  en: 'START HERE',
};

const DESCRIPTION_FALLBACK: Record<SupportedHeroLanguage, string> = {
  pt: 'Curso obrigatório para desbloquear toda a experiência da Academia Legacy.',
  es: 'Curso obligatorio para desbloquear toda la experiencia de la Academia Legacy.',
  en: 'Mandatory course that unlocks the full Legacy Academy experience.',
};

const LEVEL_TRANSLATIONS: Record<string, Partial<Record<Language, string>>> = {
  cadets: { pt: 'Cadete', es: 'Cadete', en: 'Cadet' },
  infantil: { pt: 'Infantil', es: 'Infantil', en: 'Youth' },
  juveniles: { pt: 'Juvenil', es: 'Juvenil', en: 'Intermediate' },
  juniors: { pt: 'Junior', es: 'Junior', en: 'Junior' },
  seniors: { pt: 'Sénior', es: 'Senior', en: 'Senior' },
  'hall-of-fame': { pt: 'Hall da Fama', es: 'Salón de la Fama', en: 'Hall of Fame' },
  master: { pt: 'Master', es: 'Master', en: 'Master' },
  legend: { pt: 'Lenda', es: 'Leyenda', en: 'Legend' },
};

const LEVEL_KEY_TO_SLUG: Record<string, string> = {
  newcomer: 'cadets',
  cadets: 'cadets',
  cadete: 'cadets',
  beginner: 'infantil',
  infantil: 'infantil',
  intermediate: 'juveniles',
  juveniles: 'juveniles',
  advanced: 'juniors',
  juniors: 'juniors',
  expert: 'seniors',
  seniors: 'seniors',
  hallOfFame: 'hall-of-fame',
  halloffame: 'hall-of-fame',
  master: 'master',
  legend: 'legend',
};

type StartHereHeroProps = {
  summary: ProgressSummary | null;
  state: ProgressFetchState;
  preferredLanguage?: string;
};

type NextContentTarget = {
  type: 'startCourse' | 'course' | 'review';
  href: string;
  courseName?: string;
  levelName?: string;
};

export function StartHereHero({ summary, state, preferredLanguage }: StartHereHeroProps) {
  const startHere = summary?.startHere;
  const startCourse = summary?.startCourse;
  const { getToken } = useAuth();

  const availableLanguages = useMemo(() => {
    if (!startCourse?.available_languages) {
      return ['pt', 'es', 'en'];
    }
    return startCourse.available_languages.map((lang) => lang.toLowerCase());
  }, [startCourse]);

  const defaultCourseLanguage = useMemo(() => {
    const preference = (preferredLanguage || startCourse?.primary_language || 'pt').toLowerCase();
    if (availableLanguages.includes(preference)) {
      return preference;
    }
    return availableLanguages[0] || 'pt';
  }, [availableLanguages, preferredLanguage, startCourse?.primary_language]);

  const [activeLanguage, setActiveLanguage] = useState(defaultCourseLanguage);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [courseStats, setCourseStats] = useState<{ totalLessons?: number; completedLessons?: number } | null>(null);
  const [isCourseStatsLoading, setIsCourseStatsLoading] = useState(false);

  useEffect(() => {
    setActiveLanguage(defaultCourseLanguage);
  }, [defaultCourseLanguage]);

  const uiLanguage = (preferredLanguage || activeLanguage || 'pt').toLowerCase();
  const heroLanguage: SupportedHeroLanguage = ['pt', 'es', 'en'].includes(uiLanguage as SupportedHeroLanguage)
    ? (uiLanguage as SupportedHeroLanguage)
    : 'en';
  const heroCopy = HERO_COPY[heroLanguage];

  const isLoading = state === 'idle' || state === 'loading';
  const hasError = state === 'error';
  const isAnonymous = state === 'anonymous';
  const isFallback = state === 'fallback';

  const totalLessonsFromSummary = startHere?.totalLessons ?? 0;
  const totalLessonsDerived =
    typeof courseStats?.totalLessons === 'number' && courseStats.totalLessons > 0
      ? courseStats.totalLessons
      : totalLessonsFromSummary;
  const completedLessonsFromSummary = startHere?.completedLessons ?? 0;
  const completedLessons =
    typeof courseStats?.completedLessons === 'number'
      ? courseStats.completedLessons
      : completedLessonsFromSummary;
  const completionPercent =
    totalLessonsDerived > 0
      ? Math.min(100, Math.round((completedLessons / totalLessonsDerived) * 100))
      : startHere?.progressPercent ?? 0;
  const hasStarted = completedLessons > 0;
  const isCompleted = Boolean(startHere?.isCompleted);

  const heroTitle =
    getContentByLanguage(startCourse?.title, activeLanguage) ||
    TITLE_FALLBACK[heroLanguage] ||
    TITLE_FALLBACK.en;
  const heroDescription =
    getContentByLanguage(startCourse?.description, activeLanguage) ||
    DESCRIPTION_FALLBACK[heroLanguage] ||
    DESCRIPTION_FALLBACK.en;

  const courseTarget =
    startHere?.courseId ||
    startCourse?.slug ||
    startHere?.slug ||
    'comeca-aqui';

  const normalizedCoursesByLevel = useMemo<Record<string, LevelCourseSummary[]>>(() => {
    if (!summary?.coursesByLevel) {
      return {};
    }
    return Object.entries(summary.coursesByLevel).reduce<Record<string, LevelCourseSummary[]>>(
      (acc, [levelSlug, list]) => {
        const safeList = Array.isArray(list) ? list : [];
        acc[levelSlug] = safeList;
        if (typeof levelSlug === 'string') {
          acc[levelSlug.toLowerCase()] = safeList;
        }
        const normalizedKey = normalizeLevelSlugValue(levelSlug);
        if (normalizedKey) {
          acc[normalizedKey] = safeList;
        }
        return acc;
      },
      {},
    );
  }, [summary?.coursesByLevel]);

  const nextContentTarget = useMemo<NextContentTarget>(() => {
    const fallbackHref = `/education/courses/${courseTarget}`;
    const baseTarget: NextContentTarget = {
      type: 'startCourse',
      href: fallbackHref,
      courseName: heroTitle,
    };

    if (!summary || !startHere) {
      return baseTarget;
    }

    if (!startHere.isCompleted) {
      return baseTarget;
    }

    const availableLevels = summary.levels || [];
    for (const level of availableLevels) {
      if (!level?.isUnlocked) continue;
      const normalizedKey = normalizeLevelSlugValue(level.slug);
      const candidates =
        normalizedCoursesByLevel[normalizedKey] ||
        normalizedCoursesByLevel[level.slug] ||
        normalizedCoursesByLevel[
          typeof level.slug === 'string' ? level.slug.toLowerCase() : ''
        ];

      if (!Array.isArray(candidates)) continue;
      const pendingCourse = candidates.find((course) => !course.isCompleted);
      if (pendingCourse) {
        const slug = pendingCourse.slug || pendingCourse.id;
        if (!slug) continue;
        return {
          type: 'course',
          href: `/education/courses/${slug}`,
          courseName: pendingCourse.title,
          levelName: level.title,
        };
      }
    }

    return {
      type: 'review',
      href: fallbackHref,
      courseName: heroTitle,
    };
  }, [courseTarget, heroTitle, normalizedCoursesByLevel, startHere, summary]);

  const hasNextCourseTarget = nextContentTarget.type === 'course';
  const ctaLabel = !hasStarted
    ? heroCopy.startCta
    : hasNextCourseTarget
      ? heroCopy.continueCta
      : !isCompleted
        ? heroCopy.continueCta
        : heroCopy.reviewCta;
  const lessonsStatus =
    totalLessonsDerived > 0
      ? heroCopy.lessons(completedLessons, totalLessonsDerived)
      : isCourseStatsLoading
        ? heroCopy.lessonsSync
        : heroCopy.lessonsEmpty;

  const levelSummary = summary?.xp?.currentLevel;
  const levelHint =
    levelSummary?.nextLevelLabel && typeof levelSummary?.xpToNext === 'number'
      ? `${levelSummary.xpToNext} XP ${heroCopy.xpHint} ${translateLevelLabel(levelSummary.nextLevelLabel, heroLanguage)}`
      : heroCopy.maxLevel;

  const languagesToRender = Object.keys(LANGUAGE_METADATA);

  useEffect(() => {
    const summaryLessons = startHere?.totalLessons ?? 0;
    const summaryCompleted = startHere?.completedLessons ?? 0;
    const needsRemoteStats =
      !!courseTarget && (summaryLessons <= 0 || summaryCompleted <= 0);

    const token = getToken?.();

    if (!needsRemoteStats || !token) {
      setCourseStats(null);
      setIsCourseStatsLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchStats = async () => {
      setIsCourseStatsLoading(true);
      try {
        const headers: HeadersInit = {
          Authorization: `Bearer ${token}`,
        };
        const response = await fetch(`/api/courses/${courseTarget}`, {
          signal: controller.signal,
          headers,
        });
        const data = await response.json();
        if (response.ok && data?.success && data?.course) {
          const modulesArray = Array.isArray(data.course.modules) ? data.course.modules : [];
          const topicsArray = Array.isArray(data.course.curriculum?.topics)
            ? data.course.curriculum.topics
            : [];
          const modules = modulesArray.length > 0 ? modulesArray : topicsArray;
          const lessons = modules.reduce((acc: number, mod: any) => {
            if (!Array.isArray(mod?.lessons)) return acc;
            return acc + mod.lessons.length;
          }, 0);
          const completed = modules.reduce((acc: number, mod: any) => {
            if (!Array.isArray(mod?.lessons)) return acc;
            return (
              acc +
              mod.lessons.filter((lesson: any) => lesson?.isCompleted).length
            );
          }, 0);
          if (lessons > 0 || completed > 0) {
            setCourseStats({
              totalLessons: lessons > 0 ? lessons : undefined,
              completedLessons: completed > 0 ? completed : undefined,
            });
          }
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('StartHereHero: failed to fetch course stats', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCourseStatsLoading(false);
        }
      }
    };

    void fetchStats();
    return () => controller.abort();
  }, [courseTarget, startHere?.totalLessons, startHere?.completedLessons, getToken]);

  if (isAnonymous) {
    return (
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] p-8 text-white shadow-2xl shadow-black/40">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">{heroCopy.loginTitle}</p>
            <h2 className="mt-2 text-3xl font-semibold text-[#fdd87c]">{heroCopy.loginHeading}</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">{heroCopy.loginDescription}</p>
          </div>
          <Link href="/login">
            <Button
              size="lg"
              className="gap-2 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
            >
              {heroCopy.loginAction}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-8 text-sm text-rose-100">
        {heroCopy.error}
      </div>
    );
  }

  const tips = buildTips(heroLanguage, startHere?.slug || 'comeca-aqui');

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] p-8 text-white shadow-2xl shadow-black/40">
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-cyan-500/15 px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-cyan-100">
            <Shield className="h-3 w-3 text-cyan-300" />
            {heroCopy.badge}
          </div>
          <h2 className="mt-4 text-4xl font-semibold text-[#fdd87c]">{heroTitle}</h2>
          <p className="mt-3 text-sm text-slate-300 max-w-2xl">{heroDescription}</p>

          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            {languagesToRender.map((code) => {
              const meta = LANGUAGE_METADATA[code];
              const isAvailable = availableLanguages.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => isAvailable && setActiveLanguage(code)}
                  disabled={!isAvailable}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-4 py-2 transition',
                    isAvailable
                      ? activeLanguage === code
                        ? 'border-cyan-300 bg-cyan-300/10 text-white'
                        : 'border-white/20 text-slate-200 hover:border-cyan-200 hover:text-white'
                      : 'border-white/10 text-slate-500 cursor-not-allowed',
                  )}
                >
                  <Globe className="h-3 w-3" />
                  <span>{meta?.label || code.toUpperCase()}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-4 text-sm text-slate-300 md:flex-row md:items-center">
            <div className="flex items-center gap-2 text-slate-200">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <span>
                {heroCopy.contentAvailable}{' '}
                {availableLanguages
                  .map((code) => LANGUAGE_METADATA[code]?.label || code.toUpperCase())
                  .join(', ')}
              </span>
            </div>
            {levelSummary && (
              <div className="flex items-center gap-2 text-slate-200">
                <Target className="h-4 w-4 text-cyan-300" />
                <span>
                  {heroCopy.currentLevel}:{' '}
                  <strong>{translateLevelLabel(levelSummary.key, heroLanguage, levelSummary.label)}</strong>{' '}
                  <span className="text-slate-400">· {levelHint}</span>
                </span>
              </div>
            )}
          </div>

          {startHere?.isCompleted && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/70 bg-cyan-500/10 px-4 py-2 text-sm text-white">
              <CheckCircle className="h-4 w-4 text-[#5af3ff]" />
              <span>{heroCopy.completed}</span>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={nextContentTarget.href}>
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              type="button"
              variant="ghost"
              className="text-slate-200 hover:text-white"
              onClick={() => setIsRoadmapOpen(true)}
            >
              {heroCopy.viewRoadmap}
            </Button>
          </div>
          {nextContentTarget.type === 'course' && (
            <div className="mt-2 text-xs text-slate-400">
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                {heroCopy.nextContentLabel}
              </p>
              <p className="text-sm text-white">
                {nextContentTarget.levelName
                  ? `${nextContentTarget.levelName} · ${nextContentTarget.courseName}`
                  : nextContentTarget.courseName}
              </p>
            </div>
          )}

          {isFallback && (
            <div className="mt-4 rounded-2xl border border-amber-400/30 bg-[#231903] px-4 py-3 text-xs text-amber-100">
              {heroCopy.fallback}
            </div>
          )}
        </div>

        <div className="flex w-full max-w-sm flex-col items-center justify-center">
          <div className="relative h-48 w-48">
            <div
              className="absolute inset-0 rounded-full border border-white/15 bg-[#031a24]"
              style={{
                background: `conic-gradient(#22d3ee ${Math.min(
                  completionPercent,
                  100,
                )}%, rgba(255,255,255,0.08) 0)`,
              }}
            />
            <div className="absolute inset-[18px] rounded-full bg-[#000c12] flex flex-col items-center justify-center text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">{heroCopy.progress}</p>
              <p className="mt-1 text-3xl font-semibold text-[#fdd87c]">
                {Math.min(completionPercent, 100)}%
              </p>
              <p className="text-xs text-slate-300">{lessonsStatus}</p>
            </div>
          </div>
          {isLoading && (
            <p className="mt-4 text-sm text-slate-300">
              {heroCopy.loading}
            </p>
          )}
        </div>
      </div>
      <RoadmapDialog
        open={isRoadmapOpen}
        onOpenChange={setIsRoadmapOpen}
        summary={summary}
        startCourseSlug={startHere?.slug || 'comeca-aqui'}
        tips={tips}
      />
    </div>
  );
}

type RoadmapDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: ProgressSummary | null;
  startCourseSlug: string;
  tips: Array<{ label: string; description: string; href: string }>;
};

type ModalLevel = {
  slug: string;
  title: string;
  minXp?: number | null;
  maxXp?: number | null;
  isUnlocked: boolean;
  progressPercent: number;
  lockedReason?: string | null;
};

function RoadmapDialog({ open, onOpenChange, summary, startCourseSlug, tips }: RoadmapDialogProps) {
  const xpTotal = summary?.xp?.total ?? 0;
  const currentLevelKey = summary?.xp?.currentLevel?.key ?? null;
  const levels = useMemo<ModalLevel[]>(() => {
    if (summary?.levels?.length) {
      return summary.levels
        .filter((level) => level.isVisible)
        .map((level) => ({
          slug: level.slug,
          title: level.title,
          minXp: level.minXp,
          maxXp: level.maxXp,
          isUnlocked: level.isUnlocked,
          progressPercent: level.progressPercent,
          lockedReason: level.lockedReason,
        }));
    }
    return XP_LEVELS.map((level) => {
      const maxXp = (level as { max?: number }).max ?? null;
      const unlocked = xpTotal >= level.min;
      const progressPercent =
        unlocked && typeof maxXp === 'number'
          ? Math.min(
              100,
              Math.round(
                ((Math.min(xpTotal, maxXp) - level.min) / Math.max((maxXp ?? level.min + 1) - level.min, 1)) *
                  100,
              ),
            )
          : unlocked
            ? 5
            : 0;

      return {
        slug: level.key,
        title: level.label,
        minXp: level.min,
        maxXp,
        isUnlocked: unlocked,
        progressPercent,
        lockedReason: unlocked ? null : 'Ganha mais XP para desbloquear.',
      };
    });
  }, [summary, xpTotal]);

  const currentLevel = summary?.xp?.currentLevel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#01050b] text-white border border-white/10 max-w-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-semibold text-white">Mapa de Percursos</DialogTitle>
          <p className="text-sm text-slate-300">
            Visualiza os níveis disponíveis, acompanha o teu XP e descobre como ganhar mais pontos.
          </p>
        </DialogHeader>
        <div className="space-y-6 text-sm text-slate-200">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">O teu XP</p>
            <div className="mt-1 text-3xl font-semibold text-white">{xpTotal.toLocaleString()} XP</div>
            <p className="text-xs text-slate-300">
              {currentLevel?.label || 'Cadete'}
              {currentLevel?.nextLevelLabel && typeof currentLevel?.xpToNext === 'number'
                ? ` · ${currentLevel.xpToNext} XP para ${currentLevel.nextLevelLabel}`
                : ''}
            </p>
          </div>

          <div className="space-y-3">
            {levels.map((level) => {
              const isCurrent = currentLevelKey ? currentLevelKey === level.slug : false;
              const minText =
                typeof level.minXp === 'number' ? level.minXp.toLocaleString() : '0';
              const maxText =
                typeof level.maxXp === 'number' ? level.maxXp.toLocaleString() : '∞';
              const rangeText =
                typeof level.maxXp === 'number' ? `${minText}-${maxText} XP` : `${minText}+ XP`;
              return (
                <div
                  key={level.slug}
                  className={cn(
                    'rounded-2xl border border-white/10 bg-[#02060d] p-4 transition',
                    isCurrent && 'border-cyan-300 bg-cyan-300/10 shadow-[0_0_25px_rgba(34,211,238,0.25)]',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{level.title}</p>
                      <p className="text-xs text-slate-400">{rangeText}</p>
                    </div>
                    <span className="text-xs text-slate-300">
                      {Math.min(level.progressPercent ?? 0, 100)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-cyan-300 transition-all"
                      style={{ width: `${Math.min(level.progressPercent ?? 0, 100)}%` }}
                    />
                  </div>
                  {!level.isUnlocked && (
                    <p className="mt-2 text-xs text-slate-400">{level.lockedReason}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Dicas para subir XP</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              {tips.map((tip) => (
                <Link
                  key={tip.label}
                  href={tip.href}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#000c12] px-4 py-3 text-left hover:border-cyan-300 transition"
                >
                  <div>
                    <p className="font-semibold text-white">{tip.label}</p>
                    <p className="text-xs text-slate-400">{tip.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-cyan-300" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type TipsEntry = { label: string; description: string; href: string };

function buildTips(language: SupportedHeroLanguage, slug: string): TipsEntry[] {
  const entries = HERO_TIPS[language] || HERO_TIPS.en;
  return entries.map((tip) => ({
    label: tip.label,
    description: tip.description,
    href: tip.href(slug),
  }));
}

function getContentByLanguage(value: any, lang: string): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const normalized = lang.toLowerCase();
    if (typeof value[normalized] === 'string') {
      return value[normalized];
    }
    const fallbackOrder = ['pt', 'en', 'es'];
    for (const key of fallbackOrder) {
      if (typeof value[key] === 'string') {
        return value[key];
      }
    }
  }
  return '';
}

function translateLevelLabel(value: string | null | undefined, lang: Language, fallback?: string): string {
  if (!value && fallback) {
    value = fallback;
  }
  if (!value) return fallback || '';

  const normalized = value.toLowerCase();
  const slug =
    LEVEL_KEY_TO_SLUG[value as keyof typeof LEVEL_KEY_TO_SLUG] ||
    LEVEL_KEY_TO_SLUG[normalized as keyof typeof LEVEL_KEY_TO_SLUG] ||
    mapLabelToSlug(value);

  if (slug && LEVEL_TRANSLATIONS[slug]) {
    const translations = LEVEL_TRANSLATIONS[slug];
    return translations[lang] || translations.en || translations.pt || fallback || value;
  }

  return fallback || value;
}

function mapLabelToSlug(label: string): string | null {
  const normalized = label.trim().toLowerCase();
  for (const [slug, translations] of Object.entries(LEVEL_TRANSLATIONS)) {
    const values = Object.values(translations)
      .filter(Boolean)
      .map((val) => val!.toLowerCase());
    if (values.includes(normalized)) {
      return slug;
    }
  }
  return null;
}

function normalizeLevelSlugValue(value?: string | null): string {
  if (!value) return '';
  return value.toString().trim().toLowerCase().replace(/[\s_]+/g, '-');
}
