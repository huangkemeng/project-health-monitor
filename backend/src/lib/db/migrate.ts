import { execute } from '../db';
import { createTablesSQL } from './schema';
import { migrateCollaborationTables } from './migrate-collaboration';
import { migrateMultiGroupSupport } from './migrate-multi-group';

async function migrate() {
  try {
    console.log('========================================');
    console.log('  数据库迁移开始');
    console.log('========================================\n');

    // 1. 创建基础表
    console.log('[1/3] 创建基础表...');
    const statements = createTablesSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await execute(statement);
      } catch (err) {
        if (err instanceof Error && !err.message.includes('already exists')) {
          console.error('  ❌ 执行失败:', err.message);
          throw err;
        }
      }
    }
    console.log('  ✅ 基础表创建完成\n');

    // 2. 创建协作相关表
    console.log('[2/3] 创建协作相关表...');
    await migrateCollaborationTables();
    console.log('  ✅ 协作表创建完成\n');

    // 3. 多分组权限迁移
    console.log('[3/3] 执行多分组权限迁移...');
    await migrateMultiGroupSupport();
    console.log('  ✅ 多分组权限迁移完成\n');

    console.log('========================================');
    console.log('  数据库迁移全部完成！');
    console.log('========================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 数据库迁移失败:', error);
    process.exit(1);
  }
}

migrate();
