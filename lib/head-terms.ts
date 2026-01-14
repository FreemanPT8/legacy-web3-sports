import path from 'path';
import { promises as fs } from 'fs';

type HeadTermPayload = {
  version: string;
  content: string;
  locale: 'pt' | 'en' | 'es';
};

const TERM_LOCALES = new Set(['pt', 'en', 'es']);
const cachedTerms = new Map<string, HeadTermPayload>();
const TERM_BASENAME = 'head_v1.1';

export async function loadHeadTerm(locale: string = 'pt'): Promise<HeadTermPayload> {
  const normalizedLocale = TERM_LOCALES.has(locale) ? locale : 'pt';
  const cached = cachedTerms.get(normalizedLocale);
  if (cached) return cached;

  const filename =
    normalizedLocale === 'pt'
      ? `${TERM_BASENAME}.md`
      : `${TERM_BASENAME}.${normalizedLocale}.md`;
  const filePath = path.join(process.cwd(), 'content', 'terms', filename);
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if (normalizedLocale === 'pt') {
      throw error;
    }
    const fallbackPath = path.join(process.cwd(), 'content', 'terms', `${TERM_BASENAME}.md`);
    content = await fs.readFile(fallbackPath, 'utf-8');
  }
  const versionMatch = TERM_BASENAME.match(/head_v([\d.]+)/i);
  const version = versionMatch ? `v${versionMatch[1]}` : 'v1';

  const payload: HeadTermPayload = {
    version,
    content: content.trim(),
    locale: normalizedLocale as HeadTermPayload['locale'],
  };

  cachedTerms.set(normalizedLocale, payload);
  return payload;
}
