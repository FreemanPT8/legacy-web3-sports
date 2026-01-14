import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

const MESSAGE_XP_THRESHOLD = 369;
const MESSAGE_FETCH_LIMIT = 40;

const ROLE_KEYWORDS = {
  head: ['head', 'leader', 'captain'],
  moderator: ['moderator', 'mod'],
  member: ['member', 'membro', 'participant'],
} as const;

type NormalizedMentorship = 'head' | 'moderator' | 'member' | 'unknown';

function classifyRole(role: string | null | undefined): NormalizedMentorship {
  const normalized = (role ?? '').toLowerCase();
  if (ROLE_KEYWORDS.head.some((key) => normalized.includes(key))) return 'head';
  if (ROLE_KEYWORDS.moderator.some((key) => normalized.includes(key))) return 'moderator';
  if (ROLE_KEYWORDS.member.some((key) => normalized.includes(key))) return 'member';
  if (normalized === '') return 'member';
  return 'unknown';
}

async function resolveHouse(houseKeyRaw: string) {
  if (!supabaseAdmin) return null;
  const houseKey = (houseKeyRaw || '').toUpperCase();
  if (!houseKey) return null;
  const { data, error } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id, name_i18n, country_code')
    .eq('house_key', houseKey)
    .maybeSingle();
  if (error) {
    console.error('[private-messages] Failed to resolve house', error);
    return null;
  }
  return { ...data, houseKey };
}

async function loadMembershipMap(houseId: string, userIds: string[]) {
  if (!supabaseAdmin) return new Map<string, NormalizedMentorship>();
  const { data } = await supabaseAdmin
    .from('user_houses')
    .select('user_id, role')
    .eq('house_id', houseId)
    .is('removed_at', null)
    .in('user_id', userIds);

  const map = new Map<string, NormalizedMentorship>();
  (data ?? []).forEach((row: { user_id: string | null; role: string | null }) => {
    if (!row.user_id) return;
    const normalized = classifyRole(row.role);
    const existing = map.get(row.user_id);
    if (!existing || existing === 'unknown') {
      map.set(row.user_id, normalized);
      return;
    }
    if (existing === 'member' && (normalized === 'head' || normalized === 'moderator')) {
      map.set(row.user_id, normalized);
    }
  });

  userIds.forEach((id) => {
    if (!id) return;
    if (!map.has(id)) {
      map.set(id, 'member');
    }
  });

  return map;
}

async function loadUsers(userIds: string[]) {
  if (!supabaseAdmin) return [];
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  if (!uniqueIds.length) return [];
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, username, full_name, avatar_url, xp_total')
    .in('id', uniqueIds);
  return data ?? [];
}

async function createNotification(
  userId: string,
  title: string,
  message: string,
  link?: string,
  data?: Record<string, unknown>,
) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: 'house-message',
      title,
      message,
      link,
      data: data ?? {},
    });
  } catch (error) {
    console.error('[private-messages] Failed to create notification', error);
  }
}

function buildMessagePayload(row: any, userMap: Record<string, any>, currentUserId: string) {
  const sender = userMap[row.sender_id] ?? null;
  const recipient = userMap[row.recipient_id] ?? null;
  return {
    id: row.id,
    subject: row.subject ?? 'Mensagem privada',
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    isIncoming: row.recipient_id === currentUserId,
    isUnread: !row.read_at && row.recipient_id === currentUserId,
    sender: sender
      ? {
          id: sender.id,
          username: sender.username,
          name: sender.full_name || sender.username || 'Head of House',
          avatarUrl: sender.avatar_url,
        }
      : null,
    recipient: recipient
      ? {
          id: recipient.id,
          username: recipient.username,
          name: recipient.full_name || recipient.username || 'Head of House',
          avatarUrl: recipient.avatar_url,
        }
      : null,
  };
}

export async function GET(request: NextRequest, { params }: { params: { houseKey: string } }) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;
  const house = await resolveHouse(params.houseKey);
  if (!house) {
    return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
  }

  const membership = await loadMembershipMap(house.id, [user.userId]);
  if (!membership.has(user.userId)) {
    return NextResponse.json({ success: false, error: 'Membership required.' }, { status: 403 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get('limit') || MESSAGE_FETCH_LIMIT);
  const limit = Math.min(Math.max(limitParam, 5), MESSAGE_FETCH_LIMIT);
  const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true';

  const query = supabaseAdmin
    .from('house_private_messages')
    .select('id, subject, body, created_at, read_at, sender_id, recipient_id, house_id, house_key')
    .eq('house_key', house.houseKey)
    .or(`sender_id.eq.${user.userId},recipient_id.eq.${user.userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (unreadOnly) {
    query.eq('recipient_id', user.userId).is('read_at', null);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[private-messages] Failed to load messages', error);
    return NextResponse.json({ success: false, error: 'Failed to load private messages.' }, { status: 500 });
  }

  const rows = data ?? [];
  const rawIds = rows
    .flatMap((row: any) => [row.sender_id, row.recipient_id])
    .filter((id: unknown): id is string => typeof id === 'string');
  const participantIds = Array.from(new Set(rawIds));
  const users = await loadUsers(participantIds);
  const userMap: Record<string, any> = {};
  users.forEach((usr: any) => {
    userMap[usr.id] = usr;
  });

  const messages = rows.map((row: any) => buildMessagePayload(row, userMap, user.userId));

  return NextResponse.json({ success: true, messages });
}

export async function POST(request: NextRequest, { params }: { params: { houseKey: string } }) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;
  const house = await resolveHouse(params.houseKey);
  if (!house) {
    return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const recipientId = payload?.recipientId;
  const rawBody = (payload?.body || '').toString().trim();
  const subject = (payload?.subject || 'Mensagem da House').toString();

  if (!recipientId || !rawBody) {
    return NextResponse.json(
      { success: false, error: 'Recipient and body are required.' },
      { status: 400 },
    );
  }

  const membership = await loadMembershipMap(house.id, [user.userId, recipientId]);
  const senderRole = membership.get(user.userId) ?? 'member';
  const recipientRole = membership.get(recipientId) ?? 'member';

  if (!membership.has(recipientId)) {
    return NextResponse.json({ success: false, error: 'Recipient not part of this House.' }, { status: 404 });
  }

  const isSenderMember = senderRole === 'member' || senderRole === 'unknown';
  const isSenderStaff = senderRole === 'head' || senderRole === 'moderator';
  const isRecipientStaff = recipientRole === 'head' || recipientRole === 'moderator';
  const isRecipientMember = recipientRole === 'member' || recipientRole === 'unknown';

  if (isSenderMember && !isRecipientStaff) {
    return NextResponse.json(
      { success: false, error: 'Members can only message Heads or Moderators.' },
      { status: 403 },
    );
  }
  if (isSenderStaff && !isRecipientMember) {
    return NextResponse.json(
      { success: false, error: 'Heads and Moderators can only reach Members.' },
      { status: 403 },
    );
  }

  if (isSenderMember && (user.xp_total ?? 0) < MESSAGE_XP_THRESHOLD) {
    return NextResponse.json(
      { success: false, error: '369 XP required to send private messages.' },
      { status: 403 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from('house_private_messages')
    .insert([
      {
        house_id: house.id,
        house_key: house.houseKey,
        sender_id: user.userId,
        recipient_id: recipientId,
        subject,
        body: rawBody,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('[private-messages] Failed to insert message', error);
    return NextResponse.json({ success: false, error: 'Failed to send message.' }, { status: 500 });
  }

  const users = await loadUsers([user.userId, recipientId]);
  const userMap: Record<string, any> = {};
  users.forEach((usr: any) => {
    userMap[usr.id] = usr;
  });

  const inserted = buildMessagePayload(data, userMap, user.userId);

  if (isSenderMember) {
    await createNotification(
      recipientId,
      'Nova mensagem da tua House',
      `O membro ${user.username || 'autor'} enviou uma nova mensagem privada.`,
      `/houses/${house.houseKey}`,
      { houseKey: house.houseKey, messageId: data.id },
    );
  }

  return NextResponse.json({ success: true, message: inserted });
}

export async function PATCH(request: NextRequest, { params }: { params: { houseKey: string } }) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;
  const house = await resolveHouse(params.houseKey);
  if (!house) {
    return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const messageId = payload?.messageId;
  if (!messageId) {
    return NextResponse.json({ success: false, error: 'Missing message id.' }, { status: 400 });
  }

  const { data: messageRow, error: messageError } = await supabaseAdmin
    .from('house_private_messages')
    .select('id, sender_id, recipient_id, read_at')
    .eq('id', messageId)
    .maybeSingle();
  if (messageError) {
    console.error('[private-messages] Failed to load message', messageError);
    return NextResponse.json({ success: false, error: 'Failed to load message.' }, { status: 500 });
  }
  if (!messageRow) {
    return NextResponse.json({ success: false, error: 'Message not found.' }, { status: 404 });
  }

  if (user.userId !== messageRow.recipient_id && user.userId !== messageRow.sender_id) {
    return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
  }

  const now = new Date().toISOString();
  await supabaseAdmin
    .from('house_private_messages')
    .update({ read_at: now })
    .eq('id', messageId);

  const membership = await loadMembershipMap(house.id, [user.userId, messageRow.sender_id]);
  const userRole = membership.get(user.userId) ?? 'member';
  const senderRole = membership.get(messageRow.sender_id) ?? 'member';

  const isMemberReading = userRole === 'member' || userRole === 'unknown';
  const senderIsStaff = senderRole === 'head' || senderRole === 'moderator';

  if (user.userId === messageRow.recipient_id && isMemberReading && senderIsStaff) {
    await createNotification(
      messageRow.sender_id,
      'Mensagem lida',
      `O membro ${user.username || 'da tua House'} abriu a tua mensagem privada.`,
      `/houses/${house.houseKey}`,
      { houseKey: house.houseKey, messageId },
    );
  }

  return NextResponse.json({ success: true });
}
