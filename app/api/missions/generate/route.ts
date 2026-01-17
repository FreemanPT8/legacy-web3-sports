import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/auth';
import { getTodayCETDate } from '@/lib/timezone';
import { comboDefinitions, getComboProgressForUser } from '@/lib/comboMissions';

const db = supabaseAdmin ?? supabase;

const COMBO_MISSIONS = comboDefinitions.map((combo) => ({
  type: combo.missionType,
  description: combo.label,
  xp: combo.xp,
  target: 1,
  metadata: {
    combo: combo.key,
    requirements: combo.requirements,
    xp: combo.xp,
  },
}));

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
    const today = getTodayCETDate();

    const { data: existingMissions } = await db
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

    const missionsToInsert = COMBO_MISSIONS.map(mission => ({
      date: today,
      type: mission.type,
      description: mission.description,
      xp_reward: mission.xp,
      target_count: mission.target,
      is_active: true,
      metadata: mission.metadata,
    }));

    let insertedMissions: any[] | null = null;
    const { data: inserted, error: insertError } = await db
      .from('daily_missions')
      .insert(missionsToInsert)
      .select();

    if (insertError) {
      const message = (insertError as any)?.message || '';
      if (message.toLowerCase().includes('metadata')) {
        const fallbackMissions = COMBO_MISSIONS.map(mission => ({
          date: today,
          type: mission.type,
          description: mission.description,
          xp_reward: mission.xp,
          target_count: mission.target,
          is_active: true,
        }));
        const { data: fallbackData, error: fallbackError } = await db
          .from('daily_missions')
          .insert(fallbackMissions)
          .select();
        if (fallbackError) {
          logger.error('Error inserting missions (fallback):', fallbackError);
          return NextResponse.json(
            { success: false, error: 'Failed to generate missions' },
            { status: 500 }
          );
        }
        insertedMissions = fallbackData as any[] | null;
      } else {
        logger.error('Error inserting missions:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to generate missions' },
          { status: 500 }
        );
      }
    } else {
      insertedMissions = inserted as any[] | null;
    }

    const { data: users } = await db
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

      const { error: userMissionError } = await db
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

    const today = getTodayCETDate();

    const { data: dailyMissions, error: missionsError } = await db
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
      const missionsToInsert = COMBO_MISSIONS.map(mission => ({
        date: today,
        type: mission.type,
        description: mission.description,
        xp_reward: mission.xp,
        target_count: mission.target,
        is_active: true,
        metadata: mission.metadata,
      }));

      let insertedMissions: any[] | null = null;
      const { data: inserted, error: insertError } = await db
        .from('daily_missions')
        .insert(missionsToInsert)
        .select();

      if (insertError) {
        const message = (insertError as any)?.message || '';
        if (message.toLowerCase().includes('metadata')) {
          const fallbackMissions = COMBO_MISSIONS.map(mission => ({
            date: today,
            type: mission.type,
            description: mission.description,
            xp_reward: mission.xp,
            target_count: mission.target,
            is_active: true,
          }));
          const { data: fallbackData, error: fallbackError } = await db
            .from('daily_missions')
            .insert(fallbackMissions)
            .select();
          if (fallbackError) {
            logger.error('Error inserting missions (GET fallback):', fallbackError);
            return NextResponse.json(
              { success: false, error: 'Failed to generate missions' },
              { status: 500 }
            );
          }
          insertedMissions = fallbackData as any[] | null;
        } else {
          logger.error('Error inserting missions (GET fallback):', insertError);
          return NextResponse.json(
            { success: false, error: 'Failed to generate missions' },
            { status: 500 }
          );
        }
      } else {
        insertedMissions = inserted as any[] | null;
      }

      if (insertedMissions) {
        const missionsToCreate = insertedMissions.map(mission => ({
          user_id: userId,
          mission_id: mission.id,
          progress: 0,
          completed: false
        }));

        await db
          .from('user_missions')
          .insert(missionsToCreate);
      }

      return NextResponse.json({
        success: true,
        missions: insertedMissions || [],
        combo_progress: await getComboProgressForUser(userId),
      });
    }

    const missionIds = dailyMissions.map(m => m.id);

    const { data: userMissions, error: userMissionsError } = await db
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

      await db
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
      metadata: mission.metadata ?? {},
      user_missions: userMissionsMap.get(mission.id) || {
        progress: 0,
        completed: false,
        completed_at: null
      }
    }));

    const comboProgress = await getComboProgressForUser(userId);

    return NextResponse.json({
      success: true,
      missions: missionsWithProgress,
      combo_progress: comboProgress,
    });
  } catch (error) {
    logger.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
