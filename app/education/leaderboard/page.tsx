'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
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
  const { user } = useAuth();
  const [globalLeaders, setGlobalLeaders] = useState<UserEntry[]>([]);
  const [countryLeaders, setCountryLeaders] = useState<CountryEntry[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
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
          setError(globalJson.error || 'Failed to load leaderboard');
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
          setCountryLeaders(normalized);
          const totalCountriesValue =
            typeof countryJson.totalCountries === 'number'
              ? countryJson.totalCountries
              : normalized.length;
          setTotalCountriesCount(totalCountriesValue);
        }

        if (!countryJson.success) {
          setError(countryJson.error || 'Failed to load country leaderboard');
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
          setError((prev) => prev ?? 'Failed to load houses data');
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const handleHeroImageSelect = async (asset: MediaAsset) => {
    if (!asset?.url) return;
    await heroMedia.setAsset(asset);
    mediaLibrary.closeLibrary();
  };

  const formatNumber = (value: number | null | undefined) => {
    const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return safeValue.toLocaleString();
  };

  if (loading) {
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

  const topMemberItems = topThree.map((member) => {
    const countryCode = normalizeCountryCode(member.country);
    return {
      key: member.id,
      name: member.username,
      subtitle: member.country || t('leaderboard.globalRankings'),
      flag: getFlagEmoji(countryCode),
      value: member.xp_total ?? 0,
      extra: '',
    };
  });

  const topCountryItems = [...countryLeaders]
    .sort((a, b) => b.memberCount - a.memberCount || (b.totalXP ?? 0) - (a.totalXP ?? 0))
    .slice(0, 3)
    .map((country) => ({
      key: country.code,
      name: country.name,
      subtitle: `${formatNumber(country.memberCount)} ${t('leaderboard.members')}`,
      flag: getFlagEmoji(country.code),
      value: country.totalXP ?? 0,
      extra: '',
    }));

  const topHouseItems = [...houseLeaderboard]
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

  const highlightSections = [
    {
      key: 'members',
      label: 'Top Members',
      items: topMemberItems,
      emptyLabel: t('leaderboard.noRankings'),
    },
    {
      key: 'countries',
      label: 'Top Countries',
      items: topCountryItems,
      emptyLabel: t('leaderboard.noCountryRankings'),
    },
    {
      key: 'houses',
      label: 'Top Houses',
      items: topHouseItems,
      emptyLabel: t('leaderboard.housesRankingsDesc'),
    },
  ];

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
                    alt="Global leaderboard spotlight"
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
                        {heroMedia.saving ? 'Saving...' : 'Edit hero image'}
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
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-[#000c12]/60 p-3"
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
                                <p className="font-semibold text-white">{item.name}</p>
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
                title="Select leaderboard hero image"
                description="Choose an image from the media library or upload a new one."
                allowUrl
              />
            )}

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <Tabs defaultValue="individual" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
                <TabsTrigger value="individual">{t('leaderboard.individual')}</TabsTrigger>
                <TabsTrigger value="country">{t('leaderboard.country')}</TabsTrigger>
                <TabsTrigger value="national">{t('leaderboard.national')}</TabsTrigger>
              </TabsList>

              <TabsContent value="individual" className="mt-6">
                <Card className="border border-white/10 bg-[#000c12]">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">{t('leaderboard.globalRankings')}</CardTitle>
                    <CardDescription className="text-slate-300">{t('leaderboard.globalRankingsDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {restOfGlobal.length === 0 ? (
                      <div className="text-center py-12">
                        <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-slate-300">{t('leaderboard.noRankings')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {restOfGlobal.map((user: any, i: number) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between rounded-lg border border-white/10 bg-[#000c12] p-4 transition-colors hover:bg-[#05212b]"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                                #{i + 4}
                              </div>
                              <div>
                                <p className="font-semibold">{user.username}</p>
                                <p className="text-sm text-slate-300">{user.country}</p>
                              </div>
                            </div>
                            <Badge className="bg-primary">{user.xp_total} XP</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="country" className="mt-6">
                <Card className="border border-white/10 bg-[#000c12]">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">{t('leaderboard.countryRankings')}</CardTitle>
                    <CardDescription className="text-slate-300">{t('leaderboard.countryRankingsDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {countryLeaders.length === 0 ? (
                      <div className="text-center py-12">
                        <Trophy className="h-16 w-16 text-cyan-300 mx-auto mb-4" />
                        <p className="text-slate-300">{t('leaderboard.noCountryRankings')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {countryLeaders.map((item, i) => (
                          <div
                            key={`${item.code}-${i}`}
                            className="flex items-center justify-between rounded-lg border border-white/10 bg-[#000c12] p-4 transition-colors hover:bg-[#05212b]"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                                #{i + 1}
                              </div>
                              <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-slate-300">
                                  {item.memberCount} {t('leaderboard.members')}
                                </p>
                              </div>
                            </div>
                            <Badge className="bg-green-600">{item.totalXP} XP</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="national" className="mt-6">
                <Card className="border border-white/10 bg-[#000c12]">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">{t('leaderboard.nationalCompetitions')}</CardTitle>
                    <CardDescription className="text-slate-300">{t('leaderboard.nationalCompetitionsDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Trophy className="h-16 w-16 text-cyan-300 mx-auto mb-4" />
                      <p className="text-lg font-semibold mb-2">{t('leaderboard.noNationalActive')}</p>
                      <p className="text-slate-300">{t('leaderboard.noNationalActiveDesc')}</p>
                    </div>
                  </CardContent>
                </Card>
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
