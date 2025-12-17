import { LANGUAGES, type LangCode } from '@/types/builder';

export type LanguageMeta = (typeof LANGUAGES)[number];

export const LANGUAGE_META_MAP: Record<LangCode, LanguageMeta> = LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang.code] = lang;
    return acc;
  },
  {} as Record<LangCode, LanguageMeta>,
);

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').trim();

export function getAvailableLanguages(
  ...sources: Array<Partial<Record<LangCode, string>> | null | undefined>
): LanguageMeta[] {
  return LANGUAGES.filter((lang) =>
    sources.some((source) => {
      if (!source) return false;
      const raw = source[lang.code];
      if (typeof raw !== 'string') return false;
      return stripHtml(raw).length > 0;
    }),
  );
}
