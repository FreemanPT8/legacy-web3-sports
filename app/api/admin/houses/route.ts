import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type HouseStatus = 'development' | 'under_construction' | 'active';

export async function GET(request: NextRequest) {
  // 1) Garante que é Admin / Super Admin
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    // 2) Buscar Houses diretamente da tabela houses_of_sports
    const { data, error } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id, sport_id, country_code, status, name_i18n, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error in /api/admin/houses:', error);
      return NextResponse.json(
        { success: false, error: 'Supabase error loading houses' },
        { status: 500 }
      );
    }

    // 3) Mapear para o formato que o frontend espera
    const houses = (data ?? []).map((row: any) => {
      const name_i18n = row.name_i18n || {};

      const status: HouseStatus =
        row.status === 'active' || row.status === 'under_construction'
          ? row.status
          : 'development';

      const title =
        name_i18n.en ||
        name_i18n.pt ||
        name_i18n.es ||
        name_i18n.fr ||
        name_i18n.de ||
        name_i18n.it ||
        'Unnamed House';

      return {
        id: row.id as string,
        sport_name: title as string,           // usamos o name_i18n
        sport_code: row.sport_id ?? null,      // por agora só o id; depois trocamos pelo código real do desporto
        country_code: row.country_code as string,
        status,
        created_at: row.created_at as string,
        head: null,                            // vamos tratar disto mais tarde
        moderators_count: 0,                   // idem
      };
    });

    return NextResponse.json({ success: true, houses });
  } catch (err) {
    console.error('Unexpected error in /api/admin/houses:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error loading houses' },
      { status: 500 }
    );
  }
}
