import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { loadHeadTerm } from '@/lib/head-terms';
import { HEAD_TERM_VALIDITY_MS } from '@/lib/constants/headTerms';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const houseId = searchParams.get('houseId');
  const lang = searchParams.get('lang') ?? 'pt';
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing houseId.' }, { status: 400 });
  }

  try {
    const [{ data: adminAssignment, error: assignmentError }, latestTerm] = await Promise.all([
      supabaseAdmin.from('admin_assignments').select('id').eq('user_id', auth.user!.userId).maybeSingle(),
      loadHeadTerm(lang),
    ]);

    if (assignmentError) throw assignmentError;
    if (!adminAssignment) {
      return NextResponse.json({ success: false, error: 'Admin assignment not found.' }, { status: 403 });
    }

    const { data: headRow, error: headError } = await supabaseAdmin
      .from('house_heads')
      .select('house_id, admin_id, houses:houses_of_sports(house_key, name_i18n)')
      .eq('house_id', houseId)
      .maybeSingle();

    if (headError) throw headError;
    if (!headRow) {
      return NextResponse.json({ success: false, error: 'House has no Head assigned.' }, { status: 404 });
    }

    const isCurrentHead = headRow.admin_id === adminAssignment.id || auth.user!.role === 'Super Admin';
    if (!isCurrentHead) {
      return NextResponse.json({ success: false, error: 'Apenas o Head designado pode aceitar o termo.' }, { status: 403 });
    }

    const { data: existing, error: termError } = await supabaseAdmin
      .from('house_head_terms')
      .select('version, accepted_at, ip_address')
      .eq('user_id', auth.user!.userId)
      .eq('house_id', houseId)
      .maybeSingle();
    if (termError) throw termError;

    const acceptedVersion = existing?.version ?? null;
    const acceptedTimestamp = existing?.accepted_at ? Date.parse(existing.accepted_at) : null;
    const isExpired =
      typeof acceptedTimestamp === 'number' && !Number.isNaN(acceptedTimestamp)
        ? Date.now() - acceptedTimestamp >= HEAD_TERM_VALIDITY_MS
        : false;
    const needsAcceptance = acceptedVersion !== latestTerm.version || isExpired;

    return NextResponse.json({
      success: true,
      house: {
        id: houseId,
        houseKey: headRow.houses?.house_key ?? '',
        name: headRow.houses?.name_i18n?.pt ?? headRow.houses?.name_i18n?.en ?? 'House',
      },
      latestVersion: latestTerm.version,
      acceptedVersion,
      acceptedAt: existing?.accepted_at ?? null,
      needsAcceptance,
      term: { content: latestTerm.content },
      termLocale: latestTerm.locale,
    });
  } catch (error) {
    console.error('[admin/head-terms/context] Failed to load term state', error);
    return NextResponse.json({ success: false, error: 'Falha ao carregar termo.' }, { status: 500 });
  }
}
