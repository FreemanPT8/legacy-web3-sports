'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ForumSunset from '@/components/forum/ForumSunset';

export default function AdminForumPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (
      !loading &&
      user &&
      user.role !== 'Super Admin' &&
      user.role !== 'Admin'
    ) {
      router.push('/dashboard');
    }
  }, [loading, router, user]);

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin')
  ) {
    return null;
  }

  return <ForumSunset />;
}
