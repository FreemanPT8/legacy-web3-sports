// app/api/me/xp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import {
  buildLessonIdVariants,
  normalizeLessonIdForStorage,
} from '@/lib/lesson-id';

const db = supabaseAdmin ?? supabase;

type XPTransaction = {
  id: string;
  user_id: string | null;
  action: string;
  xp_earned: number;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
};

const LANGUAGE_KEYS = ['pt', 'en', 'es', 'fr', 'it', 'de'];

const resolveMultilingualText = (raw: any, fallback: string) => {
  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    for (const key of LANGUAGE_KEYS) {
      if (typeof raw[key] === 'string' && raw[key].trim().length > 0) {
        return raw[key];
      }
    }
  }
  return fallback;
};

async function resolveLessonLabels(
  ids: string[],
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const { data: courses, error } = await db
    .from('courses')
    .select('id, title, curriculum');

  if (error || !courses) {
    console.error('Failed to resolve lesson titles:', error);
    return {};
  }

  const labelMap: Record<string, string> = {};

  courses.forEach((course: any) => {
    const topics: any[] = Array.isArray(course?.curriculum?.topics)
      ? course.curriculum.topics
      : [];

    topics.forEach((topic: any, topicIndex: number) => {
      const moduleId = topic?.id || `topic-${topicIndex + 1}`;
      const lessons = Array.isArray(topic?.lessons)
        ? topic.lessons
        : [];

      lessons.forEach((lesson: any, lessonIndex: number) => {
        const lessonId =
          lesson?.id || `${moduleId}-lesson-${lessonIndex + 1}`;
        const lessonTitle = resolveMultilingualText(
          lesson?.title,
          'Lesson',
        );

        const variants = buildLessonIdVariants(lessonId);
        if (variants.length === 0) {
          labelMap[lessonId] = lessonTitle;
        } else {
          variants.forEach((variant) => {
            labelMap[variant] = lessonTitle;
          });
        }
      });
    });
  });

  return labelMap;
}

async function resolveBlogLabels(
  ids: string[],
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const { data: posts, error } = await db
    .from('blog_posts')
    .select('id, title')
    .in('id', uniqueIds);

  if (error || !posts) {
    console.error('Failed to resolve blog titles:', error);
    return {};
  }

  return posts.reduce((acc: Record<string, string>, post: any) => {
    acc[post.id] = resolveMultilingualText(post.title, 'Artigo');
    return acc;
  }, {});
}

async function resolveGlossaryLabels(
  ids: string[],
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const { data: terms, error } = await db
    .from('glossary_terms')
    .select('id, slug, term_pt, term_en, term_es')
    .in('id', uniqueIds);

  if (error || !terms) {
    console.error('Failed to resolve glossary titles:', error);
    return {};
  }

  return terms.reduce((acc: Record<string, string>, term: any) => {
    acc[term.id] =
      term.term_pt ||
      term.term_en ||
      term.term_es ||
      term.slug ||
      'Termo do glossário';
    return acc;
  }, {});
}

async function resolveCreatorRewardConsumers(
  creatorTransactions: XPTransaction[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const transactionsWithContent = creatorTransactions.filter(
    (tx) => tx.reference_id && tx.created_at,
  );

  if (transactionsWithContent.length === 0) {
    return map;
  }

  const referenceIds = Array.from(
    new Set(
      transactionsWithContent.map(
        (tx) => tx.reference_id as string,
      ),
    ),
  );

  const { data: consumerTxs, error } = await db
    .from('xp_transactions')
    .select('id, user_id, reference_id, reference_type, created_at')
    .in('reference_id', referenceIds)
    .in('reference_type', ['blog', 'lesson'])
    .order('created_at', { ascending: false });

  if (error || !consumerTxs) {
    console.error('Failed to resolve creator reward consumers:', error);
    return map;
  }

  const groupedByContent: Record<string, any[]> = {};
  consumerTxs.forEach((tx) => {
    if (!tx.reference_id) return;
    if (!groupedByContent[tx.reference_id]) {
      groupedByContent[tx.reference_id] = [];
    }
    groupedByContent[tx.reference_id].push(tx);
  });

  const consumerIds = new Set<string>();
  transactionsWithContent.forEach((creatorTx) => {
    const candidates =
      groupedByContent[creatorTx.reference_id as string] || [];
    const rewardTime = new Date(creatorTx.created_at!).getTime();
    const matched = candidates.find((candidate) => {
      if (!candidate.created_at) return false;
      const consumerTime = new Date(candidate.created_at).getTime();
      return consumerTime <= rewardTime + 5_000;
    });
    if (matched?.user_id) {
      map[creatorTx.id] = matched.user_id as string;
      consumerIds.add(matched.user_id as string);
    }
  });

  if (consumerIds.size === 0) {
    return map;
  }

  const { data: consumerUsers, error: userError } = await db
    .from('users')
    .select('id, username')
    .in('id', Array.from(consumerIds));

  if (userError || !consumerUsers) {
    console.error('Failed to resolve consumer usernames:', userError);
    return map;
  }

  const usernameMap = consumerUsers.reduce(
    (acc: Record<string, string>, user: any) => {
      acc[user.id] = user.username;
      return acc;
    },
    {},
  );

  Object.keys(map).forEach((txId) => {
    const consumerId = map[txId];
    const username = usernameMap[consumerId];
    if (!username) {
      delete map[txId];
    } else {
      map[txId] = username;
    }
  });

  return map;
}

export async function GET(request: NextRequest) {
  try {
    const headerToken = request.headers.get('Authorization');
    const cookieToken =
      request.cookies.get('sb-access-token')?.value ||
      request.cookies.get('token')?.value ||
      null;

    const bearerToken =
      headerToken ||
      (cookieToken ? `Bearer ${cookieToken}` : null);

    const user = bearerToken ? await verifyAuth(bearerToken) : null;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const userId = user.id;

    // Datas em UTC
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setUTCDate(startOfToday.getUTCDate() - 6); // hoje + 6 dias anteriores

    const thirtyDaysAgo = new Date(startOfToday);
    thirtyDaysAgo.setUTCDate(startOfToday.getUTCDate() - 29); // hoje + 29 dias anteriores

    const nowISO = now.toISOString();
    const startTodayISO = startOfToday.toISOString();
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    // 1) Dados base do user: xp_total, streak, etc.
    const { data: userRow, error: userError } = await db
      .from('users')
      .select(
        `
        id,
        username,
        xp_total,
        streak_count,
        streak_updated_at,
        streak_long_count,
        streak_long_updated_at,
        created_at
      `,
      )
      .eq('id', userId)
      .maybeSingle();

    const fallbackUserRow = {
      id: user.id,
      username: user.username,
      xp_total: user.xp_total ?? 0,
      streak_count: user.streak_count ?? 0,
      streak_updated_at: null,
      streak_long_count: 0,
      streak_long_updated_at: null,
      created_at: user.created_at ?? null,
    };

    const hydratedUser = userRow ?? fallbackUserRow;

    if (userError) {
      console.error('Error fetching user for XP summary:', userError);
    }

    const safeXpTotal = Number(hydratedUser.xp_total ?? 0);
    const streakCount = Number(hydratedUser.streak_count ?? 0);
    const longStreakCount = Number(hydratedUser.streak_long_count ?? 0);

    // 2) Transações dos últimos 30 dias
    const { data: txData, error: txError } = await db
      .from('xp_transactions')
      .select(
        `
        id,
        user_id,
        action,
        xp_earned,
        reference_id,
        reference_type,
        created_at
      `,
      )
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgoISO)
      .lte('created_at', nowISO)
      .order('created_at', { ascending: false });

    if (txError) {
      console.error('Error fetching XP transactions:', txError);
      return NextResponse.json(
        { success: false, error: 'Failed to load XP transactions' },
        { status: 500 },
      );
    }

    const transactions: XPTransaction[] = (txData || []) as XPTransaction[];

    // 3) Cálculos agregados
    let xpToday = 0;
    let xpLast7 = 0;
    let xpLast30 = 0;

    transactions.forEach((tx) => {
      const createdISO = tx.created_at;

      if (createdISO >= startTodayISO && createdISO <= nowISO) {
        xpToday += tx.xp_earned;
      }
      if (createdISO >= sevenDaysAgoISO && createdISO <= nowISO) {
        xpLast7 += tx.xp_earned;
      }
      if (createdISO >= thirtyDaysAgoISO && createdISO <= nowISO) {
        xpLast30 += tx.xp_earned;
      }
    });

    // 4) Breakdown por tipo de ação
    const actionBreakdown: Record<string, number> = {};
    transactions.forEach((tx) => {
      const key = tx.action || 'other';
      actionBreakdown[key] = (actionBreakdown[key] || 0) + tx.xp_earned;
    });

    // Últimas 20 transações para mostrar na dashboard
    const recentTransactions = transactions.slice(0, 20);

    const lessonReferenceIds = recentTransactions
      .filter(
        (tx) =>
          tx.reference_id &&
          tx.reference_type &&
          (tx.reference_type.startsWith('lesson') ||
            tx.reference_type === 'lesson_creator'),
      )
      .map((tx) => tx.reference_id as string);

    const blogReferenceIds = recentTransactions
      .filter(
        (tx) =>
          tx.reference_id &&
          (tx.reference_type === 'blog' ||
            tx.reference_type === 'blog_creator'),
      )
      .map((tx) => tx.reference_id as string);

    const glossaryReferenceIds = recentTransactions
      .filter(
        (tx) => tx.reference_id && tx.reference_type === 'glossary_term',
      )
      .map((tx) => tx.reference_id as string);

    const creatorRewardTransactions = recentTransactions.filter(
      (tx) =>
        tx.reference_type === 'blog_creator' ||
        tx.reference_type === 'lesson_creator',
    );

    const [
      lessonLabels,
      blogLabels,
      glossaryLabels,
      creatorRewardConsumers,
    ] = await Promise.all([
      resolveLessonLabels(lessonReferenceIds),
      resolveBlogLabels(blogReferenceIds),
      resolveGlossaryLabels(glossaryReferenceIds),
      resolveCreatorRewardConsumers(creatorRewardTransactions),
    ]);

    const transactionsWithLabels = recentTransactions.map((tx) => {
      let referenceLabel: string | null = null;

      if (
        tx.reference_id &&
        tx.reference_type &&
        tx.reference_type.startsWith('lesson')
      ) {
        const candidates = buildLessonIdVariants(tx.reference_id);
        for (const candidate of candidates) {
          if (lessonLabels[candidate]) {
            referenceLabel = lessonLabels[candidate];
            break;
          }
        }
        if (!referenceLabel) {
          const normalized =
            normalizeLessonIdForStorage(tx.reference_id) ||
            tx.reference_id;
          referenceLabel = lessonLabels[normalized] || null;
        }
      } else if (
        tx.reference_id &&
        tx.reference_type === 'blog'
      ) {
        referenceLabel = blogLabels[tx.reference_id] || null;
      } else if (
        tx.reference_id &&
        tx.reference_type === 'glossary_term'
      ) {
        referenceLabel = glossaryLabels[tx.reference_id] || null;
      }

      if (
        tx.reference_id &&
        !referenceLabel &&
        tx.reference_type === 'lesson_creator'
      ) {
        referenceLabel = lessonLabels[tx.reference_id] || null;
      } else if (
        tx.reference_id &&
        !referenceLabel &&
        tx.reference_type === 'blog_creator'
      ) {
        referenceLabel = blogLabels[tx.reference_id] || null;
      }

      const consumerUsername = creatorRewardConsumers[tx.id];
      if (consumerUsername) {
        const consumerLabel =
          tx.reference_type === 'blog_creator'
            ? `Leitura por @${consumerUsername}`
            : `Conclusão por @${consumerUsername}`;
        referenceLabel = referenceLabel
          ? `${referenceLabel} • ${consumerLabel}`
          : consumerLabel;
      }

      return {
        ...tx,
        reference_label: referenceLabel,
      };
    });

    return NextResponse.json(
      {
        success: true,
        xp: {
          xp_total: safeXpTotal,
          xp_today: xpToday,
          xp_last_7_days: xpLast7,
          xp_last_30_days: xpLast30,
          streak_count: streakCount,
          streak_updated_at: hydratedUser.streak_updated_at,
          streak_long_count: longStreakCount,
          streak_long_updated_at: hydratedUser.streak_long_updated_at,
          action_breakdown: actionBreakdown,
          recent_transactions: transactionsWithLabels,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/me/xp:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
