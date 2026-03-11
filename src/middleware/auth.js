import jwt from 'jsonwebtoken';
import { pool } from '../utils/db.js';

export async function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return next({ status: 401, message: 'Missing auth token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, is_active FROM users WHERE id = ? LIMIT 1',
      [decoded.userId]
    );
    if (!rows.length || !rows[0].is_active) {
      return next({ status: 401, message: 'User not found or inactive' });
    }
    req.user = rows[0];
    next();
  } catch {
    next({ status: 401, message: 'Invalid auth token' });
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next({ status: 403, message: 'Forbidden' });
    }
    next();
  };
}
