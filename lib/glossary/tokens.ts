const TOKEN_REGEX =
  /\[\[glossary:([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/gi;

const ATTRIBUTE_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#39;',
  '<': '&lt;',
  '>': '&gt;',
};

function escapeAttribute(value: string): string {
  return value.replace(/[&"'<>]/g, (char) => ATTRIBUTE_ESCAPES[char] || char);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      default:
        return char;
    }
  });
}

function normalizeSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

export function renderGlossaryTokens(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return html.replace(TOKEN_REGEX, (_match, slugRaw, labelRaw) => {
    const slug = normalizeSlug(String(slugRaw || ''));
    const label = (labelRaw || slugRaw || '').trim();

    if (!slug) {
      return escapeHtml(label || '');
    }

    const display = label || slug;
    const safeDisplay = escapeHtml(display);
    const safeSlug = escapeAttribute(slug);
    const safeLabel = escapeAttribute(display);

    return `<button type="button" class="glossary-inline-term" data-glossary-term="true" data-slug="${safeSlug}" data-label="${safeLabel}">${safeDisplay}</button>`;
  });
}
