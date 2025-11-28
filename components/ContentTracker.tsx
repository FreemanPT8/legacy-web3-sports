'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Clock, CheckCircle2, Award, Info, Timer } from 'lucide-react';

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

// LEGACY :: MINI WIDGET – layout only, no logic touched

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
  const [timeProgress, setTimeProgress] = useState<number>(
    initialCompleted ? 100 : 0,
  );
  const [scrollProgress, setScrollProgress] = useState<number>(
    initialCompleted ? 100 : 0,
  );
  const [isAwarding, setIsAwarding] = useState(false);

  const hasAwardedRef = useRef<boolean>(!!initialCompleted);

  // sincronizar quando o backend indica completed
  useEffect(() => {
    setCompleted(!!initialCompleted);
    if (initialCompleted) {
      setTimeProgress(100);
      setScrollProgress(100);
      hasAwardedRef.current = true;
    }
  }, [initialCompleted]);

  const isAuthorFlag = !!userId && !!isAuthor;
  const trackerDisabled = !!userId && (disabled || isAuthorFlag);

  const canTrack = !!userId && !trackerDisabled && !completed;

  // Timer
  useEffect(() => {
    if (!canTrack) return;

    const totalMs = Math.max(estimatedMinutes, 1) * 60_000;
    const start = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setTimeProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [canTrack, estimatedMinutes]);

  // Scroll tracking
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

  // Finalização
  useEffect(() => {
    if (!canTrack) return;
    if (hasAwardedRef.current) return;

    if (timeProgress >= 90 && scrollProgress >= 90) {
      void handleComplete();
    }
  }, [canTrack, timeProgress, scrollProgress]);

  async function handleComplete() {
    if (!canTrack) return;
    if (!userId) return;
    if (hasAwardedRef.current) return;

    hasAwardedRef.current = true;
    setIsAwarding(true);

    try {
      const endpoint =
        contentType === 'blog'
          ? `/api/blog/${contentId}/read`
          : `/api/lessons/${contentId}/complete`;

      if (xpReward > 0) {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            xpEarned: xpReward,
          }),
        });
      }

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

  // ---------------------------------------------------------------------
  // RENDER – novo layout (mini widget flutuante)
  // ---------------------------------------------------------------------

  const noUser = !userId;

  // 1) Banner inline ONLY for creators & non-authenticated
  let inlineBanner: React.ReactNode = null;

  if (noUser) {
    inlineBanner = (
      <div className="mb-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-700 flex items-start gap-3">
        <Info className="h-4 w-4 mt-0.5 text-gray-500" />
        <div>
          <p className="font-medium">
            Reading tracker disponível apenas para utilizadores com login.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Podes ler tudo, mas o XP só é registado quando tens sessão iniciada.
          </p>
        </div>
      </div>
    );
  } else if (isAuthorFlag) {
    inlineBanner = (
      <div className="mb-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
        <Info className="h-4 w-4 mt-0.5 text-amber-600" />
        <div>
          <p className="font-medium">És o criador deste conteúdo.</p>
          <p className="mt-1 text-xs">
            Não ganhas XP por consumir o teu próprio conteúdo.  
            O XP vem dos leitores.
          </p>
        </div>
      </div>
    );
  }

  // 2) FLUTUATING WIDGET — desktop bottom-right / mobile header
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

  if (!noUser && !isAuthorFlag) {
    if (completed) {
      floatingWidget = (
        <div className={widgetPosition}>
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 shadow-lg text-xs md:text-sm flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-700" />
            <div>
              <p className="font-semibold text-green-900">Conteúdo concluído</p>
              <p className="mt-0.5 text-[11px] text-green-700">
                O XP desta leitura já foi registado.
              </p>
            </div>
          </div>
        </div>
      );
    } else if (canTrack) {
      const overall = (timeProgress + scrollProgress) / 2;

      floatingWidget = (
        <div className={widgetPosition}>
          <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 shadow-lg text-xs md:text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-900 flex items-center gap-2">
                <Timer className="h-4 w-4 text-blue-600" />
                Leitura em progresso
              </span>
              <span className="flex items-center gap-1 text-blue-900">
                <Award className="h-4 w-4" />
                +{xpReward} XP
              </span>
            </div>

            <div className="flex items-center justify-between text-blue-800 text-[11px]">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~{estimatedMinutes} min
              </span>
              <span>{Math.round(overall)}%</span>
            </div>

            <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-2 bg-blue-600 rounded-full transition-all"
                style={{ width: `${overall}%` }}
              />
            </div>

            <p className="text-[11px] text-blue-800">
              O XP será registado automaticamente…
              {isAwarding && ' A atribuir XP…'}
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
