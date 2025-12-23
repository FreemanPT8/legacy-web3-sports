import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MediaAsset } from '@/types/builder';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type SectionKey = 'hero' | 'leaderboard' | 'web3Academy' | 'web3Sports';

interface UseManagedMediaSettingOptions {
  fallbackUrl?: string;
  initialOffset?: number;
  enableOffset?: boolean;
}

export function useManagedMediaSetting(
  section: SectionKey,
  {
    fallbackUrl,
    initialOffset = 0,
    enableOffset = false,
  }: UseManagedMediaSettingOptions = {},
) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [assetUrl, setAssetUrl] = useState<string | null>(fallbackUrl ?? null);
  const [offset, setOffset] = useState(initialOffset);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchSetting = async () => {
      try {
        const res = await fetch('/api/media/settings');
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.success || !data.settings?.[section]) return;
        const setting = data.settings[section];
        if (cancelled) return;
        setAsset(setting.asset ?? null);
        setAssetUrl(setting.asset?.url || fallbackUrl || null);
        if (enableOffset) {
          setOffset(
            typeof setting.offset === 'number' ? setting.offset : initialOffset,
          );
        }
      } catch (err) {
        console.error('Failed to fetch managed media setting:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSetting();

    return () => {
      cancelled = true;
    };
  }, [section, fallbackUrl, enableOffset, initialOffset]);

  const persistSetting = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        setSaving(true);
        const token = getToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch('/api/admin/media/settings', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            section,
            ...body,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to update media setting.');
        }
        return true;
      } catch (err) {
        console.error('Error persisting media setting:', err);
        toast({
          title: 'Error updating image',
          description:
            err instanceof Error
              ? err.message
              : 'Could not save the selected image.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [getToken, section, toast],
  );

  const updateAsset = useCallback(
    async (next: MediaAsset | null) => {
      if (next && !next.id) {
        toast({
          title: 'Unsupported image',
          description: 'Please select an uploaded media asset before saving.',
          variant: 'destructive',
        });
        return;
      }
      const previousAsset = asset;
      const previousUrl = assetUrl;
      setAsset(next);
      setAssetUrl(next?.url || fallbackUrl || null);
      const success = await persistSetting({
        assetId: next?.id ?? null,
      });
      if (!success) {
        setAsset(previousAsset ?? null);
        setAssetUrl(previousUrl ?? fallbackUrl ?? null);
      }
    },
    [asset, assetUrl, fallbackUrl, persistSetting],
  );

  const updateOffset = useCallback(
    async (nextOffset: number) => {
      if (!enableOffset) return;
      const previous = offset;
      setOffset(nextOffset);
      const success = await persistSetting({ offset: nextOffset });
      if (!success) {
        setOffset(previous);
      }
    },
    [enableOffset, offset, persistSetting],
  );

  return useMemo(
    () => ({
      asset,
      assetUrl,
      offset,
      loading,
      saving,
      setAsset: updateAsset,
      setOffset: updateOffset,
    }),
    [asset, assetUrl, offset, loading, saving, updateAsset, updateOffset],
  );
}
