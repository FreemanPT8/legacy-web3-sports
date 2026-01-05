'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Clock3, ShieldCheck, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type OnboardingPopupAction =
  | { type: 'primary' | 'secondary'; label: string; href?: string; onClick?: () => void }
  | { type: 'dismiss' };

export type OnboardingPopupData = {
  id: string;
  house: string;
  xpGate?: string;
  title: string;
  body: string;
  highlights?: string[];
  badgeLabel?: string;
  primaryCta?: { label: string; href?: string; onClick?: () => void };
  secondaryCta?: { label: string; href?: string; onClick?: () => void };
};

type OnboardingPopupProps = {
  data: OnboardingPopupData | null;
  open: boolean;
  lockSeconds?: number;
  onClose?: (id: string) => void;
  onAction?: (payload: { id: string; action: OnboardingPopupAction['type'] }) => void;
};

const PANEL_BASE =
  'relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#020b16] via-[#001622] to-[#021f2f] shadow-[0_35px_70px_rgba(1,5,12,0.75)]';

export function OnboardingPopup({ data, open, lockSeconds = 3, onClose, onAction }: OnboardingPopupProps) {
  const [lockActive, setLockActive] = useState(true);
  const [remaining, setRemaining] = useState(lockSeconds);
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !data) return;
    if (lastId.current !== data.id) {
      lastId.current = data.id;
    }
    setLockActive(true);
    setRemaining(lockSeconds);
    const started = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      const left = Math.max(lockSeconds - Math.floor(elapsed), 0);
      setRemaining(left);
      if (left <= 0) {
        setLockActive(false);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [open, data, lockSeconds]);

  useEffect(() => {
    if (!open || !data) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (lockActive) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data, lockActive]);

  const highlights = useMemo(() => data?.highlights ?? [], [data]);

  if (!open || !data) return null;

  const handleClose = () => {
    if (lockActive) return;
    onAction?.({ id: data.id, action: 'dismiss' });
    onClose?.(data.id);
  };

  const handlePrimary = () => {
    if (!data.primaryCta) return;
    onAction?.({ id: data.id, action: 'primary' });
    data.primaryCta.onClick?.();
  };

  const handleSecondary = () => {
    if (!data.secondaryCta) return;
    onAction?.({ id: data.id, action: 'secondary' });
    data.secondaryCta.onClick?.();
  };

  const renderCTA = (label: string, handler: () => void, variant: 'primary' | 'secondary', href?: string) => {
    const btn = (
      <Button
        size="lg"
        onClick={handler}
        disabled={lockActive}
        className={cn(
          'w-full justify-center',
          variant === 'primary'
            ? 'bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]'
            : 'border-white/30 text-white hover:bg-white/10',
        )}
      >
        {label}
        {variant === 'primary' ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
      </Button>
    );
    if (href) {
      return (
        <Link href={href} className="w-full" onClick={lockActive ? (e) => e.preventDefault() : undefined}>
          {btn}
        </Link>
      );
    }
    return btn;
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur" aria-hidden />
      <div className={PANEL_BASE} role="dialog" aria-modal="true" aria-labelledby="onboarding-popup-title">
        <div className="pointer-events-none absolute -top-32 -right-20 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />

        <div className="relative p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200">House of {data.house}</p>
              {data.xpGate ? <p className="text-xs text-slate-300">Trigger: {data.xpGate}</p> : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={lockActive}
              className={cn(
                'h-10 w-10 rounded-full border border-white/10 text-white hover:bg-white/10',
                lockActive && 'opacity-60',
              )}
              aria-label="Fechar pop-up"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <h3 id="onboarding-popup-title" className="text-3xl font-semibold leading-tight text-white">
              {data.title}
            </h3>
            <p className="text-base text-slate-200">{data.body}</p>
          </div>

          {highlights.length ? (
            <ul className="space-y-2 text-sm text-slate-200">
              {highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {data.badgeLabel ? (
              <Badge variant="outline" className="border-amber-300/50 bg-amber-400/10 text-amber-100">
                {data.badgeLabel}
              </Badge>
            ) : null}
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100">
              <Clock3 className="h-4 w-4 text-cyan-200" />
              {lockActive ? (
                <span>
                  Espera {remaining}s — esta mensagem é obrigatória para a tua House.
                </span>
              ) : (
                <span>Interage quando fizer sentido. Continua opcional.</span>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.primaryCta
              ? renderCTA(data.primaryCta.label, handlePrimary, 'primary', data.primaryCta.href)
              : null}
            {data.secondaryCta
              ? renderCTA(data.secondaryCta.label, handleSecondary, 'secondary', data.secondaryCta.href)
              : null}
          </div>
        </div>
      </div>
    </div>
  );
}
