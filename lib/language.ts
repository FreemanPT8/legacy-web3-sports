import { LANGUAGES, type LangCode } from '@/types/builder';

export type LanguageMeta = (typeof LANGUAGES)[number];

export const LANGUAGE_META_MAP: Record<LangCode, LanguageMeta> = LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang.code] = lang;
    return acc;
  },
  {} as Record<LangCode, LanguageMeta>,
);

const LANGUAGE_CODES = LANGUAGES.map((lang) => lang.code);

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').trim();

const hasVisibleContent = (value?: string | null) =>
  typeof value === 'string' && stripHtml(value).length > 0;

const fillMissingLanguages = (
  source: Partial<Record<LangCode, string>> | null | undefined,
): Partial<Record<LangCode, string>> | null => {
  if (!source) return null;
  const normalized: Partial<Record<LangCode, string>> = { ...source };

  const fallbackValue =
    LANGUAGE_CODES.map((code) => normalized[code]).find(hasVisibleContent) ||
    Object.values(normalized).find(hasVisibleContent);

  if (!fallbackValue) {
    return normalized;
  }

  LANGUAGE_CODES.forEach((code) => {
    if (!hasVisibleContent(normalized[code])) {
      normalized[code] = fallbackValue;
    }
  });

  return normalized;
};

export function getAvailableLanguages(
  ...sources: Array<Partial<Record<LangCode, string>> | null | undefined>
): LanguageMeta[] {
  const normalizedSources = sources.map((source) => fillMissingLanguages(source));
  return LANGUAGES.filter((lang) =>
    normalizedSources.some((source) => {
      if (!source) return false;
      const raw = source[lang.code];
      return hasVisibleContent(raw);
    }),
  );
}

export function ensureLanguageCoverage(
  value: Partial<Record<LangCode, string>> | null | undefined,
): Partial<Record<LangCode, string>> | null {
  return fillMissingLanguages(value);
}
