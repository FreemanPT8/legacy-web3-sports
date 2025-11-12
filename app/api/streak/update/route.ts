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
        const bonusEmail = getStreakBonusEmailTemplate(
          user.username,
          user.email,
          7,
          result.bonus
        );
        await sendEmail(bonusEmail).catch(err => {
          logger.error('Failed to send streak bonus email:', err);
        });
      }
    }

    return NextResponse.json({
      success: true,
      newStreak: result.newStreak,
      bonus: result.bonus,
      message: result.bonus > 0
        ? `Congratulations! 7-day streak completed. +${result.bonus} XP bonus!`
        : result.newStreak > 0
        ? `Streak updated to ${result.newStreak} days!`
        : 'Streak started!'
    });
  } catch (error) {
    logger.error('Streak update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
