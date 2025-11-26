// lib/xp.ts
import { supabase, supabaseAdmin } from './supabase';

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

    const { error: txError } = await db.from('xp_transactions').insert({
      user_id: userId,
      action,
      xp_earned: xpAmount,
      reference_id: referenceId,
      reference_type: referenceType,
    });

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

    const { data, error } = await db
      .from(table)
      .select('id')
      .eq('user_id', userId)
      .eq(idField, contentId)
      .maybeSingle();

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

    const { error } = await db.from(table).insert({
      user_id: userId,
      [idField]: contentId,
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
): Promise<{ newStreak: number; bonus: number }> {
  try {
    const { data: user, error } = await db
      .from('users')
      .select('streak_count, streak_updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return { newStreak: 0, bonus: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    const lastUpdate = user.streak_updated_at as string | null;

    if (lastUpdate === today) {
      return { newStreak: user.streak_count, bonus: 0 };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    let bonus = 0;

    if (lastUpdate === yesterdayStr) {
      newStreak = user.streak_count + 1;
      if (newStreak === 7) {
        bonus = XP_REWARDS.STREAK_7_DAY;
        await awardXP(userId, '7-day streak bonus', bonus);
        newStreak = 0;
      }
    }

    await db
      .from('users')
      .update({
        streak_count: newStreak,
        streak_updated_at: today,
      })
      .eq('id', userId);

    return { newStreak, bonus };
  } catch (error) {
    return { newStreak: 0, bonus: 0 };
  }
}
