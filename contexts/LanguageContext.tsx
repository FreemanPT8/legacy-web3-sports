'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, getTranslation } from '@/lib/i18n';

const SUPPORTED_LANGUAGE_CODES = ['pt', 'es', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export const SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGE_CODES;

const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

const isSupportedLanguage = (lang: unknown): lang is SupportedLanguage =>
  typeof lang === 'string' && SUPPORTED_LANGUAGE_CODES.includes(lang as SupportedLanguage);

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  setLanguageUnsafe?: (lang: Language) => void; // legacy support
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('language');
      if (isSupportedLanguage(stored)) {
        setLanguageState(stored);
      } else {
        const browserLang = navigator.language.split('-')[0];
        if (isSupportedLanguage(browserLang)) {
          setLanguageState(browserLang);
        }
      }
    } catch (error) {
      setLanguageState(DEFAULT_LANGUAGE);
    }
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    const nextLang = isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
    setLanguageState(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', nextLang);
    }
  };

  const setLanguageUnsafe = (lang: Language) => {
    if (isSupportedLanguage(lang)) {
      setLanguage(lang);
    }
  };

  const t = (key: string) => {
    return getTranslation(language as Language, key);
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, setLanguageUnsafe, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
