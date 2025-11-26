'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle, Clock, ArrowDown } from 'lucide-react';

type ContentTrackerProps = {
  contentId: string;
  contentType: 'lesson' | 'blog';
  xpReward: number;
  estimatedMinutes: number;
  initialCompleted?: boolean;
  children: React.ReactNode;
};

export function ContentTracker({
  contentId,
  contentType,
  xpReward,
  estimatedMinutes,
  initialCompleted = false,
  children,
}: ContentTrackerProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [isCompleted, setIsCompleted] = useState<boolean>(!!initialCompleted);
  const [scrollCompleted, setScrollCompleted] = useState<boolean>(!!initialCompleted);
  const [timeCompleted, setTimeCompleted] = useState<boolean>(!!initialCompleted);
  const [secondsRead, setSecondsRead] = useState<number>(0);
  const [awardingXP, setAwardingXP] = useState<boolean>(false);
  const [awardError, setAwardError] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement | null>(null);

  // 33% do tempo estimado (em segundos)
  const requiredSeconds = Math.max(
    30,
    Math.round((estimatedMinutes || 10) * 60 * 0.33),
  );

  // Se o initialCompleted mudar (ex: refetch), sincronizamos
  useEffect(() => {
    if (initialCompleted) {
      setIsCompleted(true);
      setScrollCompleted(true);
      setTimeCompleted(true);
    }
  }, [initialCompleted]);

  // 📌 TRACK SCROLL
  useEffect(() => {
    if (!contentRef.current || isCompleted) return;

    const el = contentRef.current;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const windowHeight =
        window.innerHeight || document.documentElement.clientHeight;

      // Parte inferior do conteúdo dentro do viewport → consideramos "scrollCompleted"
      if (rect.bottom <= windowHeight + 50) {
        setScrollCompleted(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Verifica logo ao montar (caso o conteúdo já caiba todo no ecrã)
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isCompleted]);

  // ⏱ TRACK TEMPO
  useEffect(() => {
    if (isCompleted || timeCompleted) return;

    let interval: number | null = null;

    interval = window.setInterval(() => {
      setSecondsRead((prev) => {
        const next = prev + 1;
        if (next >= requiredSeconds) {
          if (interval) {
            clearInterval(interval);
          }
          setTimeCompleted(true);
        }
        return next;
      });
    }, 1000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [requiredSeconds, isCompleted, timeCompleted]);

  // 🧠 QUANDO SCROLL + TEMPO ESTÃO OK → TENTAR DAR XP (APENAS 1ª VEZ + SÓ COM USER)
  useEffect(() => {
    // se já está completo (do backend ou de uma corrida anterior), não faz nada
    if (initialCompleted || isCompleted) return;
    if (!scrollCompleted || !timeCompleted) return;

    // Sem utilizador logado -> não há XP
    if (!user) {
      setIsCompleted(true);
      return;
    }

    const userId = user.id; // TS agora sabe que user não é null, por causa do if acima

    const award = async () => {
      try {
        setAwardingXP(true);
        setAwardError(null);

        const endpoint =
          contentType === 'lesson'
            ? `/api/lessons/${contentId}/complete`
            : `/api/blog/${contentId}/read`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            xpEarned: xpReward,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          console.error('Error awarding XP:', data);
          setAwardError(data.error || 'Failed to award XP.');
          // Mesmo que a API falhe, consideramos o conteúdo completo do ponto de vista de tracking
          setIsCompleted(true);
          return;
        }

        setIsCompleted(true);
      } catch (err) {
        console.error('Network error awarding XP:', err);
        setAwardError('Network error while awarding XP.');
        setIsCompleted(true);
      } finally {
        setAwardingXP(false);
      }
    };

    award();
  }, [
    contentId,
    contentType,
    xpReward,
    scrollCompleted,
    timeCompleted,
    isCompleted,
    initialCompleted,
    user,
  ]);

  const scrollLabel = scrollCompleted
    ? t('tracker.scrolledToEnd') || 'Scrolled to the end'
    : t('tracker.scrollToEnd') || 'Scroll to the end';

  const timeLabel = timeCompleted
    ? t('tracker.timeCompleted') || 'Time requirement met'
    : t('tracker.timeReading', {
        secondsRead,
        requiredSeconds,
      }) ||
      `Read for ${secondsRead}s / ${requiredSeconds}s`;

  const statusLabel = !user
    ? t('tracker.loginForXP') || 'Login to earn XP from this content.'
    : isCompleted
    ? t('tracker.completedOnce') ||
      'XP was granted the first time you completed this content.'
    : awardingXP
    ? t('tracker.awardingXP') || 'XP will be added shortly...'
    : t('tracker.inProgress') || 'Complete the conditions below to earn XP.';

  return (
    <div className="space-y-6">
      {/* BARRA DE STATUS */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm flex flex-col gap-1">
        <div className="font-semibold text-blue-900 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {statusLabel}
        </div>

        {awardError && (
          <div className="text-xs text-red-600 mt-1">
            {awardError}
          </div>
        )}

        <div className="mt-2 grid gap-2 md:grid-cols-2 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                scrollCompleted
                  ? 'bg-green-500 border-green-600'
                  : 'bg-white border-blue-400'
              }`}
            >
              {scrollCompleted && (
                <CheckCircle className="h-3 w-3 text-white" />
              )}
            </span>
            <span>{scrollLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                timeCompleted
                  ? 'bg-green-500 border-green-600'
                  : 'bg-white border-blue-400'
              }`}
            >
              {timeCompleted && (
                <CheckCircle className="h-3 w-3 text-white" />
              )}
            </span>
            <span>
              <Clock className="h-3 w-3 inline mr-1" />
              {timeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* CONTEÚDO TRACKED */}
      <div ref={contentRef}>{children}</div>

      {/* DICA PARA FAZER SCROLL */}
      {!scrollCompleted && (
        <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
          <ArrowDown className="h-4 w-4 mr-1" />
          {t('tracker.keepScrolling') || 'Keep scrolling to mark as read.'}
        </div>
      )}
    </div>
  );
}
