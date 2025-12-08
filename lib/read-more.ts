export const READ_MORE_MARKER = '<div class="read-more-marker" data-read-more></div>';

interface ReadMoreSplit {
  before: string;
  after: string;
  hasReadMore: boolean;
}

export function splitReadMore(html: string | null | undefined): ReadMoreSplit {
  const normalized = html || '';
  const parts = normalized.split(READ_MORE_MARKER);
  const before = parts[0] || '';
  const after = parts.slice(1).join(READ_MORE_MARKER);
  return {
    before,
    after,
    hasReadMore: parts.length > 1,
  };
}

export function removeReadMoreMarker(html: string | null | undefined): string {
  return splitReadMore(html).before;
}
