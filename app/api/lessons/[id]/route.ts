import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

interface RouteContext {
  params: { id: string };
}

const db = supabaseAdmin ?? supabase;

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const { id } = context.params;

  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;
    const isAdminUser =
      !!user &&
      (user.role === 'Super Admin' || user.role === 'Admin');

    // 1) Buscar lição + módulo
    const { data: lesson, error: lessonError } = await db
      .from('lessons')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (lessonError) {
      console.error('Error fetching lesson:', lessonError);
      return NextResponse.json(
        { success: false, error: 'Failed to load lesson' },
        { status: 500 },
      );
    }

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 },
      );
    }

    const { data: module, error: moduleError } = await db
      .from('modules')
      .select('*')
      .eq('id', lesson.module_id)
      .maybeSingle();

    if (moduleError) {
      console.error('Error fetching module:', moduleError);
      return NextResponse.json(
        { success: false, error: 'Failed to load module' },
        { status: 500 },
      );
    }

    // 2) Estatísticas de completions
    const { data: completions, error: compError } = await db
      .from('lesson_completions')
      .select('lesson_id, user_id, xp_earned')
      .eq('lesson_id', id);

    if (compError) {
      console.error(
        'Error fetching lesson completions:',
        compError,
      );
    }

    const completionsArray: { user_id: string; xp_earned?: number | null }[] =
      completions || [];

    const completedCount = completionsArray.length;
    const totalXpDistributed = completionsArray.reduce(
      (sum: number, row: { xp_earned?: number | null }) =>
        sum + (row.xp_earned ?? 0),
      0,
    );

    // 3) Flags de autor e completed para este user
    const isCreator =
      !!user &&
      ((lesson.author_id && lesson.author_id === user.id) ||
        (!lesson.author_id && isAdminUser));

    const isCompleted =
      !!user &&
      !isCreator &&
      completionsArray.some((c) => c.user_id === user.id);

    // 4) Nome do criador
    let authorName: string | null = null;
    if (lesson.author_id) {
      const { data: author, error: authorError } = await db
        .from('users')
        .select('username')
        .eq('id', lesson.author_id)
        .maybeSingle();

      if (authorError) {
        console.error('Error fetching author user:', authorError);
      } else if (author?.username) {
        authorName = author.username;
      }
    }

    if (!authorName) {
      if (isCreator && user) {
        authorName = user.username;
      } else if (lesson.author) {
        authorName = lesson.author;
      } else {
        authorName = 'Admin';
      }
    }

    const enrichedLesson = {
      ...lesson,
      author_name: authorName,
    };

    const stats = {
      completedCount,
      totalXpDistributed,
    };

    return NextResponse.json({
      success: true,
      lesson: enrichedLesson,
      module,
      isCompleted,
      isCreator,
      stats,
    });
  } catch (error) {
    console.error('Error in GET /api/lessons/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
