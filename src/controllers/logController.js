import { pool } from '../utils/db.js';

export async function getLoginLogs(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT ll.id, ll.login_at, ll.logout_at, ll.is_success, ll.ip_address,
              u.full_name, u.email
       FROM login_logs ll
       LEFT JOIN users u ON u.id = ll.user_id
       ORDER BY ll.id DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogs(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT al.id, al.entity_type, al.entity_id, al.action_name, al.details_json, al.created_at,
              u.full_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       ORDER BY al.id DESC LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}
