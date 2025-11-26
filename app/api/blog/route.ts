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

    // 2) Se não há user autenticado → devolve posts tal como estão
    if (!user) {
      return NextResponse.json({
        success: true,
        posts,
      });
    }

    // 3) Buscar leituras/conclusões do user
    const postIds = posts.map((p: any) => p.id).filter(Boolean);

    const { data: reads, error: readsError } = await supabase
      .from('blog_reads')
      .select('blog_post_id')
      .eq('user_id', user.id)
      .in('blog_post_id', postIds);

    if (readsError) {
      console.error('Error fetching blog reads:', readsError);
      // Mesmo com erro, devolvemos posts sem flag de completado
      return NextResponse.json({
        success: true,
        posts,
      });
    }

    const completedSet = new Set(
      (reads || []).map((r: any) => r.blog_post_id),
    );

    const enrichedPosts = posts.map((p: any) => ({
      ...p,
      is_completed: completedSet.has(p.id),
    }));

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
