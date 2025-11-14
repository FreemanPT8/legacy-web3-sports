// lib/supabase.ts
import {
  createClient as createSupabaseClient,
  SupabaseClient,
} from '@supabase/supabase-js';

// ⚠️ Estas vars podem estar undefined em ambientes de build (Bolt/Netlify)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Tipagens só para a tabela users (não são usadas para restringir .from())
type UserRow = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  password_hash: string;
  country: string;
  role: 'Super Admin' | 'Admin' | 'Member';
  xp_total: number;
  avatar_url: string | null;
  bio: string | null;
  sports_role: string | null;
  telegram: string | null;
  dao1_did_nft: string | null;
  wallet_address: string | null;
  website: string | null;
  youtube: string | null;
  linkhub: string | null;
  facebook: string | null;
  instagram: string | null;
  profile_visibility: Record<string, boolean>;
  profile_unlocked: boolean;
  email_verified: boolean;
  last_login: string | null;
  streak_count: number;
  streak_updated_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, 'id' | 'created_at'>;
        Update: Partial<Omit<UserRow, 'id' | 'created_at'>>;
      };
    };
  };
};

// Cliente Supabase “universal”
//
// - Em produção (Vercel) usa as env vars reais.
// - Em ambientes de build (Bolt/Netlify), onde as env vars não existem,
//   devolve um client “falso” cujo .from() lança um erro explícito APENAS
//   se for chamado. Assim o build não rebenta por falta de SUPABASE_URL.
export const supabase: SupabaseClient<any> = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[supabase] Env vars em falta (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). ' +
        'A usar dummy client — seguro apenas para build/testes.',
    );

    const dummy: any = {
      from() {
        throw new Error(
          'Supabase client not configured (missing env vars NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)',
        );
      },
    };

    return dummy as SupabaseClient<any>;
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
})();

// Helper para criar um client real, por ex. em componentes client-side
export function createClient(): SupabaseClient<any> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase client not configured (missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)',
    );
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}
