import { NextResponse } from 'next/server';
import { updateStreak } from '@/lib/xp';
import { supabase } from '@/lib/supabase';
import { sendEmail, getStreakBonusEmailTemplate } from '@/lib/email';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const result = await updateStreak(userId);

    if (result.bonus > 0) {
      const { data: user } = await supabase
        .from('users')
        .select('username, email')
        .eq('id', userId)
        .maybeSingle();

      if (user) {
        const streakDays = result.bonusDays ?? 7;
        const bonusEmail = getStreakBonusEmailTemplate(
          user.username,
          user.email,
          streakDays,
          result.bonus
        );
        await sendEmail(bonusEmail).catch(err => {
          logger.error('Failed to send streak bonus email:', err);
        });
      }
    }

    const streakMessage =
      result.bonus > 0
        ? `Congratulations! ${result.bonusDays ?? 7}-day streak completed. +${result.bonus} XP bonus!`
        : result.newStreak > 0
        ? `Streak updated to ${result.newStreak} days!`
        : 'Streak started!';

    return NextResponse.json({
      success: true,
      newStreak: result.newStreak,
      longStreak: result.longStreak,
      bonus: result.bonus,
      bonusDays: result.bonusDays,
      message: streakMessage,
    });
  } catch (error) {
    logger.error('Streak update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
