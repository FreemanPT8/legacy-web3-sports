import { supabaseAdmin } from '@/lib/supabase';

export type AlertScanSummary = {
  scanned: number;
  triggered: number;
  resolved: number;
  warnings: string[];
};

type HouseRow = {
  id: string;
  house_key: string | null;
  governance_status: string | null;
};

type OpenAlertRow = {
  id: string | null;
  type: string | null;
};

type PendingRequestRow = {
  created_at: string | null;
};

const DEFAULT_SLA_HOURS = Number(process.env.HOUSE_ALERTS_PENDING_SLA_HOURS || 48);

async function createAlert(
  houseId: string,
  type: string,
  severity: 'low' | 'medium' | 'high',
  details: Record<string, unknown>,
) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from('house_alerts').insert({
    house_id: houseId,
    type,
    severity,
    details,
  });
}

async function resolveAlert(houseId: string, type: string) {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('house_alerts')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('house_id', houseId)
    .eq('type', type)
    .eq('status', 'open');
}

async function scanHouseRequests(
  house: HouseRow,
  slaHours: number,
): Promise<{ triggered: number; resolved: number; warnings: string[] }> {
  const warnings: string[] = [];
  const admin = supabaseAdmin;
  if (!admin) {
    return { triggered: 0, resolved: 0, warnings: ['Admin client unavailable.'] };
  }

  const now = Date.now();
  const slaMs = slaHours * 60 * 60 * 1000;
  const openAlerts = new Map<string, OpenAlertRow>();

  const { data: openRows, error: openError } = await admin
    .from('house_alerts')
    .select('id, type')
    .eq('house_id', house.id)
    .eq('status', 'open');
  if (openError) {
    warnings.push('Falha ao carregar alertas existentes.');
  } else {
    (openRows ?? []).forEach((row: OpenAlertRow) => {
      if (row?.type && row?.id) {
        openAlerts.set(row.type, row);
      }
    });
  }

  const { data: pendingRows, error: pendingError } = await admin
    .from('house_join_requests')
    .select('created_at')
    .eq('house_id', house.id)
    .eq('status', 'pending');
  if (pendingError) {
    warnings.push('Tabela house_join_requests indisponível.');
    return { triggered: 0, resolved: 0, warnings };
  }

  const overdue = (pendingRows ?? []).filter((row: PendingRequestRow) => {
    if (!row?.created_at) return false;
    const created = new Date(row.created_at).getTime();
    return Number.isFinite(created) && now - created > slaMs;
  }).length;

  let triggered = 0;
  let resolved = 0;

  if (overdue > 0) {
    if (!openAlerts.has('cta.pending')) {
      await createAlert(house.id, 'cta.pending', 'medium', {
        message: 'Pedidos pendentes com SLA ultrapassado.',
        overdue,
        cutoffHours: slaHours,
      });
      triggered += 1;
    }
  } else if (openAlerts.has('cta.pending')) {
    await resolveAlert(house.id, 'cta.pending');
    resolved += 1;
  }

  return { triggered, resolved, warnings };
}

export async function scanHouseCapacityAlerts(
  options: { slaHours?: number } = {},
): Promise<AlertScanSummary> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured.');
  }

  const { data: houses, error: housesError } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id, house_key, governance_status');
  if (housesError) {
    throw housesError;
  }

  const activeHouses = (houses ?? []).filter(
    (house: HouseRow) => (house.governance_status ?? 'active').toLowerCase() === 'active',
  );
  let triggered = 0;
  let resolved = 0;
  const warnings: string[] = [];
  const slaHours = options.slaHours ?? DEFAULT_SLA_HOURS;

  for (const house of activeHouses) {
    try {
      const result = await scanHouseRequests(house, slaHours);
      triggered += result.triggered;
      resolved += result.resolved;
      if (result.warnings.length) {
        warnings.push(
          ...result.warnings.map(
            (warning) => `${house.house_key ?? house.id}: ${warning}`,
          ),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error.';
      warnings.push(`${house.house_key ?? house.id}: ${message}`);
    }
  }

  return {
    scanned: activeHouses.length,
    triggered,
    resolved,
    warnings,
  };
}
