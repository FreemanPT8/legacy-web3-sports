'use client';

import {
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { getRandomXP, XP_REWARDS } from '@/lib/xp';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, Trophy } from 'lucide-react';

type ContentType = 'blog' | 'lesson';

interface ContentTrackerProps {
  contentId: string;
  contentType: ContentType;
  userId?: string | null;

  // ranges de XP opcionais
  xpMin?: number;
  xpMax?: number;
  minXp?: number;
  maxXp?: number;

  // se for passado, usamos valor fixo (min = max = xpReward)
  xpReward?: number;

  // apenas para UI / lógica futura (não é obrigatório usar)
  estimatedMinutes?: number;

  // flag vinda do backend a dizer se o conteúdo já foi concluído
  initialCompleted?: boolean;

  // callback opcional para o pai reagir quando conclui
  onComplete?: () => void;

  children?: ReactNode;
}

const MIN_SECONDS_BASE = 40; // tempo mínimo de leitura base
const REQUIRED_SCROLL = 85; // percentagem mínima de scroll

export function ContentTracker(props: ContentTrackerProps) {
  const {
    contentId,
    contentType,
    userId,
    xpMin,
    xpMax,
    minXp,
    maxXp,
    xpReward,
    estimatedMinutes,
    initialCompleted = false,
    onComplete,
    children,
  } = props;

  // calcular range de XP efectivo
  const baseMin =
    xpMin ??
    minXp ??
    (contentType === 'blog'
      ? XP_REWARDS.BLOG_MIN
      : XP_REWARDS.LESSON_MIN);

  const baseMax =
    xpMax ??
    maxXp ??
    (contentType === 'blog'
      ? XP_REWARDS.BLOG_MAX
      : XP_REWARDS.LESSON_MAX);

  const effectiveMin =
    xpReward !== undefined ? xpReward : baseMin;
  const effectiveMax =
    xpReward !== undefined ? xpReward : baseMax;

  // se quisermos refinar no futuro: ajustar tempo ao estimatedMinutes
  const MIN_SECONDS =
    typeof estimatedMinutes === 'number' && estimatedMinutes > 0
      ? Math.max(
          MIN_SECONDS_BASE,
          Math.round(estimatedMinutes * 60 * 0.5),
        )
      : MIN_SECONDS_BASE;

  const [seconds, setSeconds] = useState(0);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [completed, setCompleted] =
    useState<boolean>(initialCompleted);
  const [awarding, setAwarding] = useState(false);
  const [alreadyAwarded, setAlreadyAwarded] =
    useState<boolean>(initialCompleted);

  // alinhar com o backend sempre que o initialCompleted mudar
  useEffect(() => {
    setCompleted(initialCompleted);
    setAlreadyAwarded(initialCompleted);
  }, [initialCompleted]);

  const handleAwardXP = useCallback(async () => {
    if (!userId) return;
    if (completed || alreadyAwarded || awarding) return;

    try {
      setAwarding(true);
      const xpEarned = getRandomXP(
        effectiveMin,
        effectiveMax,
      );

      const endpoint =
        contentType === 'blog'
          ? `/api/blog/${contentId}/read`
          : `/api/lessons/${contentId}/complete`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          xpEarned,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error('Failed to award XP:', data.error);
        return;
      }

      setCompleted(true);
      setAlreadyAwarded(true);
      onComplete?.();
    } catch (error) {
      console.error('Error in handleAwardXP:', error);
    } finally {
      setAwarding(false);
    }
  }, [
    userId,
    contentId,
    contentType,
    effectiveMin,
    effectiveMax,
    completed,
    alreadyAwarded,
    awarding,
    onComplete,
  ]);

  // Tracking de tempo (só se ainda não estiver completo)
  useEffect(() => {
    if (!userId) return;
    if (completed || alreadyAwarded) return;

    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [userId, completed, alreadyAwarded]);

  // Tracking de scroll (só se ainda não estiver completo)
  useEffect(() => {
    if (!userId) return;
    if (completed || alreadyAwarded) return;

    const handleScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const scrollHeight =
        doc.scrollHeight - doc.clientHeight;

      if (scrollHeight <= 0) {
        setScrollPercent(100);
        return;
      }

      const percent = Math.min(
        100,
        Math.round((scrollTop / scrollHeight) * 100),
      );
      setScrollPercent(percent);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [userId, completed, alreadyAwarded]);

  // Quando tempo + scroll atingem os mínimos, tenta concluir
  useEffect(() => {
    if (!userId) return;
    if (completed || alreadyAwarded || awarding) return;

    if (seconds >= MIN_SECONDS && scrollPercent >= REQUIRED_SCROLL) {
      void handleAwardXP();
    }
  }, [
    userId,
    seconds,
    scrollPercent,
    completed,
    alreadyAwarded,
    awarding,
    MIN_SECONDS,
    handleAwardXP,
  ]);

  // Cálculos para UI
  const timeProgress = Math.min(
    100,
    Math.round((seconds / MIN_SECONDS) * 100),
  );
  const scrollProgress = Math.min(100, scrollPercent);
  const overall = Math.round(
    (timeProgress + scrollProgress) / 2,
  );

  let banner: ReactNode = null;

  if (!userId) {
    banner = (
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-4 w-4" />
          <span>
            Reading tracker available only for logged users.
          </span>
        </div>
        <p>
          You can still read everything, but XP is only awarded
          when logged in.
        </p>
      </div>
    );
  } else if (completed || alreadyAwarded) {
    // Conteúdo já concluído → não reinicia nada
    banner = (
      <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-950/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                Content completed
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                XP for this{' '}
                {contentType === 'blog'
                  ? 'article'
                  : 'lesson'}{' '}
                was already awarded. You can revisit it any time
                without changing your XP.
              </p>
            </div>
          </div>
          <Badge className="bg-green-600 text-xs">
            <Trophy className="h-3 w-3 mr-1" />
            Done
          </Badge>
        </div>
      </div>
    );
  } else {
    // Em progresso
    banner = (
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              Reading progress – XP tracker
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {effectiveMin}–{effectiveMax} XP
          </Badge>
        </div>

        <div className="space-y-2 mb-3 text-xs text-gray-700 dark:text-gray-200">
          <p>
            XP will be added once you read at least{' '}
            <strong>{MIN_SECONDS} seconds</strong> and reach{' '}
            <strong>{REQUIRED_SCROLL}%</strong> of this{' '}
            {contentType === 'blog' ? 'article' : 'lesson'}.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Time</span>
              <span>
                {seconds}s / {MIN_SECONDS}s ({timeProgress}%)
              </span>
            </div>
            <Progress value={timeProgress} />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Scroll</span>
              <span>{scrollProgress}%</span>
            </div>
            <Progress value={scrollProgress} />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Overall</span>
              <span>{overall}%</span>
            </div>
            <Progress value={overall} />
          </div>
        </div>

        {awarding && (
          <p className="mt-3 text-xs text-blue-700 dark:text-blue-300">
            Awarding XP…
          </p>
        )}
      </div>
    );
  }

  // Render final: banner + conteúdo original
  return (
    <div className="space-y-6">
      {banner}
      {children}
    </div>
  );
}

export default ContentTracker;
