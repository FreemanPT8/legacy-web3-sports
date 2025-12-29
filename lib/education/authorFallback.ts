const DEFAULT_AUTHOR_CANDIDATES = [
  process.env.NEXT_PUBLIC_DEFAULT_AUTHOR_NAME,
  process.env.DEFAULT_AUTHOR_NAME,
  'freemanpt',
];

const FALLBACK_AUTHOR_NAME =
  DEFAULT_AUTHOR_CANDIDATES.find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  )?.trim() || 'freemanpt';

export function getDefaultAuthorName(): string {
  return FALLBACK_AUTHOR_NAME;
}

