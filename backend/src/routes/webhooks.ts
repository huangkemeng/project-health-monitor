import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { success, error, created, validationError, notFound } from '../utils/api-response';
import { isValidWebhookUrl, isValidPhoneNumbers, sanitizeString } from '../utils/validators';
import type { Webhook, WebhookResponse } from '../types';

const router = Router();

// Get all webhooks for current user
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const webhooks = await query<Webhook>(
      'SELECT id, name, webhook_url, at_users, is_default, created_at, updated_at FROM webhooks WHERE owner_id = ? ORDER BY created_at DESC',
      [req.user!.userId]
    );

    const response: WebhookResponse[] = webhooks.map(w => ({
      id: w.id,
      name: w.name,
      webhook_url: w.webhook_url,
      at_users: w.at_users,
      is_default: w.is_default,
      created_at: w.created_at,
      updated_at: w.updated_at
    }));

    success(res, { items: response });
  } catch (err) {
    console.error('Get webhooks error:', err);
    error(res, '获取Webhook列表失败');
  }
});

// Get default webhook
router.get('/default', authenticate, async (req: Request, res: Response) => {
  try {
    const webhook = await queryOne<Webhook>(
      'SELECT id, name, webhook_url, at_users, is_default, created_at, updated_at FROM webhooks WHERE owner_id = ? AND is_default = true',
      [req.user!.userId]
    );

    if (!webhook) {
      success(res, null);
      return;
    }

    const response: WebhookResponse = {
      id: webhook.id,
      name: webhook.name,
      webhook_url: webhook.webhook_url,
      at_users: webhook.at_users,
      is_default: webhook.is_default,
      created_at: webhook.created_at,
      updated_at: webhook.updated_at
    };

    success(res, response);
  } catch (err) {
    console.error('Get default webhook error:', err);
    error(res, '获取默认Webhook失败');
  }
});

// Get webhook by ID
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { id } = req.params;

      const webhook = await queryOne<Webhook>(
        'SELECT id, name, webhook_url, at_users, is_default, created_at, updated_at FROM webhooks WHERE id = ? AND owner_id = ?',
        [id, req.user!.userId]
      );

      if (!webhook) {
        notFound(res, 'Webhook不存在');
        return;
      }

      const response: WebhookResponse = {
        id: webhook.id,
        name: webhook.name,
        webhook_url: webhook.webhook_url,
        at_users: webhook.at_users,
        is_default: webhook.is_default,
        created_at: webhook.created_at,
        updated_at: webhook.updated_at
      };

      success(res, response);
    } catch (err) {
      console.error('Get webhook error:', err);
      error(res, '获取Webhook失败');
    }
  }
);

// Create webhook
router.post(
  '/',
  authenticate,
  [
    body('name').trim().isLength({ min: 1, max: 50 }),
    body('webhook_url').isURL(),
    body('at_users').optional().trim(),
    body('is_default').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { name, webhook_url, at_users, is_default = false } = req.body;

      // Validate webhook URL
      if (!isValidWebhookUrl(webhook_url)) {
        validationError(res, [{ field: 'webhook_url', message: '无效的Webhook URL' }]);
        return;
      }

      // Validate user IDs
      if (at_users && !isValidPhoneNumbers(at_users)) {
        validationError(res, [{ field: 'at_users', message: 'UserID 格式不正确，只能包含字母、数字、下划线、横线和点' }]);
        return;
      }

      // If setting as default, unset other defaults
      if (is_default) {
        await execute(
          'UPDATE webhooks SET is_default = false WHERE owner_id = ?',
          [req.user!.userId]
        );
      }

      const webhookId = uuidv4();
      await execute(
        `INSERT INTO webhooks (id, owner_id, name, webhook_url, at_users, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [webhookId, req.user!.userId, sanitizeString(name), webhook_url, at_users || null, is_default]
      );

      const webhook = await queryOne<Webhook>('SELECT * FROM webhooks WHERE id = ?', [webhookId]);
      created(res, webhook);
    } catch (err) {
      console.error('Create webhook error:', err);
      error(res, '创建Webhook失败');
    }
  }
);

// Update webhook
router.put(
  '/:id',
  authenticate,
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 50 }),
    body('webhook_url').optional().isURL(),
    body('at_users').optional().trim(),
    body('is_default').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { id } = req.params;
      const { name, webhook_url, at_users, is_default } = req.body;

      // Check if webhook exists
      const existingWebhook = await queryOne<Webhook>(
        'SELECT * FROM webhooks WHERE id = ? AND owner_id = ?',
        [id, req.user!.userId]
      );

      if (!existingWebhook) {
        notFound(res, 'Webhook不存在');
        return;
      }

      // Validate webhook URL if provided
      if (webhook_url && !isValidWebhookUrl(webhook_url)) {
        validationError(res, [{ field: 'webhook_url', message: '无效的Webhook URL' }]);
        return;
      }

      // Validate user IDs if provided
      if (at_users && !isValidPhoneNumbers(at_users)) {
        validationError(res, [{ field: 'at_users', message: 'UserID 格式不正确，只能包含字母、数字、下划线、横线和点' }]);
        return;
      }

      // If setting as default, unset other defaults
      if (is_default && !existingWebhook.is_default) {
        await execute(
          'UPDATE webhooks SET is_default = false WHERE owner_id = ?',
          [req.user!.userId]
        );
      }

      // Build update query
      const updates: string[] = ['updated_at = NOW()'];
      const values: (string | boolean | null)[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(sanitizeString(name));
      }
      if (webhook_url !== undefined) {
        updates.push('webhook_url = ?');
        values.push(webhook_url);
      }
      if (at_users !== undefined) {
        updates.push('at_users = ?');
        values.push(at_users || null);
      }
      if (is_default !== undefined) {
        updates.push('is_default = ?');
        values.push(is_default);
      }

      values.push(id);
      values.push(req.user!.userId);

      await execute(
        `UPDATE webhooks SET ${updates.join(', ')} WHERE id = ? AND owner_id = ?`,
        values
      );

      const webhook = await queryOne<Webhook>('SELECT * FROM webhooks WHERE id = ?', [id]);
      success(res, webhook);
    } catch (err) {
      console.error('Update webhook error:', err);
      error(res, '更新Webhook失败');
    }
  }
);

// Delete webhook
router.delete(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { id } = req.params;

      // Check if webhook exists
      const existingWebhook = await queryOne<Webhook>(
        'SELECT * FROM webhooks WHERE id = ? AND owner_id = ?',
        [id, req.user!.userId]
      );

      if (!existingWebhook) {
        notFound(res, 'Webhook不存在');
        return;
      }

      // Remove webhook from monitors
      await execute(
        'UPDATE monitors SET webhook_id = NULL WHERE webhook_id = ?',
        [id]
      );

      // Delete webhook
      await execute('DELETE FROM webhooks WHERE id = ? AND owner_id = ?', [id, req.user!.userId]);

      success(res, { message: 'Webhook已删除' });
    } catch (err) {
      console.error('Delete webhook error:', err);
      error(res, '删除Webhook失败');
    }
  }
);

// Test webhook
router.post(
  '/:id/test',
  authenticate,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { id } = req.params;

      const webhook = await queryOne<Webhook>(
        'SELECT * FROM webhooks WHERE id = ? AND owner_id = ?',
        [id, req.user!.userId]
      );

      if (!webhook) {
        notFound(res, 'Webhook不存在');
        return;
      }

      // Send test message
      const testMessage = {
        msgtype: 'text',
        text: {
          content: `【测试消息】\n这是一条来自健康监控系统的测试消息。\n\n如果您收到此消息，说明 Webhook 配置正确。`
        }
      };

      if (webhook.at_users) {
        const atMobiles = webhook.at_users.split(',').map(p => p.trim()).filter(Boolean);
        if (atMobiles.length > 0) {
          (testMessage as { mentioned_mobile_list?: string[] }).mentioned_mobile_list = atMobiles;
        }
      }

      const response = await fetch(webhook.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMessage)
      });

      if (!response.ok) {
        throw new Error(`Webhook 请求失败: ${response.status}`);
      }

      success(res, { message: '测试消息已发送' });
    } catch (err) {
      console.error('Test webhook error:', err);
      error(res, '发送测试消息失败');
    }
  }
);

export default router;
