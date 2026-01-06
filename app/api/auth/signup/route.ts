import { NextRequest, NextResponse } from 'next/server';

import { signUp } from '@/lib/auth';
import { sendEmail, getWelcomeEmailTemplate } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, full_name, email, password, country, sport_id } = body;

    if (!username || !full_name || !email || !password || !country || !sport_id) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 },
      );
    }

    const result = await signUp({
      username,
      full_name,
      email,
      password,
      country,
      sport_id,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    if (result.user) {
      const userId = result.user.id;
      const userEmail = result.user.email;

      if (userEmail) {
        try {
          const payload: Record<string, unknown> = { user_id: userId, sport_id };
          const { error: linkError } = await supabaseAdmin
            .from('onboarding_submissions')
            .update(payload)
            .is('user_id', null)
            .eq('email', userEmail);

          if (linkError) {
            console.error('Failed to backfill onboarding_submissions.user_id:', linkError);
          }
        } catch (linkErr) {
          console.error('Unexpected error while linking onboarding submissions to user:', linkErr);
        }
      }

      try {
        const welcomeEmail = getWelcomeEmailTemplate(result.user.username, result.user.email);
        await sendEmail(welcomeEmail);
      } catch (err) {
        console.error('Failed to send welcome email:', err);
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Signup POST /api/auth/signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
