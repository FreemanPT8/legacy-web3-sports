// app/api/admin/xp/grant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin ?? supabase;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    // Só Admin / Super Admin
    if (
      !user ||
      (user.role !== 'Super Admin' && user.role !== 'Admin')
    ) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { userId, xpAmount, reason } = body as {
      userId?: string;
      xpAmount?: number | string;
      reason?: string;
    };

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 },
      );
    }

    const parsedAmount = Number(xpAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'xpAmount must be a non-zero number',
        },
        { status: 400 },
      );
    }

    const amount = Math.trunc(parsedAmount); // garante inteiro

    // 1) Buscar utilizador alvo
    const { data: targetUser, error: userError } = await db
      .from('users')
      .select('id, username, xp_total')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching target user:', userError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user' },
        { status: 500 },
      );
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    const currentXp = Number(targetUser.xp_total || 0);
    const newXpTotal = Math.max(0, currentXp + amount);

    // 2) Atualizar xp_total do utilizador
    const { error: updateError } = await db
      .from('users')
      .update({ xp_total: newXpTotal })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user xp_total:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update user XP' },
        { status: 500 },
      );
    }

    // 3) Registar transação de XP
    const actionText =
      reason && String(reason).trim().length > 0
        ? String(reason).trim()
        : 'Manual XP adjustment';

    const { error: txError } = await db.from('xp_transactions').insert({
      user_id: userId,
      action: actionText,
      xp_earned: amount,
      reference_id: null,
      reference_type: 'manual',
    });

    if (txError) {
      console.error('Error inserting xp_transactions:', txError);
      // não voltamos atrás no xp_total, apenas sinalizamos
      return NextResponse.json(
        {
          success: false,
          error: 'XP updated but failed to log transaction',
          newXpTotal,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'XP updated successfully',
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
