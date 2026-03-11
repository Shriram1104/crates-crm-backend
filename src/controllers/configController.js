import { z } from 'zod';
import { pool } from '../utils/db.js';
import { createAuditLog } from '../services/logService.js';

const schema = z.object({
  config_key: z.string().min(2),
  config_label: z.string().min(2),
  config_value: z.any(),
  value_type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
  category_name: z.string().default('general')
});

const defaultSchema = z.object({
  config_label: z.string().min(2),
  config_value: z.record(z.any()),
  category_name: z.string().default('workbook-defaults')
});

const plasticCrateSchema = z.object({
  series_name: z.string().trim().min(1).optional().nullable(),
  size_mm: z.string().trim().min(1),
  cost_per_unit: z.coerce.number().nonnegative(),
  discount_percent: z.coerce.number().nonnegative(),
  is_active: z.coerce.boolean().default(true)
});

export async function listConfigs(_req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM config_values ORDER BY category_name, config_label');
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function getConfigDefault(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM config_values WHERE config_key = ? LIMIT 1', [req.params.key]);
    if (!rows.length) return res.json({ config_key: req.params.key, config_value: {} });
    const row = rows[0];
    res.json({ ...row, config_value: typeof row.config_value === 'string' ? JSON.parse(row.config_value) : row.config_value });
  } catch (error) {
    next(error);
  }
}

export async function saveConfigDefault(req, res, next) {
  try {
    const data = defaultSchema.parse(req.body);
    const configKey = req.params.key;
    await pool.query(
      `INSERT INTO config_values (config_key, config_label, config_value, value_type, category_name)
       VALUES (?, ?, ?, 'json', ?)
       ON DUPLICATE KEY UPDATE config_label = VALUES(config_label), config_value = VALUES(config_value), category_name = VALUES(category_name)`,
      [configKey, data.config_label, JSON.stringify(data.config_value), data.category_name]
    );
    await createAuditLog({ actorUserId: req.user.id, entityType: 'config_default', entityId: configKey, action: 'upsert', details: data });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function listPlasticCrates(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, series_name, size_mm, cost_per_unit, discount_percent, is_active
       FROM plastic_crate_master
       ORDER BY series_name, size_mm`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function createPlasticCrate(req, res, next) {
  try {
    const data = plasticCrateSchema.parse(req.body);
    const [result] = await pool.query(
      `INSERT INTO plastic_crate_master (series_name, size_mm, cost_per_unit, discount_percent, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [data.series_name || null, data.size_mm, data.cost_per_unit, data.discount_percent, data.is_active ? 1 : 0]
    );
    await createAuditLog({ actorUserId: req.user.id, entityType: 'plastic_crate_master', entityId: result.insertId, action: 'create', details: data });
    res.status(201).json({ id: result.insertId, ...data });
  } catch (error) {
    next(error);
  }
}

export async function updatePlasticCrate(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = plasticCrateSchema.parse(req.body);
    await pool.query(
      `UPDATE plastic_crate_master
       SET series_name = ?, size_mm = ?, cost_per_unit = ?, discount_percent = ?, is_active = ?
       WHERE id = ?`,
      [data.series_name || null, data.size_mm, data.cost_per_unit, data.discount_percent, data.is_active ? 1 : 0, id]
    );
    await createAuditLog({ actorUserId: req.user.id, entityType: 'plastic_crate_master', entityId: id, action: 'update', details: data });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function upsertConfig(req, res, next) {
  try {
    const data = schema.parse(req.body);
    await pool.query(
      `INSERT INTO config_values (config_key, config_label, config_value, value_type, category_name)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE config_label = VALUES(config_label), config_value = VALUES(config_value),
       value_type = VALUES(value_type), category_name = VALUES(category_name)`,
      [data.config_key, data.config_label, JSON.stringify(data.config_value), data.value_type, data.category_name]
    );
    await createAuditLog({ actorUserId: req.user.id, entityType: 'config', entityId: data.config_key, action: 'upsert', details: data });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

// ── FIELD PERMISSIONS ─────────────────────────────────────────────────────
const PERM_KEY = 'field_permissions';

export async function getFieldPermissions(_req, res, next) {
  try {
    const [rows] = await pool.query('SELECT config_value FROM config_values WHERE config_key = ? LIMIT 1', [PERM_KEY]);
    if (!rows.length) return res.json({});
    const val = rows[0].config_value;
    res.json(typeof val === 'string' ? JSON.parse(val) : val);
  } catch (error) { next(error); }
}

export async function saveFieldPermissions(req, res, next) {
  try {
    const perms = req.body; // { "cnc.sheetSizeLengthInMeter": true, ... }
    if (typeof perms !== 'object' || Array.isArray(perms)) return res.status(400).json({ message: 'Invalid permissions object' });
    await pool.query(
      `INSERT INTO config_values (config_key, config_label, config_value, value_type, category_name)
       VALUES (?, 'Field Permissions', ?, 'json', 'permissions')
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      [PERM_KEY, JSON.stringify(perms)]
    );
    await createAuditLog({ actorUserId: req.user.id, entityType: 'config', entityId: PERM_KEY, action: 'update', details: { count: Object.keys(perms).length } });
    res.json({ ok: true });
  } catch (error) { next(error); }
}
