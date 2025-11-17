// lib/jwt.ts
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  xp_total: number;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Isto só corre no servidor, por isso é OK lançar erro aqui
  console.warn(
    '[JWT] JWT_SECRET is not set in environment variables. Tokens will not work correctly.'
  );
}

// Cria um token JWT
export function signToken(
  payload: JWTPayload,
  expiresIn: string | number = '7d'
): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured on the server');
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// Verifica um token JWT e devolve o payload ou null
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  if (!JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Extrai o token do header Authorization
export function extractTokenFromHeader(header: string | null): string | null {
  if (!header) return null;
  if (header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  return header.trim() || null;
}
