import pool from '../db';

/**
 * Add resolved_reason column to alerts table
 * This is a one-time migration for existing databases
 */
export async function addResolvedReasonColumn(): Promise<void> {
  let connection;
  try {
    console.log('[DB] Adding resolved_reason column to alerts table...');

    connection = await pool.getConnection();
    await connection.changeUser({ database: 'health_monitor' });

    // Check if column exists
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = 'health_monitor' 
       AND TABLE_NAME = 'alerts' 
       AND COLUMN_NAME = 'resolved_reason'`
    );

    if ((columns as any[]).length === 0) {
      // Add resolved_reason column
      await connection.execute(
        `ALTER TABLE alerts 
         ADD COLUMN resolved_reason ENUM('recovered', 'paused', 'deleted') NULL AFTER status`
      );
      console.log('[DB] ✓ resolved_reason column added successfully');
    } else {
      console.log('[DB] ✓ resolved_reason column already exists');
    }

  } catch (error) {
    console.error('[DB] Failed to add resolved_reason column:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
