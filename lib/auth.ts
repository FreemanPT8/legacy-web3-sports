import { supabase } from './supabase';
import bcrypt from 'bcryptjs';
import { signToken } from './jwt';

// ---- ROLES & USER BASE TYPES ----

export type UserRole = 'Super Admin' | 'Admin' | 'Member';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  xp_total: number;
  avatar_url?: string;
  streak_count?: number;
  created_at?: string;
  is_banned?: boolean; // novo campo (tabela users)
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  token?: string;
}

// Hierarquia de roles: usado em vários helpers
export const ROLE_RANK: Record<UserRole, number> = {
  'Member': 1,
  'Admin': 2,
  'Super Admin': 3,
};

export function hasRoleAtLeast(
  user: { role: UserRole } | null | undefined,
  minimum: UserRole
): boolean {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[minimum];
}

export function isSuperAdmin(user: { role: UserRole } | null | undefined): boolean {
  return !!user && user.role === 'Super Admin';
}

export function checkPermission(
  userRole: string,
  requiredRole: UserRole
): boolean {
  const mapped = userRole as UserRole;
  return ROLE_RANK[mapped] >= ROLE_RANK[requiredRole];
}

// ---- PASSWORD HELPERS ----

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---- SIGN UP ----

export async function signUp(data: {
  username: string;
  full_name: string;
  email: string;
  password: string;
  country: string;
}): Promise<AuthResponse> {
  try {
    // verificar se username OU email já existem
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${data.username},email.eq.${data.email}`)
      .maybeSingle();

    if (existingUser) {
      return {
        success: false,
        error: 'Username or email already exists',
      };
    }

    const password_hash = await hashPassword(data.password);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username: data.username,
        full_name: data.full_name,
        email: data.email,
        password_hash,
        country: data.country,
        role: 'Member',
        xp_total: 0,
        profile_unlocked: false,
        email_verified: false,
        streak_count: 0,
        profile_visibility: {},
        is_banned: false, // por segurança
      })
      .select('id, username, email, role, xp_total, avatar_url, is_banned')
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    const token = await signToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role as UserRole,
      xp_total: newUser.xp_total,
    });

    return {
      success: true,
      user: newUser as User,
      token,
    };
  } catch (error) {
    console.error('signUp error:', error);
    return {
      success: false,
      error: 'Failed to create account',
    };
  }
}

// ---- SIGN IN ----

export async function signIn(username: string, password: string): Promise<AuthResponse> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select(
        'id, username, email, role, xp_total, avatar_url, password_hash, streak_count, is_banned'
      )
      .eq('username', username)
      .maybeSingle();

    if (error || !user) {
      return {
        success: false,
        error: 'Invalid credentials',
      };
    }

    // conta banida
    if (user.is_banned) {
      return {
        success: false,
        error: 'This account has been banned.',
      };
    }

    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid credentials',
      };
    }

    // atualizar last_login (não precisa de bloquear o fluxo se falhar)
    try {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);
    } catch (e) {
      console.warn('Failed to update last_login:', e);
    }

    const { password_hash, ...userWithoutPassword } = user;

    const token = await signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      xp_total: user.xp_total,
    });

    return {
      success: true,
      user: userWithoutPassword as User,
      token,
    };
  } catch (error) {
    console.error('signIn error:', error);
    return {
      success: false,
      error: 'Login failed',
    };
  }
}

// ---- USER LOOKUP BY ID (para middlewares / APIs) ----

export async function getUserByToken(userId: string): Promise<User | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, role, xp_total, avatar_url, is_banned')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return null;
    }

    return user as User;
  } catch (error) {
    console.error('getUserByToken error:', error);
    return null;
  }
}

// ---- VERIFY AUTH A PARTIR DO HEADER "Authorization: Bearer <token>" ----

export async function verifyAuth(authHeader: string): Promise<User | null> {
  try {
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return null;

    const [, payloadPart] = token.split('.');
    if (!payloadPart) return null;

    // atob não existe em Node; usamos Buffer
    const payloadJson = Buffer.from(payloadPart, 'base64').toString('utf8');
    const userData = JSON.parse(payloadJson);

    if (!userData?.userId) return null;

    const user = await getUserByToken(userData.userId);

    if (!user || user.is_banned) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('verifyAuth error:', error);
    return null;
  }
}
