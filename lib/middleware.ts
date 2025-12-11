// lib/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt';
import { supabase } from './supabase';
import {
  userHasPermission,
  type PermissionKey,
  type UserRole,
} from './permissions';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Tenta autenticar o request lendo o token:
 * 1) do header Authorization: Bearer <token>
 * 2) dos cookies: auth_token, token, access_token
 */
export async function authenticateRequest(
  request: NextRequest,
): Promise<{
  authenticated: boolean;
  user: JWTPayload | null;
  error?: string;
}> {
  // 1) Tentar via Authorization header
  const authHeader = request.headers.get('authorization');
  let token = extractTokenFromHeader(authHeader);

  // 2) Fallback: tentar via cookies (auth_token / token / access_token)
  if (!token) {
    const possibleCookieNames = [
      'auth_token',
      'token',
      'access_token',
      'sb-access-token',
      'sb_refresh_token',
      'sb-access_token',
      'sbAccessToken',
      'sbRefreshToken',
      'sb_refresh-token',
      'sbAccessToken',
      'sb_refreshToken',
      'sb-refresh_token',
      'sb',
    ];

    for (const name of possibleCookieNames) {
      const cookieValue = request.cookies.get(name)?.value;
      if (cookieValue) {
        token = cookieValue;
        break;
      }
    }
  }

  if (!token) {
    return {
      authenticated: false,
      user: null,
      error: 'No authentication token provided',
    };
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return {
      authenticated: false,
      user: null,
      error: 'Invalid or expired token',
    };
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, username, email, role, xp_total')
    .eq('id', payload.userId)
    .maybeSingle();

  if (!user) {
    return {
      authenticated: false,
      user: null,
      error: 'User not found',
    };
  }

  return {
    authenticated: true,
    user: {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      xp_total: user.xp_total,
    },
  };
}

export async function requireAuth(
  request: NextRequest,
): Promise<{
  success: boolean;
  user?: JWTPayload;
  response?: NextResponse;
}> {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: 401 },
      ),
    };
  }

  return {
    success: true,
    user: auth.user!,
  };
}

export async function requireAdmin(
  request: NextRequest,
): Promise<{
  success: boolean;
  user?: JWTPayload;
  response?: NextResponse;
}> {
  const authResult = await requireAuth(request);

  if (!authResult.success) {
    return authResult;
  }

  const user = authResult.user!;

  // Atenção: aqui usamos exatamente os valores da coluna "role" em users
  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 },
      ),
    };
  }

  return {
    success: true,
    user,
  };
}

/**
 * Helper opcional para extrair só o userId de um request,
 * usado em algumas rotas.
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  let token = extractTokenFromHeader(authHeader);

  if (!token) {
    const possibleCookieNames = ['auth_token', 'token', 'access_token'];
    for (const name of possibleCookieNames) {
      const cookieValue = request.cookies.get(name)?.value;
      if (cookieValue) {
        token = cookieValue;
        break;
      }
    }
  }

  if (!token) return null;

  try {
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    return payload.userId || null;
  } catch {
    return null;
  }
}

/**
 * Novo helper: exige uma permissão global específica.
 * Exemplo de uso numa rota:
 *
 *  const permResult = await requirePermission(request, 'canManageUsers');
 *  if (!permResult.success) return permResult.response!;
 *  const user = permResult.user!;
 */
export async function requirePermission(
  request: NextRequest,
  permission: PermissionKey,
): Promise<{
  success: boolean;
  user?: JWTPayload;
  response?: NextResponse;
}> {
  const authResult = await requireAuth(request);
  if (!authResult.success) return authResult;

  const user = authResult.user!;
  const role =
    user.role === 'Super Admin' || user.role === 'Admin'
      ? (user.role as UserRole)
      : ('Member' as UserRole);

  const allowed = await userHasPermission(user.userId, role, permission);

  if (!allowed) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 },
      ),
    };
  }

  return {
    success: true,
    user,
  };
}
