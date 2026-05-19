// ============================================================================
// src/modules/jobCards/taskChecklist/taskChecklist.repo.js
// ----------------------------------------------------------------------------
// DAL for jc_task_checklist + task_library. ONLY this file holds SQL.
//
// Tables touched:
//   jc_task_checklist   (read/write per-JC task instances)
//   task_library        (read-only — reference data for the dropdown)
// ============================================================================

'use strict';

const pool = require('../../../config/db');

// ── List per-JC tasks (Task Checklist tab, image 15) ────────────────
async function listTasksForJc(sectionJobNo) {
  const [rows] = await pool.query(
    `SELECT id, jc_section_no, task_id, task_text, is_custom,
            is_completed,
            completed_by_employee_id,
            completed_at,
            order_index,
            created_by_employee_id,
            created_at
       FROM jc_task_checklist
      WHERE jc_section_no = ?
      ORDER BY order_index ASC, id ASC`,
    [sectionJobNo],
  );
  return rows;
}

// ── Find a single library task by id (used by addTask 'library' path) ──
async function findLibraryTask(taskId) {
  const [rows] = await pool.query(
    `SELECT id, category, task_text, is_active
       FROM task_library
      WHERE id = ?
      LIMIT 1`,
    [taskId],
  );
  return rows[0] || null;
}

// ── Insert a new per-JC task ────────────────────────────────────────
/**
 * @param {import('mysql2/promise').PoolConnection | null} conn  Pass a conn
 *   for txn-scoped inserts. Pass null to use the shared pool (one-shot).
 */
async function insertTask(conn, { sectionJobNo, taskId, taskText, isCustom, createdByEmployeeId }) {
  const runner = conn || pool;
  // Next order_index = max + 1 (within this JC).
  const [[mx]] = await runner.query(
    `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_idx
       FROM jc_task_checklist WHERE jc_section_no = ?`,
    [sectionJobNo],
  );
  const [r] = await runner.query(
    `INSERT INTO jc_task_checklist
       (jc_section_no, task_id, task_text, is_custom, order_index, created_by_employee_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sectionJobNo, taskId || null, taskText, isCustom ? 1 : 0, mx.next_idx, createdByEmployeeId],
  );
  return r.insertId;
}

// ── Toggle completion ───────────────────────────────────────────────
async function setTaskCompletion(conn, taskRowId, { isCompleted, byEmployeeId }) {
  const runner = conn || pool;
  await runner.query(
    `UPDATE jc_task_checklist
        SET is_completed = ?,
            completed_by_employee_id = ?,
            completed_at = IF(? = 1, NOW(6), NULL)
      WHERE id = ?`,
    [isCompleted ? 1 : 0, isCompleted ? byEmployeeId : null, isCompleted ? 1 : 0, taskRowId],
  );
}

// ── Find a single task row (used by delete + toggle ownership checks) ──
async function findTaskById(taskRowId) {
  const [rows] = await pool.query(
    `SELECT id, jc_section_no, is_completed, created_by_employee_id
       FROM jc_task_checklist
      WHERE id = ?
      LIMIT 1`,
    [taskRowId],
  );
  return rows[0] || null;
}

// ── Delete a task row (hard delete — Q-5) ───────────────────────────
async function deleteTask(conn, taskRowId) {
  const runner = conn || pool;
  await runner.query(`DELETE FROM jc_task_checklist WHERE id = ?`, [taskRowId]);
}

// ── List library tasks for the dropdown (optionally filtered by category) ──
async function listLibrary(categoryOrNull) {
  if (categoryOrNull) {
    const [rows] = await pool.query(
      `SELECT id, category, task_text, display_order
         FROM task_library
        WHERE is_active = 1 AND category = ?
        ORDER BY display_order ASC, id ASC`,
      [categoryOrNull],
    );
    return rows;
  }
  const [rows] = await pool.query(
    `SELECT id, category, task_text, display_order
       FROM task_library
      WHERE is_active = 1
      ORDER BY category ASC, display_order ASC, id ASC`,
  );
  return rows;
}

module.exports = {
  listTasksForJc,
  findLibraryTask,
  insertTask,
  setTaskCompletion,
  findTaskById,
  deleteTask,
  listLibrary,
};
