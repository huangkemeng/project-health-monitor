import pool from '../db';

/**
 * 迁移：支持协作者多分组权限
 * 创建 project_collaborator_groups 关联表
 */
export async function migrateMultiGroupSupport(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. 创建新的关联表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS project_collaborator_groups (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        collaborator_id CHAR(36) NOT NULL,
        group_id CHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (collaborator_id) REFERENCES project_collaborators(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES monitor_groups(id) ON DELETE CASCADE,
        UNIQUE KEY uk_collaborator_group (collaborator_id, group_id),
        INDEX idx_collaborator_id (collaborator_id),
        INDEX idx_group_id (group_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. 迁移现有数据 - 将旧表中的 group_id 迁移到新表
    // 先检查旧表是否有 group_id 列（新表结构可能已无此列）
    const [columns] = await connection.execute(
      `SHOW COLUMNS FROM project_collaborators LIKE 'group_id'`
    );
    const hasOldGroupIdColumn = (columns as any[]).length > 0;

    if (hasOldGroupIdColumn) {
      const [existingCollaborators] = await connection.execute(`
        SELECT id, group_id FROM project_collaborators WHERE group_id IS NOT NULL
      `);

      for (const collab of existingCollaborators as any[]) {
        try {
          await connection.execute(`
            INSERT INTO project_collaborator_groups (collaborator_id, group_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE group_id = group_id
          `, [collab.id, collab.group_id]);
        } catch (err) {
          // 忽略重复键错误
          console.log(`Skipping duplicate entry for collaborator ${collab.id}`);
        }
      }

      // 3. 添加特殊标识 '__UNGROUPED__' 的记录
      const [ungroupedCollaborators] = await connection.execute(`
        SELECT id FROM project_collaborators WHERE group_id = '__UNGROUPED__'
      `);

      for (const collab of ungroupedCollaborators as any[]) {
        try {
          await connection.execute(`
            INSERT INTO project_collaborator_groups (collaborator_id, group_id)
            VALUES (?, '__UNGROUPED__')
            ON DUPLICATE KEY UPDATE group_id = '__UNGROUPED__'
          `, [collab.id]);
        } catch (err) {
          console.log(`Skipping duplicate ungrouped entry for collaborator ${collab.id}`);
        }
      }
    } else {
      console.log('  project_collaborators 已使用新表结构，跳过旧数据迁移');
    }

    await connection.commit();
    console.log('Multi-group support migration completed successfully');
  } catch (error) {
    await connection.rollback();
    console.error('Migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  migrateMultiGroupSupport()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
