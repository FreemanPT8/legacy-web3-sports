import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin')) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      );
    }

    // ---------------------------------------
    // 1️⃣ USER GROWTH (LAST 6 MONTHS)
    // ---------------------------------------
    const { data: users } = await db
      .from('users')
      .select('id, created_at')
      .order('created_at', { ascending: true });

    const now = new Date();
    const last6 = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('en-US', { month: 'short' });

      const count =
        users?.filter((u) => {
          const created = new Date(u.created_at);
          return (
            created.getFullYear() === d.getFullYear() &&
            created.getMonth() === d.getMonth()
          );
        }).length || 0;

      last6.push({ month: monthName, users: count });
    }

    // ---------------------------------------
    // 2️⃣ COURSE ENGAGEMENT
    // ---------------------------------------
    const { data: lessons } = await db
      .from('lessons')
      .select('id, module_id');

    const { data: modules } = await db
      .from('modules')
      .select('id, course_id, title');

    const { data: courses } = await db
      .from('courses')
      .select('id, title');

    const { data: completions } = await db
      .from('lesson_completions')
      .select('id, lesson_id');

    const courseStats: Record<
      string,
      { course: string; completions: number }
    > = {};

    for (const course of courses || []) {
      courseStats[course.id] = {
        course: course.title,
        completions: 0,
      };
    }

    (completions || []).forEach((c) => {
      const lesson = lessons?.find((l) => l.id === c.lesson_id);
      const module = modules?.find((m) => m.id === lesson?.module_id);
      if (module && courseStats[module.course_id]) {
        courseStats[module.course_id].completions += 1;
      }
    });

    const courseEngagement = Object.values(courseStats);

    // ---------------------------------------
    // 3️⃣ WEEKLY ENGAGEMENT (Last 4 Weeks)
    // ---------------------------------------
    const { data: xpTransactions } = await db
      .from('xp_transactions')
      .select('id, created_at, action, xp_earned');

    const { data: lessonCompletions } = await db
      .from('lesson_completions')
      .select('id, created_at');

    const { data: courseCompletions } = await db
      .from('course_completions')
      .select('id, completed_at');

    const { data: blogReads } = await db
      .from('blog_reads')
      .select('id, created_at');

    const weekly: {
      week: string;
      lessons: number;
      courses: number;
      blog: number;
      xp: number;
    }[] = [];

    for (let i = 3; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - (i + 1) * 7);
      const end = new Date();
      end.setDate(end.getDate() - i * 7);

      const weekLabel = `Week ${4 - i}`;

      const inRange = (date: string) => {
        const d = new Date(date);
        return d >= start && d < end;
      };

      weekly.push({
        week: weekLabel,
        lessons: (lessonCompletions || []).filter((l) =>
          inRange(l.created_at)
        ).length,
        courses: (courseCompletions || []).filter((c) =>
          inRange(c.completed_at)
        ).length,
        blog: (blogReads || []).filter((b) =>
          inRange(b.created_at)
        ).length,
        xp: (xpTransactions || [])
          .filter((x) => inRange(x.created_at))
          .reduce((sum, x) => sum + x.xp_earned, 0),
      });
    }

    return NextResponse.json({
      success: true,
      charts: {
        userGrowth: last6,
        courseEngagement,
        weekly,
      },
    });
  } catch (err) {
    console.error('ERROR /api/admin/stats/advanced', err);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
