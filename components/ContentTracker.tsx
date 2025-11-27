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

  // se não houver userId → só mostra aviso, não faz tracking nem XP
  userId?: string | null;

  // para autores / casos em que não queremos tracker nem XP
  disabled?: boolean;

  children: React.ReactNode;
}

export function ContentTracker({
  contentId,
  contentType,
  xpReward,
  estimatedMinutes,
  initialCompleted = false,
  onComplete,
  userId,
  disabled = false,
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

  // se initialCompleted mudar (ex.: vindo do backend), sincroniza estado
  useEffect(() => {
    setCompleted(!!initialCompleted);
    if (initialCompleted) {
      setTimeProgress(100);
      setScrollProgress(100);
      hasAwardedRef.current = true;
    }
  }, [initialCompleted]);

  const canTrack = !!userId && !disabled && !completed;

  // Timer baseado no tempo estimado
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

  // Tracking de scroll
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

  // Quando tempo e scroll estiverem “quase completos”, tentamos concluir
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

      // Mesmo que o servidor responda "já completo", o estado local fica completed
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

  // --- RENDER ---

  const noUser = !userId;
  const isAuthorDisabled = !!userId && disabled;

  let banner;
  if (noUser) {
    // não autenticado
    banner = (
      <div className="border border-dashed border-gray-300 bg-gray-50 text-gray-700 rounded-lg p-4 text-sm flex items-start gap-3">
        <Info className="h-4 w-4 mt-0.5 text-gray-500" />
        <div>
          <p className="font-medium">
            Reading tracker disponível apenas para utilizadores com login.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Podes ler tudo à vontade, mas o XP só é registado quando estás
            com sessão iniciada.
          </p>
        </div>
      </div>
    );
  } else if (isAuthorDisabled) {
    // autor do conteúdo
    banner = (
      <div className="border border-dashed border-amber-300 bg-amber-50 text-amber-900 rounded-lg p-4 text-sm flex items-start gap-3">
        <Info className="h-4 w-4 mt-0.5 text-amber-600" />
        <div>
          <p className="font-medium">És o criador deste conteúdo.</p>
          <p className="text-xs mt-1">
            Podes reler o que quiseres, mas não ganhas XP por consumir
            os teus próprios artigos ou lições. O XP vem dos leitores.
          </p>
        </div>
      </div>
    );
  } else if (completed) {
    // já completo (XP atribuído no passado)
    banner = (
      <div className="border border-green-300 bg-green-50 text-green-900 rounded-lg p-4 text-sm flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
          <div>
            <p className="font-medium">Content completed</p>
            <p className="text-xs mt-1">
              O XP para este conteúdo já foi atribuído. Podes reler
              sempre que quiseres sem alterar o teu XP.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Timer className="h-4 w-4 text-green-600" />
          <span>Done</span>
        </div>
      </div>
    );
  } else {
    // em progresso normal
    const overall =
      (timeProgress * 0.5 + scrollProgress * 0.5) > 100
        ? 100
        : (timeProgress * 0.5 + scrollProgress * 0.5);

    banner = (
      <div className="border border-blue-200 bg-blue-50 text-blue-900 rounded-lg p-4 text-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-blue-600" />
            <span className="font-medium">
              Completa a leitura para ganhar {xpReward} XP.
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-800">
            <Clock className="h-4 w-4" />
            <span>
              ~{estimatedMinutes} min ·{' '}
              {Math.round(overall)}% concluído
            </span>
          </div>
        </div>

        <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all"
            style={{ width: `${overall}%` }}
          />
        </div>

        <p className="text-xs text-blue-800">
          O progresso é calculado com base no tempo de leitura e na
          rolagem da página. Quando estiver quase no fim, o XP é
          registado automaticamente.
          {isAwarding && ' A registar XP...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {banner}
      <div>{children}</div>
    </div>
  );
}
