import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, execute, query } from '../lib/db';
import { hashPassword, comparePassword } from '../lib/password';
import { generateToken } from '../lib/auth';
import { authenticate } from '../middleware/auth';
import { success, error, created, validationError, unauthorized, forbidden } from '../utils/api-response';
import { isValidUsername, isValidEmail, isValidPassword, sanitizeString } from '../utils/validators';
import type { User, UserResponse, LoginAttempt } from '../types';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

// Helper function to get client IP address
function getClientIp(req: Request): string | null {
  // Get IP from X-Forwarded-For header (when behind reverse proxy)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  // Fall back to req.ip or socket remote address
  return req.ip || req.socket.remoteAddress || null;
}

const router = Router();

// Register
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 20 }),
    body('email').isEmail(),
    body('password').isLength({ min: 8, max: 32 }),
    body('confirm_password').exists()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { username, email, password, confirm_password } = req.body;

      // Validate username format
      if (!isValidUsername(username)) {
        validationError(res, [{ field: 'username', message: '用户名只能包含字母、数字和下划线' }]);
        return;
      }

      // Validate email format
      if (!isValidEmail(email)) {
        validationError(res, [{ field: 'email', message: '邮箱格式不正确' }]);
        return;
      }

      // Validate password format
      if (!isValidPassword(password)) {
        validationError(res, [{ field: 'password', message: '密码必须包含字母和数字，长度8-32位' }]);
        return;
      }

      // Check if passwords match
      if (password !== confirm_password) {
        validationError(res, [{ field: 'confirm_password', message: '两次输入的密码不一致' }]);
        return;
      }

      const sanitizedUsername = sanitizeString(username);
      const sanitizedEmail = sanitizeString(email).toLowerCase();

      // Check if username exists
      const existingUser = await queryOne<User>(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [sanitizedUsername, sanitizedEmail]
      );

      if (existingUser) {
        if (existingUser.username === sanitizedUsername) {
          error(res, '用户名已存在', 409);
          return;
        }
        if (existingUser.email === sanitizedEmail) {
          error(res, '邮箱已被注册', 409);
          return;
        }
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const userId = uuidv4();
      await execute(
        `INSERT INTO users (id, username, email, password_hash, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
        [userId, sanitizedUsername, sanitizedEmail, passwordHash]
      );

      // Get created user
      const newUser = await queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);
      if (!newUser) {
        error(res, '用户创建失败', 500);
        return;
      }

      console.log('New user created:', { id: newUser.id, username: newUser.username, email: newUser.email });

      // Generate token
      const token = await generateToken({
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email
      });
      
      console.log('Token generated successfully');

      // Return user without password
      const userResponse: UserResponse = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        created_at: newUser.created_at
      };

      created(res, { user: userResponse, token });
    } catch (err) {
      console.error('Registration error:', err);
      console.error('Error details:', err instanceof Error ? err.message : String(err));
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack');
      error(res, '注册失败，请稍后重试', 500);
    }
  }
);

// Check if account is locked due to failed login attempts
async function isAccountLocked(username: string): Promise<boolean> {
  // Check attempts by username or email (to prevent bypass via email login)
  const attempts = await query<LoginAttempt>(
    `SELECT * FROM login_attempts 
     WHERE (username = ? OR username = (SELECT email FROM users WHERE username = ?))
     AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
     ORDER BY attempted_at DESC`,
    [username, username, LOCK_DURATION_MINUTES]
  );
  return attempts.length >= MAX_LOGIN_ATTEMPTS;
}

// Record failed login attempt
async function recordFailedLogin(username: string, ipAddress: string | null): Promise<void> {
  await execute(
    `INSERT INTO login_attempts (id, username, ip_address, attempted_at) 
     VALUES (UUID(), ?, ?, NOW())`,
    [username, ipAddress]
  );
}

// Clear login attempts for user
async function clearLoginAttempts(username: string): Promise<void> {
  await execute(
    'DELETE FROM login_attempts WHERE username = ?',
    [username]
  );
}

// Login
router.post(
  '/login',
  [
    body('username').trim().notEmpty(),
    body('password').notEmpty()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { username, password, remember_me } = req.body;
      const sanitizedUsername = sanitizeString(username);
      const ipAddress = getClientIp(req);

      // Find user by username or email first (before lock check)
      const user = await queryOne<User>(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [sanitizedUsername, sanitizedUsername.toLowerCase()]
      );

      // Use actual username for lock check (prevents bypass via email)
      const lockCheckUsername = user ? user.username : sanitizedUsername;

      // Check if account is locked
      const isLocked = await isAccountLocked(lockCheckUsername);
      if (isLocked) {
        forbidden(res, `账号已锁定，请${LOCK_DURATION_MINUTES}分钟后重试`);
        return;
      }

      if (!user) {
        await recordFailedLogin(sanitizedUsername, ipAddress);
        unauthorized(res, '用户名或密码错误');
        return;
      }

      // Check if user is active
      if (!user.is_active) {
        error(res, '账号已被禁用', 403);
        return;
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        await recordFailedLogin(user.username, ipAddress);
        unauthorized(res, '用户名或密码错误');
        return;
      }

      // Clear login attempts on successful login
      await clearLoginAttempts(user.username);

      // Update last login time
      await execute(
        'UPDATE users SET updated_at = NOW() WHERE id = ?',
        [user.id]
      );

      // Generate token with remember me option
      const token = await generateToken({
        userId: user.id,
        username: user.username,
        email: user.email
      }, remember_me === true);

      // Return user without password
      const userResponse: UserResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      };

      success(res, { user: userResponse, token });
    } catch (err) {
      console.error('Login error:', err);
      error(res, '登录失败，请稍后重试', 500);
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      unauthorized(res, '未登录');
      return;
    }

    const user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      error(res, '用户不存在', 404);
      return;
    }

    const userResponse: UserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at
    };

    success(res, { user: userResponse });
  } catch (err) {
    console.error('Get user error:', err);
    error(res, '获取用户信息失败', 500);
  }
});

// Logout
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      unauthorized(res, '未登录');
      return;
    }

    // In a stateless JWT system, logout is mainly client-side
    // Here we can optionally add the token to a blacklist or just return success
    success(res, { message: '登出成功' });
  } catch (err) {
    console.error('Logout error:', err);
    error(res, '登出失败', 500);
  }
});

// Change password - POST /change-password (existing)
router.post(
  '/change-password',
  authenticate,
  [
    body('old_password').notEmpty(),
    body('new_password').isLength({ min: 8, max: 32 })
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { old_password, new_password } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        unauthorized(res, '未登录');
        return;
      }

      // Validate new password format
      if (!isValidPassword(new_password)) {
        validationError(res, [{ field: 'new_password', message: '新密码必须包含字母和数字，长度8-32位' }]);
        return;
      }

      // Get user
      const user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) {
        error(res, '用户不存在', 404);
        return;
      }

      // Verify old password
      const isValidOldPassword = await comparePassword(old_password, user.password_hash);
      if (!isValidOldPassword) {
        validationError(res, [{ field: 'old_password', message: '原密码错误' }]);
        return;
      }

      // Hash new password
      const newPasswordHash = await hashPassword(new_password);

      // Update password
      await execute(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newPasswordHash, userId]
      );

      success(res, { message: '密码修改成功' });
    } catch (err) {
      console.error('Change password error:', err);
      error(res, '密码修改失败', 500);
    }
  }
);

// Change password - PUT /password (API spec compliant)
router.put(
  '/password',
  authenticate,
  [
    body('old_password').notEmpty(),
    body('new_password').isLength({ min: 8, max: 32 })
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { old_password, new_password } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        unauthorized(res, '未登录');
        return;
      }

      // Validate new password format
      if (!isValidPassword(new_password)) {
        validationError(res, [{ field: 'new_password', message: '新密码必须包含字母和数字，长度8-32位' }]);
        return;
      }

      // Get user
      const user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) {
        error(res, '用户不存在', 404);
        return;
      }

      // Verify old password
      const isValidOldPassword = await comparePassword(old_password, user.password_hash);
      if (!isValidOldPassword) {
        validationError(res, [{ field: 'old_password', message: '原密码错误' }]);
        return;
      }

      // Hash new password
      const newPasswordHash = await hashPassword(new_password);

      // Update password
      await execute(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newPasswordHash, userId]
      );

      success(res, { message: '密码修改成功' });
    } catch (err) {
      console.error('Change password error:', err);
      error(res, '密码修改失败', 500);
    }
  }
);

export default router;
