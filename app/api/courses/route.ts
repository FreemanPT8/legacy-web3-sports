import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin ?? supabase;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const includeModules =
      url.searchParams.get('includeModules') === 'true';

    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;
    const isAdminUser =
      !!user &&
      (user.role === 'Super Admin' || user.role === 'Admin');

    // 1) Cursos publicados
    const { data: rawCourses, error: courseError } = await db
      .from('courses')
      .select('*')
      .eq('published', true)
      .order('order', { ascending: true });

    if (courseError) {
      console.error('Error fetching courses:', courseError);
      return NextResponse.json(
        { success: false, error: 'Failed to load courses' },
        { status: 500 },
      );
    }

    if (!rawCourses || rawCourses.length === 0) {
      return NextResponse.json({
        success: true,
        courses: [],
      });
    }

    const coursesArray: any[] = rawCourses;

    // Se não queremos módulos → só normalizamos autor e isCreator
    if (!includeModules) {
      const courseAuthorIds = coursesArray
        .map((c: any) => c.author_id)
        .filter((id: any) => !!id);

      let authorMap: Record<string, string> = {};

      if (courseAuthorIds.length > 0) {
        const { data: authors, error: authorsError } = await db
          .from('users')
          .select('id, username')
          .in('id', courseAuthorIds);

        if (authorsError) {
          console.error(
            'Error fetching course authors:',
            authorsError,
          );
        } else {
          (authors || []).forEach((u: any) => {
            authorMap[u.id] = u.username || 'User';
          });
        }
      }

      const normalizedCourses = coursesArray.map((c: any) => {
        const isCourseCreator =
          !!user &&
          ((c.author_id && c.author_id === user.id) ||
            (!c.author_id && isAdminUser));

        const authorName =
          (c.author_id && authorMap[c.author_id]) ||
          c.author ||
          (isCourseCreator ? user!.username : 'Admin');

        return {
          ...c,
          author_name: authorName,
          isCreator: isCourseCreator,
          // nesta rota simples não calculamos XP distribuído
        };
      });

      return NextResponse.json({
        success: true,
        courses: normalizedCourses,
      });
    }

    // 3) includeModules = true → derivar dados a partir do curriculum
    const courseIds = coursesArray
      .map((c: any) => c.id)
      .filter((id: any) => !!id);

    const curriculumByCourse: Record<string, any[]> = {};
    const lessonsByCourse: Record<string, any[]> = {};
    const lessonToCourse: Record<string, string> = {};
    const authorIdsSet = new Set<string>();
    const lessonIdsAll: string[] = [];

    coursesArray.forEach((course: any) => {
      if (course.author_id) {
        authorIdsSet.add(course.author_id);
      }

      const topics: any[] = Array.isArray(course.curriculum?.topics)
        ? course.curriculum!.topics
        : [];
      curriculumByCourse[course.id] = topics;

      topics.forEach((topic: any, topicIndex: number) => {
        if (topic?.author_id) {
          authorIdsSet.add(topic.author_id);
        }

        const moduleId = topic?.id || `topic-${topicIndex + 1}`;
        const lessons = Array.isArray(topic?.lessons)
          ? topic.lessons
          : [];

        lessons.forEach((lesson: any, lessonIndex: number) => {
          const lessonId =
            lesson?.id || `${moduleId}-lesson-${lessonIndex + 1}`;
          const normalizedLesson = {
            ...lesson,
            id: lessonId,
            module_id: lesson?.module_id || moduleId,
            order:
              typeof lesson?.order === 'number'
                ? lesson.order
                : lessonIndex + 1,
          };

          if (!lessonsByCourse[course.id]) {
            lessonsByCourse[course.id] = [];
          }
          lessonsByCourse[course.id].push(normalizedLesson);

          lessonToCourse[lessonId] = course.id;
          lessonIdsAll.push(lessonId);

          if (normalizedLesson.author_id) {
            authorIdsSet.add(normalizedLesson.author_id);
          }
        });
      });
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

    const xpDistributedByCourse: Record<string, number> = {};
    const xpByLesson: Record<string, number> = {};

    if (lessonIdsAll.length > 0) {
      const { data: lessonCompletions, error: lessonCompError } =
        await db
          .from('lesson_completions')
          .select('lesson_id, xp_earned')
          .in('lesson_id', lessonIdsAll);

      if (lessonCompError) {
        console.error(
          'Error fetching lesson_completions:',
          lessonCompError,
        );
      } else {
        (lessonCompletions || []).forEach((row: any) => {
          const lessonId = row.lesson_id as string;
          if (!lessonId) return;

          const xp = row.xp_earned || 0;
          xpByLesson[lessonId] =
            (xpByLesson[lessonId] || 0) + xp;

          const courseId = lessonToCourse[lessonId];
          if (courseId) {
            xpDistributedByCourse[courseId] =
              (xpDistributedByCourse[courseId] || 0) + xp;
          }
        });
      }
    }

    if (courseIds.length > 0) {
      const { data: courseCompletions, error: courseCompError } =
        await db
          .from('course_completions')
          .select('course_id, xp_earned')
          .in('course_id', courseIds);

      if (courseCompError) {
        console.error(
          'Error fetching course_completions:',
          courseCompError,
        );
      } else {
        (courseCompletions || []).forEach((row: any) => {
          const courseId = row.course_id as string;
          if (!courseId) return;
          const xp = row.xp_earned || 0;
          xpDistributedByCourse[courseId] =
            (xpDistributedByCourse[courseId] || 0) + xp;
        });
      }
    }

    const moduleBonusByCourse: Record<string, number> = {};
    if (courseIds.length > 0) {
      const { data: moduleRows, error: moduleRowsError } = await db
        .from('modules')
        .select('course_id, xp_reward')
        .in('course_id', courseIds);

      if (moduleRowsError) {
        console.error('Error fetching legacy modules xp rewards:', moduleRowsError);
      } else {
        (moduleRows || []).forEach((moduleRow: any) => {
          const bonusValue =
            typeof moduleRow?.xp_reward === 'number'
              ? moduleRow.xp_reward
              : 0;
          if (!moduleRow?.course_id || !Number.isFinite(bonusValue)) {
            return;
          }
          moduleBonusByCourse[moduleRow.course_id] =
            (moduleBonusByCourse[moduleRow.course_id] || 0) + bonusValue;
        });
      }
    }

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
      if (
        typeof courseLike?.xp_reward_on_complete === 'number'
      ) {
        return courseLike.xp_reward_on_complete;
      }
      if (
        courseLike?.curriculum?.metadata &&
        typeof courseLike.curriculum.metadata.xpReward === 'number'
      ) {
        return courseLike.curriculum.metadata.xpReward;
      }
      return 0;
    };

    const getLessonReward = (lesson: any) => {
      if (typeof lesson?.xp_reward === 'number') return lesson.xp_reward;
      if (typeof lesson?.xpReward === 'number') return lesson.xpReward;
      return 0;
    };

    const normalizedCourses = coursesArray.map((course: any) => {
      const topics = (curriculumByCourse[course.id] || []).slice().sort(
        (a: any, b: any) => (a?.order || 0) - (b?.order || 0),
      );
      const lessonsForCourse = lessonsByCourse[course.id] || [];

      const modules = topics.map((topic: any, topicIndex: number) => {
        const moduleId = topic?.id || `topic-${topicIndex + 1}`;
        const moduleLessonsRaw = lessonsForCourse.filter(
          (lesson: any) => lesson.module_id === moduleId,
        );

        const moduleLessons = moduleLessonsRaw
          .slice()
          .sort(
            (a: any, b: any) => (a.order || 0) - (b.order || 0),
          )
          .map((lesson: any) => ({
            ...lesson,
            author_name:
              (lesson.author_id && authorMap[lesson.author_id]) ||
              lesson.author ||
              'Admin',
          }));

        const moduleAuthorName =
          (topic?.author_id && authorMap[topic.author_id]) ||
          topic?.author ||
          'Admin';

        const moduleXpAvailable = moduleLessons.reduce(
          (sum: number, lesson: any) => sum + getLessonReward(lesson),
          0,
        );

        const moduleXpDistributed = moduleLessons.reduce(
          (sum: number, lesson: any) =>
            sum + (xpByLesson[lesson.id] || 0),
          0,
        );

        return {
          ...topic,
          id: moduleId,
          author_name: moduleAuthorName,
          xp_reward: extractModuleBonus(topic),
          lessons: moduleLessons,
          xp_available: moduleXpAvailable,
          xp_distributed: moduleXpDistributed,
        };
      });

      const totalModules = modules.length;
      const totalLessons = modules.reduce(
        (acc: number, module: any) =>
          acc +
          (Array.isArray(module.lessons)
            ? module.lessons.length
            : 0),
        0,
      );

      const lessonsXP = modules.reduce((acc: number, module: any) => {
        if (!Array.isArray(module.lessons)) return acc;
        return (
          acc +
          module.lessons.reduce(
            (sum: number, lesson: any) => sum + getLessonReward(lesson),
            0,
          )
        );
      }, 0);

      const moduleBonusesFromCurriculum = modules.reduce(
        (acc: number, module: any) => acc + extractModuleBonus(module),
        0,
      );

      const legacyModuleBonus = moduleBonusByCourse[course.id] || 0;
      const courseCompletionBonus = extractCourseBonus(course);
      const totalXP =
        lessonsXP +
        moduleBonusesFromCurriculum +
        legacyModuleBonus +
        courseCompletionBonus;

      const isCourseCreator =
        !!user &&
        ((course.author_id && course.author_id === user.id) ||
          (!course.author_id && isAdminUser));

      const authorName =
        (course.author_id && authorMap[course.author_id]) ||
        course.author ||
        (isCourseCreator ? user!.username : 'Admin');

      const xpDistributed = xpDistributedByCourse[course.id] || 0;

      return {
        ...course,
        author_name: authorName,
        isCreator: isCourseCreator,
        modules,
        total_modules: totalModules,
        total_lessons: totalLessons,
        total_xp: totalXP,
        xp_distributed_total: xpDistributed,
      };
    });

    return NextResponse.json({
      success: true,
      courses: normalizedCourses,
    });
  } catch (error) {
    console.error('Error in GET /api/courses:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
