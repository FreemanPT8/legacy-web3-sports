export const XP_LEVELS = [
  { key: 'newcomer', min: 0, max: 98, label: 'Novato', range: '0-98 XP' },
  { key: 'beginner', min: 99, max: 368, label: 'Cadete', range: '99-368 XP' },
  { key: 'intermediate', min: 369, max: 999, label: 'Juvenil', range: '369-999 XP' },
  { key: 'advanced', min: 1000, max: 2221, label: 'Junior', range: '1,000-2,221 XP' },
  { key: 'expert', min: 2222, max: 3332, label: 'Sénior', range: '2,222-3,332 XP' },
  { key: 'hallOfFame', min: 3333, max: 4999, label: 'Hall da Fama', range: '3,333-4,999 XP' },
  { key: 'master', min: 5000, max: 9999, label: 'Master', range: '5,000-9,999 XP' },
  { key: 'legend', min: 10000, label: 'Lenda', range: '10,000+ XP' },
] as const;

export type XpLevel = (typeof XP_LEVELS)[number];
export type XpLevelKey = XpLevel['key'];

export function getXpLevelByXp(xp: number): XpLevel {
  let current: XpLevel = XP_LEVELS[0];

  for (const level of XP_LEVELS) {
    if (xp >= level.min) {
      current = level;
    }
  }

  return current;
}

export function getXpLevelLabel(xp: number): string {
  return getXpLevelByXp(xp).label;
}

export function getXpLevelLabelByKey(key: XpLevelKey): string {
  const level = XP_LEVELS.find((item) => item.key === key);
  return level ? level.label : '';
}
