import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin ?? supabase;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    // 1) Buscar posts publicados + autor base
    const { data: posts, error } = await db
      .from('blog_posts')
      .select(
        `
        *,
        author_user:users!blog_posts_author_id_fkey (
          username
        )
      `,
      )
      .eq('published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching blog posts:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load blog posts' },
        { status: 500 },
      );
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        success: true,
        posts: [],
      });
    }

    const postIds = posts.map((p: any) => p.id).filter(Boolean);

    // 2) Buscar leituras de TODOS os utilizadores para estatísticas globais
    const { data: allReads, error: allReadsError } = await db
      .from('blog_reads')
      .select('blog_post_id, user_id, xp_earned')
      .in('blog_post_id', postIds);

    if (allReadsError) {
      console.error('Error fetching global blog reads:', allReadsError);
    }

    const registeredReadersMap = new Map<string, number>();
    const totalXpMap = new Map<string, number>();

    if (allReads && allReads.length > 0) {
      const readersPerPost: Record<string, Set<string>> = {};

      for (const row of allReads as any[]) {
        const postId = row.blog_post_id as string;
        const userId = row.user_id as string | null;
        const xp = row.xp_earned ?? 0;

        if (!postId) continue;

        // XP total por post
        totalXpMap.set(postId, (totalXpMap.get(postId) ?? 0) + xp);

        // leitores registados únicos por post
        if (userId) {
          if (!readersPerPost[postId]) {
            readersPerPost[postId] = new Set<string>();
          }
          readersPerPost[postId].add(userId);
        }
      }

      for (const [postId, set] of Object.entries(readersPerPost)) {
        registeredReadersMap.set(postId, set.size);
      }
    }

    // 3) Determinar quais posts estão completos para o utilizador autenticado
    let completedSet = new Set<string>();
    if (user && allReads && allReads.length > 0) {
      completedSet = new Set(
        (allReads as any[])
          .filter((r) => r.user_id === user.id)
          .map((r) => r.blog_post_id as string),
      );
    }

    // 4) Normalizar resposta
    const enrichedPosts = posts.map((p: any) => {
      const postId = p.id as string;

      const authorName =
        p.author_user?.username ||
        p.author ||
        'Admin';

      const registeredReaders =
        registeredReadersMap.get(postId) ?? 0;

      const totalXpDistributed =
        totalXpMap.get(postId) ?? 0;

      const isCompleted =
        user &&
        completedSet.has(postId) &&
        !!p.author_id &&
        p.author_id !== user.id
          ? true
          : false;

      return {
        ...p,
        author: authorName,
        registered_readers: registeredReaders,
        total_xp_distributed: totalXpDistributed,
        is_completed: isCompleted,
      };
    });

    return NextResponse.json({
      success: true,
      posts: enrichedPosts,
    });
  } catch (error) {
    console.error('Error in GET /api/blog:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
