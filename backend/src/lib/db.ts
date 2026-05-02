import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

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
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
  });

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
