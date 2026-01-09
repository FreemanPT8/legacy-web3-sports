// lib/countries.ts
import { ISO_COUNTRIES } from '@/data/countries-full';

export type Country = {
  code: string;
  name: string;
};

// The dataset from restcountries already inclui ~250 entradas. Garantimos
// códigos em uppercase e nomes normalizados.
const NORMALIZED_COUNTRIES: Country[] = ISO_COUNTRIES.map((item) => ({
  code: item.code.toUpperCase(),
  name: item.name,
}));

export const COUNTRIES: Country[] = NORMALIZED_COUNTRIES;

export function getCountryName(code: string): string {
  const normalized = code.toUpperCase();
  const found = COUNTRIES.find((country) => country.code === normalized);
  return found ? found.name : normalized;
}

export function getCountryCodeFromName(name?: string | null): string | null {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  const direct = COUNTRIES.find((country) => country.name.toLowerCase() === normalized);
  if (direct) return direct.code;

  const loose = COUNTRIES.find((country) =>
    normalized.includes(country.name.toLowerCase()),
  );
  return loose ? loose.code : null;
}

export function getSortedCountries(): Country[] {
  return [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
}
