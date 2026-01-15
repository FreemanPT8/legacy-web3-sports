import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) {
    return auth.response!;
  }

  const user = auth.user!;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Database connection unavailable.' },
      { status: 500 },
    );
  }

  const { count, error } = await supabaseAdmin
    .from('house_private_messages')
    .select('id', { count: 'exact' })
    .eq('recipient_id', user.userId)
    .is('read_at', null)
    .is('recipient_archived_at', null)
    .is('recipient_deleted_at', null);

  if (error) {
    console.error('[private-messages/unread-count]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to count unread messages.' },
      { status: 500 },
    );
  }

  let isStaff = user.role === 'Super Admin';
  if (!isStaff) {
    const { data: staffRows, error: staffError } = await supabaseAdmin
      .from('user_houses')
      .select('id, membership_role')
      .eq('user_id', user.userId)
      .is('removed_at', null)
      .in('membership_role', ['head', 'moderator', 'HEAD', 'MODERATOR']);

    if (staffError) {
      console.error('[private-messages/unread-count] staff lookup failed', staffError);
    }

    if ((staffRows ?? []).length > 0) {
      isStaff = true;
    }
  }

  if (!isStaff) {
    const { data: assignments } = await supabaseAdmin
      .from('admin_assignments')
      .select('id')
      .eq('user_id', user.userId);
    const adminIds = (assignments ?? []).map((row: any) => row.id).filter(Boolean);
    if (adminIds.length) {
      const { data: headRows } = await supabaseAdmin
        .from('house_heads')
        .select('id')
        .in('admin_id', adminIds);
      if ((headRows ?? []).length > 0) {
        isStaff = true;
      }
    }
  }

  if (!isStaff) {
    const { data: modRows } = await supabaseAdmin
      .from('house_moderators')
      .select('id')
      .eq('user_id', user.userId);
    if ((modRows ?? []).length > 0) {
      isStaff = true;
    }
  }

  return NextResponse.json({
    success: true,
    unreadCount: count ?? 0,
    isStaff,
  });
}
