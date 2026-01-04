import type { UserRole } from '@/lib/permissions';

export type CommentContentType = 'lesson' | 'blog_post' | 'house';
export type CommentEmojiType = 'positive' | 'fire' | 'negative';

export type ViewerReactions = {
  positive: boolean;
  fire: boolean;
  negative: boolean;
};

export type CommentAuthor = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
};

export type CommentListItem = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
  contentType: CommentContentType;
  contentId: string;
  houseId: string | null;
  positiveCount: number;
  fireCount: number;
  negativeCount: number;
  reactionPoints: number;
  viewerReactions: ViewerReactions;
};

export type CommentQuota = {
  limit: number;
  used: number;
  remaining: number;
  unlocked: boolean;
};

export type ReactionQuota = {
  limit: number;
  used: number;
  remaining: number;
  unlocked: boolean;
};

export type CommentQuotaSnapshot = {
  comment: CommentQuota;
  reactions: Record<CommentEmojiType, ReactionQuota>;
};
