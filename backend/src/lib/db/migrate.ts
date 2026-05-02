import pool, { execute } from '../db';
import { createTablesSQL } from './schema';

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Split SQL statements and execute them one by one
    const statements = createTablesSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await execute(statement);
        console.log('Executed:', statement.substring(0, 50) + '...');
      } catch (err) {
        // Ignore errors for "already exists" cases
        if (err instanceof Error && !err.message.includes('already exists')) {
          console.error('Error executing statement:', err.message);
        }
      }
    }
    
    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
