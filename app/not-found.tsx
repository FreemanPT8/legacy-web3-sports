'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Home, BookOpen } from 'lucide-react';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#05212b] p-10 text-center">
          <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
            {t('home.errorLabel') || 'NOT FOUND'}
          </p>
          <div className="mt-4 text-6xl font-bold text-primary">404</div>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            {t('home.notFound')}
          </h1>
          <p className="mt-3 text-sm text-slate-300">{t('home.notFoundDesc')}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="justify-center">
              <Link href="/" className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                {t('home.goHome')}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="justify-center border-white/30 text-white hover:text-cyan-300"
            >
              <Link href="/education/courses" className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {t('home.browseCourses')}
              </Link>
            </Button>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
              {t('home.popularPages')}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-slate-300">
              <Link href="/blog" className="hover:text-cyan-300">
                {t('blog.title')}
              </Link>
              <span className="text-slate-600">?</span>
              <Link href="/education/leaderboard" className="hover:text-cyan-300">
                {t('education.leaderboard')}
              </Link>
              <span className="text-slate-600">?</span>
              <Link href="/sports/houses" className="hover:text-cyan-300">
                {t('home.housesOfSports2')}
              </Link>
              <span className="text-slate-600">?</span>
              <Link href="/about" className="hover:text-cyan-300">
                {t('home.about')}
              </Link>
              <span className="text-slate-600">?</span>
              <Link href="/dashboard" className="hover:text-cyan-300">
                {t('dashboard.title')}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
