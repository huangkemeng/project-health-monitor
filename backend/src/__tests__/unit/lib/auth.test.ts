import { generateToken, verifyToken } from '../../../lib/auth';
import { JwtPayload } from '../../../types';

describe('Auth Library', () => {
  const mockPayload = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    email: 'test@example.com',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const token = await generateToken(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate unique tokens for same payload', async () => {
      const token1 = await generateToken(mockPayload);
      const token2 = await generateToken(mockPayload);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const token = await generateToken(mockPayload);
      const decoded = await verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.username).toBe(mockPayload.username);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for invalid token', async () => {
      await expect(verifyToken('invalid-token')).rejects.toThrow();
    });

    it('should throw error for expired token', async () => {
      // Create a token that expires immediately
      const expiredToken = await generateToken({ ...mockPayload, exp: Math.floor(Date.now() / 1000) - 1 });
      await expect(verifyToken(expiredToken)).rejects.toThrow();
    });
  });
});
