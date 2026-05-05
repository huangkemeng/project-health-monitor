import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../lib/db';
import { createNotification } from './notification';
import type {
  Feedback,
  FeedbackResponse,
  FeedbackListItem,
  CreateFeedbackData,
  FeedbackReplyResponse,
  FeedbackTimelineResponse,
  FeedbackStatus,
  FeedbackStats,
} from '../types';

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  fixed: '已修复',
  closed: '已关闭',
  duplicate: '重复反馈',
};

const VALID_TRANSITIONS: Record<FeedbackStatus, FeedbackStatus[]> = {
  pending: ['processing', 'duplicate', 'closed'],
  processing: ['fixed', 'closed'],
  fixed: ['closed', 'processing'],
  closed: ['pending'],
  duplicate: ['closed'],
};

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function formatFeedbackNo(feedback: Feedback): string {
  const createdAt = feedback.created_at instanceof Date
    ? feedback.created_at
    : new Date(feedback.created_at);
  const dateStr = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
  return `FB-${dateStr}-${feedback.id.slice(0, 4).toUpperCase()}`;
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

function canTransition(from: FeedbackStatus, to: FeedbackStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function generateFeedbackNo(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM feedback WHERE DATE(created_at) = CURDATE()'
  );
  const seq = ((count?.cnt || 0) + 1).toString().padStart(4, '0');
  return `FB-${today}-${seq}`;
}

export async function createFeedback(
  userId: string | null,
  email: string | null,
  data: CreateFeedbackData
): Promise<FeedbackResponse> {
  if (!userId) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentCount = await queryOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM feedback WHERE guest_email = ? AND created_at > ?',
      [email || 'anonymous', formatDate(fiveMinAgo)]
    );
    if ((recentCount?.cnt || 0) >= 5) {
      throw new Error('提交过于频繁，请稍后再试');
    }
  } else {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentCount = await queryOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM feedback WHERE user_id = ? AND created_at > ?',
      [userId, formatDate(fiveMinAgo)]
    );
    if ((recentCount?.cnt || 0) >= 5) {
      throw new Error('提交过于频繁，请稍后再试');
    }
  }

  const id = uuidv4();
  const feedbackNo = await generateFeedbackNo();

  await execute(
    `INSERT INTO feedback (id, user_id, guest_email, type, title, description,
      steps_to_reproduce, expected_behavior, actual_behavior, contact,
      page_url, browser_info, browser_language, screen_resolution,
      operating_system, system_version, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      id, userId, email, data.type, data.title, data.description,
      data.steps_to_reproduce || null, data.expected_behavior || null,
      data.actual_behavior || null, data.contact || null,
      data.page_url || null, data.browser_info || null,
      data.browser_language || null, data.screen_resolution || null,
      data.operating_system || null, data.system_version || null,
    ]
  );

  // Create timeline record
  await execute(
    `INSERT INTO feedback_timeline (id, feedback_id, action_type, content, operator_id)
    VALUES (?, ?, 'created', ?, ?)`,
    [uuidv4(), id, '反馈已提交', userId]
  );

  // Notify admins about new feedback
  const adminIds = await getAdminUserIds();
  for (const adminId of adminIds) {
    await createNotification(
      adminId,
      id,
      'system',
      `新的反馈：${data.title}`,
      `用户提交了新的反馈「${data.title}」`
    );
  }

  return getFeedbackById(id, userId || '');
}

export async function getFeedbackById(
  feedbackId: string,
  userId: string
): Promise<FeedbackResponse> {
  const feedback = await queryOne<Feedback>(
    `SELECT f.*, u.username as submitter_name
     FROM feedback f
     LEFT JOIN users u ON f.user_id = u.id
     WHERE f.id = ?`,
    [feedbackId]
  );

  if (!feedback) {
    throw new Error('反馈不存在');
  }

  const isOwner = feedback.user_id === userId;
  const isAdmin = await checkIsAdmin(userId);

  if (!isOwner && !isAdmin) {
    throw new Error('无权访问该反馈');
  }

  const timeline = await query<FeedbackTimelineResponse>(
    `SELECT ft.*, u.username as operator_name
     FROM feedback_timeline ft
     LEFT JOIN users u ON ft.operator_id = u.id
     WHERE ft.feedback_id = ?
     ORDER BY ft.created_at ASC`,
    [feedbackId]
  );

  const replies = await query<FeedbackReplyResponse>(
    `SELECT fr.*, u.username as author_name
     FROM feedback_replies fr
     LEFT JOIN users u ON fr.user_id = u.id
     WHERE fr.feedback_id = ?
     ORDER BY fr.created_at ASC`,
    [feedbackId]
  );

  // Get duplicate title if applicable
  let duplicateTitle: string | null = null;
  if (feedback.duplicate_of) {
    const dup = await queryOne<{ title: string }>(
      'SELECT title FROM feedback WHERE id = ?',
      [feedback.duplicate_of]
    );
    duplicateTitle = dup?.title || null;
  }

  return {
    id: feedback.id,
    feedback_no: formatFeedbackNo(feedback),
    type: feedback.type,
    title: feedback.title,
    description: feedback.description,
    steps_to_reproduce: feedback.steps_to_reproduce,
    expected_behavior: feedback.expected_behavior,
    actual_behavior: feedback.actual_behavior,
    contact: feedback.contact,
    status: feedback.status,
    duplicate_of: feedback.duplicate_of,
    duplicate_title: duplicateTitle,
    page_url: feedback.page_url,
    browser_info: feedback.browser_info,
    browser_language: feedback.browser_language,
    screen_resolution: feedback.screen_resolution,
    operating_system: feedback.operating_system,
    system_version: feedback.system_version,
    submitter_name: (feedback as any).submitter_name || undefined,
    timeline: timeline.map(t => ({
      ...t,
      action_type: t.action_type as any,
    })),
    replies: replies.map(r => ({
      id: r.id,
      content: r.content,
      is_admin_reply: r.is_admin_reply,
      author_name: r.author_name || undefined,
      created_at: r.created_at,
    })),
    created_at: feedback.created_at,
    updated_at: feedback.updated_at,
  };
}

export async function getUserFeedbacks(
  userId: string,
  filters: {
    page?: number;
    page_size?: number;
    status?: string;
    type?: string;
    keyword?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<{ items: FeedbackListItem[]; pagination: { page: number; page_size: number; total: number; total_pages: number } }> {
  const page = filters.page || 1;
  const pageSize = filters.page_size || 20;
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE f.user_id = ?';
  const params: any[] = [userId];

  // Check if user is admin - admin can see all
  const isAdmin = await checkIsAdmin(userId);
  if (isAdmin) {
    whereClause = 'WHERE 1=1';
    params.pop();
  }

  if (filters.status && filters.status !== 'all') {
    whereClause += ' AND f.status = ?';
    params.push(filters.status);
  }

  if (filters.type && filters.type !== 'all') {
    whereClause += ' AND f.type = ?';
    params.push(filters.type);
  }

  if (filters.keyword) {
    whereClause += ' AND (f.title LIKE ? OR f.id LIKE ?)';
    const kw = `%${filters.keyword}%`;
    params.push(kw, kw);
  }

  if (filters.start_date) {
    whereClause += ' AND f.created_at >= ?';
    params.push(filters.start_date);
  }

  if (filters.end_date) {
    whereClause += ' AND f.created_at <= ?';
    params.push(filters.end_date + ' 23:59:59');
  }

  const countResult = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM feedback f ${whereClause}`,
    params
  );
  const total = countResult?.cnt || 0;

  const items = await query<FeedbackListItem>(
    `SELECT f.id, f.type, f.title, f.status, f.created_at, f.updated_at,
            u.username as submitter_name,
            (SELECT COUNT(*) FROM feedback_replies WHERE feedback_id = f.id) as reply_count
     FROM feedback f
     LEFT JOIN users u ON f.user_id = u.id
     ${whereClause}
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    items: items.map(item => ({
      ...item,
      feedback_no: formatFeedbackNo(item as any),
      submitter_name: (item as any).submitter_name || undefined,
    })),
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    },
  };
}

export async function getAllFeedbacksForAdmin(
  filters: {
    page?: number;
    page_size?: number;
    status?: string;
    type?: string;
    keyword?: string;
  }
): Promise<{ items: FeedbackListItem[]; pagination: { page: number; page_size: number; total: number; total_pages: number } }> {
  const page = filters.page || 1;
  const pageSize = filters.page_size || 20;
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (filters.status && filters.status !== 'all') {
    whereClause += ' AND f.status = ?';
    params.push(filters.status);
  }

  if (filters.type && filters.type !== 'all') {
    whereClause += ' AND f.type = ?';
    params.push(filters.type);
  }

  if (filters.keyword) {
    whereClause += ' AND (f.title LIKE ? OR f.id LIKE ?)';
    const kw = `%${filters.keyword}%`;
    params.push(kw, kw);
  }

  const countResult = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM feedback f ${whereClause}`,
    params
  );
  const total = countResult?.cnt || 0;

  const items = await query<FeedbackListItem>(
    `SELECT f.id, f.type, f.title, f.status, f.created_at, f.updated_at,
            u.username as submitter_name,
            (SELECT COUNT(*) FROM feedback_replies WHERE feedback_id = f.id) as reply_count
     FROM feedback f
     LEFT JOIN users u ON f.user_id = u.id
     ${whereClause}
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    items: items.map(item => ({
      ...item,
      feedback_no: formatFeedbackNo(item as any),
      submitter_name: (item as any).submitter_name || undefined,
    })),
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    },
  };
}

export async function updateFeedbackStatus(
  feedbackId: string,
  userId: string,
  newStatus: FeedbackStatus,
  reason: string,
  duplicateOf?: string
): Promise<void> {
  const feedback = await queryOne<Feedback>(
    'SELECT * FROM feedback WHERE id = ?',
    [feedbackId]
  );

  if (!feedback) {
    throw new Error('反馈不存在');
  }

  if (!canTransition(feedback.status, newStatus)) {
    throw new Error(`无法从「${getStatusLabel(feedback.status)}」变更为「${getStatusLabel(newStatus)}」`);
  }

  if (newStatus === 'duplicate' && !duplicateOf) {
    throw new Error('标记为重复反馈时必须指定原反馈编号');
  }

  const oldStatus = feedback.status;

  if (newStatus === 'duplicate') {
    await execute(
      'UPDATE feedback SET status = ?, duplicate_of = ? WHERE id = ?',
      [newStatus, duplicateOf, feedbackId]
    );
  } else {
    await execute(
      'UPDATE feedback SET status = ? WHERE id = ?',
      [newStatus, feedbackId]
    );
  }

  const content = `状态从「${getStatusLabel(oldStatus)}」变更为「${getStatusLabel(newStatus)}」${reason ? '：' + reason : ''}`;

  await execute(
    `INSERT INTO feedback_timeline (id, feedback_id, action_type, old_status, new_status, content, operator_id)
    VALUES (?, ?, 'status_changed', ?, ?, ?, ?)`,
    [uuidv4(), feedbackId, oldStatus, newStatus, content, userId]
  );

  // Notify feedback submitter about status change
  if (feedback.user_id) {
    await createNotification(
      feedback.user_id,
      feedbackId,
      'status_change',
      '反馈状态已更新',
      `您的反馈「${feedback.title}」状态已从「${getStatusLabel(oldStatus)}」变更为「${getStatusLabel(newStatus)}」`
    );
  }
}

export async function addReply(
  feedbackId: string,
  userId: string,
  content: string
): Promise<FeedbackReplyResponse> {
  const feedback = await queryOne<Feedback>(
    'SELECT * FROM feedback WHERE id = ?',
    [feedbackId]
  );

  if (!feedback) {
    throw new Error('反馈不存在');
  }

  const isOwner = feedback.user_id === userId;
  const isAdmin = await checkIsAdmin(userId);

  if (!isOwner && !isAdmin) {
    throw new Error('无权回复该反馈');
  }

  const replyId = uuidv4();
  const isAdminReply = isAdmin && !isOwner;

  await execute(
    `INSERT INTO feedback_replies (id, feedback_id, user_id, content, is_admin_reply)
    VALUES (?, ?, ?, ?, ?)`,
    [replyId, feedbackId, userId, content, isAdminReply]
  );

  // Create timeline record
  await execute(
    `INSERT INTO feedback_timeline (id, feedback_id, action_type, content, operator_id, reply_id)
    VALUES (?, ?, 'replied', ?, ?, ?)`,
    [uuidv4(), feedbackId, content.slice(0, 100), userId, replyId]
  );

  // Notify about reply
  if (isAdminReply && feedback.user_id) {
    await createNotification(
      feedback.user_id,
      feedbackId,
      'admin_reply',
      '管理员回复了您的反馈',
      `管理员回复了您的反馈「${feedback.title}」: ${content.slice(0, 100)}`
    );
  } else if (!isAdminReply) {
    const adminIds = await getAdminUserIds();
    for (const adminId of adminIds) {
      if (adminId !== userId) {
        await createNotification(
          adminId,
          feedbackId,
          'reply',
          '用户回复了反馈',
          `用户回复了反馈「${feedback.title}」: ${content.slice(0, 100)}`
        );
      }
    }
  }

  const user = await queryOne<{ username: string }>(
    'SELECT username FROM users WHERE id = ?',
    [userId]
  );

  return {
    id: replyId,
    content,
    is_admin_reply: isAdminReply,
    author_name: user?.username || undefined,
    created_at: new Date(),
  };
}

export async function closeFeedback(
  feedbackId: string,
  userId: string
): Promise<void> {
  const feedback = await queryOne<Feedback>(
    'SELECT * FROM feedback WHERE id = ?',
    [feedbackId]
  );

  if (!feedback) {
    throw new Error('反馈不存在');
  }

  const isOwner = feedback.user_id === userId;
  const isAdmin = await checkIsAdmin(userId);

  if (!isOwner && !isAdmin) {
    throw new Error('无权关闭该反馈');
  }

  const oldStatus = feedback.status;

  await execute(
    'UPDATE feedback SET status = ? WHERE id = ?',
    ['closed', feedbackId]
  );

  await execute(
    `INSERT INTO feedback_timeline (id, feedback_id, action_type, old_status, new_status, content, operator_id)
    VALUES (?, ?, 'status_changed', ?, ?, ?, ?)`,
    [uuidv4(), feedbackId, oldStatus, 'closed', '反馈已关闭', userId]
  );
}

export async function reopenFeedback(
  feedbackId: string,
  userId: string
): Promise<void> {
  const feedback = await queryOne<Feedback>(
    'SELECT * FROM feedback WHERE id = ?',
    [feedbackId]
  );

  if (!feedback) {
    throw new Error('反馈不存在');
  }

  if (feedback.status !== 'closed') {
    throw new Error('只有已关闭的反馈可以重新开启');
  }

  // Check 7-day limit
  const closedAt = feedback.updated_at instanceof Date
    ? feedback.updated_at
    : new Date(feedback.updated_at);
  const daysSinceClosed = Math.floor((Date.now() - closedAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceClosed > 7) {
    throw new Error('反馈已关闭超过7天，无法重新开启');
  }

  const isOwner = feedback.user_id === userId;
  const isAdmin = await checkIsAdmin(userId);

  if (!isOwner && !isAdmin) {
    throw new Error('无权重新开启该反馈');
  }

  await execute(
    'UPDATE feedback SET status = ? WHERE id = ?',
    ['pending', feedbackId]
  );

  await execute(
    `INSERT INTO feedback_timeline (id, feedback_id, action_type, old_status, new_status, content, operator_id)
    VALUES (?, ?, 'reopened', ?, ?, ?, ?)`,
    [uuidv4(), feedbackId, 'closed', 'pending', '反馈已重新开启', userId]
  );
}

export async function getFeedbackStats(): Promise<FeedbackStats> {
  const pendingCount = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM feedback WHERE status = 'pending'"
  );
  const processingCount = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM feedback WHERE status = 'processing'"
  );
  const todayCount = await queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM feedback WHERE DATE(created_at) = CURDATE()'
  );
  const weekCount = await queryOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM feedback WHERE YEARWEEK(created_at) = YEARWEEK(CURDATE())'
  );

  return {
    pending_count: pendingCount?.cnt || 0,
    processing_count: processingCount?.cnt || 0,
    today_count: todayCount?.cnt || 0,
    week_count: weekCount?.cnt || 0,
    avg_response_time: 0,
  };
}

export async function assignFeedback(
  feedbackId: string,
  assigneeId: string,
  adminId: string
): Promise<void> {
  const feedback = await queryOne<Feedback>(
    'SELECT * FROM feedback WHERE id = ?',
    [feedbackId]
  );

  if (!feedback) {
    throw new Error('反馈不存在');
  }

  const admin = await queryOne<{ is_admin: boolean }>(
    'SELECT is_admin FROM users WHERE id = ?',
    [adminId]
  );

  await execute(
    'UPDATE feedback SET assigned_to = ? WHERE id = ?',
    [assigneeId, feedbackId]
  );

  const assignee = await queryOne<{ username: string }>(
    'SELECT username FROM users WHERE id = ?',
    [assigneeId]
  );

  await execute(
    `INSERT INTO feedback_timeline (id, feedback_id, action_type, content, operator_id)
    VALUES (?, ?, 'status_changed', ?, ?)`,
    [uuidv4(), feedbackId, `已分配给 ${assignee?.username || assigneeId}`, adminId]
  );
}

export async function batchUpdateStatus(
  ids: string[],
  newStatus: FeedbackStatus,
  userId: string
): Promise<void> {
  for (const id of ids) {
    try {
      await updateFeedbackStatus(id, userId, newStatus, '批量操作');
    } catch (err) {
      console.error(`Failed to update feedback ${id}:`, err);
    }
  }
}

export async function searchFeedbacks(
  keyword: string
): Promise<FeedbackListItem[]> {
  const items = await query<FeedbackListItem>(
    `SELECT f.id, f.type, f.title, f.status, f.created_at, f.updated_at,
            u.username as submitter_name,
            (SELECT COUNT(*) FROM feedback_replies WHERE feedback_id = f.id) as reply_count
     FROM feedback f
     LEFT JOIN users u ON f.user_id = u.id
     WHERE f.title LIKE ? OR f.id LIKE ?
     ORDER BY f.created_at DESC
     LIMIT 20`,
    [`%${keyword}%`, `%${keyword}%`]
  );

  return items.map(item => ({
    ...item,
    feedback_no: formatFeedbackNo(item as any),
    submitter_name: (item as any).submitter_name || undefined,
  }));
}

async function getAdminUserIds(): Promise<string[]> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
  if (adminEmails.length === 0) return [];
  const admins = await query<{ id: string }>(
    'SELECT id FROM users WHERE email IN (?)',
    [adminEmails]
  );
  return admins.map(a => a.id);
}

async function checkIsAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
  if (adminEmails.length === 0) {
    return false;
  }
  const user = await queryOne<{ email: string }>(
    'SELECT email FROM users WHERE id = ?',
    [userId]
  );
  return user ? adminEmails.includes(user.email) : false;
}
