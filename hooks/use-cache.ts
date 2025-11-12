import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

const CACHE_DURATION = 5 * 60 * 1000;

export function useCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  duration: number = CACHE_DURATION
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (force: boolean = false) => {
    const cached = cache.get(key);
    const now = Date.now();

    if (!force && cached && now - cached.timestamp < duration) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await fetchFn();
      cache.set(key, { data: result, timestamp: now });
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, duration]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refresh };
}
