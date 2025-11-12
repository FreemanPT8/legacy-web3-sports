import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/auth';

const MISSION_TYPES = [
  { type: 'complete_lesson', description: 'Complete any lesson', xp: 12, target: 1 },
  { type: 'read_blog', description: 'Read a blog article', xp: 12, target: 1 },
  { type: 'forum_comment', description: 'Comment on a forum post', xp: 12, target: 1 },
  { type: 'daily_login', description: 'Log in to the platform', xp: 12, target: 1 },
  { type: 'earn_xp', description: 'Earn 25 XP today', xp: 12, target: 25 },
  { type: 'complete_lessons', description: 'Complete 2 lessons', xp: 12, target: 2 },
];

function selectRandomMissions(count: number) {
  const shuffled = [...MISSION_TYPES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUser = await verifyAuth(authHeader);
    if (!currentUser || !['Super Admin', 'Admin'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }
    const today = new Date().toISOString().split('T')[0];

    const { data: existingMissions } = await supabase
      .from('daily_missions')
      .select('id')
      .eq('date', today)
      .eq('is_active', true)
      .limit(1);

    if (existingMissions && existingMissions.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Missions already generated for today'
      });
    }

    const selectedMissions = selectRandomMissions(3);

    const missionsToInsert = selectedMissions.map(mission => ({
      date: today,
      type: mission.type,
      description: mission.description,
      xp_reward: mission.xp,
      target_count: mission.target,
      is_active: true
    }));

    const { data: insertedMissions, error: insertError } = await supabase
      .from('daily_missions')
      .insert(missionsToInsert)
      .select();

    if (insertError) {
      logger.error('Error inserting missions:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate missions' },
        { status: 500 }
      );
    }

    const { data: users } = await supabase
      .from('users')
      .select('id');

    if (users && users.length > 0 && insertedMissions) {
      const userMissions = users.flatMap(user =>
        insertedMissions.map(mission => ({
          user_id: user.id,
          mission_id: mission.id,
          progress: 0,
          completed: false
        }))
      );

      const { error: userMissionError } = await supabase
        .from('user_missions')
        .insert(userMissions);

      if (userMissionError) {
        logger.error('Error creating user missions:', userMissionError);
      }
    }

    return NextResponse.json({
      success: true,
      missions: insertedMissions,
      message: `Generated ${insertedMissions.length} missions for today`
    });
  } catch (error) {
    logger.error('Mission generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: dailyMissions, error: missionsError } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('date', today)
      .eq('is_active', true);

    if (missionsError) {
      logger.error('Error fetching daily missions:', missionsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch missions' },
        { status: 500 }
      );
    }

    if (!dailyMissions || dailyMissions.length === 0) {
      return NextResponse.json({
        success: true,
        missions: []
      });
    }

    const missionIds = dailyMissions.map(m => m.id);

    const { data: userMissions, error: userMissionsError } = await supabase
      .from('user_missions')
      .select('mission_id, progress, completed, completed_at')
      .eq('user_id', userId)
      .in('mission_id', missionIds);

    if (userMissionsError) {
      logger.error('Error fetching user missions:', userMissionsError);
    }

    if (!userMissions || userMissions.length === 0) {
      const missionsToCreate = dailyMissions.map(mission => ({
        user_id: userId,
        mission_id: mission.id,
        progress: 0,
        completed: false
      }));

      await supabase
        .from('user_missions')
        .insert(missionsToCreate);
    }

    const userMissionsMap = new Map(
      (userMissions || []).map(um => [um.mission_id, um])
    );

    const missionsWithProgress = dailyMissions.map(mission => ({
      id: mission.id,
      type: mission.type,
      description: mission.description,
      xp_reward: mission.xp_reward,
      target_count: mission.target_count,
      user_missions: userMissionsMap.get(mission.id) || {
        progress: 0,
        completed: false,
        completed_at: null
      }
    }));

    return NextResponse.json({
      success: true,
      missions: missionsWithProgress
    });
  } catch (error) {
    logger.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
