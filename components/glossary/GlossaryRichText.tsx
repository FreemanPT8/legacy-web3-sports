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
import { Loader2, Lock, X } from 'lucide-react';
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

const LANG_ORDER: GlossaryLanguage[] = ['pt', 'en', 'es'];

type GlossaryDefinitionKey = `definition_${GlossaryLanguage}`;
type GlossaryExampleKey = `example_${GlossaryLanguage}`;

const FALLBACK_DEFINITION =
  'Estamos a carregar a definição deste conceito.';

export function GlossaryRichText({ html, className }: Props) {
  const { user, getToken } = useAuth();
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
  const [displayLanguage, setDisplayLanguage] =
    useState<GlossaryLanguage>('pt');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (language === 'pt' || language === 'en' || language === 'es') {
      setDisplayLanguage(language);
    } else {
      setDisplayLanguage('pt');
    }
  }, [language]);

  const closePopover = useCallback(() => {
    setActiveTerm(null);
    setPosition(null);
    setError(null);
    setTermData(null);
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
      return;
    }

    if (!user) {
      setTermData(null);
      setError('Disponível apenas para membros registados.');
      setLoading(false);
      return;
    }

    const cached = cacheRef.current.get(activeTerm.slug);
    if (cached) {
      setTermData(cached);
      setError(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadTerm = async () => {
      try {
        const token = getToken?.();
        const res = await fetch(`/api/glossary/by-slug/${activeTerm.slug}`, {
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

  const content = useMemo(() => {
    return { __html: html };
  }, [html]);

  const renderPopover = () => {
    if (!activeTerm || !position) return null;

    const showLogin = !user;

    const definitionKey =
      `definition_${displayLanguage}` as GlossaryDefinitionKey;
    const exampleKey =
      `example_${displayLanguage}` as GlossaryExampleKey;

    const displayDefinition =
      (termData?.[
        definitionKey as keyof GlossaryTerm
      ] as string | undefined) || FALLBACK_DEFINITION;
    const displayExample =
      (termData?.[
        exampleKey as keyof GlossaryTerm
      ] as string | null | undefined) || null;

    const availableLanguages = LANG_ORDER.filter((lang) => {
      const key = `definition_${lang}` as GlossaryDefinitionKey;
      return Boolean(termData?.[key as keyof GlossaryTerm]);
    });

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
            <div className="flex items-center gap-2">
              {availableLanguages.length > 0
                ? availableLanguages
                    .map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors',
                          displayLanguage === lang
                            ? 'border-[#fdd87c] text-[#fdd87c]'
                            : 'border-white/20 text-slate-300 hover:border-white/40',
                        )}
                        onClick={() => setDisplayLanguage(lang)}
                      >
                        {lang}
                      </button>
                    ))
                : LANG_ORDER.map((lang) => (
                    <span
                      key={lang}
                      className={cn(
                        'rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-slate-500',
                        displayLanguage === lang &&
                          'border-white/30 text-white',
                      )}
                    >
                      {lang}
                    </span>
                  ))}
            </div>

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
