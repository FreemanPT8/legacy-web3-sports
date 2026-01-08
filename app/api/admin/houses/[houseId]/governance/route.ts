import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

const SUPPORT_MODES = ['async', 'sync', 'hybrid'] as const;
const GOVERNANCE_STATUSES = ['active', 'limited', 'paused', 'under_review'] as const;

export async function GET(request: NextRequest, { params }: { params: { houseId: string } }) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing house id.' }, { status: 400 });
  }

  const { data: house, error: houseError } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id, house_key, name_i18n, monthly_capacity, support_mode, governance_status')
    .eq('id', houseId)
    .maybeSingle();
  if (houseError || !house) {
    return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
  }

  const [{ count: pendingRequests }, { count: memberCount }] = await Promise.all([
    supabaseAdmin
      .from('house_join_requests')
      .select('*', { head: true, count: 'exact' })
      .eq('house_id', houseId)
      .eq('status', 'pending'),
    supabaseAdmin
      .from('user_houses')
      .select('*', { head: true, count: 'exact' })
      .eq('house_id', houseId)
      .is('removed_at', null),
  ]);

  return NextResponse.json({
    success: true,
    house: {
      id: house.id,
      houseKey: house.house_key,
      name: house.name_i18n?.pt ?? house.name_i18n?.en ?? 'House',
      monthlyCapacity: house.monthly_capacity,
      supportMode: house.support_mode,
      governanceStatus: house.governance_status,
      pendingRequests: pendingRequests ?? 0,
      memberCount: memberCount ?? 0,
    },
  });
}

type GovernancePayload = {
  monthlyCapacity?: number | null;
  supportMode?: string | null;
  governanceStatus?: string | null;
};

export async function PATCH(request: NextRequest, { params }: { params: { houseId: string } }) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing house id.' }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as GovernancePayload;

  if (
    body.supportMode &&
    !SUPPORT_MODES.includes(body.supportMode as (typeof SUPPORT_MODES)[number])
  ) {
    return NextResponse.json({ success: false, error: 'Invalid support mode.' }, { status: 400 });
  }
  if (
    body.governanceStatus &&
    !GOVERNANCE_STATUSES.includes(body.governanceStatus as (typeof GOVERNANCE_STATUSES)[number])
  ) {
    return NextResponse.json({ success: false, error: 'Invalid governance status.' }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.monthlyCapacity !== undefined) {
    if (body.monthlyCapacity === null || Number.isNaN(body.monthlyCapacity)) {
      updatePayload.monthly_capacity = null;
    } else if (typeof body.monthlyCapacity === 'number' && body.monthlyCapacity >= 0) {
      updatePayload.monthly_capacity = Math.floor(body.monthlyCapacity);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid capacity value.' }, { status: 400 });
    }
  }
  if (body.supportMode !== undefined) {
    updatePayload.support_mode = body.supportMode || null;
  }
  if (body.governanceStatus !== undefined) {
    updatePayload.governance_status = body.governanceStatus || 'active';
  }

  const { error: updateError } = await supabaseAdmin
    .from('houses_of_sports')
    .update(updatePayload)
    .eq('id', houseId);
  if (updateError) {
    console.error('[admin/houses/governance] update failed', updateError);
    return NextResponse.json({ success: false, error: 'Unable to update governance fields.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
