import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase';

type HouseRow = {
  id: string;
  house_key: string;
  monthly_capacity: number | null;
  governance_status: string | null;
};

type AlertRow = {
  id: string;
  type: string;
};

const DEFAULT_CAPACITY = Number(process.env.HOUSE_ALERTS_DEFAULT_CAPACITY || 50);
const PENDING_SLA_HOURS = Number(process.env.HOUSE_ALERTS_PENDING_SLA_HOURS || 48);
const SECRET = process.env.HOUSES_ALERTS_CRON_SECRET;

async function createAlert(
  houseId: string,
  type: string,
  severity: 'low' | 'medium' | 'high',
  details: Record<string, unknown>,
) {
  await supabaseAdmin!
    .from('house_alerts')
    .insert({
      house_id: houseId,
      type,
      severity,
      details,
    });
}

async function resolveAlert(houseId: string, type: string) {
  await supabaseAdmin!
    .from('house_alerts')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('house_id', houseId)
    .eq('type', type)
    .eq('status', 'open');
}

async function scanHouse({
  house,
}: {
  house: HouseRow;
}): Promise<{ triggered: number; resolved: number; warnings: string[] }> {
  let triggered = 0;
  let resolved = 0;
  const warnings: string[] = [];
  const normalizedCapacity =
    house.monthly_capacity !== null && Number.isFinite(house.monthly_capacity)
      ? Math.max(0, house.monthly_capacity)
      : DEFAULT_CAPACITY;

  const now = Date.now();
  const slaMs = PENDING_SLA_HOURS * 60 * 60 * 1000;

  const openAlerts = new Map<string, AlertRow>();
  const { data: openRows, error: openError }: {
    data: { id: string | null; type: string | null }[] | null;
    error: any;
  } = await supabaseAdmin!
    .from('house_alerts')
    .select('id, type')
    .eq('house_id', house.id)
    .eq('status', 'open');
  if (openError) {
    warnings.push('Falha ao carregar alertas existentes.');
  } else {
    (openRows ?? []).forEach((row) => {
      if (row?.type && row?.id) openAlerts.set(row.type, { id: row.id, type: row.type });
    });
  }

  const { data: pendingRows, error: pendingError } = await supabaseAdmin!
    .from('house_join_requests')
    .select('created_at')
    .eq('house_id', house.id)
    .eq('status', 'pending');
  if (pendingError) {
    warnings.push('Tabela house_join_requests indisponível.');
    return { triggered, resolved, warnings };
  }
  const pendingCount = pendingRows?.length ?? 0;
  const overdue = pendingRows?.filter((row) => {
    if (!row?.created_at) return false;
    const created = new Date(row.created_at).getTime();
    return Number.isFinite(created) && now - created > slaMs;
  }).length;

  const { count: memberCount, error: memberError } = await supabaseAdmin!
    .from('user_houses')
    .select('id', { head: true, count: 'exact' })
    .eq('house_id', house.id)
    .is('removed_at', null);
  if (memberError) {
    warnings.push('Tabela user_houses indisponível.');
    return { triggered, resolved, warnings };
  }
  const totalLoad = (memberCount ?? 0) + pendingCount;

  // Pending CTA SLA
  if (overdue && overdue > 0) {
    if (!openAlerts.has('cta.pending')) {
      await createAlert(house.id, 'cta.pending', 'medium', {
        message: 'Pedidos pendentes com SLA ultrapassado.',
        overdue,
        cutoffHours: PENDING_SLA_HOURS,
      });
      triggered += 1;
    }
  } else if (openAlerts.has('cta.pending')) {
    await resolveAlert(house.id, 'cta.pending');
    resolved += 1;
  }

  // Capacity overload
  if (normalizedCapacity && totalLoad > normalizedCapacity) {
    if (!openAlerts.has('capacity.overload')) {
      await createAlert(house.id, 'capacity.overload', 'high', {
        message: 'Capacidade mensal ultrapassada.',
        totalLoad,
        capacity: normalizedCapacity,
      });
      triggered += 1;
    }
  } else if (openAlerts.has('capacity.overload')) {
    await resolveAlert(house.id, 'capacity.overload');
    resolved += 1;
  }

  return { triggered, resolved, warnings };
}

async function handleRequest(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }
  if (!SECRET) {
    return NextResponse.json({ success: false, error: 'Alert secret not configured.' }, { status: 500 });
  }
  const providedSecret = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret');
  if (providedSecret !== SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { data: houses, error: housesError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id, house_key, governance_status, monthly_capacity');
    if (housesError) throw housesError;

    let totalTriggered = 0;
    let totalResolved = 0;
    const warnings: string[] = [];
    const activeHouses =
      houses?.filter((house) => (house.governance_status ?? 'active').toLowerCase() === 'active') ?? [];

    for (const house of activeHouses) {
      const { triggered, resolved, warnings: houseWarnings } = await scanHouse({ house: house as HouseRow });
      totalTriggered += triggered;
      totalResolved += resolved;
      warnings.push(
        ...houseWarnings.map(
          (warning) => `${house.house_key ?? house.id}: ${warning}`,
        ),
      );
    }

    return NextResponse.json({
      success: true,
      scanned: activeHouses.length,
      triggered: totalTriggered,
      resolved: totalResolved,
      warnings,
    });
  } catch (error) {
    console.error('[admin/houses/alerts/run] failed', error);
    return NextResponse.json({ success: false, error: 'Failed to process alerts.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}
