import { Button } from '@/components/ui/button';
import { useBuilderContext } from '@/contexts/BuilderContext';
import { Eye, Save } from 'lucide-react';

interface BuilderActionsProps {
  onPreview?: () => void;
  onSubmit?: () => void;
  previewLabel?: string;
  submitLabel?: string;
  submitDisabled?: boolean;
}

export function BuilderActions({
  onPreview,
  onSubmit,
  previewLabel = 'Preview',
  submitLabel = 'Update / Publish',
  submitDisabled,
}: BuilderActionsProps) {
  const { autosaveState } = useBuilderContext();

  const autosaveCopy =
    autosaveState.status === 'saving'
      ? 'Saving...'
      : autosaveState.status === 'error'
        ? 'Autosave failed'
        : autosaveState.lastSavedAt
          ? `Saved ${new Date(autosaveState.lastSavedAt).toLocaleTimeString()}`
          : 'Autosave enabled';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="text-xs text-gray-500">{autosaveCopy}</div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onPreview}
          disabled={!onPreview}
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          {previewLabel}
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!onSubmit || submitDisabled}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4" />
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
