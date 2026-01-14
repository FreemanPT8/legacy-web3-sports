'use client';

import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HouseProfilePayload } from '@/lib/houses/profile';

type HouseRoster = HouseProfilePayload['house']['roster'];

type Props = {
  roster: HouseRoster;
  badgeLabel: string;
  totalCount: number;
  variant?: 'public' | 'private';
};

const applyTemplate = (value: string, replacements: Record<string, string>) => {
  return Object.entries(replacements).reduce((current, [key, replacement]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    return current.replace(regex, replacement);
  }, value);
};

const getInitials = (name?: string | null, username?: string | null) => {
  const source = name || username || '';
  if (!source) return '??';
  return source
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

type MemberEntry = HouseRoster['members'][number];

function MemberRow({
  entry,
  badgeText,
  highlight,
}: {
  entry: MemberEntry;
  badgeText: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
        highlight
          ? 'border-cyan-400/50 bg-cyan-500/10'
          : 'border-white/10 bg-black/20'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full border border-white/15 bg-black/50 text-sm font-semibold text-white/80 flex items-center justify-center">
          {entry.avatarUrl ? (
            <span
              className="h-full w-full rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url(${entry.avatarUrl})` }}
            />
          ) : (
            getInitials(entry.name, entry.username)
          )}
        </div>
        <div>
          <p className="font-semibold text-white">{entry.name}</p>
          {entry.username ? (
            <p className="text-xs text-slate-400">@{entry.username}</p>
          ) : null}
          <Badge className="mt-1 border border-white/10 bg-white/10 text-[11px] uppercase tracking-[0.3em] text-white/70">
            {badgeText}
          </Badge>
        </div>
      </div>
      <p className="text-sm font-semibold text-cyan-200">
        {entry.xpTotal.toLocaleString()} XP
      </p>
    </div>
  );
}

export function HouseMembersList({
  roster,
  badgeLabel,
  totalCount,
  variant = 'public',
}: Props) {
  const { t } = useLanguage();
  const limitValue = variant === 'public' ? '48' : '48';
  const totalLabel = applyTemplate(t('houses.members.totalLabel'), {
    count: totalCount.toLocaleString(),
  });
  const noteLabel = applyTemplate(t('houses.members.note'), { limit: limitValue });

  const sections: Array<{
    key: string;
    title: string;
    badge: string;
    entries: MemberEntry[];
    highlight?: boolean;
    emptyLabel?: string;
  }> = [
    {
      key: 'head',
      title: t('houses.members.section.head'),
      badge: applyTemplate(t('houses.members.badge.head'), { house: badgeLabel }),
      entries: roster.head ? [roster.head] : [],
      highlight: true,
      emptyLabel: t('houses.members.empty.head'),
    },
    {
      key: 'moderators',
      title: t('houses.members.section.moderators'),
      badge: applyTemplate(t('houses.members.badge.moderator'), { house: badgeLabel }),
      entries: roster.moderators,
      emptyLabel: t('houses.members.empty.moderators'),
    },
    {
      key: 'members',
      title: t('houses.members.section.members'),
      badge: applyTemplate(t('houses.members.badge.member'), { house: badgeLabel }),
      entries: roster.members,
      emptyLabel: t('houses.members.empty.members'),
    },
  ];

  const maxMembersVisible = Math.max(
    roster.members.length,
    totalCount - (roster.head ? 1 : 0) - roster.moderators.length,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/80">
        <p className="text-sm">{totalLabel}</p>
        <p className="text-xs text-slate-400">{noteLabel}</p>
      </div>
      {sections.map((section) => (
        <div key={section.key} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
              {section.title}
            </p>
            {section.key === 'members' && roster.members.length > 0 && (
              <p className="text-[11px] text-slate-400">
                {applyTemplate(t('houses.members.displaying'), {
                  shown: roster.members.length.toLocaleString(),
                  total: maxMembersVisible.toLocaleString(),
                })}
              </p>
            )}
          </div>
          {section.entries.length === 0 ? (
            <p className="text-sm text-slate-400">{section.emptyLabel}</p>
          ) : (
            <div className="space-y-3">
              {section.entries.map((entry) => (
                <MemberRow
                  key={`${section.key}-${entry.id}`}
                  entry={entry}
                  badgeText={section.badge}
                  highlight={section.highlight}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
'@ 
