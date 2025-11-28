import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    // 1) Buscar lição (inclui author_id)
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', params.id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 },
      );
    }

    // 2) Buscar módulo + todas as lições do módulo (para prev/next)
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select(
        `
        *,
        lessons:lessons(*)
      `,
      )
      .eq('id', lesson.module_id)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { success: false, error: 'Module not found' },
        { status: 404 },
      );
    }

    // 3) Ver se a lição já foi concluída pelo utilizador (apenas se NÃO for criador)
    const isCreator =
      !!user &&
      !!lesson.author_id &&
      lesson.author_id === user.id;

    let isCompleted = false;

    if (user && !isCreator) {
      const { data: completion, error: completionError } =
        await supabase
          .from('lesson_completions')
          .select('id')
          .eq('user_id', user.id)
          .eq('lesson_id', params.id)
          .maybeSingle();

      if (!completionError && completion) {
        isCompleted = true;
      }
    }

    return NextResponse.json({
      success: true,
      lesson,
      module,
      isCompleted,
      isCreator,
    });
  } catch (error) {
    console.error('Error in GET /api/lessons/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
