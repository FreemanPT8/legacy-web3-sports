import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { getHouseHeadHouseIds } from '@/lib/server/house-heads';
import { formatMissingResourceError, isMissingTable } from '@/lib/postgres';

type JoinStatus = string;

type JoinRow = {
  house_id: string;
  status: JoinStatus;
  created_at: string;
  houses?: {
    house_key?: string | null;
    name_i18n?: Record<string, string> | null;
    country_code?: string | null;
  } | null;
};

const missingTable = (table: string) =>
  NextResponse.json({ success: false, error: formatMissingResourceError(table) }, { status: 500 });

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  try {
    const isSuperAdmin = auth.user!.role === 'Super Admin';
    const scopedHouseIds = isSuperAdmin ? null : await getHouseHeadHouseIds(auth.user!.userId);
    if (scopedHouseIds && scopedHouseIds.length === 0) {
      return NextResponse.json({
        success: true,
        summary: { totals: {}, houses: [] },
      });
    }

    let query = supabaseAdmin
      .from('house_join_requests')
      .select(
        `
        house_id,
        status,
        created_at,
        houses:houses_of_sports(
          house_key,
          name_i18n,
          country_code
        )
      `,
      );

    if (scopedHouseIds) {
      query = query.in('house_id', scopedHouseIds);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTable(error)) return missingTable('house_join_requests');
      throw error;
    }

    const rows = (data as JoinRow[]) ?? [];

    const totals: Record<JoinStatus, number> = {};
    const byHouse = new Map<
      string,
      {
        houseId: string;
        houseKey: string;
        name: string;
        countryCode: string | null;
        counts: Record<JoinStatus, number>;
        lastRequest: string | null;
      }
    >();

    for (const row of rows) {
      totals[row.status] = (totals[row.status] || 0) + 1;

      const existing = byHouse.get(row.house_id);
      const name =
        row.houses?.name_i18n?.pt ??
        row.houses?.name_i18n?.en ??
        row.houses?.name_i18n?.es ??
        `House ${row.houses?.house_key ?? ''}`.trim();
      const entry =
        existing ??
        {
          houseId: row.house_id,
          houseKey: row.houses?.house_key ?? 'HOUSE',
          name,
          countryCode: row.houses?.country_code ?? null,
          counts: {},
          lastRequest: null,
        };
      entry.counts[row.status] = (entry.counts[row.status] || 0) + 1;

      if (!entry.lastRequest || new Date(row.created_at) > new Date(entry.lastRequest)) {
        entry.lastRequest = row.created_at;
      }

      byHouse.set(row.house_id, entry);
    }

    const houses = Array.from(byHouse.values()).sort((a, b) => {
      const pendingA = a.counts.pending ?? 0;
      const pendingB = b.counts.pending ?? 0;
      if (pendingA === pendingB) {
        return (b.lastRequest ?? '').localeCompare(a.lastRequest ?? '');
      }
      return pendingB - pendingA;
    });

    return NextResponse.json({
      success: true,
      summary: {
        totals,
        houses,
      },
    });
  } catch (error) {
    console.error('[admin/houses/join-report] failed', error);
    return NextResponse.json({ success: false, error: 'Falha ao carregar resumo dos pedidos.' }, { status: 500 });
  }
}
