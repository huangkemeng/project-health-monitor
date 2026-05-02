/**
 * Validate username format
 * 3-20 characters, starts with letter, only letters, numbers, and underscores
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
  return usernameRegex.test(username);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password format
 * 8-32 characters, must contain at least one letter and one number
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8 || password.length > 32) {
    return false;
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate HTTP method
 */
export function isValidHttpMethod(method: string): boolean {
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE'];
  return validMethods.includes(method.toUpperCase());
}

/**
 * Validate webhook URL format (WeChat Work webhook)
 */
export function isValidWebhookUrl(url: string): boolean {
  if (!isValidUrl(url)) {
    return false;
  }
  return url.startsWith('https://qyapi.weixin.qq.com/cgi-bin/webhook/send');
}

/**
 * Validate phone numbers (for @users)
 */
export function isValidPhoneNumbers(phones: string): boolean {
  if (!phones || phones.trim() === '') {
    return true; // Empty is valid (optional field)
  }
  const phoneRegex = /^1[3-9]\d{9}$/;
  const phoneList = phones.split(',').map(p => p.trim());
  return phoneList.every(phone => phoneRegex.test(phone));
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Sanitize search keyword for SQL LIKE
 * Removes SQL wildcard characters to prevent injection
 */
export function sanitizeSearchKeyword(keyword: string | null | undefined): string {
  if (!keyword) return '';
  // Remove SQL wildcard characters and other potentially dangerous characters
  return keyword.trim().replace(/[%_\\'";\\]/g, '');
}

/**
 * Validate URL is safe (only allows http/https protocols)
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Parse JSON safely
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}
