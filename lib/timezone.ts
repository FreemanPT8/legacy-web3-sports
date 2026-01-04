const CET_TIMEZONE = 'Europe/Paris';

/**
 * Returns today's date string (YYYY-MM-DD) in CET.
 */
export function getTodayCETDate(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CET_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}
