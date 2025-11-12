'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Waves, Trophy, Zap, Globe2, TrendingUp, Target, Clock, Mail, Rocket, Shield, DollarSign } from 'lucide-react';

export default function SportsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [activeHouses, setActiveHouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sports/stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
          setActiveHouses(data.activeHouses);
        }
      } catch (error) {
        console.error('Failed to fetch sports stats:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="relative bg-gradient-to-br from-green-600 via-blue-600 to-cyan-600 text-white py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                {t('sports.hero.title')}
              </h1>
              <p className="text-xl md:text-2xl text-blue-100">
                {t('sports.hero.subtitle')}
              </p>
              <p className="text-lg text-blue-50 max-w-3xl mx-auto">
                {t('sports.hero.discover')}
              </p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 80C1200 80 1320 70 1380 65L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
            </svg>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  {t('sports.apertum.title')}
                </h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  {t('sports.apertum.description')}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <Card className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-8 pb-6">
                    <Zap className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">{t('sports.apertum.fast')}</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('sports.apertum.fastDesc')}
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-8 pb-6">
                    <DollarSign className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">{t('sports.apertum.affordable')}</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('sports.apertum.affordableDesc')}
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-8 pb-6">
                    <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">{t('sports.apertum.decentralized')}</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('sports.apertum.decentralizedDesc')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  {t('sports.trends.title')}
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  {t('sports.trends.description')}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Trophy className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>{t('sports.trends.nfts')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('sports.trends.nftsDesc')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Users className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>{t('sports.trends.fanTokens')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('sports.trends.fanTokensDesc')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Target className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>{t('sports.trends.daos')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('sports.trends.daosDesc')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <TrendingUp className="h-10 w-10 text-blue-600 mb-2" />
                    <CardTitle>{t('sports.trends.training')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('sports.trends.trainingDesc')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">
                    {t('sports.legacy.title')}
                  </h2>
                  <p className="text-lg text-gray-600 mb-6">
                    {t('sports.legacy.description')}
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Rocket className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-semibold">{t('sports.legacy.educationFirst')}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{t('sports.legacy.educationFirstDesc')}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-semibold">{t('sports.legacy.communityBuilding')}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{t('sports.legacy.communityBuildingDesc')}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Target className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-semibold">{t('sports.legacy.personalizedOnboarding')}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{t('sports.legacy.personalizedOnboardingDesc')}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 p-8">
                  <CardHeader>
                    <CardTitle className="text-2xl text-center">{t('sports.stats.title')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-lg text-center">
                          <div className="text-3xl font-bold text-blue-600">{stats?.totalMembers || 0}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{t('sports.stats.totalMembers')}</div>
                        </div>
                        <div className="bg-white p-6 rounded-lg text-center">
                          <div className="text-3xl font-bold text-blue-600">{stats?.activeHousesCount || 0}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{t('sports.stats.houses')}</div>
                        </div>
                        <div className="bg-white p-6 rounded-lg text-center">
                          <div className="text-3xl font-bold text-blue-600">{stats?.upcomingHousesCount || 0}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{t('sports.stats.comingSoon')}</div>
                        </div>
                        <div className="bg-white p-6 rounded-lg text-center">
                          <div className="text-3xl font-bold text-blue-600">{stats?.totalOnboardingCompleted || 0}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{t('sports.stats.onboarded')}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  {t('sports.houses.title')}
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  {t('sports.houses.subtitle')}
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : activeHouses.length === 0 ? (
                <Card className="text-center py-12">
                  <CardHeader>
                    <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <CardTitle>{t('houses.noActiveYet')}</CardTitle>
                    <CardDescription>{t('houses.noActiveYetDesc')}</CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {activeHouses.map((house: any) => (
                      <Card key={house.id} className={`border-2 border-${house.color}-500 hover:shadow-lg transition-shadow`}>
                        <CardHeader>
                          <div className="flex items-center justify-between mb-3">
                            {house.icon === 'Waves' ? (
                              <Waves className={`h-12 w-12 text-${house.color}-600`} />
                            ) : (
                              <Trophy className={`h-12 w-12 text-${house.color}-600`} />
                            )}
                            <Badge className="bg-green-600">{t('houses.active')}</Badge>
                          </div>
                          <CardTitle className="text-2xl">{house.name}</CardTitle>
                          <CardDescription>{house.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span>{house.members}+ {t('houses.members')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-gray-500" />
                              <span>Exclusive {house.sport.toLowerCase()}-focused courses</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span>Admin: {house.admin}</span>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button className={`flex-1 bg-${house.color}-600 hover:bg-${house.color}-700`}>
                              {t('houses.joinHouse')}
                            </Button>
                            <Button variant="outline" className="flex-1">
                              {t('houses.contactAdmin')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="text-center mb-12">
                    <Link href="/sports/houses">
                      <Button size="lg" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                        {t('cta.viewAll')} Houses
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <Card className="bg-gradient-to-br from-cyan-100 to-blue-100 p-8">
                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Target className="h-10 w-10 text-blue-600" />
                        <div>
                          <div className="font-bold text-lg">{t('sports.onboarding.step1')}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{t('sports.onboarding.step1Desc')}</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Globe2 className="h-10 w-10 text-blue-600" />
                        <div>
                          <div className="font-bold text-lg">{t('sports.onboarding.step2')}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{t('sports.onboarding.step2Desc')}</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Rocket className="h-10 w-10 text-blue-600" />
                        <div>
                          <div className="font-bold text-lg">{t('sports.onboarding.step3')}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{t('sports.onboarding.step3Desc')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">
                    {t('sports.onboarding.title')}
                  </h2>
                  <p className="text-lg text-gray-600 mb-6">
                    {t('sports.onboarding.description')}
                  </p>
                  <p className="text-gray-600 mb-6">
                    {t('sports.onboarding.description2')}
                  </p>
                  <Link href="/sports/onboarding">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                      {t('sports.onboarding.startBtn')}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t('sports.cta.title')}
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              {t('sports.cta.bePartDesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <Link href="/signup">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
                    {t('cta.startJourney')}
                  </Button>
                </Link>
              ) : (
                <Link href="/sports/houses">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
                    {t('cta.explore')} Houses
                  </Button>
                </Link>
              )}
              <Link href="/blog">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8">
                  {t('cta.exploreBlog')}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
