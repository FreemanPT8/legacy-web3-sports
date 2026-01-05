'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'legacy_term_agreement_v1';

export function useTermAgreement() {
  const [acceptedAt, setAcceptedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        setAcceptedAt(parsed);
      }
    }
    setLoading(false);
  }, []);

  const accept = useCallback(() => {
    const now = Date.now();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(now));
    }
    setAcceptedAt(now);
  }, []);

  return { acceptedAt, loading, accept, isAccepted: !!acceptedAt };
}
