import { useMemo } from 'react';

const CET_TIMEZONE = 'Europe/Paris';

const CET_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: CET_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZoneName: 'shortOffset',
});

function parseParts(date: Date) {
  const parts = CET_FORMATTER.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const timeZoneName = parts.find((part) => part.type === 'timeZoneName')
    ?.value;
  const offsetMinutes = parseOffset(timeZoneName);
  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
    hour: lookup.hour,
    minute: lookup.minute,
    second: lookup.second,
    offsetMinutes,
  };
}

function parseOffset(offset?: string) {
  if (!offset) return 0;
  const match = offset.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/i);
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  return hours * 60 + Math.sign(hours) * minutes;
}

function formatOffset(minutes: number) {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const hrs = String(Math.floor(abs / 60)).padStart(2, '0');
  const mins = String(abs % 60).padStart(2, '0');
  return `${sign}${hrs}:${mins}`;
}

export function useScheduleCET() {
  return useMemo(() => {
    const toCETISOString = (value: string | number | Date) => {
      const date =
        value instanceof Date ? value : new Date(value);
      const parts = parseParts(date);
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${formatOffset(
        parts.offsetMinutes,
      )}`;
    };

    const toInputValues = (value: string | number | Date) => {
      const date =
        value instanceof Date ? value : new Date(value);
      const parts = parseParts(date);
      return {
        date: `${parts.year}-${parts.month}-${parts.day}`,
        time: `${parts.hour}:${parts.minute}`,
      };
    };

    const fromInput = (date: string, time: string) => {
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
      const timestamp = Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0);

      const matchesOffset = (offset: number) => {
        const utcDate = new Date(timestamp - offset * 60 * 1000);
        const parts = parseParts(utcDate);
        return (
          parts.year === date.slice(0, 4) &&
          parts.month === date.slice(5, 7) &&
          parts.day === date.slice(8, 10) &&
          parts.hour === time.slice(0, 2) &&
          parts.minute === time.slice(3, 5)
        );
      };

      const offsetMinutes = matchesOffset(120) ? 120 : 60;
      const iso = `${date}T${time}:00${formatOffset(offsetMinutes)}`;
      return iso;
    };

    const validateFutureDate = (isoString: string) => {
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) {
        return { valid: false, reason: 'Invalid date' };
      }
      if (date.getTime() < Date.now()) {
        return { valid: false, reason: 'Date must be in the future' };
      }
      return { valid: true };
    };

    return {
      timezone: 'CET' as const,
      toCETISOString,
      toInputValues,
      fromInput,
      validateFutureDate,
    };
  }, []);
}
