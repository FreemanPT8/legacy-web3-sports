import { useCallback, useMemo, useState } from 'react';
import type { MediaAsset } from '@/types/builder';
import { useAuth } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

interface UseMediaLibraryOptions {
  listEndpoint?: string;
  initialItems?: MediaAsset[];
}

export type MediaLibraryTab = 'library' | 'upload' | 'url';

type UploadPayload = {
  file: File;
  title?: string;
  alt?: string;
  tags?: string[];
  folder?: string;
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
  const { getToken } = useAuth();

  const registerAsset = useCallback((asset: MediaAsset) => {
    setItems((prev) => [asset, ...prev.filter((i) => i.id !== asset.id)]);
  }, []);

  const fetchItems = useCallback(
    async (search?: string) => {
      setLoading(true);
      setError(null);
      try {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const headers: Record<string, string> = {};
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${listEndpoint}${query}`, {
          headers,
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(
            data?.error || 'Unable to load media library at the moment.',
          );
        }
        const files = (data.files || data.items || []) as MediaAsset[];
        setItems(files);
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
    [listEndpoint],
  );

  const openLibrary = useCallback(
    async (tab: MediaLibraryTab = 'library') => {
      setActiveTab(tab);
      setIsOpen(true);
      await fetchItems();
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
    [],
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
    refresh: fetchItems,
    uploadAsset,
    registerAsset,
  };
}
