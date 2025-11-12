import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { awardXP } from '@/lib/xp';

export async function POST(request: Request) {
  try {
    const { userId, missionId, progress } = await request.json();

    if (!userId || !missionId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Mission ID required' },
        { status: 400 }
      );
    }

    const { data: userMission, error: fetchError } = await supabase
      .from('user_missions')
      .select('id, progress, completed, mission_id')
      .eq('user_id', userId)
      .eq('mission_id', missionId)
      .maybeSingle();

    if (fetchError || !userMission) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      );
    }

    if (userMission.completed) {
      return NextResponse.json({
        success: true,
        message: 'Mission already completed',
        alreadyCompleted: true
      });
    }

    const { data: mission, error: missionError } = await supabase
      .from('daily_missions')
      .select('type, description, xp_reward, target_count')
      .eq('id', missionId)
      .maybeSingle();

    if (missionError || !mission) {
      return NextResponse.json(
        { success: false, error: 'Mission details not found' },
        { status: 404 }
      );
    }

    const newProgress = progress !== undefined ? progress : userMission.progress + 1;
    const isComplete = newProgress >= mission.target_count;

    const updateData: any = {
      progress: newProgress
    };

    if (isComplete) {
      updateData.completed = true;
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('user_missions')
      .update(updateData)
      .eq('id', userMission.id);

    if (updateError) {
      console.error('Error updating mission:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update mission' },
        { status: 500 }
      );
    }

    if (isComplete) {
      const xpResult = await awardXP(
        userId,
        `Daily mission: ${mission.description}`,
        mission.xp_reward,
        missionId,
        'mission'
      );

      return NextResponse.json({
        success: true,
        completed: true,
        xpAwarded: mission.xp_reward,
        newTotal: xpResult.newTotal
      });
    }

    return NextResponse.json({
      success: true,
      completed: false,
      progress: newProgress,
      target: mission.target_count
    });
  } catch (error) {
    console.error('Mission completion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
