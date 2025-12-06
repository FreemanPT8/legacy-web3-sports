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
 * Normaliza uma string em formato TAG (maíusculas, underscores)
 */
function toTagBase(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

/**
 * Classifica nível de Web3 com base numa frase livre
 */
function inferWeb3LevelTag(source: string | null | undefined): string | null {
  if (!source) return null;
  const txt = source.toLowerCase();

  const beginnerPatterns = [
    'nenhuma experiência',
    'nenhuma experiencia',
    'nenhuma',
    'no experience',
    'zero',
    'iniciante',
    'beginner',
  ];
  if (beginnerPatterns.some((p) => txt.includes(p))) {
    return 'WEB3_BEGINNER';
  }

  const intermediatePatterns = [
    'alguma experiência',
    'alguma experiencia',
    'intermédio',
    'intermedio',
    'some experience',
    'medium',
    'intermediate',
  ];
  if (intermediatePatterns.some((p) => txt.includes(p))) {
    return 'WEB3_INTERMEDIATE';
  }

  const advancedPatterns = [
    'muita experiência',
    'muita experiencia',
    'experiente',
    'avançado',
    'avancado',
    'advanced',
    'expert',
    'profissional',
    'professional',
    'pro',
  ];
  if (advancedPatterns.some((p) => txt.includes(p))) {
    return 'WEB3_ADVANCED';
  }

  return null;
}

/**
 * Heurística simples para detetar se alguém é "não-desporto mas Web3"
 * quando não envia desporto mas fala muito de Web3 / Apertum / blockchain
 */
function inferNonSportFromMessage(
  sportsCategory: string | null,
  message: string | null
): boolean {
  if (sportsCategory && sportsCategory.trim() !== '') return false;
  if (!message) return false;

  const txt = message.toLowerCase();
  const keywords = ['blockchain', 'web3', 'apertum', 'dao1', 'crypto', 'cripto', 'defi'];

  return keywords.some((k) => txt.includes(k));
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
      message,

      // novos campos opcionais vindos do frontend (quando existirem)
      is_non_sport,
      web3_type,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer_user_id,
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

    const interestsArray: string[] = Array.isArray(interests) ? interests : [];

    // ---- desporto / código ----
    let sportsCategoryValue: string | null =
      typeof sports_category === 'string' && sports_category.trim() !== ''
        ? sports_category.trim()
        : null;

    let sportsCategoryCode: string | null = null;

    if (sportsCategoryValue && !sportsCategoryValue.includes(' ')) {
      // sem espaços → tratamos como código (ex: CLIMBING)
      sportsCategoryCode = sportsCategoryValue;
    }

    // ---- country_code ISO a partir do nome ----
    const countryCode = mapCountryToCode(country);

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

    // ---- heurística para perfis não-desporto / Web3-only ----
    let isNonSport: boolean =
      typeof is_non_sport === 'boolean' ? is_non_sport : false;

    if (!isNonSport) {
      isNonSport = inferNonSportFromMessage(sportsCategoryValue, message);
    }

    let finalWeb3Type: 'PROFESSIONAL_WEB3_LEARNING' | 'WEB3_ENTHUSIAST' | null =
      null;

    if (typeof web3_type === 'string' && web3_type.trim() !== '') {
      const normalized = web3_type.trim().toUpperCase();
      if (
        normalized === 'PROFESSIONAL_WEB3_LEARNING' ||
        normalized === 'WEB3_ENTHUSIAST'
      ) {
        finalWeb3Type = normalized;
      }
    }

    if (isNonSport && !finalWeb3Type) {
      const baseText = `${web3_experience || ''} ${message || ''}`.toLowerCase();
      if (
        baseText.includes('profissional') ||
        baseText.includes('professional') ||
        baseText.includes('consultor') ||
        baseText.includes('agency') ||
        baseText.includes('agência') ||
        baseText.includes('empresa') ||
        baseText.includes('company')
      ) {
        finalWeb3Type = 'PROFESSIONAL_WEB3_LEARNING';
      } else {
        finalWeb3Type = 'WEB3_ENTHUSIAST';
      }
    }

    // ---- IP de origem (se disponível) ----
    const ipFromHeader =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const createdByIp = ipFromHeader || (request as any).ip || null;

    // ---- auto-interesses (tags internas) ----
    const autoInterests = new Set<string>();

    // Tag geral de onboarding
    autoInterests.add('ONBOARDING');

    if (sportsCategoryValue) {
      autoInterests.add('SPORTS_ONBOARDING');
    }
    if (isNonSport) {
      autoInterests.add('NON_SPORT_WEB3');
    }

    const sportTagBase =
      toTagBase(sportsCategoryCode || sportsCategoryValue) || null;
    if (sportTagBase) {
      autoInterests.add(`SPORT_${sportTagBase}`);
    }

    if (countryCode) {
      autoInterests.add(`COUNTRY_${countryCode}`);
    }

    if (linkedUserId) {
      autoInterests.add('HAS_LEGACY_ACCOUNT');
    } else {
      autoInterests.add('NO_LEGACY_ACCOUNT');
    }

    const web3LevelTag = inferWeb3LevelTag(web3_experience || message);
    if (web3LevelTag) {
      autoInterests.add(web3LevelTag);
    }

    // se tivermos subtipo Web3
    if (finalWeb3Type === 'PROFESSIONAL_WEB3_LEARNING') {
      autoInterests.add('WEB3_PRO_LEARNING');
    } else if (finalWeb3Type === 'WEB3_ENTHUSIAST') {
      autoInterests.add('WEB3_ENTHUSIAST_PROFILE');
    }

    // merge interesses enviados + automáticos (sem duplicados)
    const finalInterests = Array.from(
      new Set<string>([
        ...interestsArray.filter((i) => typeof i === 'string'),
        ...Array.from(autoInterests),
      ])
    );

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
        sports_category: sportsCategoryValue,
        sports_category_code: sportsCategoryCode,
        sports_role: sports_role || null,
        organization: organization || null,
        web3_experience: web3_experience || null,
        interests: finalInterests,
        message,
        user_id: linkedUserId, // <-- ligação direta à conta LEGACY (se existir)

        // novos campos
        is_non_sport: isNonSport,
        web3_type: finalWeb3Type,
        created_by_ip: createdByIp,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_content: utm_content || null,
        utm_term: utm_term || null,
        referrer_user_id: referrer_user_id || null,
        // status usa o default 'PENDING_RESPONSE'
      })
      .select('id, sports_category_code, country, country_code, user_id')
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
    };

    // 2) tentar auto-atribuir ao Head of House (não falha a request se não conseguir)
    await autoAssignToHouseHead(
      inserted.id,
      inserted.sports_category_code,
      inserted.country_code || mapCountryToCode(inserted.country)
    );

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
