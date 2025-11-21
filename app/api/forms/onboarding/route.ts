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

    const interestsArray: string[] = Array.isArray(interests)
      ? interests
      : [];

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
        interests: interestsArray,
        message,
        user_id: linkedUserId, // <-- ligação direta à conta LEGACY (se existir)
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
