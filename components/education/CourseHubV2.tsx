import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { type LevelCourseSummary } from '@/lib/education/unlockEngine';

type UnlockStateResponse = {
  success: boolean;
  unlockState?: {
    startHere: {
      courseId: string | null;
      slug: string;
      totalLessons: number;
      completedLessons: number;
      progressPercent: number;
      isCompleted: boolean;
      missingLessons: number;
    };
    levels: Array<{
      slug: string;
      title: string;
      isVisible: boolean;
      isUnlocked: boolean;
      isCompleted: boolean;
      progressPercent: number;
      lockedReason: string | null;
    }>;
    coursesByLevel?: Record<string, LevelCourseSummary[]>;
  };
};

const LOCK_ICON = (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const LEVEL_HELPERS: Record<
  string,
  {
    accent: string;
    bg: string;
    description: string;
  }
> = {
  cadets: {
    accent: 'from-emerald-500/40 via-emerald-500/10',
    bg: 'bg-emerald-500/10',
    description: 'Fundação Web3 • Missões diárias • XP essencial',
  },
  juveniles: {
    accent: 'from-blue-500/40 via-blue-500/10',
    bg: 'bg-blue-500/10',
    description: 'Estratégias avançadas • Projectos colaborativos',
  },
  juniors: {
    accent: 'from-purple-500/40 via-purple-500/10',
    bg: 'bg-purple-500/10',
    description: 'Especialização Web3 • Mentorias',
  },
  seniors: {
    accent: 'from-orange-500/40 via-orange-500/10',
    bg: 'bg-orange-500/10',
    description: 'Liderança & inovação • Conteúdo exclusivo',
  },
};

const formatLevelName = (slug: string) =>
  slug.charAt(0).toUpperCase() + slug.slice(1);

const START_SECTION_TITLE = 'Grelha de Partida';
const LEVELS_SECTION_TITLE = 'Níveis';

type FetchStatus = 'idle' | 'loading' | 'error' | 'success';

export function CourseHubV2() {
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [unlockState, setUnlockState] = useState<
    UnlockStateResponse['unlockState'] | null
  >(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUnlockState = async () => {
      setStatus('loading');
      try {
        const response = await fetch('/api/education/unlock-state', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load unlock state');
        }

        const data: UnlockStateResponse = await response.json();

        if (!isMounted) return;

        if (!data.success || !data.unlockState) {
          setStatus('error');
          return;
        }

        setUnlockState(data.unlockState);
        setStatus('success');
      } catch (error) {
        console.error('CourseHubV2 failed to fetch unlock-state:', error);
        if (!isMounted) return;
        setStatus('error');
      }
    };

    fetchUnlockState();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleLevel = useCallback((slug: string) => {
    setExpandedLevel((prev) => (prev === slug ? null : slug));
  }, []);

  const levelCards = useMemo(() => {
    if (!unlockState) return [];
    const coursesMap = unlockState.coursesByLevel || {};
    return unlockState.levels
      .filter((level) => level.isVisible)
      .map((level) => {
        const styles = LEVEL_HELPERS[level.slug] || {
          accent: 'from-slate-500/30 via-slate-500/10',
          bg: 'bg-slate-500/10',
          description: '',
        };

        const isLocked = !level.isUnlocked;
        const isCompleted = level.isCompleted;
        const isExpanded = expandedLevel === level.slug;
        const statusLabel = isCompleted
          ? 'Concluído'
          : isLocked
            ? 'Bloqueado'
            : 'Desbloqueado';
        const courses = coursesMap[level.slug] || [];

        return (
          <div key={level.slug}>
            <button
              type="button"
              onClick={() => handleToggleLevel(level.slug)}
              className={cn(
                'group relative w-full rounded-3xl border border-white/10 bg-[#050b10] p-6 text-left text-white shadow-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80',
                'before:absolute before:inset-0 before:-z-10 before:rounded-3xl before:bg-gradient-to-br',
                styles.accent,
                isLocked ? 'opacity-60' : 'opacity-100',
                isExpanded ? 'border-cyan-400/70' : '',
              )}
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                <span>{formatLevelName(level.slug)}</span>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-[0.7rem]',
                    isCompleted
                      ? 'border border-emerald-400/50 text-emerald-300'
                      : isLocked
                        ? 'border border-slate-500 text-slate-300'
                        : 'border border-sky-400/50 text-sky-200',
                  )}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl font-semibold">
                    {level.title || formatLevelName(level.slug)}
                  </div>
                  {styles.description && (
                    <p className="mt-2 text-sm text-slate-400">
                      {styles.description}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs text-slate-400 transition-transform',
                    isExpanded ? 'rotate-90' : 'rotate-0',
                  )}
                >
                  →
                </span>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span>Progresso</span>
                  <span>{level.progressPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all',
                      styles.bg.replace('bg-', 'bg-'),
                    )}
                    style={{ width: `${Math.min(level.progressPercent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4 text-sm">
                {isLocked ? (
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-200">{LOCK_ICON}</span>
                    <p className="text-xs text-slate-300">
                      {level.lockedReason || 'Completa o nível anterior.'}
                    </p>
                  </div>
                ) : (
                  <span className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-white/30 hover:bg-white/10">
                    Ver cursos
                    <span className="inline-block transition group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                )}

                {isCompleted && (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                    Conclu?do
                  </span>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="mt-4 rounded-3xl border border-white/10 bg-black/40 p-4 text-sm text-white">
                {courses.length === 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center text-slate-300">
                    Ainda não existem cursos atribuídos a este nível.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courses.map((course) => {
                      const isCourseLocked = isLocked;
                      const coursePath = course.slug
                        ? `/education/courses/${course.slug}`
                        : `/education/courses/${course.id}`;

                      return (
                        <div
                          key={course.id}
                          className={cn(
                            'flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 md:flex-row md:items-center md:justify-between',
                            isCourseLocked ? 'opacity-70' : 'opacity-100',
                          )}
                        >
                          <div>
                            <div className="text-base font-semibold text-white">
                              {course.title}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                              {course.isRequired && (
                                <span className="rounded-full border border-slate-500/70 px-2 py-0.5">
                                  Obrigatório
                                </span>
                              )}
                              {course.isStartCourse && (
                                <span className="rounded-full border border-cyan-400/50 px-2 py-0.5 text-cyan-200">
                                  Ponto de partida
                                </span>
                              )}
                              {course.isCompleted && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 px-2 py-0.5 text-emerald-200">
                                  <CheckCircle className="h-3 w-3" />
                                  Conclu?do
                                </span>
                              )}
                            </div>
                          </div>

                          {isCourseLocked ? (
                            <div className="flex items-center gap-2 text-xs text-slate-300">
                              {LOCK_ICON}
                              <span>Nível bloqueado</span>
                            </div>
                          ) : (
                            <Link
                              href={coursePath}
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:border-white/60"
                            >
                              Ver curso
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      });
  }, [unlockState, expandedLevel, handleToggleLevel]);


  const startCard = useMemo(() => {
    const start = unlockState?.startHere;
    if (!start) return null;

    return (
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 shadow-2xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
              Curso inicial
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-white">
              COMEÇA AQUI
            </h3>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Lança a tua jornada Web3. Completa este curso para desbloquear o nível Cadetes.
            </p>
          </div>
          <div className="flex w-full flex-col items-center gap-4 md:w-80">
            <div className="w-full">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                <span>Progresso</span>
                <span>
                  {start.completedLessons}/{start.totalLessons} lições
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-500 transition-all"
                  style={{ width: `${Math.min(start.progressPercent, 100)}%` }}
                />
              </div>
            </div>
            <Link
              href={
                start.isCompleted
                  ? '/education/courses'
                  : `/education/courses/${start.slug}`
              }
              className={cn(
                'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition',
                start.isCompleted
                  ? 'border border-white/20 text-white hover:border-white/40 hover:bg-white/5'
                  : 'bg-white text-black hover:bg-slate-100',
              )}
            >
              {start.isCompleted ? 'Explorar cursos' : 'Continuar curso'}
              <span className="inline-block transition group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }, [unlockState]);

  const isLoading = status === 'loading' || status === 'idle';
  const hasError = status === 'error';

  return (
    <div className="space-y-10 rounded-3xl border border-white/5 bg-[#02070d] p-6 shadow-inner shadow-black/40 sm:p-8">
      <div>
        <div className="flex items-center gap-3 text-sm uppercase tracking-[0.4em] text-slate-500">
          <span className="h-px flex-1 bg-slate-700/50" />
          {START_SECTION_TITLE}
          <span className="h-px flex-1 bg-slate-700/50" />
        </div>
        <h2 className="mt-4 text-3xl font-semibold text-white">
          {unlockState?.startHere?.isCompleted
            ? 'Pronto para novos desafios'
            : 'Tudo começa aqui'}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Completa o curso inicial para desbloquear a Academia Legacy.
        </p>
      </div>

      {isLoading && (
        <div className="rounded-3xl border border-white/5 bg-black/20 p-6 text-center text-sm text-slate-400">
          A carregar o teu progresso...
        </div>
      )}

      {hasError && (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-200">
          Não foi possível carregar a Grelha de Partida. Atualiza a página ou tenta novamente mais tarde.
        </div>
      )}

      {!isLoading && !hasError && startCard}

      <div className="pt-4">
        <div className="flex items-center gap-3 text-sm uppercase tracking-[0.4em] text-slate-500">
          <span className="h-px flex-1 bg-slate-700/50" />
          {LEVELS_SECTION_TITLE}
          <span className="h-px flex-1 bg-slate-700/50" />
        </div>
        <h2 className="mt-4 text-3xl font-semibold text-white">
          Desbloqueia a tua progressão
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Progride pelos níveis e desbloqueia conteúdo premium da Academia Legacy.
        </p>

        {isLoading && (
          <div className="mt-6 rounded-3xl border border-white/5 bg-black/20 p-6 text-center text-sm text-slate-400">
            A sincronizar estados dos níveis...
          </div>
        )}

        {hasError && (
          <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-200">
            Não foi possível carregar os níveis. Volta mais tarde.
          </div>
        )}

        {!isLoading && !hasError && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {levelCards.length > 0 ? (
              levelCards
            ) : (
              <div className="col-span-full rounded-3xl border border-white/5 bg-black/20 p-6 text-center text-sm text-slate-400">
                Nenhum nível disponível neste momento.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseHubV2;
