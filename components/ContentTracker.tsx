'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, ArrowDown } from 'lucide-react';

type ContentTrackerProps = {
  contentId: string;
  contentType: 'lesson' | 'blog';
  xpReward: number;
  /** segundos necessários para contar como "leu o suficiente" */
  requiredSeconds?: number;
  /** se o backend já sabe que este conteúdo foi completado uma vez */
  initialCompleted?: boolean;
  onComplete?: () => void;
  children: React.ReactNode;
};

export function ContentTracker({
  contentId,
  contentType,
  xpReward,
  requiredSeconds = 60,
  initialCompleted = false,
  onComplete,
  children,
}: ContentTrackerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [seconds, setSeconds] = useState(() =>
    initialCompleted ? requiredSeconds : 0,
  );
  const [scrollDone, setScrollDone] = useState(initialCompleted);
  const [timeDone, setTimeDone] = useState(initialCompleted);
  const [completed, setCompleted] = useState(initialCompleted);
  const [sending, setSending] = useState(false);

  const targetSeconds = Math.max(15, Math.round(requiredSeconds));

  // 🔁 Detectar scroll até ao fundo + tempo de leitura
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Se já está completo ou não há user → não vale a pena trackear XP
    if (completed || !user) return;

    function handleScroll() {
      const scrollPos =
        window.innerHeight + window.scrollY;
      const bottom =
        document.documentElement.scrollHeight - 80;

      if (scrollPos >= bottom) {
        setScrollDone(true);
      }
    }

    window.addEventListener('scroll', handleScroll);

    const interval = window.setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        if (next >= targetSeconds) {
          setTimeDone(true);
        }
        return next;
      });
    }, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.clearInterval(interval);
    };
  }, [completed, user, targetSeconds]);

  // 🧠 Quando ambos os critérios estão ok → marcar complete + dar XP (só uma vez)
  useEffect(() => {
    if (!user) return; // anónimos não ganham XP
    if (completed) return;
    if (!scrollDone || !timeDone) return;

    let cancelled = false;

    async function sendCompletion() {
      try {
        setSending(true);

        const url =
          contentType === 'lesson'
            ? `/api/lessons/${contentId}/complete`
            : `/api/blog/${contentId}/read`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            xpEarned: xpReward,
          }),
        });

        const data = await res.json();

        if (cancelled) return;

        if (res.ok && data.success) {
          toast({
            title: 'XP earned',
            description: `You received ${xpReward} XP for this content.`,
          });
        } else if (
          data?.error === 'Article already read' ||
          data?.error === 'Lesson already completed'
        ) {
          // Já tinha XP, tudo bem – garantimos só que o UI marca como completo
        } else {
          console.error('Error completing content:', data);
          toast({
            title: 'Could not add XP',
            description: data?.error || 'Please try again later.',
            variant: 'destructive',
          });
        }

        setCompleted(true);
        onComplete?.();
      } catch (err) {
        if (cancelled) return;
        console.error('Completion error:', err);
        toast({
          title: 'Network error',
          description: 'Could not record completion.',
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) {
          setSending(false);
        }
      }
    }

    sendCompletion();

    return () => {
      cancelled = true;
    };
  }, [
    scrollDone,
    timeDone,
    completed,
    user,
    contentType,
    contentId,
    xpReward,
    onComplete,
    toast,
  ]);

  const showTracker = true; // podemos sempre mostrar; para anónimo vira call-to-action

  return (
    <>
      {children}

      {showTracker && (
        <div className="fixed bottom-4 right-4 z-30">
          <div className="w-64 rounded-xl border bg-white shadow-lg p-3 text-xs space-y-2">
            <div className="font-semibold flex items-center justify-between">
              <span>Reading Progress</span>
              {completed && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Done
                </span>
              )}
            </div>

            {!user && (
              <p className="text-[11px] text-gray-500">
                Login to earn XP for this content.
              </p>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <ArrowDown className="h-3 w-3" />
                  Scroll to bottom
                </span>
                <CheckCircle
                  className={`h-3 w-3 ${
                    scrollDone ? 'text-green-600' : 'text-gray-300'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Read for {targetSeconds}s ({Math.min(seconds, targetSeconds)}s)
                </span>
                <CheckCircle
                  className={`h-3 w-3 ${
                    timeDone ? 'text-green-600' : 'text-gray-300'
                  }`}
                />
              </div>
            </div>

            {user && (
              <p className="text-[11px] text-gray-500">
                {completed
                  ? 'XP already added for this content.'
                  : sending
                  ? 'Adding XP...'
                  : 'XP will be added when both tasks are complete.'}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
