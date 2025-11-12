import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'global';
    const country = searchParams.get('country');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (type === 'global') {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, country, xp_total, created_at')
        .order('xp_total', { ascending: false })
        .limit(limit);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, leaderboard: data });
    }

    if (type === 'country') {
      const { data: countries, error: countriesError } = await supabase
        .from('users')
        .select('country, xp_total');

      if (countriesError) {
        return NextResponse.json(
          { success: false, error: countriesError.message },
          { status: 500 }
        );
      }

      const countryTotals = countries.reduce((acc: any, user: any) => {
        if (!acc[user.country]) {
          acc[user.country] = { country: user.country, totalXP: 0, memberCount: 0 };
        }
        acc[user.country].totalXP += user.xp_total;
        acc[user.country].memberCount += 1;
        return acc;
      }, {});

      const leaderboard = Object.values(countryTotals)
        .sort((a: any, b: any) => b.totalXP - a.totalXP)
        .slice(0, limit);

      return NextResponse.json({ success: true, leaderboard });
    }

    if (type === 'national' && country) {
      const { data: countryUsers, error: countError } = await supabase
        .from('users')
        .select('id')
        .eq('country', country)
        .gte('xp_total', 99);

      if (countError) {
        return NextResponse.json(
          { success: false, error: countError.message },
          { status: 500 }
        );
      }

      if (countryUsers.length < 50) {
        return NextResponse.json({
          success: false,
          error: 'National competition not unlocked',
          required: 50,
          current: countryUsers.length
        });
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, username, country, xp_total, created_at')
        .eq('country', country)
        .order('xp_total', { ascending: false })
        .limit(limit);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, leaderboard: data });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid leaderboard type' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
