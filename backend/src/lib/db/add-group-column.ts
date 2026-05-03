import pool from '../db';

/**
 * Add group_id column to monitors table
 * This is a one-time migration for existing databases
 */
export async function addGroupColumn(): Promise<void> {
  let connection;
  try {
    console.log('[DB] Adding group_id column to monitors table...');

    connection = await pool.getConnection();
    await connection.changeUser({ database: 'health_monitor' });

    // Check if column exists
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = 'health_monitor' 
       AND TABLE_NAME = 'monitors' 
       AND COLUMN_NAME = 'group_id'`
    );

    if ((columns as any[]).length === 0) {
      // Add group_id column
      await connection.execute(
        `ALTER TABLE monitors 
         ADD COLUMN group_id CHAR(36) NULL,
         ADD CONSTRAINT fk_monitors_group 
         FOREIGN KEY (group_id) REFERENCES monitor_groups(id) ON DELETE SET NULL,
         ADD INDEX idx_monitors_group (group_id)`
      );
      console.log('[DB] ✓ group_id column added successfully');
    } else {
      console.log('[DB] ✓ group_id column already exists');
    }

  } catch (error) {
    console.error('[DB] Failed to add group_id column:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
