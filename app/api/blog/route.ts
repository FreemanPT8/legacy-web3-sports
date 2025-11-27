import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    // 1) Buscar posts publicados
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('*')
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

    // 2) Autores
    const authorIds = Array.from(
      new Set(
        posts
          .map((p: any) => p.author_id)
          .filter((id: string | null) => !!id),
      ),
    );

    let authorMap = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: authors, error: authorsError } = await supabase
        .from('users')
        .select('id, username')
        .in('id', authorIds);

      if (!authorsError && authors) {
        authorMap = new Map(
          authors.map((a: any) => [a.id, a.username]),
        );
      }
    }

    // 3) Leituras (para stats + completed)
    const { data: reads, error: readsError } = await supabase
      .from('blog_reads')
      .select('blog_post_id, user_id, xp_earned')
      .in('blog_post_id', postIds);

    if (readsError) {
      console.error('Error fetching blog reads:', readsError);
      // devolve sem stats/is_completed
      const basicPosts = posts.map((p: any) => ({
        ...p,
        author: authorMap.get(p.author_id) || 'Admin',
      }));
      return NextResponse.json({
        success: true,
        posts: basicPosts,
      });
    }

    const statsByPost = new Map<
      string,
      { totalXp: number; users: Set<string> }
    >();

    (reads || []).forEach((r: any) => {
      const id = r.blog_post_id;
      if (!statsByPost.has(id)) {
        statsByPost.set(id, { totalXp: 0, users: new Set() });
      }
      const entry = statsByPost.get(id)!;
      entry.totalXp += r.xp_earned || 0;
      if (r.user_id) {
        entry.users.add(r.user_id);
      }
    });

    const completedSet = new Set<string>();
    if (user && reads) {
      reads.forEach((r: any) => {
        if (r.user_id === user.id) {
          completedSet.add(r.blog_post_id);
        }
      });
    }

    const enrichedPosts = posts.map((p: any) => {
      const stats = statsByPost.get(p.id);
      return {
        ...p,
        author: authorMap.get(p.author_id) || 'Admin',
        is_completed: completedSet.has(p.id),
        total_xp_given: stats ? stats.totalXp : 0,
        total_consumers: stats ? stats.users.size : 0,
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
