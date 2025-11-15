import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Tipo para a linha que vem de sports_localized + relação sports
type SportsLocalizedRow = {
  sport_id: string;
  name: string;
  sports?: {
    code?: string | null;
  } | null;
};

function normalizeLocale(rawLocale: string | null): string {
  if (!rawLocale) return 'en';

  // ex: "pt-PT" -> "pt", "en-US" -> "en"
  const base = rawLocale.split('-')[0].toLowerCase();

  switch (base) {
    case 'pt':
    case 'en':
    case 'es':
    case 'fr':
    case 'de':
    case 'it':
      return base;
    default:
      return 'en';
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const rawLocale = searchParams.get('locale');
    const normalizedLocale = normalizeLocale(rawLocale);

    const { data, error } = await supabaseAdmin
      .from('sports_localized')
      .select(
        `
        sport_id,
        name,
        sports: sport_id (
          code
        )
      `
      )
      .eq('locale', normalizedLocale)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching sports_localized:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error.message ??
            'Erro ao carregar lista de desportos (sports_localized).',
        },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as SportsLocalizedRow[];

    const sports = rows.map((row) => ({
      id: row.sport_id,
      code: row.sports?.code ?? null,
      name: row.name,
    }));

    return NextResponse.json({
      success: true,
      locale: normalizedLocale,
      count: sports.length,
      sports,
    });
  } catch (err) {
    console.error('Unexpected error in GET /api/sports:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno no servidor ao carregar desportos.',
      },
      { status: 500 }
    );
  }
}
