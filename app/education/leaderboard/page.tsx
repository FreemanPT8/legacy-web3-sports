'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Crown } from 'lucide-react';

export default function LeaderboardPage() {
  const { t } = useLanguage();
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        if (data.success) {
          setLeaderboardData(data);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">{t('leaderboard.loading')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const topThree = leaderboardData?.global?.slice(0, 3) || [];
  const restOfGlobal = leaderboardData?.global?.slice(3) || [];
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{t('leaderboard.title')}</h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {t('leaderboard.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50">
                <CardHeader className="text-center pb-3">
                  <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                  <CardTitle className="text-2xl">{t('leaderboard.rank1')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-xl font-bold mb-1">{topThree[0]?.username || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mb-2">{topThree[0]?.country || 'N/A'}</p>
                  <Badge className="bg-yellow-500 text-white text-lg px-4 py-1">{topThree[0]?.xp_total || 0} XP</Badge>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-300">
                <CardHeader className="text-center pb-3">
                  <Medal className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <CardTitle className="text-2xl">{t('leaderboard.rank2')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-xl font-bold mb-1">{topThree[1]?.username || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mb-2">{topThree[1]?.country || 'N/A'}</p>
                  <Badge variant="secondary" className="text-lg px-4 py-1">{topThree[1]?.xp_total || 0} XP</Badge>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-300">
                <CardHeader className="text-center pb-3">
                  <Medal className="h-12 w-12 text-orange-400 mx-auto mb-2" />
                  <CardTitle className="text-2xl">{t('leaderboard.rank3')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-xl font-bold mb-1">{topThree[2]?.username || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mb-2">{topThree[2]?.country || 'N/A'}</p>
                  <Badge variant="secondary" className="text-lg px-4 py-1">{topThree[2]?.xp_total || 0} XP</Badge>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="individual" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
                <TabsTrigger value="individual">{t('leaderboard.individual')}</TabsTrigger>
                <TabsTrigger value="country">{t('leaderboard.country')}</TabsTrigger>
                <TabsTrigger value="national">{t('leaderboard.national')}</TabsTrigger>
              </TabsList>

              <TabsContent value="individual" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('leaderboard.globalRankings')}</CardTitle>
                    <CardDescription>{t('leaderboard.globalRankingsDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {restOfGlobal.length === 0 ? (
                      <div className="text-center py-12">
                        <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300">{t('leaderboard.noRankings')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {restOfGlobal.map((user: any, i: number) => (
                          <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                                #{i + 4}
                              </div>
                              <div>
                                <p className="font-semibold">{user.username}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{user.country}</p>
                              </div>
                            </div>
                            <Badge className="bg-blue-600">{user.xp_total} XP</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="country" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('leaderboard.countryRankings')}</CardTitle>
                    <CardDescription>{t('leaderboard.countryRankingsDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!leaderboardData?.country || leaderboardData.country.length === 0 ? (
                      <div className="text-center py-12">
                        <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300">{t('leaderboard.noCountryRankings')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {leaderboardData.country.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                                #{i + 1}
                              </div>
                              <div>
                                <p className="font-semibold">{item.country}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{item.user_count} {t('leaderboard.members')}</p>
                              </div>
                            </div>
                            <Badge className="bg-green-600">{item.total_xp} XP</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="national" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('leaderboard.nationalCompetitions')}</CardTitle>
                    <CardDescription>{t('leaderboard.nationalCompetitionsDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-semibold mb-2">{t('leaderboard.noNationalActive')}</p>
                      <p className="text-gray-600 dark:text-gray-300">{t('leaderboard.noNationalActiveDesc')}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card className="mt-8 bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Trophy className="h-8 w-8" />
                  {t('leaderboard.hallOfFame')}
                </CardTitle>
                <CardDescription className="text-blue-100">
                  {t('leaderboard.hallOfFameDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-lg">{t('leaderboard.noHallMembers')}</p>
                  <p className="text-sm text-blue-100 mt-2">{t('leaderboard.beFirst')}</p>
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
