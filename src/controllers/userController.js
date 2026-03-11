import { z } from 'zod';
import { pool } from '../utils/db.js';
import { createAuditLog } from '../services/logService.js';
import { hashPassword } from '../utils/password.js';

const createSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  mobile_number: z.string().optional().nullable(),
  role: z.enum(['admin', 'team_member']),
  is_active: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).optional()
});

const updateSchema = createSchema.partial().extend({ password: z.string().min(6).optional() });

export async function listUsers(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, mobile_number, role, is_active, created_at, updated_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const password_hash = hashPassword(data.password);
    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, mobile_number, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.full_name, data.email, password_hash, data.mobile_number || null, data.role, data.is_active ?? true]
    );
    await createAuditLog({ actorUserId: req.user.id, entityType: 'user', entityId: result.insertId, action: 'create', details: data });
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = updateSchema.parse(req.body);
    const fields = [];
    const values = [];

    if (data.full_name !== undefined) { fields.push('full_name = ?'); values.push(data.full_name); }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
    if (data.mobile_number !== undefined) { fields.push('mobile_number = ?'); values.push(data.mobile_number); }
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active); }
    if (data.password) {
      fields.push('password_hash = ?');
      values.push(hashPassword(data.password));
    }

    if (!fields.length) {
      return res.json({ ok: true });
    }

    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    await createAuditLog({ actorUserId: req.user.id, entityType: 'user', entityId: id, action: 'update', details: data });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

// Self-update: any logged-in user can update their own profile (name, mobile only — NOT role/active)
export async function updateSelf(req, res, next) {
  try {
    const id = req.user.id;
    const { full_name, mobile_number } = req.body;
    const fields = [];
    const values = [];
    if (full_name?.trim())    { fields.push('full_name = ?');    values.push(full_name.trim()); }
    if (mobile_number !== undefined) { fields.push('mobile_number = ?'); values.push(mobile_number || null); }
    if (!fields.length) return res.json({ ok: true });
    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    await createAuditLog({ actorUserId: id, entityType: 'user', entityId: id, action: 'update_self', details: { full_name, mobile_number } });
    res.json({ ok: true });
  } catch (error) { next(error); }
}
