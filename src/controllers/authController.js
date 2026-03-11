import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../utils/db.js';
import { createLoginLog, closeLoginLog, createAuditLog } from '../services/logService.js';
import { verifyPassword, hashPassword } from '../utils/password.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4)
});

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const [rows] = await pool.query(
      'SELECT id, full_name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1',
      [data.email]
    );

    if (!rows.length || !rows[0].is_active) {
      await createLoginLog({ userId: null, success: false, ipAddress: req.ip });
      return next({ status: 401, message: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = verifyPassword(data.password, user.password_hash);
    if (!valid) {
      await createLoginLog({ userId: user.id, success: false, ipAddress: req.ip });
      return next({ status: 401, message: 'Invalid credentials' });
    }

    const loginLogId = await createLoginLog({ userId: user.id, success: true, ipAddress: req.ip });
    const token = jwt.sign({ userId: user.id, role: user.role, loginLogId }, process.env.JWT_SECRET, { expiresIn: '12h' });

    res.json({
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function logout(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      await closeLoginLog(decoded.loginLogId);
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

// ── CHANGE OWN PASSWORD ───────────────────────────────────────────────────
export async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password || new_password.length < 6)
      return res.status(400).json({ message: 'current_password and new_password (min 6 chars) required' });

    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });

    const valid = verifyPassword(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(new_password), req.user.id]);
    await createAuditLog({ actorUserId: req.user.id, entityType: 'user', entityId: req.user.id, action: 'change_password', details: {} });
    res.json({ ok: true });
  } catch (error) { next(error); }
}
