import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type SectionKey = 'hero' | 'web3Academy' | 'web3Sports' | 'leaderboard';
const VALID_SECTIONS: SectionKey[] = [
  'hero',
  'web3Academy',
  'web3Sports',
  'leaderboard',
];

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Admin Supabase client not configured.' },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const { section, assetId, offset } = body as {
    section?: string;
    assetId?: string | null;
    offset?: number | null;
  };

  if (!section || !VALID_SECTIONS.includes(section as SectionKey)) {
    return NextResponse.json(
      { success: false, error: 'Invalid section.' },
      { status: 400 },
    );
  }

  const hasAssetId = Object.prototype.hasOwnProperty.call(body, 'assetId');
  const hasOffset = Object.prototype.hasOwnProperty.call(body, 'offset');

  if (!hasAssetId && !hasOffset) {
    return NextResponse.json(
      { success: false, error: 'No changes provided.' },
      { status: 400 },
    );
  }

  const sectionKey = section as SectionKey;

  try {
    if (hasAssetId && assetId === null && !hasOffset) {
      const { error } = await supabaseAdmin
        .from('site_media_settings')
        .delete()
        .eq('section', sectionKey);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        setting: null,
      });
    }

    const payload: Record<string, unknown> = {
      section: sectionKey,
    };

    if (hasAssetId) {
      payload.asset_id = assetId;
    }

    if (hasOffset) {
      payload.vertical_offset = offset ?? 0;
    }

    const { data, error } = await supabaseAdmin
      .from('site_media_settings')
      .upsert(payload, { onConflict: 'section' })
      .select('section, vertical_offset, asset_id');

    if (error) {
      console.error('Failed to update site media settings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to persist media setting.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      setting: data?.[0] ?? null,
    });
  } catch (error) {
    console.error('Unexpected error updating media settings:', error);
    return NextResponse.json(
      { success: false, error: 'Server error while updating media settings.' },
      { status: 500 },
    );
  }
}
