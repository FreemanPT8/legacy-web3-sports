'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, ScrollText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type ContentType = 'lesson' | 'blog';

export interface ContentTrackerProps {
  children: React.ReactNode;
  contentId: string;
  contentType: ContentType;
  xpReward: number;
  /**
   * Estimativa de leitura em minutos (para calcular o tempo mínimo).
   * Se não vier, usa 5 minutos por defeito.
   */
  estimatedMinutes?: number;
  /**
   * Se o backend já sabe que este conteúdo está concluído
   * (ex: já existe registo em lesson_completions / blog_reads)
   */
  initialCompleted?: boolean;
  /**
   * Callback opcional para os ecrãs que querem sincronizar estado local
   * (ex: marcar badge "Completed" na página da lição / blog).
   */
  onComplete?: () => void;
}

export function ContentTracker({
  children,
  contentId,
  contentType,
  xpReward,
  estimatedMinutes = 5,
  initialCompleted = false,
  onComplete,
}: ContentTrackerProps) {
  const { user, getToken } = useAuth();

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [secondsRead, setSecondsRead] = useState(0);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [isAwarding, setIsAwarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const completionTriggeredRef = useRef(initialCompleted);

  // tempo mínimo em segundos = 33% da estimativa de leitura
  const requiredSeconds = Math.max(
    5,
    Math.round(estimatedMinutes * 60 * 0.33),
  );

  // Sempre que muda de conteúdo, reset de estado interno
  useEffect(() => {
    setHasScrolledToBottom(false);
    setSecondsRead(0);
    setIsCompleted(initialCompleted);
    setError(null);
    setInfo(null);
    completionTriggeredRef.current = initialCompleted;
  }, [contentId, initialCompleted]);

  // ⚠️ NOVO: para conteúdos de BLOG, confirmar no backend se já está concluído
  // Mesmo que initialCompleted venha a false, se o backend disser que já foi lido,
  // marcamos logo como completo e não voltamos a atribuir XP.
  useEffect(() => {
    if (!user) return;
    if (contentType !== 'blog') return;
    // Se já veio como completo via prop, não precisamos de revalidar
    if (initialCompleted) return;

    let cancelled = false;

    const checkCompletion = async () => {
      try {
        const token = getToken();
        const res = await fetch(`/api/blog/${contentId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          return;
        }

        if (!cancelled && data.isCompleted) {
          setIsCompleted(true);
          completionTriggeredRef.current = true;
          setInfo('Content already completed earlier – no extra XP.');
          if (onComplete) onComplete();
        }
      } catch (e) {
        console.error('Error checking blog completion:', e);
      }
    };

    void checkCompletion();

    return () => {
      cancelled = true;
    };
  }, [user, getToken, contentId, contentType, initialCompleted, onComplete]);

  // Timer de leitura (só se houver user e ainda não estiver concluído)
  useEffect(() => {
    if (!user || isCompleted) return;

    const interval = setInterval(() => {
      setSecondsRead((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [user, isCompleted]);

  // Listener de scroll para detetar "scroll até ao fundo"
  useEffect(() => {
    if (!user || isCompleted) return;

    const handleScroll = () => {
      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.body.offsetHeight - 48; // 48px de margem

      if (scrollPosition >= threshold) {
        setHasScrolledToBottom(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [user, isCompleted]);

  // Quando os 2 critérios forem cumpridos, tenta atribuir XP (uma vez)
  useEffect(() => {
    if (!user) return;
    if (isCompleted) return;
    if (completionTriggeredRef.current) return;

    if (hasScrolledToBottom && secondsRead >= requiredSeconds) {
      completionTriggeredRef.current = true;
      void completeContent(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasScrolledToBottom, secondsRead, requiredSeconds, user, isCompleted]);

  async function completeContent(userId: string) {
    try {
      setIsAwarding(true);
      setError(null);
      setInfo(null);

      const endpoint =
        contentType === 'lesson'
          ? `/api/lessons/${contentId}/complete`
          : `/api/blog/${contentId}/read`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          xpEarned: xpReward,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Se for "já completado", marcamos como concluído mas sem duplicar XP
        const rawError = typeof data.error === 'string' ? data.error.toLowerCase() : '';

        if (
          rawError.includes('already') ||
          rawError.includes('already completed') ||
          rawError.includes('already read')
        ) {
          setIsCompleted(true);
          setInfo('Already completed – no extra XP this time.');
          if (onComplete) onComplete();
          return;
        }

        setError(
          data.error ||
            'Could not register completion. Please try again.',
        );
        return;
      }

      setIsCompleted(true);
      setInfo(
        `+${xpReward} XP added to your account (first completion only).`,
      );
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Error completing content:', err);
      setError('Network error while registering completion.');
    } finally {
      setIsAwarding(false);
    }
  }

  const timeProgress = Math.min(
    100,
    Math.round((secondsRead / requiredSeconds) * 100),
  );

  return (
    <div className="space-y-4">
      {/* Conteúdo em si */}
      <div>{children}</div>

      {/* Se não houver user → só mensagem informativa, sem tracking */}
      {!user ? (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">
          To earn XP for this{' '}
          {contentType === 'lesson' ? 'lesson' : 'article'},{' '}
          please{' '}
          <span className="font-semibold">log in or sign up</span>.
          Your reading progress will not be tracked while logged out.
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-700 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">
              Reading Progress (XP tracker)
            </span>
            <span className="text-[11px] text-gray-500">
              XP: {xpReward}
            </span>
          </div>

          <div className="space-y-2">
            {/* Critério 1: Tempo de leitura */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {secondsRead >= requiredSeconds ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-400" />
                )}
                <div>
                  <div className="font-medium">
                    Read for at least {Math.round(requiredSeconds)} seconds
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {secondsRead}s / {requiredSeconds}s ({timeProgress}%)
                  </div>
                </div>
              </div>
            </div>

            {/* Critério 2: Scroll até ao fundo */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {hasScrolledToBottom ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <ScrollText className="h-4 w-4 text-gray-400" />
                )}
                <div>
                  <div className="font-medium">
                    Scroll to the bottom of the page
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {hasScrolledToBottom
                      ? 'Bottom reached'
                      : 'Keep scrolling to reach the end'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mensagens de estado */}
          <div className="mt-2 text-[11px]">
            {isCompleted ? (
              <p className="flex items-center gap-1 text-green-700">
                <CheckCircle className="h-3 w-3" />
                <span>
                  Content completed. XP awarded only the first time you fully consume it.
                </span>
              </p>
            ) : isAwarding ? (
              <p className="text-blue-600">XP will be added shortly...</p>
            ) : (
              <p className="text-gray-500">
                Complete both steps to receive XP for this{' '}
                {contentType === 'lesson' ? 'lesson' : 'article'}.
              </p>
            )}

            {info && (
              <p className="mt-1 text-blue-600">{info}</p>
            )}
            {error && (
              <p className="mt-1 text-red-600">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
