import { SignJWT, jwtVerify } from 'jose';
import type { JwtPayload } from '../types';

// Validate JWT_SECRET on startup
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('ERROR: JWT_SECRET environment variable is not set!');
  console.error('Please set a secure random string (at least 32 characters) for JWT_SECRET');
  process.exit(1);
}

const JWT_SECRET = new TextEncoder().encode(jwtSecret);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user
 */
export async function generateToken(payload: { userId: string; username: string; email: string }): Promise<string> {
  const token = await new SignJWT({ userId: payload.userId, username: payload.username, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
