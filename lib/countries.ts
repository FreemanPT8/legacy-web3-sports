// lib/countries.ts

export type Country = {
  code: string;
  name: string;
};

const FALLBACK_COUNTRIES: Country[] = [
  { code: 'PT', name: 'Portugal' },
  { code: 'ES', name: 'Spain' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'PE', name: 'Peru' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'AO', name: 'Angola' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'ST', name: 'São Tomé and Príncipe' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'EG', name: 'Egypt' },
  { code: 'MA', name: 'Morocco' },
  { code: 'KE', name: 'Kenya' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'TH', name: 'Thailand' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'PL', name: 'Poland' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
];

const supportedValuesOf = (Intl as any)?.supportedValuesOf;

function buildDynamicCountryList(): Country[] {
  if (typeof supportedValuesOf !== 'function') {
    return FALLBACK_COUNTRIES;
  }

  try {
    const regions: string[] = supportedValuesOf.call(Intl, 'region');
    const display = new Intl.DisplayNames(['en'], { type: 'region' });
    const entries = regions
      .filter((code) => /^[A-Z]{2}$/.test(code))
      .map((code) => ({
        code,
        name: display.of(code) || code,
      }));

    if (entries.length > 0) {
      return entries;
    }
  } catch (error) {
    console.warn('[countries] Unable to derive global list, using fallback.', error);
  }

  return FALLBACK_COUNTRIES;
}

const baseCountries = buildDynamicCountryList();

export const COUNTRIES: Country[] = Array.from(
  new Map(
    [...baseCountries, ...FALLBACK_COUNTRIES].map((country) => [
      country.code.toUpperCase(),
      { code: country.code.toUpperCase(), name: country.name },
    ]),
  ).values(),
);

export function getCountryName(code: string): string {
  const normalized = code.toUpperCase();
  const found = COUNTRIES.find((c) => c.code === normalized);
  return found ? found.name : normalized;
}

export function getCountryCodeFromName(name?: string | null): string | null {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  const direct = COUNTRIES.find((c) => c.name.toLowerCase() === normalized);
  if (direct) return direct.code;

  const loose = COUNTRIES.find((c) =>
    normalized.includes(c.name.toLowerCase()),
  );
  return loose ? loose.code : null;
}

export function getSortedCountries(): Country[] {
  return [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
}
