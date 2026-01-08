import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type CapacityEntry = {
  house_id: string;
  name: string;
  monthly_capacity: number | null;
  pending_requests: number;
  status: 'ok' | 'limit' | 'blocked';
};

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  try {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const [housesRes, membersRes, joinRequestsRes, alertsRes, onboardingRes, poolRes] = await Promise.all([
      supabaseAdmin
        .from('houses_of_sports')
        .select('id, house_key, name_i18n, status, governance_status, monthly_capacity'),
      supabaseAdmin
        .from('user_houses')
        .select('house_id, count:user_id', { count: 'exact', head: false })
        .is('removed_at', null),
      supabaseAdmin
        .from('house_join_requests')
        .select('house_id, count:id', { count: 'exact', head: false })
        .eq('status', 'pending')
        .gte('created_at', monthStart),
      supabaseAdmin.from('house_alerts').select('id, house_id, type, severity, status, created_at').eq('status', 'open'),
      supabaseAdmin.from('house_onboarding_status').select('house_key, name_i18n, published_popups'),
      supabaseAdmin
        .from('sport_pool_entries')
        .select('sport: sports(code), status')
        .eq('status', 'pending'),
    ]);

    if (housesRes.error) throw housesRes.error;
    if (membersRes.error) throw membersRes.error;
    if (joinRequestsRes.error) throw joinRequestsRes.error;
    if (alertsRes.error) throw alertsRes.error;
    if (onboardingRes.error) throw onboardingRes.error;
    if (poolRes.error) throw poolRes.error;

    const houses = housesRes.data ?? [];
    const totalHouses = houses.length;
    const totals = {
      houses: totalHouses,
      active: houses.filter((house: any) => (house.status || '').toLowerCase() === 'active').length,
      underConstruction: houses.filter((house: any) => (house.status || '').toLowerCase() === 'under_construction').length,
      inDevelopment: houses.filter((house: any) => (house.status || '').toLowerCase().includes('development')).length,
      paused: houses.filter((house: any) => (house.governance_status || '').toLowerCase() !== 'active').length,
    };

    const memberCountsByHouse = new Map<string, number>();
    for (const row of membersRes.data ?? []) {
      memberCountsByHouse.set(row.house_id as string, Number(row.count) || 0);
    }
    const globalMemberCount = Array.from(memberCountsByHouse.values()).reduce((acc, cur) => acc + cur, 0);
    type TopHouse = { houseId: string; houseKey: string; name: string; members: number };
    const topHouses = houses
      .map((house: any) => ({
        houseId: house.id,
        houseKey: house.house_key,
        name: house.name_i18n?.pt ?? house.name_i18n?.en ?? 'House',
        members: memberCountsByHouse.get(house.id) ?? 0,
      }))
      .sort((a: TopHouse, b: TopHouse) => (b.members || 0) - (a.members || 0))
      .slice(0, 5);

    const pendingRequests = new Map<string, number>();
    for (const row of joinRequestsRes.data ?? []) {
      pendingRequests.set(row.house_id as string, Number(row.count) || 0);
    }
    const capacityEntries: CapacityEntry[] = houses.map((house: any) => {
      const pending = pendingRequests.get(house.id) ?? 0;
      const monthlyCapacity = house.monthly_capacity ?? null;
      const status: CapacityEntry['status'] =
        monthlyCapacity && pending >= monthlyCapacity ? 'blocked' : pending >= (monthlyCapacity ?? Infinity) * 0.8 ? 'limit' : 'ok';
      return {
        house_id: house.id,
        name: house.name_i18n?.pt ?? house.name_i18n?.en ?? 'House',
        monthly_capacity: monthlyCapacity,
        pending_requests: pending,
        status,
      };
    });

    const alerts = alertsRes.data ?? [];
    const severityMap = { low: 0, medium: 0, high: 0 };
    for (const alert of alerts) {
      const severity = (alert.severity || 'medium').toLowerCase() as keyof typeof severityMap;
      if (severityMap[severity] !== undefined) severityMap[severity] += 1;
    }
    const topAlerts = alerts
      .slice(0, 5)
      .map((alert: any) => ({
        id: alert.id as string,
        houseId: alert.house_id as string,
        type: alert.type,
        severity: alert.severity,
        createdAt: alert.created_at,
      }));

    const onboardingIssues = (onboardingRes.data ?? [])
      .filter((row: any) => Number(row.published_popups || 0) === 0)
      .map((row: any) => ({
        houseKey: row.house_key,
        name: row.name_i18n?.pt ?? row.name_i18n?.en ?? row.house_key,
        publishedPopups: Number(row.published_popups || 0),
      }));

    const poolPressureMap = new Map<string, number>();
    for (const row of poolRes.data ?? []) {
      const code = (row as any).sport?.code || 'unknown';
      poolPressureMap.set(code, (poolPressureMap.get(code) || 0) + 1);
    }
    const poolPressure = Array.from(poolPressureMap.entries())
      .map(([code, pending]) => ({ sportCode: code, pending }))
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      totals,
      members: {
        globalCount: globalMemberCount,
        topHouses,
      },
      capacity: capacityEntries,
      alerts: {
        openBySeverity: severityMap,
        top: topAlerts,
      },
      onboarding: onboardingIssues,
      poolPressure,
    });
  } catch (error) {
    console.error('[admin/houses/overview] failed', error);
    return NextResponse.json({ success: false, error: 'Failed to load overview.' }, { status: 500 });
  }
}
