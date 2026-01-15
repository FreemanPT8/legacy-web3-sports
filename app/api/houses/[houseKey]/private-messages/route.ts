import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import {
  canSendPrivateMessage,
  classifyRole,
  MESSAGE_XP_THRESHOLD,
  NormalizedPrivateMessageRole,
  PrivateMessagePermissionReason,
} from '@/lib/private-messages';
import { syncUserHouseMembership } from '@/lib/user-houses';
import { getCountryCodeFromName } from '@/lib/countries';

const MESSAGE_FETCH_LIMIT = 40;

async function resolveHouse(houseKeyRaw: string) {
  if (!supabaseAdmin) return null;
  const houseKey = (houseKeyRaw || '').toUpperCase();
  if (!houseKey) return null;
  const { data, error } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id, name_i18n, country_code, sport_id')
    .eq('house_key', houseKey)
    .maybeSingle();
  if (error) {
    console.error('[private-messages] Failed to resolve house', error);
    return null;
  }
  return { ...data, houseKey };
}

async function ensureHouseMembership(userId: string, house: { id: string; houseKey: string; sport_id?: string | null; country_code?: string | null }) {
  if (!supabaseAdmin) return false;
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('primary_country_code, primary_sport_id, country, sport_id')
    .eq('id', userId)
    .maybeSingle();

  let houseSport = house.sport_id ?? null;
  const houseCountryFallback = house.houseKey.split('_').pop() ?? '';
  const houseCountry = (house.country_code ?? houseCountryFallback ?? '').toUpperCase();

  if (!houseSport) {
    const houseSportCode = house.houseKey.split('_')[0] ?? '';
    if (houseSportCode) {
      const { data: sportRow } = await supabaseAdmin
        .from('sports')
        .select('id, code')
        .ilike('code', houseSportCode)
        .maybeSingle();
      if (sportRow?.id) {
        houseSport = sportRow.id;
      }
    }
  }

  let userCountry =
    (userRow?.primary_country_code ?? '') ||
    (getCountryCodeFromName(userRow?.country) ?? '') ||
    '';
  if (!userCountry && userRow?.country) {
    userCountry = userRow.country.trim().slice(0, 2).toUpperCase();
  }

  const userSports = [userRow?.primary_sport_id ?? null, userRow?.sport_id ?? null]
    .filter((value): value is string => Boolean(value));

  const hasMatch = Boolean(houseSport && userSports.includes(houseSport) && userCountry.toUpperCase() === houseCountry);
  if (!hasMatch) return false;

  await supabaseAdmin
    .from('user_houses')
    .upsert(
      {
        user_id: userId,
        house_id: house.id,
        membership_role: 'MEMBER',
        assigned_via: 'PROFILE',
      },
      { onConflict: 'user_id,house_id,membership_role' },
    );
  return true;
}

async function loadMembershipMap(houseId: string, userIds: string[]) {
  if (!supabaseAdmin) return new Map<string, NormalizedPrivateMessageRole>();
  const { data, error } = await supabaseAdmin
    .from('user_houses')
    .select('user_id, membership_role')
    .eq('house_id', houseId)
    .is('removed_at', null)
    .in('user_id', userIds);
  if (error) {
    console.error('[private-messages] Failed to load memberships', error);
    return new Map<string, NormalizedPrivateMessageRole>();
  }

  const map = new Map<string, NormalizedPrivateMessageRole>();
  (data ?? []).forEach((row: { user_id: string | null; membership_role: string | null }) => {
    if (!row.user_id) return;
    const normalized = classifyRole(row.membership_role);
    const existing = map.get(row.user_id);
    if (!existing || existing === 'unknown') {
      map.set(row.user_id, normalized);
      return;
    }
    if (existing === 'member' && (normalized === 'head' || normalized === 'moderator')) {
      map.set(row.user_id, normalized);
    }
  });

  try {
    const { data: headRow } = await supabaseAdmin
      .from('house_heads')
      .select('admin_id')
      .eq('house_id', houseId)
      .maybeSingle();
    if (headRow?.admin_id) {
      const { data: assignment } = await supabaseAdmin
        .from('admin_assignments')
        .select('user_id')
        .eq('id', headRow.admin_id)
        .maybeSingle();
      if (assignment?.user_id && userIds.includes(assignment.user_id)) {
        map.set(assignment.user_id, 'head');
      }
    }

    const { data: modsRows } = await supabaseAdmin
      .from('house_moderators')
      .select('user_id')
      .eq('house_id', houseId)
      .in('user_id', userIds);
    (modsRows ?? []).forEach((row: { user_id: string | null }) => {
      if (row?.user_id) {
        map.set(row.user_id, 'moderator');
      }
    });
  } catch (error) {
    console.error('[private-messages] Failed to resolve staff roles', error);
  }

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

async function createMessageEvent(payload: {
  messageId: string;
  houseId: string;
  houseKey: string;
  actorId: string;
  eventType: 'read' | 'reply';
  metadata?: Record<string, unknown>;
}) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('house_private_message_events').insert({
      message_id: payload.messageId,
      house_id: payload.houseId,
      house_key: payload.houseKey,
      actor_id: payload.actorId,
      event_type: payload.eventType,
      metadata: payload.metadata ?? {},
    });
  } catch (error) {
    console.error('[private-messages] Failed to create message event', error);
  }
}

function buildMessagePayload(row: any, userMap: Record<string, any>, currentUserId: string) {
  const sender = userMap[row.sender_id] ?? null;
  const recipient = userMap[row.recipient_id] ?? null;
  const isSender = row.sender_id === currentUserId;
  const isRecipient = row.recipient_id === currentUserId;
  const isArchived = isSender
    ? Boolean(row.sender_archived_at)
    : isRecipient
      ? Boolean(row.recipient_archived_at)
      : false;
  return {
    id: row.id,
    subject: row.subject ?? 'Mensagem privada',
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    isIncoming: row.recipient_id === currentUserId,
    isUnread: !row.read_at && row.recipient_id === currentUserId,
    isArchived,
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

  let membership = await loadMembershipMap(house.id, [user.userId]);
  if (!membership.has(user.userId)) {
    await syncUserHouseMembership(user.userId, { assignedVia: 'PROFILE', logPrefix: 'private-messages' });
    membership = await loadMembershipMap(house.id, [user.userId]);
  }
  if (!membership.has(user.userId)) {
    await ensureHouseMembership(user.userId, house);
    membership = await loadMembershipMap(house.id, [user.userId]);
  }
  if (!membership.has(user.userId)) {
    const { data: messageRow, error: messageLookupError } = await supabaseAdmin
      .from('house_private_messages')
      .select('id')
      .eq('house_key', house.houseKey)
      .or(`sender_id.eq.${user.userId},recipient_id.eq.${user.userId}`)
      .limit(1)
      .maybeSingle();
    if (messageLookupError) {
      console.error('[private-messages] Failed to validate access by history', messageLookupError);
    }
    if (!messageRow) {
      return NextResponse.json({ success: false, error: 'Membership required.' }, { status: 403 });
    }
  }

  const limitParam = Number(request.nextUrl.searchParams.get('limit') || MESSAGE_FETCH_LIMIT);
  const limit = Math.min(Math.max(limitParam, 5), MESSAGE_FETCH_LIMIT);
  const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true';

  const query = supabaseAdmin
    .from('house_private_messages')
    .select(
      [
        'id',
        'subject',
        'body',
        'created_at',
        'read_at',
        'sender_id',
        'recipient_id',
        'house_id',
        'house_key',
        'sender_archived_at',
        'recipient_archived_at',
        'sender_deleted_at',
        'recipient_deleted_at',
      ].join(', '),
    )
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

  const includeArchived = request.nextUrl.searchParams.get('includeArchived') === 'true';
  const rows = (data ?? []).filter((row: any) => {
    if (row.sender_id === user.userId) {
      if (row.sender_deleted_at) return false;
      if (!includeArchived && row.sender_archived_at) return false;
    }
    if (row.recipient_id === user.userId) {
      if (row.recipient_deleted_at) return false;
      if (!includeArchived && row.recipient_archived_at) return false;
    }
    return true;
  });
  const participantCandidateIds = rows
    .flatMap((row: any) => [row.sender_id, row.recipient_id])
    .filter((id: unknown): id is string => typeof id === 'string');
  const participantSet = new Set<string>();
  participantCandidateIds.forEach((id: string) => participantSet.add(id));
  const participantIds = Array.from(participantSet) as string[];
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
  const replyToId = payload?.replyToId;

  if (!recipientId || !rawBody) {
    return NextResponse.json(
      { success: false, error: 'Recipient and body are required.' },
      { status: 400 },
    );
  }

  let membership = await loadMembershipMap(house.id, [user.userId, recipientId]);
  if (!membership.has(user.userId)) {
    await syncUserHouseMembership(user.userId, { assignedVia: 'PROFILE', logPrefix: 'private-messages' });
    membership = await loadMembershipMap(house.id, [user.userId, recipientId]);
  }
  if (!membership.has(user.userId)) {
    await ensureHouseMembership(user.userId, house);
    membership = await loadMembershipMap(house.id, [user.userId, recipientId]);
  }
  if (!membership.has(user.userId)) {
    return NextResponse.json({ success: false, error: 'Membership required.' }, { status: 403 });
  }

  if (!membership.has(recipientId)) {
    await syncUserHouseMembership(recipientId, { assignedVia: 'PROFILE', logPrefix: 'private-messages' });
    membership = await loadMembershipMap(house.id, [user.userId, recipientId]);
  }
  if (!membership.has(recipientId)) {
    await ensureHouseMembership(recipientId, house);
    membership = await loadMembershipMap(house.id, [user.userId, recipientId]);
  }

  let replyToMessageId: string | null = null;
  let replyParticipants: { senderId: string | null; recipientId: string | null } | null = null;
  if (replyToId) {
    const { data: replyRow } = await supabaseAdmin
      .from('house_private_messages')
      .select('id, house_id, house_key, sender_id, recipient_id')
      .eq('id', replyToId)
      .maybeSingle();
    if (replyRow?.id && replyRow.house_key === house.houseKey) {
      replyToMessageId = replyRow.id;
      replyParticipants = {
        senderId: replyRow.sender_id ?? null,
        recipientId: replyRow.recipient_id ?? null,
      };
    }
  }

  const recipientInThread =
    !!replyParticipants &&
    (replyParticipants.senderId === recipientId || replyParticipants.recipientId === recipientId);

  if (!membership.has(recipientId) && !recipientInThread) {
    return NextResponse.json({ success: false, error: 'Recipient not part of this House.' }, { status: 404 });
  }

  const senderRole = membership.get(user.userId) ?? 'member';
  const recipientRole = membership.get(recipientId) ?? 'member';
  const isSenderMember = senderRole === 'member' || senderRole === 'unknown';

  const permission = canSendPrivateMessage({
    senderRole,
    recipientRole,
    senderXp: user.xp_total ?? 0,
  });

  if (!permission.allowed) {
    const errorMessages: Record<PrivateMessagePermissionReason, string> = {
      'member-recipient-staff': 'Members can only message Heads or Moderators.',
      'staff-recipient-member': 'Heads and Moderators can only reach Members.',
      'xp-threshold': `${MESSAGE_XP_THRESHOLD} XP required to send private messages.`,
    };
    return NextResponse.json(
      { success: false, error: errorMessages[permission.reason] },
      { status: 403 },
    );
  }

  // replyToMessageId already resolved above

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
        reply_to_id: replyToMessageId,
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

  await createNotification(
    recipientId,
    'Nova mensagem da tua House',
    isSenderMember
      ? `O membro ${user.username || 'autor'} enviou uma nova mensagem privada.`
      : `Recebeste uma nova mensagem privada do Head da House.`,
    `/houses/${house.houseKey}`,
    { houseKey: house.houseKey, messageId: data.id },
  );

  if (replyToMessageId) {
    await createMessageEvent({
      messageId: replyToMessageId,
      houseId: house.id,
      houseKey: house.houseKey,
      actorId: user.userId,
      eventType: 'reply',
      metadata: { replyMessageId: data.id },
    });
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
  const action = payload?.action;
  if (!messageId) {
    return NextResponse.json({ success: false, error: 'Missing message id.' }, { status: 400 });
  }

  const { data: messageRow, error: messageError } = await supabaseAdmin
    .from('house_private_messages')
    .select(
      'id, sender_id, recipient_id, read_at, sender_archived_at, recipient_archived_at, sender_deleted_at, recipient_deleted_at',
    )
    .eq('id', messageId)
    .maybeSingle();
  if (messageError) {
    console.error('[private-messages] Failed to load message', messageError);
    return NextResponse.json({ success: false, error: 'Failed to load message.' }, { status: 500 });
  }
  if (!messageRow) {
    return NextResponse.json({ success: false, error: 'Message not found.' }, { status: 404 });
  }

  const isSender = user.userId === messageRow.sender_id;
  const isRecipient = user.userId === messageRow.recipient_id;
  if (!isSender && !isRecipient) {
    return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
  }

  if (action === 'archive' || action === 'unarchive' || action === 'delete') {
    const now = new Date().toISOString();
    const updates: Record<string, string | null> = {};
    if (isSender) {
      if (action === 'archive') updates.sender_archived_at = now;
      if (action === 'unarchive') updates.sender_archived_at = null;
      if (action === 'delete') updates.sender_deleted_at = now;
    }
    if (isRecipient) {
      if (action === 'archive') updates.recipient_archived_at = now;
      if (action === 'unarchive') updates.recipient_archived_at = null;
      if (action === 'delete') updates.recipient_deleted_at = now;
    }
    if (!Object.keys(updates).length) {
      return NextResponse.json({ success: false, error: 'No changes applied.' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('house_private_messages')
      .update(updates)
      .eq('id', messageId);
    if (updateError) {
      console.error('[private-messages] Failed to update message state', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update message.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (!isRecipient) {
    return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
  }

  if (messageRow.read_at) {
    return NextResponse.json({ success: true });
  }

  const now = new Date().toISOString();
  await supabaseAdmin
    .from('house_private_messages')
    .update({ read_at: now })
    .eq('id', messageId)
    .is('read_at', null);

  await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.userId)
    .eq('read', false)
    .contains('data', { messageId });

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

  await createMessageEvent({
    messageId,
    houseId: house.id,
    houseKey: house.houseKey,
    actorId: user.userId,
    eventType: 'read',
  });

  return NextResponse.json({ success: true });
}
