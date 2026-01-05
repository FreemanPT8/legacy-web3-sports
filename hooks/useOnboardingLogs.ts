'use client';

import { useCallback, useEffect, useState } from 'react';

import type { OnboardingLogEntry } from '@/types/onboarding';

const DEFAULT_INTERVAL = 5000;

export function useOnboardingLogs(pollInterval = DEFAULT_INTERVAL) {
  const [logs, setLogs] = useState<OnboardingLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/onboarding/logs', { cache: 'no-store' });
      const data = (await response.json()) as
        | { success: true; logs: OnboardingLogEntry[] }
        | { success: false; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.success ? 'Failed to fetch logs' : data.error || 'Failed to fetch logs');
      }
      setLogs(data.logs);
    } catch (err) {
      console.error('[useOnboardingLogs] fetch failed', err);
      setError('Falha ao carregar logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
    if (pollInterval <= 0) return;
    const id = setInterval(fetchLogs, pollInterval);
    return () => clearInterval(id);
  }, [fetchLogs, pollInterval]);

  return { logs, loading, error, refresh: fetchLogs };
}
