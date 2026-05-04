import { SignJWT, jwtVerify } from 'jose';
import type { JwtPayload } from '../types';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'; // Default: 24 hours for non-remember me
const JWT_EXPIRES_IN_REMEMBER = process.env.JWT_EXPIRES_IN_REMEMBER || '30d'; // 30 days for remember me

// Get JWT_SECRET at runtime to handle Vercel environment
function getJwtSecret(): Uint8Array {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('ERROR: JWT_SECRET environment variable is not set!');
    throw new Error('JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(jwtSecret);
}

/**
 * Generate JWT token for user
 * @param payload - User data
 * @param rememberMe - If true, token expires in 30 days, otherwise 24 hours
 */
export async function generateToken(
  payload: { userId: string; username: string; email: string },
  rememberMe: boolean = false
): Promise<string> {
  const JWT_SECRET = getJwtSecret();
  const expirationTime = rememberMe ? JWT_EXPIRES_IN_REMEMBER : JWT_EXPIRES_IN;
  const token = await new SignJWT({ userId: payload.userId, username: payload.username, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const JWT_SECRET = getJwtSecret();
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
