const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const START_COURSE_ID = 'eda38083-c8f2-4573-b2d1-3f96cf73539e';

const LEVELS = [
  {
    slug: 'cadets',
    order_index: 1,
    title_i18n: { pt: 'Cadete', en: 'Cadet', es: 'Cadete' },
    unlock_condition: { type: 'xp_threshold', min_xp: 0 },
    visibility_condition: { type: 'always' },
    min_xp: 0,
    max_xp: 98,
    accent_color: '#07f2c7',
    badge_icon: 'icon-cadet',
    short_label: 'Cadete',
  },
  {
    slug: 'infantil',
    order_index: 2,
    title_i18n: { pt: 'Infantil', en: 'Youth', es: 'Infantil' },
    unlock_condition: { type: 'xp_threshold', min_xp: 99 },
    visibility_condition: { type: 'always' },
    min_xp: 99,
    max_xp: 368,
    accent_color: '#4dd2ff',
    badge_icon: 'icon-infantil',
    short_label: 'Infantil',
  },
  {
    slug: 'juveniles',
    order_index: 3,
    title_i18n: { pt: 'Juvenil', en: 'Intermediate', es: 'Juvenil' },
    unlock_condition: { type: 'xp_threshold', min_xp: 369 },
    visibility_condition: { type: 'always' },
    min_xp: 369,
    max_xp: 999,
    accent_color: '#6ee7ff',
    badge_icon: 'icon-juvenil',
    short_label: 'Juvenil',
  },
  {
    slug: 'juniors',
    order_index: 4,
    title_i18n: { pt: 'Junior', en: 'Junior', es: 'Junior' },
    unlock_condition: { type: 'xp_threshold', min_xp: 1000 },
    visibility_condition: { type: 'always' },
    min_xp: 1000,
    max_xp: 2221,
    accent_color: '#8b5cf6',
    badge_icon: 'icon-junior',
    short_label: 'Junior',
  },
  {
    slug: 'seniors',
    order_index: 5,
    title_i18n: { pt: 'Senior', en: 'Senior', es: 'Senior' },
    unlock_condition: { type: 'xp_threshold', min_xp: 2222 },
    visibility_condition: { type: 'always' },
    min_xp: 2222,
    max_xp: 3332,
    accent_color: '#f59e0b',
    badge_icon: 'icon-senior',
    short_label: 'Senior',
  },
  {
    slug: 'hall-of-fame',
    order_index: 6,
    title_i18n: { pt: 'Hall da Fama', en: 'Hall of Fame', es: 'Salon de la Fama' },
    unlock_condition: { type: 'xp_threshold', min_xp: 3333 },
    visibility_condition: { type: 'always' },
    min_xp: 3333,
    max_xp: 4999,
    accent_color: '#fbbf24',
    badge_icon: 'icon-hall',
    short_label: 'Hall',
  },
  {
    slug: 'master',
    order_index: 7,
    title_i18n: { pt: 'Master', en: 'Master', es: 'Master' },
    unlock_condition: { type: 'xp_threshold', min_xp: 5000 },
    visibility_condition: { type: 'always' },
    min_xp: 5000,
    max_xp: 9999,
    accent_color: '#ef4444',
    badge_icon: 'icon-master',
    short_label: 'Master',
  },
  {
    slug: 'legend',
    order_index: 8,
    title_i18n: { pt: 'Lenda', en: 'Legend', es: 'Leyenda' },
    unlock_condition: { type: 'xp_threshold', min_xp: 10000 },
    visibility_condition: { type: 'always' },
    min_xp: 10000,
    max_xp: null,
    accent_color: '#f472b6',
    badge_icon: 'icon-legend',
    short_label: 'Lenda',
  },
];

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found');
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) {
      process.env[key] = value;
    }
  });
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }

  const client = createClient(url, key, {
    auth: { persistSession: false },
  });

  console.log('Upserting academy levels...');
  const { error: upsertError } = await client
    .from('academy_levels')
    .upsert(LEVELS, { onConflict: 'slug' });
  if (upsertError) {
    if (upsertError.message && upsertError.message.includes('accent_color')) {
      console.log('Schema missing visual columns. Falling back to minimal payload...');
      const minimalLevels = LEVELS.map(
        ({
          slug,
          order_index,
          title_i18n,
          unlock_condition,
          visibility_condition,
        }) => ({
          slug,
          order_index,
          title_i18n,
          unlock_condition,
          visibility_condition,
        }),
      );
      const { error: legacyError } = await client
        .from('academy_levels')
        .upsert(minimalLevels, { onConflict: 'slug' });
      if (legacyError) {
        throw legacyError;
      }
    } else {
      throw upsertError;
    }
  }

  console.log('Removing legacy novato level if present...');
  const { error: deleteError } = await client
    .from('academy_levels')
    .delete()
    .eq('slug', 'novato');
  if (deleteError && deleteError.code !== 'PGRST116') {
    throw deleteError;
  }

  console.log('Updating start course level assignment...');
  const fullPayload = {
    academy_level_slug: 'cadets',
    is_start_course: true,
    is_required_in_level: true,
    academy_path_order: 0,
  };
  const minimalPayload = {
    academy_level_slug: 'cadets',
    is_start_course: true,
    is_required_in_level: true,
  };

  const applyUpdate = (payload, useSlug) => {
    const query = client.from('courses').update(payload);
    return useSlug
      ? query.or(`id.eq.${START_COURSE_ID},slug.eq.comeca-aqui`)
      : query.eq('id', START_COURSE_ID);
  };

  let startError = (await applyUpdate(fullPayload, true)).error;
  if (startError && startError.message && startError.message.includes('academy_path_order')) {
    startError = (await applyUpdate(minimalPayload, true)).error;
  }
  if (startError && startError.message && startError.message.includes('courses.slug')) {
    startError = (await applyUpdate(minimalPayload, false)).error;
  }
  if (startError) {
    throw startError;
  }

  console.log('Academy levels synced successfully.');
}

main().catch((error) => {
  console.error('Failed to sync academy levels:', error);
  process.exit(1);
});
