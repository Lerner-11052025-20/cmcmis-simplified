// ============================================================================
// src/modules/jobCards/spares/spares.repo.js
// ----------------------------------------------------------------------------
// DAL for jc_spares_used (Tab 7 multi-row table).
// ============================================================================

'use strict';

const pool = require('../../../config/db');

async function listForJc(sectionJobNo) {
  const [rows] = await pool.query(
    `SELECT id, jc_section_no, sr_no, spare_type, source,
            part_no, part_description, quantity, cost,
            created_by_employee_id, created_at, updated_at
       FROM jc_spares_used
      WHERE jc_section_no = ?
      ORDER BY sr_no ASC, id ASC`,
    [sectionJobNo],
  );
  return rows;
}

async function findById(rowId) {
  const [rows] = await pool.query(
    `SELECT id, jc_section_no, sr_no, spare_type, source,
            part_no, part_description, quantity, cost
       FROM jc_spares_used WHERE id = ? LIMIT 1`,
    [rowId],
  );
  return rows[0] || null;
}

async function insertRow({ sectionJobNo, spare_type, source, part_no, part_description, quantity, cost, createdByEmployeeId }) {
  const [[mx]] = await pool.query(
    `SELECT COALESCE(MAX(sr_no), 0) + 1 AS next_sr
       FROM jc_spares_used WHERE jc_section_no = ?`,
    [sectionJobNo],
  );
  // Normalise inputs.
  const tr = (s, n) => (s == null || s === '' ? null : String(s).slice(0, n));
  const num = (v) => (v == null || v === '' ? null : Number(v));
  const [r] = await pool.query(
    `INSERT INTO jc_spares_used
       (jc_section_no, sr_no, spare_type, source, part_no, part_description, quantity, cost, created_by_employee_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sectionJobNo,
      mx.next_sr,
      tr(spare_type, 120),
      source || 'CASH_PURCHASE',
      tr(part_no, 120),
      tr(part_description, 8000),
      num(quantity),
      num(cost),
      createdByEmployeeId,
    ],
  );
  return { id: r.insertId, sr_no: mx.next_sr };
}

const EDITABLE = ['spare_type', 'source', 'part_no', 'part_description', 'quantity', 'cost'];
async function updateRow(rowId, body) {
  const sets = [];
  const vals = [];
  for (const col of EDITABLE) {
    if (Object.prototype.hasOwnProperty.call(body, col)) {
      let v = body[col];
      if (col === 'quantity' || col === 'cost') {
        v = (v == null || v === '') ? null : Number(v);
      } else if (col === 'source') {
        // ENUM column — leave as-is or normalise to default.
        v = v == null || v === '' ? 'CASH_PURCHASE' : String(v).slice(0, 80);
      } else {
        v = (v == null || v === '') ? null : String(v).slice(0, col === 'part_description' ? 8000 : 120);
      }
      sets.push(`\`${col}\` = ?`);
      vals.push(v);
    }
  }
  if (sets.length === 0) return 0;
  vals.push(rowId);
  const [r] = await pool.query(
    `UPDATE jc_spares_used SET ${sets.join(', ')} WHERE id = ?`,
    vals,
  );
  return r.affectedRows;
}

async function deleteRow(rowId) {
  const [r] = await pool.query(`DELETE FROM jc_spares_used WHERE id = ?`, [rowId]);
  return r.affectedRows;
}

module.exports = { listForJc, findById, insertRow, updateRow, deleteRow };
