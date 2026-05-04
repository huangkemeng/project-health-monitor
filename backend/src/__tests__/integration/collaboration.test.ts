import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../../lib/auth';
import pool from '../../lib/db';
import collaboratorsRouter from '../../routes/collaborators';
import sharedProjectsRouter from '../../routes/shared-projects';
import projectsRouter from '../../routes/projects';
import { authenticate } from '../../middleware/auth';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/collaborators', authenticate, collaboratorsRouter);
app.use('/api/shared-projects', authenticate, sharedProjectsRouter);
app.use('/api/projects', authenticate, projectsRouter);

describe('Collaboration API Integration Tests', () => {
  let ownerToken: string;
  let collaboratorToken: string;
  let viewerToken: string;
  let ownerId: string;
  let collaboratorId: string;
  let viewerId: string;
  let groupId: string;
  let ownerEmail: string;
  let collaboratorEmail: string;
  let viewerEmail: string;

  beforeAll(async () => {
    // Create test users with unique emails and UUIDs
    const timestamp = Date.now();
    ownerEmail = `owner_${timestamp}@test.com`;
    collaboratorEmail = `collab_${timestamp}@test.com`;
    viewerEmail = `viewer_${timestamp}@test.com`;
    
    ownerId = uuidv4();
    collaboratorId = uuidv4();
    viewerId = uuidv4();
    groupId = uuidv4();
    
    // Create owner
    await pool.execute(
      `INSERT INTO users (id, username, email, password_hash, created_at, updated_at) 
       VALUES (?, ?, ?, 'hash', NOW(), NOW())`,
      [ownerId, `owner_${timestamp}`, ownerEmail]
    );
    
    // Create collaborator
    await pool.execute(
      `INSERT INTO users (id, username, email, password_hash, created_at, updated_at) 
       VALUES (?, ?, ?, 'hash', NOW(), NOW())`,
      [collaboratorId, `collab_${timestamp}`, collaboratorEmail]
    );
    
    // Create viewer
    await pool.execute(
      `INSERT INTO users (id, username, email, password_hash, created_at, updated_at) 
       VALUES (?, ?, ?, 'hash', NOW(), NOW())`,
      [viewerId, `viewer_${timestamp}`, viewerEmail]
    );
    
    // Create test group
    await pool.execute(
      `INSERT INTO monitor_groups (id, owner_id, name, created_at, updated_at) 
       VALUES (?, ?, 'Test Group', NOW(), NOW())`,
      [groupId, ownerId]
    );
    
    // Generate tokens
    ownerToken = await generateToken({ 
      userId: ownerId, 
      username: `owner_${timestamp}`, 
      email: ownerEmail 
    });
    collaboratorToken = await generateToken({ 
      userId: collaboratorId, 
      username: `collab_${timestamp}`, 
      email: collaboratorEmail 
    });
    viewerToken = await generateToken({ 
      userId: viewerId, 
      username: `viewer_${timestamp}`, 
      email: viewerEmail 
    });
  });

  afterAll(async () => {
    // Cleanup - delete in correct order
    await pool.execute('DELETE FROM project_collaborators WHERE project_owner_id = ?', [ownerId]);
    await pool.execute('DELETE FROM project_rejections WHERE project_owner_id = ? OR user_id IN (?, ?)', 
      [ownerId, collaboratorId, viewerId]);
    await pool.execute('DELETE FROM monitor_groups WHERE id = ?', [groupId]);
    await pool.execute('DELETE FROM users WHERE id IN (?, ?, ?)', [ownerId, collaboratorId, viewerId]);
  });

  beforeEach(async () => {
    // Clean up collaborations before each test
    await pool.execute('DELETE FROM project_collaborators WHERE project_owner_id = ?', [ownerId]);
  });

  describe('POST /api/collaborators', () => {
    it('should invite a collaborator successfully', async () => {
      const response = await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: null,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.collaborator_email).toBe(collaboratorEmail);
      expect(response.body.data.role).toBe('viewer');
    });

    it('should invite with specific group', async () => {
      const response = await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'editor',
          groupId: groupId,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.group_id).toBe(groupId);
    });

    it('should invite with ungrouped option', async () => {
      const response = await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: 'ungrouped',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.group_id).toBe('ungrouped');
    });

    it('should prevent duplicate invitation', async () => {
      // First invitation
      await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: null,
        });

      // Duplicate invitation
      const response = await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: null,
        });

      expect(response.status).toBe(409);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/collaborators')
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: null,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/collaborators', () => {
    it('should return list of collaborators', async () => {
      // Create a collaborator first
      await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: null,
        });

      const response = await request(app)
        .get('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    it('should return empty list if no collaborators', async () => {
      const response = await request(app)
        .get('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toEqual([]);
    });
  });

  describe('PUT /api/collaborators/:id', () => {
    it('should update collaborator role', async () => {
      // Create a collaborator first
      const createResponse = await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: null,
        });

      const collaboratorRecordId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/collaborators/${collaboratorRecordId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          role: 'editor',
        });

      expect(response.status).toBe(200);
    });

    it('should update collaborator group', async () => {
      // Create a collaborator first
      const createResponse = await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: null,
        });

      const collaboratorRecordId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/collaborators/${collaboratorRecordId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          groupId: groupId,
        });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent collaborator', async () => {
      const response = await request(app)
        .put('/api/collaborators/non-existent-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          role: 'editor',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/collaborators/:id', () => {
    it('should remove collaborator', async () => {
      // Create a collaborator first
      const createResponse = await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: null,
        });

      const collaboratorRecordId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/collaborators/${collaboratorRecordId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent collaborator', async () => {
      const response = await request(app)
        .delete('/api/collaborators/non-existent-id')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/shared-projects/:ownerId/reject', () => {
    it('should reject shared project', async () => {
      // Create a collaboration first
      await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: null,
        });

      const response = await request(app)
        .post(`/api/shared-projects/${ownerId}/reject`)
        .set('Authorization', `Bearer ${collaboratorToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid owner ID', async () => {
      const response = await request(app)
        .post('/api/shared-projects/invalid-id/reject')
        .set('Authorization', `Bearer ${collaboratorToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/shared-projects', () => {
    it('should return shared projects for user', async () => {
      // Create a collaboration first
      await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: null,
        });

      const response = await request(app)
        .get('/api/shared-projects')
        .set('Authorization', `Bearer ${collaboratorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should not return rejected projects', async () => {
      // Create and then reject
      await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: null,
        });

      await request(app)
        .post(`/api/shared-projects/${ownerId}/reject`)
        .set('Authorization', `Bearer ${collaboratorToken}`);

      const response = await request(app)
        .get('/api/shared-projects')
        .set('Authorization', `Bearer ${collaboratorToken}`);

      expect(response.status).toBe(200);
      // Should be empty or not contain the rejected project
      const hasRejectedProject = response.body.data.some(
        (p: any) => p.owner_id === ownerId
      );
      expect(hasRejectedProject).toBe(false);
    });
  });

  describe('GET /api/projects', () => {
    it('should return all accessible projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.projects).toBeDefined();
      expect(response.body.data.current_project).toBeDefined();
    });
  });

  describe('POST /api/projects/switch', () => {
    it('should switch to own project', async () => {
      const response = await request(app)
        .post('/api/projects/switch')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          owner_id: ownerId,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.project.is_own_project).toBe(true);
    });

    it('should require owner_id', async () => {
      const response = await request(app)
        .post('/api/projects/switch')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('Permission-based access control', () => {
    it('should allow re-inviting rejected collaborator', async () => {
      // Create collaboration
      await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'viewer',
          groupId: null,
        });

      // Reject
      await request(app)
        .post(`/api/shared-projects/${ownerId}/reject`)
        .set('Authorization', `Bearer ${collaboratorToken}`);

      // Re-invite
      const response = await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorEmail,
          role: 'editor',
          groupId: null,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.role).toBe('editor');
      expect(response.body.data.status).toBe('active');
    });
  });
});
