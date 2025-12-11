import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return auth.response!;
  }

  const body = await request.json().catch(() => null);
  const fileId = body?.id;

  if (!fileId || typeof fileId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Invalid file ID' },
      { status: 400 },
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Admin client not configured.' },
      { status: 500 },
    );
  }

  try {
    const { data: file, error: selectError } = await supabaseAdmin
      .from('media_files')
      .select('bucket, path')
      .eq('id', fileId)
      .maybeSingle();

    if (selectError) {
      console.error('Error fetching media file for delete:', selectError);
      throw selectError;
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 },
      );
    }

    if (file.path && file.bucket) {
      await supabaseAdmin.storage.from(file.bucket).remove([file.path]);
    }

    const { error: deleteError } = await supabaseAdmin
      .from('media_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      console.error('Error deleting media file record:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete media file:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Could not delete media asset at this time.',
      },
      { status: 500 },
    );
  }
}
