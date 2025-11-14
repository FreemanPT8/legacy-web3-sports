import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ----------------------
// Types
// ----------------------

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
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
        Insert: Omit<
          Database['public']['Tables']['users']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['users']['Insert']
        >;
      };
    };
  };
};

// ----------------------
// Clients
// ----------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente público (frontend, operações normais com RLS aplicada)
export const supabase = createSupabaseClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

// Mantemos esta função para compatibilidade com o resto do código
export function createClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Service role – para rotas de ADMIN no backend (ignora RLS)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = serviceRoleKey
  ? createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    })
  : supabase;
