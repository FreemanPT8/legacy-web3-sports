import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase'; // usar service role no backend

// --- helpers ---

function mapCountryToCode(country: string | null | undefined): string | null {
  if (!country) return null;
  const c = country.trim().toLowerCase();

  const MAP: Record<string, string> = {
    // PT / EN / ES variantes comuns
    portugal: 'PT',
    'republica portuguesa': 'PT',

    spain: 'ES',
    españa: 'ES',
    espanha: 'ES',

    brazil: 'BR',
    brasil: 'BR',

    france: 'FR',
    frança: 'FR',

    germany: 'DE',
    alemania: 'DE',
    alemanha: 'DE',

    italy: 'IT',
    italia: 'IT',

    'united kingdom': 'GB',
    uk: 'GB',
    'reino unido': 'GB',

    'united states': 'US',
    usa: 'US',
    'estados unidos': 'US',
  };

  return MAP[c] || null;
}

/**
 * Extrair IP “real” da request (útil para spam / segurança).
 * Tenta: request.ip → X-Forwarded-For[0] → null
 */
function getClientIp(req: NextRequest): string | null {
  // Next.js normalmente preenche request.ip atrás de um proxy
  if (req.ip) return req.ip;

  const fwd = req.headers.get('x-forwarded-for');
  if (!fwd) return null;

  const first = fwd.split(',')[0]?.trim();
  return first || null;
}

/**
 * Tenta encontrar o Head of House para (sportCode, countryCode)
 * e, se encontrar, atualiza o onboarding_submissions.assigned_to_user_id
 */
async function autoAssignToHouseHead(
  submissionId: string,
  sportCode: string | null,
  countryCode: string | null
) {
  try {
    if (!sportCode || !countryCode) return;

    // 1) sport.id a partir do code
    const { data: sportRow, error: sportError } = await supabaseAdmin
      .from('sports')
      .select('id')
      .eq('code', sportCode)
      .maybeSingle();

    if (sportError || !sportRow) return;

    const sportId = (sportRow as { id: string }).id;

    // 2) House para esse sport + country
    const { data: houseRow, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id')
      .eq('sport_id', sportId)
      .eq('country_code', countryCode)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (houseError || !houseRow) return;

    const houseId = (houseRow as { id: string }).id;

    // 3) Head dessa House (house_heads → admin_assignments → users)
    const { data: headRow, error: headError } = await supabaseAdmin
      .from('house_heads')
      .select('admin_id')
      .eq('house_id', houseId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (headError || !headRow) return;

    const adminId = (headRow as { admin_id: string }).admin_id;

    const { data: adminAssign, error: adminError } = await supabaseAdmin
      .from('admin_assignments')
      .select('user_id')
      .eq('id', adminId)
      .maybeSingle();

    if (adminError || !adminAssign) return;

    const userId = (adminAssign as { user_id: string }).user_id;
    if (!userId) return;

    // 4) Atualizar a submissão com o responsável (user_id)
    const { error: updateError } = await supabaseAdmin
      .from('onboarding_submissions')
      .update({ assigned_to_user_id: userId })
      .eq('id', submissionId);

    if (updateError) {
      console.error(
        'Error auto-assigning onboarding to House Head:',
        updateError
      );
    }
  } catch (err) {
    console.error('Unexpected error in autoAssignToHouseHead:', err);
  }
}

// ----------------- POST (criar submissão pública) -----------------

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const body = await request.json();

    const {
      email,
      phone,
      telegram,
      full_name,
      country,
      sports_category,
      sports_role,
      organization,
      web3_experience,
      interests,

      // novos campos ligados ao modo “não-desporto”
      is_non_sport,
      web3_type,

      // UTMs opcionais vindas do body (ou query string)
      utm_source: utmSourceBody,
      utm_medium: utmMediumBody,
      utm_campaign: utmCampaignBody,

      // referral (quem trouxe esta pessoa)
      referrer_user_id,

      // mensagem original
      message,
    } = body;

    // validações básicas
    if (!email || !full_name || !country) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email, full name, and country are required',
        },
        { status: 400 }
      );
    }

    if (!message || message.length < 8 || message.length > 8888) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message must be between 8 and 8888 characters',
        },
        { status: 400 }
      );
    }

    // ---- flag de perfil não ligado ao desporto ----
    const isNonSport: boolean = !!is_non_sport;

    // ---- desporto / código ----
    let sportsCategoryValue: string | null =
      typeof sports_category === 'string' && sports_category.trim() !== ''
        ? sports_category.trim()
        : null;

    // se for perfil não-desporto, limpamos o desporto
    if (isNonSport) {
      sportsCategoryValue = null;
    }

    let sportsCategoryCode: string | null = null;

    if (!isNonSport && sportsCategoryValue && !sportsCategoryValue.includes(' ')) {
      // sem espaços → tratamos como código (ex: CLIMBING)
      sportsCategoryCode = sportsCategoryValue;
    }

    // ---- country_code ISO a partir do nome ----
    const countryCode = mapCountryToCode(country);

    // ---- normalizar web3_type para o CHECK da tabela ----
    const rawWeb3Type =
      typeof web3_type === 'string' ? web3_type.trim().toUpperCase() : null;

    const allowedWeb3Types = [
      'PROFESSIONAL_WEB3_LEARNING',
      'WEB3_ENTHUSIAST',
    ] as const;

    const web3TypeNormalized = allowedWeb3Types.includes(
      rawWeb3Type as (typeof allowedWeb3Types)[number]
    )
      ? (rawWeb3Type as (typeof allowedWeb3Types)[number])
      : null;

    // ---- UTMs: body tem prioridade, query string é fallback ----
    const utmSource =
      (typeof utmSourceBody === 'string' && utmSourceBody.trim() !== ''
        ? utmSourceBody.trim()
        : null) ||
      searchParams.get('utm_source');

    const utmMedium =
      (typeof utmMediumBody === 'string' && utmMediumBody.trim() !== ''
        ? utmMediumBody.trim()
        : null) ||
      searchParams.get('utm_medium');

    const utmCampaign =
      (typeof utmCampaignBody === 'string' && utmCampaignBody.trim() !== ''
        ? utmCampaignBody.trim()
        : null) ||
      searchParams.get('utm_campaign');

    // ---- referrer_user_id (quem fez o convite) ----
    const referrerUserId =
      typeof referrer_user_id === 'string' && referrer_user_id.trim() !== ''
        ? referrer_user_id.trim()
        : null;

    // ---- IP de origem ----
    const createdByIp = getClientIp(request);

    // ---- tentar ligar a uma conta existente pelo email ----
    let linkedUserId: string | null = null;

    try {
      const { data: existingUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('email', email) // case-insensitive
        .maybeSingle();

      if (!userError && existingUser) {
        linkedUserId = (existingUser as { id: string }).id;
      }
    } catch (linkErr) {
      console.error(
        'Error trying to link onboarding submission to existing user by email:',
        linkErr
      );
    }

    // ---- interesses: normalizar + enriquecer com tags internas ----
    const baseInterests: string[] = Array.isArray(interests)
      ? interests
      : [];

    const interestSet = new Set<string>();

    for (const raw of baseInterests) {
      if (!raw) continue;
      const trimmed = String(raw).trim();
      if (!trimmed) continue;
      interestSet.add(trimmed);
    }

    // Tag genérica: perfil ligado ao desporto ou não
    if (isNonSport) {
      interestSet.add('PROFILE_TYPE_WEB3_ONLY');
    } else {
      interestSet.add('PROFILE_TYPE_SPORTS');
    }

    // Tags específicas do sub-tipo Web3
    if (isNonSport && web3TypeNormalized) {
      if (web3TypeNormalized === 'PROFESSIONAL_WEB3_LEARNING') {
        interestSet.add('WEB3_PRO_PATH');
      }
      if (web3TypeNormalized === 'WEB3_ENTHUSIAST') {
        interestSet.add('WEB3_ENTHUSIAST_PATH');
      }
    }

    const interestsArray = Array.from(interestSet);

    // 1) inserir submissão
    const { data, error } = await supabaseAdmin
      .from('onboarding_submissions')
      .insert({
        email,
        phone: phone || null,
        telegram: telegram || null,
        full_name,
        country,
        country_code: countryCode,

        // desporto (só se não for perfil “non-sport”)
        sports_category: sportsCategoryValue,
        sports_category_code: sportsCategoryCode,
        sports_role: isNonSport ? null : sports_role || null,
        organization: isNonSport ? null : organization || null,

        web3_experience: web3_experience || null,
        web3_type: web3TypeNormalized,
        is_non_sport: isNonSport,

        interests: interestsArray,
        message,

        user_id: linkedUserId, // ligação direta à conta LEGACY (se existir)

        // tracking & contexto
        created_by_ip: createdByIp,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        referrer_user_id: referrerUserId,

        // status usa o default 'PENDING_RESPONSE'
      })
      .select('id, sports_category_code, country, country_code, user_id, is_non_sport')
      .single();

    if (error) {
      console.error('Error inserting onboarding submission:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const inserted = data as {
      id: string;
      sports_category_code: string | null;
      country: string | null;
      country_code: string | null;
      user_id: string | null;
      is_non_sport: boolean | null;
    };

    // 2) tentar auto-atribuir ao Head of House (apenas perfis ligados ao desporto)
    if (!inserted.is_non_sport) {
      await autoAssignToHouseHead(
        inserted.id,
        inserted.sports_category_code,
        inserted.country_code || mapCountryToCode(inserted.country)
      );
    }

    return NextResponse.json({ success: true, submission: inserted });
  } catch (error) {
    console.error('Server error in /api/forms/onboarding POST:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

// ----------------- GET (lista pública, se ainda precisares) -----------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('onboarding_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading onboarding submissions (public GET):', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, submissions: data });
  } catch (error) {
    console.error('Server error in /api/forms/onboarding GET:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
