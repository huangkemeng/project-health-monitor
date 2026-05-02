import { execute } from '../db';
import { createTablesSQL } from './schema';

/**
 * Automatically run database migrations on startup
 * This function is called when the backend server starts
 */
export async function autoMigrate(): Promise<void> {
  try {
    console.log('[DB] Checking database schema...');

    // Split SQL statements and execute them one by one
    const statements = createTablesSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let executedCount = 0;
    let skippedCount = 0;

    for (const statement of statements) {
      try {
        await execute(statement);
        executedCount++;
      } catch (err) {
        // Ignore errors for "already exists" cases
        if (err instanceof Error && (
          err.message.includes('already exists') ||
          err.message.includes('Duplicate key name')
        )) {
          skippedCount++;
        } else if (err instanceof Error) {
          console.error('[DB] Error executing statement:', err.message);
          console.error('[DB] Statement:', statement.substring(0, 100) + '...');
        } else {
          console.error('[DB] Unknown error executing statement:', err);
        }
      }
    }

    if (executedCount > 0) {
      console.log(`[DB] ✓ Database schema updated: ${executedCount} statements executed`);
    }
    if (skippedCount > 0) {
      console.log(`[DB] ✓ ${skippedCount} objects already exist, skipped`);
    }
    if (executedCount === 0 && skippedCount === 0) {
      console.log('[DB] ✓ Database schema is up to date');
    }
  } catch (error) {
    console.error('[DB] Migration failed:', error);
    // Don't throw - allow server to start even if migration has issues
    // The specific table creation errors are logged above
  }
}
