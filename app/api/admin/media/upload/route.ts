import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

const DEFAULT_BUCKET = 'media';

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Admin client not configured.' },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Missing file payload.' },
        { status: 400 },
      );
    }

    const folder = (formData.get('folder') as string) || 'uploads';
    const title = (formData.get('title') as string) || null;
    const alt = (formData.get('alt') as string) || null;
    const rawTags = (formData.get('tags') as string) || '';
    const tags =
      rawTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean) || [];

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const uploadRes = await supabaseAdmin.storage
      .from(DEFAULT_BUCKET)
      .upload(path, buffer, {
        cacheControl: '3600',
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadRes.error) {
      console.error('Supabase storage upload error:', uploadRes.error);
      return NextResponse.json(
        { success: false, error: 'Failed to upload file.' },
        { status: 500 },
      );
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${DEFAULT_BUCKET}/${path}`;

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('media_files')
      .insert({
        bucket: DEFAULT_BUCKET,
        path,
        url: publicUrl,
        title,
        alt,
        tags,
        uploaded_by: authResult.user?.userId,
        size_bytes: file.size,
        mime_type: file.type || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting media metadata:', insertError);
      // best effort rollback
      await supabaseAdmin.storage.from(DEFAULT_BUCKET).remove([path]);
      return NextResponse.json(
        { success: false, error: 'Failed to save media metadata.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      file: insertData,
    });
  } catch (error) {
    console.error('Unexpected error in media upload:', error);
    return NextResponse.json(
      { success: false, error: 'Server error during upload.' },
      { status: 500 },
    );
  }
}
