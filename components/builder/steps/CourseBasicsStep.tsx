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
import { CalendarClock, ImageIcon, Sparkles } from 'lucide-react';
import { LANGUAGES, type LangCode, type CourseBuilderState } from '@/types/builder';
import { useBuilderState } from '@/hooks/useBuilderState';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useScheduleCET } from '@/hooks/useScheduleCET';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { useToast } from '@/hooks/use-toast';

type AcademyLevelOption = {
  slug: string;
  label: string;
  xpRange: string;
};

const FALLBACK_ACADEMY_LEVELS: AcademyLevelOption[] = [
  { slug: 'novato', label: 'Cadete', xpRange: '0-98 XP' },
  { slug: 'cadets', label: 'Infantil', xpRange: '99-368 XP' },
  { slug: 'juveniles', label: 'Juvenil', xpRange: '369-999 XP' },
  { slug: 'juniors', label: 'Junior', xpRange: '1,000-2,221 XP' },
  { slug: 'seniors', label: 'Sénior', xpRange: '2,222-3,332 XP' },
  { slug: 'hall-of-fame', label: 'Hall da Fama', xpRange: '3,333-4,999 XP' },
  { slug: 'master', label: 'Master', xpRange: '5,000-9,999 XP' },
  { slug: 'legend', label: 'Lenda', xpRange: '10,000+ XP' },
];

const formatRange = (min?: number | null, max?: number | null) => {
  if (typeof min === 'number' && typeof max === 'number') {
    return `${min.toLocaleString()}-${max.toLocaleString()} XP`;
  }
  if (typeof min === 'number') {
    return `${min.toLocaleString()}+ XP`;
  }
  if (typeof max === 'number') {
    return `0-${max.toLocaleString()} XP`;
  }
  return 'XP variável';
};

const resolveLevelLabel = (title?: Record<string, string> | string | null) => {
  if (!title) return '';
  if (typeof title === 'string') return title;
  const preferred = ['pt', 'es', 'en'];
  for (const lang of preferred) {
    if (title[lang] && title[lang]?.trim()) {
      return title[lang];
    }
  }
  const first = Object.values(title).find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
  return first || '';
};

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
    activeLanguage,
    setActiveLanguage,
  } = useBuilderState();
  const courseState = state as CourseBuilderState;
  const [slugTouched, setSlugTouched] = useState(false);
  const mediaLibrary = useMediaLibrary();
  const { timezone, toInputValues, fromInput, validateFutureDate } =
    useScheduleCET();
  const { translate, isTranslating } = useAutoTranslate();
  const { toast } = useToast();
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [academyLevels, setAcademyLevels] = useState<AcademyLevelOption[]>(FALLBACK_ACADEMY_LEVELS);

  const coverUrl = courseState.coverImage?.url;
  const language = activeLanguage;
  const languageLabel =
    LANGUAGES.find((lang) => lang.code === language)?.name ||
    language;

  const titleValue = courseState.title[language] ?? '';
  const descriptionValue = courseState.longDescription[language] ?? '';

  const xpReward = courseState.xp.reward;
  const xpThreshold = courseState.xp.threshold;
  const isScheduled = Boolean(courseState.schedule.publishAt);
  const academyLevelValue = courseState.academyLevelSlug ?? 'unassigned';

  const suggestedSlug = useMemo(() => slugify(titleValue), [titleValue]);
  const minDate = useMemo(() => {
    const parsed = toInputValues(new Date().toISOString());
    return parsed.date;
  }, [toInputValues]);
  const remainingLanguages = LANGUAGES.map((lang) => lang.code).filter(
    (code) => code !== language,
  );

  useEffect(() => {
    if (courseState.schedule.publishAt) {
      const parsed = toInputValues(courseState.schedule.publishAt);
      setScheduleDate(parsed.date);
      setScheduleTime(parsed.time);
    } else {
      setScheduleDate('');
      setScheduleTime('');
      setScheduleError(null);
    }
  }, [courseState.schedule.publishAt, toInputValues]);

  useEffect(() => {
    let isMounted = true;
    const fetchLevels = async () => {
      try {
        const response = await fetch('/api/admin/academy-levels');
        if (!response.ok) return;
        const payload = await response.json();
        if (!payload?.success || !Array.isArray(payload.levels)) {
          return;
        }
        const normalized: AcademyLevelOption[] = payload.levels.map((level: any) => ({
          slug: level.slug,
          label: resolveLevelLabel(level.title_i18n) || level.slug,
          xpRange: formatRange(level.min_xp, level.max_xp),
        }));
        if (isMounted && normalized.length > 0) {
          setAcademyLevels(normalized);
        }
      } catch (error) {
        console.warn('Unable to load academy levels for builder', error);
      }
    };

    fetchLevels();
    return () => {
      isMounted = false;
    };
  }, []);

  const applySchedule = (nextDate: string, nextTime: string) => {
    if (!nextDate || !nextTime) {
      setScheduleError('Seleciona data e hora em CET.');
      return;
    }
    const iso = fromInput(nextDate, nextTime);
    const validation = validateFutureDate(iso);
    if (!validation.valid) {
      setScheduleError(validation.reason || 'Choose a future CET time.');
      return;
    }
    setScheduleError(null);
    patchState({
      schedule: {
        ...courseState.schedule,
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
        published: true,
        schedule: {
          ...courseState.schedule,
          publishAt: null,
          status: 'published',
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

  const handleTranslateField = async (
    field: 'title' | 'longDescription',
    value: string,
  ) => {
    if (!value.trim()) {
      toast({
        title: 'Sem conteúdo',
        description: 'Escreve algo antes de traduzir.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const translations = await translate(
        value,
        language,
        remainingLanguages,
      );

      if (field === 'title') {
        patchState({
          title: { ...courseState.title, ...translations },
        });
      } else {
        patchState({
          longDescription: { ...courseState.longDescription, ...translations },
        });
      }

      toast({
        title: 'Traduções aplicadas',
        description: 'Atualizámos automaticamente as outras línguas.',
      });
    } catch (error) {
      console.error('Course translate error:', error);
      toast({
        title: 'Erro na tradução',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível traduzir o conteúdo.',
        variant: 'destructive',
      });
    }
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
              onClick={() => setActiveLanguage(lang.code as LangCode)}
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
                Placeholder: (NOME DO CURSO)
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
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isTranslating || remainingLanguages.length === 0}
                onClick={() => handleTranslateField('title', titleValue)}
              >
                <Sparkles className="mr-2 h-4 w-4 text-cyan-400" />
                Traduzir título
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <Label>Slug</Label>
              <Input
                value={courseState.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  patchState({ slug: slugify(event.target.value) });
                }}
                placeholder={suggestedSlug || 'legacy-builder-course'}
              />
              {!slugTouched && suggestedSlug && (
                <p className="mt-1 text-xs text-gray-500">
                  Automatic suggestion: {suggestedSlug}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
              <div>
                <Label className="text-xs text-gray-500">Access</Label>
                <p className="text-sm font-semibold">
                  {courseState.isPaid ? 'Paid' : 'Free'}
                </p>
              </div>
              <Switch
                checked={courseState.isPaid}
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
            placeholder="Use headings, lists, callouts, embeds..."
            minRows={8}
          />
          <div className="flex flex-wrap items-center justify-between text-xs text-gray-500">
            <p>
              A richer editor is coming soon; this versão permite validar o fluxo do conteúdo.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isTranslating || remainingLanguages.length === 0}
              onClick={() =>
                handleTranslateField('longDescription', descriptionValue)
              }
            >
              <Sparkles className="mr-2 h-4 w-4 text-cyan-400" />
              Traduzir descrição
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
          <Label>Course Cover (1600x900 recommended)</Label>
          {coverUrl ? (
            <div className="relative h-48 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
              <Image
                src={coverUrl}
                alt={courseState.coverImage?.alt || 'Course cover preview'}
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
              No cover selected yet
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
            value={courseState.level}
            onValueChange={(level) =>
              patchState({ level: level as typeof courseState.level })
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
          <Label>Academy Level</Label>
          <Select
            value={academyLevelValue}
            onValueChange={(value) =>
              patchState({
                academyLevelSlug: value === 'unassigned' ? null : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolhe o nível da Academia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Sem nível atribuído</SelectItem>
              {academyLevels.map((level) => (
                <SelectItem key={level.slug} value={level.slug}>
                  {level.label} · {level.xpRange}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Define onde o curso aparece na jornada gamificada.
          </p>
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
                  ...courseState.xp,
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
                  ...courseState.xp,
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
              {courseState.published ? 'Online' : 'Draft'}
            </p>
          </div>
          <Switch
            checked={courseState.published}
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
              {courseState.isCompleted ? 'Completed' : 'In progress'}
            </p>
          </div>
          <Switch
            checked={courseState.isCompleted}
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
              Set when the course becomes available (CET).
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
              The course will publish automatically at the selected CET time.
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
        description="Choose an image, upload files, or add an external URL."
        allowUrl
      />
    </div>
  );
}
