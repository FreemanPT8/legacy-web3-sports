'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Award,
  Info,
  Timer,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface ContentTrackerProps {
  contentId: string;
  contentType: 'blog' | 'lesson';
  xpReward: number;
  estimatedMinutes: number;
  initialCompleted?: boolean;
  onComplete?: () => void;
  userId?: string | null;
  disabled?: boolean;
  isAuthor?: boolean;
  children: React.ReactNode;
}

const MIN_TIMER_RATIO = 0.2; // 20% do tempo estimado

export function ContentTracker({
  contentId,
  contentType,
  xpReward,
  estimatedMinutes,
  initialCompleted = false,
  onComplete,
  userId,
  disabled = false,
  isAuthor = false,
  children,
}: ContentTrackerProps) {
  const [completed, setCompleted] = useState<boolean>(!!initialCompleted);
  const [timeProgress, setTimeProgress] = useState<number>(initialCompleted ? 100 : 0);
  const [scrollProgress, setScrollProgress] = useState<number>(initialCompleted ? 100 : 0);
  const [isAwarding, setIsAwarding] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasAwardedRef = useRef<boolean>(!!initialCompleted);
  const { refreshUser } = useAuth();

  const noUser = !userId;
  const isCreator = !!isAuthor && !!userId;
  const trackerDisabled = isCreator || disabled || noUser;
  const canTrack = !trackerDisabled && !completed;

  const persistUserXP = (newTotal?: number) => {
    if (typeof newTotal !== 'number' || typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      parsed.xp_total = newTotal;
      localStorage.setItem('user', JSON.stringify(parsed));
      refreshUser();
    } catch (error) {
      console.error('Failed to persist XP locally:', error);
    }
  };

  useEffect(() => {
    if (initialCompleted) {
      hasAwardedRef.current = true;
      setCompleted(true);
      setTimeProgress(100);
      setScrollProgress(100);
    } else if (isCreator) {
      hasAwardedRef.current = true;
      setCompleted(false);
      setTimeProgress(0);
      setScrollProgress(0);
    }
  }, [initialCompleted, isCreator]);

  useEffect(() => {
    if (!canTrack) return;

    const effectiveMinutes = Math.max(estimatedMinutes * MIN_TIMER_RATIO, 0.5);
    const totalMs = effectiveMinutes * 60_000;
    const start = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setTimeProgress(pct);
      if (pct >= 100) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [canTrack, estimatedMinutes]);

  useEffect(() => {
    if (!canTrack) return;

    const handleScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;

      if (scrollHeight <= 0) {
        setScrollProgress(100);
        return;
      }

      const pct = Math.min(100, (scrollTop / scrollHeight) * 100);
      setScrollProgress(pct);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [canTrack]);

  useEffect(() => {
    if (!canTrack) return;
    if (hasAwardedRef.current) return;

    if (timeProgress >= 90 && scrollProgress >= 90) {
      void handleComplete();
    }
  }, [canTrack, timeProgress, scrollProgress]);

  async function handleComplete() {
    if (!canTrack || !userId || hasAwardedRef.current || isCreator) return;

    hasAwardedRef.current = true;
    setIsAwarding(true);

    try {
      const endpoint =
        contentType === 'blog'
          ? `/api/blog/${contentId}/read`
          : `/api/lessons/${contentId}/complete`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, xpEarned: xpReward }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.error || 'Failed to register completion');
      }

      if (result.alreadyCompleted) {
        setCompleted(true);
        setTimeProgress(100);
        setScrollProgress(100);
        if (onComplete) onComplete();
        return;
      }

      persistUserXP(result.newTotal);
      setCompleted(true);
      setTimeProgress(100);
      setScrollProgress(100);

      if (onComplete) onComplete();
    } catch (error) {
      console.error('Failed to complete content:', error);
    } finally {
      setIsAwarding(false);
    }
  }

  let inlineBanner: React.ReactNode = null;

  if (noUser) {
    inlineBanner = (
      <div className="mb-4 rounded-xl border border-white/10 bg-[#031824] p-4 text-sm text-slate-100 flex items-start gap-3">
        <Info className="h-4 w-4 mt-0.5 text-cyan-300" />
        <div>
          <p className="font-semibold text-white">Inicia sessão para registar o progresso.</p>
          <p className="mt-1 text-xs text-slate-400">
            Podes ler tudo, mas o XP só é registado quando tens sessão iniciada.
          </p>
        </div>
      </div>
    );
  } else if (isCreator) {
    inlineBanner = (
      <div className="mb-4 rounded-xl border border-white/10 bg-[#2c1800] p-4 text-sm text-amber-100 flex items-start gap-3">
        <Info className="h-4 w-4 mt-0.5 text-amber-400" />
        <div>
          <p className="font-semibold text-white">És o criador deste conteúdo.</p>
          <p className="mt-1 text-xs text-amber-200/80">
            Não ganhas XP ao consumir o teu próprio conteúdo. Recebes 19% do XP que cada utilizador
            ganha na primeira conclusão.
          </p>
        </div>
      </div>
    );
  }

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const widgetPosition = isMobile
    ? 'fixed left-1/2 -translate-x-1/2 top-16 z-40 w-[90%] max-w-md'
    : 'fixed bottom-4 right-4 z-40 w-full max-w-sm';

  let floatingWidget: React.ReactNode = null;

  if (!noUser && !isCreator) {
    const overall = (timeProgress + scrollProgress) / 2;

    if (completed) {
      floatingWidget = isCollapsed ? (
        <div className={widgetPosition}>
          <button
            className="rounded-full border border-emerald-400/40 bg-emerald-400/20 px-4 py-2 text-xs font-semibold text-emerald-100 shadow-lg backdrop-blur flex items-center gap-2"
            onClick={() => setIsCollapsed(false)}
          >
            <CheckCircle2 className="h-4 w-4" />
            XP registado
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className={widgetPosition}>
          <div className="rounded-xl border border-white/15 bg-[#032026]/90 p-3 shadow-[0_10px_35px_rgba(16,185,129,0.25)] text-xs md:text-sm flex items-center justify-between gap-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              <div>
                <p className="font-semibold text-white">Conteúdo concluído</p>
                <p className="mt-0.5 text-[11px] text-emerald-100">
                  O XP desta leitura já foi registado.
                </p>
              </div>
            </div>
            <button
              className="text-slate-300 hover:text-white"
              onClick={() => setIsCollapsed(true)}
              aria-label="Minimizar tracker"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    } else if (canTrack) {
      floatingWidget = isCollapsed ? (
        <div className={widgetPosition}>
          <button
            className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-100 shadow-lg backdrop-blur flex items-center gap-2"
            onClick={() => setIsCollapsed(false)}
          >
            <Timer className="h-4 w-4" />
            {Math.round(overall)}%
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className={widgetPosition}>
          <div className="rounded-xl border border-white/10 bg-[#031824]/85 p-4 shadow-[0_12px_40px_rgba(8,145,178,0.25)] text-xs md:text-sm space-y-3 text-slate-100 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-2 tracking-wide">
                <Timer className="h-4 w-4 text-cyan-300" />
                Leitura em progresso
              </span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-cyan-200">
                  <Award className="h-4 w-4" />+{xpReward} XP
                </span>
                <button
                  className="text-slate-300 hover:text-white"
                  onClick={() => setIsCollapsed(true)}
                  aria-label="Minimizar tracker"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-cyan-300" />
                ~{estimatedMinutes} min
              </span>
              <span className="text-white">{Math.round(overall)}%</span>
            </div>

            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-2 rounded-full transition-all bg-gradient-to-r from-cyan-400 to-emerald-400"
                style={{ width: `${overall}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400">
              O XP será registado automaticamente{isAwarding && ' · a atribuir XP'}
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <>
      {inlineBanner}
      <div>{children}</div>
      {floatingWidget}
    </>
  );
}
