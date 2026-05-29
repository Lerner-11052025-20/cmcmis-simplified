// ============================================================================
// src/modules/schedule/schedule.repo.js  —  DAL for schedules
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// ONLY file in the schedule module that contains SQL. Everything else
// speaks CANONICAL field names. Repo aliasing doctrine inherited from
// Phases 6+.
//
// TABLES TOUCHED:
//   schedules                   — own master (read/write)
//   schedule_status_history     — child (write, txn-scoped)
//   audit_log                   — generic audit (write, txn-scoped)
//   cmms_eqip_mst               — soft-FK validation (read-only)
//   cmms_emp_mst                — engineer label lookup (read-only)
// ============================================================================

'use strict';

const pool = require('../../config/db');


// ───────────────────────────────────────────────────────────────────────
//  CODE GENERATOR  —  schedule_code stamping
// ───────────────────────────────────────────────────────────────────────
/**
 * Build the next display code for a (type, year) slice. Format:
 *   CAL  → CAL-YYYY-MM-NN     where MM = scheduled month, NN = seq in year
 *   PM   → PM-YYYY-Qn-NN      where Qn = quarter of scheduled month
 *
 * The sequence counter is computed under a FOR UPDATE row lock to make
 * concurrent inserts safe. The lock target is a small "tally" subquery
 * — `SELECT COUNT(*) ... FOR UPDATE` on a small set is cheap, and the
 * outer INSERT immediately writes the chosen code so the next caller
 * sees the new count.
 *
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {string} scheduleType  'PREVENTIVE_MAINTENANCE' | 'CALIBRATION'
 * @param {string} scheduledDate YYYY-MM-DD
 * @returns {Promise<string>}    e.g. "CAL-2026-04-01" / "PM-2026-Q2-01"
 */
async function nextScheduleCode(conn, scheduleType, scheduledDate) {
  const [yyyy, mm] = scheduledDate.split('-');
  const yearNum  = parseInt(yyyy, 10);
  const monthNum = parseInt(mm,   10);
  const prefix = scheduleType === 'CALIBRATION' ? 'CAL' : 'PM';

  // For the COUNT we use YEAR(scheduled_date) which evaluates per row
  // — idx_sched_type_date provides (type, date) so the planner can range-
  // scan it. Cardinality is bounded (few thousand rows per year max).
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n
       FROM schedules
      WHERE schedule_type = ?
        AND YEAR(scheduled_date) = ?
      FOR UPDATE`,
    [scheduleType, yearNum],
  );
  const seq = Number(rows[0].n) + 1;
  const padded = String(seq).padStart(2, '0');

  if (prefix === 'CAL') {
    return `CAL-${yearNum}-${String(monthNum).padStart(2, '0')}-${padded}`;
  }
  const quarter = Math.ceil(monthNum / 3);   // 1..4
  return `PM-${yearNum}-Q${quarter}-${padded}`;
}


// ───────────────────────────────────────────────────────────────────────
//  SOFT-FK CHECKS  —  equipment + engineer existence
// ───────────────────────────────────────────────────────────────────────
/**
 * Validate that the composite EQM_TYPE-EQM_ID exists in cmms_eqip_mst.
 * Returns the joined display row (incl. type_name, EQM_CAL_DUE_DATE) on
 * hit, NULL on miss. Service throws 400 on null.
 *
 * @param {string} compositeId   e.g. "EQM-12345" / "MISC-9001"
 * @returns {Promise<object|null>}
 */
async function findEquipmentByCompositeId(compositeId) {
  // The composite is split on the FIRST '-' only — EQM_TYPE never
  // contains '-' in legacy data (3-4 char codes only).
  const dash = compositeId.indexOf('-');
  if (dash < 1) return null;
  const eqmType = compositeId.slice(0, dash);
  const eqmId   = compositeId.slice(dash + 1);
  const [rows] = await pool.query(
    `SELECT
       CONCAT(e.EQM_TYPE, '-', e.EQM_ID)    AS equipment_id,
       e.EQM_NAME                            AS name,
       e.EQM_CAL_DUE_DATE                    AS cal_due_date,
       p.PROD_NAME                           AS type_name
     FROM cmms_eqip_mst e
     LEFT JOIN cmms_product_mst p ON p.PROD_ID = e.EQM_INST_TYPE
     WHERE e.EQM_TYPE = ? AND e.EQM_ID = ?
     LIMIT 1`,
    [eqmType, eqmId],
  );
  return rows[0] || null;
}

/**
 * Validate engineer existence (employee_id). The schedule allows ANY
 * employee — not strictly a LAB_ENGINEER — because PM work can be
 * assigned to support staff too. We just confirm the employee exists.
 *
 * @param {string} employeeId
 * @returns {Promise<object|null>}
 */
async function findEmployeeByEmployeeId(employeeId) {
  if (!employeeId) return null;
  const [rows] = await pool.query(
    `SELECT EMM_ID AS employee_id, COALESCE(EMM_NAME, EMM_ID) AS full_name
       FROM cmms_emp_mst
      WHERE EMM_ID = ?
      LIMIT 1`,
    [employeeId],
  );
  return rows[0] || null;
}


// ───────────────────────────────────────────────────────────────────────
//  LIST + CALENDAR  (calendar = bigger page_size, same query)
// ───────────────────────────────────────────────────────────────────────
/**
 * List schedules with filters. `params` is the validator output. The
 * SQL builds the WHERE incrementally with ? placeholders — no string
 * interpolation. ORDER BY uses an allow-listed expression.
 *
 * @param {Object} params
 * @returns {Promise<{ rows: object[], total: number }>}
 */
async function listSchedules(params) {
  const where = [];
  const args  = [];

  if (params.type)     { where.push('s.schedule_type = ?');                  args.push(params.type); }
  if (params.status)   { where.push('s.status = ?');                          args.push(params.status); }
  if (params.engineer) { where.push('s.assigned_engineer_employee_id = ?');   args.push(params.engineer); }
  if (params.from)     { where.push('s.scheduled_date >= ?');                 args.push(params.from); }
  if (params.to)       { where.push('s.scheduled_date <= ?');                 args.push(params.to); }
  if (params.q) {
    where.push('(s.schedule_code LIKE ? OR s.equipment_label LIKE ? OR s.notes LIKE ?)');
    const like = `%${params.q}%`;
    args.push(like, like, like);
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (params.page - 1) * params.page_size;

  const dataSql = `
    SELECT
      s.id,
      s.schedule_code,
      s.schedule_type,
      s.equipment_id,
      s.equipment_label,
      s.scheduled_date,
      s.priority,
      s.status,
      s.assigned_engineer_employee_id,
      COALESCE(e.EMM_NAME, s.assigned_engineer_employee_id) AS assigned_engineer_name,
      s.recurrence,
      s.notes,
      s.created_by_employee_id,
      s.created_at,
      s.updated_at
    FROM schedules s
    LEFT JOIN cmms_emp_mst e ON e.EMM_ID = s.assigned_engineer_employee_id
    ${whereSql}
    ORDER BY s.scheduled_date ASC, s.id ASC
    LIMIT ? OFFSET ?`;

  const countSql = `SELECT COUNT(*) AS n FROM schedules s ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql,  [...args, params.page_size, offset]),
    pool.query(countSql, args),
  ]);

  return { rows, total: Number(countRows[0].n) || 0 };
}


// ───────────────────────────────────────────────────────────────────────
//  DETAIL
// ───────────────────────────────────────────────────────────────────────
/**
 * Single schedule with engineer label JOIN. Returns null when not found.
 */
async function findById(id) {
  const [rows] = await pool.query(
    `SELECT
      s.*,
      COALESCE(e.EMM_NAME, s.assigned_engineer_employee_id) AS assigned_engineer_name
     FROM schedules s
     LEFT JOIN cmms_emp_mst e ON e.EMM_ID = s.assigned_engineer_employee_id
     WHERE s.id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}


// ───────────────────────────────────────────────────────────────────────
//  WRITES  (all transactional — caller passes the txn conn)
// ───────────────────────────────────────────────────────────────────────
/**
 * Insert one schedule row. The `schedule_code` MUST already be computed
 * by nextScheduleCode() before this is called.
 */
async function insertSchedule(conn, row) {
  const [result] = await conn.query(
    `INSERT INTO schedules
       (schedule_code, schedule_type, equipment_id, equipment_label,
        scheduled_date, priority, status,
        assigned_engineer_employee_id, recurrence, notes,
        created_by_employee_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.schedule_code,
      row.schedule_type,
      row.equipment_id,
      row.equipment_label || null,
      row.scheduled_date,
      row.priority || 'MEDIUM',
      row.status   || 'PLANNED',
      row.assigned_engineer_employee_id || null,
      row.recurrence || 'NONE',
      row.notes || null,
      row.created_by_employee_id,
    ],
  );
  return result.insertId;
}

/**
 * Partial UPDATE. `patch` is the validator output of editSchema — we map
 * only the keys present so untouched columns stay untouched.
 */
async function updateSchedule(conn, id, patch, actorEmployeeId) {
  const sets = [];
  const args = [];
  if (patch.equipment_id     !== undefined) { sets.push('equipment_id = ?');                  args.push(patch.equipment_id); }
  if (patch.equipment_label  !== undefined) { sets.push('equipment_label = ?');                args.push(patch.equipment_label || null); }
  if (patch.scheduled_date   !== undefined) { sets.push('scheduled_date = ?');                 args.push(patch.scheduled_date); }
  if (patch.priority         !== undefined) { sets.push('priority = ?');                       args.push(patch.priority); }
  if (patch.assigned_engineer_employee_id !== undefined) {
    sets.push('assigned_engineer_employee_id = ?');
    args.push(patch.assigned_engineer_employee_id || null);
  }
  if (patch.recurrence       !== undefined) { sets.push('recurrence = ?');                     args.push(patch.recurrence); }
  if (patch.notes            !== undefined) { sets.push('notes = ?');                          args.push(patch.notes || null); }
  // Always stamp updated_by + updated_at.
  sets.push('updated_by_employee_id = ?'); args.push(actorEmployeeId);
  sets.push('updated_at = NOW(6)');

  args.push(id);

  const [result] = await conn.query(
    `UPDATE schedules SET ${sets.join(', ')} WHERE id = ?`,
    args,
  );
  return result.affectedRows;
}

/**
 * Direct status flip + denormalised stamp. The history row + audit are
 * appended SEPARATELY (single-responsibility per write).
 */
async function transitionStatus(conn, id, toStatus, actorEmployeeId) {
  const [result] = await conn.query(
    `UPDATE schedules
        SET status = ?,
            updated_by_employee_id = ?,
            updated_at = NOW(6)
      WHERE id = ?`,
    [toStatus, actorEmployeeId, id],
  );
  return result.affectedRows;
}

/**
 * Lazy DUE-flip — used by the read path. Idempotent (only fires when
 * persisted PLANNED/SCHEDULED + date in past). Called OUTSIDE a txn
 * since the read controller may not have one open.
 */
async function lazyMarkDue(id) {
  const [result] = await pool.query(
    `UPDATE schedules
        SET status = 'DUE'
      WHERE id = ?
        AND status IN ('PLANNED','SCHEDULED')
        AND scheduled_date <= CURDATE()`,
    [id],
  );
  return result.affectedRows;
}

async function appendStatusHistory(conn, scheduleId, from, to, actorEmployeeId, reason) {
  await conn.query(
    `INSERT INTO schedule_status_history
       (schedule_id, from_status, to_status, actor_employee_id, reason)
     VALUES (?, ?, ?, ?, ?)`,
    [scheduleId, from || null, to, actorEmployeeId, reason || null],
  );
}

/**
 * Append a row to the central audit_log. Entity_type='schedule' is the
 * Phase-13 namespace; the action verbs are written by callers (eg.
 * 'SCHEDULE_CREATE', 'SCHEDULE_UPDATE', 'SCHEDULE_TRANSITION').
 */
async function writeAuditLog(conn, { actorEmployeeId, actorRoleCode, action, scheduleId, ipAddress, userAgent, details }) {
  await conn.query(
    `INSERT INTO audit_log
       (action, actor_employee_id, actor_role_code, entity_type, entity_id, ip_address, user_agent, notes, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
    [
      action,
      actorEmployeeId,
      actorRoleCode || null,
      'schedule',
      String(scheduleId),
      ipAddress || null,
      userAgent || null,
      stringifyNotes(details || {}),
    ],
  );
}

function stringifyNotes(details) {
  let s = JSON.stringify(details);
  if (s.length > 500) s = s.slice(0, 497) + '...';
  return s;
}


module.exports = {
  // Reads
  findEquipmentByCompositeId,
  findEmployeeByEmployeeId,
  listSchedules,
  findById,
  // Writes (txn-scoped)
  nextScheduleCode,
  insertSchedule,
  updateSchedule,
  transitionStatus,
  lazyMarkDue,
  appendStatusHistory,
  writeAuditLog,
};
