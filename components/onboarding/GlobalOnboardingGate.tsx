'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Clock3, ArrowRight } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DEFAULT_GLOBAL_WELCOME_CONFIG } from '@/data/global-welcome';
import type { GlobalWelcomeConfig, OnboardingPopupLanguage } from '@/types/onboarding';

const LOCK_SECONDS = 5;
const HOUSE_KEY = 'LEGACY';
const LOCAL_ACK_PREFIX = 'global_onboarding_ack';

type CopySection = {
  title: string;
  body: string;
  bullets?: string[];
};

type CopyPack = {
  eyebrow: string;
  title: string;
  intro: string[];
  sections: CopySection[];
  checklistLabel: string;
  helper: string;
  confirmPrimary: string;
  confirmSecondary: string;
  confirmTertiary: string;
  lockedLabel: (seconds: number) => string;
  unlockedLabel: string;
  errorLabel: string;
};

const LANGUAGE_OPTIONS: Array<{ id: OnboardingPopupLanguage; label: string }> = [
  { id: 'pt', label: '\u{1F1F5}\u{1F1F9} PT-PT \u2014 Portugu\u00eas de Portugal' },
  { id: 'en', label: '\u{1F1EC}\u{1F1E7} EN \u2014 English' },
  { id: 'es', label: '\u{1F1EA}\u{1F1F8} ES \u2014 Espa\u00f1ol' },
];

const PANEL_BASE =
  'relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#020b16] via-[#001622] to-[#021f2f] shadow-[0_35px_70px_rgba(1,5,12,0.75)]';

export default function GlobalOnboardingGate() {
  const { user, getToken } = useAuth();
  const { language: rawLang, setLanguage } = useLanguage();
  const router = useRouter();
  const language = (rawLang === 'pt' || rawLang === 'es' || rawLang === 'en' ? rawLang : 'en') as OnboardingPopupLanguage;
  const [globalWelcome, setGlobalWelcome] = useState<GlobalWelcomeConfig | null>(null);

  const [open, setOpen] = useState(false);
  const [lockActive, setLockActive] = useState(true);
  const [remaining, setRemaining] = useState(LOCK_SECONDS);
  const [ackChecked, setAckChecked] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);

  const token = getToken?.() ?? null;

  const getLocalAckKey = useCallback(
    (userId: string) => `${LOCAL_ACK_PREFIX}:${HOUSE_KEY}:${userId}`,
    [],
  );

  const readLocalAck = useCallback(
    (userId: string) => {
      if (typeof window === 'undefined') return false;
      return localStorage.getItem(getLocalAckKey(userId)) === '1';
    },
    [getLocalAckKey],
  );

  const writeLocalAck = useCallback(
    (userId: string) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(getLocalAckKey(userId), '1');
    },
    [getLocalAckKey],
  );

  const canConfirm = ackChecked && !lockActive && !ackLoading;

  const loadAckStatus = useCallback(async () => {
    if (!user) {
      setOpen(false);
      return;
    }
    const localAck = readLocalAck(user.id);
    if (!token) {
      setOpen(!localAck);
      return;
    }
    try {
      setAckError(null);
      const response = await fetch(`/api/onboarding/global-ack?house=${HOUSE_KEY}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = (await response.json()) as
        | { success: true; acknowledged: boolean }
        | { success: false; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.success ? 'Failed to load' : data.error || 'Failed to load');
      }
      setOpen(!(data.acknowledged || localAck));
    } catch (error) {
      console.error('[global-onboarding] failed to load ack', error);
      setOpen(!localAck);
    }
  }, [readLocalAck, token, user]);

  useEffect(() => {
    void loadAckStatus();
  }, [loadAckStatus]);

  useEffect(() => {
    if (!open) return;
    setLockActive(true);
    setRemaining(LOCK_SECONDS);
    const started = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      const left = Math.max(LOCK_SECONDS - Math.floor(elapsed), 0);
      setRemaining(left);
      if (left <= 0) {
        setLockActive(false);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (!user) {
      setOpen(false);
      setAckChecked(false);
      setAckError(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadGlobalWelcome = async () => {
      try {
        setCopyLoading(true);
        const response = await fetch(`/api/onboarding/house?house=${HOUSE_KEY}`, { cache: 'no-store' });
        const data = await response.json();
        if (!active) return;
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load onboarding sequence.');
        }
        const welcome = data?.sequence?.globalWelcome ?? null;
        if (welcome?.languages) {
          setGlobalWelcome(welcome as GlobalWelcomeConfig);
        }
      } catch (error) {
        console.error('[global-onboarding] failed to load global welcome copy', error);
      } finally {
        if (active) setCopyLoading(false);
      }
    };
    void loadGlobalWelcome();
    return () => {
      active = false;
    };
  }, [user]);

  const persistAck = useCallback(async () => {
    if (!user) return false;
    if (!token) {
      writeLocalAck(user.id);
      return true;
    }
    try {
      setAckLoading(true);
      setAckError(null);
      const response = await fetch('/api/onboarding/global-ack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ house: HOUSE_KEY }),
      });
      const data = (await response.json()) as
        | { success: true }
        | { success: false; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.success ? 'Failed to save' : data.error || 'Failed to save');
      }
      writeLocalAck(user.id);
      return true;
    } catch (error) {
      console.error('[global-onboarding] failed to persist ack', error);
      writeLocalAck(user.id);
      return true;
    } finally {
      setAckLoading(false);
    }
  }, [token, user, writeLocalAck]);

  const handleConfirm = useCallback(
    async (target?: string) => {
      if (!canConfirm) return;
      const ok = await persistAck();
      if (!ok) return;
      setOpen(false);
      if (target) {
        router.push(target);
      }
    },
    [canConfirm, persistAck, router],
  );

  const resolvedCopySource = globalWelcome?.languages ?? DEFAULT_GLOBAL_WELCOME_CONFIG.languages;
  const baseCopy = resolvedCopySource[language] ?? DEFAULT_GLOBAL_WELCOME_CONFIG.languages.en;
  const copy: CopyPack = useMemo(
    () => ({
      ...baseCopy,
      sections: baseCopy.sections ?? [],
      intro: baseCopy.intro ?? [],
      confirmTertiary: baseCopy.confirmTertiary ?? 'Continuar',
      lockedLabel: (seconds) =>
        language === 'pt'
          ? `Espera ${seconds}s para continuares.`
          : language === 'es'
          ? `Espera ${seconds}s para continuar.`
          : `Wait ${seconds}s to continue.`,
      unlockedLabel: language === 'pt' ? 'Ok para continuar.' : language === 'es' ? 'Puedes continuar.' : 'You can continue.',
      errorLabel:
        language === 'pt'
          ? 'Falha ao registar a tua confirmação. Tenta novamente.'
          : language === 'es'
          ? 'No se pudo registrar la confirmación. Inténtalo de nuevo.'
          : 'Failed to record your confirmation. Please try again.',
    }),
    [baseCopy, language],
  );

  const sections = useMemo(() => copy.sections, [copy.sections]);
  const copyLoadingLabel =
    language === 'pt'
      ? 'A carregar copy atualizada...'
      : language === 'es'
      ? 'Cargando copy actualizada...'
      : 'Loading updated copy...';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-hidden />
      <div className={PANEL_BASE} role="dialog" aria-modal="true" aria-labelledby="global-onboarding-title">
        <div className="pointer-events-none absolute -top-32 -right-16 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />

        <div className="relative space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200">{copy.eyebrow}</p>
              <h2 id="global-onboarding-title" className="text-3xl font-semibold text-white">
                {copy.title}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex flex-col items-end gap-2">
                {LANGUAGE_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-pressed={language === option.id}
                    onClick={() => setLanguage(option.id)}
                    className={cn(
                      'h-8 justify-end border-white/25 px-3 text-[11px] uppercase tracking-[0.08em]',
                      language === option.id
                        ? 'border-cyan-300/70 bg-cyan-500/10 text-cyan-100'
                        : 'text-slate-200 hover:bg-white/10',
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <Badge variant="outline" className="border-amber-300/40 bg-amber-400/10 text-amber-100">
                {HOUSE_KEY}
              </Badge>
            </div>
          </div>

          <ScrollArea className="max-h-[52vh] pr-2">
            <div className="space-y-4 pb-2">
              <div className="space-y-2">
                {copy.intro.map((line) => (
                  <p key={line} className="text-sm text-slate-300">
                    {line}
                  </p>
                ))}
              </div>
              <div className="space-y-3">
                {sections.map((section, index) => (
                  <details
                    key={section.title}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                    defaultOpen={index === 0}
                  >
                    <summary className="cursor-pointer text-sm font-semibold text-white">
                      {section.title}
                    </summary>
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-slate-200">{section.body}</p>
                      {section.bullets?.length ? (
                        <ul className="mt-2 space-y-2 text-sm text-slate-200">
                          {section.bullets.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-300" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </ScrollArea>

          <div className="rounded-2xl border border-white/10 bg-[#031923] p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={ackChecked}
                onCheckedChange={(value) => setAckChecked(Boolean(value))}
                className="mt-0.5 border-white/30 data-[state=checked]:bg-amber-400 data-[state=checked]:text-[#1e1500]"
              />
              <div>
                <p className="text-sm text-white">{copy.checklistLabel}</p>
                <p className="text-xs text-slate-400">{copy.helper}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              <Clock3 className="h-4 w-4 text-cyan-200" />
              <span>{lockActive ? copy.lockedLabel(remaining) : copy.unlockedLabel}</span>
            </div>
            {ackError ? <p className="mt-2 text-xs text-rose-200">{ackError}</p> : null}
            {copyLoading ? <p className="mt-2 text-xs text-slate-400">{copyLoadingLabel}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              size="lg"
              onClick={() => void handleConfirm('/education/xp')}
              disabled={!canConfirm}
              className={cn(
                'w-full justify-center bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]',
                ackLoading && 'opacity-80',
              )}
            >
              {copy.confirmPrimary}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => void handleConfirm('/education/courses')}
              disabled={!canConfirm}
              className="w-full border-white/30 text-white hover:bg-white/10"
            >
              {copy.confirmSecondary}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => void handleConfirm()}
              disabled={!canConfirm}
              className="w-full border-white/30 text-white hover:bg-white/10"
            >
              {copy.confirmTertiary}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
