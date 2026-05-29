// ============================================================================
// src/modules/jobCards/repair/repair.repo.js
// ----------------------------------------------------------------------------
// DAL for the dedicated TME/FPE repair workflow child tables.
// ============================================================================

'use strict';

const pool = require('../../../config/db');

async function listEquipmentRows(sectionJobNo) {
  const [rows] = await pool.query(
    `SELECT id, jc_section_no, sr_no, equipment_id, equipment_name,
            created_by_employee_id, created_at, updated_at
       FROM jc_repair_equipment_used
      WHERE jc_section_no = ?
      ORDER BY sr_no ASC, id ASC`,
    [sectionJobNo],
  );
  return rows;
}

async function findEquipmentRow(rowId) {
  const [rows] = await pool.query(
    `SELECT id, jc_section_no, sr_no, equipment_id, equipment_name
       FROM jc_repair_equipment_used
      WHERE id = ?
      LIMIT 1`,
    [rowId],
  );
  return rows[0] || null;
}

async function insertEquipmentRow({ sectionJobNo, equipment_id, equipment_name, createdByEmployeeId }) {
  const [[mx]] = await pool.query(
    `SELECT COALESCE(MAX(sr_no), 0) + 1 AS next_sr
       FROM jc_repair_equipment_used
      WHERE jc_section_no = ?`,
    [sectionJobNo],
  );
  const [r] = await pool.query(
    `INSERT INTO jc_repair_equipment_used
       (jc_section_no, sr_no, equipment_id, equipment_name, created_by_employee_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      sectionJobNo,
      mx.next_sr,
      equipment_id ? String(equipment_id).slice(0, 100) : null,
      equipment_name ? String(equipment_name).slice(0, 255) : null,
      createdByEmployeeId,
    ],
  );
  return { id: r.insertId, sr_no: mx.next_sr };
}

const EQUIPMENT_EDITABLE = ['equipment_id', 'equipment_name'];
async function updateEquipmentRow(rowId, body) {
  const sets = [];
  const vals = [];
  for (const col of EQUIPMENT_EDITABLE) {
    if (Object.prototype.hasOwnProperty.call(body, col)) {
      const max = col === 'equipment_id' ? 100 : 255;
      const v = body[col];
      sets.push(`\`${col}\` = ?`);
      vals.push(v == null || v === '' ? null : String(v).slice(0, max));
    }
  }
  if (sets.length === 0) return 0;
  vals.push(rowId);
  const [r] = await pool.query(
    `UPDATE jc_repair_equipment_used SET ${sets.join(', ')} WHERE id = ?`,
    vals,
  );
  return r.affectedRows;
}

async function deleteEquipmentRow(rowId) {
  const [r] = await pool.query('DELETE FROM jc_repair_equipment_used WHERE id = ?', [rowId]);
  return r.affectedRows;
}

module.exports = {
  listEquipmentRows,
  findEquipmentRow,
  insertEquipmentRow,
  updateEquipmentRow,
  deleteEquipmentRow,
};
