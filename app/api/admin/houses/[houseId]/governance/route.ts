import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logHouseHistory } from '@/lib/houses/history';
import { syncHouseMembersBySportCountry } from '@/lib/user-houses';

const SUPPORT_MODES = ['async', 'sync', 'hybrid'] as const;
const GOVERNANCE_STATUSES = ['active', 'limited', 'paused', 'under_review'] as const;

const POSTGRES_MISSING_COLUMN = '42703';
const POSTGRES_MISSING_TABLE = '42P01';
const BASE_SELECT =
  'id, house_key, name_i18n, monthly_capacity, support_mode, governance_status, is_exemplar, sport_id, country_code, status';
const LEGACY_SELECT = 'id, house_key, name_i18n, monthly_capacity, governance_status, status';

type HouseStatus = 'development' | 'under_construction' | 'active';
const PUBLIC_STATUSES: HouseStatus[] = ['development', 'under_construction', 'active'];

function isMissingColumn(error?: { code?: string }) {
  return error?.code === POSTGRES_MISSING_COLUMN;
}

function isMissingTable(error?: { code?: string }) {
  return error?.code === POSTGRES_MISSING_TABLE;
}

function missingTableResponse(table: string) {
  return NextResponse.json(
    {
      success: false,
      error: `Tabela ${table} inexistente. Corre as migrações pendentes no Supabase.`,
    },
    { status: 500 },
  );
}

function normalizeHouseStatus(status?: string | null): HouseStatus {
  if (!status) return 'development';
  const normalized = status.toLowerCase() as HouseStatus;
  return PUBLIC_STATUSES.includes(normalized) ? normalized : 'development';
}

async function loadHouse(houseId: string) {
  let result = await supabaseAdmin!
    .from('houses_of_sports')
    .select(BASE_SELECT)
    .eq('id', houseId)
    .maybeSingle();
  if (result.error && isMissingColumn(result.error)) {
    console.warn('[admin/houses/governance] houses_of_sports columns missing, using legacy select');
    result = await supabaseAdmin!
      .from('houses_of_sports')
      .select(LEGACY_SELECT)
      .eq('id', houseId)
      .maybeSingle();
  }
  if (result.error && isMissingTable(result.error)) {
    return { error: missingTableResponse('houses_of_sports'), data: null };
  }
  if (result.error) throw result.error;
  return { data: result.data, error: null };
}

export async function GET(request: NextRequest, { params }: { params: { houseId: string } }) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing house id.' }, { status: 400 });
  }

  try {
    const { data: house, error: loadError } = await loadHouse(houseId);
    if (loadError) return loadError;
    if (!house) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }

    let pendingRequests = 0;
    let memberCount = 0;
    try {
      const [{ count: pending }, { count: members }] = await Promise.all([
        supabaseAdmin
          .from('house_join_requests')
          .select('*', { head: true, count: 'exact' })
          .eq('house_id', houseId)
          .eq('status', 'pending'),
        supabaseAdmin
          .from('user_houses')
          .select('*', { head: true, count: 'exact' })
          .eq('house_id', houseId)
          .is('removed_at', null),
      ]);
      pendingRequests = pending ?? 0;
      memberCount = members ?? 0;
    } catch (error: any) {
      if (isMissingTable(error)) {
        console.warn('[admin/houses/governance] house_join_requests missing; pending count defaults to 0');
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      house: {
        id: house.id,
        houseKey: house.house_key,
        name: house.name_i18n?.pt ?? house.name_i18n?.en ?? 'House',
        monthlyCapacity: house.monthly_capacity ?? null,
        supportMode: house.support_mode ?? null,
        governanceStatus: house.governance_status ?? 'active',
        publicStatus: normalizeHouseStatus(house.status ?? null),
        isExemplar: Boolean(house.is_exemplar),
        pendingRequests,
        memberCount,
      },
    });
  } catch (error) {
    console.error('[admin/houses/governance] load failed', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao carregar dados de governação.' },
      { status: 500 },
    );
  }
}

type GovernancePayload = {
  monthlyCapacity?: number | null;
  supportMode?: string | null;
  governanceStatus?: string | null;
  isExemplar?: boolean;
  houseStatus?: HouseStatus | null;
};

export async function PATCH(request: NextRequest, { params }: { params: { houseId: string } }) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing house id.' }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as GovernancePayload;
  const actorId = authResult.user?.userId ?? null;

  let currentHouse;
  try {
    const { data, error } = await loadHouse(houseId);
    if (error) return error;
    currentHouse = data;
    if (!currentHouse) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }
  } catch (err) {
    console.error('[admin/houses/governance] load current failed', err);
    return NextResponse.json({ success: false, error: 'Failed to load current status.' }, { status: 500 });
  }

  if (body.supportMode && !SUPPORT_MODES.includes(body.supportMode as (typeof SUPPORT_MODES)[number])) {
    return NextResponse.json({ success: false, error: 'Invalid support mode.' }, { status: 400 });
  }
  if (
    body.governanceStatus &&
    !GOVERNANCE_STATUSES.includes(body.governanceStatus as (typeof GOVERNANCE_STATUSES)[number])
  ) {
    return NextResponse.json({ success: false, error: 'Invalid governance status.' }, { status: 400 });
  }
  if (
    body.houseStatus &&
    !PUBLIC_STATUSES.includes(body.houseStatus as HouseStatus)
  ) {
    return NextResponse.json({ success: false, error: 'Invalid public status.' }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};
  const previousPublicStatus = normalizeHouseStatus(currentHouse.status ?? null);
  let nextPublicStatus = previousPublicStatus;
  let shouldResyncMembers = false;
  if (body.monthlyCapacity !== undefined) {
    if (body.monthlyCapacity === null || Number.isNaN(body.monthlyCapacity)) {
      updatePayload.monthly_capacity = null;
    } else if (typeof body.monthlyCapacity === 'number' && body.monthlyCapacity >= 0) {
      updatePayload.monthly_capacity = Math.floor(body.monthlyCapacity);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid capacity value.' }, { status: 400 });
    }
  }
  if (body.supportMode !== undefined) {
    updatePayload.support_mode = body.supportMode || null;
  }
  if (body.governanceStatus !== undefined) {
    updatePayload.governance_status = body.governanceStatus || 'active';
  }
  if (body.isExemplar !== undefined) {
    updatePayload.is_exemplar = Boolean(body.isExemplar);
  }
  if (body.houseStatus !== undefined) {
    nextPublicStatus = normalizeHouseStatus(body.houseStatus);
    updatePayload.status = nextPublicStatus;
    if (previousPublicStatus !== 'active' && nextPublicStatus === 'active') {
      shouldResyncMembers = true;
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ success: false, error: 'No governance fields provided.' }, { status: 400 });
  }

  let updatedRow;
  try {
    let updateResult = await supabaseAdmin
      .from('houses_of_sports')
      .update(updatePayload)
      .eq('id', houseId)
      .select(BASE_SELECT)
      .maybeSingle();
    if (updateResult.error && isMissingColumn(updateResult.error)) {
      console.warn('[admin/houses/governance] update missing column, retrying without optional fields');
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.support_mode;
      delete fallbackPayload.is_exemplar;
      updateResult = await supabaseAdmin
        .from('houses_of_sports')
        .update(fallbackPayload)
        .eq('id', houseId)
        .select(LEGACY_SELECT)
        .maybeSingle();
    }
    if (updateResult.error && isMissingTable(updateResult.error)) {
      return missingTableResponse('houses_of_sports');
    }
    if (updateResult.error) throw updateResult.error;
    updatedRow = updateResult.data;
    nextPublicStatus = normalizeHouseStatus(updatedRow?.status ?? currentHouse.status ?? null);
  } catch (error) {
    console.error('[admin/houses/governance] update failed', error);
    return NextResponse.json({ success: false, error: 'Unable to update governance fields.' }, { status: 500 });
  }

  if (shouldResyncMembers && nextPublicStatus === 'active') {
    const sportId = (currentHouse as any)?.sport_id ?? updatedRow?.sport_id ?? null;
    const countryCode = (currentHouse as any)?.country_code ?? updatedRow?.country_code ?? null;
    if (sportId && countryCode) {
      await syncHouseMembersBySportCountry(houseId, sportId, countryCode, { logPrefix: 'house:governance' });
    }
  }

  await logHouseHistory({
    houseId,
    action: 'governance.updated',
    actorId,
    payload: {
      before: {
        monthlyCapacity: currentHouse.monthly_capacity ?? null,
        supportMode: currentHouse.support_mode ?? null,
        governanceStatus: currentHouse.governance_status ?? 'active',
        isExemplar: Boolean(currentHouse.is_exemplar),
        publicStatus: previousPublicStatus,
      },
      after: {
        monthlyCapacity: updatedRow?.monthly_capacity ?? currentHouse.monthly_capacity ?? null,
        supportMode: updatedRow?.support_mode ?? currentHouse.support_mode ?? null,
        governanceStatus: updatedRow?.governance_status ?? currentHouse.governance_status ?? 'active',
        isExemplar: Boolean(updatedRow?.is_exemplar ?? currentHouse.is_exemplar),
        publicStatus: nextPublicStatus,
      },
    },
  });

  return NextResponse.json({ success: true });
}

