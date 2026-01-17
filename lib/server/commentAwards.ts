import { supabase, supabaseAdmin } from '@/lib/supabase';
import { awardXP } from '@/lib/xp';

const db = supabaseAdmin ?? supabase;

const WEEKLY_COMMENT_BADGE = 'comment-weekly-top';
const WEEKLY_COMMENT_XP = 88;
const COMMENT_AWARDS_ENABLED = false;

type CommentRow = {
  id: string;
  author_id: string;
  content_type: 'lesson' | 'blog_post' | 'house';
  content_id: string;
  positive_count: number;
  fire_count: number;
  created_at: string;
};

type CommentAwardResult =
  | {
      success: true;
      message: string;
      commentId: string;
      userId: string;
      points: number;
      weekStart: string;
      weekEnd: string;
    }
  | {
      success: false;
      error: string;
      reason?: string;
    };

function getWeekRange(reference = new Date()): { weekStart: Date; weekEnd: Date } {
  const utc = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const day = utc.getUTCDay();
  const mondayDiff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + mondayDiff);

  const start = new Date(utc);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return { weekStart: start, weekEnd: end };
}

function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function buildCommentLink(row: CommentRow): string | null {
  if (row.content_type === 'lesson') {
    return `/education/lessons/${row.content_id}`;
  }
  if (row.content_type === 'blog_post') {
    return `/blog/${row.content_id}`;
  }
  return null;
}

export async function runWeeklyCommentAward(referenceDate?: Date): Promise<CommentAwardResult> {
  if (!COMMENT_AWARDS_ENABLED) {
    return {
      success: false,
      error: 'Weekly comment awards are disabled.',
      reason: 'DISABLED',
    };
  }

  const targetDate = referenceDate ?? new Date();
  const { weekStart, weekEnd } = getWeekRange(targetDate);
  const weekStartDate = formatDateOnly(weekStart);
  const weekEndDate = formatDateOnly(weekEnd);

  const { data: existingAward, error: existingError } = await db
    .from('comment_weekly_awards')
    .select('id')
    .eq('week_start', weekStartDate)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: 'Failed to check existing awards.' };
  }

  if (existingAward) {
    return {
      success: false,
      error: 'Week already processed.',
      reason: 'AWARD_ALREADY_ASSIGNED',
    };
  }

  const { data: comments, error: commentError } = await db
    .from('content_comments')
    .select('id, author_id, content_type, content_id, positive_count, fire_count, created_at')
    .in('content_type', ['lesson', 'blog_post'])
    .eq('visibility', 'public')
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString());

  if (commentError) {
    return { success: false, error: 'Failed to load comments for award.' };
  }

  if (!comments || comments.length === 0) {
    return {
      success: false,
      error: 'No eligible comments for this week.',
      reason: 'NO_COMMENTS',
    };
  }

  const enriched = (comments as CommentRow[])
    .map((row: CommentRow) => {
      const points = (row.positive_count ?? 0) + 2 * (row.fire_count ?? 0);
      return { row, points };
    })
    .filter((entry) => entry.points > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return new Date(a.row.created_at).getTime() - new Date(b.row.created_at).getTime();
    });

  if (!enriched.length) {
    return {
      success: false,
      error: 'No comment received positive reactions this week.',
      reason: 'NO_POINTS',
    };
  }

  const winner = enriched[0]!;
  const awardPayload = {
    comment_id: winner.row.id,
    winner_user_id: winner.row.author_id,
    week_start: weekStartDate,
    week_end: weekEndDate,
    reaction_points: winner.points,
    awarded_xp: WEEKLY_COMMENT_XP,
    badge_awarded: true,
  };

  const { error: insertAwardError } = await db.from('comment_weekly_awards').insert(awardPayload);
  if (insertAwardError) {
    return { success: false, error: 'Failed to record weekly award.' };
  }

  await awardXP(winner.row.author_id, 'comment_weekly_top', WEEKLY_COMMENT_XP, winner.row.id, winner.row.content_type);

  await db
    .from('user_badges')
    .upsert(
      {
        user_id: winner.row.author_id,
        badge_slug: WEEKLY_COMMENT_BADGE,
        metadata: { comment_id: winner.row.id, week_start: weekStartDate },
      },
      { onConflict: 'user_id,badge_slug' },
    );

  const link = buildCommentLink(winner.row);

  await db.from('notifications').insert({
    user_id: winner.row.author_id,
    type: 'comment',
    title: '🔥 Comentário da semana',
    message: 'Ganhaste 88 XP e o badge por liderares as interações desta semana.',
    link,
    data: {
      comment_id: winner.row.id,
      week_start: weekStartDate,
      week_end: weekEndDate,
      reaction_points: winner.points,
    },
  });

  return {
    success: true,
    message: 'Weekly comment award assigned.',
    commentId: winner.row.id,
    userId: winner.row.author_id,
    points: winner.points,
    weekStart: weekStartDate,
    weekEnd: weekEndDate,
  };
}
