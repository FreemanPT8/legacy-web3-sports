import { XP_LEVELS, getXpLevelByXp } from '@/lib/education/xpLevels';
import type { ProgressSummary } from '@/lib/education/progressSummary';

type FallbackOptions = {
  xpTotal?: number;
  startCourseSlug?: string;
};

const DEFAULT_START_COURSE = {
  slug: 'comeca-aqui',
  title: {
    pt: 'COMECA AQUI',
    es: 'EMPIEZA AQUI',
    en: 'START HERE',
  },
  description: {
    pt: 'Curso obrigatorio para desbloquear toda a experiencia da Academia Legacy.',
    es: 'Curso obligatorio para desbloquear toda la experiencia de la Academia Legacy.',
    en: 'Mandatory course that unlocks the full Legacy Academy experience.',
  },
  availableLanguages: ['pt', 'es', 'en'],
  primaryLanguage: 'pt',
};

export function buildFallbackProgressSummary(options: FallbackOptions = {}): ProgressSummary {
  const xpTotal = Math.max(0, options.xpTotal ?? 0);
  const startCourseSlug = options.startCourseSlug || DEFAULT_START_COURSE.slug;
  const currentLevel = getXpLevelByXp(xpTotal);
  const currentLevelIndex = XP_LEVELS.findIndex((level) => level.key === currentLevel.key);
  const nextLevel = currentLevelIndex >= 0 ? XP_LEVELS[currentLevelIndex + 1] : undefined;

  const currentLevelMax =
    typeof (currentLevel as { max?: number }).max === 'number'
      ? (currentLevel as { max: number }).max
      : null;
  const currentLevelSpan =
    typeof currentLevelMax === 'number'
      ? Math.max(currentLevelMax - currentLevel.min, 1)
      : Math.max(xpTotal - currentLevel.min, 1);
  const currentLevelProgress =
    typeof currentLevelMax === 'number'
      ? Math.min(100, Math.round(((xpTotal - currentLevel.min) / currentLevelSpan) * 100))
      : 100;
  const xpToNext = nextLevel ? Math.max(nextLevel.min - xpTotal, 0) : null;

  const levels = XP_LEVELS.map((level) => {
    const maxXp =
      typeof (level as { max?: number }).max === 'number'
        ? (level as { max: number }).max
        : null;
    const unlocked = xpTotal >= level.min;
    const span = typeof maxXp === 'number' ? Math.max(maxXp - level.min, 1) : xpTotal - level.min;
    const progressPercent =
      unlocked && typeof maxXp === 'number'
        ? Math.min(100, Math.round(((xpTotal - level.min) / span) * 100))
        : unlocked
          ? 5
          : 0;

    return {
      slug: level.key,
      title: level.label,
      shortLabel: level.label,
      minXp: level.min,
      maxXp,
      isVisible: true,
      isUnlocked: unlocked,
      isCompleted: false,
      progressPercent: Math.max(0, progressPercent),
      lockedReason: unlocked
        ? null
        : level.min > 0
          ? `Alcanca ${level.min} XP para desbloquear este nivel.`
          : 'Desbloqueia o curso inicial para comecar.',
      accentColor: undefined,
    };
  });

  return {
    xp: {
      total: xpTotal,
      currentLevel: {
        key: currentLevel.key,
        label: currentLevel.label,
        minXp: currentLevel.min,
        maxXp: currentLevelMax,
        progressPercent: Math.max(0, currentLevelProgress),
        xpToNext,
        nextLevelLabel: nextLevel?.label ?? null,
      },
    },
    startHere: {
      courseId: null,
      slug: startCourseSlug,
      totalLessons: 0,
      completedLessons: 0,
      progressPercent: 0,
      isCompleted: false,
      missingLessons: 0,
    },
    startCourse: {
      slug: startCourseSlug,
      title: DEFAULT_START_COURSE.title,
      description: DEFAULT_START_COURSE.description,
      available_languages: DEFAULT_START_COURSE.availableLanguages,
      primary_language: DEFAULT_START_COURSE.primaryLanguage,
    },
    levels,
    coursesByLevel: {},
    badges: {
      earned: [],
      upcoming: [],
    },
  };
}
