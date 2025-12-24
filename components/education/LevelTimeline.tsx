'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import type { ProgressSummary } from '@/lib/education/progressSummary';
import { XP_LEVELS } from '@/lib/education/xpLevels';

type FetchState = 'idle' | 'loading' | 'success' | 'error' | 'anonymous';

const FALLBACK_ACCENTS = [
  '#38bdf8',
  '#0ea5e9',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#f97316',
];

export function LevelTimeline({ className }: { className?: string }) {
  const { user, getToken } = useAuth();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [state, setState] = useState<FetchState>('idle');

  useEffect(() => {
    if (!user) {
      setState('anonymous');
      setSummary(null);
      return;
    }

    const controller = new AbortController();
    const fetchSummary = async () => {
      setState('loading');
      try {
        const token = getToken();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch('/api/education/progress', {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load progress summary: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success || !data.summary) {
          throw new Error('Invalid response payload for progress summary.');
        }

        setSummary(data.summary as ProgressSummary);
        setState('success');
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('LevelTimeline fetch error:', error);
        setState('error');
      }
    };

    void fetchSummary();
    return () => controller.abort();
  }, [user, getToken]);

  const levelsToRender = useMemo(() => {
    if (summary?.levels) {
      return summary.levels.filter((level) => level.isVisible);
    }

    return XP_LEVELS.map((level, index) => ({
      slug: level.key,
      title: level.label,
      shortLabel: level.label,
      accentColor: FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.length],
      minXp: level.min,
      maxXp: (level as { max?: number }).max ?? null,
      isVisible: true,
      isUnlocked: false,
      isCompleted: false,
      progressPercent: 0,
      lockedReason: 'Autentica-te para acompanhar o teu progresso.',
    }));
  }, [summary]);

  const badgeStrip = useMemo(() => {
    if (!summary?.badges) {
      return { earned: [], upcoming: [] };
    }

    const earned = summary.badges.earned.slice(0, 5);
    const upcoming = summary.badges.upcoming.slice(0, 5);
    return { earned, upcoming };
  }, [summary]);

  const timelineStatus = state === 'anonymous' ? 'Faz login para desbloquear o mapa dinâmico.' : null;

  return (
    <div
      className={cn(
        'rounded-3xl border border-white/10 bg-[#02050a] p-6 text-white shadow-[0_25px_60px_rgba(4,6,11,0.66)]',
        className,
      )}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-cyan-400">Academia Legacy</p>
          <h2 className="mt-2 text-3xl font-semibold">Linha Temporal de XP</h2>
          <p className="mt-1 text-sm text-slate-300">
            Visualiza cada nível, o XP necessário e os badges que desbloqueias ao longo da jornada.
          </p>
        </div>
        {summary?.xp && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">XP atual</p>
            <div className="mt-1 text-2xl font-semibold text-white">{summary.xp.total.toLocaleString()} XP</div>
            <p className="text-xs text-slate-300">
              {summary.xp.currentLevel.label}
              {summary.xp.currentLevel.nextLevelLabel
                ? ` · ${summary.xp.currentLevel.xpToNext} XP para ${summary.xp.currentLevel.nextLevelLabel}`
                : null}
            </p>
          </div>
        )}
      </div>

      {state === 'loading' && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          A sincronizar o teu nível atual...
        </div>
      )}

      {state === 'error' && (
        <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          Não foi possível carregar a timeline neste momento. Tenta novamente mais tarde.
        </div>
      )}

      {timelineStatus && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          {timelineStatus}
        </div>
      )}

      <div className="mt-8 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
        <div className="flex min-w-max gap-4">
          {levelsToRender.map((level, index) => (
            <LevelCard
              key={level.slug}
              level={level}
              position={index + 1}
              total={levelsToRender.length}
            />
          ))}
        </div>
      </div>

      <div className="mt-10 space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-slate-400">
          <Sparkles className="h-4 w-4 text-cyan-300" />
          Badges
        </div>
        {summary ? (
          <BadgeStrip earned={badgeStrip.earned} upcoming={badgeStrip.upcoming} />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-transparent p-4 text-sm text-slate-300">
            Ganha XP e participa na comunidade para desbloquear badges exclusivos.
          </div>
        )}
      </div>
    </div>
  );
}

function LevelCard({
  level,
  position,
  total,
}: {
  level: {
    slug: string;
    title: string;
    shortLabel?: string | null;
    accentColor?: string | null;
    minXp?: number | null;
    maxXp?: number | null;
    isUnlocked: boolean;
    isCompleted: boolean;
    progressPercent: number;
    lockedReason: string | null;
  };
  position: number;
  total: number;
}) {
  const accent = level.accentColor || FALLBACK_ACCENTS[position % FALLBACK_ACCENTS.length];
  const isLocked = !level.isUnlocked;
  const isDone = level.isCompleted;

  return (
    <div
      className={cn(
        'relative flex min-w-[260px] max-w-[300px] flex-col rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 p-5',
        isLocked && 'opacity-70',
      )}
      style={{
        boxShadow: `0 15px 40px ${accent}25`,
        borderColor: `${accent}40`,
      }}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-300">
        <span>
          Nível {position}/{total}
        </span>
        <span>{level.shortLabel || level.title}</span>
      </div>

      <h3 className="mt-4 text-2xl font-semibold">{level.title}</h3>
      <p className="text-sm text-slate-400">
        {formatXpRange(level.minXp, level.maxXp)}
      </p>

      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Progresso</span>
          <span>{Math.min(level.progressPercent, 100)}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white/10">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${Math.min(level.progressPercent, 100)}%`,
              background: accent,
            }}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm">
        {isLocked ? (
          <>
            <Lock className="h-4 w-4 text-slate-400" />
            <p className="text-slate-300 text-xs">{level.lockedReason || 'Completa o nível anterior.'}</p>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <p className="text-xs text-slate-200">
              {isDone ? 'Completaste este nível.' : 'Nível desbloqueado. Continua a ganhar XP!'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function BadgeStrip({
  earned,
  upcoming,
}: {
  earned: ProgressSummary['badges']['earned'];
  upcoming: ProgressSummary['badges']['upcoming'];
}) {
  if (earned.length === 0 && upcoming.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        Assim que conquistares badges, eles aparecem aqui com todos os detalhes.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {earned.map((badge) => (
        <div
          key={badge.slug}
          className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm"
        >
          <Badge
            variant="outline"
            className="border-white/30 bg-transparent text-[10px] uppercase tracking-[0.4em]"
          >
            Ganho
          </Badge>
          <div>
            <p className="font-semibold text-white">{badge.title}</p>
            <p className="text-xs text-slate-300">{badge.description}</p>
          </div>
        </div>
      ))}

      {upcoming.map((badge) => (
        <div
          key={badge.slug}
          className="flex items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-transparent px-4 py-2 text-sm text-slate-400"
        >
          <Trophy className="h-4 w-4 text-slate-500" />
          <div>
            <p className="font-semibold text-slate-200">{badge.title}</p>
            <p className="text-xs text-slate-400">Completa desafios para desbloquear.</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatXpRange(min?: number | null, max?: number | null) {
  const lower = typeof min === 'number' ? min.toLocaleString() : '0';
  if (typeof max === 'number') {
    return `${lower}-${max.toLocaleString()} XP`;
  }
  return `${lower}+ XP`;
}
