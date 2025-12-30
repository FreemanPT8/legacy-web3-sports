'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Crown } from 'lucide-react';
import { getCountryCodeFromName, getCountryName } from '@/lib/countries';
import { Button } from '@/components/ui/button';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';
import { useManagedMediaSetting } from '@/hooks/useManagedMediaSetting';
import type { MediaAsset } from '@/types/builder';

type UserEntry = {
  id: string;
  username: string;
  country: string | null;
  xp_total: number;
  created_at: string;
};

type CountryEntry = {
  code: string;
  name: string;
  memberCount: number;
  totalXP: number;
};

type HouseLeaderboardEntry = {
  houseId: string;
  name: string;
  sportCode: string | null;
  sportName: string | null;
  countryCode: string | null;
  status: 'ACTIVE' | 'UNDER_CONSTRUCTION' | 'IN_DEVELOPMENT';
  totalXp: number;
  memberCount: number;
  headCount: number;
  moderatorCount: number;
};

type HousesSummary = {
  totalHouses: number;
  activeHouses: number;
  totalMembers: number;
  totalXp: number;
  totalCountries: number;
  topCountry: {
    code: string;
    totalXp: number;
    houses: number;
  } | null;
};

const HERO_IMAGE_FALLBACK =
  process.env.NEXT_PUBLIC_LEADERBOARD_HERO_IMAGE ||
  'https://images.unsplash.com/photo-1505843267-3ff30ae28fd7?auto=format&fit=crop&w=1600&q=80';

const stripCountryFromName = (name: string, countryCode?: string | null) => {
  if (!countryCode) return name;
  const countryName = getCountryName(countryCode);
  if (!countryName) return name;
  const trimmed = name.trim();
  const regex = new RegExp(`\\s*${countryName}$`, 'i');
  return trimmed.replace(regex, '').trim();
};

const getFlagEmoji = (code?: string | null) => {
  if (!code) return '🌐';
  const trimmed = code.trim();
  if (trimmed.length !== 2) return '🌐';
  const upper = trimmed.toUpperCase();
  const OFFSET = 127397;
  return upper.replace(/./g, (char) =>
    String.fromCodePoint(char.charCodeAt(0) + OFFSET),
  );
};

const normalizeCountryCode = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return getCountryCodeFromName(trimmed);
};

export default function LeaderboardPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [globalLeaders, setGlobalLeaders] = useState<UserEntry[]>([]);
  const [countryLeaders, setCountryLeaders] = useState<CountryEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [totalCountriesCount, setTotalCountriesCount] = useState(0);
  const [houseLeaderboard, setHouseLeaderboard] = useState<HouseLeaderboardEntry[]>([]);
  const [houseSummary, setHouseSummary] = useState<HousesSummary>({
    totalHouses: 0,
    activeHouses: 0,
    totalMembers: 0,
    totalXp: 0,
    totalCountries: 0,
    topCountry: null,
  });
  const mediaLibrary = useMediaLibrary();
  const isSuperAdmin = user?.role === 'Super Admin';
  const heroMedia = useManagedMediaSetting('leaderboard', {
    fallbackUrl: HERO_IMAGE_FALLBACK,
  });
  const matchesCurrentUser = (entryId?: string | null, entryUsername?: string | null) => {
    if (!user) return false;
    const normalizedEntryId = entryId?.toString().trim();
    const normalizedUserId = user.id?.toString().trim();
    if (normalizedEntryId && normalizedUserId && normalizedEntryId === normalizedUserId) {
      return true;
    }
    const normalizedEntryUsername = entryUsername?.trim().toLowerCase();
    const normalizedUserUsername = user.username?.trim().toLowerCase();
    if (
      normalizedEntryUsername &&
      normalizedUserUsername &&
      normalizedEntryUsername === normalizedUserUsername
    ) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true);
      setError(null);
      try {
        const [globalRes, countryRes, housesRes] = await Promise.all([
          fetch('/api/leaderboard?type=global&limit=100'),
          fetch('/api/leaderboard?type=country&limit=5000'),
          fetch('/api/leaderboard/houses?limit=200'),
        ]);

        const [globalJson, countryJson, housesJson] = await Promise.all([
          globalRes.json(),
          countryRes.json(),
          housesRes.json(),
        ]);

        if (globalJson.success) {
          const leaderboard = globalJson.leaderboard || [];
          setGlobalLeaders(leaderboard);
          const totalUsersValue =
            typeof globalJson.totalUsers === 'number'
              ? globalJson.totalUsers
              : leaderboard.length;
          setTotalUsersCount(totalUsersValue);
        } else {
          setError(globalJson.error || 'leaderboard.errorLoadingGeneral');
        }

        if (countryJson.success) {
          const normalized: CountryEntry[] = (countryJson.leaderboard || [])
            .map((entry: any) => {
              const candidate = entry.country || '';
              const isoGuess =
                candidate.length === 2
                  ? candidate.toUpperCase()
                  : getCountryCodeFromName(candidate)?.toUpperCase();
              if (!isoGuess) return null;
              return {
                code: isoGuess,
                name: getCountryName(isoGuess),
                memberCount: entry.memberCount || entry.membercount || entry.user_count || 0,
                totalXP: entry.totalXP ?? entry.totalXp ?? entry.totalxp ?? entry.totalXP ?? 0,
              };
            })
            .filter(Boolean);
          const sortedCountries = [...normalized].sort(
            (a, b) =>
              (b.totalXP ?? 0) - (a.totalXP ?? 0) ||
              (b.memberCount ?? 0) - (a.memberCount ?? 0),
          );
          setCountryLeaders(sortedCountries);
          const totalCountriesValue =
            typeof countryJson.totalCountries === 'number'
              ? countryJson.totalCountries
              : normalized.length;
          setTotalCountriesCount(totalCountriesValue);
        } else {
          setError(
            (prev) =>
              prev ?? (countryJson.error || 'leaderboard.errorLoadingCountry'),
          );
        }

        if (housesJson.success) {
          const leaderboardEntries: HouseLeaderboardEntry[] = Array.isArray(housesJson.leaderboard)
            ? housesJson.leaderboard
            : [];
          setHouseLeaderboard(leaderboardEntries);

          const summaryPayload = (housesJson.summary ?? {}) as Partial<HousesSummary>;
          setHouseSummary({
            totalHouses: summaryPayload.totalHouses ?? leaderboardEntries.length,
            activeHouses:
              summaryPayload.activeHouses ??
              leaderboardEntries.filter((entry) => entry.status === 'ACTIVE').length,
            totalMembers:
              summaryPayload.totalMembers ??
              leaderboardEntries.reduce((acc, entry) => acc + (entry.memberCount ?? 0), 0),
            totalXp:
              summaryPayload.totalXp ??
              leaderboardEntries.reduce((acc, entry) => acc + (entry.totalXp ?? 0), 0),
            totalCountries:
              summaryPayload.totalCountries ??
              new Set(
                leaderboardEntries
                  .map((entry) => entry.countryCode)
                  .filter((code): code is string => !!code),
              ).size,
            topCountry: summaryPayload.topCountry ?? null,
          });
        } else {
          console.error('Error loading houses leaderboard data:', housesJson);
          setError((prev) => prev ?? 'leaderboard.errorLoadingHouses');
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        setError('leaderboard.errorLoadingGeneral');
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user]);

  const handleHeroImageSelect = async (asset: MediaAsset) => {
    if (!asset?.url) return;
    await heroMedia.setAsset(asset);
    mediaLibrary.closeLibrary();
  };

  const formatNumber = (value: number | null | undefined) => {
    const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return safeValue.toLocaleString();
  };

  const resolvedError = error
    ? error.startsWith('leaderboard.')
      ? t(error)
      : error
    : null;

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto" />
            <p className="mt-4 text-sm text-slate-300">
              {authLoading ? t('leaderboard.loading') : t('leaderboard.loginRequired')}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (leaderboardLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto" />
            <p className="mt-4 text-sm text-slate-300">{t('leaderboard.loading')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const topThree = globalLeaders.slice(0, 3);
  const restOfGlobal = globalLeaders.slice(3);
  const topMember = globalLeaders[0] ?? null;
  const topHouse = houseLeaderboard[0] ?? null;
  const topCountryFromHouses = houseSummary.topCountry
    ? {
        code: houseSummary.topCountry.code,
        name: getCountryName(houseSummary.topCountry.code) || houseSummary.topCountry.code,
        totalXp: houseSummary.topCountry.totalXp,
      }
    : null;

  const heroHighlights = [
    {
      key: 'global',
      label: t('leaderboard.globalRankings'),
      description: t('leaderboard.globalRankingsDesc'),
      value:
        totalUsersCount > 0
          ? totalUsersCount.toLocaleString()
          : globalLeaders.length.toLocaleString(),
    },
    {
      key: 'country',
      label: t('leaderboard.countryRankings'),
      description: t('leaderboard.countryRankingsDesc'),
      value:
        totalCountriesCount > 0
          ? totalCountriesCount.toLocaleString()
          : countryLeaders.length.toLocaleString(),
    },
    {
      key: 'houses',
      label: t('leaderboard.housesRankings'),
      description: `${t('leaderboard.housesRankingsDesc')} · ${formatNumber(houseSummary.totalXp)} XP`,
      value: formatNumber(houseSummary.activeHouses),
    },
  ];

  type HighlightItem = {
    key: string;
    name: string;
    subtitle: string;
    flag: string;
    value: number;
    extra?: string;
    highlight?: boolean;
  };

  type HighlightSection = {
    key: string;
    label: string;
    items: HighlightItem[];
    emptyLabel: string;
  };

  const topMemberItems: HighlightItem[] = topThree.map((member) => {
    const countryCode = normalizeCountryCode(member.country);
    return {
      key: member.id,
      name: member.username,
      subtitle: member.country || t('leaderboard.globalRankings'),
      flag: getFlagEmoji(countryCode),
      value: member.xp_total ?? 0,
      extra: '',
      highlight: matchesCurrentUser(member.id, member.username),
    };
  });

  const topCountryItems: HighlightItem[] = [...countryLeaders]
    .sort((a, b) => (b.totalXP ?? 0) - (a.totalXP ?? 0) || b.memberCount - a.memberCount)
    .slice(0, 3)
    .map((country) => ({
      key: country.code,
      name: country.name,
      subtitle: `${formatNumber(country.memberCount)} ${t('leaderboard.members')}`,
      flag: getFlagEmoji(country.code),
      value: country.totalXP ?? 0,
      extra: '',
    }));

  const topHouseItems: HighlightItem[] = [...houseLeaderboard]
    .sort((a, b) => (b.totalXp ?? 0) - (a.totalXp ?? 0))
    .slice(0, 3)
    .map((house) => ({
      key: house.houseId,
      name: stripCountryFromName(house.name, house.countryCode),
      subtitle: house.countryCode ? getCountryName(house.countryCode) : t('leaderboard.countryRankings'),
      flag: getFlagEmoji(house.countryCode),
      value: house.totalXp ?? 0,
      extra: house.sportName || house.sportCode || '',
    }));

  const highlightSections: HighlightSection[] = [
    {
      key: 'members',
      label: t('leaderboard.topMembers'),
      items: topMemberItems,
      emptyLabel: t('leaderboard.noRankings'),
    },
    {
      key: 'countries',
      label: t('leaderboard.topCountries'),
      items: topCountryItems,
      emptyLabel: t('leaderboard.noCountryRankings'),
    },
    {
      key: 'houses',
      label: t('leaderboard.topHouses'),
      items: topHouseItems,
      emptyLabel: t('leaderboard.housesRankingsDesc'),
    },
  ];

type RankingEntry = {
  key: string;
  rank: number;
  title: string;
  subtitle?: string;
  valueLabel: string;
  valueClass?: string;
  extra?: string;
  highlight?: boolean;
};

  const RankingCard = ({
    title,
    description,
    entries,
    emptyLabel,
  }: {
    title: string;
    description: string;
    entries: RankingEntry[];
    emptyLabel: string;
  }) => (
    <Card className="border border-white/10 bg-[#000c12]">
      <CardHeader>
        <CardTitle className="text-white text-lg">{title}</CardTitle>
        <CardDescription className="text-slate-300">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-cyan-300 mx-auto mb-4" />
            <p className="text-slate-300">{emptyLabel}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.key}
                className={`flex items-center justify-between rounded-xl border p-4 transition
                  ${entry.highlight
                    ? 'border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_20px_rgba(0,255,255,0.25)]'
                    : 'border-white/10 bg-[#04131b]'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full border border-white/20 text-xs font-semibold text-[#fdd87c] flex items-center justify-center">
                    #{entry.rank}
                  </div>
                  <div>
                    <p className="font-semibold text-white flex items-center gap-2">
                      {entry.title}
                      {entry.highlight && (
                        <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                          {t('leaderboard.you')}
                        </span>
                      )}
                    </p>
                    {entry.subtitle && (
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.subtitle}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${entry.valueClass ?? 'text-[#5af3ff]'}`}>
                    {entry.valueLabel}
                  </p>
                  {entry.extra && (
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{entry.extra}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const formatSubtitle = (code?: string | null, label?: string | null) => {
    const flag = getFlagEmoji(code);
    if (!label) return flag;
    return `${flag} ${label}`;
  };

  const individualEntries: RankingEntry[] = globalLeaders.map((userEntry, index) => ({
    key: userEntry.id || `member-${index}`,
    rank: index + 1,
    title: userEntry.username,
    subtitle: formatSubtitle(
      normalizeCountryCode(userEntry.country),
      userEntry.country || t('leaderboard.globalRankings'),
    ),
    valueLabel: `${formatNumber(userEntry.xp_total ?? 0)} XP`,
    highlight: matchesCurrentUser(userEntry.id, userEntry.username),
  }));

  const houseEntries: RankingEntry[] = houseLeaderboard.map((house, index) => ({
    key: house.houseId,
    rank: index + 1,
    title: stripCountryFromName(house.name, house.countryCode),
    subtitle: formatSubtitle(house.countryCode, house.countryCode ? getCountryName(house.countryCode) : t('leaderboard.countryRankings')),
    valueLabel: `${formatNumber(house.totalXp ?? 0)} XP`,
    extra: house.sportName || house.sportCode || '',
  }));

  const countryEntries: RankingEntry[] = countryLeaders.map((country, index) => ({
    key: country.code,
    rank: index + 1,
    title: country.name,
    subtitle: `${formatNumber(country.memberCount)} ${t('leaderboard.members')}`,
    valueLabel: `${formatNumber(country.totalXP ?? 0)} XP`,
    valueClass: 'text-emerald-300',
  }));

  const nationalEntries: RankingEntry[] = [];

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-8">
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-10 shadow-2xl shadow-black/40">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
              </div>
              <div className="relative grid gap-10 lg:grid-cols-2">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                      {t('nav.leaderboard')}
                    </p>
                    <h1 className="text-3xl font-semibold text-[#fdd87c] md:text-4xl">
                      {t('leaderboard.title')}
                    </h1>
                    <p className="text-sm text-slate-300 md:text-base">
                      {t('leaderboard.subtitle')}
                    </p>
                  </div>
                  <Badge className="w-fit border border-white/10 bg-cyan-500/15 text-cyan-100">
                    {t('leaderboard.globalRankings')}
                  </Badge>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {heroHighlights.map((highlight) => (
                      <div
                        key={highlight.key}
                        className="rounded-2xl border border-white/15 bg-[#000c12]/40 p-4 shadow-lg shadow-black/40"
                      >
                        <p className="text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">
                          {highlight.label}
                        </p>
                        <p className="text-3xl font-semibold text-[#5af3ff]">{highlight.value}</p>
                        <p className="text-sm text-slate-300">{highlight.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative h-72 w-full overflow-hidden rounded-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.65)]">
                  <Image
                    src={heroMedia.assetUrl || HERO_IMAGE_FALLBACK}
                    alt={t('leaderboard.heroAlt')}
                    fill
                    priority
                    className="object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#000c12]/80 via-[#031821]/20 to-transparent" />
                  {isSuperAdmin && (
                    <div className="absolute right-4 top-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/50 bg-black/40 text-white hover:bg-black/60"
                        onClick={() => mediaLibrary.openLibrary()}
                        disabled={heroMedia.saving}
                      >
                        {heroMedia.saving ? t('leaderboard.saving') : t('leaderboard.editHeroImage')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </section>
            <section className="grid gap-4 md:grid-cols-3">
              {highlightSections.map((section) => (
                <div
                  key={section.key}
                  className="rounded-2xl border border-white/10 bg-[#04131b] p-5 shadow-lg shadow-black/40"
                >
                  <p className="text-[11px] uppercase tracking-[0.4em] text-[#fdd87c]">{section.label}</p>
                  <div className="mt-4 space-y-3">
                    {section.items.length === 0 ? (
                      <p className="text-sm text-slate-400">{section.emptyLabel}</p>
                    ) : (
                      section.items.map((item, index) => (
                        <div
                          key={item.key ?? `${section.key}-${index}`}
                          className={`flex items-center justify-between rounded-xl border p-3 transition
                            ${
                              item.highlight
                                ? 'border-cyan-400/70 bg-cyan-500/10 text-white shadow-[0_0_15px_rgba(0,255,255,0.25)]'
                                : 'border-white/10 bg-[#000c12]/60'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-white/20 text-xs font-semibold text-[#fdd87c] flex items-center justify-center">
                              #{index + 1}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl" aria-hidden>
                                {item.flag}
                              </span>
                              <div>
                                <p className="font-semibold text-white flex items-center gap-2">
                                  {item.name}
                                  {item.highlight && (
                                    <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                                      {t('leaderboard.you')}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                  {item.subtitle}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#5af3ff]">
                              {formatNumber(item.value)} XP
                            </p>
                            {item.extra && (
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                {item.extra}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </section>

            {isSuperAdmin && (
              <MediaLibraryDialog
                open={mediaLibrary.isOpen}
                onOpenChange={(open) =>
                  open ? mediaLibrary.openLibrary(mediaLibrary.activeTab) : mediaLibrary.closeLibrary()
                }
                library={mediaLibrary}
                onSelect={handleHeroImageSelect}
                title={t('leaderboard.heroDialogTitle')}
                description={t('leaderboard.heroDialogDescription')}
                allowUrl
              />
            )}

            {resolvedError && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {resolvedError}
              </div>
            )}

            <Tabs defaultValue="individual" className="w-full">
              <TabsList className="grid w-full max-w-xl mx-auto grid-cols-4">
                <TabsTrigger value="individual">{t('leaderboard.individual')}</TabsTrigger>
                <TabsTrigger value="houses">{t('leaderboard.housesTab')}</TabsTrigger>
                <TabsTrigger value="country">{t('leaderboard.country')}</TabsTrigger>
                <TabsTrigger value="national">{t('leaderboard.national')}</TabsTrigger>
              </TabsList>

              <TabsContent value="individual" className="mt-6">
                <RankingCard
                  title={t('leaderboard.globalRankings')}
                  description={t('leaderboard.globalRankingsDesc')}
                  entries={individualEntries}
                  emptyLabel={t('leaderboard.noRankings')}
                />
              </TabsContent>

              <TabsContent value="houses" className="mt-6">
                <RankingCard
                  title={t('leaderboard.housesRankings')}
                  description={t('leaderboard.housesRankingsDesc')}
                  entries={houseEntries}
                  emptyLabel={t('leaderboard.housesRankingsDesc')}
                />
              </TabsContent>

              <TabsContent value="country" className="mt-6">
                <RankingCard
                  title={t('leaderboard.countryRankings')}
                  description={t('leaderboard.countryRankingsDesc')}
                  entries={countryEntries}
                  emptyLabel={t('leaderboard.noCountryRankings')}
                />
              </TabsContent>

              <TabsContent value="national" className="mt-6">
                <RankingCard
                  title={t('leaderboard.nationalCompetitions')}
                  description={t('leaderboard.nationalCompetitionsDesc')}
                  entries={nationalEntries}
                  emptyLabel={t('leaderboard.noNationalActive')}
                />
              </TabsContent>
            </Tabs>

            <Card className="mt-8 bg-gradient-to-br from-[#14718f] via-[#1d98a6] to-[#126e84] text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Trophy className="h-8 w-8" />
                  {t('leaderboard.hallOfFame')}
                </CardTitle>
                <CardDescription className="text-cyan-50">
                  {t('leaderboard.hallOfFameDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-lg">{t('leaderboard.noHallMembers')}</p>
                  <p className="text-sm text-cyan-100 mt-2">{t('leaderboard.beFirst')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
