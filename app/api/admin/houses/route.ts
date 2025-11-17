import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type HouseStatus = 'development' | 'under_construction' | 'active';

type AdminHouse = {
  id: string;
  sport_name: string | null;
  sport_code: string | null;
  country_code: string;
  status: HouseStatus;
  created_at: string;
  head: null;
  moderators_count: number;
};

function mapRowToAdminHouse(row: any): AdminHouse {
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
    sport_name: title as string,
    sport_code: row.sport_id ?? null,
    country_code: row.country_code as string,
    status,
    created_at: row.created_at as string,
    head: null,
    moderators_count: 0,
  };
}

// GET /api/admin/houses  -> lista Houses
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
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

    const houses = (data ?? []).map(mapRowToAdminHouse);

    return NextResponse.json({ success: true, houses });
  } catch (err) {
    console.error('Unexpected error in /api/admin/houses (GET):', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error loading houses' },
      { status: 500 }
    );
  }
}

// POST /api/admin/houses  -> cria nova House
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { sportId, countryCode, status } = body as {
      sportId?: string;
      countryCode?: string;
      status?: HouseStatus;
    };

    if (!sportId || !countryCode || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'sportId, countryCode and status are required.',
        },
        { status: 400 }
      );
    }

    if (!['active', 'under_construction', 'development'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value.' },
        { status: 400 }
      );
    }

    const country = countryCode.toUpperCase();

    // Buscar info do desporto para gerar name_i18n
    const { data: sportRow, error: sportError } = await supabaseAdmin
      .from('sports')
      .select('id, code, name_i18n')
      .eq('id', sportId)
      .maybeSingle();

    if (sportError) {
      console.error('Error loading sport in POST /api/admin/houses:', sportError);
      return NextResponse.json(
        { success: false, error: 'Error loading sport for House creation.' },
        { status: 500 }
      );
    }

    if (!sportRow) {
      return NextResponse.json(
        { success: false, error: 'Sport not found.' },
        { status: 400 }
      );
    }

    const sportNameI18n = (sportRow as any).name_i18n || {};
    const baseSportName =
      sportNameI18n.en ||
      sportNameI18n.pt ||
      Object.values(sportNameI18n)[0] ||
      (sportRow as any).code ||
      'Sport';

    const houseNameEn = `House of ${baseSportName} ${country}`;
    const name_i18n = {
      en: houseNameEn,
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('houses_of_sports')
      .insert({
        sport_id: sportId,
        country_code: country,
        status,
        name_i18n,
      })
      .select('id, sport_id, country_code, status, name_i18n, created_at')
      .single();

    if (insertError) {
      console.error('Error inserting House in POST /api/admin/houses:', insertError);
      return NextResponse.json(
        { success: false, error: 'Error creating House of Sports.' },
        { status: 500 }
      );
    }

    const house = mapRowToAdminHouse(inserted);

    return NextResponse.json({ success: true, house });
  } catch (err) {
    console.error('Unexpected error in /api/admin/houses (POST):', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error creating House of Sports' },
      { status: 500 }
    );
  }
}
