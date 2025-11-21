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

type HouseProfileRow = {
  house_id: string;
  image_url: string | null;
  tagline_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  updated_at: string | null;
};

function resolveLocalizedField(
  obj: Record<string, string> | null | undefined,
  locale: SupportedLocale
): string {
  if (!obj) return '';
  if (obj[locale]) return obj[locale];
  if (obj.en) return obj.en;
  return '';
}

/**
 * GET /api/house-profiles/[houseId]?locale=pt
 * Devolve o perfil público da House (imagem, tagline, descrição)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { houseId: string } }
) {
  const houseId = params?.houseId;
  if (!houseId) {
    return NextResponse.json(
      { success: false, error: 'Missing houseId in route params.' },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawLocale = searchParams.get('locale');
    const locale = normalizeLocale(rawLocale);

    const { data, error } = await supabaseAdmin
      .from('house_profiles')
      .select('house_id, image_url, tagline_i18n, description_i18n, updated_at')
      .eq('house_id', houseId)
      .maybeSingle();

    if (error) {
      console.error('Error loading house_profile:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar perfil da House.' },
        { status: 500 }
      );
    }

    const row = (data ?? null) as HouseProfileRow | null;

    if (!row) {
      // Nenhum perfil criado ainda – isto é OK, apenas devolvemos profile: null
      return NextResponse.json({
        success: true,
        locale,
        profile: null,
      });
    }

    const tagline = resolveLocalizedField(row.tagline_i18n, locale);
    const description = resolveLocalizedField(row.description_i18n, locale);

    return NextResponse.json({
      success: true,
      locale,
      profile: {
        house_id: row.house_id,
        image_url: row.image_url,
        tagline_i18n: row.tagline_i18n ?? {},
        description_i18n: row.description_i18n ?? {},
        tagline,
        description,
        updated_at: row.updated_at,
      },
    });
  } catch (err) {
    console.error('Unexpected error in GET /api/house-profiles/[houseId]:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao carregar perfil da House.',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/house-profiles/[houseId]?locale=pt
 * Atualiza imagem / tagline / descrição (para um locale específico)
 *
 * Body JSON:
 * {
 *   "image_url"?: string | null,
 *   "tagline"?: string | null,
 *   "description"?: string | null
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { houseId: string } }
) {
  const houseId = params?.houseId;
  if (!houseId) {
    return NextResponse.json(
      { success: false, error: 'Missing houseId in route params.' },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawLocale = searchParams.get('locale');
    const locale = normalizeLocale(rawLocale);

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const hasImage = Object.prototype.hasOwnProperty.call(body, 'image_url');
    const hasTagline = Object.prototype.hasOwnProperty.call(body, 'tagline');
    const hasDescription = Object.prototype.hasOwnProperty.call(
      body,
      'description'
    );

    if (!hasImage && !hasTagline && !hasDescription) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nada para atualizar. Envia pelo menos um campo.',
        },
        { status: 400 }
      );
    }

    // Buscar perfil atual (se existir)
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('house_profiles')
      .select('house_id, image_url, tagline_i18n, description_i18n, updated_at')
      .eq('house_id', houseId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error loading existing house_profile:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao carregar perfil atual da House.',
        },
        { status: 500 }
      );
    }

    const existingRow = existing as HouseProfileRow | null;

    const nextTaglineI18n: Record<string, string> =
      (existingRow?.tagline_i18n as any) ?? {};
    const nextDescriptionI18n: Record<string, string> =
      (existingRow?.description_i18n as any) ?? {};

    if (hasTagline) {
      const value = body.tagline ?? '';
      nextTaglineI18n[locale] = value;
    }

    if (hasDescription) {
      const value = body.description ?? '';
      nextDescriptionI18n[locale] = value;
    }

    const nowIso = new Date().toISOString();

    if (existingRow) {
      // UPDATE
      const updatePayload: any = {
        updated_at: nowIso,
      };

      if (hasImage) {
        updatePayload.image_url = body.image_url ?? null;
      }
      if (hasTagline) {
        updatePayload.tagline_i18n = nextTaglineI18n;
      }
      if (hasDescription) {
        updatePayload.description_i18n = nextDescriptionI18n;
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('house_profiles')
        .update(updatePayload)
        .eq('house_id', houseId)
        .select(
          'house_id, image_url, tagline_i18n, description_i18n, updated_at'
        )
        .maybeSingle();

      if (updateError) {
        console.error('Error updating house_profile:', updateError);
        return NextResponse.json(
          { success: false, error: 'Erro ao atualizar perfil da House.' },
          { status: 500 }
        );
      }

      const row = updated as HouseProfileRow | null;
      const tagline = resolveLocalizedField(row?.tagline_i18n, locale);
      const description = resolveLocalizedField(row?.description_i18n, locale);

      return NextResponse.json({
        success: true,
        locale,
        profile: {
          house_id: row?.house_id ?? houseId,
          image_url: row?.image_url ?? null,
          tagline_i18n: row?.tagline_i18n ?? {},
          description_i18n: row?.description_i18n ?? {},
          tagline,
          description,
          updated_at: row?.updated_at ?? nowIso,
        },
      });
    }

    // INSERT (quando ainda não existe perfil)
    const insertPayload: any = {
      house_id: houseId,
      updated_at: nowIso,
      image_url: hasImage ? body.image_url ?? null : null,
      tagline_i18n: hasTagline ? nextTaglineI18n : {},
      description_i18n: hasDescription ? nextDescriptionI18n : {},
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('house_profiles')
      .insert(insertPayload)
      .select(
        'house_id, image_url, tagline_i18n, description_i18n, updated_at'
      )
      .maybeSingle();

    if (insertError) {
      console.error('Error inserting house_profile:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao criar perfil da House.',
        },
        { status: 500 }
      );
    }

    const row = inserted as HouseProfileRow | null;
    const tagline = resolveLocalizedField(row?.tagline_i18n, locale);
    const description = resolveLocalizedField(row?.description_i18n, locale);

    return NextResponse.json({
      success: true,
      locale,
      profile: {
        house_id: row?.house_id ?? houseId,
        image_url: row?.image_url ?? null,
        tagline_i18n: row?.tagline_i18n ?? {},
        description_i18n: row?.description_i18n ?? {},
        tagline,
        description,
        updated_at: row?.updated_at ?? nowIso,
      },
    });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/house-profiles/[houseId]:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao atualizar perfil da House.',
      },
      { status: 500 }
    );
  }
}
