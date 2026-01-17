import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRole } from '@/lib/roles';
import { isMissingColumn, isMissingTable, formatMissingResourceError } from '@/lib/postgres';
import { buildLessonIdVariants, normalizeLessonIdForStorage } from '@/lib/lesson-id';

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 200;

type HistoryEntry = {
  type: 'blog' | 'lesson' | 'course' | 'glossary' | 'dm';
  timestamp: string;
  user: { id: string; username: string | null; full_name: string | null } | null;
  title: string | Record<string, string> | null;
  meta?: Record<string, unknown> | null;
};

export async function GET(request: NextRequest, { params }: { params: { houseKey: string } }) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const houseKey = (params.houseKey || '').toUpperCase();
  if (!houseKey) {
    return NextResponse.json({ success: false, error: 'Missing house key.' }, { status: 400 });
  }

  try {
    const { data: houseRow, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id')
      .eq('house_key', houseKey)
      .maybeSingle();
    if (houseError) throw houseError;
    if (!houseRow?.id) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }

    const houseId = houseRow.id as string;

    const isAdmin = isAdminRole(user.role);
    let isStaff = isAdmin;
    if (!isStaff) {
      const { data: adminAssignments, error: assignmentError } = await supabaseAdmin
        .from('admin_assignments')
        .select('id')
        .eq('user_id', user.userId);
      if (assignmentError && !isMissingTable(assignmentError)) throw assignmentError;
      const adminIds = (adminAssignments ?? []).map((row: { id: string }) => row.id).filter(Boolean);
      if (adminIds.length) {
        const { data: headRows, error: headError } = await supabaseAdmin
          .from('house_heads')
          .select('id')
          .eq('house_id', houseId)
          .in('admin_id', adminIds)
          .limit(1);
        if (headError && !isMissingTable(headError)) throw headError;
        if (headRows && headRows.length > 0) {
          isStaff = true;
        }
      }
      if (!isStaff) {
        const { data: modRows, error: modError } = await supabaseAdmin
          .from('house_moderators')
          .select('id')
          .eq('house_id', houseId)
          .eq('user_id', user.userId)
          .limit(1);
        if (modError && !isMissingTable(modError)) throw modError;
        if (modRows && modRows.length > 0) {
          isStaff = true;
        }
      }
    }

    if (!isStaff) {
      return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || DEFAULT_LIMIT, MAX_LIMIT);

    let memberRows: { user_id: string }[] = [];
    try {
      let { data: membershipData, error: membershipError } = await supabaseAdmin
        .from('user_houses')
        .select('user_id')
        .eq('house_id', houseId)
        .eq('membership_role', 'MEMBER')
        .is('removed_at', null);
      if (membershipError && isMissingColumn(membershipError)) {
        const retry = await supabaseAdmin
          .from('user_houses')
          .select('user_id')
          .eq('house_id', houseId)
          .eq('membership_role', 'MEMBER');
        membershipData = retry.data ?? null;
        membershipError = retry.error ?? null;
      }
      if (membershipError) {
        if (isMissingTable(membershipError)) {
          return NextResponse.json({ success: false, error: formatMissingResourceError('user_houses') }, { status: 500 });
        }
        throw membershipError;
      }
      memberRows = membershipData ?? [];
    } catch (error) {
      console.error('[houses/history] failed to load user_houses', error);
      return NextResponse.json({ success: false, error: 'Failed to resolve house members.' }, { status: 500 });
    }

    const memberIds = Array.from(new Set(memberRows.map((row) => row.user_id).filter(Boolean)));
    if (memberIds.length === 0) {
      return NextResponse.json({ success: true, history: [] });
    }

    const perTypeLimit = Math.min(Math.max(Math.ceil(limit / 3), 10), limit);

    const [blogReads, lessonCompletions, courseCompletions, glossaryReads, privateMessages] = await Promise.all([
      supabaseAdmin
        .from('blog_reads')
        .select('user_id, blog_post_id, completed_at')
        .in('user_id', memberIds)
        .order('completed_at', { ascending: false })
        .limit(perTypeLimit),
      supabaseAdmin
        .from('lesson_completions')
        .select('user_id, lesson_id, completed_at')
        .in('user_id', memberIds)
        .order('completed_at', { ascending: false })
        .limit(perTypeLimit),
      supabaseAdmin
        .from('course_completions')
        .select('user_id, course_id, completed_at')
        .in('user_id', memberIds)
        .order('completed_at', { ascending: false })
        .limit(perTypeLimit),
      supabaseAdmin
        .from('glossary_term_reads')
        .select('user_id, term_id, completed_at')
        .in('user_id', memberIds)
        .order('completed_at', { ascending: false })
        .limit(perTypeLimit),
      supabaseAdmin
        .from('house_private_messages')
        .select('id, sender_id, recipient_id, subject, created_at')
        .eq('house_id', houseId)
        .order('created_at', { ascending: false })
        .limit(perTypeLimit),
    ]);

    const errors = [
      blogReads.error,
      lessonCompletions.error,
      courseCompletions.error,
      glossaryReads.error,
      privateMessages.error,
    ].filter(Boolean);
    if (errors.length) {
      const missing = errors.find((err) => isMissingTable(err as any));
      if (missing) {
        return NextResponse.json({ success: false, error: formatMissingResourceError('history sources') }, { status: 500 });
      }
      throw errors[0];
    }

    const blogIds = Array.from(new Set((blogReads.data ?? []).map((row: any) => row.blog_post_id).filter(Boolean)));
    const lessonIds = Array.from(
      new Set(
        (lessonCompletions.data ?? [])
          .map((row: any) => row.lesson_id as string | null | undefined)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const courseIds = Array.from(new Set((courseCompletions.data ?? []).map((row: any) => row.course_id).filter(Boolean)));
    const termIds = Array.from(new Set((glossaryReads.data ?? []).map((row: any) => row.term_id).filter(Boolean)));
    const messageUsers = Array.from(
      new Set(
        (privateMessages.data ?? [])
          .flatMap((row: any) => [row.sender_id, row.recipient_id])
          .filter(Boolean),
      ),
    );

    const [blogPosts, courses, glossaryTerms] = await Promise.all([
      blogIds.length
        ? supabaseAdmin.from('blog_posts').select('id, title').in('id', blogIds)
        : Promise.resolve({ data: [], error: null }),
      courseIds.length
        ? supabaseAdmin.from('courses').select('id, title').in('id', courseIds)
        : Promise.resolve({ data: [], error: null }),
      termIds.length
        ? supabaseAdmin.from('glossary_terms').select('id, term_pt, term_es, term_en').in('id', termIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const contentErrors = [blogPosts.error, courses.error, glossaryTerms.error].filter(Boolean);
    if (contentErrors.length) {
      const missing = contentErrors.find((err) => isMissingTable(err as any));
      if (missing) {
        return NextResponse.json({ success: false, error: formatMissingResourceError('content tables') }, { status: 500 });
      }
      throw contentErrors[0];
    }

    const userIds = Array.from(
      new Set(
        [
          ...(blogReads.data ?? []).map((row: any) => row.user_id),
          ...(lessonCompletions.data ?? []).map((row: any) => row.user_id),
          ...(courseCompletions.data ?? []).map((row: any) => row.user_id),
          ...(glossaryReads.data ?? []).map((row: any) => row.user_id),
          ...messageUsers,
        ].filter(Boolean),
      ),
    );

    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name')
      .in('id', userIds);
    if (usersError && !isMissingTable(usersError)) {
      throw usersError;
    }

    const userMap = new Map<string, { id: string; username: string | null; full_name: string | null }>();
    (users ?? []).forEach((row: any) => {
      userMap.set(row.id, { id: row.id, username: row.username ?? null, full_name: row.full_name ?? null });
    });

    const blogMap = new Map<string, any>();
    (blogPosts.data ?? []).forEach((row: any) => blogMap.set(row.id, row.title ?? null));
    const courseMap = new Map<string, any>();
    (courses.data ?? []).forEach((row: any) => courseMap.set(row.id, row.title ?? null));
    const termMap = new Map<string, any>();
    (glossaryTerms.data ?? []).forEach((row: any) =>
      termMap.set(row.id, { pt: row.term_pt, es: row.term_es, en: row.term_en }),
    );
    const lessonMap = await resolveLessonTitles(lessonIds);

    const history: HistoryEntry[] = [];

    (blogReads.data ?? []).forEach((row: any) => {
      history.push({
        type: 'blog',
        timestamp: row.completed_at,
        user: userMap.get(row.user_id) ?? null,
        title: blogMap.get(row.blog_post_id) ?? null,
        meta: { id: row.blog_post_id },
      });
    });

    (lessonCompletions.data ?? []).forEach((row: any) => {
      history.push({
        type: 'lesson',
        timestamp: row.completed_at,
        user: userMap.get(row.user_id) ?? null,
        title:
          lessonMap.get(normalizeLessonIdForStorage(row.lesson_id) || row.lesson_id) ??
          lessonMap.get(row.lesson_id) ??
          null,
        meta: { id: row.lesson_id },
      });
    });

    (courseCompletions.data ?? []).forEach((row: any) => {
      history.push({
        type: 'course',
        timestamp: row.completed_at,
        user: userMap.get(row.user_id) ?? null,
        title: courseMap.get(row.course_id) ?? null,
        meta: { id: row.course_id },
      });
    });

    (glossaryReads.data ?? []).forEach((row: any) => {
      history.push({
        type: 'glossary',
        timestamp: row.completed_at,
        user: userMap.get(row.user_id) ?? null,
        title: termMap.get(row.term_id) ?? null,
        meta: { id: row.term_id },
      });
    });

    (privateMessages.data ?? []).forEach((row: any) => {
      history.push({
        type: 'dm',
        timestamp: row.created_at,
        user: userMap.get(row.sender_id) ?? null,
        title: row.subject ?? null,
        meta: { recipientId: row.recipient_id, messageId: row.id },
      });
    });

    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ success: true, history: history.slice(0, limit) });
  } catch (error) {
    console.error('[houses/history] failed', error);
    return NextResponse.json({ success: false, error: 'Failed to load history.' }, { status: 500 });
  }
}

const LANGUAGE_KEYS = ['pt', 'en', 'es', 'fr', 'it', 'de'];

const resolveMultilingualText = (raw: any, fallback: string) => {
  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    for (const key of LANGUAGE_KEYS) {
      if (typeof raw[key] === 'string' && raw[key].trim().length > 0) {
        return raw[key];
      }
    }
  }
  return fallback;
};

async function resolveLessonTitles(lessonIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(lessonIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const candidateSet = new Set(
    uniqueIds.map((id) => normalizeLessonIdForStorage(id) || id),
  );

  const { data: courses, error } = await supabaseAdmin
    .from('courses')
    .select('id, curriculum');

  if (error || !courses) {
    console.error('Failed to resolve lesson titles for history:', error);
    return new Map();
  }

  const map = new Map<string, string>();

  courses.forEach((course: any) => {
    const topics: any[] = Array.isArray(course?.curriculum?.topics)
      ? course.curriculum.topics
      : [];

    topics.forEach((topic: any, topicIndex: number) => {
      const topicId = topic?.id || `topic-${topicIndex + 1}`;
      const lessons = Array.isArray(topic?.lessons) ? topic.lessons : [];

      lessons.forEach((lesson: any, lessonIndex: number) => {
        const lessonId = lesson?.id || `${topicId}-lesson-${lessonIndex + 1}`;
        const title = resolveMultilingualText(lesson?.title, 'Lesson');
        const normalized = normalizeLessonIdForStorage(lessonId) || lessonId;
        const variants = buildLessonIdVariants(lessonId);
        const keys = new Set<string>([lessonId, normalized, ...variants]);

        const shouldRegister = Array.from(keys).some((key) =>
          candidateSet.has(normalizeLessonIdForStorage(key) || key),
        );
        if (!shouldRegister) return;

        keys.forEach((key) => {
          const normalizedKey = normalizeLessonIdForStorage(key) || key;
          map.set(normalizedKey, title);
          map.set(key, title);
        });
      });
    });
  });

  return map;
}
