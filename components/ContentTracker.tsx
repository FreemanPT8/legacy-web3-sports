'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Award, CheckCircle } from 'lucide-react';

type ContentTrackerProps = {
  contentId: string;
  contentType: 'lesson' | 'blog';
  xpReward: number;
  estimatedMinutes?: number; // tempo estimado de leitura
  children: React.ReactNode;
  onComplete?: (xpEarned?: number) => void;
  initialCompleted?: boolean; // 👈 NOVO
};

export function ContentTracker({
  contentId,
  contentType,
  xpReward,
  estimatedMinutes = 5,
  children,
  onComplete,
  initialCompleted = false,
}: ContentTrackerProps) {
  const { user } = useAuth();

  const [scrolledBottom, setScrolledBottom] = useState(false);
  const [readSeconds, setReadSeconds] = useState(0);
  const [timeOk, setTimeOk] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [awarded, setAwarded] = useState(false);

  // 33% do tempo estimado, mínimo 10 segundos
  const requiredSeconds = Math.max(
    10,
    Math.round(estimatedMinutes * 60 * 0.33),
  );

  // Se já vem como concluído do backend, marcamos logo tudo green
  useEffect(() => {
    if (initialCompleted) {
      setScrolledBottom(true);
      setTimeOk(true);
      setAwarded(true);
    }
  }, [initialCompleted]);

  // Contador de tempo (não corre se já estava completo)
  useEffect(() => {
    if (initialCompleted) return;

    const interval = window.setInterval(() => {
      setReadSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [initialCompleted]);

  // Marca quando chega ao tempo mínimo
  useEffect(() => {
    if (readSeconds >= requiredSeconds) {
      setTimeOk(true);
    }
  }, [readSeconds, requiredSeconds]);

  // Detectar scroll até ao fundo (mesmo para já completos, só para UI ficar bonita)
  useEffect(() => {
    if (initialCompleted) return;

    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const viewportHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;

      if (scrollY + viewportHeight >= fullHeight - 32) {
        setScrolledBottom(true);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [initialCompleted]);

  // Quando cumpre as duas condições → award XP (se tiver user e ainda não tiver sido award antes)
  useEffect(() => {
    if (!user) return; // sem login não há XP
    if (initialCompleted) return; // já registado noutra sessão
    if (awarded || awarding) return;
    if (!timeOk || !scrolledBottom) return;

    const sendCompletion = async () => {
      try {
        setAwarding(true);

        const endpoint =
          contentType === 'lesson'
            ? `/api/lessons/${contentId}/complete`
            : `/api/blog/${contentId}/read`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            xpEarned: xpReward,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          console.error('Error awarding XP:', data);
          setAwarding(false);
          return;
        }

        setAwarded(true);
        setAwarding(false);

        if (onComplete) {
          onComplete(
            typeof data.xpEarned === 'number'
              ? data.xpEarned
              : xpReward,
          );
        }
      } catch (error) {
        console.error('Network error awarding XP:', error);
        setAwarding(false);
      }
    };

    sendCompletion();
  }, [
    user,
    initialCompleted,
    awarded,
    awarding,
    timeOk,
    scrolledBottom,
    contentId,
    contentType,
    xpReward,
    onComplete,
  ]);

  const showAlready =
    user && (initialCompleted || awarded);

  const showWillBeAdded =
    user && !initialCompleted && timeOk && scrolledBottom && !awarded;

  return (
    <>
      {children}

      <div className="fixed bottom-6 right-6 z-40">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl px-4 py-3 w-72 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Reading Progress</span>
            {user ? (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Award className="h-3 w-3" />
                {xpReward} XP
              </span>
            ) : (
              <span className="text-[11px] text-gray-500">
                Login to earn XP
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {/* Scroll condition */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-3 w-3 rounded-full border ${
                    scrolledBottom || initialCompleted
                      ? 'bg-green-500 border-green-500'
                      : 'bg-gray-200 border-gray-300'
                  }`}
                />
                <span>Scroll to bottom</span>
              </div>
              {(scrolledBottom || initialCompleted) && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
            </div>

            {/* Time condition */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-3 w-3 rounded-full border ${
                    timeOk || initialCompleted
                      ? 'bg-green-500 border-green-500'
                      : 'bg-gray-200 border-gray-300'
                  }`}
                />
                <span>
                  Read for {readSeconds}s / {requiredSeconds}s
                </span>
              </div>
              {(timeOk || initialCompleted) && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
            </div>
          </div>

          {showWillBeAdded && (
            <div className="mt-2 text-[11px] text-green-700 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              XP will be added shortly
            </div>
          )}

          {showAlready && !showWillBeAdded && (
            <div className="mt-2 text-[11px] text-green-700 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              XP already awarded for this content
            </div>
          )}
        </div>
      </div>
    </>
  );
}
