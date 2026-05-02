import request from 'supertest';
import express from 'express';
import webhooksRouter from '../../../routes/webhooks';
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
  app.use('/api/webhooks', webhooksRouter);
  return app;
};

describe('Webhooks API', () => {
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

  describe('GET /api/webhooks', () => {
    it('should return all webhooks for user', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          name: 'Test Webhook',
          webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
          at_users: '13800138000',
          is_default: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockedQuery.mockResolvedValueOnce(mockWebhooks);

      const response = await request(app)
        .get('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].name).toBe('Test Webhook');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/webhooks')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/webhooks/default', () => {
    it('should return default webhook', async () => {
      const mockWebhook = {
        id: 'webhook-1',
        name: 'Default Webhook',
        webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
        at_users: null,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockedQueryOne.mockResolvedValueOnce([mockWebhook]);

      const response = await request(app)
        .get('/api/webhooks/default')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.is_default).toBe(true);
    });

    it('should return null when no default webhook exists', async () => {
      mockedQueryOne.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/webhooks/default')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });
  });

  describe('POST /api/webhooks', () => {
    const validWebhook = {
      name: 'Test Webhook',
      webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      at_users: '13800138000',
      is_default: false,
    };

    it('should create a new webhook', async () => {
      mockedExecute.mockResolvedValueOnce({ affectedRows: 1 } as any);
      mockedQueryOne.mockResolvedValueOnce([{
        id: 'new-webhook-id',
        ...validWebhook,
        created_at: new Date(),
        updated_at: new Date(),
      }]);

      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validWebhook)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid webhook URL', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validWebhook, webhook_url: 'not-a-url' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid phone numbers', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validWebhook, at_users: 'invalid-phone' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/webhooks/:id', () => {
    it('should return webhook by id', async () => {
      const mockWebhook = {
        id: 'webhook-1',
        name: 'Test Webhook',
        webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
        at_users: null,
        is_default: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockedQueryOne.mockResolvedValueOnce([mockWebhook]);

      const response = await request(app)
        .get('/api/webhooks/webhook-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('webhook-1');
    });

    it('should return 404 for non-existent webhook', async () => {
      mockedQueryOne.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/webhooks/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid webhook id', async () => {
      const response = await request(app)
        .get('/api/webhooks/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/webhooks/:id', () => {
    it('should update webhook', async () => {
      mockedQueryOne.mockResolvedValueOnce([{ id: 'webhook-1', owner_id: userId }]);
      mockedExecute.mockResolvedValueOnce({ affectedRows: 1 } as any);
      mockedQueryOne.mockResolvedValueOnce([{
        id: 'webhook-1',
        name: 'Updated Webhook',
        webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
        at_users: null,
        is_default: false,
      }]);

      const response = await request(app)
        .put('/api/webhooks/webhook-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Webhook' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent webhook', async () => {
      mockedQueryOne.mockResolvedValueOnce([]);

      const response = await request(app)
        .put('/api/webhooks/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/webhooks/:id', () => {
    it('should delete webhook', async () => {
      mockedQueryOne.mockResolvedValueOnce([{ id: 'webhook-1', owner_id: userId }]);
      mockedExecute.mockResolvedValueOnce({ affectedRows: 1 } as any);

      const response = await request(app)
        .delete('/api/webhooks/webhook-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent webhook', async () => {
      mockedQueryOne.mockResolvedValueOnce([]);

      const response = await request(app)
        .delete('/api/webhooks/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
