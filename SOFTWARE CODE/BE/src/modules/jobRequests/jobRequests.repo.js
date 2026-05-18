// ============================================================================
// src/modules/jobRequests/jobRequests.repo.js  —  DAL for cmms_jobrequest_mst
// ----------------------------------------------------------------------------
// ONLY file in the jobRequests module that contains SQL. The service composes
// these helpers; controllers never query directly. multipleStatements is
// FALSE on the pool — every query uses `?` placeholders. Repos own the
// canonical ↔ legacy column aliasing (see SCHEMA_PHASE6.md).
//
// TABLES TOUCHED:
//   cmms_jobrequest_mst        — Job Requests master (read/write)
//   job_request_accessories    — child table (read/write, txn-scoped)
//   cmms_section_mst           — Divisions lookup (read-only JOIN)
//   cmms_emp_mst               — Submitter snapshot (read-only JOIN for list)
//   audit_log                  — Write-once audit row per state transition
// ============================================================================

'use strict';

const pool = require('../../config/db');

// ───────────────────────────────────────────────────────────────────────
//  Allow-lists (NEVER interpolate user input into SQL)
// ───────────────────────────────────────────────────────────────────────
// Maps the canonical `sort` query param to the real ORDER BY expression.
// Sort direction is encoded in the leading '-' (descending).
const SORT_MAP = {
  '-created_at':    'jr.JR_CREATED_AT DESC, jr.JR_JOBREQUESTNO DESC',
  'created_at':     'jr.JR_CREATED_AT ASC, jr.JR_JOBREQUESTNO ASC',
  '-priority':      "FIELD(jr.JR_PRIORITY, 'URGENT', 'HIGH', 'NORMAL', 'LOW') ASC, jr.JR_CREATED_AT DESC",
  'priority':       "FIELD(jr.JR_PRIORITY, 'LOW', 'NORMAL', 'HIGH', 'URGENT') ASC, jr.JR_CREATED_AT DESC",
  'request_code':   'jr.JR_JOBREQUESTDATE ASC, jr.JR_JOBREQUESTNO ASC',
  '-request_code':  'jr.JR_JOBREQUESTDATE DESC, jr.JR_JOBREQUESTNO DESC',
};

// Canonical priority enum (LOW/MEDIUM/HIGH) ↔ DB enum (LOW/NORMAL/HIGH/URGENT)
// See SCHEMA_PHASE6.md decision P6-D1.
const PRIORITY_CANONICAL_TO_DB = { LOW: 'LOW', MEDIUM: 'NORMAL', HIGH: 'HIGH' };
const PRIORITY_DB_TO_CANONICAL = {
  LOW: 'LOW',
  NORMAL: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'HIGH', // Legacy URGENT collapses to HIGH for display.
};

function toCanonicalPriority(dbVal) {
  return PRIORITY_DB_TO_CANONICAL[dbVal] || 'MEDIUM';
}
function toDbPriority(canonicalVal) {
  return PRIORITY_CANONICAL_TO_DB[canonicalVal] || 'NORMAL';
}

// ───────────────────────────────────────────────────────────────────────
//  LIST — keyset-friendly offset pagination with row-level scope
// ───────────────────────────────────────────────────────────────────────
/**
 * @param {Object} params  Validated listQuerySchema output
 * @param {Object} scope   req.scope from rowLevelScope middleware
 * @returns {Promise<{ rows: object[], total: number }>}
 */
async function listJobRequests(params, scope) {
  const where = [];
  const args = [];

  // Row-level scope filter — applied BEFORE user filters so MySQL can
  // exploit the (JR_SUBMITTEDBYID, JR_CREATED_AT DESC) covering index.
  if (!scope.canReadAll) {
    where.push('jr.JR_SUBMITTEDBYID = ?');
    args.push(scope.ownerEmployeeId);
  }

  if (params.q) {
    // LIKE-based search across the indexed string columns. We didn't
    // create a FULLTEXT index in Phase 6 Slice 1 (Phase 8 if needed).
    // Leading '%' defeats index seek but for slice-1 cardinality (<1k
    // expected rows in dev) the table-scan after the row-level filter
    // is still well under budget.
    where.push(`(
      jr.JR_JOBREQUESTNO LIKE ?
      OR jr.JR_EQM_NAME      LIKE ?
      OR jr.JR_EQM_SRNO      LIKE ?
      OR jr.JR_SUBMITTEDBYNAME LIKE ?
    )`);
    const like = `%${params.q}%`;
    args.push(like, like, like, like);
  }

  if (params.type) {
    where.push('jr.JR_JOB_TYPE = ?');
    args.push(params.type);
  }

  if (params.status) {
    where.push('jr.JR_MVP_STATUS = ?');
    args.push(params.status);
  }

  if (params.priority) {
    where.push('jr.JR_PRIORITY = ?');
    args.push(toDbPriority(params.priority));
  }

  if (params.division_id) {
    where.push('jr.JR_DIVISION = ?');
    args.push(params.division_id);
  }

  if (params.date_from) {
    where.push('jr.JR_CREATED_AT >= ?');
    args.push(params.date_from + ' 00:00:00');
  }
  if (params.date_to) {
    where.push('jr.JR_CREATED_AT <= ?');
    args.push(params.date_to + ' 23:59:59');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = SORT_MAP[params.sort] || SORT_MAP['-created_at'];
  const offset = (params.page - 1) * params.page_size;

  // Two queries — list + COUNT — both with the same WHERE clause. The
  // count query omits ORDER BY and LIMIT so MySQL can use a count-only
  // index plan. Run in parallel: same pool, independent connections.
  const dataSql = `
    SELECT
      jr.JR_JOBREQUESTNO                            AS jr_no,
      jr.JR_JOBREQUESTDATE                          AS submitted_at_legacy,
      jr.JR_CREATED_AT                              AS created_at,
      jr.JR_JOB_TYPE                                AS job_type,
      jr.JR_EQM_NAME                                AS equipment_name,
      jr.JR_DIVISION                                AS division_id,
      sm.SM_SHORTNAME                               AS division_code,
      jr.JR_SUBMITTEDBYNAME                         AS submitted_by_name,
      jr.JR_SUBMITTEDBYID                           AS submitted_by_employee_id,
      jr.JR_PRIORITY                                AS priority_db,
      jr.JR_MVP_STATUS                              AS status,
      jr.JR_MVP_STATUS_AT                           AS submitted_at
    FROM cmms_jobrequest_mst jr
    LEFT JOIN cmms_section_mst sm ON sm.SM_ID = jr.JR_DIVISION
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`;

  const countSql = `
    SELECT COUNT(*) AS n
    FROM cmms_jobrequest_mst jr
    ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, [...args, params.page_size, offset]),
    pool.query(countSql, args),
  ]);

  // Map DB priority → canonical for the FE.
  rows.forEach((r) => {
    r.priority = toCanonicalPriority(r.priority_db);
    delete r.priority_db;
  });

  return { rows, total: countRows[0].n };
}

// ───────────────────────────────────────────────────────────────────────
//  NEXT JR ID — pessimistic-locked MAX+1 inside the caller's transaction
// ───────────────────────────────────────────────────────────────────────
/**
 * JR_JOBREQUESTNO is INT NOT NULL but NOT AUTO_INCREMENT in the legacy
 * schema. Two concurrent inserts could compute the same MAX(...)+1 and
 * collide on the PK. We grab a SELECT FOR UPDATE row-lock to serialise
 * the read-then-write.
 *
 * @param {import('mysql2/promise').PoolConnection} conn  Inside a transaction
 * @returns {Promise<number>}
 */
async function nextJrNo(conn) {
  const [rows] = await conn.query(
    `SELECT COALESCE(MAX(JR_JOBREQUESTNO), 0) + 1 AS next_id
       FROM cmms_jobrequest_mst
       FOR UPDATE`,
  );
  return rows[0].next_id;
}

// ───────────────────────────────────────────────────────────────────────
//  INSERT a new Job Request — must run inside the caller's transaction
// ───────────────────────────────────────────────────────────────────────
/**
 * Insert with the *canonical* payload shape (service-layer). The repo
 * does the canonical→DB column rename + priority enum mapping here so
 * the service stays free of column names.
 *
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {Object} payload  Canonical create-JR data
 */
async function insertJobRequest(conn, payload) {
  // Truncate strings to legacy widths (see SCHEMA_PHASE6.md §2). The
  // service-layer zod schema enforces wider canonical maxes; this is
  // the boundary that fits the wider canonical into the narrower DB.
  const tr = (s, n) => (s == null ? null : String(s).slice(0, n));

  await conn.query(
    `INSERT INTO cmms_jobrequest_mst (
       JR_JOBREQUESTNO,
       JR_REQUEST_TYPE,
       JR_JOBREQUESTDATE,
       JR_EQM_ID, JR_EQM_TYPE, JR_EQM_NAME,
       JR_EQM_MFR_NAME, JR_EQM_MODELNO, JR_EQM_SRNO,
       JR_EQM_OPTNDESC,
       JR_SUBMITTEDBYID, JR_SUBMITTEDBYNAME,
       JR_PROJECTID, JR_SUBSYSTEM, JR_DESIGNATION, JR_DIVISION,
       JR_PHOENLAB, JR_PHONEROOM,
       JR_AFTERREPAIRS,
       JR_COMPLAINTANDSYMPTOMS,
       JR_REMARKS,
       Email,
       JR_MVP_STATUS, JR_MVP_STATUS_AT,
       JR_PRIORITY,
       JR_JOB_CATEGORY, JR_JOB_TYPE,
       JR_TNC_ACCEPTED_AT, JR_TNC_VERSION,
       JR_CREATED_AT, JR_UPDATED_AT
     ) VALUES (
       ?,
       ?,
       NOW(6),
       ?, ?, ?,
       ?, ?, ?,
       ?,
       ?, ?,
       ?, ?, ?, ?,
       ?, ?,
       ?,
       ?,
       ?,
       ?,
       ?, ?,
       ?,
       ?, ?,
       ?, ?,
       NOW(6), NOW(6)
     )`,
    [
      payload.jr_no,
      // Legacy JR_REQUEST_TYPE field stays for back-compat with legacy
      // reports; we mirror the canonical job_type into it for clarity.
      tr(payload.job_type, 25),
      payload.equipment_id ?? null,
      tr(payload.equipment_type || 'GEN', 15),
      tr(payload.equipment_name, 200),
      tr(payload.make, 100),
      tr(payload.model_no, 100),
      tr(payload.serial_no, 100),
      tr(payload.options_description, 200),
      tr(payload.submitted_by_employee_id, 7),
      tr(payload.submitted_by_name, 100),
      tr(payload.project_name, 100),
      tr(payload.subsystem, 100),
      tr(payload.submitted_by_designation, 100),
      payload.division_id,
      tr(payload.lab_phone, 100),
      tr(payload.room_phone, 100),
      payload.equipment_sent_after_repair ? 1 : 0,
      tr(payload.complaint_description, 400),
      tr(payload.remarks, 500),
      tr(payload.submitted_by_email, 300),
      // Status + status timestamp
      payload.status,                                  // 'DRAFT' or 'SUBMITTED'
      payload.status === 'SUBMITTED' ? new Date() : null,
      toDbPriority(payload.priority || 'MEDIUM'),
      payload.job_category || null,
      payload.job_type || null,
      // T&C — non-null only when this insert is already a SUBMITTED record
      // (Save-as-Draft path leaves T&C null; Submit-now path sets it).
      payload.tnc_accepted_at || null,
      payload.tnc_version || null,
    ],
  );
}

// ───────────────────────────────────────────────────────────────────────
//  FIND ONE — used by /:id/submit ownership check + audit row build
// ───────────────────────────────────────────────────────────────────────
async function findJrById(jrNo) {
  const [rows] = await pool.query(
    `SELECT
       JR_JOBREQUESTNO         AS jr_no,
       JR_JOBREQUESTDATE       AS submitted_at_legacy,
       JR_CREATED_AT           AS created_at,
       JR_MVP_STATUS           AS status,
       JR_SUBMITTEDBYID        AS submitted_by_employee_id,
       JR_SUBMITTEDBYNAME      AS submitted_by_name,
       JR_PRIORITY             AS priority_db,
       JR_JOB_CATEGORY         AS job_category,
       JR_JOB_TYPE             AS job_type,
       JR_COMPLAINTANDSYMPTOMS AS complaint_description,
       JR_TNC_ACCEPTED_AT      AS tnc_accepted_at,
       JR_TNC_VERSION          AS tnc_version
     FROM cmms_jobrequest_mst
     WHERE JR_JOBREQUESTNO = ?
     LIMIT 1`,
    [jrNo],
  );
  if (rows[0]) rows[0].priority = toCanonicalPriority(rows[0].priority_db);
  return rows[0] || null;
}

// ───────────────────────────────────────────────────────────────────────
//  TRANSITION — set status + status_at + (if SUBMITTED) tnc_*; same conn
// ───────────────────────────────────────────────────────────────────────
async function transitionStatus(conn, jrNo, newStatus, extras = {}) {
  // Build the SET clause dynamically based on which extras the caller
  // supplied — keeps the query narrow and the audit clean.
  const sets = ['JR_MVP_STATUS = ?', 'JR_MVP_STATUS_AT = NOW(6)', 'JR_UPDATED_AT = NOW(6)'];
  const args = [newStatus];

  if (extras.tnc_accepted_at) {
    sets.push('JR_TNC_ACCEPTED_AT = ?');
    args.push(extras.tnc_accepted_at);
  }
  if (extras.tnc_version) {
    sets.push('JR_TNC_VERSION = ?');
    args.push(extras.tnc_version);
  }
  if (extras.rejection_reason) {
    // Phase 7 only — slice 1 never sets this. Wired now to lock the
    // column we'd otherwise have to plumb through later.
    sets.push('JR_REJECTION_REASON = ?');
    args.push(extras.rejection_reason);
  }

  args.push(jrNo);
  await conn.query(
    `UPDATE cmms_jobrequest_mst SET ${sets.join(', ')} WHERE JR_JOBREQUESTNO = ?`,
    args,
  );
}

// ───────────────────────────────────────────────────────────────────────
//  STATE HISTORY — append a row inside the caller's transaction
// ───────────────────────────────────────────────────────────────────────
async function appendStatusHistory(conn, jrNo, fromStatus, toStatus, actorEmpId, reason = null) {
  await conn.query(
    `INSERT INTO job_request_status_history
       (jr_no, from_status, to_status, transitioned_at, transitioned_by, reason)
     VALUES (?, ?, ?, NOW(6), ?, ?)`,
    [jrNo, fromStatus, toStatus, actorEmpId, reason],
  );
}

// ───────────────────────────────────────────────────────────────────────
//  ACCESSORIES — child table read/write
// ───────────────────────────────────────────────────────────────────────
/**
 * Replace the entire accessory list for a JR inside the create txn.
 * Safe because the create flow is the only writer in slice 1.
 */
async function replaceAccessories(conn, jrNo, accessories) {
  await conn.query('DELETE FROM job_request_accessories WHERE jr_no = ?', [jrNo]);
  if (!accessories || accessories.length === 0) return;

  // Bulk INSERT — single round-trip even for 20 rows.
  const rows = accessories.map((a, idx) => [
    jrNo,
    String(a.type || '').slice(0, 60),
    String(a.name || '').slice(0, 120),
    a.serial_no ? String(a.serial_no).slice(0, 120) : null,
    idx,
  ]);
  await conn.query(
    `INSERT INTO job_request_accessories
       (jr_no, accessory_type, accessory_name, serial_no, position)
     VALUES ?`,
    [rows],
  );
}

// ───────────────────────────────────────────────────────────────────────
//  AUDIT LOG — write one row inside the caller's transaction
// ───────────────────────────────────────────────────────────────────────
/**
 * Audit `notes` column is VARCHAR(500). Stuffs the structured detail as
 * JSON, truncating heavy free-text first. Mirrors equipment.repo.buildAuditNotes.
 */
function buildAuditNotes(details) {
  const compact = { ...details };
  if (typeof compact.complaint_description === 'string') {
    compact.complaint_description = compact.complaint_description.slice(0, 200);
  }
  let s = JSON.stringify(compact);
  if (s.length > 500) s = s.slice(0, 497) + '...';
  return s;
}

async function writeAuditLog(conn, { actorEmployeeId, actorRoleCode, action, jrNo, ipAddress, userAgent, details }) {
  await conn.query(
    `INSERT INTO audit_log
       (action, actor_employee_id, actor_role_code, entity_type, entity_id, ip_address, user_agent, notes, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
    [
      action,
      actorEmployeeId,
      actorRoleCode || null,
      'job_request',
      String(jrNo),
      ipAddress || null,
      userAgent || null,
      buildAuditNotes(details || {}),
    ],
  );
}

module.exports = {
  listJobRequests,
  nextJrNo,
  insertJobRequest,
  findJrById,
  transitionStatus,
  appendStatusHistory,
  replaceAccessories,
  writeAuditLog,
  // exports used by tests and dropdown population
  PRIORITY_CANONICAL_TO_DB,
  PRIORITY_DB_TO_CANONICAL,
  toCanonicalPriority,
  toDbPriority,
};
