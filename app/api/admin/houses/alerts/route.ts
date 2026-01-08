import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

const SEVERITIES = ['low', 'medium', 'high'] as const;
const STATUSES = ['open', 'in_progress', 'resolved'] as const;

function normalizeStatus(raw: string | null): (typeof STATUSES)[number] {
  const value = (raw || 'open').toLowerCase();
  return (STATUSES.includes(value as any) ? value : 'open') as (typeof STATUSES)[number];
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const status = normalizeStatus(searchParams.get('status'));
  const severity = searchParams.get('severity')?.toLowerCase() || null;
  const houseKey = searchParams.get('house')?.toUpperCase() || null;

  try {
    let query = supabaseAdmin
      .from('house_alerts')
      .select(
        `
        id,
        house_id,
        type,
        severity,
        status,
        details,
        created_at,
        resolved_at,
        houses:houses_of_sports (
          house_key,
          name_i18n
        )
      `,
      )
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (severity && SEVERITIES.includes(severity as any)) {
      query = query.eq('severity', severity);
    }
    if (houseKey) {
      query = query.eq('houses.house_key', houseKey);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const alerts =
      data?.map((row) => ({
        id: row.id as string,
        houseId: row.house_id as string,
        houseKey: (row as any).houses?.house_key ?? 'UNKNOWN',
        houseName: (row as any).houses?.name_i18n?.pt ?? (row as any).houses?.name_i18n?.en ?? 'House',
        type: row.type,
        severity: row.severity,
        status: row.status,
        details: row.details ?? {},
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
      })) ?? [];

    return NextResponse.json({ success: true, alerts });
  } catch (error) {
    console.error('[admin/houses/alerts] failed', error);
    return NextResponse.json({ success: false, error: 'Failed to load alerts.' }, { status: 500 });
  }
}

type PatchPayload = {
  status?: 'open' | 'in_progress' | 'resolved';
};

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const alertId = searchParams.get('id');
  if (!alertId) {
    return NextResponse.json({ success: false, error: 'Missing alert id.' }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as PatchPayload;
  if (!body.status || !STATUSES.includes(body.status)) {
    return NextResponse.json({ success: false, error: 'Invalid status.' }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    status: body.status,
  };
  if (body.status === 'resolved') {
    updatePayload.resolved_at = new Date().toISOString();
    updatePayload.resolved_by = authResult.user!.userId;
  } else {
    updatePayload.resolved_at = null;
    updatePayload.resolved_by = null;
  }

  try {
    const { error } = await supabaseAdmin.from('house_alerts').update(updatePayload).eq('id', alertId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/houses/alerts] patch failed', error);
    return NextResponse.json({ success: false, error: 'Failed to update alert.' }, { status: 500 });
  }
}
