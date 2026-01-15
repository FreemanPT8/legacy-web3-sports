import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { getCountryCodeFromName } from '@/lib/countries';
import { supabaseAdmin } from '@/lib/supabase';
import { syncUserHouseMembership } from '@/lib/user-houses';

export async function GET(request: NextRequest, { params }: { params: { houseKey: string } }) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const houseKey = (params.houseKey || '').toUpperCase();
  if (!houseKey) {
    return NextResponse.json({ success: false, error: 'Missing house key.' }, { status: 400 });
  }

  try {
    const { data: houseRow, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id, sport_id, country_code')
      .eq('house_key', houseKey)
      .maybeSingle();
    if (houseError) throw houseError;
    if (!houseRow?.id) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }

    const roles = new Set<string>();

    if (user.role === 'Super Admin') {
      roles.add('super-admin');
    }

    const { data: membershipRows, error: membershipError } = await supabaseAdmin
      .from('user_houses')
      .select('membership_role, role')
      .eq('user_id', user.userId)
      .eq('house_id', houseRow.id)
      .is('removed_at', null);
    if (membershipError) throw membershipError;

    (membershipRows ?? []).forEach((row: { membership_role?: string | null; role?: string | null }) => {
      const value = row.membership_role ?? row.role ?? null;
      if (value) roles.add(value);
    });

    if (roles.size === 0) {
      const { data: assignments } = await supabaseAdmin
        .from('admin_assignments')
        .select('id')
        .eq('user_id', user.userId);
      const adminIds = (assignments ?? []).map((row: any) => row.id).filter(Boolean);

      if (adminIds.length) {
        const { data: headRows } = await supabaseAdmin
          .from('house_heads')
          .select('id')
          .eq('house_id', houseRow.id)
          .in('admin_id', adminIds);
        if (headRows && headRows.length > 0) {
          roles.add('head');
        }
      }

      const { data: modRows } = await supabaseAdmin
        .from('house_moderators')
        .select('id')
        .eq('house_id', houseRow.id)
        .eq('user_id', user.userId);
      if (modRows && modRows.length > 0) {
        roles.add('moderator');
      }
    }

    if (roles.size === 0) {
      await syncUserHouseMembership(user.userId, { assignedVia: 'PROFILE', logPrefix: 'houses/membership' });
      const { data: refreshedRows } = await supabaseAdmin
        .from('user_houses')
        .select('membership_role, role')
        .eq('user_id', user.userId)
        .eq('house_id', houseRow.id)
        .is('removed_at', null);
      (refreshedRows ?? []).forEach((row: { membership_role?: string | null; role?: string | null }) => {
        const value = row.membership_role ?? row.role ?? null;
        if (value) roles.add(value);
      });
    }

    if (roles.size === 0) {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('primary_country_code, primary_sport_id, country, sport_id')
        .eq('id', user.userId)
        .maybeSingle();

      let houseSport = houseRow.sport_id ?? null;
      const houseCountryFallback = houseKey.split('_').pop() ?? '';
      const houseCountry = (houseRow.country_code ?? houseCountryFallback ?? '').toUpperCase();
      if (!houseSport) {
        const houseSportCode = houseKey.split('_')[0] ?? '';
        if (houseSportCode) {
          const { data: sportRow } = await supabaseAdmin
            .from('sports')
            .select('id, code')
            .ilike('code', houseSportCode)
            .maybeSingle();
          if (sportRow?.id) {
            houseSport = sportRow.id;
          }
        }
      }
      const userSports = [userRow?.primary_sport_id ?? null, userRow?.sport_id ?? null]
        .filter((value): value is string => Boolean(value));
      let userCountry =
        (userRow?.primary_country_code ?? '') ||
        (getCountryCodeFromName(userRow?.country) ?? '') ||
        '';
      if (!userCountry && userRow?.country) {
        userCountry = userRow.country.trim().slice(0, 2).toUpperCase();
      }
      const hasMatch = Boolean(houseSport && userSports.includes(houseSport) && userCountry.toUpperCase() === houseCountry);

      if (hasMatch) {
        await supabaseAdmin
          .from('user_houses')
          .upsert(
            {
              user_id: user.userId,
              house_id: houseRow.id,
              membership_role: 'MEMBER',
              assigned_via: 'PROFILE',
            },
            { onConflict: 'user_id,house_id,membership_role' },
          );
        roles.add('member');
      }
    }

    return NextResponse.json({ success: true, isMember: roles.size > 0, roles: Array.from(roles) });
  } catch (error) {
    console.error('[houses/membership] failed to load membership', error);
    return NextResponse.json({ success: false, error: 'Failed to load membership.' }, { status: 500 });
  }
}
