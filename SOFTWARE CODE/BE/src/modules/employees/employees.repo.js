// ============================================================================
// src/modules/employees/employees.repo.js  —  DAL for cmms_emp_mst (legacy)
// ----------------------------------------------------------------------------
// ONLY file in the employees module that contains SQL. All canonical
// aliasing happens here (see SCHEMA_PHASE7.md §3). The service / controller
// / FE speak ONLY canonical names (employee_id, full_name, …, is_active).
//
// TABLES TOUCHED
//   cmms_emp_mst       — primary read/write target
//   cmms_section_mst   — JOIN for division code/name
//   users              — JOIN for has_account / user is_active (LEFT)
//   audit_log          — same-tx audit writes
// ============================================================================

'use strict';

const pool = require('../../config/db');

const SORT_MAP = {
  'full_name':    'e.EMM_NAME ASC, e.EMM_ID ASC',
  '-full_name':   'e.EMM_NAME DESC, e.EMM_ID DESC',
  'employee_id':  'e.EMM_ID ASC',
  '-employee_id': 'e.EMM_ID DESC',
  '-created_at':  'e.EMM_CREATED_ON DESC, e.EMM_ID DESC',
  'created_at':   'e.EMM_CREATED_ON ASC, e.EMM_ID ASC',
};

// ───────────────────────────────────────────────────────────────────────
//  LIST
// ───────────────────────────────────────────────────────────────────────
async function listEmployees(params) {
  const where = [];
  const args = [];

  if (params.q) {
    where.push(`(
      e.EMM_ID          LIKE ?
      OR e.EMM_NAME     LIKE ?
      OR e.EMM_EMAIL    LIKE ?
      OR e.EMM_DESIGNATION LIKE ?
    )`);
    const like = `%${params.q}%`;
    args.push(like, like, like, like);
  }
  if (params.is_active !== undefined) {
    // Canonical is_active = (1 - EMM_INACTIVE)
    const wantActive = (params.is_active === '1' || params.is_active === 'true') ? 1 : 0;
    where.push('e.EMM_INACTIVE = ?');
    args.push(wantActive === 1 ? 0 : 1);
  }
  if (params.division_id) {
    where.push('e.EMM_DEPT = ?');
    args.push(params.division_id);
  }
  if (params.has_account !== undefined) {
    const wantAccount = (params.has_account === '1' || params.has_account === 'true');
    where.push(wantAccount ? 'u.user_id IS NOT NULL' : 'u.user_id IS NULL');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = SORT_MAP[params.sort] || SORT_MAP['full_name'];
  const offset = (params.page - 1) * params.page_size;

  const fromAndJoins = `
    FROM cmms_emp_mst e
    LEFT JOIN cmms_section_mst sec ON sec.SM_ID = e.EMM_DEPT
    LEFT JOIN users u ON u.employee_id = e.EMM_ID
  `;

  const dataSql = `
    SELECT
      e.EMM_ID                  AS employee_id,
      e.EMM_NAME                AS full_name,
      e.EMM_DESIGNATION         AS designation,
      e.EMM_EMAIL               AS email,
      e.EMM_MOBILE              AS mobile,
      e.EMM_PH1                 AS lab_phone,
      e.EMM_PH2                 AS room_phone,
      e.EMM_DEPT                AS division_id,
      sec.SM_SHORTNAME          AS division_code,
      sec.SM_NAME               AS division_name,
      (1 - e.EMM_INACTIVE)      AS is_active,
      e.EMM_CREATED_ON          AS created_at,
      e.EMM_UPDATED_ON          AS updated_at,
      e.EMM_DEACTIVATED_AT      AS deactivated_at,
      u.user_id                 AS user_id,
      u.is_active               AS user_is_active
    ${fromAndJoins}
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`;

  const countSql = `SELECT COUNT(*) AS n ${fromAndJoins} ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, [...args, params.page_size, offset]),
    pool.query(countSql, args),
  ]);
  return { rows, total: countRows[0].n };
}

// ───────────────────────────────────────────────────────────────────────
//  FIND BY ID
// ───────────────────────────────────────────────────────────────────────
async function findEmployeeById(employeeId) {
  const [rows] = await pool.query(
    `SELECT
       e.EMM_ID                  AS employee_id,
       e.EMM_NAME                AS full_name,
       e.EMM_DESIGNATION         AS designation,
       e.EMM_DESIGDATE           AS designation_date,
       e.EMM_DOB                 AS date_of_birth,
       e.EMM_DOJ                 AS date_of_joining,
       e.EMM_BLOODGRP            AS blood_group,
       e.EMM_ADD                 AS address,
       e.EMM_CITY                AS city,
       e.EMM_STATE               AS state,
       e.EMM_ZIP                 AS zip,
       e.EMM_PH1                 AS lab_phone,
       e.EMM_PH2                 AS room_phone,
       e.EMM_EMAIL               AS email,
       e.EMM_MOBILE              AS mobile,
       e.EMM_REMARKS             AS remarks,
       e.EMM_DEPT                AS division_id,
       sec.SM_SHORTNAME          AS division_code,
       sec.SM_NAME               AS division_name,
       (1 - e.EMM_INACTIVE)      AS is_active,
       e.EMM_CREATED_BY          AS created_by_employee_id,
       e.EMM_CREATED_ON          AS created_at,
       e.EMM_UPDATED_BY          AS updated_by_employee_id,
       e.EMM_UPDATED_ON          AS updated_at,
       e.EMM_DEACTIVATED_AT      AS deactivated_at,
       u.user_id                 AS user_id,
       u.is_active               AS user_is_active
     FROM cmms_emp_mst e
     LEFT JOIN cmms_section_mst sec ON sec.SM_ID = e.EMM_DEPT
     LEFT JOIN users u ON u.employee_id = e.EMM_ID
     WHERE e.EMM_ID = ?
     LIMIT 1`,
    [employeeId],
  );
  return rows[0] || null;
}

// ───────────────────────────────────────────────────────────────────────
//  CREATE — INSERT a new cmms_emp_mst row
// ───────────────────────────────────────────────────────────────────────
async function insertEmployee(conn, payload) {
  const tr = (s, n) => (s == null || s === '' ? null : String(s).slice(0, n));
  const date = (s) => (s ? new Date(s) : null);

  await conn.query(
    `INSERT INTO cmms_emp_mst (
       EMM_ID, EMM_NAME, EMM_DESIGNATION,
       EMM_DOB, EMM_DOJ, EMM_BLOODGRP,
       EMM_ADD, EMM_CITY, EMM_STATE, EMM_ZIP,
       EMM_PH1, EMM_PH2, EMM_EMAIL, EMM_MOBILE,
       EMM_DEPT, EMM_REMARKS, EMM_INACTIVE,
       EMM_CREATED_BY, EMM_CREATED_ON, EMM_UPDATED_BY, EMM_UPDATED_ON
     ) VALUES (
       ?, ?, ?,
       ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, 0,
       ?, NOW(6), ?, NOW(6)
     )`,
    [
      payload.employee_id, tr(payload.full_name, 100), tr(payload.designation, 200),
      date(payload.date_of_birth), date(payload.date_of_joining), tr(payload.blood_group, 50),
      tr(payload.address, 200), tr(payload.city, 100), tr(payload.state, 100), tr(payload.zip, 100),
      tr(payload.lab_phone, 100), tr(payload.room_phone, 100), tr(payload.email, 100), tr(payload.mobile, 100),
      payload.division_id, tr(payload.remarks, 500),
      payload.actor_employee_id, payload.actor_employee_id,
    ],
  );
}

// ───────────────────────────────────────────────────────────────────────
//  UPDATE — PATCH semantics, only the fields the user sent
// ───────────────────────────────────────────────────────────────────────
async function updateEmployee(conn, employeeId, patch, actorEmployeeId) {
  // Build the SET clause dynamically — only columns the caller actually
  // supplied get touched. Empty strings (from FE optional-or-empty) are
  // normalised to NULL so we don't overwrite a real value with ''.
  const tr = (s, n) => (s == null || s === '' ? null : String(s).slice(0, n));
  const date = (s) => (s ? new Date(s) : null);

  const sets = [];
  const args = [];

  const map = {
    full_name:        ['EMM_NAME',        tr(patch.full_name, 100)],
    designation:      ['EMM_DESIGNATION', tr(patch.designation, 200)],
    division_id:      ['EMM_DEPT',        patch.division_id],
    email:            ['EMM_EMAIL',       tr(patch.email, 100)],
    mobile:           ['EMM_MOBILE',      tr(patch.mobile, 100)],
    lab_phone:        ['EMM_PH1',         tr(patch.lab_phone, 100)],
    room_phone:       ['EMM_PH2',         tr(patch.room_phone, 100)],
    blood_group:      ['EMM_BLOODGRP',    tr(patch.blood_group, 50)],
    address:          ['EMM_ADD',         tr(patch.address, 200)],
    city:             ['EMM_CITY',        tr(patch.city, 100)],
    state:            ['EMM_STATE',       tr(patch.state, 100)],
    zip:              ['EMM_ZIP',         tr(patch.zip, 100)],
    remarks:          ['EMM_REMARKS',     tr(patch.remarks, 500)],
    date_of_birth:    ['EMM_DOB',         date(patch.date_of_birth)],
    date_of_joining:  ['EMM_DOJ',         date(patch.date_of_joining)],
  };
  for (const k of Object.keys(map)) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      const [col, val] = map[k];
      sets.push(`${col} = ?`);
      args.push(val);
    }
  }
  if (sets.length === 0) {
    // Nothing to update — caller-side guard would have already returned
    // NO_CHANGE, but we defend here too.
    return;
  }
  sets.push('EMM_UPDATED_BY = ?');
  args.push(actorEmployeeId);
  sets.push('EMM_UPDATED_ON = NOW(6)');

  args.push(employeeId);
  await conn.query(
    `UPDATE cmms_emp_mst SET ${sets.join(', ')} WHERE EMM_ID = ?`,
    args,
  );
}

// ───────────────────────────────────────────────────────────────────────
//  SOFT-DELETE  — flips EMM_INACTIVE 0→1 and stamps EMM_DEACTIVATED_AT
// ───────────────────────────────────────────────────────────────────────
async function softDeleteEmployee(conn, employeeId, actorEmployeeId) {
  await conn.query(
    `UPDATE cmms_emp_mst
        SET EMM_INACTIVE         = 1,
            EMM_DEACTIVATED_AT   = NOW(6),
            EMM_UPDATED_BY       = ?,
            EMM_UPDATED_ON       = NOW(6)
      WHERE EMM_ID = ?`,
    [actorEmployeeId, employeeId],
  );
}

// ───────────────────────────────────────────────────────────────────────
//  AUDIT LOG  — JSON-stuffed notes, ≤500 chars
// ───────────────────────────────────────────────────────────────────────
function buildAuditNotes(details) {
  let s = JSON.stringify(details || {});
  if (s.length > 500) s = s.slice(0, 497) + '...';
  return s;
}

async function writeAudit(conn, { actorEmployeeId, actorRoleCode, action, employeeId, ipAddress, userAgent, details }) {
  await conn.query(
    `INSERT INTO audit_log
       (action, actor_employee_id, actor_role_code, entity_type, entity_id, ip_address, user_agent, notes, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
    [
      action,
      actorEmployeeId,
      actorRoleCode || null,
      'employee',
      String(employeeId),
      ipAddress || null,
      userAgent || null,
      buildAuditNotes(details),
    ],
  );
}

module.exports = {
  listEmployees,
  findEmployeeById,
  insertEmployee,
  updateEmployee,
  softDeleteEmployee,
  writeAudit,
};
