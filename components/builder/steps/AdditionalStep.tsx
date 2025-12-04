'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Trash2, ImageIcon, Link2, CalendarClock } from 'lucide-react';

import { useBuilderState } from '@/hooks/useBuilderState';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useScheduleCET } from '@/hooks/useScheduleCET';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from '@/components/ui/select';
import type {
  Attachment,
  MediaAsset,
  SeoConfig,
  BuilderState,
} from '@/types/builder';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';

type ListField =
  | 'keyTakeaways'
  | 'targetAudience'
  | 'bonuses'
  | 'specialRequirements';

export function AdditionalStep() {
  const { state, patchState } = useBuilderState();
  const attachmentLibrary = useMediaLibrary();
  const seoLibrary = useMediaLibrary();
  const [focusedAttachment, setFocusedAttachment] = useState<string | null>(null);
  const scheduleUtils = useScheduleCET();
  const [scheduleInputs, setScheduleInputs] = useState(() => ({
    publish: state.schedule.publishAt
      ? scheduleUtils.toInputValues(state.schedule.publishAt)
      : { date: '', time: '' },
    expire: state.schedule.expireAt
      ? scheduleUtils.toInputValues(state.schedule.expireAt)
      : { date: '', time: '' },
  }));

  useEffect(() => {
    setScheduleInputs({
      publish: state.schedule.publishAt
        ? scheduleUtils.toInputValues(state.schedule.publishAt)
        : { date: '', time: '' },
      expire: state.schedule.expireAt
        ? scheduleUtils.toInputValues(state.schedule.expireAt)
        : { date: '', time: '' },
    });
  }, [state.schedule.publishAt, state.schedule.expireAt, scheduleUtils]);

  const durationHours = useMemo(
    () => Math.floor((state.durationMinutes || 0) / 60),
    [state.durationMinutes],
  );
  const durationMinutesRemainder = useMemo(
    () => (state.durationMinutes || 0) % 60,
    [state.durationMinutes],
  );

  const updateDuration = (hours: number, minutes: number) => {
    const safeHours = Number.isFinite(hours) ? Math.max(0, hours) : 0;
    const safeMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
    patchState({
      durationMinutes: safeHours * 60 + Math.min(59, safeMinutes),
    });
  };

  const updateListValue = (field: ListField, index: number, value: string) => {
    const next = [...state[field]];
    next[index] = value;
    patchState({ [field]: next });
  };

  const addListItem = (field: ListField) => {
    patchState({ [field]: [...state[field], ''] });
  };

  const removeListItem = (field: ListField, index: number) => {
    patchState({
      [field]: state[field].filter((_, idx) => idx !== index),
    });
  };

  const upsertAttachment = (attachment: Attachment) => {
    patchState({
      attachments: [
        ...state.attachments.filter((item) => item.id !== attachment.id),
        attachment,
      ],
    });
  };

  const removeAttachment = (attachmentId: string) => {
    patchState({
      attachments: state.attachments.filter((item) => item.id !== attachmentId),
    });
  };

  const handleAttachmentSelect = (asset: MediaAsset) => {
    const attachmentId = `${asset.id}-${Date.now()}`;
    upsertAttachment({
      id: attachmentId,
      label: asset.title || 'Attachment',
      asset,
      externalUrl: null,
    });
    setFocusedAttachment(attachmentId);
    attachmentLibrary.closeLibrary();
  };

  const handleSeoImageSelect = (asset: MediaAsset) => {
    patchState({
      seo: {
        ...state.seo,
        ogImageUrl: asset.url,
      },
    });
    seoLibrary.closeLibrary();
  };

  const keywordsValue = state.seo.keywords.join(', ');
  const publishInputs = scheduleInputs.publish;
  const expireInputs = scheduleInputs.expire;

  const handleScheduleInputChange = useCallback(
    (field: 'publishAt' | 'expireAt', part: 'date' | 'time', value: string) => {
      setScheduleInputs((prev) => {
        const next = {
          ...prev,
          [field === 'publishAt' ? 'publish' : 'expire']: {
            ...prev[field === 'publishAt' ? 'publish' : 'expire'],
            [part]: value,
          },
        };

        const target = field === 'publishAt' ? next.publish : next.expire;
        if (target.date && target.time) {
          const iso = scheduleUtils.fromInput(target.date, target.time);
          patchState({
            schedule: {
              ...state.schedule,
              [field]: iso,
              status:
                field === 'publishAt' && state.schedule.status === 'draft'
                  ? 'scheduled'
                  : state.schedule.status,
            },
          });
        } else if (state.schedule[field]) {
          patchState({
            schedule: {
              ...state.schedule,
              [field]: null,
              status:
                field === 'publishAt' && state.schedule.status === 'scheduled'
                  ? 'draft'
                  : state.schedule.status,
            },
          });
        }

        return next;
      });
    },
    [patchState, scheduleUtils, state.schedule],
  );

  const handleScheduleClear = useCallback(
    (field: 'publishAt' | 'expireAt') => {
      setScheduleInputs((prev) => ({
        ...prev,
        [field === 'publishAt' ? 'publish' : 'expire']: { date: '', time: '' },
      }));
      if (state.schedule[field]) {
        patchState({
          schedule: {
            ...state.schedule,
            [field]: null,
            status:
              field === 'publishAt' && state.published
                ? 'published'
                : 'draft',
          },
        });
      }
    },
    [patchState, state.published, state.schedule],
  );

  const handleStatusChange = useCallback(
    (status: 'draft' | 'scheduled' | 'published') => {
      patchState({
        schedule: { ...state.schedule, status },
        published: status === 'published',
      });
    },
    [patchState, state.schedule],
  );

  const handlePublishedToggle = useCallback(
    (value: boolean) => {
      patchState({
        published: value,
        schedule: {
          ...state.schedule,
          status: value ? 'published' : 'draft',
        },
      });
    },
    [patchState, state.schedule],
  );

  return (
    <div className="space-y-6">
      <ScheduleSection
        schedule={state.schedule}
        published={state.published}
        publishInputs={publishInputs}
        expireInputs={expireInputs}
        timezoneLabel={scheduleUtils.timezone}
        onInputChange={handleScheduleInputChange}
        onClear={handleScheduleClear}
        onStatusChange={handleStatusChange}
        onPublishedChange={handlePublishedToggle}
      />

      <OverviewSection
        overview={state.overview}
        onOverviewChange={(value) => patchState({ overview: value })}
        durationHours={durationHours}
        durationMinutes={durationMinutesRemainder}
        onDurationChange={updateDuration}
      />

      <ListSection
        title="Key takeaways"
        description="One benefit per line to highlight what learners will gain."
        values={state.keyTakeaways}
        onChange={(index, value) =>
          updateListValue('keyTakeaways', index, value)
        }
        onAdd={() => addListItem('keyTakeaways')}
        onRemove={(index) => removeListItem('keyTakeaways', index)}
      />

      <ListSection
        title="Target audience"
        description="Describe who this course is for."
        values={state.targetAudience}
        onChange={(index, value) =>
          updateListValue('targetAudience', index, value)
        }
        onAdd={() => addListItem('targetAudience')}
        onRemove={(index) => removeListItem('targetAudience', index)}
      />

      <ListSection
        title="Bonuses / assets"
        description="List included bonuses (templates, checklists, assets)."
        values={state.bonuses}
        onChange={(index, value) => updateListValue('bonuses', index, value)}
        onAdd={() => addListItem('bonuses')}
        onRemove={(index) => removeListItem('bonuses', index)}
      />

      <ListSection
        title="Special requirements"
        description="Prerequisites or tools learners need before starting."
        values={state.specialRequirements}
        onChange={(index, value) =>
          updateListValue('specialRequirements', index, value)
        }
        onAdd={() => addListItem('specialRequirements')}
        onRemove={(index) => removeListItem('specialRequirements', index)}
      />

      <AttachmentsSection
        attachments={state.attachments}
        onRemove={removeAttachment}
        onChange={(attachmentId, updater) => {
          const next = state.attachments.map((item) =>
            item.id === attachmentId ? updater(item) : item,
          );
          patchState({ attachments: next });
        }}
        onOpenLibrary={() => attachmentLibrary.openLibrary()}
        focusedAttachment={focusedAttachment}
        setFocusedAttachment={setFocusedAttachment}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SeoSection
          seo={state.seo}
          onChange={(seo) => patchState({ seo })}
          onOpenLibrary={() => seoLibrary.openLibrary()}
        />
        <SeoPreview
          title={state.seo.metaTitle || state.title.en}
          description={state.seo.metaDescription || state.overview}
          imageUrl={state.seo.ogImageUrl || state.coverImage?.url || null}
          slug={state.seo.slug || state.slug}
        />
      </div>

      <IntegrationsSection
        values={state.googleIntegrations}
        onChange={(value) =>
          patchState({ googleIntegrations: { ...state.googleIntegrations, ...value } })
        }
      />

      <MediaLibraryDialog
        open={attachmentLibrary.isOpen}
        onOpenChange={(open) =>
          open
            ? void attachmentLibrary.openLibrary()
            : attachmentLibrary.closeLibrary()
        }
        title="Select attachment"
        description="Escolhe ficheiros existentes, faz upload ou insere URLs externos."
        library={attachmentLibrary}
        onSelect={handleAttachmentSelect}
        allowUrl
      />
      <MediaLibraryDialog
        open={seoLibrary.isOpen}
        onOpenChange={(open) =>
          open ? void seoLibrary.openLibrary() : seoLibrary.closeLibrary()
        }
        title="Select OG image"
        description="Seleciona ou envia uma imagem optimizada para SEO/social."
        library={seoLibrary}
        onSelect={handleSeoImageSelect}
        allowUrl
      />
    </div>
  );
}

function OverviewSection({
  overview,
  onOverviewChange,
  durationHours,
  durationMinutes,
  onDurationChange,
}: {
  overview: string;
  onOverviewChange: (value: string) => void;
  durationHours: number;
  durationMinutes: number;
  onDurationChange: (hours: number, minutes: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Short overview</Label>
          <RichTextEditor
            value={overview}
            onChange={onOverviewChange}
            placeholder="Summarize the course in a few impactful sentences."
            minRows={5}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Duration (hours)</Label>
            <Input
              type="number"
              min={0}
              value={durationHours}
              onChange={(event) =>
                onDurationChange(Number(event.target.value) || 0, durationMinutes)
              }
            />
          </div>
          <div>
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min={0}
              max={59}
              value={durationMinutes}
              onChange={(event) =>
                onDurationChange(durationHours, Number(event.target.value) || 0)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ListSectionProps {
  title: string;
  description: string;
  values: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

function ListSection({
  title,
  description,
  values,
  onChange,
  onAdd,
  onRemove,
}: ListSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-gray-500">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {values.length === 0 && (
          <p className="text-sm text-gray-500">Ainda não adicionaste itens.</p>
        )}
        {values.map((value, index) => (
          <div key={`${title}-${index}`} className="flex items-center gap-3">
            <Input
              value={value}
              onChange={(event) => onChange(index, event.target.value)}
              placeholder={`Item ${index + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              className="text-gray-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add item
        </Button>
      </CardContent>
    </Card>
  );
}

interface AttachmentsSectionProps {
  attachments: Attachment[];
  onRemove: (attachmentId: string) => void;
  onChange: (
    attachmentId: string,
    updater: (attachment: Attachment) => Attachment,
  ) => void;
  onOpenLibrary: () => void;
  focusedAttachment: string | null;
  setFocusedAttachment: (id: string | null) => void;
}

function AttachmentsSection({
  attachments,
  onRemove,
  onChange,
  onOpenLibrary,
  focusedAttachment,
  setFocusedAttachment,
}: AttachmentsSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Attachments & assets</CardTitle>
          <p className="text-sm text-gray-500">
            Upload PDFs, templates ou ligações externas (Notion, Dropbox, etc.).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onOpenLibrary}>
          <Plus className="mr-2 h-4 w-4" />
          Add attachment
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {attachments.length === 0 && (
          <p className="text-sm text-gray-500">Sem anexos ainda.</p>
        )}
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
          >
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {attachment.asset.type.toUpperCase()}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(attachment.id)}
                className="text-gray-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <Label>Label</Label>
                <Input
                  autoFocus={focusedAttachment === attachment.id}
                  value={attachment.label}
                  onChange={(event) => {
                    setFocusedAttachment(null);
                    onChange(attachment.id, (prev) => ({
                      ...prev,
                      label: event.target.value,
                    }));
                  }}
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-gray-500" />
                  External URL (optional)
                </Label>
                <Input
                  value={attachment.externalUrl ?? ''}
                  placeholder="https://..."
                  onChange={(event) =>
                    onChange(attachment.id, (prev) => ({
                      ...prev,
                      externalUrl:
                        event.target.value.trim().length > 0
                          ? event.target.value
                          : null,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SeoSection({
  seo,
  onChange,
  onOpenLibrary,
}: {
  seo: SeoConfig;
  onChange: (seo: SeoConfig) => void;
  onOpenLibrary: () => void;
}) {
  const keywordsValue = seo.keywords.join(', ');
  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO & social</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Meta title</Label>
          <Input
            value={seo.metaTitle}
            onChange={(event) =>
              onChange({ ...seo, metaTitle: event.target.value })
            }
            placeholder="Compelling title for search/social"
          />
        </div>
        <div>
          <Label>Meta description</Label>
          <Textarea
            value={seo.metaDescription}
            onChange={(event) =>
              onChange({ ...seo, metaDescription: event.target.value })
            }
            rows={3}
            placeholder="Short snippet used for previews."
          />
        </div>
        <div>
          <Label>Keywords (comma separated)</Label>
          <Input
            value={keywordsValue}
            onChange={(event) =>
              onChange({
                ...seo,
                keywords: event.target.value
                  .split(',')
                  .map((keyword) => keyword.trim())
                  .filter(Boolean),
              })
            }
            placeholder="web3, tokenomics, smart contracts"
          />
        </div>
        <div className="space-y-2">
          <Label>OG image</Label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onOpenLibrary}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Select from media library
            </Button>
            {seo.ogImageUrl && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onChange({ ...seo, ogImageUrl: null })}
              >
                Remove
              </Button>
            )}
          </div>
          {seo.ogImageUrl && (
            <div className="relative mt-3 h-32 w-full overflow-hidden rounded-xl border">
              <Image
                src={seo.ogImageUrl}
                alt="OG preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 480px"
                unoptimized
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationsSection({
  values,
  onChange,
}: {
  values: BuilderState['googleIntegrations'];
  onChange: (value: Partial<BuilderState['googleIntegrations']>) => void;
}) {
  const entries = [
    { key: 'searchConsole', label: 'Search Console' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'tagManager', label: 'Tag Manager' },
    { key: 'pageSpeed', label: 'PageSpeed' },
    { key: 'adsense', label: 'AdSense' },
    { key: 'optimize', label: 'Optimize' },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google integrations</CardTitle>
        <p className="text-sm text-gray-500">
          Mantém registo das integrações activas para este curso.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <div
            key={entry.key}
            className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
          >
            <div>
              <p className="text-sm font-semibold">{entry.label}</p>
              <p className="text-xs text-gray-500">Enable tracking/config.</p>
            </div>
            <Switch
              checked={values[entry.key]}
              onCheckedChange={(checked) =>
                onChange({ [entry.key]: checked })
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ScheduleSection({
  schedule,
  published,
  publishInputs,
  expireInputs,
  timezoneLabel,
  onInputChange,
  onClear,
  onStatusChange,
  onPublishedChange,
}: {
  schedule: BuilderState['schedule'];
  published: boolean;
  publishInputs: { date: string; time: string };
  expireInputs: { date: string; time: string };
  timezoneLabel: string;
  onInputChange: (
    field: 'publishAt' | 'expireAt',
    part: 'date' | 'time',
    value: string,
  ) => void;
  onClear: (field: 'publishAt' | 'expireAt') => void;
  onStatusChange: (value: 'draft' | 'scheduled' | 'published') => void;
  onPublishedChange: (value: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Publishing & schedule</CardTitle>
          <p className="text-sm text-gray-500">
            Control publication status, CET scheduling and optional expiration.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <CalendarClock className="h-4 w-4" />
          {timezoneLabel}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={schedule.status}
              onValueChange={(value) =>
                onStatusChange(value as 'draft' | 'scheduled' | 'published')
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
            <div>
              <Label className="text-sm">Published</Label>
              <p className="text-xs text-gray-500">
                Toggle when the course is live.
              </p>
            </div>
            <Switch
              checked={published}
              onCheckedChange={onPublishedChange}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ScheduleInputs
            label="Publish at"
            badge="Optional"
            dateValue={publishInputs.date}
            timeValue={publishInputs.time}
            onDateChange={(value) => onInputChange('publishAt', 'date', value)}
            onTimeChange={(value) => onInputChange('publishAt', 'time', value)}
            onClear={() => onClear('publishAt')}
          />
          <ScheduleInputs
            label="Expire at"
            badge="Optional"
            dateValue={expireInputs.date}
            timeValue={expireInputs.time}
            onDateChange={(value) => onInputChange('expireAt', 'date', value)}
            onTimeChange={(value) => onInputChange('expireAt', 'time', value)}
            onClear={() => onClear('expireAt')}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleInputs({
  label,
  badge,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  onClear,
}: {
  label: string;
  badge: string;
  dateValue: string;
  timeValue: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onClear: () => void;
}) {
  const hasValue = Boolean(dateValue || timeValue);
  return (
    <div className="rounded-xl border border-gray-200 p-4 shadow-sm dark:border-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <Label>{label}</Label>
          <p className="text-xs text-gray-500">
            Define the CET date and time.
          </p>
        </div>
        <Badge variant="secondary">{badge}</Badge>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="date"
          value={dateValue}
          onChange={(event) => onDateChange(event.target.value)}
        />
        <Input
          type="time"
          value={timeValue}
          onChange={(event) => onTimeChange(event.target.value)}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={!hasValue}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

function SeoPreview({
  title,
  description,
  imageUrl,
  slug,
}: {
  title: string;
  description: string;
  imageUrl: string | null;
  slug: string;
}) {
  const previewTitle = title || 'Legacy Builder preview';
  const previewDescription =
    description || 'A modern course or blog experience built with Legacy.';
  const previewUrl = `legacybuilder.app/${slug || 'your-entry'}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Social preview</CardTitle>
        <p className="text-sm text-gray-500">
          How your link may appear on X, LinkedIn, Telegram and beyond.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-800">
          {imageUrl ? (
            <div className="relative h-40 w-full bg-gray-100">
              <Image
                src={imageUrl}
                alt="Preview"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
              No OG image selected
            </div>
          )}
          <div className="space-y-1 border-t border-gray-200 bg-white p-4 text-left dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {previewUrl}
            </p>
            <p className="font-semibold leading-tight text-gray-900 dark:text-gray-50">
              {previewTitle}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {previewDescription}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

