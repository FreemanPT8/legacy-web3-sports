import { supabaseAdmin } from '@/lib/supabase';
import { getCountryName } from '@/lib/countries';

export type HouseStatus = 'development' | 'under_construction' | 'active';

type SportRow = {
  id: string;
  code: string | null;
  name_i18n: Record<string, string> | null;
};

type HouseRow = {
  id: string;
  house_key: string | null;
  status: string | null;
  country_code: string | null;
};

export type EnsureHouseParams = {
  sportId: string;
  countryCode: string;
  status?: HouseStatus;
  avatarUrl?: string | null;
  description?: string | null;
  actorId?: string | null;
  rejectIfExists?: boolean;
};

export type EnsureHouseResult = {
  houseId: string;
  houseKey: string;
  status: HouseStatus;
  countryCode: string;
  created: boolean;
};

export type EnsureHouseErrorCode =
  | 'invalid_input'
  | 'sport_not_found'
  | 'house_exists'
  | 'admin_unavailable'
  | 'db_error';

export class EnsureHouseError extends Error {
  code: EnsureHouseErrorCode;

  constructor(message: string, code: EnsureHouseErrorCode = 'db_error') {
    super(message);
    this.name = 'EnsureHouseError';
    this.code = code;
  }
}

const STATUS_VALUES: HouseStatus[] = ['development', 'under_construction', 'active'];

export function normalizeHouseStatus(
  raw?: string | null,
  fallback: HouseStatus = 'development',
): HouseStatus {
  if (raw) {
    const normalized = raw.toLowerCase() as HouseStatus;
    if (STATUS_VALUES.includes(normalized)) {
      return normalized;
    }
  }
  return fallback;
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .toUpperCase();
}

async function generateUniqueHouseKey(baseKey: string): Promise<string> {
  if (!supabaseAdmin) {
    throw new EnsureHouseError('Supabase admin client unavailable.', 'admin_unavailable');
  }

  let attempt = 0;
  let candidate = baseKey;

  while (attempt < 25) {
    const { data, error } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id')
      .eq('house_key', candidate)
      .maybeSingle();

    if (!data && (!error || error.code === 'PGRST116')) {
      return candidate;
    }

    attempt += 1;
    candidate = `${baseKey}_${attempt}`;
  }

  throw new EnsureHouseError('Unable to generate a unique house key.', 'db_error');
}

function buildHouseName(
  sportRow: SportRow,
  countryCode: string,
): { sportName: string; nameI18n: Record<string, string> } {
  const sportName =
    sportRow.name_i18n?.pt ||
    sportRow.name_i18n?.en ||
    sportRow.name_i18n?.es ||
    sportRow.name_i18n?.fr ||
    sportRow.name_i18n?.de ||
    sportRow.name_i18n?.it ||
    sportRow.code ||
    'Sport';

  const countryName = getCountryName(countryCode);
  const baseName = `House of ${sportName} ${countryName}`;

  return {
    sportName,
    nameI18n: {
      en: baseName,
      pt: baseName,
      es: baseName,
      fr: baseName,
      de: baseName,
      it: baseName,
    },
  };
}

export async function ensureHouseForSportCountry(
  params: EnsureHouseParams,
): Promise<EnsureHouseResult> {
  if (!supabaseAdmin) {
    throw new EnsureHouseError('Supabase admin client unavailable.', 'admin_unavailable');
  }

  const sportId = params.sportId?.trim();
  const rawCountry = params.countryCode?.trim().toUpperCase();

  if (!sportId || !rawCountry) {
    throw new EnsureHouseError('Sport and country are required.', 'invalid_input');
  }

  const { data: existingRow, error: existingError } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id, house_key, status, country_code')
    .eq('sport_id', sportId)
    .eq('country_code', rawCountry)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw new EnsureHouseError('Failed to inspect existing houses.', 'db_error');
  }

  const existing = (existingRow ?? null) as HouseRow | null;

  if (existing) {
    if (params.rejectIfExists) {
      throw new EnsureHouseError('House already exists for this sport/country.', 'house_exists');
    }
    return {
      houseId: existing.id,
      houseKey: existing.house_key ?? '',
      status: normalizeHouseStatus(existing.status, 'development'),
      countryCode: existing.country_code ?? rawCountry,
      created: false,
    };
  }

  const { data: sportRow, error: sportError } = await supabaseAdmin
    .from('sports')
    .select('id, code, name_i18n')
    .eq('id', sportId)
    .maybeSingle();

  if (sportError) {
    throw new EnsureHouseError('Failed to load sport metadata.', 'db_error');
  }

  if (!sportRow) {
    throw new EnsureHouseError('Sport not found.', 'sport_not_found');
  }

  const { sportName, nameI18n } = buildHouseName(sportRow as SportRow, rawCountry);
  const baseKey = `${slugify((sportRow.code as string | null) ?? sportName)}_${rawCountry}`;
  const houseKey = await generateUniqueHouseKey(baseKey);
  const status = normalizeHouseStatus(params.status ?? 'under_construction', 'under_construction');

  try {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('houses_of_sports')
      .insert({
        sport_id: sportId,
        country_code: rawCountry,
        status,
        avatar_url: params.avatarUrl ?? null,
        description: params.description ?? null,
        house_key: houseKey,
        name_i18n: nameI18n,
      })
      .select('id, house_key, status, country_code')
      .single();

    if (insertError && insertError.code !== '23505') {
      throw insertError;
    }

    if (!inserted) {
      // 23505 (unique violation) means another process inserted the row simultaneously.
      const { data: fallback } = await supabaseAdmin
        .from('houses_of_sports')
        .select('id, house_key, status, country_code')
        .eq('sport_id', sportId)
        .eq('country_code', rawCountry)
        .maybeSingle();

      if (!fallback) {
        throw new EnsureHouseError('Failed to resolve created house.', 'db_error');
      }

      return {
        houseId: fallback.id,
        houseKey: fallback.house_key ?? houseKey,
        status: normalizeHouseStatus(fallback.status, status),
        countryCode: fallback.country_code ?? rawCountry,
        created: false,
      };
    }

    return {
      houseId: inserted.id,
      houseKey: inserted.house_key ?? houseKey,
      status: normalizeHouseStatus(inserted.status, status),
      countryCode: inserted.country_code ?? rawCountry,
      created: true,
    };
  } catch (error: any) {
    if (error?.code === '23505' && !params.rejectIfExists) {
      const { data: existingAfterConflict } = await supabaseAdmin
        .from('houses_of_sports')
        .select('id, house_key, status, country_code')
        .eq('sport_id', sportId)
        .eq('country_code', rawCountry)
        .maybeSingle();

      if (existingAfterConflict) {
        return {
          houseId: existingAfterConflict.id,
          houseKey: existingAfterConflict.house_key ?? houseKey,
          status: normalizeHouseStatus(existingAfterConflict.status, status),
          countryCode: existingAfterConflict.country_code ?? rawCountry,
          created: false,
        };
      }
    }

    if (error instanceof EnsureHouseError) {
      throw error;
    }

    throw new EnsureHouseError('Failed to create new house.', 'db_error');
  }
}
