'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, BookOpen } from 'lucide-react';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-foreground">
      <Header />

      <main className="flex-1 flex items-center justify-center py-16">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto bg-card border border-border">
            <CardContent className="text-center py-16">
              <div className="text-8xl font-bold text-primary mb-4">404</div>
              <h1 className="text-3xl font-bold mb-4">{t('home.notFound')}</h1>
              <p className="text-lg text-muted-foreground mb-8">
                {t('home.notFoundDesc')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <Button size="lg">
                    <Home className="h-5 w-5 mr-2" />
                    {t('home.goHome')}
                  </Button>
                </Link>
                <Link href="/education/courses">
                  <Button size="lg" variant="outline">
                    <BookOpen className="h-5 w-5 mr-2" />
                    {t('home.browseCourses')}
                  </Button>
                </Link>
              </div>

              <div className="mt-12 pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground mb-4">
                  {t('home.popularPages')}
                </p>
                <div className="flex flex-wrap gap-3 justify-center text-sm">
                  <Link href="/blog" className="text-primary hover:underline">
                    {t('blog.title')}
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link
                    href="/education/leaderboard"
                    className="text-primary hover:underline"
                  >
                    {t('education.leaderboard')}
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/sports/houses" className="text-primary hover:underline">
                    {t('home.housesOfSports2')}
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/about" className="text-primary hover:underline">
                    {t('home.about')}
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/dashboard" className="text-primary hover:underline">
                    {t('dashboard.title')}
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
