import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin;

async function hasXpPermission(authHeader?: string | null) {
  if (!authHeader) return false;
  const user = await verifyAuth(authHeader);
  if (!user) return false;
  const { data } = await db
    .from('admin_permissions')
    .select('can_manage_xp')
    .eq('user_id', user.id)
    .maybeSingle();
  return !!(data?.can_manage_xp || user.role === 'Super Admin');
}

export async function GET(request: NextRequest) {
  try {
    if (!(await hasXpPermission(request.headers.get('Authorization')))) {
      return NextResponse.json({ success: false, error: 'Not allowed' }, { status: 403 });
    }

    const rewards = await db.from('xp_rewards').select('*');
    const limits = await db.from('xp_daily_limits').select('*');
    const thresholds = await db.from('xp_thresholds').select('*').order('xp_total', { ascending: true });

    if (rewards.error || limits.error || thresholds.error) {
      console.error('Failed to load xp config', rewards.error || limits.error || thresholds.error);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rewards: rewards.data,
      limits: limits.data,
      thresholds: thresholds.data,
    });
  } catch (error) {
    console.error('GET /api/admin/xp', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await hasXpPermission(request.headers.get('Authorization')))) {
      return NextResponse.json({ success: false, error: 'Not allowed' }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
    }

    const { rewards, limits, thresholds } = body as {
      rewards?: Array<{ action_type: string; min_xp: number; max_xp: number; creator_bonus_pct?: number }>;
      limits?: Array<{ action_type: string; xp_earned: number; count: number }>;
      thresholds?: Array<{ id?: string; xp_total: number; feature_name: string; description: string }>;
    };

    await db.from('xp_rewards').upsert(rewards || [], { onConflict: 'action_type' });
    await db.from('xp_daily_limits').upsert(limits || [], { onConflict: 'action_type' });
    if (thresholds?.length) {
      for (const threshold of thresholds) {
        if (threshold.id) {
          await db.from('xp_thresholds').update(threshold).eq('id', threshold.id);
        } else {
          await db.from('xp_thresholds').insert(threshold);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'XP configuration saved' });
  } catch (error) {
    console.error('PUT /api/admin/xp', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
