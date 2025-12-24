'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Globe, ArrowRight, CheckCircle, Shield, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProgressSummary } from '@/lib/education/progressSummary';
import type { ProgressFetchState } from '@/components/education/LevelTimeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { XP_LEVELS } from '@/lib/education/xpLevels';

const LANGUAGE_METADATA: Record<
  string,
  {
    label: string;
    code: string;
  }
> = {
  pt: { label: 'Português', code: 'PT' },
  es: { label: 'Español', code: 'ES' },
  en: { label: 'English', code: 'EN' },
};

type StartHereHeroProps = {
  summary: ProgressSummary | null;
  state: ProgressFetchState;
  preferredLanguage?: string;
};

export function StartHereHero({
  summary,
  state,
  preferredLanguage,
}: StartHereHeroProps) {
  const startHere = summary?.startHere;
  const startCourse = summary?.startCourse;

  const availableLanguages = useMemo(() => {
    if (!startCourse?.available_languages) {
      return ['pt', 'es', 'en'];
    }
    return startCourse.available_languages.map((lang) => lang.toLowerCase());
  }, [startCourse]);

  const defaultLanguage = useMemo(() => {
    const preference = (preferredLanguage || startCourse?.primary_language || 'pt').toLowerCase();
    if (availableLanguages.includes(preference)) {
      return preference;
    }
    return availableLanguages[0] || 'pt';
  }, [availableLanguages, preferredLanguage, startCourse?.primary_language]);

  const [activeLanguage, setActiveLanguage] = useState(defaultLanguage);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [courseStats, setCourseStats] = useState<{ totalLessons: number } | null>(null);
  const [isCourseStatsLoading, setIsCourseStatsLoading] = useState(false);

  useEffect(() => {
    setActiveLanguage(defaultLanguage);
  }, [defaultLanguage]);

  const isLoading = state === 'idle' || state === 'loading';
  const hasError = state === 'error';
  const isAnonymous = state === 'anonymous';
  const isFallback = state === 'fallback';

  const totalLessonsFromSummary = startHere?.totalLessons ?? 0;
  const totalLessonsDerived =
    courseStats?.totalLessons && courseStats.totalLessons > 0
      ? courseStats.totalLessons
      : totalLessonsFromSummary;
  const completedLessonsRaw = startHere?.completedLessons ?? 0;
  const completedLessons = Math.min(
    completedLessonsRaw,
    totalLessonsDerived || completedLessonsRaw,
  );
  const completionPercent =
    totalLessonsDerived > 0
      ? Math.min(100, Math.round((completedLessons / totalLessonsDerived) * 100))
      : startHere?.progressPercent ?? 0;
  const hasStarted = completedLessons > 0;
  const isCompleted = Boolean(startHere?.isCompleted);
  const heroTitle =
    getContentByLanguage(startCourse?.title, activeLanguage) || 'COMEÇA AQUI';
  const heroDescription =
    getContentByLanguage(startCourse?.description, activeLanguage) ||
    'O teu ponto de partida obrigatório na Academia Legacy.';

  const courseTarget =
    startHere?.courseId ||
    startCourse?.slug ||
    startHere?.slug ||
    'comeca-aqui';
  const ctaHref = `/education/courses/${courseTarget}`;

  const ctaLabel = !hasStarted ? 'Começar Curso' : !isCompleted ? 'Continuar Curso' : 'Rever Curso';
  const progressLabel =
    totalLessonsDerived > 0
      ? `${completedLessons}/${totalLessonsDerived} lições`
      : isCourseStatsLoading
        ? 'A sincronizar lições...'
        : '0 lições registadas';
  const levelSummary = summary?.xp?.currentLevel;
  const levelHint =
    levelSummary?.nextLevelLabel && typeof levelSummary?.xpToNext === 'number'
      ? `${levelSummary.xpToNext} XP para ${levelSummary.nextLevelLabel}`
      : 'Nível máximo desbloqueado';

  const languagesToRender = Object.keys(LANGUAGE_METADATA);

  useEffect(() => {
    const summaryLessons = startHere?.totalLessons ?? 0;
    if (!courseTarget || summaryLessons > 0) {
      setCourseStats(null);
      setIsCourseStatsLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchStats = async () => {
      setIsCourseStatsLoading(true);
      try {
        const response = await fetch(`/api/courses/${courseTarget}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (response.ok && data?.success && data?.course) {
          const modules = Array.isArray(data.course.modules) ? data.course.modules : [];
          const lessons = modules.reduce((acc: number, mod: any) => {
            if (!Array.isArray(mod?.lessons)) return acc;
            return acc + mod.lessons.length;
          }, 0);
          if (lessons > 0) {
            setCourseStats({ totalLessons: lessons });
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
  }, [courseTarget, startHere?.totalLessons]);

  if (isAnonymous) {
    return (
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#03121c] to-[#02070d] p-8 text-white shadow-[0_35px_80px_rgba(2,7,13,0.65)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Primeiro passo</p>
            <h2 className="mt-2 text-3xl font-semibold">COMEÇA AQUI está bloqueado</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">
              Cria conta ou autentica-te para desbloquear o curso obrigatório em Português, Espanhol e Inglês.
            </p>
          </div>
          <Link href="/login">
            <Button size="lg" className="gap-2">
              Iniciar sessão
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
        Não foi possível carregar o estado do curso inicial. Tenta novamente mais tarde.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#03121c] via-[#020b14] to-[#050d18] p-8 text-white shadow-[0_35px_80px_rgba(2,7,13,0.65)]">
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200">
            <Shield className="h-3 w-3 text-cyan-300" />
            curso obrigatório
          </div>
          <h2 className="mt-4 text-4xl font-semibold">{heroTitle}</h2>
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
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <span>
                Conteúdo disponível em{' '}
                {availableLanguages
                  .map((code) => LANGUAGE_METADATA[code]?.label || code.toUpperCase())
                  .join(', ')}
              </span>
            </div>
            {levelSummary && (
              <div className="flex items-center gap-2 text-slate-200">
                <Target className="h-4 w-4 text-cyan-300" />
                <span>
                  Nível atual: <strong>{levelSummary.label}</strong>{' '}
                  <span className="text-slate-400">· {levelHint}</span>
                </span>
              </div>
            )}
          </div>

          {startHere?.isCompleted && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              <CheckCircle className="h-4 w-4" />
              <span>Curso concluído · podes avançar para Cadetes</span>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {!isCompleted && (
              <Link href={ctaHref}>
                <Button size="lg" className="gap-2">
                  {hasStarted ? 'Continuar Curso' : 'Começar Curso'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Button
              type="button"
              variant="ghost"
              className="text-slate-200"
              onClick={() => setIsRoadmapOpen(true)}
            >
              Ver Percursos
            </Button>
          </div>

          {isFallback && (
            <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
              Estamos a mostrar o progresso deste curso com base no teu XP local. Assim que o servidor sincronizar vais ver detalhes completos.
            </div>
          )}

        </div>

        <div className="flex w-full max-w-sm flex-col items-center justify-center">
          <div className="relative h-48 w-48">
            <div
              className="absolute inset-0 rounded-full border border-white/10 bg-white/5"
              style={{
                background: `conic-gradient(#22d3ee ${Math.min(
                  completionPercent,
                  100,
                )}%, rgba(255,255,255,0.08) 0)`,
              }}
            />
            <div className="absolute inset-[18px] rounded-full bg-[#02070d] flex flex-col items-center justify-center text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Progresso</p>
              <p className="mt-1 text-3xl font-semibold text-white">
                {Math.min(completionPercent, 100)}%
              </p>
              <p className="text-xs text-slate-400">{progressLabel}</p>
            </div>
          </div>
          {isLoading && (
            <p className="mt-4 text-sm text-slate-400">
              A carregar progresso do curso...
            </p>
          )}
        </div>
      </div>
      <RoadmapDialog
        open={isRoadmapOpen}
        onOpenChange={setIsRoadmapOpen}
        summary={summary}
        startCourseSlug={startHere?.slug || 'comeca-aqui'}
      />
    </div>
  );
}

type RoadmapDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: ProgressSummary | null;
  startCourseSlug: string;
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

function RoadmapDialog({ open, onOpenChange, summary, startCourseSlug }: RoadmapDialogProps) {
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

  const tips = [
    {
      label: 'Explorar Cursos',
      href: '/education/courses',
      description: 'Escolhe novos módulos para acumular XP rapidamente.',
    },
    {
      label: 'Voltar ao COMEÇA AQUI',
      href: `/education/courses/${startCourseSlug}`,
      description: 'Completa lições em falta para desbloquear Cadetes.',
    },
    {
      label: 'Ler o Blog',
      href: '/blog',
      description: 'Aprende diariamente e garante XP adicional por atividade.',
    },
  ];

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
