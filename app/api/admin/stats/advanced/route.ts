import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

const db = supabaseAdmin ?? supabase;

// Tipos básicos para o que vamos ler
type RawUser = {
  id: string;
  created_at: string;
};

type UserGrowthPoint = {
  date: string; // ex: '2025-01'
  count: number;
};

type CourseEngagementPoint = {
  course: string;
  completions: number;
};

type EngagementPoint = {
  week: string;
  lessons: number;
  courses: number;
  blog: number;
  xp: number;
};

export async function GET(request: NextRequest) {
  // 1) Verificar se é Admin / Super Admin
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    // 2) Buscar utilizadores (para growth)
    const { data: rawUsers, error: usersError } = await db
      .from('users')
      .select('id, created_at');

    if (usersError) {
      console.error('Error fetching users for advanced stats:', usersError);
    }

    const users: RawUser[] = (rawUsers || []) as RawUser[];

    // 3) Construir últimos 6 meses (YYYY-MM)
    const now = new Date();
    const months: { dateKey: string; label: string; baseDate: Date }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = `${d.getMonth() + 1}`.padStart(2, '0');
      months.push({
        dateKey: `${year}-${month}`,
        label: `${year}-${month}`,
        baseDate: d,
      });
    }

    // 4) User growth por mês
    const userGrowth: UserGrowthPoint[] = months.map((m) => {
      const count =
        users?.filter((u: RawUser) => {
          const created = new Date(u.created_at);
          return (
            created.getFullYear() === m.baseDate.getFullYear() &&
            created.getMonth() === m.baseDate.getMonth()
          );
        }).length ?? 0;

      return {
        date: m.label,
        count,
      };
    });

    // 5) Course engagement (placeholder simples por agora)
    //    — mais tarde podemos ligar a course_completions / lesson_completions
    const courseEngagement: CourseEngagementPoint[] = [
      { course: 'Blockchain Basics', completions: 72 },
      { course: 'Apertum Explorer', completions: 63 },
      { course: 'DAO1 Tools', completions: 51 },
      { course: 'Security & Web3', completions: 34 },
    ];

    // 6) Weekly engagement (placeholder — depois ligamos a dados reais)
    const engagementWeekly: EngagementPoint[] = [
      { week: 'Week 1', lessons: 22, courses: 8, blog: 12, xp: 180 },
      { week: 'Week 2', lessons: 31, courses: 12, blog: 19, xp: 260 },
      { week: 'Week 3', lessons: 27, courses: 10, blog: 17, xp: 220 },
      { week: 'Week 4', lessons: 40, courses: 15, blog: 21, xp: 340 },
    ];

    return NextResponse.json({
      success: true,
      data: {
        userGrowth,
        courseEngagement,
        engagementWeekly,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/stats/advanced:', error);
    return NextResponse.json(
      { success: false, error: 'Server error in advanced stats' },
      { status: 500 },
    );
  }
}
