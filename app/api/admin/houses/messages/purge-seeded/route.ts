import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

const SEED_SUBJECTS = [
  'Boas-vindas da House',
  'Dúvida sobre a',
];

export async function POST(request: NextRequest) {
  const permission = await requirePermission(request, 'canManageHouses');
  if (!permission.success) return permission.response!;

  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Supabase admin client unavailable.' },
      { status: 500 },
    );
  }

  const subjectFilters = SEED_SUBJECTS.map(
    (subject) => `subject.ilike.${subject}%`,
  ).join(',');

  const { data, error } = await supabaseAdmin
    .from('house_private_messages')
    .delete()
    .or(subjectFilters)
    .select('id');

  if (error) {
    console.error('[admin/houses/messages] Failed to purge seeded messages', error);
    return NextResponse.json(
      { success: false, error: 'Failed to purge seeded messages.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, deleted: data?.length ?? 0 });
}
