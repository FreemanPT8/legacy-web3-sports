import { supabase } from './supabase';
import bcrypt from 'bcryptjs';
import { signToken } from './jwt';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Member';
  xp_total: number;
  avatar_url?: string;
  streak_count?: number;
  created_at?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  token?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signUp(data: {
  username: string;
  full_name: string;
  email: string;
  password: string;
  country: string;
}): Promise<AuthResponse> {
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${data.username},email.eq.${data.email}`)
      .maybeSingle();

    if (existingUser) {
      return {
        success: false,
        error: 'Username or email already exists'
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
        profile_visibility: {}
      })
      .select('id, username, email, role, xp_total, avatar_url')
      .single();

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    const token = await signToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role as 'Super Admin' | 'Admin' | 'Member',
      xp_total: newUser.xp_total,
    });

    return {
      success: true,
      user: newUser as User,
      token,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to create account'
    };
  }
}

export async function signIn(username: string, password: string): Promise<AuthResponse> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, role, xp_total, avatar_url, password_hash, streak_count')
      .eq('username', username)
      .maybeSingle();

    if (error || !user) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    const { password_hash, ...userWithoutPassword } = user;

    const token = await signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role as 'Super Admin' | 'Admin' | 'Member',
      xp_total: user.xp_total,
    });

    return {
      success: true,
      user: userWithoutPassword as User,
      token,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Login failed'
    };
  }
}

export async function getUserByToken(userId: string): Promise<User | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, role, xp_total, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return null;
    }

    return user as User;
  } catch (error) {
    return null;
  }
}

export function checkPermission(userRole: string, requiredRole: 'Super Admin' | 'Admin' | 'Member'): boolean {
  const roleHierarchy = {
    'Super Admin': 3,
    'Admin': 2,
    'Member': 1
  };

  return roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole];
}

export async function verifyAuth(authHeader: string): Promise<User | null> {
  try {
    const token = authHeader.replace('Bearer ', '');

    const userData = JSON.parse(atob(token.split('.')[1]));

    return await getUserByToken(userData.userId);
  } catch (error) {
    return null;
  }
}
