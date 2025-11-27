import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 },
      );
    }

    // 1) Buscar completions de lições
    const { data: lessonCompletions, error: lessonsError } = await supabase
      .from('lesson_completions')
      .select('id, lesson_id, xp_earned, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (lessonsError) {
      console.error('Error fetching lesson_completions:', lessonsError);
    }

    // 2) Buscar leituras de blog
    const { data: blogReads, error: blogError } = await supabase
      .from('blog_reads')
      .select('id, blog_post_id, xp_earned, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (blogError) {
      console.error('Error fetching blog_reads:', blogError);
    }

    const lessonHistory =
      (lessonCompletions || []).map((row: any) => ({
        id: row.id,
        action: 'Completed lesson',
        reference_type: 'lesson',
        reference_id: row.lesson_id,
        xp_earned: row.xp_earned,
        created_at: row.created_at,
      })) || [];

    const blogHistory =
      (blogReads || []).map((row: any) => ({
        id: row.id,
        action: 'Read blog article',
        reference_type: 'blog',
        reference_id: row.blog_post_id,
        xp_earned: row.xp_earned,
        created_at: row.created_at,
      })) || [];

    // 3) Juntar tudo, ordenar por data e aplicar limite global
    const combined = [...lessonHistory, ...blogHistory].sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    );

    const sliced = combined.slice(0, limit);

    return NextResponse.json({
      success: true,
      history: sliced,
    });
  } catch (error) {
    console.error('Error in GET /api/xp/history:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
