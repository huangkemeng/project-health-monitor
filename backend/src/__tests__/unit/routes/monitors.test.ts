import request from 'supertest';
import express from 'express';
import monitorsRouter from '../../../routes/monitors';
import { generateToken } from '../../../lib/auth';

// Mock the database
jest.mock('../../../lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
}));

import { query, queryOne, execute } from '../../../lib/db';

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedQueryOne = queryOne as jest.MockedFunction<typeof queryOne>;
const mockedExecute = execute as jest.MockedFunction<typeof execute>;

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/monitors', monitorsRouter);
  return app;
};

describe('Monitors API', () => {
  let app: express.Application;
  let authToken: string;
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  beforeAll(async () => {
    app = createTestApp();
    authToken = await generateToken({
      userId,
      username: 'testuser',
      email: 'test@example.com',
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/monitors', () => {
    it('should return paginated monitors list', async () => {
      const mockMonitors = [
        {
          id: 'monitor-1',
          name: 'Test Monitor 1',
          url: 'https://example.com',
          status: 'active',
          health_status: 'normal',
          owner_id: userId,
        },
      ];

      mockedQueryOne.mockResolvedValueOnce([{ total: 1 }]);
      mockedQuery.mockResolvedValueOnce(mockMonitors);

      const response = await request(app)
        .get('/api/monitors')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter monitors by status', async () => {
      mockedQueryOne.mockResolvedValueOnce([{ total: 0 }]);
      mockedQuery.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/monitors?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedQueryOne).toHaveBeenCalledWith(
        expect.stringContaining('status = ?'),
        expect.arrayContaining([userId, 'active'])
      );
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/monitors')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/monitors', () => {
    const validMonitor = {
      name: 'Test Monitor',
      url: 'https://example.com',
      method: 'GET',
      interval: 60,
      timeout: 10,
      expected_status: 200,
      retry_times: 3,
      warning_threshold: 3000,
    };

    it('should create a new monitor', async () => {
      mockedExecute.mockResolvedValueOnce({ affectedRows: 1 } as any);
      mockedQueryOne.mockResolvedValueOnce([{
        id: 'new-monitor-id',
        ...validMonitor,
        owner_id: userId,
      }]);

      const response = await request(app)
        .post('/api/monitors')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validMonitor)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/monitors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid URL', async () => {
      const response = await request(app)
        .post('/api/monitors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validMonitor, url: 'not-a-url' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/monitors/:id', () => {
    it('should return monitor by id', async () => {
      const mockMonitor = {
        id: 'monitor-1',
        name: 'Test Monitor',
        url: 'https://example.com',
        owner_id: userId,
      };

      mockedQueryOne.mockResolvedValueOnce([mockMonitor]);

      const response = await request(app)
        .get('/api/monitors/monitor-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('monitor-1');
    });

    it('should return 404 for non-existent monitor', async () => {
      mockedQueryOne.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/monitors/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/monitors/:id', () => {
    it('should update monitor', async () => {
      mockedQueryOne.mockResolvedValueOnce([{ id: 'monitor-1', owner_id: userId }]);
      mockedExecute.mockResolvedValueOnce({ affectedRows: 1 } as any);
      mockedQueryOne.mockResolvedValueOnce([{
        id: 'monitor-1',
        name: 'Updated Name',
        url: 'https://example.com',
      }]);

      const response = await request(app)
        .put('/api/monitors/monitor-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent monitor', async () => {
      mockedQueryOne.mockResolvedValueOnce([]);

      const response = await request(app)
        .put('/api/monitors/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/monitors/:id', () => {
    it('should delete monitor', async () => {
      mockedQueryOne.mockResolvedValueOnce([{ id: 'monitor-1', owner_id: userId }]);
      mockedExecute.mockResolvedValueOnce({ affectedRows: 1 } as any);

      const response = await request(app)
        .delete('/api/monitors/monitor-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent monitor', async () => {
      mockedQueryOne.mockResolvedValueOnce([]);

      const response = await request(app)
        .delete('/api/monitors/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
