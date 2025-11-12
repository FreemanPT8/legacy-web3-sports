import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('showAll') === 'true';
    const userId = searchParams.get('userId');

    let query = supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (!showAll) {
      query = query.eq('published', true);
    } else if (userId) {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin')) {
        query = query.eq('published', true);
      }
    }

    const { data: events, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      events: events || [],
    });
  } catch (error) {
    console.error('Events fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, description, category, date, location, isOnline, maxAttendees, registrationUrl, imageUrl, published } = body;

    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        title,
        description,
        category,
        date,
        location,
        is_online: isOnline,
        max_attendees: maxAttendees,
        registration_url: registrationUrl,
        image_url: imageUrl,
        published,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Event create error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
