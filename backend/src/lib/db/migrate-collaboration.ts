import pool from '../db';

const createCollaborationTablesSQL = `
-- Project collaborators table (for multi-user collaboration)
CREATE TABLE IF NOT EXISTS project_collaborators (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_owner_id CHAR(36) NOT NULL,
  collaborator_email VARCHAR(100) NOT NULL,
  collaborator_user_id CHAR(36),
  group_id CHAR(36),
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (collaborator_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (group_id) REFERENCES monitor_groups(id) ON DELETE SET NULL,
  UNIQUE KEY uk_collaborator_project_group (project_owner_id, collaborator_email, group_id),
  INDEX idx_collaborators_owner (project_owner_id),
  INDEX idx_collaborators_email (collaborator_email),
  INDEX idx_collaborators_user (collaborator_user_id),
  INDEX idx_collaborators_status (status),
  INDEX idx_collaborators_group (group_id),
  CONSTRAINT chk_collaborator_role CHECK (role IN ('viewer', 'editor')),
  CONSTRAINT chk_collaborator_status CHECK (status IN ('active', 'rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project rejections table (for "not my project" feature)
CREATE TABLE IF NOT EXISTS project_rejections (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  project_owner_id CHAR(36) NOT NULL,
  rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_rejection_user_project (user_id, project_owner_id),
  INDEX idx_rejections_user (user_id),
  INDEX idx_rejections_project (project_owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function migrateCollaborationTables(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    console.log('Creating collaboration tables...');

    // Split SQL statements and execute them one by one
    const statements = createCollaborationTablesSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await connection.execute(statement + ';');
    }

    await connection.commit();
    console.log('✅ Collaboration tables migrated successfully');
    console.log('  - project_collaborators table created');
    console.log('  - project_rejections table created');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  migrateCollaborationTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
