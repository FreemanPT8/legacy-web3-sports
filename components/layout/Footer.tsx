'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Trophy, Twitter, Github, Linkedin, Mail } from 'lucide-react';
import { memo } from 'react';

export const Footer = memo(function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="w-full border-t bg-gray-50">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                LEGACY
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Gamified Web3 education platform for sports professionals on the Apertum Blockchain.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="mailto:contact@legacy.com" className="text-gray-400 hover:text-blue-600 transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">{t('nav.education')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/education/courses" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  {t('nav.courses')}
                </Link>
              </li>
              <li>
                <Link href="/education/xp" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  {t('nav.xp')}
                </Link>
              </li>
              <li>
                <Link href="/education/leaderboard" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  {t('nav.leaderboard')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">{t('nav.sports')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/sports/houses" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  {t('nav.houses')}
                </Link>
              </li>
              <li>
                <Link href="/sports/onboarding" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  {t('nav.onboarding')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/blog" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  {t('nav.blog')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link href="/forum" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  {t('nav.forum')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center">
          <p className="text-sm text-gray-600">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
});
