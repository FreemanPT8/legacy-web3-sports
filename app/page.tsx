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
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import type { MediaAsset } from '@/types/builder';

const HERO_IMAGE_KEY = 'legacyHeroImage';
const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2000&q=80';

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [heroImage, setHeroImage] = useState<MediaAsset | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [heroOffset, setHeroOffset] = useState(0);
  const library = useMediaLibrary();

  const persistHeroImage = useCallback((asset: MediaAsset | null) => {
    setHeroImage(asset);
    if (typeof window !== 'undefined') {
      if (asset) {
        localStorage.setItem(HERO_IMAGE_KEY, JSON.stringify(asset));
      } else {
        localStorage.removeItem(HERO_IMAGE_KEY);
      }
    }
  }, []);

  const heroImageUrl = heroImage?.url || DEFAULT_HERO_IMAGE;
  const handleHeroSelect = useCallback(
    (asset: MediaAsset) => {
      persistHeroImage(asset);
      setLibraryOpen(false);
    },
    [persistHeroImage],
  );

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

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(HERO_IMAGE_KEY) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as MediaAsset;
        persistHeroImage(parsed);
      } catch {
        localStorage.removeItem(HERO_IMAGE_KEY);
      }
    }
  }, [persistHeroImage]);

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <CryptoTicker />
      <Header />

      <main className="flex-1">
        {/* HERO DARK FUTURISTA */}
        <section className="relative overflow-hidden text-white min-h-[640px] bg-slate-950">
          <div className="absolute inset-0">
            <img
              src={heroImageUrl}
              alt="Hero legacy"
              className="w-full h-full object-cover object-center"
              style={{
                objectPosition: `center calc(50% + ${heroOffset}px)`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
          </div>
          {isSuperAdmin && (
            <div className="absolute top-6 right-6 flex flex-col gap-3 bg-slate-900/70 px-4 py-3 rounded-2xl border border-white/20 shadow-xl">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/50 text-white/80"
                  onClick={() => setLibraryOpen(true)}
                >
                  Editar imagem
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="border border-red-500/60 text-red-300 hover:bg-red-500/10"
                  onClick={() => persistHeroImage(null)}
                >
                  Eliminar imagem
                </Button>
              </div>
              <label className="text-xs uppercase tracking-widest text-slate-300">
                Ajuste vertical
              </label>
              <input
                type="range"
                min={-200}
                max={200}
                value={heroOffset}
                onChange={(event) => setHeroOffset(Number(event.target.value))}
                className="w-48 accent-sky-400"
              />
            </div>
          )}
          <div className="relative z-10 container mx-auto px-0 h-full" />
        </section>

        <section className="py-12 bg-background text-white">
          <div className="container mx-auto px-4 text-center space-y-4 max-w-6xl">
            <p className="text-xs tracking-[0.6em] uppercase text-slate-400">LEGACY XP</p>
            <h1 className="text-3xl md:text-4xl font-semibold">
              LEGACY: Gamified Web3 Academy for Sports
            </h1>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              A collaborative platform dedicated to onboarding and educating sports professionals in Web3 technologies, particularly the Apertum network.
            </p>
            <div className="flex justify-center flex-wrap gap-4">
              <Link href="/signup">
                <Button size="lg" className="px-8 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold">
                  Junte-se Agora
                </Button>
              </Link>
              <Link href="/education">
                <Button size="lg" variant="outline" className="px-8 border-sky-500 text-sky-200 hover:bg-slate-900">
                  Saiba Mais
                </Button>
              </Link>
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
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-100">
                    {t('home.web3Education')}
                  </h2>
                    <p className="text-base text-gray-400 mb-4">
                    {t('home.web3EducationDesc')}
                  </p>
                    <ul className="space-y-2 mb-5">
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
                    <div className="flex flex-wrap gap-3">
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

                  <div className="h-56 md:h-72 w-full rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
                    <img
                      src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80"
                      alt="Web3 Academy snapshot"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                </div>
                </div>
                  <div className="mt-6 max-w-3xl mx-auto grid grid-cols-2 gap-3">
                    {[
                      ['home.courses', stats?.totalCourses || 0],
                      ['home.lessons', stats?.totalLessons || 0],
                      ['home.members', stats?.activeUsers || 0],
                      ['home.languages', 6],
                    ].map(([labelKey, value]) => (
                      <div
                        key={labelKey}
                        className="bg-card border border-slate-800 rounded-xl px-4 py-4 text-center shadow-sm"
                      >
                        <div className="text-lg font-semibold text-sky-400">
                          {value || 0}+
                        </div>
                        <div className="text-xs uppercase tracking-[0.4em] text-gray-400 mt-1">
                          {t(labelKey)}
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
        </section>

        {/* SECÇÃO 4 — WEB3 SPORTS / HOUSES OF SPORTS */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold text-gray-100 mb-4">
                  {t('home.web3Sports')}
                </h2>
                <p className="text-base text-gray-400 mb-4 max-w-3xl leading-relaxed">
                  {t('home.web3SportsDesc')}
                </p>
                <p className="text-sm text-gray-400 mb-6 max-w-3xl">
                  {t('home.web3SportsDesc2')}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/sports">
                    <Button size="lg" className="px-6 bg-sky-500 hover:bg-sky-400 text-slate-950">
                      {t('home.exploreWeb3Sports')}
                    </Button>
                  </Link>
                  <Link href="/sports/onboarding">
                    <Button size="lg" variant="outline" className="px-6 border-gray-600 text-gray-200 hover:bg-gray-900">
                      {t('home.startOnboarding')}
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="h-64 md:h-80 w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80"
                  alt="People collaborating in sports tech"
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  title: t('home.housesOfSports'),
                  desc: t('home.housesOfSportsDesc'),
                  icon: Users,
                },
                {
                  title: t('home.globalCommunity'),
                  desc: t('home.globalCommunityDesc'),
                  icon: Globe2,
                },
                {
                  title: t('home.personalizedOnboarding'),
                  desc: t('home.personalizedOnboardingDesc'),
                  icon: Target,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-card border border-slate-800 p-5 rounded-2xl text-left shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <item.icon className="h-6 w-6 text-sky-400" />
                    <div className="text-lg font-semibold text-gray-100">
                      {item.title}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed max-w-sm">{item.desc}</p>
                </div>
              ))}
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
        <MediaLibraryDialog
          open={libraryOpen}
          onOpenChange={(open) => setLibraryOpen(open)}
          library={library}
          onSelect={handleHeroSelect}
          description="Selecione ou envie uma nova imagem para o hero."
          allowUrl
        />
      </main>

      <Footer />
    </div>
  );
}
