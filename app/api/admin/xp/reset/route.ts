import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin;

/**
 * POST /api/admin/xp/reset
 *
 * Fase de testes:
 * - só "freemanpt" com role Super Admin pode executar
 * - chama a função SQL reset_all_xp_for_tests()
 */
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin client não disponível.' },
        { status: 500 },
      );
    }

    // 1) Autenticação
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado.' },
        { status: 401 },
      );
    }

    const user = await verifyAuth(authHeader);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Sessão inválida.' },
        { status: 401 },
      );
    }

    // 2) Permissões (fase de testes)
    const isAllowed =
      (user.role === 'Super Admin' || user.role === 'Admin') &&
      user.username === 'freemanpt';

    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Acesso negado. Apenas o utilizador "freemanpt" pode executar o reset global de XP.',
        },
        { status: 403 },
      );
    }

    // 3) Chamar função SQL
    const { error } = await db.rpc('reset_all_xp_for_tests');

    if (error) {
      console.error('Erro ao executar reset_all_xp_for_tests:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Falha ao executar o reset global de XP.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Reset global de XP concluído com sucesso. Todas as métricas de XP foram limpas.',
    });
  } catch (err) {
    console.error('Erro inesperado em POST /api/admin/xp/reset:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor.' },
      { status: 500 },
    );
  }
}
