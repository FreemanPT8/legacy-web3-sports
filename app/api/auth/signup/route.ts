import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/lib/auth';
import { sendEmail, getWelcomeEmailTemplate } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, full_name, email, password, country } = body;

    if (!username || !full_name || !email || !password || !country) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    const result = await signUp({ username, full_name, email, password, country });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    if (result.user) {
      const welcomeEmail = getWelcomeEmailTemplate(result.user.username, result.user.email);
      await sendEmail(welcomeEmail).catch(err => {
        console.error('Failed to send welcome email:', err);
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
