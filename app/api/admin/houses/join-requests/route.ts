import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { getHouseHeadHouseIds } from '@/lib/server/house-heads';

type JoinRequestRow = {
  id: string;
  house_id: string;
  user_id: string | null;
  status: string;
  payload: Record<string, any> | null;
  created_at: string;
  houses?: {
    house_key?: string | null;
    name_i18n?: Record<string, string>;
    country_code?: string | null;
  } | null;
  users?: {
    id: string;
    username: string | null;
    full_name: string | null;
    email: string | null;
  } | null;
};

function missingTableResponse(table: string) {
  return NextResponse.json(
    {
      success: false,
      error: `Tabela ${table} inexistente. Corre as migrações pendentes no Supabase.`,
    },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;
  const actor = auth.user!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client unavailable.' }, { status: 500 });
  }

  try {
    const isSuperAdmin = actor.role === 'Super Admin';
    const scopedHouseIds = isSuperAdmin ? null : await getHouseHeadHouseIds(actor.userId);
    if (scopedHouseIds && scopedHouseIds.length === 0) {
      return NextResponse.json({ success: true, requests: [] });
    }

    let query = supabaseAdmin
      .from('house_join_requests')
      .select(
        `
        id,
        house_id,
        user_id,
        status,
        payload,
        created_at,
        houses:houses_of_sports(
          house_key,
          name_i18n,
          country_code,
          status,
        ),
        users:users(
          id,
          username,
          full_name,
          email
        )
      `,
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (scopedHouseIds) {
      query = query.in('house_id', scopedHouseIds);
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01') return missingTableResponse('house_join_requests');
      throw error;
    }

    const requests = (data as JoinRequestRow[] | null)?.map((row) => {
      const houseName =
        row.houses?.name_i18n?.pt ??
        row.houses?.name_i18n?.en ??
        row.houses?.name_i18n?.es ??
        'House';
      return {
        id: row.id,
        houseId: row.house_id,
        houseKey: row.houses?.house_key ?? 'HOUSE',
        houseName,
        countryCode: row.houses?.country_code ?? null,
        status: row.status,
        note: row.payload?.note ?? null,
        createdAt: row.created_at,
        user: {
          id: row.users?.id ?? null,
          name: row.users?.full_name ?? row.users?.username ?? row.users?.email ?? 'Utilizador',
          username: row.users?.username ?? null,
          email: row.users?.email ?? null,
        },
      };
    }) ?? [];

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('[admin/join-requests] load failed', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao carregar pedidos pendentes.' },
      { status: 500 },
    );
  }
}
