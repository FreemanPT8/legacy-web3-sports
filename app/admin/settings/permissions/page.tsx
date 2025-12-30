'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PermissionsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/users');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] text-white">
      <p className="text-sm text-slate-300">Redirecionando para /admin/users...</p>
    </div>
  );
}
