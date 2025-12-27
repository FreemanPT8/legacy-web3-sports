'use client';

import { useMemo } from 'react';
import { Sparkles, Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ProgressSummary } from '@/lib/education/progressSummary';
import { XP_LEVELS } from '@/lib/education/xpLevels';
import { useLanguage } from '@/contexts/LanguageContext';
import { type Language } from '@/lib/i18n';

export type ProgressFetchState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'fallback'
  | 'error'
  | 'anonymous';

const FALLBACK_ACCENTS = [
  '#38bdf8',
  '#0ea5e9',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#f97316',
];

const LEVEL_LABELS: Record<
  string,
  Partial<Record<Language, string>>
> = {
  cadets: { pt: 'Cadete', es: 'Cadete', en: 'Cadet' },
  infantil: { pt: 'Infantil', es: 'Infantil', en: 'Youth' },
  juveniles: { pt: 'Juvenil', es: 'Juvenil', en: 'Intermediate' },
  juniors: { pt: 'Junior', es: 'Junior', en: 'Junior' },
  seniors: { pt: 'Sénior', es: 'Senior', en: 'Senior' },
  'hall-of-fame': { pt: 'Hall da Fama', es: 'Salón de la Fama', en: 'Hall of Fame' },
  master: { pt: 'Master', es: 'Master', en: 'Master' },
  legend: { pt: 'Lenda', es: 'Leyenda', en: 'Legend' },
};

const LEVEL_SLUG_ALIASES: Record<string, string> = {
  cadets: 'cadets',
  cadete: 'cadets',
  cadet: 'cadets',
  novato: 'cadets',
  newcomer: 'cadets',
  infantil: 'infantil',
  youth: 'infantil',
  beginner: 'infantil',
  juveniles: 'juveniles',
  juvenil: 'juveniles',
  juvenis: 'juveniles',
  intermediate: 'juveniles',
  juniors: 'juniors',
  junior: 'juniors',
  advanced: 'juniors',
  seniors: 'seniors',
  senior: 'seniors',
  expert: 'seniors',
  'hall-of-fame': 'hall-of-fame',
  hall: 'hall-of-fame',
  halloffame: 'hall-of-fame',
  halloff: 'hall-of-fame',
  master: 'master',
  legend: 'legend',
};

const FALLBACK_LEVEL_MAP: Record<string, string> = {
  newcomer: 'cadets',
  beginner: 'infantil',
  intermediate: 'juveniles',
  advanced: 'juniors',
  expert: 'seniors',
  hallOfFame: 'hall-of-fame',
  master: 'master',
  legend: 'legend',
};

const LESSON_PROGRESS_LABEL: Record<Language, string> = {
  pt: 'lições concluídas',
  es: 'lecciones completadas',
  en: 'lessons completed',
  fr: 'leçons terminées',
  it: 'lezioni completate',
  de: 'abgeschlossene Lektionen',
};

type LevelTimelineProps = {
  summary: ProgressSummary | null;
  state: ProgressFetchState;
  className?: string;
};

export function LevelTimeline({ summary, state, className }: LevelTimelineProps) {
  const { language: activeLanguage } = useLanguage();
  const language = (activeLanguage ?? 'en') as Language;

  const levelsToRender = useMemo(() => {
    const baseLevels = summary?.levels
      ? summary.levels.filter((level) => level.isVisible)
      : XP_LEVELS.map((level, index) => ({
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

    const startHere = summary?.startHere;

    return baseLevels.map((level, index) => {
      const normalizedSlug = normalizeLevelSlug(level.slug);
      const localizedLabel =
        LEVEL_LABELS[normalizedSlug]?.[language] ||
        LEVEL_LABELS[normalizedSlug]?.en ||
        LEVEL_LABELS[normalizedSlug]?.pt ||
        level.title;
      const localizedShort =
        LEVEL_LABELS[normalizedSlug]?.[language] ||
        level.shortLabel ||
        localizedLabel;

      let progressPercent = level.progressPercent ?? 0;
      let lessonProgressLabel: string | null = null;

      if (
        startHere &&
        normalizedSlug === 'cadets' &&
        typeof startHere.totalLessons === 'number' &&
        startHere.totalLessons > 0
      ) {
        progressPercent = Math.max(progressPercent, startHere.progressPercent ?? 0);
        const label =
          LESSON_PROGRESS_LABEL[language] || LESSON_PROGRESS_LABEL.en;
        lessonProgressLabel = `${startHere.completedLessons ?? 0}/${startHere.totalLessons} ${label}`;
      }

      return {
        ...level,
        slug: normalizedSlug || level.slug || `level-${index}`,
        title: localizedLabel,
        shortLabel: localizedShort,
        progressPercent,
        lessonProgressLabel,
      };
    });
  }, [summary, language]);

  const badgeStrip = useMemo(() => {
    if (!summary?.badges) {
      return { earned: [], upcoming: [] };
    }

    const earned = summary.badges.earned.slice(0, 5);
    const upcoming = summary.badges.upcoming.slice(0, 5);
    return { earned, upcoming };
  }, [summary]);

  const timelineStatus =
    state === 'anonymous'
      ? 'Faz login para desbloquear o mapa dinâmico.'
      : null;

  const isLoading = state === 'idle' || state === 'loading';
  const hasError = state === 'error';
  const isFallback = state === 'fallback';

  return (
    <div
      className={cn(
        'rounded-3xl border border-white/10 bg-[#02050a] p-6 text-white shadow-[0_25px_60px_rgba(4,6,11,0.66)]',
        className,
      )}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-cyan-400">
            Academia Legacy
          </p>
          <h2 className="mt-2 text-3xl font-semibold">Linha Temporal de XP</h2>
          <p className="mt-1 text-sm text-slate-300">
            Visualiza cada nível, o XP necessário e os badges que desbloqueias ao longo da jornada.
          </p>
        </div>
        {summary?.xp && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">XP atual</p>
            <div className="mt-1 text-2xl font-semibold text-white">
              {summary.xp.total.toLocaleString()} XP
            </div>
            <p className="text-xs text-slate-300">
              {summary.xp.currentLevel.label}
              {summary.xp.currentLevel.nextLevelLabel
                ? ` · ${summary.xp.currentLevel.xpToNext} XP para ${summary.xp.currentLevel.nextLevelLabel}`
                : null}
            </p>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          A sincronizar o teu nível atual...
        </div>
      )}

      {hasError && (
        <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          Não foi possível carregar a timeline neste momento. Tenta novamente mais tarde.
        </div>
      )}


      {isFallback && (
        <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          A mostrar um resumo estimado com base no teu XP local. Assim que o servidor sincronizar, vais ver dados completos.
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
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
    lessonProgressLabel?: string | null;
  };
  position: number;
  total: number;
}) {
  const accent =
    level.accentColor || FALLBACK_ACCENTS[position % FALLBACK_ACCENTS.length];
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
      <p className="text-sm text-slate-400">{formatXpRange(level.minXp, level.maxXp)}</p>
      {level.lessonProgressLabel && (
        <p className="mt-1 text-xs text-slate-400">{level.lessonProgressLabel}</p>
      )}

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
            <p className="text-slate-300 text-xs">
              {level.lockedReason || 'Completa o nível anterior.'}
            </p>
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
        <div key={badge.slug} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <Badge variant="outline" className={cn(
            'border-white/30 text-[10px] uppercase tracking-[0.4em]',
            badge.tier === 'legendary' && 'border-amber-300 text-amber-200',
            badge.tier === 'rare' && 'border-cyan-300 text-cyan-200',
            badge.tier === 'uncommon' && 'border-emerald-300 text-emerald-200',
          )}>
            {badge.tier ? badge.tier : 'ganho'}
          </Badge>
          <div className="text-sm">
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

function normalizeLevelSlug(value?: string | null): string {
  if (!value) return '';
  const trimmed = value.toLowerCase().replace(/\s+/g, '-');
  return LEVEL_SLUG_ALIASES[trimmed] || FALLBACK_LEVEL_MAP[trimmed] || trimmed;
}
