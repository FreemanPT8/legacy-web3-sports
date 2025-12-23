import { useCallback, useMemo, useState } from 'react';
import type { MediaAsset } from '@/types/builder';
import { useAuth } from '@/contexts/AuthContext';

interface UseMediaLibraryOptions {
  listEndpoint?: string;
  initialItems?: MediaAsset[];
}

export type MediaLibraryTab = 'library' | 'upload' | 'url';

const DEFAULT_PAGE_SIZE = 50;

type UploadPayload = {
  file: File;
  title?: string;
  alt?: string;
  tags?: string[];
  folder?: string;
};

type FetchOptions = {
  cursor?: string | null;
  reset?: boolean;
};

export function useMediaLibrary({
  initialItems = [],
  listEndpoint = '/api/admin/media/list',
}: UseMediaLibraryOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MediaLibraryTab>('library');
  const [items, setItems] = useState<MediaAsset[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const { getToken } = useAuth();

  const registerAsset = useCallback((asset: MediaAsset) => {
    setItems((prev) => [asset, ...prev.filter((i) => i.id !== asset.id)]);
  }, []);

  const fetchItems = useCallback(
    async ({ cursor = null, reset = false }: FetchOptions = {}) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('limit', String(DEFAULT_PAGE_SIZE));
        if (cursor) {
          params.set('cursor', cursor);
        }
        const query = params.toString() ? `?${params.toString()}` : '';
        const headers: Record<string, string> = {};
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${listEndpoint}${query}`, {
          headers,
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(
            data?.error || 'Unable to load media library at the moment.',
          );
        }
        const rawFiles = (data.files || data.items || []) as MediaAsset[];
        const normalized = rawFiles.map((file) => {
          if (file.type) return file;
          const mime = (file as any).mime_type || '';
          const normalizedType = mime.split('/')[0] || 'file';
          return { ...file, type: normalizedType } as MediaAsset;
        });
        setItems((prev) => {
          if (reset) return normalized;
          const existingIds = new Set(prev.map((item) => item.id));
          const appended = normalized.filter((asset) => !existingIds.has(asset.id));
          return [...prev, ...appended];
        });
        setNextCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.nextCursor));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unknown error loading media library.',
        );
      } finally {
        setLoading(false);
      }
    },
    [getToken, listEndpoint],
  );

  const openLibrary = useCallback(
    async (tab: MediaLibraryTab = 'library') => {
      setActiveTab(tab);
      setIsOpen(true);
      await fetchItems({ reset: true, cursor: null });
    },
    [fetchItems],
  );

  const closeLibrary = useCallback(() => {
    setIsOpen(false);
  }, []);

  const uploadAsset = useCallback(
    async ({ file, title, alt, tags, folder }: UploadPayload) => {
      setUploading(true);
      setError(null);
      try {
        setUploadProgress(5);
        const formData = new FormData();
        formData.append('file', file);
        if (title) formData.append('title', title);
        if (alt) formData.append('alt', alt);
        if (folder) formData.append('folder', folder);
        if (tags && tags.length > 0) {
          formData.append('tags', tags.join(','));
        }

        const headers: Record<string, string> = {};
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/admin/media/upload', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: formData,
        });
        const data = await res.json();
        setUploadProgress(75);
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to upload media.');
        }
        if (data.file) {
          setUploadProgress(100);
          registerAsset(data.file as MediaAsset);
          return data.file as MediaAsset;
        }
        return null;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Unknown error uploading media.',
        );
        return null;
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    },
    [getToken, registerAsset],
  );

  const deleteAsset = useCallback(
    async (assetId: string) => {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        const token = getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch('/api/admin/media/delete', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ id: assetId }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Unable to delete media asset.');
        }
        setItems((prev) => prev.filter((item) => item.id !== assetId));
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unknown error deleting media asset.',
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getToken],
  );

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const needle = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const haystack = [
        item.title,
        item.alt,
        item.tags?.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [items, searchTerm]);

  const refresh = useCallback(
    () => fetchItems({ reset: true, cursor: null }),
    [fetchItems],
  );

  const loadMore = useCallback(() => {
    if (!nextCursor) return Promise.resolve();
    return fetchItems({
      cursor: nextCursor,
      reset: false,
    });
  }, [fetchItems, nextCursor]);

  return {
    items: filteredItems,
    allItems: items,
    loading,
    uploading,
    uploadProgress,
    error,
    isOpen,
    activeTab,
    searchTerm,
    setSearchTerm,
    setActiveTab,
    openLibrary,
    closeLibrary,
    refresh,
    uploadAsset,
    registerAsset,
    deleteAsset,
    loadMore,
    hasMore,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}
