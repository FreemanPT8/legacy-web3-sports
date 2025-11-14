// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ⚠ Estes nomes de variáveis assumem que usas estes envs:
// NEXT_PUBLIC_SUPABASE_URL
// NEXT_PUBLIC_SUPABASE_ANON_KEY
// SUPABASE_SERVICE_ROLE_KEY

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Cliente “normal” (usar no frontend e em APIs normais)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Cliente “admin” (service role) – usar só em rotas de servidor protegidas (admin)
if (!supabaseServiceRoleKey) {
  throw new Error(
    'Missing Supabase env var: SUPABASE_SERVICE_ROLE_KEY (service role)'
  );
}

export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
