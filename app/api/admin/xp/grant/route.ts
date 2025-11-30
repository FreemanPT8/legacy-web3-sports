// app/api/admin/xp/grant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth, isSuperAdmin } from '@/lib/auth';

const db = supabaseAdmin ?? supabase;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    // Só Admin / Super Admin
    if (
      !user ||
      (
        !isSuperAdmin(user) &&
        user.role !== 'Admin'
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const userId: string | undefined = body.userId;
    const xpAmountRaw: number | string | undefined = body.xpAmount;
    const reasonRaw: string | undefined = body.reason;

    const xpAmount = Number(xpAmountRaw);
    const reason =
      (reasonRaw || '').trim() || 'Manual XP grant';

    if (!userId || !userId.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId é obrigatório',
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(xpAmount) || xpAmount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'xpAmount deve ser um número diferente de zero',
        },
        { status: 400 },
      );
    }

    // 1) Verificar se o utilizador alvo existe
    const { data: targetUser, error: userError } = await db
      .from('users')
      .select('id, xp_total')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching target user:', userError);
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao carregar utilizador alvo',
        },
        { status: 500 },
      );
    }

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Utilizador alvo não encontrado',
        },
        { status: 404 },
      );
    }

    // 2) Atualizar xp_total
    const newXpTotal = Number(targetUser.xp_total || 0) + xpAmount;

    const { error: updateError } = await db
      .from('users')
      .update({ xp_total: newXpTotal })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user XP:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao atualizar XP do utilizador',
        },
        { status: 500 },
      );
    }

    // 3) Registar transação de XP
    const { error: txError } = await db
      .from('xp_transactions')
      .insert({
        user_id: userId,
        action: reason,
        xp_earned: xpAmount,
        reference_id: null,
        reference_type: 'manual_admin_grant',
      });

    if (txError) {
      console.error('Error inserting xp_transactions:', txError);
      // Não fazemos rollback do XP aqui — mas registamos o erro
    }

    return NextResponse.json(
      {
        success: true,
        message: 'XP atribuído com sucesso',
        userId,
        xpAmount,
        newXpTotal,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in POST /api/admin/xp/grant:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
