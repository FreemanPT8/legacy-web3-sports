import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type SectionKey = 'hero' | 'web3Academy' | 'web3Sports';

function detectAssetType(mime?: string | null) {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('pdf') || mime.includes('document')) return 'document';
  return 'other';
}

const DEFAULT_SETTINGS: Record<
  SectionKey,
  { asset: null; offset: number }
> = {
  hero: { asset: null, offset: 0 },
  web3Academy: { asset: null, offset: 0 },
  web3Sports: { asset: null, offset: 0 },
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
          offset,
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
      .in('section', ['hero', 'web3Academy', 'web3Sports']);

    if (error) {
      console.error('Failed to load media settings:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to load media settings.' },
        { status: 500 },
      );
    }

    const settings = { ...DEFAULT_SETTINGS };

    (data || []).forEach((row: any) => {
      const section = row.section as SectionKey;
      if (!section || !Object.prototype.hasOwnProperty.call(settings, section)) {
        return;
      }
      settings[section] = {
        asset: row.asset
          ? {
              id: row.asset.id,
              url: row.asset.url,
              title: row.asset.title,
              alt: row.asset.alt,
              type: detectAssetType(row.asset.mime_type),
              thumbnailUrl: row.asset.url,
              sizeBytes: row.asset.size_bytes ?? null,
              durationSeconds: null,
              createdAt: row.asset.created_at ?? null,
            }
          : null,
        offset: typeof row.offset === 'number' ? row.offset : 0,
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
