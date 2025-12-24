export interface AcademyLevelOption {
  slug: string;
  labels: {
    pt: string;
    es: string;
    en: string;
  };
  xpRange: string;
}

export const ACADEMY_LEVELS: AcademyLevelOption[] = [
  {
    slug: 'novato',
    labels: { pt: 'Cadete', es: 'Cadete', en: 'Cadet' },
    xpRange: '0-98 XP',
  },
  {
    slug: 'cadets',
    labels: { pt: 'Infantil', es: 'Infantil', en: 'Youth' },
    xpRange: '99-368 XP',
  },
  {
    slug: 'juveniles',
    labels: { pt: 'Juvenil', es: 'Juvenil', en: 'Youth' },
    xpRange: '369-999 XP',
  },
  {
    slug: 'juniors',
    labels: { pt: 'Junior', es: 'Junior', en: 'Junior' },
    xpRange: '1,000-2,221 XP',
  },
  {
    slug: 'seniors',
    labels: { pt: 'Sénior', es: 'Senior', en: 'Senior' },
    xpRange: '2,222-3,332 XP',
  },
  {
    slug: 'hall-of-fame',
    labels: {
      pt: 'Hall da Fama',
      es: 'Salón de la Fama',
      en: 'Hall of Fame',
    },
    xpRange: '3,333-4,999 XP',
  },
  {
    slug: 'master',
    labels: { pt: 'Master', es: 'Master', en: 'Master' },
    xpRange: '5,000-9,999 XP',
  },
  {
    slug: 'legend',
    labels: { pt: 'Lenda', es: 'Leyenda', en: 'Legend' },
    xpRange: '10,000+ XP',
  },
];
