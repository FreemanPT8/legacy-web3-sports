import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
      message
    } = body;

    if (!email || !full_name || !country) {
      return NextResponse.json(
        { success: false, error: 'Email, full name, and country are required' },
        { status: 400 }
      );
    }

    if (!message || message.length < 8 || message.length > 8888) {
      return NextResponse.json(
        { success: false, error: 'Message must be between 8 and 8888 characters' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('onboarding_submissions')
      .insert({
        email,
        phone: phone || null,
        telegram: telegram || null,
        full_name,
        country,
        sports_category: sports_category || null,
        sports_role: sports_role || null,
        organization: organization || null,
        web3_experience: web3_experience || null,
        interests: interests || [],
        message,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, submission: data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('onboarding_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, submissions: data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
