import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type ActivityItem = {
  id: string;
  action: string;
  xp_earned: number;
  created_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit') || '20';
    const limit = Number.parseInt(limitParam, 10) || 20;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 },
      );
    }

    // 1) Buscar lesson_completions recentes
    const {
      data: lessonCompletions,
      error: lessonsError,
    } = await supabase
      .from('lesson_completions')
      .select('id, lesson_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (lessonsError) {
      console.error('Error fetching lesson_completions:', lessonsError);
    }

    // 2) Buscar blog_reads recentes
    const {
      data: blogReads,
      error: blogError,
    } = await supabase
      .from('blog_reads')
      .select('id, blog_post_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (blogError) {
      console.error('Error fetching blog_reads:', blogError);
    }

    const safeLessonCompletions = lessonCompletions || [];
    const safeBlogReads = blogReads || [];

    // 3) Buscar xp_reward das lessons envolvidas
    const lessonIds = Array.from(
      new Set(
        safeLessonCompletions
          .map((lc: any) => lc.lesson_id)
          .filter(Boolean),
      ),
    );

    let lessonsMap = new Map<string, number>();

    if (lessonIds.length > 0) {
      const { data: lessonsData, error: lessonsFetchError } =
        await supabase
          .from('lessons')
          .select('id, xp_reward')
          .in('id', lessonIds);

      if (lessonsFetchError) {
        console.error('Error fetching lessons for XP history:', lessonsFetchError);
      } else if (lessonsData) {
        lessonsMap = new Map(
          lessonsData.map((l: any) => [l.id, l.xp_reward ?? 0]),
        );
      }
    }

    // 4) Buscar xp_reward dos blog posts envolvidos
    const blogIds = Array.from(
      new Set(
        safeBlogReads
          .map((br: any) => br.blog_post_id)
          .filter(Boolean),
      ),
    );

    let blogsMap = new Map<string, number>();

    if (blogIds.length > 0) {
      const { data: blogsData, error: blogsFetchError } =
        await supabase
          .from('blog_posts')
          .select('id, xp_reward')
          .in('id', blogIds);

      if (blogsFetchError) {
        console.error('Error fetching blog_posts for XP history:', blogsFetchError);
      } else if (blogsData) {
        blogsMap = new Map(
          blogsData.map((b: any) => [b.id, b.xp_reward ?? 0]),
        );
      }
    }

    // 5) Normalizar em ActivityItem[]
    const lessonActivities: ActivityItem[] = safeLessonCompletions.map(
      (lc: any) => ({
        id: `lesson:${lc.id}`,
        action: 'Lesson completed',
        xp_earned: lessonsMap.get(lc.lesson_id) ?? 0,
        created_at: lc.created_at,
      }),
    );

    const blogActivities: ActivityItem[] = safeBlogReads.map(
      (br: any) => ({
        id: `blog:${br.id}`,
        action: 'Blog article read',
        xp_earned: blogsMap.get(br.blog_post_id) ?? 0,
        created_at: br.created_at,
      }),
    );

    // 6) Juntar, ordenar por data desc e limitar
    const allActivities = [...lessonActivities, ...blogActivities];

    allActivities.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return db - da;
    });

    const limited = allActivities.slice(0, limit);

    return NextResponse.json({
      success: true,
      history: limited,
    });
  } catch (error) {
    console.error('Error in GET /api/xp/history:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
