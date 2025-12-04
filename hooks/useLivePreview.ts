import { useEffect, useRef } from 'react';
import { useBuilderContext } from '@/contexts/BuilderContext';
import type { BuilderState } from '@/types/builder';

interface UseLivePreviewOptions {
  data: BuilderState;
  enabled?: boolean;
  debounce?: number;
}

export function useLivePreview({
  data,
  enabled = true,
  debounce = 300,
}: UseLivePreviewOptions) {
  const {
    previewData,
    setPreviewData,
    previewMode,
    setPreviewMode,
  } = useBuilderContext();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setPreviewData(data);
    }, debounce);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounce, enabled, setPreviewData]);

  return {
    previewData,
    previewMode,
    setPreviewMode,
  };
}
