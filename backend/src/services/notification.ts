import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../lib/db';
import type { FeedbackNotificationResponse, NotificationType } from '../types';

function formatFeedbackNo(feedback: { id: string; created_at: Date | string }): string {
  const createdAt = feedback.created_at instanceof Date
    ? feedback.created_at
    : new Date(feedback.created_at);
  const dateStr = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
  return `FB-${dateStr}-${feedback.id.slice(0, 4).toUpperCase()}`;
}

export async function createNotification(
  userId: string,
  feedbackId: string,
  type: NotificationType,
  title: string,
  content?: string
): Promise<void> {
  await execute(
    `INSERT INTO feedback_notifications (id, user_id, feedback_id, type, title, content)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [uuidv4(), userId, feedbackId, type, title, content || null]
  );
}

export async function getUserNotifications(
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ items: FeedbackNotificationResponse[]; pagination: { page: number; page_size: number; total: number; total_pages: number } }> {
  const offset = (page - 1) * pageSize;

  const countResult = await queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM feedback_notifications WHERE user_id = ?',
    [userId]
  );
  const total = countResult?.cnt || 0;

  const items = await query<any>(
    `SELECT n.*, f.created_at as feedback_created_at
     FROM feedback_notifications n
     LEFT JOIN feedback f ON n.feedback_id = f.id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );

  return {
    items: items.map((item: any) => ({
      id: item.id,
      feedback_id: item.feedback_id,
      feedback_no: formatFeedbackNo({ id: item.feedback_id, created_at: item.feedback_created_at || new Date() }),
      type: item.type,
      title: item.title,
      content: item.content,
      is_read: item.is_read,
      created_at: item.created_at instanceof Date ? item.created_at.toISOString() : String(item.created_at),
    })),
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    },
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const result = await queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM feedback_notifications WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
  return result?.cnt || 0;
}

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await execute(
    'UPDATE feedback_notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
}

export async function markAllAsRead(userId: string): Promise<void> {
  await execute(
    'UPDATE feedback_notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
}
