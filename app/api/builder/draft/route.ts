import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import type { BuilderState } from '@/types/builder';

type EntityType = 'course' | 'blog';

type DraftPayload = {
  entityType: EntityType;
  entityId: string;
  state: BuilderState;
};

type DraftResponse = {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  state: BuilderState;
  updated_at: string;
};

const db = supabaseAdmin ?? supabase;

const isValidEntityType = (value: unknown): value is EntityType =>
  value === 'course' || value === 'blog';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');

  if (!isValidEntityType(entityType) || !entityId) {
    return NextResponse.json(
      { success: false, error: 'Missing entity type or id.' },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await db
      .from('builder_drafts')
      .select('id, entity_type, entity_id, state, updated_at')
      .eq('user_id', authResult.user!.userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .maybeSingle<DraftResponse>();

    if (error) {
      console.error('Failed to read builder draft:', error);
      return NextResponse.json(
        { success: false, error: 'Could not load draft.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      draft: data
        ? {
            id: data.id,
            entityType: data.entity_type,
            entityId: data.entity_id,
            state: data.state,
            updatedAt: data.updated_at,
          }
        : null,
    });
  } catch (error) {
    console.error('Error in GET /api/builder/draft:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const body = (await request.json()) as DraftPayload;
    if (
      !body ||
      typeof body !== 'object' ||
      !isValidEntityType(body.entityType) ||
      !body.entityId ||
      !body.state ||
      body.state.entityType !== body.entityType
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid draft payload.' },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from('builder_drafts')
      .upsert(
        {
          user_id: authResult.user!.userId,
          entity_type: body.entityType,
          entity_id: body.entityId,
          state: body.state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,entity_type,entity_id' },
      )
      .select('id, updated_at')
      .single();

    if (error) {
      console.error('Failed to save builder draft:', error);
      return NextResponse.json(
        { success: false, error: 'Could not save draft.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      draft: {
        id: data.id,
        entityType: body.entityType,
        entityId: body.entityId,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/builder/draft:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const body = (await request.json()) as {
      entityType?: EntityType;
      entityId?: string;
    };

    if (!isValidEntityType(body.entityType) || !body.entityId) {
      return NextResponse.json(
        { success: false, error: 'Missing entity information.' },
        { status: 400 },
      );
    }

    const { error } = await db
      .from('builder_drafts')
      .delete()
      .eq('user_id', authResult.user!.userId)
      .eq('entity_type', body.entityType)
      .eq('entity_id', body.entityId);

    if (error) {
      console.error('Failed to delete builder draft:', error);
      return NextResponse.json(
        { success: false, error: 'Could not delete draft.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/builder/draft:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
