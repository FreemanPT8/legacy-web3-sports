export type NormalizedPrivateMessageRole = 'head' | 'moderator' | 'member' | 'unknown';

export const MESSAGE_XP_THRESHOLD = 369;

const ROLE_KEYWORDS: Record<'head' | 'moderator' | 'member', string[]> = {
  head: ['head', 'leader', 'captain'],
  moderator: ['moderator', 'mod'],
  member: ['member', 'membro', 'participant'],
};

const isRoleMember = (role: NormalizedPrivateMessageRole) =>
  role === 'member' || role === 'unknown';

const isRoleStaff = (role: NormalizedPrivateMessageRole) =>
  role === 'head' || role === 'moderator';

export function classifyRole(role: string | null | undefined): NormalizedPrivateMessageRole {
  const normalized = (role ?? '').toLowerCase();
  if (ROLE_KEYWORDS.head.some((key) => normalized.includes(key))) return 'head';
  if (ROLE_KEYWORDS.moderator.some((key) => normalized.includes(key))) return 'moderator';
  if (ROLE_KEYWORDS.member.some((key) => normalized.includes(key))) return 'member';
  if (normalized === '') return 'member';
  return 'unknown';
}

export type PrivateMessagePermissionReason =
  | 'member-recipient-staff'
  | 'staff-recipient-member'
  | 'xp-threshold';

export type PrivateMessagePermissionResult =
  | { allowed: true }
  | { allowed: false; reason: PrivateMessagePermissionReason };

export function canSendPrivateMessage({
  senderRole,
  recipientRole,
  senderXp = 0,
  xpThreshold = MESSAGE_XP_THRESHOLD,
}: {
  senderRole: NormalizedPrivateMessageRole;
  recipientRole: NormalizedPrivateMessageRole;
  senderXp?: number;
  xpThreshold?: number;
}): PrivateMessagePermissionResult {
  if (isRoleMember(senderRole) && !isRoleStaff(recipientRole)) {
    return { allowed: false, reason: 'member-recipient-staff' };
  }

  if (isRoleStaff(senderRole) && !isRoleMember(recipientRole)) {
    return { allowed: false, reason: 'staff-recipient-member' };
  }

  if (isRoleMember(senderRole) && senderXp < xpThreshold) {
    return { allowed: false, reason: 'xp-threshold' };
  }

  return { allowed: true };
}
