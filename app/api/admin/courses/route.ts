import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  // 1) Verificar se é Admin / Super Admin
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeOnlyPublished = searchParams.get('published') === 'true';

    let query = supabase
      .from('courses')
      .select(
        `
        *,
        modules:modules(
          *,
          lessons:lessons(*)
        )
      `,
      )
      .order('order', { ascending: true });

    if (includeOnlyPublished) {
      query = query.eq('published', true);
    }

    const { data: courses, error } = await query;

    if (error) {
      console.error('Error loading admin courses:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      courses: courses || [],
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/courses:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
