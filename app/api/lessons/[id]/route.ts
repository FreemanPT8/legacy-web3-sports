// app/api/lessons/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { splitReadMore } from '@/lib/read-more';
import { fetchLessonContext } from '@/lib/lesson-context';
import { buildLessonIdVariants } from '@/lib/lesson-id';
import { getDefaultAuthorName } from '@/lib/education/authorFallback';
import { resolveLessonXpRequirement } from '@/lib/education/xpRequirement';

interface RouteContext {
  params: { id: string };
}

const db = supabaseAdmin ?? supabase;

type IdentityLike = {
  name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  username?: string | null;
};

const pickAuthorName = (
  ...candidates: Array<string | null | undefined>
): string | undefined => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return undefined;
};

const resolveIdentityName = (
  identity?: IdentityLike | string | null,
): string | undefined => {
  if (!identity) return undefined;
  if (typeof identity === 'string') {
    return identity.trim() || undefined;
  }
  return pickAuthorName(
    identity.name,
    identity.full_name,
    identity.display_name,
    identity.username,
  );
};

type CompletionRow = {
  user_id: string | null;
  xp_earned: number | null;
  lesson_id?: string | null;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const { id } = context.params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Missing lesson id in route params' },
      { status: 400 },
    );
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    const { context: lessonContext, error: contextError } =
      await fetchLessonContext(id);

    if (!lessonContext || contextError) {
      console.error('Lesson context error:', contextError);
      return NextResponse.json(
        { success: false, error: contextError || 'Lesson not found' },
        { status: contextError ? 500 : 404 },
      );
    }

    const {
      course: matchedCourse,
      topic: matchedTopic,
      lesson: matchedLesson,
      moduleLessons,
      resolvedAuthorId,
      resolvedXP,
      resolvedEstimatedTime,
    } = lessonContext;

    const authorIds = new Set<string>();
    if (matchedLesson.author_id) authorIds.add(matchedLesson.author_id);
    if (matchedTopic?.author_id) authorIds.add(matchedTopic.author_id);
    if (matchedCourse?.author_id) authorIds.add(matchedCourse.author_id);
    if (resolvedAuthorId) authorIds.add(resolvedAuthorId);

    const authorMap: Record<string, string> = {};

    const defaultAuthorName = getDefaultAuthorName();

    if (authorIds.size > 0) {
      const { data: authors, error: authorsError } = await db
        .from('users')
        .select('id, username, full_name, display_name')
        .in('id', Array.from(authorIds));

      if (authorsError) {
        console.error('Error fetching lesson/module authors:', authorsError);
      } else {
        (authors || []).forEach((author: any) => {
          authorMap[author.id] =
            pickAuthorName(
              author.full_name,
              author.display_name,
              author.username,
            ) || defaultAuthorName;
        });
      }
    }

    const lessonIdVariants = buildLessonIdVariants(id);
    const completionQuery = db
      .from('lesson_completions')
      .select('user_id, xp_earned, lesson_id');

    if (lessonIdVariants.length === 0) {
      completionQuery.eq('lesson_id', id);
    } else if (lessonIdVariants.length === 1) {
      completionQuery.eq('lesson_id', lessonIdVariants[0]);
    } else {
      completionQuery.in('lesson_id', lessonIdVariants);
    }

    const { data: completions, error: completionsError } =
      await completionQuery;

    if (completionsError) {
      console.error(
        'Error fetching lesson completions (non-fatal):',
        completionsError,
      );
    }

    const completionsArray: CompletionRow[] =
      ((completions || []) as CompletionRow[]) || [];

    const completedCount = completionsArray.length;
    const totalXpDistributed = completionsArray.reduce(
      (sum: number, row: CompletionRow) => sum + (row.xp_earned ?? 0),
      0,
    );

    const resolvedAuthorName =
      pickAuthorName(
        resolvedAuthorId ? authorMap[resolvedAuthorId] : undefined,
        resolveIdentityName((matchedLesson as any)?.author),
        resolveIdentityName((matchedTopic as any)?.author),
        resolveIdentityName((matchedCourse as any)?.author),
      ) || defaultAuthorName;

    const rawContent =
      typeof matchedLesson.content === 'string'
        ? matchedLesson.content
        : '';
    const { before: content_preview, hasReadMore: content_has_read_more } =
      splitReadMore(rawContent);

    const isCreator =
      !!userId &&
      !!resolvedAuthorId &&
      resolvedAuthorId === userId;

    const completionIdSet = new Set(
      lessonIdVariants.length > 0 ? lessonIdVariants : [id],
    );

    const isCompleted =
      !!userId &&
      !isCreator &&
      completionsArray.some(
        (c) =>
          c.user_id &&
          c.user_id === userId &&
          (c.lesson_id ? completionIdSet.has(c.lesson_id) : true),
      );

    const lessonXpRequired = resolveLessonXpRequirement(matchedLesson);

    const lesson = {
      id: matchedLesson.id,
      title: matchedLesson.title,
      description: matchedLesson.description,
      content: matchedLesson.content,
      content_preview,
      content_has_read_more,
      xp_reward: resolvedXP,
      xp_required: lessonXpRequired,
      estimated_time: resolvedEstimatedTime,
      order: matchedLesson.order,
      module_id: matchedLesson.module_id,
      author_id: resolvedAuthorId,
      author_name: resolvedAuthorName,
      created_at: matchedLesson.created_at,
    };

    const moduleAuthorName =
      pickAuthorName(
        matchedTopic?.author_id
          ? authorMap[matchedTopic.author_id]
          : undefined,
        resolveIdentityName((matchedTopic as any)?.author),
        matchedCourse?.author_id
          ? authorMap[matchedCourse.author_id]
          : undefined,
        resolveIdentityName((matchedCourse as any)?.author),
      ) || defaultAuthorName;

    const lessonModule = {
      id: matchedTopic?.id,
      title: matchedTopic?.title,
      course_id: matchedCourse.id,
      author_id: matchedTopic?.author_id ?? matchedCourse.author_id ?? null,
      author_name: moduleAuthorName,
      lessons: moduleLessons,
    };

    const stats = {
      completedCount,
      totalXpDistributed,
    };

    return NextResponse.json({
      success: true,
      lesson,
      module: lessonModule,
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
