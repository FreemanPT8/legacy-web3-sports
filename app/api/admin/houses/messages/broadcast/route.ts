import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { hasGlobalPermission } from '@/lib/server/permissions';
import { classifyRole } from '@/lib/private-messages';

const INSERT_CHUNK_SIZE = 200;

async function resolveHouse(houseKeyRaw: string) {
  if (!supabaseAdmin) return null;
  const rawKey = (houseKeyRaw || '').trim();
  if (!rawKey) return null;
  const { data, error } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id, house_key')
    .ilike('house_key', rawKey)
    .maybeSingle();
  if (error) {
    console.error('[admin/houses/messages/broadcast] Failed to resolve house', error);
    return null;
  }
  if (!data?.id) return null;
  const houseKey = (data.house_key || '').toString().toUpperCase();
  return { id: data.id, houseKey };
}

async function isHouseStaff(userId: string, houseId: string) {
  if (!supabaseAdmin) return false;

  const { data: assignments } = await supabaseAdmin
    .from('admin_assignments')
    .select('id')
    .eq('user_id', userId);
  const adminIds = (assignments ?? []).map((row: any) => row.id).filter(Boolean);
  if (adminIds.length) {
    const { data: headRows } = await supabaseAdmin
      .from('house_heads')
      .select('id')
      .eq('house_id', houseId)
      .in('admin_id', adminIds);
    if ((headRows ?? []).length > 0) {
      return true;
    }
  }

  const { data: moderatorRows } = await supabaseAdmin
    .from('house_moderators')
    .select('id')
    .eq('house_id', houseId)
    .eq('user_id', userId);
  if ((moderatorRows ?? []).length > 0) {
    return true;
  }

  const { data: membershipRows } = await supabaseAdmin
    .from('user_houses')
    .select('membership_role')
    .eq('house_id', houseId)
    .eq('user_id', userId)
    .is('removed_at', null);
  const role = classifyRole(membershipRows?.[0]?.membership_role);
  return role === 'head' || role === 'moderator';
}

async function loadHouseMembers(houseId: string, senderId: string) {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from('user_houses')
    .select('user_id, membership_role')
    .eq('house_id', houseId)
    .is('removed_at', null);
  if (error) {
    console.error('[admin/houses/messages/broadcast] Failed to load house members', error);
    return [];
  }

  return (data ?? [])
    .map((row: any) => ({
      userId: row.user_id,
      role: classifyRole(row.membership_role),
    }))
    .filter((row: any) => row.userId && row.userId !== senderId)
    .filter((row: any) => row.role === 'member' || row.role === 'unknown')
    .map((row: any) => row.userId);
}

async function insertInChunks(
  table: string,
  rows: Record<string, unknown>[],
  selectColumns?: string,
) {
  if (!supabaseAdmin || rows.length === 0) return [];
  const inserted: any[] = [];
  for (let index = 0; index < rows.length; index += INSERT_CHUNK_SIZE) {
    const slice = rows.slice(index, index + INSERT_CHUNK_SIZE);
    let query = supabaseAdmin.from(table).insert(slice);
    if (selectColumns) {
      query = query.select(selectColumns);
    }
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    if (data?.length) {
      inserted.push(...data);
    }
  }
  return inserted;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response!;
    const user = auth.user!;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Database connection unavailable.' },
        { status: 500 },
      );
    }

    const payload = await request.json().catch(() => null);
    const houseKey = (payload?.houseKey || '').toString().trim();
    const subject = (payload?.subject || '').toString().trim() || 'Mensagem para membros da House';
    const body = (payload?.body || '').toString().trim();

    if (!houseKey) {
      return NextResponse.json(
        { success: false, error: 'House is required.' },
        { status: 400 },
      );
    }
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Message body is required.' },
        { status: 400 },
      );
    }

    const house = await resolveHouse(houseKey);
    if (!house) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }

    const hasManageHouses = await hasGlobalPermission(user, 'canManageHouses');
    const isStaff =
      user.role === 'Super Admin' ||
      (await isHouseStaff(user.userId, house.id));
    if (!hasManageHouses && !isStaff) {
      return NextResponse.json(
        { success: false, error: 'Permission denied.' },
        { status: 403 },
      );
    }

    const recipientIds = await loadHouseMembers(house.id, user.userId);
    if (!recipientIds.length) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const messages = recipientIds.map((recipientId) => ({
      house_id: house.id,
      house_key: house.houseKey,
      sender_id: user.userId,
      recipient_id: recipientId,
      subject,
      body,
    }));

    let inserted: any[] = [];
    try {
      inserted = await insertInChunks('house_private_messages', messages, 'id, recipient_id');
    } catch (error) {
      console.error('[admin/houses/messages/broadcast] Failed to insert messages', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send broadcast.' },
        { status: 500 },
      );
    }

    const notifications = inserted.map((row: any) => ({
      user_id: row.recipient_id,
      type: 'house-message',
      title: 'Nova mensagem da tua House',
      message: 'Recebeste uma mensagem privada da lideranca da tua House.',
      link: `/houses/${house.houseKey}`,
      data: { houseKey: house.houseKey, messageId: row.id, broadcast: true },
    }));

    try {
      await insertInChunks('notifications', notifications);
    } catch (error) {
      console.error('[admin/houses/messages/broadcast] Failed to insert notifications', error);
    }

    const events = inserted.map((row: any) => ({
      message_id: row.id,
      house_id: house.id,
      house_key: house.houseKey,
      actor_id: user.userId,
      event_type: 'broadcast',
      metadata: { broadcast: true },
    }));
    try {
      await insertInChunks('house_private_message_events', events);
    } catch (error) {
      console.error('[admin/houses/messages/broadcast] Failed to log broadcast events', error);
    }

    return NextResponse.json({ success: true, count: inserted.length });
  } catch (error) {
    console.error('[admin/houses/messages/broadcast] Unexpected error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send broadcast.' },
      { status: 500 },
    );
  }
}
