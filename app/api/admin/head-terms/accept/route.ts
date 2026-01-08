import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { loadHeadTerm } from '@/lib/head-terms';

type AcceptPayload = {
  houseId?: string;
  version?: string;
};

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return request.ip ?? null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as AcceptPayload;
    const houseId = body?.houseId;
    if (!houseId) {
      return NextResponse.json({ success: false, error: 'Missing houseId.' }, { status: 400 });
    }

    const latestTerm = await loadHeadTerm();
    if (body?.version && body.version !== latestTerm.version) {
      return NextResponse.json(
        { success: false, error: 'Termo atualizado. Recarrega para aceitar a versão mais recente.' },
        { status: 409 },
      );
    }

    const { data: adminAssignment, error: assignmentError } = await supabaseAdmin
      .from('admin_assignments')
      .select('id')
      .eq('user_id', auth.user!.userId)
      .maybeSingle();
    if (assignmentError) throw assignmentError;
    if (!adminAssignment) {
      return NextResponse.json({ success: false, error: 'Admin assignment not found.' }, { status: 403 });
    }

    const { data: headRow, error: headError } = await supabaseAdmin
      .from('house_heads')
      .select('admin_id')
      .eq('house_id', houseId)
      .maybeSingle();
    if (headError) throw headError;
    if (!headRow || headRow.admin_id !== adminAssignment.id) {
      return NextResponse.json({ success: false, error: 'Apenas o Head designado pode aceitar o termo.' }, { status: 403 });
    }

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent')?.slice(0, 500) || null;

    const payload = {
      snapshot: latestTerm.content,
      acceptedBy: auth.user!.userId,
      acceptedAt: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('house_head_terms').upsert(
      {
        user_id: auth.user!.userId,
        house_id: houseId,
        version: latestTerm.version,
        ip_address: ipAddress,
        user_agent: userAgent,
        payload,
      },
      { onConflict: 'user_id,house_id' },
    );
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/head-terms/accept] Failed to record acceptance', error);
    return NextResponse.json({ success: false, error: 'Falha ao registar aceitação.' }, { status: 500 });
  }
}
