export type GlossaryLanguage = 'pt' | 'es' | 'en';

export type GlossaryStatus = 'draft' | 'review' | 'published';

export const GLOSSARY_LANGUAGES: GlossaryLanguage[] = ['pt', 'es', 'en'];

export interface GlossaryTerm {
  id: string;
  slug: string;
  term_pt: string;
  term_es: string;
  term_en: string;
  definition_pt: string;
  definition_es: string;
  definition_en: string;
  example_pt: string | null;
  example_es: string | null;
  example_en: string | null;
  aliases: string[] | null;
  tags: string[] | null;
  status: GlossaryStatus;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type GlossaryTranslations = Record<GlossaryLanguage, string>;

export interface GlossaryTermPayload {
  slug?: string;
  term: GlossaryTranslations;
  definition: GlossaryTranslations;
  example?: Partial<GlossaryTranslations>;
  aliases?: string[];
  tags?: string[];
  status?: GlossaryStatus;
}

export type GlossaryTermUpdatePayload = GlossaryTermPayload;

export type GlossaryContentType = 'lesson' | 'blog_post' | 'academy_page';

export interface GlossaryListFilters {
  search?: string;
  letter?: string;
  language?: GlossaryLanguage;
  tags?: string[];
  status?: GlossaryStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface GlossaryListResult {
  items: GlossaryTerm[];
  count: number;
  page: number;
  pageSize: number;
}

export interface GlossaryLinkPayload {
  termId?: string;
  slug?: string;
  contentType: GlossaryContentType;
  contentId: string;
  displayText: string;
  language: GlossaryLanguage;
  userId: string;
}

export interface GlossaryLinkFilters {
  contentType?: GlossaryContentType;
  contentId?: string;
}

export interface GlossaryTermLink {
  id: string;
  term_id: string;
  content_type: GlossaryContentType;
  content_id: string;
  display_text: string;
  language: GlossaryLanguage;
  created_by: string | null;
  created_at: string;
  term?: Pick<GlossaryTerm, 'id' | 'slug' | 'term_pt' | 'term_es' | 'term_en'>;
}
