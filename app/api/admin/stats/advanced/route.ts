// app/api/admin/stats/advanced/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

type JwtUser = {
  id: string;
  role?: string;
};

const db = supabaseAdmin ?? supabase;

function getLastMonths(count: number) {
  const result: { key: string; label: string; year: number; month: number }[] =
    [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0–11
    const label = d.toLocaleString('en', { month: 'short' });
    result.push({
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label,
      year,
      month,
    });
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 },
      );
    }

    let authUser: JwtUser | null = null;

    try {
      authUser = (await verifyAuth(authHeader)) as JwtUser;
    } catch (err) {
      console.error('verifyAuth error in /api/admin/stats/advanced:', err);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 },
      );
    }

    if (!authUser || (authUser.role !== 'Admin' && authUser.role !== 'Super Admin')) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 },
      );
    }

    // --- 1) Dados base ----------------------------------------
    const [{ data: users }, { data: courses }, { data: lessons }, { data: blogPosts }, { data: completions }] =
      await Promise.all([
        db.from('users').select('id, created_at'),
        db.from('courses').select('id, title'),
        db.from('lessons').select('id, module_id'),
        db.from('blog_posts').select('id, published'),
        db.from('lesson_completions').select('lesson_id, xp_earned, created_at'),
      ]);

    const safeUsers = (users || []) as any[];
    const safeCourses = (courses || []) as any[];
    const safeLessons = (lessons || []) as any[];
    const safeCompletions = (completions || []) as any[];

    // --- 2) User Growth (últimos 6 meses) ---------------------
    const months = getLastMonths(6);

    const userGrowth = months.map((m) => {
      const count = safeUsers.filter((u: any) => {
        const created = new Date(u.created_at);
        return (
          created.getFullYear() === m.year &&
          created.getMonth() === m.month
        );
      }).length;

      return {
        month: m.label,
        count,
      };
    });

    // --- 3) Course Engagement (top 5 por nº de completions) ---
    // map lesson_id -> module_id
    const lessonToModule: Record<string, string> = {};
    safeLessons.forEach((l: any) => {
      if (l && l.id) {
        lessonToModule[l.id] = l.module_id;
      }
    });

    // map module_id -> course_id
    // Nota: se não tiveres tabela modules com course_id, isto
    // pode ficar sempre vazio, mas não quebra nada.
    const { data: modules } = await db
      .from('modules')
      .select('id, course_id');

    const safeModules = (modules || []) as any[];
    const moduleToCourse: Record<string, string> = {};
    safeModules.forEach((m: any) => {
      if (m && m.id) {
        moduleToCourse[m.id] = m.course_id;
      }
    });

    // map course_id -> title
    const courseTitle: Record<string, string> = {};
    safeCourses.forEach((c: any) => {
      if (!c || !c.id) return;

      // title pode ser JSONB {en,pt,...}
      let title = '';
      if (typeof c.title === 'string') {
        title = c.title;
      } else if (c.title) {
        title =
          c.title.en ||
          c.title.pt ||
          c.title.es ||
          c.title.fr ||
          `Course ${c.id}`;
      } else {
        title = `Course ${c.id}`;
      }

      courseTitle[c.id] = title;
    });

    const completionsByCourse: Record<string, number> = {};

    safeCompletions.forEach((comp: any) => {
      const lessonId = comp.lesson_id;
      if (!lessonId) return;

      const moduleId = lessonToModule[lessonId];
      const courseId = moduleToCourse[moduleId];
      if (!courseId) return;

      completionsByCourse[courseId] =
        (completionsByCourse[courseId] || 0) + 1;
    });

    const courseEngagement = Object.entries(completionsByCourse)
      .map(([courseId, count]) => ({
        course: courseTitle[courseId] || `Course ${courseId}`,
        completions: count as number,
      }))
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 5);

    // --- 4) Weekly Engagement (últimas 4 semanas) -------------
    const now = new Date();
    const weeks: { label: string; start: Date; end: Date }[] = [];

    for (let i = 3; i >= 0; i--) {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i * 7,
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i * 7 + 7,
      );
      weeks.push({
        label: `Week ${4 - i}`,
        start,
        end,
      });
    }

    const weeklyEngagement = weeks.map((w) => {
      const weekCompletions = safeCompletions.filter((c: any) => {
        const created = new Date(c.created_at);
        return created >= w.start && created < w.end;
      });

      const lessonsCount = weekCompletions.length;

      // nº de cursos diferentes com completions
      const courseSet = new Set<string>();

      weekCompletions.forEach((c: any) => {
        const lessonId = c.lesson_id;
        const moduleId = lessonToModule[lessonId];
        const courseId = moduleToCourse[moduleId];
        if (courseId) {
          courseSet.add(courseId);
        }
      });

      const xpSum = weekCompletions.reduce((sum: number, c: any) => {
        const v = typeof c.xp_earned === 'number' ? c.xp_earned : 0;
        return sum + v;
      }, 0);

      return {
        week: w.label,
        lessons: lessonsCount,
        courses: courseSet.size,
        blog: 0, // ainda não temos eventos de leitura → 0 mas real
        xp: xpSum,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        userGrowth,
        courseEngagement,
        weeklyEngagement,
        blogPublished: (blogPosts || []).filter((p: any) => p.published).length,
      },
    });
  } catch (error) {
    console.error('Unexpected error in /api/admin/stats/advanced:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
