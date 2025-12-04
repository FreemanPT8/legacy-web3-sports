import { useCallback, useEffect, useRef } from 'react';
import { useBuilderContext } from '@/contexts/BuilderContext';
import type { BuilderState } from '@/types/builder';

interface UseAutosaveOptions {
  data: BuilderState;
  delay?: number;
  enabled?: boolean;
  save: (payload: BuilderState) => Promise<void>;
}

export function useAutosave({
  data,
  delay = 5000,
  enabled = true,
  save,
}: UseAutosaveOptions) {
  const { autosaveState, setAutosaveState } = useBuilderContext();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<BuilderState>(data);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  const runSave = useCallback(async () => {
    if (!enabled) return;
    try {
      setAutosaveState({
        status: 'saving',
        lastSavedAt: autosaveState.lastSavedAt,
      });
      await save(latestDataRef.current);
      setAutosaveState({
        status: 'idle',
        lastSavedAt: new Date().toISOString(),
        error: null,
      });
    } catch (error) {
      setAutosaveState({
        status: 'error',
        lastSavedAt: autosaveState.lastSavedAt,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to autosave changes.',
      });
    }
  }, [autosaveState.lastSavedAt, enabled, save, setAutosaveState]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      void runSave();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay, enabled, data, runSave]);

  return {
    autosaveState,
    triggerSave: runSave,
  };
}
