import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth, isSuperAdmin } from '@/lib/auth';

// Usamos sempre o client admin quando existir (produção)
const db = supabaseAdmin ?? supabase;

export async function POST(request: NextRequest) {
  try {
    // 1) Verificar utilizador autenticado e role
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 },
      );
    }

    const results: string[] = [];

    // 2) Apagar transações de XP
    const { error: txError } = await db
      .from('xp_transactions')
      .delete()
      .gt('created_at', '1900-01-01');

    if (txError) {
      console.error('Error wiping xp_transactions:', txError);
      results.push(`xp_transactions: ${txError.message}`);
    } else {
      results.push('xp_transactions cleared');
    }

    // 3) Apagar completions de lições
    const { error: lessonsError } = await db
      .from('lesson_completions')
      .delete()
      .gt('created_at', '1900-01-01');

    if (lessonsError) {
      console.error('Error wiping lesson_completions:', lessonsError);
      results.push(`lesson_completions: ${lessonsError.message}`);
    } else {
      results.push('lesson_completions cleared');
    }

    // 4) Apagar leituras de blog
    const { error: blogError } = await db
      .from('blog_reads')
      .delete()
      .gt('created_at', '1900-01-01');

    if (blogError) {
      console.error('Error wiping blog_reads:', blogError);
      results.push(`blog_reads: ${blogError.message}`);
    } else {
      results.push('blog_reads cleared');
    }

    // 5) Apagar limites diários de XP
    const { error: dailyError } = await db
      .from('xp_daily_limits')
      .delete()
      .gt('date', '1900-01-01');

    if (dailyError) {
      console.error('Error wiping xp_daily_limits:', dailyError);
      results.push(`xp_daily_limits: ${dailyError.message}`);
    } else {
      results.push('xp_daily_limits cleared');
    }

    // 6) Reset a todos os utilizadores (xp_total, streak, profile_unlocked)
    const { error: usersError } = await db
      .from('users')
      .update({
        xp_total: 0,
        streak_count: 0,
        streak_updated_at: null,
        profile_unlocked: false,
      })
      .not('id', 'is', null); // condição “sempre verdadeira” segura

    if (usersError) {
      console.error('Error resetting users XP:', usersError);
      results.push(`users: ${usersError.message}`);
    } else {
      results.push('users xp_total/streak/profile_unlocked reset');
    }

    const hasErrors = results.some((r) => r.includes(': '));

    return NextResponse.json(
      {
        success: !hasErrors,
        results,
      },
      { status: hasErrors ? 500 : 200 },
    );
  } catch (error) {
    console.error('Error in POST /api/admin/xp/reset:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
