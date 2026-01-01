import type {
  GlossaryLanguage,
  GlossaryListFilters,
  GlossaryListResult,
  GlossaryLinkFilters,
  GlossaryLinkPayload,
  GlossaryStatus,
  GlossaryTerm,
  GlossaryTermLink,
  GlossaryTermPayload,
  GlossaryTermUpdatePayload,
  GlossaryTranslations,
} from '@/types/glossary';
import { supabase, supabaseAdmin } from '@/lib/supabase';

const db = supabaseAdmin ?? supabase;

const ALLOWED_STATUSES: GlossaryStatus[] = ['draft', 'review', 'published'];
const LANGUAGES: GlossaryLanguage[] = ['pt', 'es', 'en'];
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const MAX_SLUG_ATTEMPTS = 25;

export class GlossaryError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function sanitizeString(value?: string | null): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function sanitizeOptional(value?: string | null): string | null {
  const trimmed = sanitizeString(value);
  return trimmed.length ? trimmed : null;
}

function sanitizeList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((entry) => sanitizeString(entry))
    .filter((entry) => entry.length > 0);
}

function resolveStatus(status?: GlossaryStatus | null): GlossaryStatus {
  if (status && ALLOWED_STATUSES.includes(status)) {
    return status;
  }
  return 'draft';
}

function slugifyBase(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'termo';
}

async function generateUniqueSlug(
  rawSlug: string,
  excludeId?: string,
): Promise<string> {
  let attempt = 1;
  let slug = slugifyBase(rawSlug);

  while (attempt <= MAX_SLUG_ATTEMPTS) {
    const { data } = await db
      .from('glossary_terms')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!data || data.id === excludeId) {
      return slug;
    }

    attempt += 1;
    slug = `${slugifyBase(rawSlug)}-${attempt}`;
  }

  throw new GlossaryError(
    'Nao foi possivel gerar um slug unico para este termo.',
    422,
  );
}

function ensureTranslations(
  fieldName: string,
  input?: Partial<GlossaryTranslations> | null,
): Record<GlossaryLanguage, string> {
  if (!input) {
    throw new GlossaryError(
      `Campo "${fieldName}" obrigatorio nas 3 linguas.`,
      400,
    );
  }

  const result: Record<GlossaryLanguage, string> = {
    pt: '',
    es: '',
    en: '',
  };

  for (const lang of LANGUAGES) {
    const value = sanitizeString(input[lang]);
    if (!value) {
      throw new GlossaryError(
        `Campo "${fieldName}.${lang}" obrigatorio.`,
        400,
      );
    }
    result[lang] = value;
  }

  return result;
}

function ensureExamples(
  input?: Partial<GlossaryTranslations> | null,
): Record<GlossaryLanguage, string | null> {
  const result: Record<GlossaryLanguage, string | null> = {
    pt: null,
    es: null,
    en: null,
  };

  if (!input) return result;

  for (const lang of LANGUAGES) {
    result[lang] = sanitizeOptional(input[lang]);
  }

  return result;
}

function normalizeLetter(value?: string | null): string | undefined {
  if (!value) return undefined;
  const letter = value.trim().toLowerCase();
  if (!letter.length) return undefined;
  return letter[0];
}

function clampPageSize(value?: number | null): number {
  if (!value || Number.isNaN(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(1, value), MAX_PAGE_SIZE);
}

function applyStatusFilter<T extends { eq: Function }>(
  query: T,
  statusFilter: GlossaryStatus | 'all' | undefined,
) {
  if (!statusFilter || statusFilter === 'all') {
    return query;
  }
  return query.eq('status', statusFilter);
}

async function fetchTermBy(
  column: 'id' | 'slug',
  value: string,
  includeDrafts: boolean,
): Promise<GlossaryTerm> {
  let query = db.from('glossary_terms').select('*').eq(column, value);

  if (!includeDrafts) {
    query = query.eq('status', 'published');
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new GlossaryError('Falha ao carregar termo do glossario.', 500);
  }

  if (!data) {
    throw new GlossaryError('Termo nao encontrado.', 404);
  }

  return data as GlossaryTerm;
}

export async function listGlossaryTerms(
  filters: GlossaryListFilters = {},
  options: { includeDrafts?: boolean } = {},
): Promise<GlossaryListResult> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = clampPageSize(filters.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const language =
    filters.language && LANGUAGES.includes(filters.language)
      ? filters.language
      : 'pt';

  let query = db
    .from('glossary_terms')
    .select('*', { count: 'exact' })
    .order(`term_${language}`, { ascending: true, nullsFirst: false });

  if (!options.includeDrafts) {
    query = query.eq('status', 'published');
  } else {
    query = applyStatusFilter(query, filters.status);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }

  const normalizedLetter = normalizeLetter(filters.letter);
  if (normalizedLetter) {
    query = query.ilike(
      `term_${language}`,
      `${normalizedLetter}%`.replace(/%+/g, '%'),
    );
  }

  const searchValue = sanitizeString(filters.search);
  if (searchValue) {
    query = query.textSearch('search_vector', searchValue, {
      type: 'websearch',
    });
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new GlossaryError('Nao foi possivel listar os termos do glossario.', 500);
  }

  return {
    items: (data as GlossaryTerm[]) || [],
    count: count ?? 0,
    page,
    pageSize,
  };
}

export async function getGlossaryTermById(
  id: string,
  options: { includeDrafts?: boolean } = {},
) {
  return fetchTermBy('id', id, options.includeDrafts ?? true);
}

export async function getGlossaryTermBySlug(
  slug: string,
  options: { includeDrafts?: boolean } = {},
) {
  return fetchTermBy('slug', slug, options.includeDrafts ?? false);
}

export async function createGlossaryTerm(
  payload: GlossaryTermPayload,
  userId: string,
): Promise<GlossaryTerm> {
  const term = ensureTranslations('term', payload.term);
  const definition = ensureTranslations('definition', payload.definition);
  const examples = ensureExamples(payload.example);
  const aliases = sanitizeList(payload.aliases);
  const tags = sanitizeList(payload.tags);
  const status = resolveStatus(payload.status);

  const slugBase = payload.slug ? slugifyBase(payload.slug) : slugifyBase(term.pt);
  const uniqueSlug = await generateUniqueSlug(slugBase);
  const publishedAt =
    status === 'published' ? new Date().toISOString() : null;

  const { data, error } = await db
    .from('glossary_terms')
    .insert({
      slug: uniqueSlug,
      term_pt: term.pt,
      term_es: term.es,
      term_en: term.en,
      definition_pt: definition.pt,
      definition_es: definition.es,
      definition_en: definition.en,
      example_pt: examples.pt,
      example_es: examples.es,
      example_en: examples.en,
      aliases,
      tags,
      status,
      published_at: publishedAt,
      created_by: userId,
      updated_by: userId,
    })
    .select('*')
    .single();

  if (error) {
    throw new GlossaryError('Falha ao criar termo do glossario.', 500);
  }

  return data as GlossaryTerm;
}

export async function updateGlossaryTerm(
  id: string,
  payload: GlossaryTermUpdatePayload,
  userId: string,
): Promise<GlossaryTerm> {
  const existing = await getGlossaryTermById(id, { includeDrafts: true });

  const term = ensureTranslations('term', payload.term);
  const definition = ensureTranslations('definition', payload.definition);
  const examples = ensureExamples(payload.example);
  const aliases = sanitizeList(payload.aliases);
  const tags = sanitizeList(payload.tags);
  const status = resolveStatus(payload.status ?? existing.status);

  const desiredSlug = payload.slug
    ? slugifyBase(payload.slug)
    : existing.slug;
  const uniqueSlug = await generateUniqueSlug(desiredSlug, existing.id);
  const publishedAt =
    status === 'published'
      ? existing.published_at ?? new Date().toISOString()
      : null;

  const { data, error } = await db
    .from('glossary_terms')
    .update({
      slug: uniqueSlug,
      term_pt: term.pt,
      term_es: term.es,
      term_en: term.en,
      definition_pt: definition.pt,
      definition_es: definition.es,
      definition_en: definition.en,
      example_pt: examples.pt,
      example_es: examples.es,
      example_en: examples.en,
      aliases,
      tags,
      status,
      published_at: publishedAt,
      updated_by: userId,
    })
    .eq('id', existing.id)
    .select('*')
    .single();

  if (error) {
    throw new GlossaryError('Falha ao atualizar termo do glossario.', 500);
  }

  return data as GlossaryTerm;
}

export async function deleteGlossaryTerm(id: string): Promise<void> {
  const { error, data } = await db
    .from('glossary_terms')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    throw new GlossaryError('Falha ao eliminar termo do glossario.', 500);
  }

  if (!data || data.length === 0) {
    throw new GlossaryError('Termo nao encontrado.', 404);
  }
}

export async function recordGlossaryLink(
  payload: GlossaryLinkPayload,
): Promise<GlossaryTermLink> {
  let termId = sanitizeString(payload.termId);
  const normalizedText = sanitizeString(payload.displayText);

  if (!termId && payload.slug) {
    const target = await getGlossaryTermBySlug(payload.slug, {
      includeDrafts: true,
    });
    termId = target.id;
  }

  if (!termId) {
    throw new GlossaryError('Termo de glossario invalido.', 400);
  }

  if (!normalizedText) {
    throw new GlossaryError('Texto apresentado obrigatorio.', 400);
  }

  if (!payload.contentId) {
    throw new GlossaryError('contentId obrigatorio.', 400);
  }

  const { data, error } = await db
    .from('glossary_term_links')
    .upsert(
      {
        term_id: termId,
        content_type: payload.contentType,
        content_id: payload.contentId,
        display_text: normalizedText,
        language: payload.language,
        created_by: payload.userId,
      },
      {
        onConflict:
          'term_id,content_type,content_id,display_text,language',
      },
    )
    .select(
      'id, term_id, content_type, content_id, display_text, language, created_at, created_by',
    )
    .single();

  if (error) {
    throw new GlossaryError('Falha ao registar ligacao ao glossario.', 500);
  }

  return data as GlossaryTermLink;
}

export async function listGlossaryLinks(
  filters: GlossaryLinkFilters = {},
): Promise<GlossaryTermLink[]> {
  let query = db
    .from('glossary_term_links')
    .select(
      `
        id,
        term_id,
        content_type,
        content_id,
        display_text,
        language,
        created_at,
        created_by,
        term:glossary_terms (
          id,
          slug,
          term_pt,
          term_es,
          term_en
        )
      `,
    )
    .order('created_at', { ascending: false });

  if (filters.contentType) {
    query = query.eq('content_type', filters.contentType);
  }
  if (filters.contentId) {
    query = query.eq('content_id', filters.contentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new GlossaryError('Falha ao carregar ligacoes do glossario.', 500);
  }

  return (data as any[]).map((row) => ({
    id: row.id,
    term_id: row.term_id,
    content_type: row.content_type,
    content_id: row.content_id,
    display_text: row.display_text,
    language: row.language,
    created_at: row.created_at,
    created_by: row.created_by,
    term: row.term
      ? {
          id: row.term.id,
          slug: row.term.slug,
          term_pt: row.term.term_pt,
          term_es: row.term.term_es,
          term_en: row.term.term_en,
        }
      : undefined,
  }));
}

export async function deleteGlossaryLink(id: string): Promise<void> {
  const { error, data } = await db
    .from('glossary_term_links')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    throw new GlossaryError('Falha ao remover ligacao do glossario.', 500);
  }

  if (!data || data.length === 0) {
    throw new GlossaryError('Ligacao nao encontrada.', 404);
  }
}
