import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin ?? supabase;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeModules = searchParams.get('includeModules') === 'true';

    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    // 1) SELECT base, com ou sem módulos + lições
    const selectBase = includeModules
      ? `
        *,
        author_user:users!courses_author_id_fkey (
          username
        ),
        modules:modules (
          *,
          lessons:lessons(*)
        )
      `
      : `
        *,
        author_user:users!courses_author_id_fkey (
          username
        )
      `;

    const { data, error } = await db
      .from('courses')
      .select(selectBase)
      .eq('published', true)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching courses:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load courses' },
        { status: 500 },
      );
    }

    const rawCourses = data || [];

    // 2) Normalizar + calcular stats por curso
    const normalized = rawCourses.map((c: any) => {
      const modules = Array.isArray(c.modules) ? c.modules : [];

      const totalModules = modules.length;
      const totalLessons = modules.reduce((acc: number, m: any) => {
        const lessons = Array.isArray(m.lessons) ? m.lessons : [];
        return acc + lessons.length;
      }, 0);

      const totalXP = modules.reduce((acc: number, m: any) => {
        const lessons = Array.isArray(m.lessons) ? m.lessons : [];
        const sumLessonXP = lessons.reduce(
          (sum: number, l: any) => sum + (l.xp_reward || 0),
          0,
        );
        return acc + sumLessonXP;
      }, 0);

      const authorName =
        c.author_user?.username || c.author || 'Admin';

      const isCreator =
        !!user && !!c.author_id && c.author_id === user.id;

      return {
        ...c,
        modules,
        author_name: authorName,
        total_modules: totalModules,
        total_lessons: totalLessons,
        total_xp: totalXP,
        isCreator,
      };
    });

    return NextResponse.json({
      success: true,
      courses: normalized,
    });
  } catch (error) {
    console.error('Error in GET /api/courses:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
