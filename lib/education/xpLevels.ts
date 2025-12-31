export const LEVEL_LANGUAGES = ['pt', 'es', 'en'] as const;
export type LevelLanguage = (typeof LEVEL_LANGUAGES)[number];

export type XpLevelKey =
  | 'newcomer'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'hallOfFame'
  | 'master'
  | 'legend';

type LevelTranslation = {
  title: string;
  range: string;
};

type LevelDefinition = {
  key: XpLevelKey;
  slug: string;
  min: number;
  max?: number;
  label: string;
  range: string;
  translations: Record<LevelLanguage, LevelTranslation>;
  aliases?: string[];
};

const createLevel = ({
  key,
  slug,
  min,
  max,
  translations,
  aliases = [],
}: {
  key: XpLevelKey;
  slug: string;
  min: number;
  max?: number;
  translations: Record<LevelLanguage, LevelTranslation>;
  aliases?: string[];
}): LevelDefinition => ({
  key,
  slug,
  min,
  max,
  translations,
  label: translations.pt.title,
  range: translations.pt.range,
  aliases,
});

export const XP_LEVELS: LevelDefinition[] = [
  createLevel({
    key: 'newcomer',
    slug: 'cadets',
    min: 0,
    max: 98,
    translations: {
      pt: { title: 'Cadete', range: '0-98 XP' },
      es: { title: 'Cadete', range: '0-98 XP' },
      en: { title: 'Cadet', range: '0-98 XP' },
    },
    aliases: ['cadete', 'cadet', 'novato', 'newcomer', 'beginner'],
  }),
  createLevel({
    key: 'beginner',
    slug: 'infantil',
    min: 99,
    max: 368,
    translations: {
      pt: { title: 'Infantil', range: '99-368 XP' },
      es: { title: 'Infantil', range: '99-368 XP' },
      en: { title: 'Youth', range: '99-368 XP' },
    },
    aliases: ['youth', 'infantil', 'infant'],
  }),
  createLevel({
    key: 'intermediate',
    slug: 'juveniles',
    min: 369,
    max: 999,
    translations: {
      pt: { title: 'Juvenil', range: '369-999 XP' },
      es: { title: 'Juvenil', range: '369-999 XP' },
      en: { title: 'Intermediate', range: '369-999 XP' },
    },
    aliases: ['juvenil', 'juveniles', 'juventud', 'intermediate'],
  }),
  createLevel({
    key: 'advanced',
    slug: 'juniors',
    min: 1000,
    max: 2221,
    translations: {
      pt: { title: 'Júnior', range: '1,000-2,221 XP' },
      es: { title: 'Junior', range: '1,000-2,221 XP' },
      en: { title: 'Junior', range: '1,000-2,221 XP' },
    },
    aliases: ['junior', 'júnior', 'juniors'],
  }),
  createLevel({
    key: 'expert',
    slug: 'seniors',
    min: 2222,
    max: 3332,
    translations: {
      pt: { title: 'Sénior', range: '2,222-3,332 XP' },
      es: { title: 'Senior', range: '2,222-3,332 XP' },
      en: { title: 'Senior', range: '2,222-3,332 XP' },
    },
    aliases: ['senior', 'sénior', 'seniors', 'expert'],
  }),
  createLevel({
    key: 'hallOfFame',
    slug: 'hall-of-fame',
    min: 3333,
    max: 4999,
    translations: {
      pt: { title: 'Hall of Fame', range: '3,333-4,999 XP' },
      es: { title: 'Hall of Fame', range: '3,333-4,999 XP' },
      en: { title: 'Hall of Fame', range: '3,333-4,999 XP' },
    },
    aliases: [
      'hall of fame',
      'hall da fama',
      'salon de la fama',
      'hall',
      'hall-of-fame',
    ],
  }),
  createLevel({
    key: 'master',
    slug: 'master',
    min: 5000,
    max: 9999,
    translations: {
      pt: { title: 'Master', range: '5,000-9,999 XP' },
      es: { title: 'Master', range: '5,000-9,999 XP' },
      en: { title: 'Master', range: '5,000-9,999 XP' },
    },
    aliases: ['maestro', 'master'],
  }),
  createLevel({
    key: 'legend',
    slug: 'legend',
    min: 10000,
    translations: {
      pt: { title: 'Lenda', range: '10,000+ XP' },
      es: { title: 'Leyenda', range: '10,000+ XP' },
      en: { title: 'Legend', range: '10,000+ XP' },
    },
    aliases: ['lenda', 'leyenda', 'legend'],
  }),
] as const;

export type XpLevel = (typeof XP_LEVELS)[number];

const aliasMap = new Map<string, string>();
const COURSE_LEVEL_OVERRIDES: Record<string, string> = {
  'eda38083-c8f2-4573-b2d1-3f96cf73539e': 'cadets',
  '416b0b74-ec44-4aea-be62-50c3ee60af29': 'infantil',
  '48594331-c77e-4d26-acc3-fc74b386bedb': 'infantil',
};

const normalizeString = (value: string) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

XP_LEVELS.forEach((level) => {
  const candidates = new Set<string>([
    level.slug,
    level.label,
    level.key,
    ...(level.aliases || []),
  ]);
  candidates.forEach((alias) => {
    aliasMap.set(normalizeString(alias), level.slug);
  });
});

export function normalizeLevelSlug(value?: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeString(value);
  return aliasMap.get(normalized) || null;
}

export function getLevelBySlug(slug: string | null): XpLevel | undefined {
  if (!slug) return undefined;
  const normalized = normalizeLevelSlug(slug) || slug;
  return XP_LEVELS.find((level) => level.slug === normalized);
}

export function getLevelTranslation(
  slug: string,
  language: LevelLanguage = 'pt',
): LevelTranslation | null {
  const level = getLevelBySlug(slug);
  if (!level) return null;
  return level.translations[language] || level.translations.pt;
}

export function getLevelLabelBySlug(
  slug: string,
  language: LevelLanguage = 'pt',
): string {
  return getLevelTranslation(slug, language)?.title || slug;
}

export function getLevelRangeBySlug(
  slug: string,
  language: LevelLanguage = 'pt',
): string {
  return getLevelTranslation(slug, language)?.range || '';
}

export function getXpLevelByXp(xp: number): XpLevel {
  let current: XpLevel = XP_LEVELS[0];
  for (const level of XP_LEVELS) {
    if (xp >= level.min) {
      current = level;
    }
  }
  return current;
}

export function inferLevelSlugFromXp(xp: number): string {
  return getXpLevelByXp(xp).slug;
}

export function getXpLevelLabel(
  xp: number,
  language: LevelLanguage = 'pt',
): string {
  return getLevelTranslation(getXpLevelByXp(xp).slug, language)?.title || '';
}

export function getXpLevelLabelByKey(
  key: XpLevelKey,
  language: LevelLanguage = 'pt',
): string {
  const level = XP_LEVELS.find((item) => item.key === key);
  return level
    ? level.translations[language]?.title || level.label
    : '';
}

type CourseLevelCandidate = {
  id?: string | null;
  slug?: string | null;
  level?: string | null;
  academy_level_slug?: string | null;
  academyLevelSlug?: string | null;
  xp_threshold?: number | null;
  xpThreshold?: number | null;
  curriculum?: {
    metadata?: {
      academyLevelSlug?: string | null;
      xpThreshold?: number | null;
    };
  };
};

export function resolveLevelSlugFromCourse(
  course: CourseLevelCandidate | null | undefined,
): string {
  if (!course) return 'unknown';
  const overrideKeys = [
    (course as any)?.slug,
    (course as any)?.id,
  ];
  for (const key of overrideKeys) {
    if (typeof key === 'string') {
      const normalizedOverride = COURSE_LEVEL_OVERRIDES[key];
      if (normalizedOverride) {
        return normalizedOverride;
      }
    }
  }
  const candidates = [
    course.academy_level_slug,
    course.academyLevelSlug,
    course.curriculum?.metadata?.academyLevelSlug,
    course.level,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeLevelSlug(candidate);
    if (normalized) return normalized;
  }

  const xpCandidates = [
    course.xp_threshold,
    course.xpThreshold,
    course.curriculum?.metadata?.xpThreshold,
  ].filter((value): value is number => typeof value === 'number');

  if (xpCandidates.length > 0) {
    return inferLevelSlugFromXp(xpCandidates[0]!);
  }

  return 'unknown';
}

export function getLevelLabelFromCourse(
  course: CourseLevelCandidate | null | undefined,
  language: LevelLanguage = 'pt',
): string {
  const slug = resolveLevelSlugFromCourse(course);
  return getLevelLabelBySlug(slug, language);
}

export function getLevelFilterOptions(
  language: LevelLanguage = 'pt',
): { value: string; label: string }[] {
  return XP_LEVELS.map((level) => ({
    value: level.slug,
    label: level.translations[language]?.title || level.label,
  }));
}
