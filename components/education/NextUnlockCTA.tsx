'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import type { ProgressSummary } from '@/lib/education/progressSummary';
import type { ProgressFetchState } from '@/components/education/LevelTimeline';
import { useLanguage } from '@/contexts/LanguageContext';

const SUPPORTED_LANGUAGES = ['pt', 'es', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const CTA_COPY: Record<SupportedLanguage, {
  error: string;
  syncing: string;
  nextUnlock: string;
  completePrevious: string;
  viewMap: string;
}> = {
  pt: {
    error: 'Nao foi possivel carregar o proximo desbloqueio.',
    syncing: 'A sincronizar o teu proximo desbloqueio...',
    nextUnlock: 'Proximo desbloqueio',
    completePrevious: 'Completa o nivel anterior',
    viewMap: 'Ver mapa',
  },
  es: {
    error: 'No fue posible cargar el proximo desbloqueo.',
    syncing: 'Sincronizando tu proximo desbloqueo...',
    nextUnlock: 'Proximo desbloqueo',
    completePrevious: 'Completa el nivel anterior',
    viewMap: 'Ver mapa',
  },
  en: {
    error: "Couldn't load the next unlock.",
    syncing: 'Syncing your next unlock...',
    nextUnlock: 'Next unlock',
    completePrevious: 'Finish the previous level',
    viewMap: 'View map',
  },
};

const resolveLanguage = (value?: string | null): SupportedLanguage => {
  const lang = (value ?? 'pt').toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
    ? (lang as SupportedLanguage)
    : 'pt';
};

type Props = {
  summary: ProgressSummary | null;
  state: ProgressFetchState;
};

export function NextUnlockCTA({ summary, state }: Props) {
  const { language } = useLanguage();
  const resolvedLanguage = resolveLanguage(language);
  const copy = CTA_COPY[resolvedLanguage];

  const isLoading = state === 'idle' || state === 'loading';
  const hasError = state === 'error';

  const nextLevel = useMemo(() => {
    if (!summary?.levels) return null;
    return summary.levels.find((level) => !level.isUnlocked) ?? null;
  }, [summary]);

  if (state === 'anonymous') return null;

  if (!summary && !isLoading) return null;
  if (summary && !nextLevel && !isLoading) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 px-4 md:hidden">
      <div className="rounded-2xl border border-white/10 bg-[#01050b]/90 px-4 py-3 text-white shadow-[0_20px_45px_rgba(0,0,0,0.55)] backdrop-blur">
        {hasError ? (
          <div className="text-sm text-rose-100">
            {copy.error}
          </div>
        ) : isLoading || !nextLevel ? (
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
            {copy.syncing}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                {copy.nextUnlock}
              </p>
              <p className="text-lg font-semibold">{nextLevel.title}</p>
              <p className="text-xs text-slate-300">
                {typeof nextLevel.minXp === 'number'
                  ? `${nextLevel.minXp.toLocaleString()}+ XP`
                  : copy.completePrevious}
              </p>
            </div>
            <Link
              href="#levels"
              className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <Lock className="mr-2 h-3 w-3" />
              {copy.viewMap}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
