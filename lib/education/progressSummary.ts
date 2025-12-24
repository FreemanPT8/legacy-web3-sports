import { supabase, supabaseAdmin } from '@/lib/supabase';
import {
  computeUnlockState,
  resolveTitle,
  type AcademyLevelState,
  type LevelCourseSummary,
  type StartHereState,
} from '@/lib/education/unlockEngine';
import { XP_LEVELS, getXpLevelByXp } from '@/lib/education/xpLevels';
import { START_HERE_SLUG } from '@/lib/education/unlockLogic';

const db = supabaseAdmin ?? supabase;

type RawBadge = {
  slug: string;
  title_i18n: any;
  description_i18n: any;
  category: string;
  icon?: string | null;
  accent_color?: string | null;
  xp_bonus?: number | null;
  badge_tier?: string | null;
};

type UserBadgeRow = {
  badge_slug: string;
  earned_at: string;
};

export type BadgeSummary = {
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: string | null;
  accentColor: string | null;
  xpBonus: number;
  tier: string | null;
  earnedAt?: string | null;
};

type StartCourseMeta = {
  slug: string;
  title: any;
  description: any;
  available_languages: string[];
  primary_language: string | null;
};

export type ProgressSummary = {
  xp: {
    total: number;
    currentLevel: {
      key: string;
      label: string;
      minXp: number;
      maxXp: number | null;
      progressPercent: number;
      xpToNext: number | null;
      nextLevelLabel: string | null;
    };
  };
  startHere: StartHereState;
  startCourse: StartCourseMeta | null;
  levels: AcademyLevelState[];
  coursesByLevel: Record<string, LevelCourseSummary[]>;
  badges: {
    earned: BadgeSummary[];
    upcoming: BadgeSummary[];
  };
};

export async function getEducationProgressSummary(
  userId: string,
): Promise<ProgressSummary> {
  if (!userId) {
    throw new Error('getEducationProgressSummary: userId is required');
  }

  const { data: userRow, error: userError } = await db
    .from('users')
    .select('xp_total')
    .eq('id', userId)
    .maybeSingle();

  if (userError || !userRow) {
    throw new Error('Failed to load user XP total');
  }

  const xpTotal = userRow.xp_total ?? 0;

  const unlockState = await computeUnlockState(userId, { xpTotal });
  const startCourseMeta = await fetchStartCourseMeta();

  const [badgesResult, userBadgesResult] = await Promise.all([
    db
      .from('achievement_badges')
      .select(
        'slug, title_i18n, description_i18n, category, icon, accent_color, xp_bonus, badge_tier',
      ),
    db.from('user_badges').select('badge_slug, earned_at').eq('user_id', userId),
  ]);

  if (badgesResult.error) {
    console.error(
      'getEducationProgressSummary: failed to load achievement badges',
      badgesResult.error,
    );
  }
  if (userBadgesResult.error) {
    console.error(
      'getEducationProgressSummary: failed to load user badges',
      userBadgesResult.error,
    );
  }

  const allBadges = (badgesResult.data || []) as RawBadge[];
  const userBadges = (userBadgesResult.data || []) as UserBadgeRow[];
  const earnedBadgeMap = new Map(userBadges.map((row) => [row.badge_slug, row.earned_at]));

  const earnedBadges = allBadges
    .filter((badge) => earnedBadgeMap.has(badge.slug))
    .map((badge) =>
      formatBadgeSummary(badge, earnedBadgeMap.get(badge.slug) || null),
    );

  const upcomingBadges = allBadges
    .filter((badge) => !earnedBadgeMap.has(badge.slug))
    .map((badge) => formatBadgeSummary(badge));

  const currentLevel = getXpLevelByXp(xpTotal);
  const levelIndex = XP_LEVELS.findIndex((item) => item.key === currentLevel.key);
  const nextLevel = levelIndex >= 0 ? XP_LEVELS[levelIndex + 1] : undefined;
  const levelCap =
    Object.prototype.hasOwnProperty.call(currentLevel, 'max') &&
    typeof (currentLevel as { max: number }).max === 'number'
      ? (currentLevel as { max: number }).max
      : undefined;

  const levelSpan =
    typeof levelCap === 'number'
      ? levelCap - currentLevel.min
      : Math.max(xpTotal - currentLevel.min, 1);
  const progressInLevel =
    xpTotal - currentLevel.min <= 0 ? 0 : xpTotal - currentLevel.min;
  const progressPercent =
    typeof levelCap === 'number' && levelSpan > 0
      ? Math.min(100, Math.round((progressInLevel / levelSpan) * 100))
      : 100;
  const xpToNext = nextLevel ? Math.max(nextLevel.min - xpTotal, 0) : null;

  return {
    xp: {
      total: xpTotal,
      currentLevel: {
        key: currentLevel.key,
        label: currentLevel.label,
        minXp: currentLevel.min,
        maxXp: typeof levelCap === 'number' ? levelCap : null,
        progressPercent,
        xpToNext,
        nextLevelLabel: nextLevel?.label ?? null,
      },
    },
    startHere: unlockState.startHere,
    startCourse: startCourseMeta,
    levels: unlockState.levels,
    coursesByLevel: unlockState.coursesByLevel,
    badges: {
      earned: earnedBadges,
      upcoming: upcomingBadges,
    },
  };
}

function formatBadgeSummary(
  badge: RawBadge,
  earnedAt?: string | null,
): BadgeSummary {
  return {
    slug: badge.slug,
    title: resolveTitle(badge.title_i18n) || badge.slug,
    description: resolveTitle(badge.description_i18n) || '',
    category: badge.category,
    icon: badge.icon || null,
    accentColor: badge.accent_color || null,
    xpBonus: badge.xp_bonus ?? 0,
    tier: badge.badge_tier || null,
    earnedAt: earnedAt ?? undefined,
  };
}

async function fetchStartCourseMeta(): Promise<StartCourseMeta | null> {
  try {
    const baseQuery = db
      .from('courses')
      .select('id, slug, title, description, available_languages, primary_language')
      .eq('slug', START_HERE_SLUG)
      .maybeSingle();

    let dataResult = await baseQuery;
    let data = dataResult.data;

    if (!data) {
      const fallbackResult = await db
        .from('courses')
        .select('id, slug, title, description, available_languages, primary_language')
        .eq('is_start_course', true)
        .order('created_at', { ascending: true })
        .maybeSingle();

      if (fallbackResult.data) {
        console.warn('fetchStartCourseMeta: START_HERE_SLUG not found, using first course flagged as start.');
        data = fallbackResult.data;
      } else if (fallbackResult.error) {
        console.error('fetchStartCourseMeta: fallback query failed', fallbackResult.error);
      }
    }

    if (!data) {
      if (dataResult.error) {
        console.error('fetchStartCourseMeta: failed to load metadata by slug', dataResult.error);
      }
      return null;
    }

    return {
      slug: data.slug || data.id,
      title: data.title,
      description: data.description,
      available_languages: Array.isArray(data.available_languages)
        ? data.available_languages
        : ['pt', 'es', 'en'],
      primary_language: data.primary_language ?? 'pt',
    };
  } catch (error) {
    console.error('fetchStartCourseMeta error:', error);
    return null;
  }
}
