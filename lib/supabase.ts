// lib/supabase.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verificações mínimas (estas duas tens SEMPRE, tanto em Bolt como em Netlify)
if (!supabaseUrl) {
  throw new Error('Missing Supabase env var: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing Supabase env var: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Cliente normal (anon) – usado em quase toda a app
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Cliente admin (service role) – usado só em rotas de servidor protegidas
// No Netlify tens a env, por isso aqui fica configurado.
// Em desenvolvimento, se não tiveres a env, fica `null` e apenas faz log.
export const supabaseAdmin =
  supabaseServiceRoleKey
    ? createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : (null as any);

if (!supabaseServiceRoleKey && process.env.NODE_ENV !== 'production') {
  console.warn(
    'SUPABASE_SERVICE_ROLE_KEY not set – admin client is disabled in dev.',
  );
}

// 👇 Isto resolve o erro de build:
// alguns ficheiros fazem `import { createClient } from "@/lib/supabase"`
export { createSupabaseClient as createClient };
