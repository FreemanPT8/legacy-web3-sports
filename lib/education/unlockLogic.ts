export const START_HERE_SLUG = 'comeca-aqui';
export const START_HERE_FALLBACK_ID = 'eda38083-c8f2-4573-b2d1-3f96cf73539e';

export type UnlockCondition = Record<string, any> | null | undefined;

export type UnlockConditionContext = {
  xpTotal: number;
  startHereCompleted: boolean;
  courseCompletionBySlug: Record<string, boolean>;
  levelStatuses: Record<
    string,
    {
      isUnlocked: boolean;
      isCompleted: boolean;
    }
  >;
};

export function evaluateUnlockCondition(
  condition: UnlockCondition,
  context: UnlockConditionContext,
): boolean {
  if (!condition || Object.keys(condition).length === 0) {
    return true;
  }

  switch (condition.type) {
    case 'always':
      return true;
    case 'course_completed': {
      const slug = condition.course_slug;
      if (!slug) return false;
      if (slug === START_HERE_SLUG) {
        return context.startHereCompleted;
      }
      return Boolean(context.courseCompletionBySlug[slug]);
    }
    case 'academy_level_completed': {
      const target = condition.level_slug;
      if (!target) return false;
      return Boolean(context.levelStatuses[target]?.isCompleted);
    }
    case 'academy_level_unlocked': {
      const target = condition.level_slug;
      if (!target) return false;
      return Boolean(context.levelStatuses[target]?.isUnlocked);
    }
    case 'xp_threshold': {
      const minXp = typeof condition.min_xp === 'number' ? condition.min_xp : 0;
      return context.xpTotal >= minXp;
    }
    default:
      return true;
  }
}
