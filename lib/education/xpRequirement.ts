const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

export const resolveLessonXpRequirement = (lesson: Record<string, any> | null | undefined) => {
  if (!lesson || typeof lesson !== 'object') {
    return null;
  }

  const candidates = [
    lesson.xp_required,
    lesson.xpRequired,
    lesson.min_xp,
    lesson.unlock_condition?.min_xp,
    lesson.unlock_condition?.minXp,
    lesson.unlock?.min_xp,
    lesson.unlock?.minXp,
    lesson.unlock?.xp,
  ];

  for (const candidate of candidates) {
    const numeric = toNumber(candidate);
    if (numeric !== null) {
      return numeric;
    }
  }

  return null;
};

export const normalizeXpRequirementInput = (value: any) => toNumber(value) ?? 0;
