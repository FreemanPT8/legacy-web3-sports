import { supabase, supabaseAdmin } from '@/lib/supabase';
import { ensureUserRole } from '@/lib/roles';
import type { UserRole } from '@/lib/permissions';
import type {
  CommentAuthor,
  CommentContentType,
  CommentEmojiType,
  CommentListItem,
  CommentQuota,
  CommentQuotaSnapshot,
  ReactionQuota,
  ViewerReactions,
} from '@/types/comments';

const db = supabaseAdmin ?? supabase;

export const COMMENT_UNLOCK_XP = 369;
const MEMBER_COMMENT_LIMIT = 8;
const PRIVILEGED_COMMENT_LIMIT = 33;
const COMMENT_MIN_LENGTH = 3;
const COMMENT_MAX_LENGTH = 2000;

const PRIVILEGED_ROLES = new Set<UserRole>(['Super Admin', 'Admin']);
const LEADERSHIP_MEMBERSHIP_ROLES = new Set(['HEAD', 'MODERATOR']);

type CommentUsageAction =
  | 'comment'
  | 'emoji_positive'
  | 'emoji_fire'
  | 'emoji_negative';

const REACTION_LIMITS: Record<CommentEmojiType, number> = {
  positive: 5,
  fire: 1,
  negative: 1,
};

type UserContext = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  xp_total: number;
  role: UserRole;
  isPrivileged: boolean;
};

type CommentRow = {
  id: string;
  content_type: CommentContentType;
  content_id: string;
  house_id: string | null;
  author_id: string;
  body: string;
  visibility: 'public' | 'house';
  metadata: Record<string, any> | null;
  positive_count: number;
  fire_count: number;
  negative_count: number;
  created_at: string;
  updated_at: string;
};

export type ListCommentsParams = {
  userId: string;
  contentId: string;
  contentType: CommentContentType;
  houseId?: string | null;
  limit?: number;
  cursor?: string | null;
};

export type ListCommentsResult = {
  success: boolean;
  comments?: CommentListItem[];
  nextCursor?: string | null;
  quotas?: CommentQuotaSnapshot;
  error?: string;
};

export type CreateCommentParams = {
  userId: string;
  contentId: string;
  contentType: CommentContentType;
  body: string;
  houseId?: string | null;
};

export type CreateCommentResult = {
  success: boolean;
  comment?: CommentListItem;
  quotas?: CommentQuotaSnapshot;
  error?: string;
};

export type ReactToCommentParams = {
  userId: string;
  commentId: string;
  emoji: CommentEmojiType;
  action: 'add' | 'remove';
};

export type ReactToCommentResult = {
  success: boolean;
  comment?: CommentListItem;
  quotas?: CommentQuotaSnapshot;
  error?: string;
};

function formatViewerReactions(): ViewerReactions {
  return { positive: false, fire: false, negative: false };
}

async function loadUserContext(userId: string): Promise<UserContext | null> {
  const { data, error } = await db
    .from('users')
    .select('id, username, full_name, avatar_url, role, xp_total')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const canonicalRole = ensureUserRole(data.role);

  let isPrivileged = PRIVILEGED_ROLES.has(canonicalRole);

  if (!isPrivileged) {
    const { data: leadershipRows } = await db
      .from('user_houses')
      .select('house_id, membership_role')
      .eq('user_id', userId)
      .in('membership_role', Array.from(LEADERSHIP_MEMBERSHIP_ROLES))
      .limit(1);

    if (leadershipRows && leadershipRows.length > 0) {
      isPrivileged = true;
    }
  }

  return {
    id: data.id,
    username: data.username,
    full_name: data.full_name,
    avatar_url: data.avatar_url,
    xp_total: data.xp_total ?? 0,
    role: canonicalRole,
    isPrivileged,
  };
}

async function getHouseMembershipRole(
  userId: string,
  houseId: string,
): Promise<string | null> {
  const { data, error } = await db
    .from('user_houses')
    .select('membership_role')
    .eq('user_id', userId)
    .eq('house_id', houseId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching house membership:', error);
    return null;
  }

  return data?.membership_role ?? null;
}

async function verifyContentExists(
  contentType: CommentContentType,
  contentId: string,
): Promise<boolean> {
  let tableName = 'lessons';
  if (contentType === 'blog_post') tableName = 'blog_posts';
  if (contentType === 'house') tableName = 'houses_of_sports';

  const { data, error } = await db
    .from(tableName)
    .select('id')
    .eq('id', contentId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('verifyContentExists error:', error);
    return false;
  }

  return Boolean(data);
}

async function getDailyUsage(
  userId: string,
  action: CommentUsageAction,
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await db
    .from('comment_daily_usage')
    .select('used_count')
    .eq('user_id', userId)
    .eq('action_type', action)
    .eq('usage_date', today)
    .maybeSingle();

  if (error) {
    console.error('getDailyUsage error:', error);
    return 0;
  }

  return data?.used_count ?? 0;
}

async function incrementDailyUsage(
  userId: string,
  action: CommentUsageAction,
  delta = 1,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing, error: existingError } = await db
    .from('comment_daily_usage')
    .select('id, used_count')
    .eq('user_id', userId)
    .eq('action_type', action)
    .eq('usage_date', today)
    .maybeSingle();

  if (existingError) {
    console.error('incrementDailyUsage lookup error:', existingError);
    return;
  }

  if (existing) {
    const { error } = await db
      .from('comment_daily_usage')
      .update({
        used_count: existing.used_count + delta,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      console.error('incrementDailyUsage update error:', error);
    }
    return;
  }

  const { error } = await db.from('comment_daily_usage').insert({
    user_id: userId,
    action_type: action,
    usage_date: today,
    used_count: delta,
  });

  if (error) {
    console.error('incrementDailyUsage insert error:', error);
  }
}

function buildCommentQuotaSnapshot(
  user: UserContext,
  commentUsage: number,
  reactionUsage: Record<CommentEmojiType, number>,
): CommentQuotaSnapshot {
  const commentLimit = user.isPrivileged
    ? PRIVILEGED_COMMENT_LIMIT
    : MEMBER_COMMENT_LIMIT;
  const unlocked = user.xp_total >= COMMENT_UNLOCK_XP;
  const remaining = Math.max(commentLimit - commentUsage, 0);

  const commentQuota: CommentQuota = {
    limit: commentLimit,
    used: commentUsage,
    remaining,
    unlocked,
  };

  const reactionsQuota = Object.entries(REACTION_LIMITS).reduce(
    (acc, [emoji, limit]) => {
      const used = reactionUsage[emoji as CommentEmojiType] ?? 0;
      acc[emoji as CommentEmojiType] = {
        limit,
        used,
        remaining: Math.max(limit - used, 0),
        unlocked,
      };
      return acc;
    },
    {} as Record<CommentEmojiType, ReactionQuota>,
  );

  return {
    comment: commentQuota,
    reactions: reactionsQuota,
  };
}

async function buildQuotaSnapshot(user: UserContext): Promise<CommentQuotaSnapshot> {
  const [commentUsage, positiveUsage, fireUsage, negativeUsage] =
    await Promise.all([
      getDailyUsage(user.id, 'comment'),
      getDailyUsage(user.id, 'emoji_positive'),
      getDailyUsage(user.id, 'emoji_fire'),
      getDailyUsage(user.id, 'emoji_negative'),
    ]);

  return buildCommentQuotaSnapshot(user, commentUsage, {
    positive: positiveUsage,
    fire: fireUsage,
    negative: negativeUsage,
  });
}

function mapRowToComment(
  row: CommentRow,
  author: CommentAuthor,
  viewerReactions: ViewerReactions,
): CommentListItem {
  const reactionPoints = row.positive_count + row.fire_count * 2;

  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author,
    contentType: row.content_type,
    contentId: row.content_id,
    houseId: row.house_id,
    positiveCount: row.positive_count,
    fireCount: row.fire_count,
    negativeCount: row.negative_count,
    viewerReactions,
    reactionPoints,
  };
}

async function fetchCommentAuthor(authorId: string): Promise<CommentAuthor | null> {
  const { data, error } = await db
    .from('users')
    .select('id, username, full_name, avatar_url, role')
    .eq('id', authorId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    full_name: data.full_name,
    avatar_url: data.avatar_url,
    role: ensureUserRole(data.role),
  };
}

async function loadViewerReactions(
  commentIds: string[],
  userId: string,
): Promise<Record<string, ViewerReactions>> {
  if (!commentIds.length) {
    return {};
  }

  const { data, error } = await db
    .from('comment_reactions')
    .select('comment_id, emoji_type')
    .in('comment_id', commentIds)
    .eq('user_id', userId);

  if (error || !data) {
    if (error) {
      console.error('loadViewerReactions error:', error);
    }
    return {};
  }

  const map: Record<string, ViewerReactions> = {};

  commentIds.forEach((id) => {
    map[id] = formatViewerReactions();
  });

  data.forEach((reaction: { comment_id: string; emoji_type: string }) => {
    if (!map[reaction.comment_id]) {
      map[reaction.comment_id] = formatViewerReactions();
    }
    const emoji = reaction.emoji_type as CommentEmojiType;
    map[reaction.comment_id][emoji] = true;
  });

  return map;
}

async function canAccessHouse(
  user: UserContext,
  houseId: string,
): Promise<boolean> {
  if (!houseId) return false;
  if (PRIVILEGED_ROLES.has(user.role)) return true;

  const membershipRole = await getHouseMembershipRole(user.id, houseId);
  return Boolean(membershipRole);
}

export async function listComments(
  params: ListCommentsParams,
): Promise<ListCommentsResult> {
  const { userId, contentId, contentType, houseId, limit = 25, cursor } = params;

  if (!userId || !contentId) {
    return { success: false, error: 'Missing required identifiers.' };
  }

  const user = await loadUserContext(userId);
  if (!user) {
    return { success: false, error: 'User not found.' };
  }

  if (contentType === 'house') {
    const resolvedHouseId = houseId || contentId;
    const allowed = await canAccessHouse(user, resolvedHouseId);
    if (!allowed) {
      return { success: false, error: 'House access denied.' };
    }
  }

  const query = db
    .from('content_comments')
    .select(
      'id, content_type, content_id, house_id, author_id, body, visibility, metadata, positive_count, fire_count, negative_count, created_at, updated_at',
    )
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(limit + 1);

  if (cursor) {
    query.gt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('listComments error:', error);
    return { success: false, error: 'Failed to load comments.' };
  }

  const rows = (data ?? []) as CommentRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const authorIds = Array.from(new Set(pageRows.map((row) => row.author_id)));
  const { data: authorsData } = await db
    .from('users')
    .select('id, username, full_name, avatar_url, role')
    .in('id', authorIds);

  const authorMap = new Map<string, CommentAuthor>();
  (authorsData ?? []).forEach((author: { id: string; username: string | null; full_name?: string | null; avatar_url?: string | null; role?: UserRole }) => {
    authorMap.set(author.id, {
      id: author.id,
      username: author.username ?? null,
      full_name: author.full_name ?? null,
      avatar_url: author.avatar_url ?? null,
      role: ensureUserRole(author.role),
    });
  });

  const viewerReactionsMap = await loadViewerReactions(
    pageRows.map((row) => row.id),
    userId,
  );

  const comments: CommentListItem[] = pageRows.map((row) => {
    const author = authorMap.get(row.author_id) ?? {
      id: row.author_id,
      username: null,
      full_name: null,
      avatar_url: null,
      role: 'Member' as UserRole,
    };

    return mapRowToComment(
      row,
      author,
      viewerReactionsMap[row.id] ?? formatViewerReactions(),
    );
  });

  const quotas = await buildQuotaSnapshot(user);

  return {
    success: true,
    comments,
    nextCursor: hasMore ? comments[comments.length - 1]?.createdAt ?? null : null,
    quotas,
  };
}

export async function createComment(
  params: CreateCommentParams,
): Promise<CreateCommentResult> {
  const { userId, contentId, contentType, body, houseId } = params;

  if (!userId || !contentId) {
    return { success: false, error: 'Missing required identifiers.' };
  }

  const sanitizedBody = (body || '').trim();
  if (
    sanitizedBody.length < COMMENT_MIN_LENGTH ||
    sanitizedBody.length > COMMENT_MAX_LENGTH
  ) {
    return {
      success: false,
      error: `Comentário precisa de ${COMMENT_MIN_LENGTH}-${COMMENT_MAX_LENGTH} caracteres.`,
    };
  }

  const user = await loadUserContext(userId);
  if (!user) {
    return { success: false, error: 'User not found.' };
  }

  const quotas = await buildQuotaSnapshot(user);
  if (!quotas.comment.unlocked) {
    return {
      success: false,
      quotas,
      error: 'Comentar desbloqueia aos 369 XP.',
    };
  }

  if (quotas.comment.remaining <= 0) {
    return {
      success: false,
      quotas,
      error: 'Limite diário de comentários atingido.',
    };
  }

  const targetExists = await verifyContentExists(contentType, contentId);
  if (!targetExists) {
    return { success: false, quotas, error: 'Conteúdo não encontrado.' };
  }

  let resolvedHouseId: string | null = null;
  let visibility: 'public' | 'house' = 'public';

  if (contentType === 'house') {
    resolvedHouseId = houseId || contentId;
    visibility = 'house';

    const hasAccess = await canAccessHouse(user, resolvedHouseId);
    if (!hasAccess) {
      return {
        success: false,
        quotas,
        error: 'Não tens acesso a esta House.',
      };
    }
  }

  const insertPayload = {
    content_type: contentType,
    content_id: contentId,
    house_id: resolvedHouseId,
    author_id: userId,
    body: sanitizedBody,
    visibility,
    metadata: {},
  };

  const { data, error } = await db
    .from('content_comments')
    .insert(insertPayload)
    .select(
      'id, content_type, content_id, house_id, author_id, body, visibility, metadata, positive_count, fire_count, negative_count, created_at, updated_at',
    )
    .single();

  if (error || !data) {
    console.error('createComment insert error:', error);
    return { success: false, quotas, error: 'Falha ao criar comentário.' };
  }

  const author: CommentAuthor = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    role: user.role,
  };

  await incrementDailyUsage(user.id, 'comment', 1);
  const refreshedQuotas = await buildQuotaSnapshot(user);

  return {
    success: true,
    comment: mapRowToComment(
      data as CommentRow,
      author,
      formatViewerReactions(),
    ),
    quotas: refreshedQuotas,
  };
}

export async function reactToComment(
  params: ReactToCommentParams,
): Promise<ReactToCommentResult> {
  const { userId, commentId, emoji, action } = params;

  const user = await loadUserContext(userId);
  if (!user) {
    return { success: false, error: 'User not found.' };
  }

  const { data: commentRow, error: commentError } = await db
    .from('content_comments')
    .select(
      'id, content_type, content_id, house_id, author_id, body, visibility, metadata, positive_count, fire_count, negative_count, created_at, updated_at',
    )
    .eq('id', commentId)
    .is('deleted_at', null)
    .maybeSingle();

  if (commentError || !commentRow) {
    return { success: false, error: 'Comentário não encontrado.' };
  }

  const comment = commentRow as CommentRow;

  if (comment.visibility === 'house' && comment.house_id) {
    const allowed = await canAccessHouse(user, comment.house_id);
    if (!allowed) {
      return { success: false, error: 'Não tens acesso a esta House.' };
    }
  }

  const quotas = await buildQuotaSnapshot(user);
  if (!quotas.comment.unlocked) {
    return {
      success: false,
      quotas,
      error: 'Reagir desbloqueia aos 369 XP.',
    };
  }

  const usageKey = (`emoji_${emoji}`) as CommentUsageAction;
  const quota = quotas.reactions[emoji];

  if (action === 'add' && quota.remaining <= 0) {
    return {
      success: false,
      quotas,
      error: 'Limite diário para este emoji foi atingido.',
    };
  }

  const { data: existing } = await db
    .from('comment_reactions')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .eq('emoji_type', emoji)
    .maybeSingle();

  if (action === 'remove') {
    if (!existing) {
      const snapshot = await getCommentSnapshotOrFallback(commentId, comment, userId);
      return {
        success: true,
        comment: snapshot,
        quotas,
      };
    }

    const { error } = await db
      .from('comment_reactions')
      .delete()
      .eq('id', existing.id);

    if (error) {
      console.error('reactToComment delete error:', error);
      return { success: false, quotas, error: 'Falha ao remover reação.' };
    }

    const refreshedComment = await getCommentSnapshotOrFallback(commentId, comment, userId);
    const refreshedQuotas = await buildQuotaSnapshot(user);

    return {
      success: true,
      comment: refreshedComment,
      quotas: refreshedQuotas,
    };
  }

  if (existing) {
    const snapshot = await getCommentSnapshotOrFallback(commentId, comment, userId);
    return {
      success: true,
      comment: snapshot,
      quotas,
    };
  }

  const { error: insertError } = await db
    .from('comment_reactions')
    .insert({
      comment_id: commentId,
      user_id: userId,
      emoji_type: emoji,
    });

  if (insertError) {
    console.error('reactToComment insert error:', insertError);
    return { success: false, quotas, error: 'Falha ao reagir ao comentário.' };
  }

  await incrementDailyUsage(userId, usageKey, 1);

  const updatedComment = await getCommentSnapshotOrFallback(commentId, comment, userId);
  const refreshedQuotas = await buildQuotaSnapshot(user);

  return {
    success: true,
    comment: updatedComment,
    quotas: refreshedQuotas,
  };
}

async function listCommentById(
  commentId: string,
  userId: string,
): Promise<CommentListItem | null> {
  const { data, error } = await db
    .from('content_comments')
    .select(
      'id, content_type, content_id, house_id, author_id, body, visibility, metadata, positive_count, fire_count, negative_count, created_at, updated_at',
    )
    .eq('id', commentId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error('listCommentById error:', error);
    }
    return null;
  }

  const author =
    (await fetchCommentAuthor(data.author_id)) ?? {
      id: data.author_id,
      username: null,
      full_name: null,
      avatar_url: null,
      role: 'Member' as UserRole,
    };

  const reactions = await loadViewerReactions([data.id], userId);
  const viewerReactions = reactions[data.id] ?? formatViewerReactions();

  return mapRowToComment(data as CommentRow, author, viewerReactions);
}

async function getCommentSnapshotOrFallback(
  commentId: string,
  fallbackRow: CommentRow,
  userId: string,
): Promise<CommentListItem> {
  const snapshot = await listCommentById(commentId, userId);
  if (snapshot) return snapshot;

  const author =
    (await fetchCommentAuthor(fallbackRow.author_id)) ?? {
      id: fallbackRow.author_id,
      username: null,
      full_name: null,
      avatar_url: null,
      role: 'Member' as UserRole,
    };

  const reactions = await loadViewerReactions([fallbackRow.id], userId);
  return mapRowToComment(
    fallbackRow,
    author,
    reactions[fallbackRow.id] ?? formatViewerReactions(),
  );
}
