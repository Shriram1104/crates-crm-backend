import { pool } from '../utils/db.js';

export async function createAuditLog({ actorUserId, entityType, entityId, action, details }) {
  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, entity_type, entity_id, action_name, details_json)
     VALUES (?, ?, ?, ?, ?)`,
    [actorUserId || null, entityType, String(entityId || ''), action, JSON.stringify(details || {})]
  );
}

export async function createLoginLog({ userId, success, ipAddress }) {
  const [result] = await pool.query(
    `INSERT INTO login_logs (user_id, login_at, is_success, ip_address)
     VALUES (?, NOW(), ?, ?)`,
    [userId || null, success ? 1 : 0, ipAddress || null]
  );
  return result.insertId;
}

export async function closeLoginLog(loginLogId) {
  if (!loginLogId) return;
  await pool.query(
    `UPDATE login_logs SET logout_at = NOW() WHERE id = ?`,
    [loginLogId]
  );
}

export async function createShareLog({ quoteId, userId, channel, payload }) {
  await pool.query(
    `INSERT INTO quote_share_logs (quote_id, user_id, channel_name, payload_json)
     VALUES (?, ?, ?, ?)`,
    [quoteId, userId, channel, JSON.stringify(payload || {})]
  );
}
