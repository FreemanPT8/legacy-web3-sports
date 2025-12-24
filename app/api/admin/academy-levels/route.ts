import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { data, error } = await supabase
    .from('academy_levels')
    .select('slug, title_i18n, min_xp, max_xp, order_index')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('GET /api/admin/academy-levels failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load academy levels.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, levels: data ?? [] });
}
