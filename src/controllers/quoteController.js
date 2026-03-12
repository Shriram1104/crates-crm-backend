import fs from 'fs/promises';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { pool } from '../utils/db.js';
import { calculateQuote } from '../services/formulaEngine.js';
import { generateQuotePdf } from '../services/pdfService.js';
import { createAuditLog, createShareLog } from '../services/logService.js';

const quoteSchema = z.object({
  customer_name: z.string().min(2),
  sales_person: z.string().min(2),
  quote_date: z.string(),
  crate_size: z.string().min(1),
  remarks: z.string().optional().nullable(),
  summary: z.object({}).passthrough(),
  cnc: z.object({}).passthrough(),
  ppInsert: z.object({}).passthrough(),
  hdpe: z.object({}).passthrough(),
  foam: z.object({}).passthrough(),
  flapCover: z.object({}).passthrough()
});

export async function listQuotes(req, res, next) {
  try {
    let sql = `SELECT q.id, q.quote_number, q.customer_name, q.sales_person, q.quote_date, q.crate_size, q.status, q.final_total, q.created_at,
                      u.full_name AS created_by_name
               FROM quotes q
               LEFT JOIN users u ON u.id = q.created_by
               `;
    const params = [];
    if (req.user.role !== 'admin') {
      sql += ' WHERE q.created_by = ?';
      params.push(req.user.id);
    }
    sql += ' ORDER BY q.id DESC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function createQuote(req, res, next) {
  try {
    const data = quoteSchema.parse(req.body);
    const calculations = calculateQuote(data);
    const quoteNumber = `Q-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${nanoid(6).toUpperCase()}`;
    const [result] = await pool.query(
      `INSERT INTO quotes
      (quote_number, customer_name, sales_person, quote_date, crate_size, remarks, status, created_by, updated_by, input_snapshot_json, output_snapshot_json, final_total)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
      [
        quoteNumber, data.customer_name, data.sales_person, data.quote_date, data.crate_size, data.remarks || null,
        req.user.id, req.user.id, JSON.stringify(data), JSON.stringify(calculations), calculations.summary.grandTotal
      ]
    );
    await createAuditLog({ actorUserId: req.user.id, entityType: 'quote', entityId: result.insertId, action: 'create', details: { quoteNumber } });
    res.status(201).json({ id: result.insertId, quote_number: quoteNumber, calculations });
  } catch (error) {
    next(error);
  }
}

export async function getQuote(req, res, next) {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query('SELECT * FROM quotes WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return next({ status: 404, message: 'Quote not found' });
    const quote = rows[0];
    res.json({
      ...quote,
      input_snapshot_json: typeof quote.input_snapshot_json === 'string' ? JSON.parse(quote.input_snapshot_json || '{}') : (quote.input_snapshot_json || {}),
      output_snapshot_json: typeof quote.output_snapshot_json === 'string' ? JSON.parse(quote.output_snapshot_json || '{}') : (quote.output_snapshot_json || {})
    });
  } catch (error) {
    next(error);
  }
}

export async function updateQuote(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = quoteSchema.parse(req.body);
    const calculations = calculateQuote(data);
    await pool.query(
      `UPDATE quotes
       SET customer_name=?, sales_person=?, quote_date=?, crate_size=?, remarks=?, updated_by=?,
           input_snapshot_json=?, output_snapshot_json=?, final_total=?, updated_at=NOW()
       WHERE id=?`,
      [
        data.customer_name, data.sales_person, data.quote_date, data.crate_size, data.remarks || null,
        req.user.id, JSON.stringify(data), JSON.stringify(calculations), calculations.summary.grandTotal, id
      ]
    );
    await createAuditLog({ actorUserId: req.user.id, entityType: 'quote', entityId: id, action: 'update', details: { finalTotal: calculations.summary.grandTotal } });
    const [updated] = await pool.query('SELECT id, quote_number FROM quotes WHERE id = ? LIMIT 1', [id]);
    res.json({ ok: true, id, quote_number: updated[0]?.quote_number, calculations });
  } catch (error) {
    next(error);
  }
}

export async function generatePdf(req, res, next) {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query('SELECT * FROM quotes WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return next({ status: 404, message: 'Quote not found' });

    const quote = rows[0];
    const rawSnapshot = quote.input_snapshot_json;
    const inputSnapshot = typeof rawSnapshot === 'string'
      ? JSON.parse(rawSnapshot || '{}')
      : (rawSnapshot || {});
    // Always recalculate fresh from input — never use stale output_snapshot_json
    const calculations = calculateQuote(inputSnapshot);
    const { fileName, filePath } = await generateQuotePdf({ quote, calculations, inputSnapshot });

    const [fileResult] = await pool.query(
      `INSERT INTO quote_generated_files (quote_id, user_id, file_name, file_path)
       VALUES (?, ?, ?, ?)`,
      [quote.id, req.user.id, fileName, filePath]
    );

    await pool.query(`UPDATE quotes SET status = 'generated', latest_file_id = ? WHERE id = ?`, [fileResult.insertId, quote.id]);
    await createAuditLog({ actorUserId: req.user.id, entityType: 'quote', entityId: id, action: 'generate_pdf', details: { fileName } });

    res.download(filePath, fileName);
  } catch (error) {
    next(error);
  }
}

export async function getShareLinks(req, res, next) {
  try {
    const id = Number(req.params.id);
    const [quoteRows] = await pool.query('SELECT * FROM quotes WHERE id = ? LIMIT 1', [id]);
    if (!quoteRows.length) return next({ status: 404, message: 'Quote not found' });
    const quote = quoteRows[0];
    const [fileRows] = await pool.query(
      'SELECT * FROM quote_generated_files WHERE quote_id = ? ORDER BY id DESC LIMIT 1',
      [id]
    );
    const file = fileRows[0] || null;
    const subject = encodeURIComponent(`Quote ${quote.quote_number} - ${quote.customer_name}`);
    const body = encodeURIComponent(`Please find the quote ${quote.quote_number} for ${quote.customer_name}.`);
    const cc = encodeURIComponent(process.env.DEFAULT_GMAIL_CC || 'shriramkanawade@gmail.com');
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}&cc=${cc}`;
    const whatsappText = encodeURIComponent(`Quote ${quote.quote_number} for ${quote.customer_name}. Total: INR ${quote.final_total}`);
    const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
    await createShareLog({ quoteId: id, userId: req.user.id, channel: 'share_links_requested', payload: { gmailUrl, whatsappUrl, hasFile: !!file } });
    res.json({ gmailUrl, whatsappUrl, latestFile: file });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuote(req, res, next) {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query('SELECT id, quote_number FROM quotes WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return next({ status: 404, message: 'Quote not found' });
    // Delete related records first
    await pool.query('DELETE FROM quote_share_logs WHERE quote_id = ?', [id]);
    await pool.query('UPDATE quotes SET latest_file_id = NULL WHERE id = ?', [id]);
    await pool.query('DELETE FROM quote_generated_files WHERE quote_id = ?', [id]);
    await pool.query('DELETE FROM quotes WHERE id = ?', [id]);
    await createAuditLog({ actorUserId: req.user.id, entityType: 'quote', entityId: id, action: 'delete', details: { quote_number: rows[0].quote_number } });
    res.json({ ok: true });
  } catch (error) { next(error); }
}
