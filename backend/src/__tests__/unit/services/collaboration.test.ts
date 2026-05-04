import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as collaborationService from '../../../services/collaboration';
import pool from '../../../lib/db';

// Mock the database pool
jest.mock('../../../lib/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn(),
}));

describe('Collaboration Service', () => {
  let mockConnection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock connection
    mockConnection = {
      execute: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };
    
    (pool.getConnection as jest.Mock).mockResolvedValue(mockConnection);
  });

  describe('inviteCollaborator', () => {
    it('should create collaboration record successfully', async () => {
      // Mock no existing collaboration
      mockConnection.execute
        .mockResolvedValueOnce([[]]) // No existing
        .mockResolvedValueOnce([[{ email: 'owner@test.com' }]]) // Owner check
        .mockResolvedValueOnce([[{ id: 'user-123' }]]) // Existing user
        .mockResolvedValueOnce([{ insertId: 1 }]) // Insert
        .mockResolvedValueOnce([[{
          id: 'collab-1',
          collaborator_email: 'test@example.com',
          collaborator_username: 'testuser',
          group_id: null,
          group_name: null,
          role: 'viewer',
          status: 'active',
          created_at: '2026-01-01',
        }]]); // Select result

      const result = await collaborationService.inviteCollaborator(
        'owner-1',
        'test@example.com',
        'viewer',
        null
      );

      expect(result).toBeDefined();
      expect(result.collaborator_email).toBe('test@example.com');
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should throw error if collaboration already exists', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{
        id: 'existing',
        status: 'active'
      }]]);

      await expect(
        collaborationService.inviteCollaborator('owner-1', 'test@example.com', 'viewer', null)
      ).rejects.toThrow('该用户已被邀请到此分组');
    });

    it('should not allow inviting self', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[]]) // No existing
        .mockResolvedValueOnce([[{ email: 'owner@test.com' }]]); // Owner check

      await expect(
        collaborationService.inviteCollaborator('owner-1', 'owner@test.com', 'viewer', null)
      ).rejects.toThrow('不能邀请自己');
    });

    it('should reactivate rejected collaboration', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'existing-id', status: 'rejected' }]]) // Existing rejected
        .mockResolvedValueOnce([[{ id: 'user-123' }]]) // Existing user
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update
        .mockResolvedValueOnce([[{
          id: 'existing-id',
          collaborator_email: 'test@example.com',
          collaborator_username: 'testuser',
          group_id: null,
          group_name: null,
          role: 'editor',
          status: 'active',
          created_at: '2026-01-01',
        }]]); // Select result

      const result = await collaborationService.inviteCollaborator(
        'owner-1',
        'test@example.com',
        'editor',
        null
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('active');
      expect(result.role).toBe('editor');
    });

    it('should support ungrouped group option', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[]]) // No existing
        .mockResolvedValueOnce([[{ email: 'owner@test.com' }]]) // Owner check
        .mockResolvedValueOnce([[{ id: 'user-123' }]]) // Existing user
        .mockResolvedValueOnce([{ insertId: 1 }]) // Insert
        .mockResolvedValueOnce([[{
          id: 'collab-1',
          collaborator_email: 'test@example.com',
          collaborator_username: 'testuser',
          group_id: 'ungrouped',
          group_name: '未分组',
          role: 'viewer',
          status: 'active',
          created_at: '2026-01-01',
        }]]); // Select result

      const result = await collaborationService.inviteCollaborator(
        'owner-1',
        'test@example.com',
        'viewer',
        'ungrouped'
      );

      expect(result).toBeDefined();
      expect(result.group_id).toBe('ungrouped');
    });
  });

  describe('getCollaborators', () => {
    it('should return list of collaborators', async () => {
      const mockCollaborators = [
        { 
          id: '1', 
          collaborator_email: 'user1@example.com', 
          collaborator_username: 'user1',
          role: 'viewer', 
          group_id: null,
          group_name: null,
          status: 'active',
          created_at: '2026-01-01'
        },
        { 
          id: '2', 
          collaborator_email: 'user2@example.com',
          collaborator_username: 'user2', 
          role: 'editor', 
          group_id: 'group-1',
          group_name: 'Test Group',
          status: 'active',
          created_at: '2026-01-02'
        },
      ];
      
      (pool.execute as jest.Mock).mockResolvedValueOnce([mockCollaborators]);

      const result = await collaborationService.getCollaborators('owner-1');

      expect(result).toHaveLength(2);
      expect(result[0].collaborator_email).toBe('user1@example.com');
      expect(result[1].role).toBe('editor');
    });

    it('should return empty array if no collaborators', async () => {
      (pool.execute as jest.Mock).mockResolvedValueOnce([[]]);

      const result = await collaborationService.getCollaborators('owner-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateCollaborator', () => {
    it('should update collaborator role and group', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'collab-1' }]]) // Check exists
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update

      await collaborationService.updateCollaborator(
        'collab-1',
        'owner-1',
        { role: 'editor', groupId: 'group-1' }
      );

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should throw error if collaborator not found', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      await expect(
        collaborationService.updateCollaborator('collab-1', 'owner-1', { role: 'editor' })
      ).rejects.toThrow('协作者不存在');
    });

    it('should support updating to ungrouped', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'collab-1' }]]) // Check exists
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update

      await collaborationService.updateCollaborator(
        'collab-1',
        'owner-1',
        { groupId: 'ungrouped' }
      );

      expect(mockConnection.commit).toHaveBeenCalled();
    });
  });

  describe('removeCollaborator', () => {
    it('should remove collaborator successfully', async () => {
      (pool.execute as jest.Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);

      await collaborationService.removeCollaborator('collab-1', 'owner-1');

      expect(pool.execute).toHaveBeenCalledWith(
        'DELETE FROM project_collaborators WHERE id = ? AND project_owner_id = ?',
        ['collab-1', 'owner-1']
      );
    });

    it('should throw error if collaborator not found', async () => {
      (pool.execute as jest.Mock).mockResolvedValueOnce([{ affectedRows: 0 }]);

      await expect(
        collaborationService.removeCollaborator('collab-1', 'owner-1')
      ).rejects.toThrow('协作者不存在');
    });
  });

  describe('checkProjectPermission', () => {
    it('should return owner permissions for project owner', async () => {
      const result = await collaborationService.checkProjectPermission(
        'owner-1',
        'owner@example.com',
        'owner-1'
      );

      expect(result.isOwner).toBe(true);
      expect(result.isCollaborator).toBe(false);
      expect(result.accessibleGroupIds).toBeNull();
    });

    it('should return collaborator permissions with full access', async () => {
      (pool.execute as jest.Mock).mockResolvedValueOnce([
        [{ group_id: null, role: 'editor' }],
      ]);

      const result = await collaborationService.checkProjectPermission(
        'user-1',
        'user@example.com',
        'owner-1'
      );

      expect(result.isOwner).toBe(false);
      expect(result.isCollaborator).toBe(true);
      expect(result.role).toBe('editor');
      expect(result.accessibleGroupIds).toBeNull();
    });

    it('should return collaborator permissions with specific groups', async () => {
      (pool.execute as jest.Mock).mockResolvedValueOnce([
        [{ group_id: 'group-1', role: 'viewer' }],
      ]);

      const result = await collaborationService.checkProjectPermission(
        'user-1',
        'user@example.com',
        'owner-1'
      );

      expect(result.isCollaborator).toBe(true);
      expect(result.role).toBe('viewer');
      expect(result.accessibleGroupIds).toEqual(['group-1']);
    });

    it('should return ungrouped permission correctly', async () => {
      (pool.execute as jest.Mock).mockResolvedValueOnce([
        [{ group_id: '__UNGROUPED__', role: 'viewer' }],
      ]);

      const result = await collaborationService.checkProjectPermission(
        'user-1',
        'user@example.com',
        'owner-1'
      );

      expect(result.isCollaborator).toBe(true);
      expect(result.accessibleGroupIds).toEqual(['ungrouped']);
    });

    it('should aggregate multiple group permissions', async () => {
      (pool.execute as jest.Mock).mockResolvedValueOnce([
        [
          { group_id: 'group-1', role: 'viewer' },
          { group_id: 'group-2', role: 'editor' },
        ],
      ]);

      const result = await collaborationService.checkProjectPermission(
        'user-1',
        'user@example.com',
        'owner-1'
      );

      expect(result.role).toBe('editor'); // Higher role
      expect(result.accessibleGroupIds).toEqual(['group-1', 'group-2']);
    });

    it('should return no permissions for unauthorized user', async () => {
      (pool.execute as jest.Mock).mockResolvedValueOnce([[]]);

      const result = await collaborationService.checkProjectPermission(
        'user-1',
        'user@example.com',
        'owner-1'
      );

      expect(result.isOwner).toBe(false);
      expect(result.isCollaborator).toBe(false);
      expect(result.role).toBeNull();
    });
  });

  describe('rejectProject', () => {
    it('should reject project successfully', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Insert rejection
        .mockResolvedValueOnce([{ affectedRows: 2 }]); // Update collaborations

      await collaborationService.rejectProject('user-1', 'owner-1');

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
    });
  });

  describe('linkCollaborationsOnRegistration', () => {
    it('should link collaborations by email', async () => {
      (pool.execute as jest.Mock).mockResolvedValueOnce([{ affectedRows: 2 }]);

      await collaborationService.linkCollaborationsOnRegistration(
        'user-123',
        'test@example.com'
      );

      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE project_collaborators'),
        ['user-123', 'test@example.com']
      );
    });
  });

  describe('getSharedProjects', () => {
    it('should return shared projects for user', async () => {
      (pool.execute as jest.Mock)
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update user_id
        .mockResolvedValueOnce([[
          {
            owner_id: 'owner-1',
            owner_username: 'owner',
            owner_email: 'owner@example.com',
            role: 'viewer',
            group_id: null,
            group_name: null,
            joined_at: '2026-01-01',
          }
        ]]);

      const result = await collaborationService.getSharedProjects('user-1', 'user@example.com');

      expect(result).toHaveLength(1);
      expect(result[0].owner_email).toBe('owner@example.com');
    });

    it('should filter out rejected projects', async () => {
      (pool.execute as jest.Mock)
        .mockResolvedValueOnce([{ affectedRows: 0 }]) // Update user_id
        .mockResolvedValueOnce([[]]); // No projects (filtered by rejection)

      const result = await collaborationService.getSharedProjects('user-1', 'user@example.com');

      expect(result).toHaveLength(0);
    });
  });
});
