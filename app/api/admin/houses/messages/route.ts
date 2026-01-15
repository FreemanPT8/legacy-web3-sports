import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { hasGlobalPermission } from '@/lib/server/permissions';

type HouseOption = {
  houseKey: string;
  label: string;
};

const STATUS_FILTERS = {
  all: 'all',
  unread: 'unread',
  read: 'read',
  open: 'open',
  sent: 'sent',
} as const;

function resolveHouseName(row: any) {
  const localization = (row.name_i18n as Record<string, string> | null) ?? {};
  return (
    localization?.pt ||
    localization?.en ||
    localization?.es ||
    row.house_key ||
    'House'
  );
}

async function resolveAccessibleHouses(user: { userId: string; role: string }): Promise<HouseOption[]> {
  if (!supabaseAdmin) return [];

  const { data: housesData, error: housesError } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id, house_key, name_i18n');
  if (housesError) {
    console.error('[admin/houses/messages] Failed to load houses for fallback', housesError);
    return [];
  }

  if (user.role === 'Super Admin') {
    return (housesData ?? [])
      .map((house: any) => {
        const rawKey = (house.house_key || '').trim();
        if (!rawKey) return null;
        const upperKey = rawKey.toUpperCase();
        return {
          houseKey: upperKey,
          label: resolveHouseName(house),
        };
      })
      .filter(Boolean) as HouseOption[];
  }

  const candidateHouses = new Map<string, HouseOption>();
  const houseIdToKey = new Map<string, HouseOption>();
  (housesData ?? []).forEach((house: any) => {
    const rawKey = (house.house_key || '').trim();
    if (!rawKey) return;
    const upperKey = rawKey.toUpperCase();
    const option = {
      houseKey: upperKey,
      label: resolveHouseName(house),
    };
    candidateHouses.set(upperKey, option);
    if (house.id) {
      houseIdToKey.set(house.id, option);
    }
  });

  const staffHouseIds = new Set<string>();

  const { data: assignments } = await supabaseAdmin
    .from('admin_assignments')
    .select('id')
    .eq('user_id', user.userId);
  const adminIds = (assignments ?? []).map((row: any) => row.id).filter(Boolean);
  if (adminIds.length) {
    const { data: headRows } = await supabaseAdmin
      .from('house_heads')
      .select('house_id')
      .in('admin_id', adminIds);
    (headRows ?? []).forEach((row: any) => {
      if (row?.house_id) staffHouseIds.add(row.house_id);
    });
  }

  const { data: moderatorRows } = await supabaseAdmin
    .from('house_moderators')
    .select('house_id')
    .eq('user_id', user.userId);
  (moderatorRows ?? []).forEach((row: any) => {
    if (row?.house_id) staffHouseIds.add(row.house_id);
  });

  const { data: membershipRows } = await supabaseAdmin
    .from('user_houses')
    .select('house_id, membership_role')
    .eq('user_id', user.userId)
    .is('removed_at', null);
  (membershipRows ?? []).forEach((row: any) => {
    const role = (row?.membership_role || '').toString().toLowerCase();
    if ((role === 'head' || role === 'moderator') && row?.house_id) {
      staffHouseIds.add(row.house_id);
    }
  });

  const result = Array.from(staffHouseIds)
    .map((houseId) => houseIdToKey.get(houseId))
    .filter(Boolean) as HouseOption[];

  return result;
}

async function fetchUsersByIds(userIds: string[]) {
  if (!supabaseAdmin) return [];
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  if (!uniqueIds.length) return [];
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, username, full_name, avatar_url')
    .in('id', uniqueIds);
  if (error) {
    console.error('[admin/houses/messages] Failed to load users', error);
    return [];
  }
  return data ?? [];
}

async function fetchMembershipRoles(houseIds: string[], userIds: string[]) {
  if (!supabaseAdmin) return new Map<string, string>();
  const uniqueHouseIds = Array.from(new Set(houseIds)).filter(Boolean);
  const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean);
  if (!uniqueHouseIds.length || !uniqueUserIds.length) {
    return new Map<string, string>();
  }

  const { data, error } = await supabaseAdmin
    .from('user_houses')
    .select('house_id, user_id, membership_role')
    .in('house_id', uniqueHouseIds)
    .in('user_id', uniqueUserIds)
    .is('removed_at', null);
  if (error) {
    console.error('[admin/houses/messages] Failed to load user roles', error);
    return new Map<string, string>();
  }

  const map = new Map<string, string>();
  (data ?? []).forEach((row: any) => {
    if (!row?.house_id || !row?.user_id) return;
    map.set(`${row.house_id}:${row.user_id}`, (row.membership_role || '').toString().toLowerCase());
  });

  try {
    const { data: adminAssignments } = await supabaseAdmin
      .from('admin_assignments')
      .select('id, user_id')
      .in('user_id', uniqueUserIds);
    const adminIdMap = new Map<string, string>();
    (adminAssignments ?? []).forEach((row: any) => {
      if (row?.id && row?.user_id) {
        adminIdMap.set(row.id, row.user_id);
      }
    });

    if (adminIdMap.size) {
      const { data: headRows } = await supabaseAdmin
        .from('house_heads')
        .select('house_id, admin_id')
        .in('house_id', uniqueHouseIds)
        .in('admin_id', Array.from(adminIdMap.keys()));
      (headRows ?? []).forEach((row: any) => {
        const userId = adminIdMap.get(row.admin_id);
        if (!row?.house_id || !userId) return;
        map.set(`${row.house_id}:${userId}`, 'head');
      });
    }

    const { data: moderatorRows } = await supabaseAdmin
      .from('house_moderators')
      .select('house_id, user_id')
      .in('house_id', uniqueHouseIds)
      .in('user_id', uniqueUserIds);
    (moderatorRows ?? []).forEach((row: any) => {
      if (!row?.house_id || !row?.user_id) return;
      map.set(`${row.house_id}:${row.user_id}`, 'moderator');
    });
  } catch (error) {
    console.error('[admin/houses/messages] Failed to resolve staff roles', error);
  }

  return map;
}

async function fetchMessageEvents(messageIds: string[]) {
  if (!supabaseAdmin) return [];
  const uniqueIds = Array.from(new Set(messageIds)).filter(Boolean);
  if (!uniqueIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('house_private_message_events')
    .select('id, message_id, actor_id, event_type, created_at, metadata')
    .in('message_id', uniqueIds)
    .order('created_at', { ascending: true });
  if (error) {
    if (error.code !== '42P01') {
      console.error('[admin/houses/messages] Failed to load message events', error);
    }
    return [];
  }
  return data ?? [];
}

function buildMessageResponse(row: any, housesMap: Record<string, string>, userMap: Record<string, any>) {
  const sender = userMap[row.sender_id] ?? null;
  const recipient = userMap[row.recipient_id] ?? null;
  const houseLabel = housesMap[row.house_key] ?? row.house_key;

  return {
    id: row.id,
    houseId: row.house_id,
    houseKey: row.house_key,
    houseLabel,
    subject: row.subject || 'Mensagem privada',
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    status: row.read_at ? 'read' : 'unread',
    sender: sender
      ? {
          id: sender.id,
          name: sender.full_name || sender.username || 'Head of House',
          username: sender.username,
          avatarUrl: sender.avatar_url,
        }
      : null,
    recipient: recipient
      ? {
          id: recipient.id,
          name: recipient.full_name || recipient.username || 'Membro',
          username: recipient.username,
          avatarUrl: recipient.avatar_url,
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response!;
    const user = auth.user!;
    const hasManageHouses = await hasGlobalPermission(user, 'canManageHouses');

    const houses = await resolveAccessibleHouses(user);
    if (!hasManageHouses && user.role !== 'Super Admin' && houses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 },
      );
    }
    if (!houses.length) {
      return NextResponse.json({
        success: true,
        messages: [],
        total: 0,
        houses: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const houseKeyFilter = (searchParams.get('house') || '').toUpperCase();
    const statusFilter = (searchParams.get('status') || 'all') as keyof typeof STATUS_FILTERS;
    const directionFilter = (searchParams.get('direction') || 'all').toLowerCase();
    const searchTerm = (searchParams.get('q') || '').trim();
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 25), 5), 100);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);
    const prefetchLimit = offset + limit;

    const allowedHouseKeys = Array.from(
      new Set(houses.map((h) => h.houseKey).filter(Boolean)),
    );
    if (!allowedHouseKeys.length) {
      return NextResponse.json({
        success: true,
        messages: [],
        total: 0,
        houses: [],
      });
    }

    let query = supabaseAdmin
      .from('house_private_messages')
      .select(
        'id, house_id, house_key, subject, body, created_at, read_at, sender_id, recipient_id, reply_to_id, sender_archived_at, recipient_archived_at, sender_deleted_at, recipient_deleted_at',
        { count: 'exact' },
      )
      .in('house_key', allowedHouseKeys)
      .order('created_at', { ascending: false });

    if (houseKeyFilter) {
      query = query.eq('house_key', houseKeyFilter);
    }

    if (statusFilter === 'unread') {
      query = query.is('read_at', null);
    } else if (statusFilter === 'read') {
      query = query.not('read_at', 'is', null);
    }

    if (searchTerm) {
      const normalized = `%${searchTerm.replace(/%/g, '')}%`;
      query = query.or(`subject.ilike.${normalized},body.ilike.${normalized}`);
    }

    const { data, error, count } = await query.limit(prefetchLimit);
    if (error) {
      throw error;
    }

    const rawRows = (data ?? []).slice(offset, offset + limit);
    const rows =
      user.role === 'Super Admin'
        ? rawRows
        : rawRows.filter((row: any) => {
            if (row.sender_deleted_at && row.recipient_deleted_at) return false;
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
    const participantIds = Array.from(participantSet);
    const houseIds = rows.map((row: any) => row.house_id).filter(Boolean) as string[];
    const roleMap = await fetchMembershipRoles(houseIds, participantIds);

    const messageIds = rows.map((row: any) => row.id).filter(Boolean) as string[];
    const events = await fetchMessageEvents(messageIds);
    const eventActorIds = events
      .map((event: any) => event.actor_id)
      .filter((id: unknown): id is string => typeof id === 'string');
    const users = await fetchUsersByIds([...participantIds, ...eventActorIds]);
    const userMap: Record<string, any> = {};
    users.forEach((row: any) => {
      if (row?.id) {
        userMap[row.id] = row;
      }
    });

    const housesMap: Record<string, string> = {};
    const replyAllowedHouseKeys = new Set<string>();
    houses.forEach((house) => {
      housesMap[house.houseKey] = house.label;
      replyAllowedHouseKeys.add(house.houseKey);
    });

    const eventMap = new Map<string, any[]>();
    (events ?? []).forEach((event: any) => {
      if (!event?.message_id) return;
      const list = eventMap.get(event.message_id) ?? [];
      list.push(event);
      eventMap.set(event.message_id, list);
    });

    let messages = rows.map((row: any) => {
      const base = buildMessageResponse(row, housesMap, userMap);
      const senderRole = roleMap.get(`${row.house_id}:${row.sender_id}`) || 'member';
      const recipientRole = roleMap.get(`${row.house_id}:${row.recipient_id}`) || 'member';
      const senderIsStaff = senderRole === 'head' || senderRole === 'moderator';
      const direction = senderIsStaff ? 'outgoing' : 'incoming';
      const status =
        direction === 'outgoing'
          ? row.read_at
            ? 'open'
            : 'sent'
          : row.read_at
            ? 'read'
            : 'unread';
      const history = (eventMap.get(row.id) ?? []).map((event: any) => {
        const actor = userMap[event.actor_id] ?? null;
        return {
          id: event.id,
          type: event.event_type,
          createdAt: event.created_at,
          actor: actor
            ? {
                id: actor.id,
                name: actor.full_name || actor.username || 'User',
                username: actor.username,
                avatarUrl: actor.avatar_url,
              }
            : null,
          metadata: event.metadata ?? {},
        };
      });
      return {
        ...base,
        direction,
        status,
        senderRole,
        recipientRole,
        history,
        canReply: user.role === 'Super Admin' || replyAllowedHouseKeys.has(base.houseKey),
      };
    });

    if (directionFilter && directionFilter !== 'all') {
      messages = messages.filter((message: any) => message.direction === directionFilter);
    }

    if (statusFilter === 'open' || statusFilter === 'sent') {
      messages = messages.filter((message: any) => message.status === statusFilter);
    }

    return NextResponse.json({
      success: true,
      messages,
      total: statusFilter === 'open' || statusFilter === 'sent' || (directionFilter !== 'all')
        ? messages.length
        : count ?? 0,
      houses,
      limit,
      offset,
      status: statusFilter,
    });
  } catch (error) {
    console.error('[admin/houses/messages] Unexpected error', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || 'Unexpected error while loading house messages.',
      },
      { status: 500 },
    );
  }
}
