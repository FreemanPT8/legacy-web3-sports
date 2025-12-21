// app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { splitReadMore } from '@/lib/read-more';
import {
  buildLessonIdVariants,
  normalizeLessonIdForStorage,
} from '@/lib/lesson-id';

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

    // 1) Curso
    const { data: rawCourse, error: courseError } = await db
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (courseError) {
      console.error('Error fetching course:', courseError);
      return NextResponse.json(
        { success: false, error: 'Failed to load course' },
        { status: 500 },
      );
    }

    if (!rawCourse) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 },
      );
    }

    const { data: legacyModules, error: legacyModulesError } = await db
      .from('modules')
      .select('xp_reward')
      .eq('course_id', id);

    if (legacyModulesError) {
      console.error(
        'Error fetching legacy module rewards for course detail:',
        legacyModulesError,
      );
    }

    const legacyModuleBonus = (legacyModules || []).reduce(
      (sum: number, moduleRow: any) =>
        sum +
        (typeof moduleRow?.xp_reward === 'number'
          ? moduleRow.xp_reward
          : 0),
      0,
    );

    // 2) Curriculum (tópicos -> lessons)
    const curriculumTopics: any[] = Array.isArray(
      rawCourse.curriculum?.topics,
    )
      ? rawCourse.curriculum!.topics
      : [];

    const lessonsArray = curriculumTopics.flatMap(
      (topic: any, topicIndex: number) => {
        const moduleId =
          topic?.id || `topic-${topicIndex + 1}`;

        if (!Array.isArray(topic?.lessons)) {
          return [];
        }

        return topic.lessons.map((lesson: any, lessonIndex: number) => ({
          ...lesson,
          module_id:
            lesson?.module_id || moduleId,
          order:
            typeof lesson?.order === 'number'
              ? lesson.order
              : lessonIndex + 1,
        }));
      },
    );

    // 4) Completions (todas) para as lições deste curso
    const lessonIds = lessonsArray
      .map((l: any) => l.id)
      .filter((lid: any) => !!lid);

    const lessonIdQuerySet = new Set<string>();
    lessonIds.forEach((lessonId: any) => {
      buildLessonIdVariants(lessonId).forEach((variant) => {
        if (variant) {
          lessonIdQuerySet.add(variant);
        }
      });
    });

    let completionsAll: any[] = [];
    let completedSetForUser = new Set<string>();
    let userXpInCourse = 0;

    if (lessonIdQuerySet.size > 0) {
      const { data: completions, error: compError } = await db
        .from('lesson_completions')
        .select('lesson_id, xp_earned, user_id')
        .in('lesson_id', Array.from(lessonIdQuerySet));

      if (compError) {
        console.error(
          'Error fetching lesson completions:',
          compError,
        );
      } else {
        completionsAll = completions || [];

        if (user) {
          const userCompletions = completionsAll.filter(
            (c: any) => c.user_id === user.id,
          );

          completedSetForUser = new Set(
            userCompletions.map((c: any) => c.lesson_id),
          );

          userXpInCourse = userCompletions.reduce(
            (sum: number, c: any) =>
              sum + (c.xp_earned ?? 0),
            0,
          );
        }
      }
    }

    // Mapa de XP distribuído por lição (para somar por módulo/curso)
    const xpByLesson: Record<string, number> = {};
    completionsAll.forEach((c: any) => {
      const lid = c.lesson_id;
      if (!lid) return;
      const xp = c.xp_earned ?? 0;
      xpByLesson[lid] = (xpByLesson[lid] || 0) + xp;
    });

    // 5) Map de autores
    const authorIdsSet = new Set<string>();

    if (rawCourse.author_id) authorIdsSet.add(rawCourse.author_id);
    curriculumTopics.forEach((topic: any) => {
      if (topic?.author_id) {
        authorIdsSet.add(topic.author_id);
      }
    });
    lessonsArray.forEach((lesson: any) => {
      if (lesson?.author_id) {
        authorIdsSet.add(lesson.author_id);
      }
    });

    let authorMap: Record<string, string> = {};
    const allAuthorIds = Array.from(authorIdsSet);

    if (allAuthorIds.length > 0) {
      const { data: authors, error: authorsError } = await db
        .from('users')
        .select('id, username')
        .in('id', allAuthorIds);

      if (authorsError) {
        console.error('Error fetching authors:', authorsError);
      } else {
        (authors || []).forEach((u: any) => {
          authorMap[u.id] = u.username || 'User';
        });
      }
    }

    // 6) Lições por módulo (enriquecidas)
    const getLessonReward = (lesson: any) => {
      if (typeof lesson?.xp_reward === 'number') return lesson.xp_reward;
      if (typeof lesson?.xpReward === 'number') return lesson.xpReward;
      return 0;
    };

    const lessonsByModule: Record<string, any[]> = {};
    lessonsArray.forEach((lesson: any) => {
      const moduleId = lesson?.module_id;
      if (!moduleId) return;
      if (!lessonsByModule[moduleId]) {
        lessonsByModule[moduleId] = [];
      }
      lessonsByModule[moduleId].push(lesson);
    });

    const extractModuleBonus = (moduleLike: any) => {
      if (typeof moduleLike?.xp_reward === 'number') return moduleLike.xp_reward;
      if (typeof moduleLike?.xpReward === 'number') return moduleLike.xpReward;
      if (
        moduleLike?.metadata &&
        typeof moduleLike.metadata.xpReward === 'number'
      ) {
        return moduleLike.metadata.xpReward;
      }
      return 0;
    };

    const extractCourseBonus = (courseLike: any) => {
      if (typeof courseLike?.xp_reward === 'number') return courseLike.xp_reward;
      if (typeof courseLike?.xp_reward_on_complete === 'number')
        return courseLike.xp_reward_on_complete;
      if (
        courseLike?.curriculum?.metadata &&
        typeof courseLike.curriculum.metadata.xpReward === 'number'
      ) {
        return courseLike.curriculum.metadata.xpReward;
      }
      return 0;
    };

    const normalizedModules = curriculumTopics.map(
      (topic: any, topicIndex: number) => {
        const moduleId = topic?.id || `topic-${topicIndex + 1}`;
        const moduleLessonsRaw = lessonsByModule[moduleId] || [];

        const moduleLessons = moduleLessonsRaw
          .slice()
          .sort(
            (a: any, b: any) => (a.order || 0) - (b.order || 0),
          )
          .map((l: any) => {
            const lessonStorageId =
              normalizeLessonIdForStorage(l.id) ?? l.id;
            const contentRaw =
              typeof l.content === 'string' ? l.content : '';
            const { before: content_preview, hasReadMore: content_has_read_more } =
              splitReadMore(contentRaw);
            const isLessonCreator =
              !!user &&
              ((l.author_id && l.author_id === user.id) ||
                (!l.author_id && isAdminUser));

            const isCompleted =
              !!user &&
              !isLessonCreator &&
              completedSetForUser.has(lessonStorageId);

            const lessonAuthorName =
              (l.author_id && authorMap[l.author_id]) ||
              l.author ||
              (isLessonCreator && user
                ? user.username
                : 'Admin');

            return {
              ...l,
              author_name: lessonAuthorName,
              isCompleted,
              isCreator: isLessonCreator,
              content_preview,
              content_has_read_more,
            };
          });

        const isModuleCreator =
          !!user &&
          ((topic?.author_id && topic.author_id === user.id) ||
            (!topic?.author_id && isAdminUser));

        const moduleAuthorName =
          (topic?.author_id && authorMap[topic.author_id]) ||
          topic?.author ||
          (isModuleCreator && user
            ? user.username
            : 'Admin');

        // XP disponível no módulo (soma dos xp_reward das lições)
        const moduleXpAvailable = moduleLessons.reduce(
          (sum: number, l: any) =>
            sum + getLessonReward(l),
          0,
        );

        // XP distribuído no módulo (soma do xpByLesson das lições)
        const moduleXpDistributed = moduleLessons.reduce(
          (sum: number, l: any) =>
            sum +
            (xpByLesson[normalizeLessonIdForStorage(l.id) ?? l.id] ||
              0),
          0,
        );

        // Módulo completed para este user (todas as lições completed)
        const isModuleCompleted =
          !!user &&
          moduleLessons.length > 0 &&
          moduleLessons.every((l: any) => l.isCompleted);

        return {
          ...topic,
          id: moduleId,
          author_name: moduleAuthorName,
          isCreator: isModuleCreator,
          xp_reward: extractModuleBonus(topic),
          lessons: moduleLessons,
          xp_available: moduleXpAvailable,
          xp_distributed: moduleXpDistributed,
          isCompleted: isModuleCompleted,
        };
      },
    );

    // 7) Estatísticas do curso
    const totalModules = normalizedModules.length;

    const totalLessons = normalizedModules.reduce(
      (acc: number, m: any) =>
        acc +
        (Array.isArray(m.lessons) ? m.lessons.length : 0),
      0,
    );

    const lessonsXP = normalizedModules.reduce((acc: number, m: any) => {
      if (!Array.isArray(m.lessons)) return acc;
      return (
        acc +
        m.lessons.reduce(
          (sum: number, l: any) => sum + getLessonReward(l),
          0,
        )
      );
    }, 0);

    const moduleBonusesFromCurriculum = normalizedModules.reduce(
      (acc: number, module: any) => acc + extractModuleBonus(module),
      0,
    );

    const courseCompletionBonus = extractCourseBonus(rawCourse);

    const totalXP =
      lessonsXP +
      moduleBonusesFromCurriculum +
      legacyModuleBonus +
      courseCompletionBonus;

    const courseXpDistributed = normalizedModules.reduce(
      (acc: number, module: any) =>
        acc + (module.xp_distributed || 0),
      0,
    );

    const isCourseCreator =
      !!user &&
      ((rawCourse.author_id &&
        rawCourse.author_id === user.id) ||
        (!rawCourse.author_id && isAdminUser));

    const courseAuthorName =
      (rawCourse.author_id &&
        authorMap[rawCourse.author_id]) ||
      rawCourse.author ||
      (isCourseCreator && user ? user.username : 'Admin');

    const course = {
      ...rawCourse,
      author_name: courseAuthorName,
      isCreator: isCourseCreator,
      modules: normalizedModules,
      total_modules: totalModules,
      total_lessons: totalLessons,
      total_xp: totalXP,
      xp_distributed: courseXpDistributed,
      xp_earned_by_user: userXpInCourse,
    };

    return NextResponse.json({
      success: true,
      course,
    });
  } catch (error) {
    console.error('Error in GET /api/courses/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
