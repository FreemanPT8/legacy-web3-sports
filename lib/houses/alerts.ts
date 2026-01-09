import { supabaseAdmin } from '@/lib/supabase';

type HouseRow = {
  id: string;
  name_i18n: Record<string, string> | null;
  monthly_capacity: number | null;
};

type PendingRow = {
  house_id: string;
  count: number;
};

type OpenAlertRow = {
  id: string;
  house_id: string;
  severity: string;
};

const ALERT_TYPE = 'capacity_pending';

export type AlertScanSummary = {
  created: number;
  escalated: number;
  resolved: number;
  ignored: number;
};

export async function scanHouseCapacityAlerts(actorId?: string | null): Promise<AlertScanSummary> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured.');
  }

  const summary: AlertScanSummary = {
    created: 0,
    escalated: 0,
    resolved: 0,
    ignored: 0,
  };

  const [{ data: houses, error: houseError }, { data: pendingRows, error: pendingError }, { data: openAlerts }] =
    await Promise.all([
      supabaseAdmin
        .from('houses_of_sports')
        .select('id, name_i18n, monthly_capacity')
        .not('monthly_capacity', 'is', null),
      supabaseAdmin
        .from('house_join_requests')
        .select('house_id, count:id', { count: 'exact', head: false })
        .eq('status', 'pending')
        .group('house_id'),
      supabaseAdmin
        .from('house_alerts')
        .select('id, house_id, severity')
        .eq('status', 'open')
        .eq('type', ALERT_TYPE),
    ]);

  if (houseError) throw houseError;
  if (pendingError) throw pendingError;

  const pendingByHouse = new Map<string, number>();
  (pendingRows as PendingRow[] | null)?.forEach((row) => {
    pendingByHouse.set(row.house_id, Number(row.count) || 0);
  });

  const openByHouse = new Map<string, OpenAlertRow>();
  (openAlerts as OpenAlertRow[] | null)?.forEach((row) => {
    openByHouse.set(row.house_id, row);
  });

  const nowISO = new Date().toISOString();

  for (const house of (houses as HouseRow[] | null) ?? []) {
    const capacity = house.monthly_capacity ?? 0;
    const pending = pendingByHouse.get(house.id) ?? 0;
    const ratio = capacity > 0 ? pending / capacity : pending > 0 ? 1 : 0;

    let severity: 'medium' | 'high' | null = null;
    if (capacity <= 0 && pending > 0) {
      severity = 'high';
    } else if (ratio >= 1) {
      severity = 'high';
    } else if (ratio >= 0.8) {
      severity = 'medium';
    }

    const existing = openByHouse.get(house.id);

    if (severity) {
      if (!existing) {
        const { error } = await supabaseAdmin.from('house_alerts').insert({
          house_id: house.id,
          type: ALERT_TYPE,
          severity,
          status: 'open',
          details: {
            capacity,
            pending,
            ratio,
          },
        });
        if (error) throw error;
        summary.created += 1;
      } else if (existing.severity !== severity) {
        const { error } = await supabaseAdmin
          .from('house_alerts')
          .update({ severity, details: { capacity, pending, ratio } })
          .eq('id', existing.id);
        if (error) throw error;
        summary.escalated += 1;
      } else {
        summary.ignored += 1;
      }
    } else if (existing) {
      const { error } = await supabaseAdmin
        .from('house_alerts')
        .update({ status: 'resolved', resolved_at: nowISO, resolved_by: actorId ?? null })
        .eq('id', existing.id);
      if (error) throw error;
      summary.resolved += 1;
    } else {
      summary.ignored += 1;
    }
  }

  return summary;
}
