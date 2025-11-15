import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Mapa simples para normalizar locales que possam vir da app
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // locale enviado pelo frontend: ?locale=pt, ?locale=es, etc.
    const rawLocale = searchParams.get('locale') || 'en';

    const normalizedLocale =
      LOCALE_MAP[rawLocale] || LOCALE_MAP[rawLocale.toLowerCase()] || 'en';

    // Buscar das tabelas:
    // - sports_localized (name + locale)
    // - sports (code) via foreign key sport_id
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

    const sports =
      data?.map((row) => ({
        id: row.sport_id,
        code: (row as any).sports?.code ?? null,
        name: row.name,
      })) ?? [];

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
