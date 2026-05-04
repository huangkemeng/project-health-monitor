import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { checkProjectPermission, requireRole, projectContext } from '../../../middleware/permission';
import * as collaborationService from '../../../services/collaboration';

// Mock the collaboration service
jest.mock('../../../services/collaboration');

describe('Permission Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      user: { userId: 'user-1', email: 'user@example.com' },
      params: {},
      query: {},
      projectContext: null,
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    mockNext = jest.fn();
  });

  describe('projectContext', () => {
    it('should set project context from params', () => {
      mockReq.params = { ownerId: 'owner-1' };
      
      const middleware = projectContext('ownerId');
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.projectContext).toBeDefined();
      expect(mockReq.projectContext.ownerId).toBe('owner-1');
      expect(mockReq.projectContext.isOwner).toBe(false);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set project context from query', () => {
      mockReq.query = { ownerId: 'owner-1' };
      
      const middleware = projectContext();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.projectContext.ownerId).toBe('owner-1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set project context from user when no param', () => {
      const middleware = projectContext();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.projectContext.ownerId).toBe('user-1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 if no ownerId can be determined', () => {
      mockReq.user = null;
      mockReq.params = {};
      mockReq.query = {};
      
      const middleware = projectContext();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkProjectPermission', () => {
    it('should set isOwner=true when user is owner', async () => {
      mockReq.projectContext = { ownerId: 'user-1' };
      mockReq.user.userId = 'user-1';

      await checkProjectPermission(mockReq, mockRes, mockNext);

      expect(mockReq.projectContext.isOwner).toBe(true);
      expect(mockReq.projectContext.accessibleGroupIds).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set collaborator permissions correctly', async () => {
      mockReq.projectContext = { ownerId: 'owner-1' };
      
      (collaborationService.checkProjectPermission as jest.Mock).mockResolvedValue({
        isOwner: false,
        isCollaborator: true,
        role: 'viewer',
        accessibleGroupIds: ['group-1'],
      });

      await checkProjectPermission(mockReq, mockRes, mockNext);

      expect(mockReq.projectContext.isCollaborator).toBe(true);
      expect(mockReq.projectContext.role).toBe('viewer');
      expect(mockReq.projectContext.accessibleGroupIds).toEqual(['group-1']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 if no user', async () => {
      mockReq.user = null;

      await checkProjectPermission(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if no project context', async () => {
      mockReq.projectContext = null;

      await checkProjectPermission(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 for unauthorized access', async () => {
      mockReq.projectContext = { ownerId: 'owner-1' };
      
      (collaborationService.checkProjectPermission as jest.Mock).mockResolvedValue({
        isOwner: false,
        isCollaborator: false,
        role: null,
        accessibleGroupIds: null,
      });

      await checkProjectPermission(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle full access permission', async () => {
      mockReq.projectContext = { ownerId: 'owner-1' };
      
      (collaborationService.checkProjectPermission as jest.Mock).mockResolvedValue({
        isOwner: false,
        isCollaborator: true,
        role: 'editor',
        accessibleGroupIds: null, // Full access
      });

      await checkProjectPermission(mockReq, mockRes, mockNext);

      expect(mockReq.projectContext.accessibleGroupIds).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle ungrouped permission', async () => {
      mockReq.projectContext = { ownerId: 'owner-1' };
      
      (collaborationService.checkProjectPermission as jest.Mock).mockResolvedValue({
        isOwner: false,
        isCollaborator: true,
        role: 'viewer',
        accessibleGroupIds: ['ungrouped'],
      });

      await checkProjectPermission(mockReq, mockRes, mockNext);

      expect(mockReq.projectContext.accessibleGroupIds).toEqual(['ungrouped']);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow owner for owner-only actions', () => {
      mockReq.projectContext = { isOwner: true, role: null };
      const middleware = requireRole('owner');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny non-owner for owner-only actions', () => {
      mockReq.projectContext = { isOwner: false, role: 'editor' };
      const middleware = requireRole('owner');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow editor for editor actions', () => {
      mockReq.projectContext = { isOwner: false, role: 'editor' };
      const middleware = requireRole('editor');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny viewer for editor actions', () => {
      mockReq.projectContext = { isOwner: false, role: 'viewer' };
      const middleware = requireRole('editor');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow viewer for viewer actions', () => {
      mockReq.projectContext = { isOwner: false, role: 'viewer' };
      const middleware = requireRole('viewer');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow owner for any role requirement', () => {
      mockReq.projectContext = { isOwner: true, role: null };
      
      const viewerMiddleware = requireRole('viewer');
      viewerMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      mockNext.mockClear();
      
      const editorMiddleware = requireRole('editor');
      editorMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 if no project context', () => {
      mockReq.projectContext = null;
      const middleware = requireRole('viewer');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
