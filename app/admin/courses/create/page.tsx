// app/admin/courses/create/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BuilderProvider } from '@/contexts/BuilderContext';
import {
  createEmptyCourseState,
  buildCourseRequestPayload,
  ensureCurriculumTranslations,
} from '@/lib/course-builder';
import { CourseBuilderWorkspace } from '@/components/builder/CourseBuilderWorkspace';
import type { CourseBuilderState } from '@/types/builder';

type PermissionsResponse = {
  success: boolean;
  permissions?: {
    canManageCourses?: boolean;
  };
  error?: string;
};

type CreateCourseResponse = {
  success: boolean;
  course?: { id: string };
  error?: string;
};

export default function CreateCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, getToken } = useAuth();

  const [saving, setSaving] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageCourses, setCanManageCourses] = useState(false);
  const [initialState, setInitialState] =
    useState<CourseBuilderState | null>(null);

  const entityType: 'course' = 'course';
  const draftEntityId = 'new-course-legacy-builder';

  const buildAuthHeaders = useCallback(() => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [getToken]);

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

  useEffect(() => {
    if (
      !permissionsLoaded ||
      !canManageCourses ||
      initialState ||
      !user
    ) {
      return;
    }

    const hydrateState = async () => {
      let nextState = createEmptyCourseState();
      try {
        const headers = buildAuthHeaders();
        const res = await fetch(
          `/api/builder/draft?entityType=${entityType}&entityId=${draftEntityId}`,
          { headers },
        );
        const data = await res.json();
        if (
          res.ok &&
          data.success &&
          data.draft?.state?.entityType === entityType
        ) {
          nextState = data.draft.state as CourseBuilderState;
          toast({
            title: 'Draft restored',
            description: 'Continuing from your last autosave.',
          });
        }
      } catch (error) {
        console.warn('Unable to load course draft', error);
      } finally {
        setInitialState(ensureCurriculumTranslations(nextState));
      }
    };

    hydrateState();
  }, [
    permissionsLoaded,
    canManageCourses,
    initialState,
    user,
    buildAuthHeaders,
    entityType,
    draftEntityId,
    toast,
  ]);

  const saveDraft = useCallback(
    async (state: CourseBuilderState) => {
      if (!canManageCourses) return;
      const headers = buildAuthHeaders();
      try {
        const res = await fetch('/api/builder/draft', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            entityType,
            entityId: draftEntityId,
            state,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          console.warn('Unable to persist course draft:', data.error);
        }
      } catch (error) {
        console.warn('Unable to save course draft:', error);
      }
    },
    [buildAuthHeaders, canManageCourses, draftEntityId, entityType],
  );

  const clearDraft = useCallback(async () => {
    const headers = buildAuthHeaders();
    try {
      const res = await fetch('/api/builder/draft', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          entityType,
          entityId: draftEntityId,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to clear draft.');
      }
    } catch (error) {
      console.warn('Unable to clear course draft', error);
    }
  }, [buildAuthHeaders, draftEntityId, entityType]);

  const handleSave = useCallback(
    async (state: CourseBuilderState) => {
      if (!user || !canManageCourses) {
        toast({
          title: 'Not allowed',
          description: 'You do not have permission to create courses.',
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
        const headers = buildAuthHeaders();
        const res = await fetch('/api/admin/courses/create', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            course: buildCourseRequestPayload(state),
            modules: [],
          }),
        });
        const data: CreateCourseResponse = await res.json();
        if (!res.ok || !data.success || !data.course) {
          toast({
            title: 'Error creating course',
            description: data.error || 'Failed to create course.',
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }

        await clearDraft();
        toast({
          title: 'Course created',
          description: 'Continue konfigurating details or add modules.',
        });

        router.push(`/admin/courses/${data.course.id}/edit`);
      } catch (error) {
        console.error('Failed to create course:', error);
        toast({
          title: 'Network error',
          description: 'Could not create course. Please try again.',
          variant: 'destructive',
        });
        setSaving(false);
      }
    },
    [user, canManageCourses, buildAuthHeaders, router, toast, clearDraft],
  );

  const handleAutosave = useCallback(
    async (state: CourseBuilderState) => {
      if (!user || !canManageCourses || saving) return;

      const hasAnyTitle = Object.values(state.title).some(
        (value) => typeof value === 'string' && value.trim().length > 0,
      );
      if (!hasAnyTitle) return;

      await saveDraft(state);
    },
    [user, canManageCourses, saving, saveDraft],
  );

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
              You don&apos;t have permission to create courses. Please contact a
              Super Admin if you think this is a mistake.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!initialState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Preparing builder...
          </p>
        </div>
      </div>
    );
  }

  return (
    <BuilderProvider initialState={initialState}>
      <CourseBuilderWorkspace
        saving={saving}
        onSubmit={handleSave}
        onAutosave={handleAutosave}
        metadata={{
          authorName: user?.username || user?.email || null,
          xpTotalDistributed: 0,
          xpCreatorDistributed: 0,
        }}
      />
    </BuilderProvider>
  );
}
