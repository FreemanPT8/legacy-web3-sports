'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarClock, ImageIcon } from 'lucide-react';
import { LANGUAGES, type LangCode } from '@/types/builder';
import { useBuilderState } from '@/hooks/useBuilderState';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useScheduleCET } from '@/hooks/useScheduleCET';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

export function CourseBasicsStep() {
  const {
    state,
    updateTranslatedField,
    patchState,
    setCoverImage,
  } = useBuilderState();
  const [language, setLanguage] = useState<LangCode>('en');
  const [slugTouched, setSlugTouched] = useState(false);
  const mediaLibrary = useMediaLibrary();
  const { timezone, toInputValues, fromInput, validateFutureDate } =
    useScheduleCET();
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const coverUrl = state.coverImage?.url;
  const languageLabel =
    LANGUAGES.find((lang) => lang.code === language)?.name ||
    language;

  const titleValue = state.title[language] ?? '';
  const descriptionValue = state.longDescription[language] ?? '';

  const xpReward = state.xp.reward;
  const xpThreshold = state.xp.threshold;
  const isScheduled = Boolean(state.schedule.publishAt);

  const suggestedSlug = useMemo(() => slugify(titleValue), [titleValue]);
  const minDate = useMemo(() => {
    const parsed = toInputValues(new Date().toISOString());
    return parsed.date;
  }, [toInputValues]);

  useEffect(() => {
    if (state.schedule.publishAt) {
      const parsed = toInputValues(state.schedule.publishAt);
      setScheduleDate(parsed.date);
      setScheduleTime(parsed.time);
    } else {
      setScheduleDate('');
      setScheduleTime('');
      setScheduleError(null);
    }
  }, [state.schedule.publishAt, toInputValues]);

  const applySchedule = (nextDate: string, nextTime: string) => {
    if (!nextDate || !nextTime) {
      setScheduleError('Seleciona data e hora em CET.');
      return;
    }
    const iso = fromInput(nextDate, nextTime);
    const validation = validateFutureDate(iso);
    if (!validation.valid) {
      setScheduleError(validation.reason || 'Escolhe um horário no futuro.');
      return;
    }
    setScheduleError(null);
    patchState({
      schedule: {
        ...state.schedule,
        publishAt: iso,
        status: 'scheduled',
      },
      published: false,
    });
  };

  const handleScheduleToggle = (mode: 'now' | 'later') => {
    if (mode === 'now') {
      setScheduleError(null);
      patchState({
        schedule: {
          ...state.schedule,
          publishAt: null,
          status: state.published ? 'published' : 'draft',
        },
      });
      return;
    }

    let nextDate = scheduleDate;
    let nextTime = scheduleTime;
    if (!nextDate || !nextTime) {
      const fallback = new Date(Date.now() + 60 * 60 * 1000);
      const parsed = toInputValues(fallback.toISOString());
      nextDate = parsed.date;
      nextTime = parsed.time;
      setScheduleDate(parsed.date);
      setScheduleTime(parsed.time);
    }
    applySchedule(nextDate, nextTime);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {LANGUAGES.map((lang) => (
            <Badge
              key={lang.code}
              variant={lang.code === language ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setLanguage(lang.code as LangCode)}
            >
              {lang.name}
            </Badge>
          ))}
        </div>
        <div className="grid gap-4">
          <div>
            <div className="flex items-center justify-between">
              <Label>Title ({languageLabel})</Label>
              <span className="text-xs text-gray-500">
                Placeholder: “(NOME DO CURSO)”
              </span>
            </div>
            <Input
              value={titleValue}
              onChange={(event) => {
                const value = event.target.value;
                updateTranslatedField('title', language, value);
                if (!slugTouched && value.trim().length > 0) {
                  patchState({ slug: slugify(value) });
                }
              }}
              placeholder="(NOME DO CURSO)"
              className="text-lg font-semibold"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <Label>Slug</Label>
              <Input
                value={state.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  patchState({ slug: slugify(event.target.value) });
                }}
                placeholder={suggestedSlug || 'legacy-builder-course'}
              />
              {!slugTouched && suggestedSlug && (
                <p className="mt-1 text-xs text-gray-500">
                  Sugestão automática: {suggestedSlug}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
              <div>
                <Label className="text-xs text-gray-500">Access</Label>
                <p className="text-sm font-semibold">
                  {state.isPaid ? 'Paid' : 'Free'}
                </p>
              </div>
              <Switch
                checked={state.isPaid}
                onCheckedChange={(checked) =>
                  patchState({ isPaid: checked })
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Label>Long Description ({languageLabel})</Label>
          <RichTextEditor
            value={descriptionValue}
            onChange={(next) =>
              updateTranslatedField('longDescription', language, next)
            }
            placeholder="Use headings, listas, callouts, embeds..."
            minRows={8}
          />
          <p className="text-xs text-gray-500">
            Editor rico estilo Notion vem a seguir. Esta versão permite conteúdo base para validar fluxo.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
          <Label>Course Cover (1600×900 recomendado)</Label>
          {coverUrl ? (
            <div className="relative h-48 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
              <Image
                src={coverUrl}
                alt={state.coverImage?.alt || 'Course cover preview'}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 480px"
                priority={false}
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500">
              <ImageIcon className="mb-2 h-8 w-8" />
              Nenhuma imagem seleccionada
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                void mediaLibrary.openLibrary();
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Media Library
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                patchState({
                  coverImage: null,
                })
              }
              disabled={!coverUrl}
            >
              Remover
            </Button>
          </div>
          {coverUrl && (
            <p className="text-xs text-gray-500 break-all">
              {coverUrl}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Level</Label>
          <Select
            value={state.level}
            onValueChange={(level) =>
              patchState({ level: level as typeof state.level })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>XP Reward (course completion)</Label>
          <Input
            type="number"
            value={xpReward}
            min={0}
            onChange={(event) =>
              patchState({
                xp: {
                  ...state.xp,
                  reward: Number(event.target.value) || 0,
                },
              })
            }
          />
        </div>
        <div>
          <Label>XP Required to Unlock</Label>
          <Input
            type="number"
            value={xpThreshold}
            min={0}
            onChange={(event) =>
              patchState({
                xp: {
                  ...state.xp,
                  threshold: Number(event.target.value) || 0,
                },
              })
            }
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <Label className="text-xs uppercase text-gray-500">
              Published
            </Label>
            <p className="text-sm font-semibold">
              {state.published ? 'Online' : 'Draft'}
            </p>
          </div>
          <Switch
            checked={state.published}
            onCheckedChange={(checked) =>
              patchState({ published: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <Label className="text-xs uppercase text-gray-500">
              Course status
            </Label>
            <p className="text-sm font-semibold">
              {state.isCompleted ? 'Completed' : 'In progress'}
            </p>
          </div>
          <Switch
            checked={state.isCompleted}
            onCheckedChange={(checked) =>
              patchState({ isCompleted: checked })
            }
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-blue-600" />
              Publication schedule ({timezone})
            </Label>
            <p className="text-xs text-gray-500">
              Define quando o curso fica disponível (horário CET).
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={!isScheduled ? 'default' : 'outline'}
              onClick={() => handleScheduleToggle('now')}
            >
              Publish now
            </Button>
            <Button
              type="button"
              size="sm"
              variant={isScheduled ? 'default' : 'outline'}
              onClick={() => handleScheduleToggle('later')}
            >
              Schedule
            </Button>
          </div>
        </div>

        {isScheduled ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Date ({timezone})</Label>
                <Input
                  type="date"
                  min={minDate}
                  value={scheduleDate}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    setScheduleDate(nextDate);
                    applySchedule(nextDate, scheduleTime);
                  }}
                />
              </div>
              <div>
                <Label>Time ({timezone})</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(event) => {
                    const nextTime = event.target.value;
                    setScheduleTime(nextTime);
                    applySchedule(scheduleDate, nextTime);
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              O curso será publicado automaticamente no horário definido (CET).
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-500">
            Publica imediatamente quando carregares em Update/Publish.
          </p>
        )}
        {scheduleError && (
          <p className="text-xs text-red-600">{scheduleError}</p>
        )}
      </section>

      <MediaLibraryDialog
        open={mediaLibrary.isOpen}
        onOpenChange={(open) =>
          open
            ? mediaLibrary.openLibrary(mediaLibrary.activeTab)
            : mediaLibrary.closeLibrary()
        }
        library={mediaLibrary}
        onSelect={(asset) => {
          setCoverImage(asset);
          mediaLibrary.closeLibrary();
        }}
        title="Select course cover"
        description="Choose an image, upload ficheiros ou adiciona URLs externos."
        allowUrl
      />
    </div>
  );
}
