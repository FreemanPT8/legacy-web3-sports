import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Se quiseres no futuro, podes passar ?includeModules=true
    const includeModules = searchParams.get('includeModules') === 'true';

    const selectString = includeModules
      ? `
        *,
        modules:modules(
          *,
          lessons:lessons(*)
        )
      `
      : `*`;

    let query = supabase
      .from('courses')
      .select(selectString)
      .eq('published', true) // só cursos publicados
      .order('order', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error loading public courses:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      courses: data || [],
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/courses:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
