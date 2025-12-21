const UUID_REGEX =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

export function extractUuid(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  const match = trimmed.match(UUID_REGEX);
  if (match && match[0]) {
    return match[0].toLowerCase();
  }
  return null;
}

export function normalizeLessonIdForStorage(
  value?: string | null,
): string | null {
  if (!value) return null;
  const uuid = extractUuid(value);
  if (uuid) {
    return uuid;
  }
  return value;
}

export function buildLessonIdVariants(value?: string | null): string[] {
  const variants = new Set<string>();
  if (!value) {
    return [];
  }
  variants.add(value);
  const uuid = extractUuid(value);
  if (uuid) {
    variants.add(uuid);
  }
  return Array.from(variants);
}
