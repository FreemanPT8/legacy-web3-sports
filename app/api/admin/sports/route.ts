import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr', 'de', 'it'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

interface CreateSportBody {
  name?: string;
  code?: string | null;
  translations?: Record<string, string | undefined>;
}

type SportRow = {
  id: string;
  name_i18n: Record<string, string> | null;
};

function normalizeLocaleKey(raw?: string | null): SupportedLocale {
  if (!raw) return 'en';
  const lower = raw.toLowerCase();
  const match = SUPPORTED_LOCALES.find((locale) => lower.startsWith(locale));
  return match ?? 'en';
}

export async function POST(request: NextRequest) {
  const permResult = await requirePermission(request, 'canCreateSports');
  if (!permResult.success) return permResult.response!;

  let payload: CreateSportBody | null = null;
  try {
    payload = (await request.json()) as CreateSportBody;
  } catch {
    payload = null;
  }

  const rawName = payload?.name?.trim();
  if (!rawName) {
    return NextResponse.json(
      { success: false, error: 'Sport name is required.' },
      { status: 400 },
    );
  }

  const normalizedName = rawName.replace(/\s+/g, ' ').trim();
  let code = payload?.code?.trim().toUpperCase() || null;
  if (code && !/^[A-Z0-9_\-]{2,40}$/.test(code)) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Sport code must be alphanumeric (you can use - or _) with 2-40 characters.',
      },
      { status: 400 },
    );
  }

  const translations: Record<string, string> = {};
  if (payload?.translations && typeof payload.translations === 'object') {
    for (const [locale, value] of Object.entries(payload.translations)) {
      if (!value || typeof value !== 'string') continue;
      const clean = value.trim();
      if (!clean) continue;
      const normalizedLocale = normalizeLocaleKey(locale);
      translations[normalizedLocale] = clean;
    }
  }

  if (!translations.en) {
    translations.en = normalizedName;
  }

  // 1) Prevent duplicate codes
  if (code) {
    const { data: existingCode, error: codeError } = await supabaseAdmin
      .from('sports')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (codeError) {
      console.error(
        'Error checking existing sport code in POST /api/admin/sports:',
        codeError,
      );
      return NextResponse.json(
        { success: false, error: 'Failed to validate sport code.' },
        { status: 500 },
      );
    }

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: 'Another sport already uses this code.' },
        { status: 409 },
      );
    }
  }

  // 2) Try to avoid duplicates by name (case-insensitive check across known locales)
  try {
    const { data: sportsByName, error: nameError } = await supabaseAdmin
      .from('sports')
      .select('id, name_i18n')
      .returns<SportRow[]>();

    if (nameError) {
      console.error(
        'Error checking sport names in POST /api/admin/sports:',
        nameError,
      );
    } else {
      const normalizedLower = normalizedName.toLowerCase();
      const duplicate = (sportsByName ?? []).some((row: SportRow) => {
        const names = row?.name_i18n ?? null;
        if (!names) return false;
        return Object.values(names).some(
          (value) =>
            typeof value === 'string' &&
            value.trim().toLowerCase() === normalizedLower,
        );
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error:
              'A sport with a similar name already exists. Please confirm before creating a duplicate.',
          },
          { status: 409 },
        );
      }
    }
  } catch (err) {
    console.error('Unexpected error checking sport names:', err);
  }

  const insertPayload = {
    code,
    name_i18n: translations,
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('sports')
      .insert(insertPayload)
      .select('id, code, name_i18n, created_at')
      .single();

    if (error) {
      console.error('Error inserting sport:', error);
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json(
          {
            success: false,
            error: 'Sport code already exists. Please choose another one.',
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to create sport.' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        sport: data,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('Unexpected error creating sport:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error creating sport.' },
      { status: 500 },
    );
  }
}
