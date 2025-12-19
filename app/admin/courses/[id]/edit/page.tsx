'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BuilderProvider } from '@/contexts/BuilderContext';
import type { CourseBuilderState } from '@/types/builder';
import {
  buildCourseRequestPayload,
  ensureCurriculumTranslations,
  mapCourseToBuilderState,
} from '@/lib/course-builder';
import { CourseBuilderWorkspace } from '@/components/builder/CourseBuilderWorkspace';

type PermissionsResponse = {
  success: boolean;
  permissions?: {
    canManageCourses?: boolean;
  };
  error?: string;
};

type CourseApiResponse = {
  success: boolean;
  course?: any;
  error?: string;
};

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, getToken } = useAuth();

  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageCourses, setCanManageCourses] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [saving, setSaving] = useState(false);

  const [builderState, setBuilderState] =
    useState<CourseBuilderState | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [xpTotalDistributed, setXpTotalDistributed] = useState(0);
  const [xpCreatorDistributed, setXpCreatorDistributed] = useState(0);

  const courseId = params?.id?.toString() || '';
  const entityType: 'course' = 'course';

  const buildAuthHeaders = useCallback(() => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [getToken]);

  // Gate básico por role
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Permissões finas (canManageCourses)
  useEffect(() => {
    if (loading || !user) return;

    if (user.role === 'Super Admin') {
      setCanManageCourses(true);
      setPermissionsLoaded(true);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const token = getToken();
        const res = await fetch('/api/admin/permissions', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data: PermissionsResponse = await res.json();
        if (!res.ok || !data.success) {
          setCanManageCourses(false);
        } else {
          setCanManageCourses(Boolean(data.permissions?.canManageCourses));
        }
      } catch (error) {
        console.error('Unexpected error fetching permissions:', error);
        setCanManageCourses(false);
      } finally {
        setPermissionsLoaded(true);
      }
    };

    fetchPermissions();
  }, [user, loading, getToken]);

  // Carregar curso + estado do builder (e tentar recuperar draft)
  useEffect(() => {
    if (!user || !courseId) return;

    const fetchCourse = async () => {
      setLoadingCourse(true);
      try {
        const headers = buildAuthHeaders();
        const res = await fetch(`/api/admin/courses/${courseId}`, {
          headers,
        });
        const data: CourseApiResponse = await res.json();
        if (!res.ok || !data.success || !data.course) {
          toast({
            title: 'Error',
            description: data.error || 'Failed to load course.',
            variant: 'destructive',
          });
            router.push('/admin/courses');
          return;
        }

        let nextState = mapCourseToBuilderState(data.course);

        try {
          const draftRes = await fetch(
            `/api/builder/draft?entityType=${entityType}&entityId=${courseId}`,
            { headers },
          );
          const draftData = await draftRes.json();
          if (
            draftRes.ok &&
            draftData.success &&
            draftData.draft?.state?.entityType === entityType
          ) {
            nextState = draftData.draft.state as CourseBuilderState;
            toast({
              title: 'Draft restored',
              description: 'Unsaved edits were recovered from autosave.',
            });
          }
        } catch (draftError) {
          console.warn('Unable to restore course draft', draftError);
        }

        setBuilderState(ensureCurriculumTranslations(nextState));
        setAuthorName(data.course.author_name || null);
        setXpTotalDistributed(data.course.xp_total_distributed || 0);
        setXpCreatorDistributed(data.course.xp_creator_distributed || 0);
      } catch (error) {
        console.error('Failed to fetch course for edit:', error);
        toast({
          title: 'Network error',
          description: 'Could not load course data. Please try again.',
          variant: 'destructive',
        });
        router.push('/admin/courses');
      } finally {
        setLoadingCourse(false);
      }
    };

    fetchCourse();
  }, [user, buildAuthHeaders, courseId, router, toast, entityType]);

  const persistCourse = useCallback(
    async (state: CourseBuilderState) => {
      if (!courseId) {
        throw new Error('Missing course id.');
      }

      const headers = buildAuthHeaders();
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          course: buildCourseRequestPayload(state),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save course.');
      }

      return data;
    },
    [courseId, buildAuthHeaders],
  );

  const saveDraft = useCallback(
    async (state: CourseBuilderState) => {
      if (!courseId) return;
      const headers = buildAuthHeaders();
      const res = await fetch('/api/builder/draft', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entityType,
          entityId: courseId,
          state,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save course draft.');
      }
    },
    [buildAuthHeaders, courseId, entityType],
  );

  const clearDraft = useCallback(async () => {
    if (!courseId) return;
    try {
      const headers = buildAuthHeaders();
      const res = await fetch('/api/builder/draft', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          entityType,
          entityId: courseId,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to delete draft.');
      }
    } catch (error) {
      console.warn('Unable to clear course draft', error);
    }
  }, [buildAuthHeaders, courseId, entityType]);

  const handleSave = useCallback(
    async (state: CourseBuilderState) => {
      if (!user || !canManageCourses || !courseId) {
        toast({
          title: 'Not allowed',
          description: 'You do not have permission to edit courses.',
          variant: 'destructive',
        });
        return;
      }

      const hasAnyTitle = Object.values(state.title).some(
        (value) => typeof value === 'string' && value.trim().length > 0,
      );
      if (!hasAnyTitle) {
        toast({
          title: 'Missing title',
          description: 'Please add a title in at least one language.',
          variant: 'destructive',
        });
        return;
      }

      setSaving(true);
      try {
        await persistCourse(state);
        await clearDraft();
        toast({
          title: 'Course updated',
          description: 'The course was updated successfully.',
        });
        router.push('/admin/courses');
      } catch (error) {
        console.error('Failed to update course:', error);
        toast({
          title: 'Network error',
          description: 'Could not update course. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    },
    [
      user,
      canManageCourses,
      courseId,
      persistCourse,
      clearDraft,
      router,
      toast,
    ],
  );

  const handleAutosave = useCallback(
    async (state: CourseBuilderState) => {
      if (!user || !canManageCourses || !courseId || saving) {
        return;
      }

      const hasAnyTitle = Object.values(state.title).some(
        (value) => typeof value === 'string' && value.trim().length > 0,
      );

      if (!hasAnyTitle) return;

      await saveDraft(state);
    },
    [user, canManageCourses, courseId, saving, saveDraft],
  );

  const handlePreview = useCallback((slug: string) => {
    if (!slug) return;
    const href = `/courses/${slug}`;
    window.open(href, '_blank');
  }, []);

  // Loading / gates
  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin') ||
    !permissionsLoaded
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!canManageCourses) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <main className="flex-1 py-8 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <Lock className="h-10 w-10 text-amber-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">No permission</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You don&apos;t have permission to edit courses. Please contact a
              Super Admin if you think this is a mistake.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (loadingCourse || !builderState) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              Loading course...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <BuilderProvider initialState={builderState}>
      <CourseBuilderWorkspace
        saving={saving}
        onSubmit={handleSave}
        onPreview={handlePreview}
        onAutosave={handleAutosave}
        metadata={{
          authorName,
          xpTotalDistributed,
          xpCreatorDistributed,
        }}
      />
    </BuilderProvider>
  );
}
