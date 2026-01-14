import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type HouseOption = {
  houseKey: string;
  label: string;
};

const STATUS_FILTERS = {
  all: 'all',
  unread: 'unread',
  read: 'read',
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
    .select('house_key, name_i18n');
  if (housesError) {
    console.error('[admin/houses/messages] Failed to load houses for fallback', housesError);
    return [];
  }

  if (user.role === 'Super Admin') {
    return (housesData ?? []).map((house: any) => ({
      houseKey: house.house_key,
      label: resolveHouseName(house),
    }));
  }

  const { data: assignments } = await supabaseAdmin
    .from('admin_assignments')
    .select('id, houses')
    .eq('user_id', user.userId);

  const adminIds = (assignments ?? []).map((row: any) => row.id).filter(Boolean);
  const extraHouses = new Set<string>();
  (assignments ?? []).forEach((row: any) => {
    if (Array.isArray(row.houses)) {
      row.houses.forEach((houseKey: unknown) => {
        if (typeof houseKey === 'string') extraHouses.add(houseKey.toUpperCase());
      });
    }
  });

  if (!adminIds.length && !extraHouses.size) return [];

  const { data: houseHeads } = await supabaseAdmin
    .from('house_heads')
    .select('house_id')
    .in('admin_id', adminIds);
  const houseIds = (houseHeads ?? []).map((row: any) => row.house_id).filter(Boolean);

  const candidateHouses = new Map<string, HouseOption>();
  (housesData ?? []).forEach((house: any) => {
    const upperKey = (house.house_key || '').toUpperCase();
    candidateHouses.set(upperKey, {
      houseKey: upperKey,
      label: resolveHouseName(house),
    });
  });

  if (houseIds.length) {
    const { data: headsHouses } = await supabaseAdmin
      .from('houses_of_sports')
      .select('house_key, name_i18n')
      .in('id', houseIds);
    (headsHouses ?? []).forEach((house: any) => {
      const upperKey = (house.house_key || '').toUpperCase();
      candidateHouses.set(upperKey, {
        houseKey: upperKey,
        label: resolveHouseName(house),
      });
    });
  }

  extraHouses.forEach((houseKey) => {
    if (!candidateHouses.has(houseKey)) {
      candidateHouses.set(houseKey, {
        houseKey,
        label: houseKey,
      });
    }
  });

  return Array.from(candidateHouses.values());
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

function buildMessageResponse(row: any, housesMap: Record<string, string>, userMap: Record<string, any>) {
  const sender = userMap[row.sender_id] ?? null;
  const recipient = userMap[row.recipient_id] ?? null;
  const houseLabel = housesMap[row.house_key] ?? row.house_key;

  return {
    id: row.id,
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
  const permission = await requirePermission(request, 'canManageHouses');
  if (!permission.success) return permission.response!;
  const user = permission.user!;

  const houses = await resolveAccessibleHouses(user);
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
  const searchTerm = (searchParams.get('q') || '').trim();
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 25), 5), 100);
  const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

  const allowedHouseKeys = houses.map((h) => h.houseKey);

  let query = supabaseAdmin
    .from('house_private_messages')
    .select(
      'id, house_key, subject, body, created_at, read_at, sender_id, recipient_id',
      { count: 'exact' },
    )
    .in('house_key', allowedHouseKeys)
    .order('created_at', { ascending: false })
    .limit(limit)
    .offset(offset);

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
    query = query.or(
      `subject.ilike.${normalized},body.ilike.${normalized}`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('[admin/houses/messages] Failed to load messages', error);
    return NextResponse.json({ success: false, error: 'Failed to load house messages.' }, { status: 500 });
  }

  const rows = data ?? [];
  const participantCandidateIds = rows
    .flatMap((row: any) => [row.sender_id, row.recipient_id])
    .filter((id: unknown): id is string => typeof id === 'string');
  const participantSet = new Set<string>();
  participantCandidateIds.forEach((id: string) => participantSet.add(id));
  const participantIds = Array.from(participantSet);
  const users = await fetchUsersByIds(participantIds);
  const userMap: Record<string, any> = {};
  users.forEach((row: any) => {
    if (row?.id) {
      userMap[row.id] = row;
    }
  });

  const housesMap: Record<string, string> = {};
  houses.forEach((house) => {
    housesMap[house.houseKey] = house.label;
  });

  const messages = rows.map((row: any) =>
    buildMessageResponse(row, housesMap, userMap),
  );

  return NextResponse.json({
    success: true,
    messages,
    total: count ?? 0,
    houses,
    limit,
    offset,
    status: statusFilter,
  });
}
