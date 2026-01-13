'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Trophy, Twitter, Github, Linkedin, Mail } from 'lucide-react';
import { memo } from 'react';

export const Footer = memo(function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="w-full border-t border-[#05212b]" style={{ backgroundColor: '#000c12' }}>
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-sky-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                LEGACY
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Gamified Web3 education platform for sports professionals on the
              Apertum Blockchain.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-gray-500 hover:text-sky-400 transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-sky-400 transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-sky-400 transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="mailto:contact@legacy.com"
                className="text-gray-500 hover:text-sky-400 transition-colors"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-100 mb-4">
              {t('nav.education')}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/education/courses"
                  className="text-sm text-gray-400 hover:text-sky-400 transition-colors"
                >
                  {t('nav.courses')}
                </Link>
              </li>
              <li>
                <Link
                  href="/education/xp"
                  className="text-sm text-gray-400 hover:text-sky-400 transition-colors"
                >
                  {t('nav.xp')}
                </Link>
              </li>
              <li>
                <Link
                  href="/education/leaderboard"
                  className="text-sm text-gray-400 hover:text-sky-400 transition-colors"
                >
                  {t('nav.leaderboard')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-100 mb-4">
              {t('nav.sports')}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/sports"
                  className="text-sm text-gray-400 hover:text-sky-400 transition-colors"
                >
                  {t('nav.overview')}
                </Link>
              </li>
              <li>
                <Link
                  href="/sports/houses"
                  className="text-sm text-gray-400 hover:text-sky-400 transition-colors"
                >
                  {t('nav.houses')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-100 mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-gray-400 hover:text-sky-400 transition-colors"
                >
                  {t('nav.blog')}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-400 hover:text-sky-400 transition-colors"
                >
                  {t('nav.about')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-500">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
});
