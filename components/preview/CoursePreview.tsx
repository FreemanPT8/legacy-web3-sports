import Image from 'next/image';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Award,
  BookOpen,
  CalendarClock,
  Sparkles,
  Users2,
  Gift,
  Paperclip,
} from 'lucide-react';
import { useBuilderContext } from '@/contexts/BuilderContext';
import type { CourseBuilderState } from '@/types/builder';
import { getAvailableLanguages } from '@/lib/language';

const CET_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
};

export function CoursePreview() {
  const { previewData } = useBuilderContext();
  const course = previewData as CourseBuilderState;

  const headline =
    course.title.en ||
    Object.values(course.title).find((value) => value.trim().length) ||
    'Untitled course';

  const description =
    course.longDescription.en ||
    Object.values(course.longDescription).find((value) => value.trim().length) ||
    'Descrição ainda não definida.';

  const overview = course.overview || 'Overview ainda não definida.';
  const publishInfo = formatSchedule(course.schedule.publishAt);
  const keyTakeaways = course.keyTakeaways.filter((item) => item.trim().length);
  const targetAudience = course.targetAudience.filter(
    (item) => item.trim().length,
  );
  const bonuses = course.bonuses.filter((item) => item.trim().length);

  const lessonsCount = course.curriculum.topics.reduce(
    (acc, topic) => acc + topic.lessons.length,
    0,
  );
  const durationLabel = formatDuration(course.durationMinutes);
  const availableLanguages = getAvailableLanguages(
    course.title,
    course.longDescription,
  );

  return (
    <div className="space-y-4">
      {course.coverImage?.url && (
        <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-800">
          <Image
            src={course.coverImage.url}
            alt={course.coverImage.alt || headline}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 320px"
            unoptimized
          />
        </div>
      )}

      <div className="space-y-2">
        <Badge variant="outline" className="uppercase tracking-wide">
          {course.level}
        </Badge>
        <div className="flex flex-wrap gap-2">
          <Badge variant={course.published ? 'default' : 'outline'}>
            {course.published ? 'Published' : 'Draft'}
          </Badge>
          <Badge
            variant={course.isCompleted ? 'default' : 'outline'}
            className={course.isCompleted ? 'bg-green-600 text-white' : undefined}
          >
            {course.isCompleted ? 'Completed' : 'In progress'}
          </Badge>
        </div>
        <h3 className="text-xl font-semibold">{headline}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-4">
          {description}
        </p>
        {availableLanguages.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {availableLanguages.map((lang) => (
              <Badge
                key={lang.code}
                variant="secondary"
                className="flex items-center gap-1 border border-gray-200 bg-white/80 text-gray-900 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-100"
              >
                <span aria-hidden className="text-base leading-none">
                  {lang.flag}
                </span>
                <span className="font-semibold uppercase">{lang.code}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900">
        <PreviewStat
          icon={<BookOpen className="h-4 w-4 text-blue-600" />}
          label="Curriculum"
          value={`${course.curriculum.topics.length} topics · ${lessonsCount} lessons`}
        />
        <PreviewStat
            icon={<Sparkles className="h-4 w-4 text-purple-600" />}
            label="XP Reward"
            value={`${course.xp.reward} XP`}
          />
        <PreviewStat
            icon={<Award className="h-4 w-4 text-amber-600" />}
            label="XP Required"
            value={`${course.xp.threshold} XP`}
          />
        <PreviewStat
            icon={<BookOpen className="h-4 w-4 text-indigo-600" />}
            label="Duration"
            value={durationLabel}
          />
        <PreviewStat
            icon={<CalendarClock className="h-4 w-4 text-emerald-600" />}
            label="Next publish"
            value={publishInfo}
          />
      </div>

      <SectionCard title="Overview" description={overview} />

      <ListCard
        title="Key takeaways"
        items={keyTakeaways}
        emptyLabel="Ainda sem takeaways definidos."
      />

      <ListCard
        title="Target audience"
        icon={<Users2 className="h-4 w-4 text-blue-600" />}
        items={targetAudience}
        emptyLabel="Descreve quem deve inscrever-se no curso."
      />

      <ListCard
        title="Bonuses"
        icon={<Gift className="h-4 w-4 text-amber-500" />}
        items={bonuses}
        emptyLabel="Lista os assets extra incluídos."
      />

      {course.attachments.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-semibold">Attachments</p>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            {course.attachments.map((attachment) => (
              <li key={attachment.id} className="rounded-lg bg-white/70 px-3 py-2 dark:bg-gray-950/50">
                <span className="font-medium">{attachment.label}</span>
                {attachment.externalUrl && (
                  <span className="ml-2 text-xs text-blue-600">
                    {attachment.externalUrl}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PreviewStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm dark:bg-gray-950">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-semibold text-gray-900 dark:text-gray-50">
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
        {title}
      </h4>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

function ListCard({
  title,
  icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon?: ReactNode;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
          {title}
        </h4>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-gray-600 dark:text-gray-300">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDuration(totalMinutes?: number) {
  if (!totalMinutes || totalMinutes <= 0) {
    return 'Duration TBD';
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function formatSchedule(publishAt?: string | null) {
  if (!publishAt) {
    return 'Not scheduled';
  }
  const date = new Date(publishAt);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return date.toLocaleString('en-GB', CET_OPTIONS);
}
