import { NextResponse } from 'next/server';
import type { MediaAsset } from '@/types/builder';
import { supabase } from '@/lib/supabase';

type SectionKey = 'hero' | 'web3Academy' | 'web3Sports' | 'leaderboard';
const SECTION_KEYS: SectionKey[] = [
  'hero',
  'web3Academy',
  'web3Sports',
  'leaderboard',
];

function detectAssetType(mime?: string | null) {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('pdf') || mime.includes('document')) return 'document';
  return 'other';
}

const DEFAULT_SETTINGS: Record<SectionKey, { asset: null; offset: number }> = {
  hero: { asset: null, offset: 0 },
  web3Academy: { asset: null, offset: 0 },
  web3Sports: { asset: null, offset: 0 },
  leaderboard: { asset: null, offset: 0 },
};

export async function GET() {
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Supabase client is not configured.' },
      { status: 500 },
    );
  }

  try {
    const { data, error } = await supabase
      .from('site_media_settings')
      .select(
        `
          section,
          vertical_offset,
          asset:media_files (
            id,
            url,
            title,
            alt,
            mime_type,
            tags,
            size_bytes,
            created_at
          )
        `,
      )
      .in('section', ['hero', 'web3Academy', 'web3Sports', 'leaderboard']);

    if (error) {
      console.error('Failed to load media settings:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to load media settings.' },
        { status: 500 },
      );
    }

    const settings = SECTION_KEYS.reduce((acc, section) => {
      acc[section] = { ...DEFAULT_SETTINGS[section] };
      return acc;
    }, {} as Record<SectionKey, { asset: MediaAsset | null; offset: number }>);

    (data || []).forEach((row: any) => {
      const section = row.section as SectionKey;
      if (!section || !settings[section]) {
        return;
      }
      const assetRow = row.asset;
      settings[section] = {
        asset: assetRow
          ? {
              id: assetRow.id,
              url: assetRow.url,
              title: assetRow.title,
              alt: assetRow.alt,
              type: detectAssetType(assetRow.mime_type),
              thumbnailUrl: assetRow.url,
              sizeBytes: assetRow.size_bytes ?? null,
              durationSeconds: null,
              createdAt: assetRow.created_at ?? null,
            }
          : null,
        offset: typeof row.vertical_offset === 'number' ? row.vertical_offset : 0,
      };
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Unexpected error loading media settings:', error);
    return NextResponse.json(
      { success: false, error: 'Server error loading media settings.' },
      { status: 500 },
    );
  }
}
