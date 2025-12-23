// lib/supabase.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verificações mínimas (url + anon key)
if (!supabaseUrl) {
  throw new Error('Missing Supabase env var: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing Supabase env var: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Cliente normal (anon)
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Cliente admin (service role) – só em rotas de servidor
export const supabaseAdmin =
  supabaseServiceRoleKey
    ? createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : (null as any);

// Em dev, se faltar a service_role, só avisa
if (!supabaseServiceRoleKey && process.env.NODE_ENV !== 'production') {
  console.warn(
    'SUPABASE_SERVICE_ROLE_KEY not set – admin client is disabled in dev.',
  );
}

// 👇 Wrapper para manter compatibilidade com o resto do código
// Agora `createClient()` pode ser chamado SEM argumentos.
export function createClient() {
  return supabase;
}
