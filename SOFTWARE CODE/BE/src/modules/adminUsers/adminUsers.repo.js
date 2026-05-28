// ============================================================================
// src/modules/adminUsers/adminUsers.repo.js  —  DAL for users + role + history
// ----------------------------------------------------------------------------
// ONLY file in the adminUsers module that contains SQL. Service composes
// these functions; controllers never query directly. multipleStatements
// is FALSE on the pool — every query uses `?` placeholders.
//
// TABLES TOUCHED
//   users                 — primary write target (role change bumps token_version)
//   user_roles            — junction with the role_id  (single source of truth)
//   roles                 — lookup for role_code ↔ role_id
//   cmms_emp_mst          — JOIN for employee snapshot (name, email, designation)
//   cmms_section_mst      — JOIN for division code/name
//   user_role_history     — append-only audit-grade transition log
//   audit_log             — generic audit row (Doctrine 6 — same tx)
// ============================================================================

'use strict';

const pool = require('../../config/db');
const { defaultLaneForRole } = require('../../utils/lanes');

// Whitelisted ORDER BY targets. NEVER interpolate user input into SQL.
const SORT_MAP = {
  '-created_at':  'u.created_at DESC, u.user_id DESC',
  'created_at':   'u.created_at ASC, u.user_id ASC',
  'employee_id':  'u.employee_id ASC',
  '-employee_id': 'u.employee_id DESC',
  'full_name':    'e.EMM_NAME ASC',
  '-full_name':   'e.EMM_NAME DESC',
};

// ───────────────────────────────────────────────────────────────────────
//  LIST  — pagination + filter + sort
// ───────────────────────────────────────────────────────────────────────
async function listUsers(params) {
  const where = [];
  const args = [];

  if (params.q) {
    where.push(`(
      u.employee_id     LIKE ?
      OR e.EMM_NAME     LIKE ?
      OR e.EMM_EMAIL    LIKE ?
    )`);
    const like = `%${params.q}%`;
    args.push(like, like, like);
  }
  if (params.role) {
    where.push('r.role_code = ?');
    args.push(params.role);
  }
  if (params.is_active !== undefined) {
    const active = (params.is_active === '1' || params.is_active === 'true') ? 1 : 0;
    where.push('u.is_active = ?');
    args.push(active);
  }
  if (params.division_id) {
    where.push('e.EMM_DEPT = ?');
    args.push(params.division_id);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = SORT_MAP[params.sort] || SORT_MAP['-created_at'];
  const offset = (params.page - 1) * params.page_size;

  // Both queries share the SAME FROM + JOIN tree — see Phase 6 jobCards bug
  // for what happens when they drift apart.
  const fromAndJoins = `
    FROM users u
    LEFT JOIN user_roles      ur ON ur.user_id = u.user_id
    LEFT JOIN roles           r  ON r.role_id  = ur.role_id
    LEFT JOIN (
      SELECT user_id, GROUP_CONCAT(lane_code ORDER BY lane_code) AS lane_scopes
        FROM user_lane_scopes
       GROUP BY user_id
    ) lanes ON lanes.user_id = u.user_id
    LEFT JOIN cmms_emp_mst    e  ON e.EMM_ID   = u.employee_id
    LEFT JOIN cmms_section_mst sec ON sec.SM_ID = e.EMM_DEPT
  `;

  const dataSql = `
    SELECT
      u.user_id                                AS id,
      u.employee_id                            AS employee_id,
      e.EMM_NAME                               AS full_name,
      e.EMM_DESIGNATION                        AS designation,
      e.EMM_EMAIL                              AS email,
      e.EMM_DEPT                               AS division_id,
      sec.SM_SHORTNAME                         AS division_code,
      sec.SM_NAME                              AS division_name,
      r.role_code                              AS role,
      lanes.lane_scopes                        AS lane_scopes,
      u.is_active                              AS is_active,
      u.is_locked                              AS is_locked,
      u.last_login_at                          AS last_login_at,
      u.created_at                             AS created_at,
      u.deactivated_at                         AS deactivated_at,
      u.token_version                          AS token_version
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
//  FIND BY ID  — used by every mutation endpoint
// ───────────────────────────────────────────────────────────────────────
async function findUserById(userId) {
  const [rows] = await pool.query(
    `SELECT
       u.user_id                                AS id,
       u.employee_id                            AS employee_id,
       e.EMM_NAME                               AS full_name,
       e.EMM_DESIGNATION                        AS designation,
       e.EMM_EMAIL                              AS email,
       e.EMM_DEPT                               AS division_id,
       sec.SM_SHORTNAME                         AS division_code,
       sec.SM_NAME                              AS division_name,
       r.role_code                              AS role,
       lanes.lane_scopes                        AS lane_scopes,
       u.is_active                              AS is_active,
       u.is_locked                              AS is_locked,
       u.last_login_at                          AS last_login_at,
       u.token_version                          AS token_version,
       u.created_at                             AS created_at,
       u.deactivated_at                         AS deactivated_at,
       u.deactivation_reason                    AS deactivation_reason
     FROM users u
     LEFT JOIN user_roles       ur ON ur.user_id = u.user_id
     LEFT JOIN roles            r  ON r.role_id  = ur.role_id
     LEFT JOIN (
       SELECT user_id, GROUP_CONCAT(lane_code ORDER BY lane_code) AS lane_scopes
         FROM user_lane_scopes
        GROUP BY user_id
     ) lanes ON lanes.user_id = u.user_id
     LEFT JOIN cmms_emp_mst     e  ON e.EMM_ID   = u.employee_id
     LEFT JOIN cmms_section_mst sec ON sec.SM_ID = e.EMM_DEPT
     WHERE u.user_id = ?
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

// ───────────────────────────────────────────────────────────────────────
//  COUNT ACTIVE SUPER ADMINS  — invariants I-1 / I-2
// ───────────────────────────────────────────────────────────────────────
async function countActiveSuperAdmins() {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.user_id
       JOIN roles      r  ON r.role_id  = ur.role_id
      WHERE r.role_code = 'SUPER_ADMIN' AND u.is_active = 1`,
  );
  return rows[0].n;
}

async function syncUserLaneScopes(conn, userId, roleCode, actorEmployeeId) {
  await conn.query('DELETE FROM user_lane_scopes WHERE user_id = ?', [userId]);

  const laneCode = defaultLaneForRole(roleCode);
  if (!laneCode) return;

  // From: one global role implied all rows. To: scoped roles receive a
  // durable lane row that auth tokens and queries can use for row filters.
  await conn.query(
    `INSERT INTO user_lane_scopes (user_id, lane_code, assigned_at, assigned_by)
     VALUES (?, ?, NOW(6), ?)
     ON DUPLICATE KEY UPDATE assigned_at = NOW(6), assigned_by = VALUES(assigned_by)`,
    [userId, laneCode, actorEmployeeId],
  );
}

// ───────────────────────────────────────────────────────────────────────
//  ROLE CHANGE  — three writes in one transaction
// ───────────────────────────────────────────────────────────────────────
/**
 * @param {import('mysql2/promise').PoolConnection} conn  Inside a transaction
 * @param {number} userId   Target user
 * @param {string} newRoleCode  Target role (roles.role_code)
 * @param {string} actorEmployeeId  Audit actor (varchar(20)-ish)
 */
async function changeUserRole(conn, userId, newRoleCode, actorEmployeeId) {
  // Look up the role_id from role_code.
  const [roleRows] = await conn.query(
    `SELECT role_id FROM roles WHERE role_code = ? LIMIT 1`,
    [newRoleCode],
  );
  if (!roleRows[0]) {
    throw new Error(`Unknown role_code: ${newRoleCode}`);
  }
  const newRoleId = roleRows[0].role_id;

  // UPDATE the junction row. There is exactly one row per user_id (PK
  // on user_id alone — BR-RBAC-02). If for some reason no row exists,
  // INSERT one.
  const [updateResult] = await conn.query(
    `UPDATE user_roles SET role_id = ?, assigned_by = ?, assigned_at = NOW(6) WHERE user_id = ?`,
    [newRoleId, actorEmployeeId, userId],
  );
  if (updateResult.affectedRows === 0) {
    await conn.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by) VALUES (?, ?, NOW(6), ?)`,
      [userId, newRoleId, actorEmployeeId],
    );
  }

  await syncUserLaneScopes(conn, userId, newRoleCode, actorEmployeeId);
}

// ───────────────────────────────────────────────────────────────────────
//  ATOMIC token_version BUMP  + updated_at / updated_by stamp
// ───────────────────────────────────────────────────────────────────────
/**
 * UPDATE … SET token_version = token_version + 1 — server-side increment
 * so we never read-then-write (race-free across concurrent admins).
 */
async function bumpTokenVersion(conn, userId, actorEmployeeId) {
  await conn.query(
    `UPDATE users
        SET token_version = token_version + 1,
            updated_at    = NOW(6),
            updated_by    = ?
      WHERE user_id = ?`,
    [actorEmployeeId, userId],
  );
}

// ───────────────────────────────────────────────────────────────────────
//  ACTIVATE / DEACTIVATE  — flips is_active and stamps reason fields
// ───────────────────────────────────────────────────────────────────────
async function setActive(conn, userId, isActive, { actorUserId, actorEmployeeId, reason }) {
  if (isActive) {
    await conn.query(
      `UPDATE users
          SET is_active            = 1,
              deactivated_at       = NULL,
              deactivated_by_user_id = NULL,
              deactivation_reason  = NULL,
              updated_at           = NOW(6),
              updated_by           = ?
        WHERE user_id = ?`,
      [actorEmployeeId, userId],
    );
  } else {
    await conn.query(
      `UPDATE users
          SET is_active              = 0,
              deactivated_at         = NOW(6),
              deactivated_by_user_id = ?,
              deactivation_reason    = ?,
              updated_at             = NOW(6),
              updated_by             = ?
        WHERE user_id = ?`,
      [actorUserId, reason, actorEmployeeId, userId],
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
//  HISTORY  — append one row per transition (Doctrine 6 — same tx)
// ───────────────────────────────────────────────────────────────────────
async function appendHistory(conn, {
  userId, fromRole, toRole, fromActive, toActive, action, reason, actorUserId,
}) {
  await conn.query(
    `INSERT INTO user_role_history
       (user_id, from_role, to_role, from_active, to_active,
        action, reason, actor_user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
    [userId, fromRole, toRole, fromActive ? 1 : 0, toActive ? 1 : 0,
     action, reason || null, actorUserId],
  );
}

async function listHistory(userId, limit = 100) {
  const [rows] = await pool.query(
    `SELECT id, user_id, from_role, to_role, from_active, to_active,
            action, reason, actor_user_id, created_at
       FROM user_role_history
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ?`,
    [userId, Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500)],
  );
  return rows;
}

// ───────────────────────────────────────────────────────────────────────
//  AUDIT LOG  — same JSON-stuffed-notes pattern as Phase 6
// ───────────────────────────────────────────────────────────────────────
function buildAuditNotes(details) {
  let s = JSON.stringify(details || {});
  if (s.length > 500) s = s.slice(0, 497) + '...';
  return s;
}

async function writeAudit(conn, { actorEmployeeId, actorRoleCode, action, userId, ipAddress, userAgent, details }) {
  await conn.query(
    `INSERT INTO audit_log
       (action, actor_employee_id, actor_role_code, entity_type, entity_id, ip_address, user_agent, notes, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
    [
      action,
      actorEmployeeId,
      actorRoleCode || null,
      'user',
      String(userId),
      ipAddress || null,
      userAgent || null,
      buildAuditNotes(details),
    ],
  );
}

// ───────────────────────────────────────────────────────────────────────
//  EXISTS HELPERS — used by employees module (I-5) + create-account flow
// ───────────────────────────────────────────────────────────────────────
async function findUserByEmployeeId(employeeId) {
  const [rows] = await pool.query(
    `SELECT user_id AS id, employee_id, is_active FROM users WHERE employee_id = ? LIMIT 1`,
    [employeeId],
  );
  return rows[0] || null;
}

/**
 * INSERT a new users row + user_role junction in one transaction.
 * Used by the employees module's POST /:id/create-account flow.
 *
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {{ employee_id: string, password_hash: string, role_code: string,
 *           actor_employee_id: string }} payload
 * @returns {Promise<number>}  the new user_id
 */
async function insertUser(conn, payload) {
  const [r] = await conn.query(
    `INSERT INTO users
       (employee_id, password_hash, is_active, is_locked, failed_login_count,
        password_hash_set_at, created_at, created_by, updated_at, updated_by, token_version)
     VALUES (?, ?, 1, 0, 0, NOW(6), NOW(6), ?, NOW(6), ?, 1)`,
    [payload.employee_id, payload.password_hash, payload.actor_employee_id, payload.actor_employee_id],
  );
  const newUserId = r.insertId;

  const [roleRows] = await conn.query(
    `SELECT role_id FROM roles WHERE role_code = ? LIMIT 1`,
    [payload.role_code],
  );
  if (!roleRows[0]) throw new Error(`Unknown role_code: ${payload.role_code}`);

  await conn.query(
    `INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by)
     VALUES (?, ?, NOW(6), ?)`,
    [newUserId, roleRows[0].role_id, payload.actor_employee_id],
  );

  await syncUserLaneScopes(conn, newUserId, payload.role_code, payload.actor_employee_id);

  return newUserId;
}

module.exports = {
  listUsers,
  findUserById,
  findUserByEmployeeId,
  countActiveSuperAdmins,
  changeUserRole,
  bumpTokenVersion,
  setActive,
  appendHistory,
  listHistory,
  writeAudit,
  insertUser,
  SORT_MAP,
};
