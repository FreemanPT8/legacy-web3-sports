import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import {
  extractLessonContext,
  fetchCourseXpData,
  resolveMultilingualText,
  type CourseLike,
} from '@/lib/admin/courseXpHelpers';
import { normalizeLessonIdForStorage } from '@/lib/lesson-id';

const db = supabaseAdmin ?? supabase;

const DATE_SORT = (a: string, b: string) =>
  new Date(b).getTime() - new Date(a).getTime();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const courseId = params.id;
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Missing course id' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = Number.parseInt(searchParams.get('limit') || '25', 10);
    const offsetParam = Number.parseInt(searchParams.get('offset') || '0', 10);
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(100, limitParam))
      : 25;
    const offset = Number.isFinite(offsetParam)
      ? Math.max(0, offsetParam)
      : 0;

    const { data: course, error: courseError } = await db
      .from('courses')
      .select('id, title, curriculum')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 },
      );
    }

    const lessonContext = extractLessonContext([course as CourseLike]);
    const xpData = await fetchCourseXpData(
      db,
      [courseId],
      lessonContext.lessonIds,
      lessonContext.lessonToCourse,
    );

    type CombinedEntry = {
      id: string;
      type: 'lesson' | 'course';
      courseId: string;
      xp: number;
      userId: string;
      completedAt: string;
      content: {
        title: string;
        moduleTitle?: string | null;
        typeLabel: string;
      };
    };

    const lessonEntries: CombinedEntry[] = xpData.lessonCompletions
      .map((row) => {
        const normalized =
          normalizeLessonIdForStorage(row.lesson_id) || row.lesson_id;
        const courseForLesson =
          lessonContext.lessonToCourse[row.lesson_id] ||
          lessonContext.lessonToCourse[normalized];
        if (courseForLesson !== courseId) return null;
        const meta =
          lessonContext.lessonMeta[row.lesson_id] ||
          lessonContext.lessonMeta[normalized];
        return {
          id: `lesson-${row.lesson_id}-${row.user_id}-${row.completed_at}`,
          type: 'lesson' as const,
          courseId: courseForLesson,
          xp: Number(row.xp_earned) || 0,
          userId: row.user_id,
          completedAt: row.completed_at,
          content: {
            title: meta?.lessonTitle || 'Lição',
            moduleTitle: meta?.moduleTitle || null,
            typeLabel: 'Lição concluída',
          },
        };
      })
      .filter(Boolean) as CombinedEntry[];

    const courseTitle = resolveMultilingualText(course.title) || 'Curso';
    const courseEntries: CombinedEntry[] = xpData.courseCompletions
      .filter((row) => row.course_id === courseId)
      .map((row) => ({
        id: `course-${row.course_id}-${row.user_id}-${row.completed_at}`,
        type: 'course' as const,
        courseId,
        xp: Number(row.xp_earned) || 0,
        userId: row.user_id,
        completedAt: row.completed_at,
        content: {
          title: courseTitle,
          typeLabel: 'Curso concluído',
        },
      }));

    const combined = [...lessonEntries, ...courseEntries].sort((a, b) =>
      DATE_SORT(a.completedAt, b.completedAt),
    );

    const total = combined.length;
    const window = combined.slice(offset, offset + limit);

    const userIds = Array.from(
      new Set(window.map((item) => item.userId).filter(Boolean)),
    );
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await db
        .from('users')
        .select('id, full_name, username')
        .in('id', userIds);
      userMap =
        users?.reduce((acc: Record<string, string>, u: any) => {
          acc[u.id] = u.full_name || u.username || 'Utilizador';
          return acc;
        }, {}) || {};
    }

    const entries = window.map((item) => ({
      id: item.id,
      type: item.type,
      xp: item.xp,
      completedAt: item.completedAt,
      user: {
        id: item.userId,
        name: userMap[item.userId] || 'Utilizador',
      },
      content: item.content,
    }));

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        title: courseTitle,
      },
      total,
      hasMore: offset + window.length < total,
      entries,
    });
  } catch (error) {
    console.error(
      'Unexpected error in GET /api/admin/courses/[id]/xp-history:',
      error,
    );
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
