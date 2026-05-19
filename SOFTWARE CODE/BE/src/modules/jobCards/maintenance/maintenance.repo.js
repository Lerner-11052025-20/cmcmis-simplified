// ============================================================================
// src/modules/jobCards/maintenance/maintenance.repo.js
// ----------------------------------------------------------------------------
// DAL for jc_maintenance_details (Tab 4 multi-row table).
//
// Schema reference (from migration 301):
//   id BIGINT PK
//   jc_section_no varchar(9) FK → cmms_jobcard_mst
//   sr_no smallint
//   defect_description TEXT NOT NULL
//   observation, action_taken, remarks  TEXT NULL
//   created_by_employee_id varchar(7) NULL
//   created_at / updated_at  datetime(6)
// ============================================================================

'use strict';

const pool = require('../../../config/db');

// ── List all rows for a JC, sorted by sr_no then id ──
async function listForJc(sectionJobNo) {
  const [rows] = await pool.query(
    `SELECT id, jc_section_no, sr_no,
            defect_description, observation, action_taken, remarks,
            created_by_employee_id, created_at, updated_at
       FROM jc_maintenance_details
      WHERE jc_section_no = ?
      ORDER BY sr_no ASC, id ASC`,
    [sectionJobNo],
  );
  return rows;
}

async function findById(rowId) {
  const [rows] = await pool.query(
    `SELECT id, jc_section_no, sr_no,
            defect_description, observation, action_taken, remarks
       FROM jc_maintenance_details
      WHERE id = ?
      LIMIT 1`,
    [rowId],
  );
  return rows[0] || null;
}

// ── INSERT a new row. sr_no auto-computed as MAX(sr_no)+1 within this JC. ──
async function insertRow({ sectionJobNo, defect_description, observation, action_taken, remarks, createdByEmployeeId }) {
  const [[mx]] = await pool.query(
    `SELECT COALESCE(MAX(sr_no), 0) + 1 AS next_sr
       FROM jc_maintenance_details WHERE jc_section_no = ?`,
    [sectionJobNo],
  );
  const [r] = await pool.query(
    `INSERT INTO jc_maintenance_details
       (jc_section_no, sr_no, defect_description, observation, action_taken, remarks, created_by_employee_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      sectionJobNo,
      mx.next_sr,
      String(defect_description || '').slice(0, 8000),
      observation ? String(observation).slice(0, 8000) : null,
      action_taken ? String(action_taken).slice(0, 8000) : null,
      remarks ? String(remarks).slice(0, 8000) : null,
      createdByEmployeeId,
    ],
  );
  return { id: r.insertId, sr_no: mx.next_sr };
}

// ── UPDATE one row's editable fields (dynamic SET clause) ──
const EDITABLE = ['defect_description', 'observation', 'action_taken', 'remarks'];
async function updateRow(rowId, body) {
  const sets = [];
  const vals = [];
  for (const col of EDITABLE) {
    if (Object.prototype.hasOwnProperty.call(body, col)) {
      const v = body[col];
      sets.push(`\`${col}\` = ?`);
      vals.push(v == null || v === '' ? null : String(v).slice(0, 8000));
    }
  }
  if (sets.length === 0) return 0;
  vals.push(rowId);
  const [r] = await pool.query(
    `UPDATE jc_maintenance_details SET ${sets.join(', ')} WHERE id = ?`,
    vals,
  );
  return r.affectedRows;
}

// ── Hard delete (Q-5 — child-row deletes are not soft) ──
async function deleteRow(rowId) {
  const [r] = await pool.query(`DELETE FROM jc_maintenance_details WHERE id = ?`, [rowId]);
  return r.affectedRows;
}

module.exports = { listForJc, findById, insertRow, updateRow, deleteRow };
