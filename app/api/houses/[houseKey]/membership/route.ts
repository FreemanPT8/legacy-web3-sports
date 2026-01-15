import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { syncUserHouseMembership } from '@/lib/user-houses';

export async function GET(request: NextRequest, { params }: { params: { houseKey: string } }) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const houseKey = (params.houseKey || '').toUpperCase();
  if (!houseKey) {
    return NextResponse.json({ success: false, error: 'Missing house key.' }, { status: 400 });
  }

  try {
    const { data: houseRow, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id')
      .eq('house_key', houseKey)
      .maybeSingle();
    if (houseError) throw houseError;
    if (!houseRow?.id) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }

    const roles = new Set<string>();

    const { data: membershipRows, error: membershipError } = await supabaseAdmin
      .from('user_houses')
      .select('membership_role, role')
      .eq('user_id', user.userId)
      .eq('house_id', houseRow.id)
      .is('removed_at', null);
    if (membershipError) throw membershipError;

    (membershipRows ?? []).forEach((row: { membership_role?: string | null; role?: string | null }) => {
      const value = row.membership_role ?? row.role ?? null;
      if (value) roles.add(value);
    });

    if (roles.size === 0) {
      const { data: assignments } = await supabaseAdmin
        .from('admin_assignments')
        .select('id')
        .eq('user_id', user.userId);
      const adminIds = (assignments ?? []).map((row: any) => row.id).filter(Boolean);

      if (adminIds.length) {
        const { data: headRows } = await supabaseAdmin
          .from('house_heads')
          .select('id')
          .eq('house_id', houseRow.id)
          .in('admin_id', adminIds);
        if (headRows && headRows.length > 0) {
          roles.add('head');
        }
      }

      const { data: modRows } = await supabaseAdmin
        .from('house_moderators')
        .select('id')
        .eq('house_id', houseRow.id)
        .eq('user_id', user.userId);
      if (modRows && modRows.length > 0) {
        roles.add('moderator');
      }
    }

    if (roles.size === 0) {
      await syncUserHouseMembership(user.userId, { assignedVia: 'PROFILE', logPrefix: 'houses/membership' });
      const { data: refreshedRows } = await supabaseAdmin
        .from('user_houses')
        .select('membership_role, role')
        .eq('user_id', user.userId)
        .eq('house_id', houseRow.id)
        .is('removed_at', null);
      (refreshedRows ?? []).forEach((row: { membership_role?: string | null; role?: string | null }) => {
        const value = row.membership_role ?? row.role ?? null;
        if (value) roles.add(value);
      });
    }

    return NextResponse.json({ success: true, isMember: roles.size > 0, roles: Array.from(roles) });
  } catch (error) {
    console.error('[houses/membership] failed to load membership', error);
    return NextResponse.json({ success: false, error: 'Failed to load membership.' }, { status: 500 });
  }
}
