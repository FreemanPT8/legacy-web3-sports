// app/api/admin/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // ✅ Apenas garante que é Admin/Super Admin
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  // ✅ Podemos calcular isto para uso futuro / logging, mas NÃO bloqueia o GET
  const canManageCourses = await userHasPermission(
    currentUser.userId,
    role,
    'canManageCourses',
  );

  try {
    const { data, error } = await supabase
      .from('courses')
      .select(
        `
        *,
        modules:modules(
          *,
          lessons:lessons(*)
        )
      `,
      )
      .eq('id', params.id)
      .single();

    if (error || !data) {
      console.error('Error loading course by id (admin):', error);
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 },
      );
    }

    // Autor
    let authorName: string | null = null;
    if (data.author_id) {
      const { data: author } = await supabase
        .from('users')
        .select('full_name, username')
        .eq('id', data.author_id as string)
        .maybeSingle();
      authorName = author?.full_name || author?.username || null;
    }

    // XP total distribuído (todos)
    const { data: xpTotalRow } = await supabase
      .from('course_total_xp_distributed')
      .select('total_xp_distributed')
      .eq('course_id', params.id)
      .maybeSingle();
    const xpTotalDistributed = xpTotalRow?.total_xp_distributed ?? 0;

    // XP para o criador (via xp_transactions)
    let xpCreatorDistributed = 0;
    if (data.author_id) {
      const { data: xpCreatorRows } = await supabase
        .from('xp_transactions')
        .select('xp_earned')
        .eq('reference_type', 'course')
        .eq('reference_id', params.id)
        .eq('user_id', data.author_id as string);
      xpCreatorDistributed =
        (xpCreatorRows || []).reduce(
          (acc: number, row: any) => acc + (row?.xp_earned ?? 0),
          0,
        ) || 0;
    }

    const attachments =
      Array.isArray((data as Record<string, any>)?.curriculum?.attachments)
        ? data.curriculum.attachments
        : [];

    return NextResponse.json({
      success: true,
      course: {
        ...data,
        attachments,
        author_name: authorName,
        xp_total_distributed: xpTotalDistributed,
        xp_creator_distributed: xpCreatorDistributed,
      },
      // opcional, pode dar jeito no futuro se quiseres ler isto diretamente aqui
      permissions: {
        canManageCourses,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/courses/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  const canManageCourses = await userHasPermission(
    currentUser.userId,
    role,
    'canManageCourses',
  );

  if (!canManageCourses) {
    return NextResponse.json(
      {
        success: false,
        error: 'You do not have permission to manage courses.',
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { course } = body || {};

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Missing course payload.' },
        { status: 400 },
      );
    }

    const {
      title,
      description,
      level,
      xp_threshold,
      published,
      image_url,
      xp_reward,
      is_completed,
      schedule,
      is_paid,
      overview,
      key_takeaways,
      target_audience,
      duration_minutes,
      bonuses,
      special_requirements,
      attachments,
      seo,
      google_integrations,
      curriculum,
      cover_asset,
    } = course;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required.' },
        { status: 400 },
      );
    }

    // Buscar estado anterior (para saber se acabou de ficar completed)
    const { data: existing, error: existingError } = await supabase
      .from('courses')
      .select(
        'id, level, xp_threshold, is_completed, xp_reward, is_paid, overview, key_takeaways, target_audience, duration_minutes, special_requirements, seo, google_integrations, curriculum',
      )
      .eq('id', params.id)
      .maybeSingle();

    if (existingError || !existing) {
      console.error('Error loading existing course before update:', existingError);
      return NextResponse.json(
        { success: false, error: 'Course not found.' },
        { status: 404 },
      );
    }

    const wasCompleted = !!existing.is_completed;
    const now = new Date().toISOString();

    const publish_at =
      schedule && typeof schedule.publishAt === 'string'
        ? schedule.publishAt
        : null;
    const expire_at =
      schedule && typeof schedule.expireAt === 'string'
        ? schedule.expireAt
        : null;

    const attachmentsPayload = Array.isArray(attachments)
      ? attachments
      : Array.isArray(curriculum?.attachments)
        ? curriculum.attachments
        : Array.isArray(existing.curriculum?.attachments)
          ? existing.curriculum.attachments
          : [];
    const baseCurriculum =
      curriculum && typeof curriculum === 'object'
        ? curriculum
        : existing.curriculum ?? { topics: [] };
    const {
      attachments: _ignoredAttachments,
      metadata: existingMetadataRaw,
      ...restCurriculum
    } = (baseCurriculum || {}) as Record<string, any>;
    const existingMetadata =
      existingMetadataRaw && typeof existingMetadataRaw === 'object'
        ? existingMetadataRaw
        : {};
    const metadataOverview =
      typeof overview === 'string'
        ? overview
        : typeof existingMetadata.overview === 'string'
          ? existingMetadata.overview
          : typeof existing.overview === 'string'
            ? existing.overview
            : '';
    const metadataKeyTakeaways = Array.isArray(key_takeaways)
      ? key_takeaways
      : Array.isArray(existingMetadata.keyTakeaways)
        ? existingMetadata.keyTakeaways
        : Array.isArray(existing.key_takeaways)
          ? existing.key_takeaways
          : [];
    const metadataTargetAudience = Array.isArray(target_audience)
      ? target_audience
      : Array.isArray(existingMetadata.targetAudience)
        ? existingMetadata.targetAudience
        : Array.isArray(existing.target_audience)
          ? existing.target_audience
          : [];
    const metadataBonuses = Array.isArray(bonuses)
      ? bonuses
      : Array.isArray(existingMetadata.bonuses)
        ? existingMetadata.bonuses
        : [];
    const metadataSpecialRequirements = Array.isArray(special_requirements)
      ? special_requirements
      : Array.isArray(existingMetadata.specialRequirements)
        ? existingMetadata.specialRequirements
        : Array.isArray(existing.special_requirements)
          ? existing.special_requirements
          : [];
    const metadataDuration =
      typeof duration_minutes === 'number'
        ? duration_minutes
        : typeof existingMetadata.durationMinutes === 'number'
          ? existingMetadata.durationMinutes
          : existing.duration_minutes ?? 0;
    const metadataSeo = seo ?? existingMetadata.seo ?? existing.seo ?? null;
    const metadataGoogle =
      google_integrations ??
      existingMetadata.googleIntegrations ??
      existing.google_integrations ??
      null;
    const metadataSchedule =
      schedule && typeof schedule === 'object'
        ? schedule
        : existingMetadata.schedule ?? null;
    const metadataCoverAsset =
      cover_asset ?? existingMetadata.coverAsset ?? null;
    const metadataXpReward =
      typeof xp_reward === 'number'
        ? xp_reward
        : typeof existingMetadata.xpReward === 'number'
          ? existingMetadata.xpReward
          : existing.xp_reward ?? 0;
    const metadataXpThreshold =
      typeof xp_threshold === 'number'
        ? xp_threshold
        : typeof existingMetadata.xpThreshold === 'number'
          ? existingMetadata.xpThreshold
          : existing.xp_threshold ?? 0;
    const metadataLevel = level || existingMetadata.level || existing.level || 'beginner';
    const metadataIsCompleted =
      typeof is_completed === 'boolean'
        ? is_completed
        : typeof existingMetadata.isCompleted === 'boolean'
          ? existingMetadata.isCompleted
          : existing.is_completed ?? false;
    const metadataIsPaid =
      typeof is_paid === 'boolean'
        ? is_paid
        : typeof existingMetadata.isPaid === 'boolean'
          ? existingMetadata.isPaid
          : existing.is_paid ?? false;
    const nextCurriculum = {
      ...restCurriculum,
      attachments: attachmentsPayload,
      metadata: {
        ...existingMetadata,
        overview: metadataOverview,
        keyTakeaways: metadataKeyTakeaways,
        targetAudience: metadataTargetAudience,
        bonuses: metadataBonuses,
        specialRequirements: metadataSpecialRequirements,
        durationMinutes: metadataDuration,
        seo: metadataSeo,
        googleIntegrations: metadataGoogle,
        schedule: metadataSchedule,
        coverAsset: metadataCoverAsset,
        attachments: attachmentsPayload,
        xpReward: metadataXpReward,
        xpThreshold: metadataXpThreshold,
        level: metadataLevel,
        isCompleted: metadataIsCompleted,
        isPaid: metadataIsPaid,
      },
    };

    const { data: updated, error: updateError } = await supabase
      .from('courses')
      .update({
        title,
        description,
        level: level || 'beginner',
        xp_threshold: typeof xp_threshold === 'number' ? xp_threshold : 0,
        published: !!published,
        image_url: image_url ?? null,
        xp_reward:
          typeof xp_reward === 'number' ? xp_reward : existing.xp_reward ?? 0,
        is_completed:
          typeof is_completed === 'boolean' ? is_completed : wasCompleted,
        is_paid:
          typeof is_paid === 'boolean' ? is_paid : existing.is_paid ?? false,
        overview: typeof overview === 'string' ? overview : existing.overview ?? '',
        key_takeaways: Array.isArray(key_takeaways)
          ? key_takeaways
          : existing.key_takeaways ?? [],
        target_audience: Array.isArray(target_audience)
          ? target_audience
          : existing.target_audience ?? [],
        duration_minutes:
          typeof duration_minutes === 'number'
            ? duration_minutes
            : existing.duration_minutes ?? 0,
        seo: seo ?? existing.seo ?? null,
        google_integrations:
          google_integrations ?? existing.google_integrations ?? null,
        curriculum: nextCurriculum,
        publish_at: publish_at ?? null,
        expire_at: expire_at ?? null,
        updated_at: now,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error('Error updating course:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update course.' },
        { status: 500 },
      );
    }

    // Se acabou de ser marcado como completed e tem XP extra, aplicar XP retroativo
    const justCompleted =
      !wasCompleted && !!updated.is_completed && (updated.xp_reward ?? 0) > 0;

    if (justCompleted) {
      const { error: rpcError } = await supabase.rpc(
        'apply_course_completion_xp',
        { p_course_id: params.id },
      );

      if (rpcError) {
        console.error(
          'Error applying retro course XP via apply_course_completion_xp:',
          rpcError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      course: updated,
      message: 'Course updated successfully.',
    });
  } catch (error) {
    console.error('Unexpected error in PUT /api/admin/courses/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  // Apenas Super Admin pode apagar cursos
  if (role !== 'Super Admin') {
    return NextResponse.json(
      {
        success: false,
        error: 'Only Super Admin can delete courses.',
      },
      { status: 403 },
    );
  }

  const canManageCourses = await userHasPermission(
    currentUser.userId,
    role,
    'canManageCourses',
  );

  if (!canManageCourses) {
    return NextResponse.json(
      {
        success: false,
        error: 'You do not have permission to manage courses.',
      },
      { status: 403 },
    );
  }

  try {
    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting course:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete course.' },
        { status: 500 },
      );
    }

    // FK com ON DELETE CASCADE trata de módulos e lições
    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully.',
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/courses/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
