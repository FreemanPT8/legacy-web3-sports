import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';

type HouseStatus = 'development' | 'under_construction' | 'active';

type RouteParams = {
  params: {
    houseId: string;
  };
};

interface HouseRow {
  id: string;
  name: string | null;
  sport_id: string | null;
  country_code: string | null;
  status: HouseStatus | null;
  avatar_url: string | null;
  description: string | null;
  created_at: string | null;
}

interface SportRow {
  id: string;
  code: string | null;
  name: string | null;
}

interface AdminAssignmentRow {
  id: string;
  user_id: string;
}

interface UserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
}

interface HousePublicDTO {
  id: string;
  name: string;
  sport_name: string | null;
  sport_code: string | null;
  country_code: string;
  status: HouseStatus;
  avatar_url: string | null;
  description: string | null;
  created_at: string | null;
}

interface PublicUserDTO {
  id: string;
  username: string | null;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
}

interface HousePublicResponse {
  success: boolean;
  error?: string;
  house?: HousePublicDTO;
  head?: PublicUserDTO | null;
  moderators?: PublicUserDTO[];
}

// GET /api/sports/houses/[houseId]
// Public endpoint: returns info for the public House page
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { houseId } = params;
  const client = supabaseAdmin ?? supabase; // fallback if service role is missing

  try {
    // 1) Load House
    const { data: houseRow, error: houseError } = await client
      .from('houses_of_sports')
      .select(
        'id, name, sport_id, country_code, status, avatar_url, description, created_at'
      )
      .eq('id', houseId)
      .maybeSingle();

    if (houseError) {
      console.error('Supabase error loading house in public API:', houseError);
      return NextResponse.json<HousePublicResponse>(
        { success: false, error: 'Error loading House of Sports.' },
        { status: 500 }
      );
    }

    if (!houseRow) {
      return NextResponse.json<HousePublicResponse>(
        { success: false, error: 'House not found.' },
        { status: 404 }
      );
    }

    const house = houseRow as HouseRow;

    // 2) Load Sport
    let sport: SportRow | null = null;
    if (house.sport_id) {
      const { data: sportRow, error: sportError } = await client
        .from('sports')
        .select('id, code, name')
        .eq('id', house.sport_id)
        .maybeSingle();

      if (sportError) {
        console.error('Supabase error loading sport for public House:', sportError);
      } else if (sportRow) {
        sport = sportRow as SportRow;
      }
    }

    // 3) Load Head of House
    let headUser: PublicUserDTO | null = null;

    const { data: headRow, error: headError } = await client
      .from('house_heads')
      .select('house_id, admin_id')
      .eq('house_id', houseId)
      .maybeSingle();

    if (headError) {
      console.error('Supabase error loading house_head in public API:', headError);
    } else if (headRow) {
      const { data: adminAssign, error: adminError } = await client
        .from('admin_assignments')
        .select('id, user_id')
        .eq('id', (headRow as any).admin_id)
        .maybeSingle();

      if (adminError) {
        console.error(
          'Supabase error loading admin_assignment for head in public API:',
          adminError
        );
      } else if (adminAssign) {
        const { data: user, error: userError } = await client
          .from('users')
          .select('id, username, full_name, role, avatar_url')
          .eq('id', (adminAssign as AdminAssignmentRow).user_id)
          .maybeSingle();

        if (userError) {
          console.error(
            'Supabase error loading head user for public House:',
            userError
          );
        } else if (user) {
          const u = user as UserRow;
          headUser = {
            id: u.id,
            username: u.username,
            full_name: u.full_name,
            role: u.role,
            avatar_url: u.avatar_url,
          };
        }
      }
    }

    // 4) Load moderators
    const { data: modsRows, error: modsError } = await client
      .from('house_moderators')
      .select('house_id, user_id')
      .eq('house_id', houseId);

    let moderators: PublicUserDTO[] = [];

    if (modsError) {
      console.error(
        'Supabase error loading moderators in public House API:',
        modsError
      );
    } else if (modsRows && modsRows.length > 0) {
      const userIds = Array.from(new Set(modsRows.map((m: any) => m.user_id)));

      const { data: usersData, error: usersError } = await client
        .from('users')
        .select('id, username, full_name, role, avatar_url')
        .in('id', userIds);

      if (usersError) {
        console.error(
          'Supabase error loading moderator users in public House API:',
          usersError
        );
      } else {
        const users = (usersData ?? []) as UserRow[];
        moderators = users.map((u) => ({
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          role: u.role,
          avatar_url: u.avatar_url,
        }));
      }
    }

    const dto: HousePublicDTO = {
      id: house.id,
      name: house.name || 'Unnamed House',
      sport_name: sport?.name ?? null,
      sport_code: sport?.code ?? null,
      country_code: house.country_code ?? '',
      status: (house.status as HouseStatus) ?? 'development',
      avatar_url: house.avatar_url ?? null,
      description: house.description ?? null,
      created_at: house.created_at ?? null,
    };

    return NextResponse.json<HousePublicResponse>(
      {
        success: true,
        house: dto,
        head: headUser,
        moderators,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Unexpected error in GET /api/sports/houses/[houseId]:', err);
    return NextResponse.json<HousePublicResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
