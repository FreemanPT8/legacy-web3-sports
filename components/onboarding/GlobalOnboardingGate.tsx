'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Clock3, ArrowRight } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const LOCK_SECONDS = 5;
const HOUSE_KEY = 'LEGACY';
const LOCAL_ACK_PREFIX = 'global_onboarding_ack';

type SupportedCopyLang = 'pt' | 'es' | 'en';

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

const LANGUAGE_OPTIONS: Array<{ id: SupportedCopyLang; label: string }> = [
  { id: 'pt', label: '\u{1F1F5}\u{1F1F9} PT-PT \u2014 Portugu\u00eas de Portugal' },
  { id: 'en', label: '\u{1F1EC}\u{1F1E7} EN \u2014 English' },
  { id: 'es', label: '\u{1F1EA}\u{1F1F8} ES \u2014 Espa\u00f1ol' },
];

const COPY: Record<SupportedCopyLang, CopyPack> = {
  pt: {
    eyebrow: 'APERTUM LEGACY',
    title: 'Bem-vindo ao Apertum Legacy',
    intro: [
      'Sou o freemanpt.',
      'Entraste na base oficial do Legacy \u2014 um espa\u00e7o para quem quer compreender, n\u00e3o apenas consumir.',
      'Aqui n\u00e3o h\u00e1 promessas f\u00e1ceis nem atalhos artificiais. H\u00e1 contexto, consist\u00eancia e prepara\u00e7\u00e3o real.',
      'Se \u00e9s novo, faz isto com calma. A plataforma foi pensada para te guiar passo a passo.',
    ],
    sections: [
      {
        title: 'Como ganhas XP (Experi\u00eancia)',
        body: 'XP prova compromisso. Ganhas XP quando:',
        bullets: [
          'Consomes blog posts oficiais',
          'Concluis cursos completos',
          'Terminas t\u00f3picos e li\u00e7\u00f5es',
          'Exploras e l\u00eas termos do gloss\u00e1rio',
        ],
      },
      {
        title: 'Quem lidera a tua House',
        body:
          'Cada House tem um Head, atribu\u00eddo com base no desporto e pa\u00eds que escolheste. O papel do Head \u00e9 orientar, n\u00e3o vender nem prometer resultados.',
      },
      {
        title: 'Queres perceber o sistema de XP?',
        body:
          'Vai \u00e0 p\u00e1gina \u201cComo Funciona o XP\u201d para entenderes como o progresso desbloqueia conte\u00fado mais profundo.',
      },
      {
        title: 'Mensagens privadas (apenas para comprometidos)',
        body:
          'A partir dos 369 XP, desbloqueias mensagens privadas com o Head ou Moderadores. Isto protege os Heads do ru\u00eddo e mant\u00e9m o foco em membros realmente ativos.',
      },
      {
        title: 'Pop-ups s\u00e3o comunica\u00e7\u00e3o oficial',
        body:
          'A tua House comunica atrav\u00e9s de pop-ups como este. L\u00ea-os com aten\u00e7\u00e3o \u2014 fazem parte do teu percurso no Legacy.',
      },
      {
        title: 'Mindset (sem filtros)',
        body:
          'Se procuras resultados r\u00e1pidos sem base, esta n\u00e3o \u00e9 a tua plataforma. Aqui constroem-se fundamentos primeiro. Quem \u00e9 consistente, acelera depois.',
      },
    ],
    checklistLabel:
      'Declaro que li, compreendi e aceito a Mensagem Inicial do freemanpt (vers\u00e3o atual), e entendo que o Legacy n\u00e3o \u00e9 uma empresa e que os Heads de House atuam de forma independente.',
    helper: 'Obrigat\u00f3rio no primeiro acesso.',
    confirmPrimary: 'Ir para \u201cComo Funciona o XP\u201d \u2192',
    confirmSecondary: 'Entrar em Cursos',
    confirmTertiary: 'Continuar na plataforma',
    lockedLabel: (seconds) => `Espera ${seconds}s para continuares.`,
    unlockedLabel: 'Ok para continuar.',
    errorLabel: 'Falha ao registar a tua confirma\u00e7\u00e3o. Tenta novamente.',
  },
  es: {
    eyebrow: 'APERTUM LEGACY',
    title: 'Bienvenido a Apertum Legacy',
    intro: [
      'Soy freemanpt.',
      'Has entrado en la base oficial de Legacy \u2014 un espacio para quien quiere comprender, no solo consumir.',
      'Aqu\u00ed no hay hype. Hay contexto, constancia y preparaci\u00f3n real.',
      'Si eres nuevo, ve paso a paso. La plataforma est\u00e1 pensada para guiarte.',
    ],
    sections: [
      {
        title: 'C\u00f3mo ganas XP (Experiencia)',
        body: 'XP demuestra compromiso. Ganas XP cuando:',
        bullets: [
          'Consumes blog posts oficiales',
          'Completas cursos completos',
          'Finalizas temas y lecciones',
          'Exploras y lees t\u00e9rminos del glosario',
        ],
      },
      {
        title: 'Qui\u00e9n dirige tu House',
        body:
          'Cada House tiene un Head, asignado seg\u00fan el deporte y pa\u00eds que elegiste. El rol del Head es orientar, no vender ni prometer resultados.',
      },
      {
        title: '\u00bfQuieres entender el sistema de XP?',
        body:
          'Ve a la p\u00e1gina \u201cC\u00f3mo Funciona el XP\u201d para ver c\u00f3mo el progreso desbloquea contenido m\u00e1s profundo.',
      },
      {
        title: 'Mensajes privados (solo para comprometidos)',
        body:
          'A partir de 369 XP, desbloqueas mensajes privados con el Head o Moderadores. Esto protege a los Heads del ruido y mantiene el foco en miembros activos.',
      },
      {
        title: 'Los pop-ups son comunicaci\u00f3n oficial',
        body:
          'Tu House se comunica mediante pop-ups como este. L\u00e9elos con atenci\u00f3n \u2014 forman parte de tu recorrido en Legacy.',
      },
      {
        title: 'Mindset (sin filtros)',
        body:
          'Si buscas resultados r\u00e1pidos sin base, esta no es tu plataforma. Aqu\u00ed se construyen fundamentos primero. La constancia acelera despu\u00e9s.',
      },
    ],
    checklistLabel:
      'Declaro que he le\u00eddo, entendido y aceptado el Mensaje Inicial de freemanpt (versi\u00f3n actual), y entiendo que Legacy no es una empresa y que los Heads de House act\u00faan de forma independiente.',
    helper: 'Obligatorio en el primer acceso.',
    confirmPrimary: 'Ir a \u201cC\u00f3mo Funciona el XP\u201d \u2192',
    confirmSecondary: 'Entrar en Cursos',
    confirmTertiary: 'Continuar en la plataforma',
    lockedLabel: (seconds) => `Espera ${seconds}s para continuar.`,
    unlockedLabel: 'Puedes continuar.',
    errorLabel: 'No se pudo registrar la confirmaci\u00f3n. Int\u00e9ntalo de nuevo.',
  },
  en: {
    eyebrow: 'APERTUM LEGACY',
    title: 'Welcome to Apertum Legacy',
    intro: [
      'I\u2019m freemanpt.',
      'You\u2019ve entered the official Legacy base \u2014 a space for those who want to understand, not just consume.',
      'No hype here. Just context, consistency, and real preparation.',
      'If you\u2019re new, take it step by step. The platform is designed to guide you.',
    ],
    sections: [
      {
        title: 'How you earn XP (Experience)',
        body: 'XP proves commitment. You earn XP when you:',
        bullets: [
          'Consume official blog posts',
          'Complete full courses',
          'Finish topics and lessons',
          'Explore and read glossary terms',
        ],
      },
      {
        title: 'Who runs your House',
        body:
          'Each House has a Head, assigned based on the sport and country you selected. The Head\u2019s role is guidance \u2014 not selling, not promising outcomes.',
      },
      {
        title: 'Want to understand the XP system?',
        body:
          'Go to the \u201cHow XP Works\u201d page to learn how progression unlocks deeper content.',
      },
      {
        title: 'Private messages (for committed members only)',
        body:
          'At 369 XP, you unlock private messages with the Head or Moderators. This protects Heads from noise and keeps focus on active members.',
      },
      {
        title: 'Pop-ups are official communication',
        body:
          'Your House communicates through pop-ups like this one. Read them carefully \u2014 they\u2019re part of your Legacy journey.',
      },
      {
        title: 'Mindset (no filters)',
        body:
          'If you\u2019re looking for fast results without foundations, this isn\u2019t your platform. We build first. Those who stay consistent accelerate later.',
      },
    ],
    checklistLabel:
      'I declare that I have read, understood, and accepted freemanpt\u2019s Initial Message (current version), and I understand that Legacy is not a company and that House Heads operate independently.',
    helper: 'Mandatory on first access.',
    confirmPrimary: 'Go to \u201cHow XP Works\u201d \u2192',
    confirmSecondary: 'Enter Courses',
    confirmTertiary: 'Continue inside the platform',
    lockedLabel: (seconds) => `Wait ${seconds}s to continue.`,
    unlockedLabel: 'You can continue.',
    errorLabel: 'Failed to record your confirmation. Please try again.',
  },
};

const PANEL_BASE =
  'relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#020b16] via-[#001622] to-[#021f2f] shadow-[0_35px_70px_rgba(1,5,12,0.75)]';

export default function GlobalOnboardingGate() {
  const { user, getToken } = useAuth();
  const { language: rawLang, setLanguage } = useLanguage();
  const router = useRouter();
  const language = (rawLang === 'pt' || rawLang === 'es' || rawLang === 'en' ? rawLang : 'en') as SupportedCopyLang;
  const copy = COPY[language] ?? COPY.en;

  const [open, setOpen] = useState(false);
  const [lockActive, setLockActive] = useState(true);
  const [remaining, setRemaining] = useState(LOCK_SECONDS);
  const [ackChecked, setAckChecked] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);

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

  const sections = useMemo(() => copy.sections, [copy.sections]);

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
              <div className="space-y-2">
                {copy.intro.map((line) => (
                  <p key={line} className="text-sm text-slate-300">
                    {line}
                  </p>
                ))}
              </div>
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

          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">{section.title}</p>
                <p className="mt-1 text-sm text-slate-200">{section.body}</p>
                {section.bullets?.length ? (
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {section.bullets.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>

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
