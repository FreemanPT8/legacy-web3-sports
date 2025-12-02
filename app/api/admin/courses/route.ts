import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  // 1) Verificar se é Admin / Super Admin
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const { searchParams } = new URL(request.url);

    // Se no futuro quisermos: ?includeModules=true ou ?published=true
    const includeModules = searchParams.get('includeModules') === 'true';
    const onlyPublished = searchParams.get('published') === 'true';

    const selectClause = includeModules
      ? `
        *,
        modules:modules(
          *,
          lessons:lessons(*)
        )
      `
      : '*';

    let query = supabase
      .from('courses')
      .select(selectClause)
      .order('order', { ascending: true });

    if (onlyPublished) {
      query = query.eq('published', true);
    }

    const { data: courses, error } = await query;

    if (error) {
      console.error('Error loading admin courses:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const ids = (courses || []).map((c: any) => c.id).filter(Boolean);
    const authorIds = (courses || [])
      .map((c: any) => c.author_id)
      .filter(Boolean);

    const courseAuthorMap: Record<string, string> = {};
    (courses || []).forEach((c: any) => {
      if (c.id && c.author_id) {
        courseAuthorMap[c.id] = c.author_id;
      }
    });

    let xpMap: Record<string, number> = {};
    let xpCreatorMap: Record<string, number> = {};
    let authorMap: Record<string, string> = {};

    if (ids.length > 0) {
      const { data: xpRows, error: xpError } = await supabase
        .from('course_total_xp_distributed')
        .select('course_id, total_xp_distributed')
        .in('course_id', ids);
      if (xpError) {
        console.error('Error loading course_total_xp_distributed:', xpError);
      } else {
        xpMap =
          xpRows?.reduce((acc: Record<string, number>, row: any) => {
            acc[row.course_id] = row.total_xp_distributed || 0;
            return acc;
          }, {}) || {};
      }

      const { data: xpCreatorRows, error: xpCreatorError } = await supabase
        .from('xp_transactions')
        .select('reference_id, xp_earned, user_id')
        .eq('reference_type', 'course')
        .in('reference_id', ids);
      if (xpCreatorError) {
        console.error('Error loading xp_transactions for courses:', xpCreatorError);
      } else {
        xpCreatorMap =
          xpCreatorRows?.reduce((acc: Record<string, number>, row: any) => {
            if (!row.reference_id || !row.user_id) return acc;
            const authorId = courseAuthorMap[row.reference_id];
            if (authorId && row.user_id === authorId) {
              acc[row.reference_id] = (acc[row.reference_id] || 0) + (row.xp_earned || 0);
            }
            return acc;
          }, {}) || {};
      }
    }

    if (authorIds.length > 0) {
      const { data: authors, error: authorError } = await supabase
        .from('users')
        .select('id, full_name, username')
        .in('id', authorIds);
      if (authorError) {
        console.error('Error loading course authors:', authorError);
      } else {
        authorMap =
          authors?.reduce((acc: Record<string, string>, a: any) => {
            acc[a.id] = a.full_name || a.username || '';
            return acc;
          }, {}) || {};
      }
    }

    const enriched =
      courses?.map((c: any) => ({
        ...c,
        author_name: c.author_id ? authorMap[c.author_id] || null : null,
        xp_total_distributed: xpMap[c.id] || 0,
        xp_creator_distributed:
          c.author_id && xpCreatorMap[c.id] ? xpCreatorMap[c.id] : 0,
      })) || [];

    return NextResponse.json({
      success: true,
      courses: enriched,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/courses:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
