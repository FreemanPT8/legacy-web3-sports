import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type HouseHeadUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
};

type RouteParams = {
  params: {
    houseId: string;
  };
};

// GET /api/admin/houses/[houseId]/head
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { houseId } = params;

  try {
    // 1) Obter o registo de head para esta house
    const { data: headRow, error: headError } = await supabaseAdmin
      .from('house_heads')
      .select('house_id, admin_id')
      .eq('house_id', houseId)
      .maybeSingle();

    if (headError) {
      console.error('Supabase error loading house_head:', headError);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar Head da House.' },
        { status: 500 }
      );
    }

    if (!headRow) {
      return NextResponse.json(
        { success: true, head:
