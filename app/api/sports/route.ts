import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr', 'de', 'it'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function normalizeLocale(raw?: string | null): SupportedLocale {
  if (!raw) return 'en';
  const lower = raw.toLowerCase();

  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('it')) return 'it';

  return 'en';
}

type SportRow = {
  id: string;
  code: string | null;
  name_i18n: Record<string, string> | null;
  created_at: string | null;
};

function resolveLocalizedName(
  name_i18n: Record<string, string> | null,
  locale: SupportedLocale,
  fallback?: string | null
): string {
  if (name_i18n && name_i18n[locale]) return name_i18n[locale];
  if (name_i18n && name_i18n.en) return name_i18n.en;
  return fallback ?? '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLocale = searchParams.get('locale');
    const locale = normalizeLocale(rawLocale);
    const sportId = searchParams.get('id');

    let query = supabaseAdmin.from('sports').select('id, code, name_i18n, created_at').order('code', { ascending: true });
    if (sportId) {
      query = query.eq('id', sportId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading sports:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar desportos.' },
        { status: 500 }
      );
    }

    const sports = (data ?? []) as SportRow[];

    const result = sports.map((row) => {
      const name = resolveLocalizedName(row.name_i18n, locale, row.code);
      return {
        id: row.id,
        code: row.code,
        name,
        created_at: row.created_at,
      };
    });

    return NextResponse.json(
      {
        success: true,
        locale,
        count: result.length,
        sports: result,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Unexpected error in GET /api/sports:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao carregar desportos.',
      },
      { status: 500 }
    );
  }
}
