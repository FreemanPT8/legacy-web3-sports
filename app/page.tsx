'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CryptoTicker } from '@/components/CryptoTicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, BookOpen, Users, Zap, Target, Globe2, TrendingUp, Award } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/education/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="min-h-screen flex flex-col">
      <CryptoTicker />
      <Header />

      <main className="flex-1">
        <section className="relative bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                {t('hero.title')}
              </h1>
              <p className="text-xl md:text-2xl text-blue-100">
                {t('hero.subtitle')}
              </p>
              <p className="text-lg text-blue-50 max-w-2xl mx-auto">
                {t('hero.description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {!user ? (
                  <>
                    <Link href="/signup">
                      <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
                        {t('cta.join')}
                      </Button>
                    </Link>
                    <Link href="/education/courses">
                      <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8">
                        {t('cta.learn')}
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
                      {t('cta.goDashboard')}
                    </Button>
                  </Link>
                )}
              </div>
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
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t('home.sectionTitle')}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {t('home.sectionDesc')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <BookOpen className="h-10 w-10 text-blue-600 mb-2" />
                  <CardTitle>{t('home.learnEarn')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('home.learnEarnDesc')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Trophy className="h-10 w-10 text-blue-600 mb-2" />
                  <CardTitle>{t('home.leaderboard')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('home.leaderboardDesc')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-10 w-10 text-blue-600 mb-2" />
                  <CardTitle>{t('home.communityForum')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('home.communityForumDesc')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Zap className="h-10 w-10 text-blue-600 mb-2" />
                  <CardTitle>{t('home.unlockContent')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('home.unlockContentDesc')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">
                    {t('home.web3Education')}
                  </h2>
                  <p className="text-lg text-gray-600 mb-6">
                    {t('home.web3EducationDesc')}
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2">
                      <Target className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>{t('home.structuredPaths')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Award className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>{t('home.earnXpLessons')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>{t('home.trackProgress')}</span>
                    </li>
                  </ul>
                  <div className="flex gap-4">
                    <Link href="/education">
                      <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                        {t('home.exploreWeb3')}
                      </Button>
                    </Link>
                    <Link href="/education/courses">
                      <Button size="lg" variant="outline">
                        {t('home.viewCourses')}
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-8 rounded-lg">
                  {loading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-lg text-center">
                        <div className="text-3xl font-bold text-blue-600">{stats?.totalCourses || 0}+</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{t('home.courses')}</div>
                      </div>
                      <div className="bg-white p-6 rounded-lg text-center">
                        <div className="text-3xl font-bold text-blue-600">{stats?.totalLessons || 0}+</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{t('home.lessons')}</div>
                      </div>
                      <div className="bg-white p-6 rounded-lg text-center">
                        <div className="text-3xl font-bold text-blue-600">{stats?.activeUsers || 0}+</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{t('home.members')}</div>
                      </div>
                      <div className="bg-white p-6 rounded-lg text-center">
                        <div className="text-3xl font-bold text-blue-600">6</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{t('home.languages')}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1 bg-gradient-to-br from-cyan-100 to-blue-100 p-8 rounded-lg">
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-blue-600" />
                        <div>
                          <div className="font-semibold">{t('home.housesOfSports')}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{t('home.housesOfSportsDesc')}</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Globe2 className="h-8 w-8 text-blue-600" />
                        <div>
                          <div className="font-semibold">{t('home.globalCommunity')}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{t('home.globalCommunityDesc')}</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Target className="h-8 w-8 text-blue-600" />
                        <div>
                          <div className="font-semibold">{t('home.personalizedOnboarding')}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{t('home.personalizedOnboardingDesc')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="order-1 md:order-2">
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">
                    {t('home.web3Sports')}
                  </h2>
                  <p className="text-lg text-gray-600 mb-6">
                    {t('home.web3SportsDesc')}
                  </p>
                  <p className="text-gray-600 mb-6">
                    {t('home.web3SportsDesc2')}
                  </p>
                  <div className="flex gap-4">
                    <Link href="/sports">
                      <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                        {t('home.exploreWeb3Sports')}
                      </Button>
                    </Link>
                    <Link href="/sports/onboarding">
                      <Button size="lg" variant="outline">
                        {t('home.startOnboarding')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-blue-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t('home.readyJourney')}
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              {t('home.joinThousands')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <>
                  <Link href="/signup">
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
                      {t('cta.join')}
                    </Button>
                  </Link>
                  <Link href="/blog">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8">
                      {t('home.exploreBlog')}
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/education/courses">
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
                      {t('cta.start')}
                    </Button>
                  </Link>
                  <Link href="/blog">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8">
                      {t('home.exploreBlog')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
