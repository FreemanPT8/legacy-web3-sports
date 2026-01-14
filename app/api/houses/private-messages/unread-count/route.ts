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
    .is('read_at', null);

  if (error) {
    console.error('[private-messages/unread-count]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to count unread messages.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    unreadCount: count ?? 0,
  });
}
