import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { count: totalOnboardingCompleted } = await supabase
      .from('onboarding_responses')
      .select('*', { count: 'exact', head: true });

    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const activeHouses: any[] = [];

    const upcomingHouses = [
      'Swimming',
      'Football',
      'Basketball',
      'Tennis',
      'Athletics',
      'Cycling',
      'Gymnastics',
      'Martial Arts',
    ];

    return NextResponse.json({
      success: true,
      stats: {
        totalOnboardingCompleted: totalOnboardingCompleted || 0,
        totalMembers: totalUsers || 0,
        activeHousesCount: 0,
        upcomingHousesCount: upcomingHouses.length,
      },
      activeHouses,
      upcomingHouses,
    });
  } catch (error) {
    console.error('Sports stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
