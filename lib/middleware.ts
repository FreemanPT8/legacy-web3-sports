import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt';
import { supabase } from './supabase';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export async function authenticateRequest(request: NextRequest): Promise<{
  authenticated: boolean;
  user: JWTPayload | null;
  error?: string;
}> {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

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

export async function requireAuth(request: NextRequest): Promise<{
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
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    user: auth.user!,
  };
}

export async function requireAdmin(request: NextRequest): Promise<{
  success: boolean;
  user?: JWTPayload;
  response?: NextResponse;
}> {
  const authResult = await requireAuth(request);

  if (!authResult.success) {
    return authResult;
  }

  const user = authResult.user!;

  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    user,
  };
}

export function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) return null;

  try {
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));
    return payload.userId || null;
  } catch {
    return null;
  }
}
