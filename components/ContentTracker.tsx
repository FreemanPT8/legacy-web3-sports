'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ContentTrackerProps = {
  contentId: string;
  contentType: 'blog' | 'lesson';
  userId: string | null;
  xpReward: number;
  estimatedMinutes: number;
  initialCompleted?: boolean;
  onComplete?: () => void;
  children: React.ReactNode;
};

export function ContentTracker({
  contentId,
  contentType,
  userId,
  xpReward,
  estimatedMinutes,
  initialCompleted = false,
  onComplete,
  children,
}: ContentTrackerProps) {
  const [completed, setCompleted] = useState<boolean>(initialCompleted);
  const [secondsRead, setSecondsRead] = useState<number>(
    initialCompleted ? estimatedMinutes * 60 : 0,
  );
  const [awarding, setAwarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se o backend passar de não-completo para completo (ex: refresh)
  useEffect(() => {
    setCompleted(initialCompleted);
    if (initialCompleted) {
      setSecondsRead(estimatedMinutes * 60);
    }
  }, [initialCompleted, estimatedMinutes]);

  const requiredSeconds = useMemo(() => {
    const base = estimatedMinutes * 60;
    // Podemos exigir, por ex., 70% do tempo estimado, mas nunca menos de 30s
    return Math.max(30, Math.round(base * 0.7));
  }, [estimatedMinutes]);

  // Timer simples enquanto o utilizador está na página
  useEffect(() => {
    if (!userId) return;      // sem login não contamos tempo
    if (completed) return;    // já completo → não continua a contar

    const interval = window.setInterval(() => {
      setSecondsRead((s) => s + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [userId, completed]);

  // Quando o tempo mínimo é atingido, tentar atribuir XP
  useEffect(() => {
    if (!userId) return;
    if (completed) return;
    if (awarding) return;
    if (secondsRead < requiredSeconds) return;

    const award = async () => {
      try {
        setAwarding(true);
        setError(null);

        const url =
          contentType === 'blog'
            ? `/api/blog/${contentId}/read`
            : `/api/lessons/${contentId}/complete`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, xpEarned: xpReward }),
        });

        const data = await res.json();

        // Já tinha XP ou acabou de receber → marcamos como completo
        if (
          res.ok &&
          data.success
        ) {
          setCompleted(true);
          onComplete?.();
        } else if (data.alreadyCompleted || res.status === 409) {
          setCompleted(true);
          onComplete?.();
        } else {
          setError(data.error || 'Failed to award XP.');
        }
      } catch (err) {
        console.error('ContentTracker award error:', err);
        setError('Failed to award XP.');
      } finally {
        setAwarding(false);
      }
    };

    award();
  }, [
    userId,
    contentId,
    contentType,
    xpReward,
    secondsRead,
    requiredSeconds,
    completed,
    awarding,
    onComplete,
  ]);

  // --- UI helpers ---

  const progressPercent = useMemo(() => {
    if (completed) return 100;
    return Math.min(100, Math.round((secondsRead / requiredSeconds) * 100));
  }, [secondsRead, requiredSeconds, completed]);

  const label =
    contentType === 'blog' ? 'article' : 'lesson';

  // --- RENDER ---

  // SEM LOGIN → mostra aviso mas NUNCA bloqueia o conteúdo
  if (!userId) {
    return (
      <>
        <Card className="mb-4 border-dashed border-amber-300 bg-amber-50/60 dark:bg-amber-900/20">
          <div className="flex items-start gap-3 p-4 text-sm text-amber-800 dark:text-amber-100">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <div>
              <p className="font-medium">
                Reading tracker available only for logged users.
              </p>
              <p className="text-xs mt-1">
                You can still read everything, but XP is only awarded when logged in.
              </p>
            </div>
          </div>
        </Card>
        {children}
      </>
    );
  }

  return (
    <>
      {/* Barra / estado de progresso */}
      <Card className="mb-4">
        <div className="p-4 text-sm">
          {completed ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">
                    Content completed
                  </p>
                  <p className="text-xs text-green-700/80">
                    XP for this {label} was already awarded. You can revisit it
                    any time without changing your XP.
                  </p>
                </div>
              </div>
              <Badge className="bg-green-600 text-white">Done</Badge>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <Clock className="h-4 w-4" />
                  <span>
                    Reading in progress – stay a bit longer to earn{' '}
                    <strong>{xpReward} XP</strong>.
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {Math.max(0, requiredSeconds - secondsRead)}s left
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Conteúdo REAL – nunca é bloqueado */}
      {children}
    </>
  );
}
