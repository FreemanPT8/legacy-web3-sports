import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email é obrigatório.' },
        { status: 400 }
      );
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl ?? ''}/reset-password`,
    });

    if (error) {
      console.error('Erro Supabase resetPasswordForEmail:', error);
      return NextResponse.json(
        { success: false, error: 'Não foi possível enviar o email de recuperação.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro inesperado em /api/auth/forgot-password:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
