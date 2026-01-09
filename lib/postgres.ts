export const POSTGRES_MISSING_TABLE = '42P01';
export const POSTGRES_MISSING_COLUMN = '42703';

type PostgresErrorLike = {
  code?: string;
};

export function isMissingTable(error?: PostgresErrorLike | null) {
  return error?.code === POSTGRES_MISSING_TABLE;
}

export function isMissingColumn(error?: PostgresErrorLike | null) {
  return error?.code === POSTGRES_MISSING_COLUMN;
}

export function formatMissingResourceError(table: string) {
  return `Tabela ${table} inexistente. Executa as migrações mais recentes no Supabase.`;
}
