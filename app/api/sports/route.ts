import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Normalização de locales vindos do frontend
const LOCALE_MAP: Record<string, string> = {
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  pt: 'pt-PT',
  'pt-PT': 'pt-PT',
  es: 'es',
  'es-ES': 'es',
  fr: 'fr',
  'fr-FR': 'fr',
  de: 'de',
  'de-DE': 'de',
  it: 'it',
  'it-IT': 'it',
};

// Tipo para a linha que vem de sports_localized + relação sports
type SportsLocalizedRow = {
  sport_id: string;
  name: string;
  sports?: {
    code?: string | null;
  } | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const rawLocale = searchParams.get('locale') || 'en';

    const normalizedLocale =
      LOCALE_MAP[rawLocale] ||
      LOCALE_MAP[rawLocale.toLowerCase()] ||
      'en';

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
