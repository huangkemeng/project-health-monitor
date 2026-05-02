import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-do-not-use-in-production';
process.env.CRON_SECRET = 'test-cron-secret-for-testing-only';
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
