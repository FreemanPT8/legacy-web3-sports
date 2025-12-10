'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CryptoTicker } from '@/components/CryptoTicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Trophy,
  BookOpen,
  Users,
  Zap,
  Target,
  Globe2,
  TrendingUp,
  Award,
} from 'lucide-react';

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
    <div className="min-h-screen flex flex-col bg-page">
      <CryptoTicker />
      <Header />

      <main className="flex-1">
        {/* HERO DARK FUTURISTA */}
        <section className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                {t('hero.title')}
              </h1>
              <p className="text-xl md:text-2xl text-sky-200">
                {t('hero.subtitle')}
              </p>
              <p className="text-lg text-slate-200 max-w-2xl mx-auto">
                {t('hero.description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {!user ? (
                  <>
                    <Link href="/signup">
                      <Button
                        size="lg"
                        className="px-8 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
                      >
                        {t('cta.join')}
                      </Button>
                    </Link>
                    <Link href="/education/courses">
                      <Button
                        size="lg"
                        variant="outline"
                        className="px-8 border-sky-500 text-sky-200 hover:bg-slate-900"
                      >
                        {t('cta.learn')}
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link href="/dashboard">
                    <Button
                      size="lg"
                      className="px-8 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
                    >
                      {t('cta.goDashboard')}
                    </Button>
                  </Link>
                )}
              </div>
              <div className="mt-12 flex justify-center">
                <div className="relative w-full max-w-4xl h-80 rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage:
                        "url('https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80')",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <p className="text-xs uppercase tracking-[0.4em] text-slate-300 mb-1">
                      O Legacy
                    </p>
                    <h3 className="text-3xl font-semibold text-white mb-2">
                      A plataforma que liga conteúdo, XP e comunidade Web3
                    </h3>
                    <p className="text-sm text-slate-200 max-w-2xl">
                      Um showcase visual do grau de maturidade da nossa rede: imagem, cores e textura fazem parte do nosso storytelling.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECÇÃO 2 — BENEFÍCIOS (CARDS ESCUROS) */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-100">
                {t('home.sectionTitle')}
              </h2>
              <p className="text-lg text-gray-400 max-w-3xl mx-auto">
                {t('home.sectionDesc')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-card border-gray-800">
                <CardHeader>
                  <BookOpen className="h-10 w-10 text-sky-400 mb-2" />
                  <CardTitle className="text-gray-100">
                    {t('home.learnEarn')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">
                    {t('home.learnEarnDesc')}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-gray-800">
                <CardHeader>
                  <Trophy className="h-10 w-10 text-sky-400 mb-2" />
                  <CardTitle className="text-gray-100">
                    {t('home.leaderboard')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">
                    {t('home.leaderboardDesc')}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-gray-800">
                <CardHeader>
                  <Users className="h-10 w-10 text-sky-400 mb-2" />
                  <CardTitle className="text-gray-100">
                    {t('home.communityForum')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">
                    {t('home.communityForumDesc')}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-gray-800">
                <CardHeader>
                  <Zap className="h-10 w-10 text-sky-400 mb-2" />
                  <CardTitle className="text-gray-100">
                    {t('home.unlockContent')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">
                    {t('home.unlockContentDesc')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* SECÇÃO 3 — WEB3 EDUCATION + ESTATÍSTICAS */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-100">
                    {t('home.web3Education')}
                  </h2>
                  <p className="text-lg text-gray-400 mb-6">
                    {t('home.web3EducationDesc')}
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2">
                      <Target className="h-6 w-6 text-sky-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">
                        {t('home.structuredPaths')}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Award className="h-6 w-6 text-sky-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">
                        {t('home.earnXpLessons')}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp className="h-6 w-6 text-sky-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">
                        {t('home.trackProgress')}
                      </span>
                    </li>
                  </ul>
                  <div className="flex gap-4">
                    <Link href="/education">
                      <Button
                        size="lg"
                        className="bg-sky-500 hover:bg-sky-400 text-slate-950"
                      >
                        {t('home.exploreWeb3')}
                      </Button>
                    </Link>
                    <Link href="/education/courses">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-gray-700 text-gray-200 hover:bg-gray-900"
                      >
                        {t('home.viewCourses')}
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 rounded-2xl border border-slate-800 shadow-lg">
                  {loading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-card border border-slate-800 p-6 rounded-lg text-center">
                        <div className="text-3xl font-bold text-sky-400">
                          {stats?.totalCourses || 0}+
                        </div>
                        <div className="text-sm text-gray-400">
                          {t('home.courses')}
                        </div>
                      </div>
                      <div className="bg-card border border-slate-800 p-6 rounded-lg text-center">
                        <div className="text-3xl font-bold text-sky-400">
                          {stats?.totalLessons || 0}+
                        </div>
                        <div className="text-sm text-gray-400">
                          {t('home.lessons')}
                        </div>
                      </div>
                      <div className="bg-card border border-slate-800 p-6 rounded-lg text-center">
                        <div className="text-3xl font-bold text-sky-400">
                          {stats?.activeUsers || 0}+
                        </div>
                        <div className="text-sm text-gray-400">
                          {t('home.members')}
                        </div>
                      </div>
                      <div className="bg-card border border-slate-800 p-6 rounded-lg text-center">
                        <div className="text-3xl font-bold text-sky-400">6</div>
                        <div className="text-sm text-gray-400">
                          {t('home.languages')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECÇÃO 4 — WEB3 SPORTS / HOUSES OF SPORTS */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 rounded-2xl border border-slate-800">
                  <div className="space-y-4">
                    <div className="bg-card border border-slate-800 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-sky-400" />
                        <div>
                          <div className="font-semibold text-gray-100">
                            {t('home.housesOfSports')}
                          </div>
                          <div className="text-sm text-gray-400">
                            {t('home.housesOfSportsDesc')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-card border border-slate-800 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Globe2 className="h-8 w-8 text-sky-400" />
                        <div>
                          <div className="font-semibold text-gray-100">
                            {t('home.globalCommunity')}
                          </div>
                          <div className="text-sm text-gray-400">
                            {t('home.globalCommunityDesc')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-card border border-slate-800 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Target className="h-8 w-8 text-sky-400" />
                        <div>
                          <div className="font-semibold text-gray-100">
                            {t('home.personalizedOnboarding')}
                          </div>
                          <div className="text-sm text-gray-400">
                            {t('home.personalizedOnboardingDesc')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="order-1 md:order-2">
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-100">
                    {t('home.web3Sports')}
                  </h2>
                  <p className="text-lg text-gray-400 mb-6">
                    {t('home.web3SportsDesc')}
                  </p>
                  <p className="text-gray-400 mb-6">
                    {t('home.web3SportsDesc2')}
                  </p>
                  <div className="flex gap-4">
                    <Link href="/sports">
                      <Button
                        size="lg"
                        className="bg-sky-500 hover:bg-sky-400 text-slate-950"
                      >
                        {t('home.exploreWeb3Sports')}
                      </Button>
                    </Link>
                    <Link href="/sports/onboarding">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-gray-700 text-gray-200 hover:bg-gray-900"
                      >
                        {t('home.startOnboarding')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-16 bg-gradient-to-r from-slate-950 via-blue-900 to-slate-950 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t('home.readyJourney')}
            </h2>
            <p className="text-xl text-sky-200 mb-8 max-w-2xl mx-auto">
              {t('home.joinThousands')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <>
                  <Link href="/signup">
                    <Button
                      size="lg"
                      className="px-8 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
                    >
                      {t('cta.join')}
                    </Button>
                  </Link>
                  <Link href="/blog">
                    <Button
                      size="lg"
                      variant="outline"
                      className="px-8 border-sky-300 text-sky-100 hover:bg-slate-900"
                    >
                      {t('home.exploreBlog')}
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/education/courses">
                    <Button
                      size="lg"
                      className="px-8 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
                    >
                      {t('cta.start')}
                    </Button>
                  </Link>
                  <Link href="/blog">
                    <Button
                      size="lg"
                      variant="outline"
                      className="px-8 border-sky-300 text-sky-100 hover:bg-slate-900"
                    >
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
