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
  tagline_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  image_url: string | null;
};

type UserRow = {
  id: string;
  role: string | null;
};

type HouseHeadRow = {
  house_id: string;
  admin_id: string;
};

type AdminAssignmentRow = {
  id: string;
  user_id: string;
};

type HouseModeratorRow = {
  house_id: string;
  user_id: string;
};

function resolveLocalizedText(
  i18n: Record<string, string> | null,
  locale: SupportedLocale
): string | null {
  if (!i18n) return null;
  if (i18n[locale]) return i18n[locale];
  if (i18n.en) return i18n.en;
  const anyValue = Object.values(i18n)[0];
  return anyValue ?? null;
}

// se a tabela não existir em Supabase, tratamos como “feature ainda não ligada”
function isTableMissingError(error: any): boolean {
  return !!error && (error.code === '42P01' || error.message?.includes('42P01'));
}

/**
 * GET /api/sports/houses/[houseId]/profile?locale=pt
 * Devolve o perfil público da House (tagline, descrição e imagem) para a língua pedida.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { houseId: string } }
) {
  const houseId = params.houseId;
  const { searchParams } = new URL(request.url);
  const locale = normalizeLocale(searchParams.get('locale'));

  try {
    const { data, error } = await supabaseAdmin
      .from('house_profiles')
      .select('house_id, tagline_i18n, description_i18n, image_url')
      .eq('house_id', houseId)
      .maybeSingle();

    if (error) {
      if (isTableMissingError(error)) {
        // tabela ainda não existe -> apenas devolvemos perfil vazio,
        // sem rebentar com o resto da app
        return NextResponse.json({
          success: true,
          locale,
          profile: null,
          profilesEnabled: false,
        });
      }

      console.error('Error loading house_profiles:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar perfil da House.' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        success: true,
        locale,
        profile: null,
        profilesEnabled: true,
      });
    }

    const row = data as HouseProfileRow;

    return NextResponse.json({
      success: true,
      locale,
      profilesEnabled: true,
      profile: {
        house_id: row.house_id,
        image_url: row.image_url,
        tagline: resolveLocalizedText(row.tagline_i18n, locale),
        description: resolveLocalizedText(row.description_i18n, locale),
      },
    });
  } catch (err) {
    console.error('Unexpected error in GET /api/sports/houses/[houseId]/profile:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao carregar o perfil da House.',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sports/houses/[houseId]/profile?locale=pt
 * Atualiza o perfil público da House para a língua atual.
 * Autorização:
 *  - Super Admin / Admin
 *  - Head of House
 *  - Moderador da House
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { houseId: string } }
) {
  const houseId = params.houseId;
  const { searchParams } = new URL(request.url);
  const locale = normalizeLocale(searchParams.get('locale'));

  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : null;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token de autenticação em falta.' },
        { status: 401 }
      );
    }

    // obter utilizador a partir do token (via serviço Supabase)
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(
      token
    );

    if (authError || !userData?.user) {
      console.error('Auth error in PATCH house profile:', authError);
      return NextResponse.json(
        { success: false, error: 'Não foi possível validar o utilizador.' },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // verificar role global
    const { data: userRowData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Error loading users in PATCH profile:', userError);
      return NextResponse.json(
        { success: false, error: 'Erro ao validar permissões.' },
        { status: 500 }
      );
    }

    const userRow = userRowData as UserRow | null;
    const isGlobalAdmin =
      !!userRow &&
      (userRow.role === 'Super Admin' || userRow.role === 'Admin');

    let isHead = false;
    let isModerator = false;

    if (!isGlobalAdmin) {
      // é Head desta House?
      const { data: headsData, error: headsError } = await supabaseAdmin
        .from('house_heads')
        .select('house_id, admin_id')
        .eq('house_id', houseId);

      if (headsError && !isTableMissingError(headsError)) {
        console.error('Error loading house_heads:', headsError);
        return NextResponse.json(
          { success: false, error: 'Erro ao validar Head of House.' },
          { status: 500 }
        );
      }

      const heads = (headsData ?? []) as HouseHeadRow[];

      if (heads.length > 0) {
        const adminIds = heads.map((h) => h.admin_id);
        const { data: adminAssignData, error: adminAssignError } =
          await supabaseAdmin
            .from('admin_assignments')
            .select('id, user_id')
            .in('id', adminIds);

        if (adminAssignError && !isTableMissingError(adminAssignError)) {
          console.error('Error loading admin_assignments:', adminAssignError);
          return NextResponse.json(
            { success: false, error: 'Erro ao validar Head of House.' },
            { status: 500 }
          );
        }

        const adminAssignments = (adminAssignData ?? []) as AdminAssignmentRow[];
        isHead = adminAssignments.some((a) => a.user_id === userId);
      }

      // é moderador desta House?
      const { data: modsData, error: modsError } = await supabaseAdmin
        .from('house_moderators')
        .select('house_id, user_id')
        .eq('house_id', houseId)
        .eq('user_id', userId);

      if (modsError && !isTableMissingError(modsError)) {
        console.error('Error loading house_moderators:', modsError);
        return NextResponse.json(
          { success: false, error: 'Erro ao validar moderadores.' },
          { status: 500 }
        );
      }

      const mods = (modsData ?? []) as HouseModeratorRow[];
      isModerator = mods.length > 0;
    }

    if (!isGlobalAdmin && !isHead && !isModerator) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Não tens permissões para editar o perfil desta House (apenas Head, moderadores ou admins).',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const tagline: string | undefined = body.tagline?.toString().trim();
    const description: string | undefined = body.description?.toString().trim();
    const image_url: string | null =
      body.image_url !== undefined ? String(body.image_url || '').trim() || null : null;

    // buscar perfil atual para fazer merge i18n
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('house_profiles')
      .select('house_id, tagline_i18n, description_i18n, image_url')
      .eq('house_id', houseId)
      .maybeSingle();

    if (profileError) {
      if (isTableMissingError(profileError)) {
        // tabela ainda não existe -> avisa explicitamente
        return NextResponse.json(
          {
            success: false,
            error:
              'A tabela "house_profiles" ainda não está criada em Supabase. Cria-a para poderes guardar o perfil público das Houses.',
          },
          { status: 501 }
        );
      }

      console.error('Error loading house_profiles in PATCH:', profileError);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar perfil atual da House.' },
        { status: 500 }
      );
    }

    const existing = profileData as HouseProfileRow | null;

    const newTaglineI18n: Record<string, string> = {
      ...(existing?.tagline_i18n ?? {}),
    };
    const newDescriptionI18n: Record<string, string> = {
      ...(existing?.description_i18n ?? {}),
    };

    if (tagline !== undefined) {
      if (tagline === '') {
        delete newTaglineI18n[locale];
      } else {
        newTaglineI18n[locale] = tagline;
      }
    }

    if (description !== undefined) {
      if (description === '') {
        delete newDescriptionI18n[locale];
      } else {
        newDescriptionI18n[locale] = description;
      }
    }

    const payload = {
      house_id: houseId,
      tagline_i18n: newTaglineI18n,
      description_i18n: newDescriptionI18n,
      image_url: image_url !== null ? image_url : existing?.image_url ?? null,
    };

    const { error: upsertError } = await supabaseAdmin
      .from('house_profiles')
      .upsert(payload, { onConflict: 'house_id' });

    if (upsertError) {
      if (isTableMissingError(upsertError)) {
        return NextResponse.json(
          {
            success: false,
            error:
              'A tabela "house_profiles" ainda não está criada em Supabase. Cria-a para poderes guardar o perfil público das Houses.',
          },
          { status: 501 }
        );
      }

      console.error('Error upserting house_profiles:', upsertError);
      return NextResponse.json(
        { success: false, error: 'Erro ao gravar o perfil da House.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(
      'Unexpected error in PATCH /api/sports/houses/[houseId]/profile:',
      err
    );
    return NextResponse.json(
      { success: false, error: 'Erro interno ao atualizar o perfil da House.' },
      { status: 500 }
    );
  }
}
