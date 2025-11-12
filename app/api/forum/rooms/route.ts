import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data: rooms, error } = await supabase
      .from('forum_rooms')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching forum rooms:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch forum rooms' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      rooms: rooms || []
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
