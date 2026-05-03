import pool from '../db';
import { createTablesSQL } from './schema';
import { addGroupColumn } from './add-group-column';
import { addResolvedReasonColumn } from './add-resolved-reason-column';

/**
 * Automatically run database migrations on startup
 * This function is called when the backend server starts
 */
export async function autoMigrate(): Promise<void> {
  let connection;
  try {
    console.log('[DB] Checking database schema...');

    // Get a connection from the pool
    connection = await pool.getConnection();

    // First, ensure database exists
    console.log('[DB] Ensuring database exists...');
    await connection.execute(`
      CREATE DATABASE IF NOT EXISTS health_monitor
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
    `);
    console.log('[DB] Database health_monitor exists');

    // Use the database
    await connection.changeUser({ database: 'health_monitor' });
    console.log('[DB] Using database health_monitor');

    // Split SQL statements and execute them one by one
    const statements = createTablesSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.includes('CREATE DATABASE') && !s.includes('USE health_monitor'));

    let executedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        await connection.execute(statement);
        executedCount++;
        console.log('[DB] Executed:', statement.substring(0, 60).replace(/\s+/g, ' ') + '...');
      } catch (err) {
        // Ignore errors for "already exists" cases
        if (err instanceof Error && (
          err.message.includes('already exists') ||
          err.message.includes('Duplicate key name')
        )) {
          skippedCount++;
        } else if (err instanceof Error) {
          errorCount++;
          console.error('[DB] Error executing statement:', err.message);
          console.error('[DB] Statement:', statement.substring(0, 100) + '...');
        } else {
          errorCount++;
          console.error('[DB] Unknown error executing statement:', err);
        }
      }
    }

    console.log('');
    console.log('[DB] Migration Summary:');
    if (executedCount > 0) {
      console.log(`  ✓ ${executedCount} statements executed`);
    }
    if (skippedCount > 0) {
      console.log(`  ✓ ${skippedCount} objects already exist, skipped`);
    }
    if (errorCount > 0) {
      console.log(`  ✗ ${errorCount} errors encountered`);
    }
    if (executedCount === 0 && skippedCount === 0 && errorCount === 0) {
      console.log('  ✓ Database schema is up to date');
    }
    console.log('');

    // Run additional migrations for schema updates
    await addGroupColumn();
    await addResolvedReasonColumn();

  } catch (error) {
    console.error('[DB] Migration failed:', error);
    throw error; // Re-throw to prevent server from starting with broken DB
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
