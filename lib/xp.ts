// lib/xp.ts
import { supabase, supabaseAdmin } from './supabase';
import {
  buildLessonIdVariants,
  normalizeLessonIdForStorage,
  extractUuid,
} from './lesson-id';

// Usamos sempre o client admin quando existir (bypass RLS)
// e caímos para o client normal em dev/local se faltar a service role.
const db = supabaseAdmin ?? supabase;

export const XP_REWARDS = {
  LESSON_MIN: 7,
  LESSON_MAX: 33,
  BLOG_MIN: 5,
  BLOG_MAX: 33,
  PROFILE_BIO: 25,
  PROFILE_SPORTS_ROLE: 19,
  PROFILE_TELEGRAM: 19,
  PROFILE_DAO1: 33,
  PROFILE_WALLET: 19,
  PROFILE_YOUTUBE: 9,
  PROFILE_LINKHUB: 33,
  PROFILE_FACEBOOK: 9,
  PROFILE_INSTAGRAM: 9,
  COMMENT_RELEVANT: 5,
  FORUM_POST: 3,
  FORUM_TOPIC: 12,
  LIKE_CREATOR: 0.5,
  DAILY_MISSION: 12,
  STREAK_7_DAY: 222,
  STREAK_30_DAY: 1111,
};

export const XP_THRESHOLDS = {
  PROFILE_UNLOCK: 99,
  FORUM_READ: 369,
  FORUM_INTERACT: 444,
  FORUM_POST: 555,
  HALL_OF_FAME: 3333,
  NATIONAL_COMPETITION_USERS: 50,
};

export const DAILY_LIMITS = {
  COMMENT: { max: 25, xpCap: 25 },
  FORUM_POST: { max: 30, xpCap: 30 },
  FORUM_TOPIC: { max: 36, xpCap: 36 },
};

export async function awardXP(
  userId: string,
  action: string,
  xpAmount: number,
  referenceId?: string,
  referenceType?: string,
): Promise<{ success: boolean; newTotal?: number; error?: string }> {
  try {
    const { data: user, error: userError } = await db
      .from('users')
      .select('xp_total')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return { success: false, error: 'User not found' };
    }

    const normalizedReferenceId =
      referenceId && referenceId.length > 0
        ? extractUuid(referenceId) ?? null
        : null;

    const transactionPayload: Record<string, any> = {
      user_id: userId,
      action,
      xp_earned: xpAmount,
      reference_type: referenceType,
    };

    if (normalizedReferenceId) {
      transactionPayload.reference_id = normalizedReferenceId;
    }

    const { error: txError } = await db
      .from('xp_transactions')
      .insert(transactionPayload);

    if (txError) {
      return { success: false, error: 'Failed to record transaction' };
    }

    const newTotal = user.xp_total + xpAmount;

    const { error: updateError } = await db
      .from('users')
      .update({
        xp_total: newTotal,
        profile_unlocked: newTotal >= XP_THRESHOLDS.PROFILE_UNLOCK,
      })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: 'Failed to update XP' };
    }

    return { success: true, newTotal };
  } catch (error) {
    return { success: false, error: 'XP award failed' };
  }
}

export async function checkDailyLimit(
  userId: string,
  actionType: string,
): Promise<{ canAward: boolean; remaining: number }> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: limit, error } = await db
      .from('xp_daily_limits')
      .select('count, xp_earned')
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .eq('date', today)
      .maybeSingle();

    // Se houver erro inesperado, bloqueamos
    if (error && (error as any).code !== 'PGRST116') {
      return { canAward: false, remaining: 0 };
    }

    const dailyLimit = DAILY_LIMITS[actionType as keyof typeof DAILY_LIMITS];
    if (!dailyLimit) {
      return { canAward: true, remaining: 999 };
    }

    const currentCount = limit?.count || 0;
    const currentXP = limit?.xp_earned || 0;

    if (currentXP >= dailyLimit.xpCap) {
      return { canAward: false, remaining: 0 };
    }

    return {
      canAward: true,
      remaining: dailyLimit.xpCap - currentXP,
    };
  } catch (error) {
    return { canAward: false, remaining: 0 };
  }
}

export async function updateDailyLimit(
  userId: string,
  actionType: string,
  xpEarned: number,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await db
    .from('xp_daily_limits')
    .select('count, xp_earned')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .eq('date', today)
    .maybeSingle();

  if (existing) {
    await db
      .from('xp_daily_limits')
      .update({
        count: existing.count + 1,
        xp_earned: existing.xp_earned + xpEarned,
      })
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .eq('date', today);
  } else {
    await db.from('xp_daily_limits').insert({
      user_id: userId,
      action_type: actionType,
      count: 1,
      xp_earned: xpEarned,
      date: today,
    });
  }
}

export async function hasCompletedContent(
  userId: string,
  contentId: string,
  contentType: 'lesson' | 'blog',
): Promise<boolean> {
  try {
    const table =
      contentType === 'lesson' ? 'lesson_completions' : 'blog_reads';
    const idField =
      contentType === 'lesson' ? 'lesson_id' : 'blog_post_id';

    const query = db
      .from(table)
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (contentType === 'lesson') {
      const variants = buildLessonIdVariants(contentId);
      if (variants.length === 0) {
        query.eq(idField, contentId);
      } else if (variants.length === 1) {
        query.eq(idField, variants[0]);
      } else {
        query.in(idField, variants);
      }
    } else {
      query.eq(idField, contentId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      // Em caso de erro inesperado, assumimos "não completado", mas logaríamos em server
      console.error('hasCompletedContent error:', error);
    }

    return !!data;
  } catch (error) {
    console.error('hasCompletedContent fatal error:', error);
    return false;
  }
}

export async function markContentComplete(
  userId: string,
  contentId: string,
  contentType: 'lesson' | 'blog',
  xpEarned: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const table =
      contentType === 'lesson' ? 'lesson_completions' : 'blog_reads';
    const idField =
      contentType === 'lesson' ? 'lesson_id' : 'blog_post_id';

    const storageId =
      contentType === 'lesson'
        ? normalizeLessonIdForStorage(contentId)
        : contentId;

    if (!storageId) {
      return { success: false, error: 'Invalid content identifier' };
    }

    const { error } = await db.from(table).insert({
      user_id: userId,
      [idField]: storageId,
      xp_earned: xpEarned,
    });

    if (error) {
      return { success: false, error: (error as any).message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to mark complete' };
  }
}

export function getRandomXP(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function updateStreak(
  userId: string,
): Promise<{ newStreak: number; longStreak: number; bonus: number; bonusDays?: number }> {
  try {
    const { data: user, error } = await db
      .from('users')
      .select(
        'streak_count, streak_updated_at, streak_long_count, streak_long_updated_at',
      )
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return { newStreak: 0, longStreak: 0, bonus: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    const lastUpdate = user.streak_updated_at as string | null;
    const lastLongUpdate = user.streak_long_updated_at as string | null;

    if (lastUpdate === today) {
      return {
        newStreak: user.streak_count ?? 0,
        longStreak: user.streak_long_count ?? 0,
        bonus: 0,
      };
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const { data: todayTransactions } = await db
      .from('xp_transactions')
      .select('xp_earned')
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString())
      .eq('user_id', userId);

    const xpToday =
      (todayTransactions || [])
        .map((tx: { xp_earned?: number | null }) => tx.xp_earned ?? 0)
        .reduce((sum: number, xp: number) => sum + xp, 0) || 0;

    if (xpToday <= 0) {
      return {
        newStreak: user.streak_count ?? 0,
        longStreak: user.streak_long_count ?? 0,
        bonus: 0,
      };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    if (lastUpdate === yesterdayStr) {
      newStreak = (user.streak_count ?? 0) + 1;
    }

    let newLongStreak = 1;
    const previousLongStreak = user.streak_long_count ?? 0;
    if (lastLongUpdate === yesterdayStr) {
      newLongStreak = previousLongStreak + 1;
    }

    let bonus = 0;
    let bonusDays: number | undefined;

    if (newStreak >= 7) {
      bonus = XP_REWARDS.STREAK_7_DAY;
      bonusDays = 7;
      await awardXP(userId, '7-day streak bonus', bonus);
      newStreak = 0;
    }

    if (newLongStreak >= 30) {
      bonus = XP_REWARDS.STREAK_30_DAY;
      bonusDays = 30;
      await awardXP(userId, '30-day streak bonus', bonus);
      newLongStreak = 0;
    }

    await db
      .from('users')
      .update({
        streak_count: newStreak,
        streak_long_count: newLongStreak,
        streak_updated_at: today,
        streak_long_updated_at: today,
      })
      .eq('id', userId);

    return { newStreak, longStreak: newLongStreak, bonus, bonusDays };
  } catch (error) {
    return { newStreak: 0, longStreak: 0, bonus: 0 };
  }
}

const extractLessonIdsFromCurriculum = (curriculum: any): string[] => {
  const topics: any[] = Array.isArray(curriculum?.topics)
    ? curriculum.topics
    : [];
  const lessonIds: string[] = [];

  topics.forEach((topic: any, topicIndex: number) => {
    const topicId = topic?.id || `topic-${topicIndex + 1}`;
    const lessons: any[] = Array.isArray(topic?.lessons) ? topic.lessons : [];
    lessons.forEach((lesson: any, lessonIndex: number) => {
      const lessonId =
        lesson?.id || `${topicId}-lesson-${lessonIndex + 1}`;
      if (lessonId) {
        lessonIds.push(lessonId);
      }
    });
  });

  return lessonIds;
};

export async function markCourseCompleteIfReady(
  userId: string,
  courseId: string,
  curriculum: any,
): Promise<{ completed: boolean }> {
  if (!userId || !courseId) {
    return { completed: false };
  }

  const lessonIds = extractLessonIdsFromCurriculum(curriculum);
  if (lessonIds.length === 0) {
    return { completed: false };
  }

  const requiredSet = new Set<string>();
  const queryIds = new Set<string>();

  lessonIds.forEach((lessonId) => {
    const normalized = normalizeLessonIdForStorage(lessonId) || lessonId;
    requiredSet.add(normalized);
    queryIds.add(normalized);
    buildLessonIdVariants(lessonId).forEach((variant) => {
      if (variant) queryIds.add(variant);
    });
  });

  const { data, error } = await db
    .from('lesson_completions')
    .select('lesson_id')
    .eq('user_id', userId)
    .in('lesson_id', Array.from(queryIds));

  if (error) {
    console.error('markCourseCompleteIfReady: failed to load lesson completions', error);
    return { completed: false };
  }

  const completedSet = new Set<string>();
  (data || []).forEach((row: any) => {
    const normalized =
      normalizeLessonIdForStorage(row.lesson_id) || row.lesson_id;
    if (normalized) {
      completedSet.add(normalized);
    }
  });

  if (completedSet.size < requiredSet.size) {
    return { completed: false };
  }

  const { error: upsertError } = await db
    .from('course_completions')
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        xp_earned: 0,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_id' },
    );

  if (upsertError) {
    console.error('markCourseCompleteIfReady: failed to store course completion', upsertError);
    return { completed: false };
  }

  return { completed: true };
}
