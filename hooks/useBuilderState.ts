import { useCallback } from 'react';
import { useBuilderContext } from '@/contexts/BuilderContext';
import type {
  Attachment,
  BuilderState,
  LangCode,
  MediaAsset,
} from '@/types/builder';

type MutableBuilderState<T> = T | ((previous: T) => T);

export function useBuilderState() {
  const { state, updateState } = useBuilderContext();

  const patchState = useCallback(
    (patch: Partial<BuilderState>) => {
      updateState(
        (prev) =>
          ({
            ...prev,
            ...patch,
          }) as BuilderState,
      );
    },
    [updateState],
  );

  const updateTranslatedField = useCallback(
    (field: 'title' | 'longDescription', language: LangCode, value: string) => {
      updateState((prev) => ({
        ...prev,
        [field]: {
          ...prev[field],
          [language]: value,
        },
      }));
    },
    [updateState],
  );

  const upsertAttachment = useCallback(
    (attachment: Attachment) => {
      updateState((prev) => ({
        ...prev,
        attachments: [
          ...prev.attachments.filter((a) => a.id !== attachment.id),
          attachment,
        ],
      }));
    },
    [updateState],
  );

  const removeAttachment = useCallback(
    (attachmentId: string) => {
      updateState((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((a) => a.id !== attachmentId),
      }));
    },
    [updateState],
  );

  const setCoverImage = useCallback(
    (asset: MediaAsset | null) => {
      updateState((prev) => ({
        ...prev,
        coverImage: asset,
      }));
    },
    [updateState],
  );

  return {
    state,
    patchState,
    updateTranslatedField,
    upsertAttachment,
    removeAttachment,
    setCoverImage,
    updateState: useCallback(
      (next: MutableBuilderState<BuilderState>) => updateState(next),
      [updateState],
    ),
  };
}
