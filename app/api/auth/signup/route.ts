import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/lib/auth';
import { sendEmail, getWelcomeEmailTemplate } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase';

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

    // 1) Criar utilizador (fluxo normal)
    const result = await signUp({
      username,
      full_name,
      email,
      password,
      country,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // 2) Se o utilizador foi criado com sucesso, tentar ligar
    //    quaisquer submissões de onboarding anteriores com o mesmo email
    if (result.user) {
      const userId = result.user.id;
      const userEmail = result.user.email;

      if (userEmail) {
        try {
          const { error: linkError } = await supabaseAdmin
            .from('onboarding_submissions')
            .update({ user_id: userId })
            .is('user_id', null) // só linhas ainda sem ligação
            .eq('email', userEmail); // mesmo email usado no signup

          if (linkError) {
            console.error(
              'Failed to backfill onboarding_submissions.user_id:',
              linkError
            );
          }
        } catch (linkErr) {
          console.error(
            'Unexpected error while linking onboarding submissions to user:',
            linkErr
          );
        }
      }

      // 3) Email de boas-vindas (mantemos o que já tinhas)
      try {
        const welcomeEmail = getWelcomeEmailTemplate(
          result.user.username,
          result.user.email
        );
        await sendEmail(welcomeEmail);
      } catch (err) {
        console.error('Failed to send welcome email:', err);
        // não falha o signup se o email der erro
      }
    }

    // 4) Resposta normal para o frontend (AuthContext)
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Signup POST /api/auth/signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
