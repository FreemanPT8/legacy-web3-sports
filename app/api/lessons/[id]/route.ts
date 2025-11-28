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

    // 1) Buscar lição
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

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
      .maybeSingle();

    if (moduleError || !module) {
      return NextResponse.json(
        { success: false, error: 'Module not found' },
        { status: 404 },
      );
    }

    // 3) Ver se o user é o autor da lição
    const isAuthor =
      !!user && !!lesson.author_id && lesson.author_id === user.id;

    // 4) Ver se a lição já foi concluída por ESTE utilizador
    //    Se for autor, ignoramos completions (criador nunca "completa" a própria lição)
    let isCompleted = false;

    if (user && !isAuthor) {
      const { data: completion, error: completionError } = await supabase
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
      isAuthor,
    });
  } catch (error) {
    console.error('Error in GET /api/lessons/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
