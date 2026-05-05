import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('ERROR: Missing required database environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('Please set all required database configuration in environment variables');
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10'),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+00:00', // Store all times in UTC
  // Enable SSL for cloud MySQL services
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined,
  // Connection timeout settings
  connectTimeout: 30000, // 30 seconds
});

// Track connection health
let isHealthy = false;
let lastError: Error | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Test connection and setup health monitoring
async function testConnection(): Promise<void> {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    isHealthy = true;
    lastError = null;
    reconnectAttempts = 0;
    connection.release();
  } catch (err) {
    isHealthy = false;
    lastError = err instanceof Error ? err : new Error(String(err));
    console.error('Database connection failed:', lastError.message);
    
    // Attempt reconnection if under max attempts
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Attempting to reconnect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(testConnection, 5000 * reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached. Database is unavailable.');
    }
  }
}

// Initial connection test
testConnection();

// Pool error handling - mysql2/promise pool doesn't have 'error' event in the same way
// We handle errors per-connection instead
process.on('unhandledRejection', (reason) => {
  if (reason instanceof Error && reason.message.includes('database')) {
    console.error('Unhandled database error:', reason);
    isHealthy = false;
    lastError = reason;
  }
});

// Health check function
export function getDbHealth(): { healthy: boolean; lastError: string | null; reconnectAttempts: number } {
  return {
    healthy: isHealthy,
    lastError: lastError?.message || null,
    reconnectAttempts
  };
}

export default pool;

// Helper function for queries
export async function query<T = unknown>(sql: string, values?: unknown[]): Promise<T[]> {
  const [rows] = await pool.query(sql, values);
  return rows as T[];
}

// Helper function for single row queries
export async function queryOne<T = unknown>(sql: string, values?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, values);
  return rows.length > 0 ? rows[0] : null;
}

// Helper function for insert/update/delete
export async function execute(sql: string, values?: unknown[]): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, values as mysql.RowDataPacket[]);
  return result as mysql.ResultSetHeader;
}
