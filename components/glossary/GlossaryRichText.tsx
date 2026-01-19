'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type {
  GlossaryLanguage,
  GlossaryTerm,
} from '@/types/glossary';
import { cn } from '@/lib/utils';
import { AlertCircle, Award, CheckCircle2, Loader2, Lock, Timer, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type Props = {
  html: string;
  className?: string;
};

type ActiveTermState = {
  slug: string;
  label: string;
  node: HTMLElement | null;
};

type PopoverPosition = {
  top: number;
  left: number;
};

const PROGRESS_SECONDS = 30;

type GlossaryDefinitionKey = `definition_${GlossaryLanguage}`;
type GlossaryExampleKey = `example_${GlossaryLanguage}`;

const FALLBACK_DEFINITION =
  'Estamos a carregar a definição deste conceito.';

export function GlossaryRichText({ html, className }: Props) {
  const { user, getToken, refreshUser } = useAuth();
  const { language } = useLanguage();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<Map<string, GlossaryTerm>>(new Map());

  const [mounted, setMounted] = useState(false);
  const [activeTerm, setActiveTerm] = useState<ActiveTermState | null>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [termData, setTermData] = useState<GlossaryTerm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressSeconds, setProgressSeconds] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [awardingXp, setAwardingXp] = useState(false);
  const [termCompletion, setTermCompletion] = useState<{
    termId: string;
    completedAt: string;
  } | null>(null);

  const resolvedLanguage = useMemo<GlossaryLanguage>(() => {
    if (language === 'pt' || language === 'en' || language === 'es') {
      return language;
    }
    return 'pt';
  }, [language]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const persistUserXP = useCallback(
    (newTotal?: number) => {
      if (typeof newTotal !== 'number' || Number.isNaN(newTotal)) return;
      if (typeof window === 'undefined') return;
      try {
        const stored = localStorage.getItem('user');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        parsed.xp_total = newTotal;
        localStorage.setItem('user', JSON.stringify(parsed));
        refreshUser?.();
      } catch (err) {
        console.error('Failed to persist XP locally:', err);
      }
    },
    [refreshUser],
  );

  const registerCompletion = useCallback(async () => {
    if (!termData?.id) return;
    const token = getToken?.();
    if (!token) {
      setProgressError('Sessão expirada. Inicia sessão para receber XP.');
      return;
    }

    setAwardingXp(true);
    setProgressError(null);

    try {
      const res = await fetch(`/api/glossary/${termData.id}/read`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Não foi possível registar o XP.');
      }

      if (!data?.alreadyCompleted) {
        persistUserXP(data?.newTotal);
        setProgressMessage('2 XP registados!');
      } else {
        setProgressMessage('Leitura já registada.');
      }

      const completionPayload = data?.completion
        ? {
            termId: data.completion.termId as string,
            completedAt: data.completion.completedAt as string,
          }
        : {
            termId: termData.id,
            completedAt: new Date().toISOString(),
          };

      setTermCompletion(completionPayload);
    } catch (err) {
      console.error('Failed to register glossary XP:', err);
      setProgressError(
        err instanceof Error
          ? err.message
          : 'Não foi possível registar o XP. Tenta novamente.',
      );
    } finally {
      setAwardingXp(false);
    }
  }, [getToken, termData?.id, persistUserXP]);

  const closePopover = useCallback(() => {
    clearProgressTimer();
    setActiveTerm(null);
    setPosition(null);
    setError(null);
    setTermData(null);
    setTermCompletion(null);
    setProgressSeconds(0);
    setProgressMessage(null);
    setProgressError(null);
    setAwardingXp(false);
  }, []);

  const updatePosition = useCallback((node: HTMLElement | null) => {
    if (!node) {
      setPosition(null);
      return;
    }
    const rect = node.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const handleClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest(
        '[data-glossary-term="true"]',
      ) as HTMLElement | null;

      if (!target) {
        if (
          popoverRef.current &&
          popoverRef.current.contains(event.target as Node)
        ) {
          return;
        }
        closePopover();
        return;
      }

      event.preventDefault();

      const slug = target.getAttribute('data-slug');
      const label =
        target.getAttribute('data-label') ||
        target.textContent ||
        '';

      if (!slug) return;

      setActiveTerm({ slug, label, node: target });
      setTermCompletion(null);
      setProgressSeconds(0);
      setProgressMessage(null);
      setProgressError(null);
      updatePosition(target);
    };

    root.addEventListener('click', handleClick);

    return () => {
      root.removeEventListener('click', handleClick);
    };
  }, [closePopover, updatePosition, html]);

  useEffect(() => {
    if (!activeTerm?.node) {
      return;
    }

    const recalc = () => updatePosition(activeTerm.node);

    recalc();
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);

    return () => {
      window.removeEventListener('scroll', recalc, true);
      window.removeEventListener('resize', recalc);
    };
  }, [activeTerm?.node, updatePosition]);

  useEffect(() => {
    if (!activeTerm) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTerm = (target as HTMLElement | null)?.closest(
        '[data-glossary-term="true"]',
      );
      if (
        popoverRef.current?.contains(target) ||
        clickedTerm
      ) {
        return;
      }
      closePopover();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopover();
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeTerm, closePopover]);

  useEffect(() => {
    if (!activeTerm) {
      setError(null);
      setTermData(null);
      setLoading(false);
      setTermCompletion(null);
      setProgressSeconds(0);
      setProgressMessage(null);
      setProgressError(null);
      return;
    }

    if (!user) {
      setTermData(null);
      setError('Disponível apenas para membros registados.');
      setLoading(false);
      setTermCompletion(null);
      setProgressSeconds(0);
      setProgressMessage(null);
      setProgressError(null);
      return;
    }

    const cached = cacheRef.current.get(activeTerm.slug);
    if (cached) {
      setTermData(cached);
      setError(null);
    }
    let isMounted = true;
    setLoading(!cached);
    setError(null);

    const loadTerm = async () => {
      try {
        const token = getToken?.();
        const res = await fetch(`/api/glossary/by-slug/${activeTerm.slug}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();

        if (!res.ok || !data?.success || !data?.term) {
          throw new Error(
            data?.error || 'Não foi possível carregar a definição.',
          );
        }

        if (!isMounted) return;

        cacheRef.current.set(activeTerm.slug, data.term as GlossaryTerm);
        setTermData(data.term as GlossaryTerm);
        if (data.completion?.termId) {
          setTermCompletion({
            termId: data.completion.termId as string,
            completedAt: data.completion.completedAt as string,
          });
          setProgressSeconds(PROGRESS_SECONDS);
          setProgressMessage((prev) => prev ?? 'Leitura concluída.');
        } else {
          setTermCompletion(null);
        }
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error('Glossary term fetch failed:', err);
        const message =
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar a definição.';
        setError(message);
        setTermData(null);
        setTermCompletion(null);
        setProgressSeconds(0);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTerm();

    return () => {
      isMounted = false;
    };
  }, [activeTerm, user, getToken]);

  useEffect(() => {
    clearProgressTimer();
    setProgressError(null);

    if (!activeTerm || !termData || !user) {
      setProgressSeconds(0);
      if (!activeTerm) {
        setProgressMessage(null);
      }
      return;
    }

    if (termData.status !== 'published') {
      setProgressSeconds(PROGRESS_SECONDS);
      setProgressMessage('Este termo está em rascunho. XP indisponível.');
      return;
    }

    if (termCompletion) {
      setProgressSeconds(PROGRESS_SECONDS);
      setProgressMessage((prev) => prev ?? 'Leitura concluída.');
      return;
    }

    setProgressSeconds(0);
    setProgressMessage(null);
    progressTimerRef.current = setInterval(() => {
      setProgressSeconds((prev) => {
        const next = Math.min(PROGRESS_SECONDS, prev + 1);
        if (next >= PROGRESS_SECONDS) {
          clearProgressTimer();
          void registerCompletion();
        }
        return next;
      });
    }, 1000);

    return () => clearProgressTimer();
  }, [
    activeTerm,
    activeTerm?.slug,
    termData,
    termData?.id,
    termData?.status,
    user,
    user?.id,
    termCompletion,
    registerCompletion,
  ]);

  const content = useMemo(() => {
    return { __html: html };
  }, [html]);

  const renderPopover = () => {
    if (!activeTerm || !position) return null;

    const showLogin = !user;

    const definitionKey =
      `definition_${resolvedLanguage}` as GlossaryDefinitionKey;
    const exampleKey =
      `example_${resolvedLanguage}` as GlossaryExampleKey;

    const displayDefinition =
      (termData?.[
        definitionKey as keyof GlossaryTerm
      ] as string | undefined) || FALLBACK_DEFINITION;
    const displayExample =
      (termData?.[
        exampleKey as keyof GlossaryTerm
      ] as string | null | undefined) || null;
    const progressPercent = Math.min(
      100,
      (progressSeconds / PROGRESS_SECONDS) * 100,
    );
    const remainingSeconds = Math.max(
      0,
      PROGRESS_SECONDS - progressSeconds,
    );
    const isPublished = termData?.status === 'published';
    const hasCompletion = Boolean(termCompletion);

    return (
      <div
        ref={popoverRef}
        className="fixed z-50 w-[min(360px,calc(100vw-32px))] rounded-2xl border border-[#34d399]/40 bg-[#02131d] p-4 shadow-[0_12px_45px_rgba(0,0,0,0.65)] text-slate-100"
        style={{
          top: position.top,
          left: position.left,
          transform: 'translate(-50%, 0)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
              Glossário Legacy
            </p>
            <h4 className="text-lg font-semibold text-[#fdd87c]">
              {activeTerm.label}
            </h4>
          </div>
          <button
            onClick={closePopover}
            aria-label="Fechar pop-up do glossário"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showLogin ? (
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-200">
            <div className="flex items-center gap-2 text-amber-300">
              <Lock className="h-4 w-4" />
              Apenas membros registados
            </div>
            <p>
              Entra na tua conta para desbloquear as definições completas do
              Glossário Legacy.
            </p>
            <div className="flex gap-2">
              <Link
                href="/login"
                className="flex-1 rounded-full bg-gradient-to-r from-[#0f172a] to-[#0f766e] px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Entrar
              </Link>
              <Link
                href="/signup"
                className="flex-1 rounded-full border border-white/20 px-4 py-2 text-center text-sm font-semibold text-white hover:border-cyan-300"
              >
                Registar
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                A carregar definição...
              </div>
            ) : error ? (
              <p className="text-sm text-rose-300">{error}</p>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-white">
                  {displayDefinition}
                </p>
                {displayExample && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                    <p className="uppercase text-[10px] tracking-[0.4em] text-slate-400">
                      Exemplo
                    </p>
                    <p className="mt-1">{displayExample}</p>
                  </div>
                )}
                {termData?.aliases?.length ? (
                  <div className="text-xs text-slate-400">
                    <span className="uppercase tracking-[0.3em]">
                      Também conhecido por:
                    </span>
                    <p className="mt-1 text-slate-200">
                      {termData.aliases.join(', ')}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-xl border border-white/10 bg-[#03131f]/80 p-3 text-[11px] text-slate-200">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-cyan-300">
                    <span className="flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5" />
                      Progress Reading
                    </span>
                    <span className="flex items-center gap-1 text-[#fdd87c]">
                      <Award className="h-3.5 w-3.5" />
                      +2 XP
                    </span>
                  </div>
                  {!isPublished ? (
                    <p className="mt-2 text-amber-200">
                      {progressMessage || 'Termo em rascunho. XP indisponível.'}
                    </p>
                  ) : hasCompletion ? (
                    <p className="mt-2 flex items-center gap-2 text-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {progressMessage || 'Leitura concluída.'}
                    </p>
                  ) : (
                    <>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          {remainingSeconds > 0
                            ? `Faltam ${remainingSeconds}s`
                            : 'A concluir...'}
                        </span>
                        <span>{Math.round(progressPercent)}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Mantém a definição aberta 30s para registarmos o XP
                        {awardingXp && ' • a atribuir XP'}
                      </p>
                    </>
                  )}
                  {progressError && (
                    <div className="mt-2 rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-[10px] text-rose-100">
                      <p className="flex items-center gap-1 font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        {progressError}
                      </p>
                      <button
                        type="button"
                        className="mt-1 w-full rounded-full border border-rose-400/60 px-2 py-1 text-[10px] font-semibold text-rose-100 hover:bg-rose-500/20 disabled:opacity-60"
                        onClick={() => void registerCompletion()}
                        disabled={awardingXp}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        ref={containerRef}
        className={cn('glossary-rich-text', className)}
        dangerouslySetInnerHTML={content}
      />
      {mounted && activeTerm && position
        ? createPortal(renderPopover(), document.body)
        : null}
    </>
  );
}
