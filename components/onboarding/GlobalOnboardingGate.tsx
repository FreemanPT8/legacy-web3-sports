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

type SupportedCopyLang = 'pt' | 'es' | 'en';

type CopySection = {
  title: string;
  body: string;
  bullets?: string[];
};

type CopyPack = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: CopySection[];
  checklistLabel: string;
  helper: string;
  confirmPrimary: string;
  confirmSecondary: string;
  lockedLabel: (seconds: number) => string;
  unlockedLabel: string;
  errorLabel: string;
};

const COPY: Record<SupportedCopyLang, CopyPack> = {
  pt: {
    eyebrow: 'APERTUM LEGACY',
    title: 'Bem-vindo ao Apertum Legacy',
    intro:
      'Entraste na base oficial do Legacy. Aqui o foco n\u00e3o \u00e9 hype: \u00e9 contexto, consist\u00eancia e prepara\u00e7\u00e3o real.',
    sections: [
      {
        title: 'Como ganhas XP (Experience)',
        body: 'O XP \u00e9 a tua prova de compromisso. Ganhas XP quando:',
        bullets: [
          'Fazes login com a sess\u00e3o ativa',
          'Consomes blog posts oficiais',
          'Concluis cursos completos',
          'Fechas topics e lessons',
          'L\u00eas termos do gloss\u00e1rio',
        ],
      },
      {
        title: 'Respons\u00e1vel pela tua House',
        body:
          'Um Head vai ser designado para a tua House com base no desporto + pa\u00eds que escolheste. O objetivo \u00e9 garantir acompanhamento real e alinhado com o teu contexto.',
      },
      {
        title: 'Guia r\u00e1pido de XP',
        body: 'Vai a /education/xp para veres como subir XP e desbloquear conte\u00fados mais exigentes.',
      },
      {
        title: 'Mensagens privadas s\u00f3 para comprometidos',
        body:
          'A partir de 369 XP desbloqueias mensagens privadas com o Head ou Moderadores. Isto protege os Heads de curiosos e garante foco nos membros ativos.',
      },
      {
        title: 'Pop-ups s\u00e3o comunica\u00e7\u00e3o oficial',
        body:
          'A tua House comunica primeiro atrav\u00e9s de pop-ups como este. N\u00e3o ignores estas mensagens durante a tua aprendizagem.',
      },
      {
        title: 'Aten\u00e7\u00e3o ao mindset',
        body:
          'Se procuras enriquecer r\u00e1pido, esta n\u00e3o \u00e9 a tua plataforma. Aqui ganhas base s\u00f3lida antes de ver oportunidades. Podes acelerar o processo se consumires r\u00e1pido os conte\u00fados.',
      },
    ],
    checklistLabel: 'Li e compreendi a mensagem inicial do freemanpt.',
    helper: 'Este aviso \u00e9 obrigat\u00f3rio no teu primeiro login.',
    confirmPrimary: 'Ir para XP agora',
    confirmSecondary: 'Continuar na plataforma',
    lockedLabel: (seconds) => `Espera ${seconds}s para continuares.`,
    unlockedLabel: 'Ok para continuar.',
    errorLabel: 'Falha ao registar a tua confirma\u00e7\u00e3o. Tenta novamente.',
  },
  es: {
    eyebrow: 'APERTUM LEGACY',
    title: 'Bienvenido a Apertum Legacy',
    intro:
      'Entraste en la base oficial de Legacy. Aqu\u00ed el enfoque no es hype: es contexto, consistencia y preparaci\u00f3n real.',
    sections: [
      {
        title: 'C\u00f3mo ganas XP (Experience)',
        body: 'El XP demuestra tu compromiso. Ganar\u00e1s XP cuando:',
        bullets: [
          'Inicias sesi\u00f3n con la cuenta activa',
          'Consumes blog posts oficiales',
          'Finalizas cursos completos',
          'Completas topics y lessons',
          'Lees t\u00e9rminos del glosario',
        ],
      },
      {
        title: 'Responsable de tu House',
        body:
          'Un Head ser\u00e1 asignado a tu House seg\u00fan el deporte + pa\u00eds que elegiste. El objetivo es acompa\u00f1amiento real y alineado con tu contexto.',
      },
      {
        title: 'Gu\u00eda r\u00e1pida de XP',
        body: 'Ve a /education/xp para entender c\u00f3mo subir XP y desbloquear contenido m\u00e1s exigente.',
      },
      {
        title: 'Mensajes privados solo para comprometidos',
        body:
          'A partir de 369 XP desbloqueas mensajes privados con el Head o Moderadores. Esto protege a los Heads de curiosos y garantiza foco en miembros activos.',
      },
      {
        title: 'Los pop-ups son comunicaci\u00f3n oficial',
        body:
          'Tu House comunica primero a trav\u00e9s de pop-ups como este. No ignores estos mensajes durante tu aprendizaje.',
      },
      {
        title: 'Mentalidad correcta',
        body:
          'Si buscas hacerte rico r\u00e1pido, esta no es tu plataforma. Aqu\u00ed construyes base s\u00f3lida antes de ver oportunidades. Puedes acelerar el proceso consumiendo contenido r\u00e1pido.',
      },
    ],
    checklistLabel: 'He le\u00eddo y comprendido el mensaje inicial de freemanpt.',
    helper: 'Este aviso es obligatorio en tu primer inicio de sesi\u00f3n.',
    confirmPrimary: 'Ir a XP ahora',
    confirmSecondary: 'Continuar en la plataforma',
    lockedLabel: (seconds) => `Espera ${seconds}s para continuar.`,
    unlockedLabel: 'Puedes continuar.',
    errorLabel: 'No se pudo registrar la confirmaci\u00f3n. Int\u00e9ntalo de nuevo.',
  },
  en: {
    eyebrow: 'APERTUM LEGACY',
    title: 'Welcome to Apertum Legacy',
    intro:
      'You just entered the official Legacy base. This is not hype: it is context, consistency, and real preparation.',
    sections: [
      {
        title: 'How you earn XP (Experience)',
        body: 'XP proves commitment. You earn XP when you:',
        bullets: [
          'Log in with an active session',
          'Consume official blog posts',
          'Complete full courses',
          'Finish topics and lessons',
          'Read glossary terms',
        ],
      },
      {
        title: 'Who runs your House',
        body:
          'A Head will be assigned to your House based on the sport + country you chose. The goal is real guidance aligned with your context.',
      },
      {
        title: 'XP fast track',
        body: 'Go to /education/xp to learn how XP works and unlock deeper content.',
      },
      {
        title: 'Private messages only for committed members',
        body:
          'At 369 XP you unlock private messages with the Head or Moderators. This protects Heads from curiosity-only noise and keeps focus on active members.',
      },
      {
        title: 'Pop-ups are official communication',
        body:
          'Your House starts communication through pop-ups like this. Do not ignore these messages as you learn.',
      },
      {
        title: 'Mindset check',
        body:
          'If you want to get rich fast, this is not your platform. We build solid foundations before opportunities. You can accelerate by consuming content quickly.',
      },
    ],
    checklistLabel: 'I read and understood freemanpt\u2019s initial message.',
    helper: 'This notice is mandatory on your first login.',
    confirmPrimary: 'Go to XP now',
    confirmSecondary: 'Continue inside the platform',
    lockedLabel: (seconds) => `Wait ${seconds}s to continue.`,
    unlockedLabel: 'You can continue.',
    errorLabel: 'Failed to record your confirmation. Please try again.',
  },
};

const PANEL_BASE =
  'relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#020b16] via-[#001622] to-[#021f2f] shadow-[0_35px_70px_rgba(1,5,12,0.75)]';

export default function GlobalOnboardingGate() {
  const { user, getToken } = useAuth();
  const { language: rawLang } = useLanguage();
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

  const canConfirm = ackChecked && !lockActive && !ackLoading;

  const loadAckStatus = useCallback(async () => {
    if (!user || !token) {
      setOpen(false);
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
      setOpen(!data.acknowledged);
    } catch (error) {
      console.error('[global-onboarding] failed to load ack', error);
      setOpen(true);
    }
  }, [token, user]);

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
    if (!user || !token) return false;
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
      return true;
    } catch (error) {
      console.error('[global-onboarding] failed to persist ack', error);
      setAckError(copy.errorLabel);
      return false;
    } finally {
      setAckLoading(false);
    }
  }, [copy.errorLabel, token, user]);

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
              <p className="text-sm text-slate-300">{copy.intro}</p>
            </div>
            <Badge variant="outline" className="border-amber-300/40 bg-amber-400/10 text-amber-100">
              {HOUSE_KEY}
            </Badge>
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

          <div className="grid gap-3 sm:grid-cols-2">
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
              onClick={() => void handleConfirm()}
              disabled={!canConfirm}
              className="w-full border-white/30 text-white hover:bg-white/10"
            >
              {copy.confirmSecondary}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
