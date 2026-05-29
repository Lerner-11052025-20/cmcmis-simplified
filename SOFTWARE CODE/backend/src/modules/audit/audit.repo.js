// ============================================================================
// src/modules/audit/audit.repo.js  —  Read-only DAL for the Audit Viewer
// ----------------------------------------------------------------------------
// PHASE 14 — Audit Log Viewer
//
// DOCTRINE
//   • STRICTLY READ-ONLY. Every function below issues SELECT only — no
//     INSERT/UPDATE/DELETE anywhere. The smoke test asserts this by
//     intercepting query() calls and counting verbs (see smoke_phase14.js).
//   • Repository aliasing: the rest of the module speaks CANONICAL field
//     names (id, occurred_at, actor_employee_id, ...). The real column
//     names per table are encapsulated here. Status-history tables use
//     `history_id` PK, `transitioned_at`/`transitioned_by`; audit_log
//     uses `audit_id` PK + `occurred_at`. We expose a uniform shape.
//   • Sources:
//       'audit_log'   → audit_log
//       'identity'    → user_role_history
//       'transitions' → UNION ALL of job_request_status_history,
//                                    job_card_status_history,
//                                    schedule_status_history
//   • Name resolution: actor_employee_id (or actor_user_id mapped via
//     users.employee_id) → cmms_emp_mst.EMM_NAME via LEFT JOIN.
// ============================================================================

'use strict';

const pool = require('../../config/db');

// Default cap to keep deep-page queries bounded. The service may override
// down to 1..200 (validator limit); above 200 is service-only (export path).
const HARD_ROW_CAP = 5000;


/**
 * Escape SQL LIKE wildcards inside a user-typed search string. Without this,
 * a query like `JR_` matches anything containing "JR" + any-single-char
 * (because `_` is a single-char wildcard in LIKE patterns) — a classic
 * false-match trap.
 *
 * We use `|` as the LIKE escape character (NOT `\`) because MariaDB's
 * default sql_mode interprets `\` inside string literals as a C-style
 * escape — so `ESCAPE '\\'` parses as `ESCAPE '\'` and breaks the
 * statement (1064). `|` is printable, safe, and almost never appears
 * in audit text. Every LIKE clause must pair this helper with
 * `ESCAPE '|'`.
 *
 * @param {string} s
 * @returns {string} `%escaped%`
 */
function likeContains(s) {
  if (s == null) return '%%';
  const esc = String(s)
    .replace(/\|/g, '||')   // first: escape the escape char itself
    .replace(/%/g,  '|%')
    .replace(/_/g,  '|_');
  return `%${esc}%`;
}


// ───────────────────────────────────────────────────────────────────────
//  Tiny helpers
// ───────────────────────────────────────────────────────────────────────

/**
 * Apply the standard time-range predicate. Accepts ISO date or ISO datetime.
 * We extend a bare date to its day boundary so "to=2026-05-22" includes
 * everything that happened that day.
 *
 * @param {string|null} from
 * @param {string|null} to
 * @param {string} timeCol  Fully-qualified column name (e.g. 'al.occurred_at').
 * @returns {{ where: string[], args: any[] }}
 */
function timeRange(from, to, timeCol) {
  const where = [];
  const args  = [];
  if (from) {
    const f = from.length === 10 ? `${from} 00:00:00` : from;
    where.push(`${timeCol} >= ?`);
    args.push(f);
  }
  if (to) {
    const t = to.length === 10 ? `${to} 23:59:59` : to;
    where.push(`${timeCol} <= ?`);
    args.push(t);
  }
  return { where, args };
}


// ───────────────────────────────────────────────────────────────────────
//  SOURCE 1 — audit_log (generic operational record)
// ───────────────────────────────────────────────────────────────────────

/**
 * List audit_log rows with the filter shape from the validator.
 * Reverse-chronological. Server-side pagination.
 *
 * @returns {Promise<{ rows: object[], total: number }>}
 */
async function listAuditLog(params) {
  const { where, args } = timeRange(params.from, params.to, 'al.occurred_at');

  if (params.actor)      { where.push('al.actor_employee_id = ?');     args.push(params.actor); }
  if (params.action)     { where.push('al.action = ?');                 args.push(params.action); }
  if (params.entityType) { where.push('al.entity_type = ?');            args.push(params.entityType); }
  if (params.entityId)   { where.push('al.entity_id = ?');              args.push(params.entityId); }
  if (params.q) {
    // ESCAPE '\\' so `_` / `%` in user queries are treated as literals.
    where.push("(al.action LIKE ? ESCAPE '|' OR al.entity_type LIKE ? ESCAPE '|' OR al.entity_id LIKE ? ESCAPE '|' OR al.notes LIKE ? ESCAPE '|')");
    const like = likeContains(params.q);
    args.push(like, like, like, like);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (params.page - 1) * params.page_size;

  const dataSql = `
    SELECT
      al.audit_id              AS id,
      al.occurred_at           AS occurred_at,
      al.action                AS action,
      al.entity_type           AS entity_type,
      al.entity_id             AS entity_id,
      al.actor_employee_id     AS actor_employee_id,
      al.actor_role_code       AS actor_role_code,
      COALESCE(e.EMM_NAME, al.actor_employee_id) AS actor_name,
      al.ip_address            AS ip_address,
      al.user_agent            AS user_agent,
      al.request_id            AS request_id,
      al.notes                 AS notes
    FROM audit_log al
    LEFT JOIN cmms_emp_mst e ON e.EMM_ID = al.actor_employee_id
    ${whereSql}
    ORDER BY al.occurred_at DESC, al.audit_id DESC
    LIMIT ? OFFSET ?`;

  const countSql = `SELECT COUNT(*) AS n FROM audit_log al ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql,  [...args, params.page_size, offset]),
    pool.query(countSql, args),
  ]);
  return { rows, total: Number(countRows[0].n) || 0 };
}

async function findAuditLogById(id) {
  const [rows] = await pool.query(
    `SELECT
       al.audit_id              AS id,
       al.occurred_at           AS occurred_at,
       al.action                AS action,
       al.entity_type           AS entity_type,
       al.entity_id             AS entity_id,
       al.actor_employee_id     AS actor_employee_id,
       al.actor_role_code       AS actor_role_code,
       COALESCE(e.EMM_NAME, al.actor_employee_id) AS actor_name,
       al.ip_address            AS ip_address,
       al.user_agent            AS user_agent,
       al.request_id            AS request_id,
       al.notes                 AS notes
     FROM audit_log al
     LEFT JOIN cmms_emp_mst e ON e.EMM_ID = al.actor_employee_id
     WHERE al.audit_id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}


// ───────────────────────────────────────────────────────────────────────
//  SOURCE 2 — user_role_history (identity & access)
// ───────────────────────────────────────────────────────────────────────

/**
 * List role/status transitions on users. Actor + subject are user_id (bigint)
 * — we resolve BOTH to employee_id + name via JOIN to users + cmms_emp_mst.
 */
async function listIdentityHistory(params) {
  const { where, args } = timeRange(params.from, params.to, 'urh.created_at');

  // actor filter: callers know employee_ids, not user_ids. We accept either
  // and OR both — first try numeric user_id, then employee_id via JOIN.
  if (params.actor) {
    where.push('(au.employee_id = ? OR su.employee_id = ?)');
    args.push(params.actor, params.actor);
  }
  if (params.action) { where.push('urh.action = ?'); args.push(params.action); }
  if (params.entityId) {
    // For this source, entityId == subject employee_id.
    where.push('su.employee_id = ?');
    args.push(params.entityId);
  }
  if (params.q) {
    where.push("(urh.action LIKE ? ESCAPE '|' OR urh.reason LIKE ? ESCAPE '|' OR urh.from_role LIKE ? ESCAPE '|' OR urh.to_role LIKE ? ESCAPE '|')");
    const like = likeContains(params.q);
    args.push(like, like, like, like);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (params.page - 1) * params.page_size;

  const dataSql = `
    SELECT
      urh.id                          AS id,
      urh.created_at                  AS occurred_at,
      urh.action                      AS action,
      'user'                          AS entity_type,
      su.employee_id                  AS entity_id,
      COALESCE(se.EMM_NAME, su.employee_id) AS entity_label,
      au.employee_id                  AS actor_employee_id,
      NULL                            AS actor_role_code,
      COALESCE(ae.EMM_NAME, au.employee_id) AS actor_name,
      urh.from_role                   AS from_role,
      urh.to_role                     AS to_role,
      urh.from_active                 AS from_active,
      urh.to_active                   AS to_active,
      urh.reason                      AS notes
    FROM user_role_history urh
    LEFT JOIN users      au ON au.user_id = urh.actor_user_id
    LEFT JOIN cmms_emp_mst ae ON ae.EMM_ID  = au.employee_id
    LEFT JOIN users      su ON su.user_id = urh.user_id
    LEFT JOIN cmms_emp_mst se ON se.EMM_ID  = su.employee_id
    ${whereSql}
    ORDER BY urh.created_at DESC, urh.id DESC
    LIMIT ? OFFSET ?`;

  const countSql = `
    SELECT COUNT(*) AS n
      FROM user_role_history urh
      LEFT JOIN users au ON au.user_id = urh.actor_user_id
      LEFT JOIN users su ON su.user_id = urh.user_id
      ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql,  [...args, params.page_size, offset]),
    pool.query(countSql, args),
  ]);
  return { rows, total: Number(countRows[0].n) || 0 };
}

async function findIdentityHistoryById(id) {
  const [rows] = await pool.query(
    `SELECT
       urh.id                          AS id,
       urh.created_at                  AS occurred_at,
       urh.action                      AS action,
       'user'                          AS entity_type,
       su.employee_id                  AS entity_id,
       COALESCE(se.EMM_NAME, su.employee_id) AS entity_label,
       au.employee_id                  AS actor_employee_id,
       NULL                            AS actor_role_code,
       COALESCE(ae.EMM_NAME, au.employee_id) AS actor_name,
       urh.from_role                   AS from_role,
       urh.to_role                     AS to_role,
       urh.from_active                 AS from_active,
       urh.to_active                   AS to_active,
       urh.reason                      AS notes
     FROM user_role_history urh
     LEFT JOIN users      au ON au.user_id = urh.actor_user_id
     LEFT JOIN cmms_emp_mst ae ON ae.EMM_ID  = au.employee_id
     LEFT JOIN users      su ON su.user_id = urh.user_id
     LEFT JOIN cmms_emp_mst se ON se.EMM_ID  = su.employee_id
     WHERE urh.id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}


// ───────────────────────────────────────────────────────────────────────
//  SOURCE 3 — Status transitions (UNION of 3 history tables)
// ───────────────────────────────────────────────────────────────────────
// We union three lifecycle-history tables:
//   • job_request_status_history  (PK history_id)
//   • job_card_status_history     (PK history_id)
//   • schedule_status_history     (PK id, Phase-13)
//
// To keep ids unique across the union we tag each row with a `source_table`
// prefix; the detail endpoint takes (source='transitions', id=<bigint>) and
// also needs a `subSource` hint to know which underlying table to query.
// Listing UNIONs all three then applies filters in an outer SELECT.

/**
 * Return the canonical UNION sub-query as a parameterless SELECT.
 * Filters are applied in the outer query via a CTE-like alias.
 */
function transitionsUnionSql() {
  return `
    SELECT
      jrh.history_id                   AS id,
      'job_request'                    AS source_table,
      jrh.transitioned_at              AS occurred_at,
      CONCAT('JR_', jrh.to_status)     AS action,
      'job_request'                    AS entity_type,
      CAST(jrh.jr_no AS CHAR)          AS entity_id,
      NULL                             AS entity_label,
      jrh.transitioned_by              AS actor_employee_id,
      NULL                             AS actor_role_code,
      jrh.from_status                  AS from_status,
      jrh.to_status                    AS to_status,
      jrh.reason                       AS reason
    FROM job_request_status_history jrh
    UNION ALL
    SELECT
      jch.history_id                   AS id,
      'job_card'                       AS source_table,
      jch.transitioned_at              AS occurred_at,
      CONCAT('JC_', jch.to_status)     AS action,
      'job_card'                       AS entity_type,
      jch.jc_section_no                AS entity_id,
      NULL                             AS entity_label,
      jch.transitioned_by              AS actor_employee_id,
      NULL                             AS actor_role_code,
      jch.from_status                  AS from_status,
      jch.to_status                    AS to_status,
      jch.reason                       AS reason
    FROM job_card_status_history jch
    UNION ALL
    SELECT
      ssh.id                           AS id,
      'schedule'                       AS source_table,
      ssh.created_at                   AS occurred_at,
      CONCAT('SCHEDULE_', ssh.to_status) AS action,
      'schedule'                       AS entity_type,
      CAST(ssh.schedule_id AS CHAR)    AS entity_id,
      NULL                             AS entity_label,
      ssh.actor_employee_id            AS actor_employee_id,
      NULL                             AS actor_role_code,
      ssh.from_status                  AS from_status,
      ssh.to_status                    AS to_status,
      ssh.reason                       AS reason
    FROM schedule_status_history ssh`;
}

async function listStatusTransitions(params) {
  const inner = transitionsUnionSql();
  const where = [];
  const args  = [];

  if (params.from) {
    const f = params.from.length === 10 ? `${params.from} 00:00:00` : params.from;
    where.push('t.occurred_at >= ?'); args.push(f);
  }
  if (params.to) {
    const tt = params.to.length === 10 ? `${params.to} 23:59:59` : params.to;
    where.push('t.occurred_at <= ?'); args.push(tt);
  }
  if (params.actor)      { where.push('t.actor_employee_id = ?'); args.push(params.actor); }
  if (params.action)     { where.push('t.action = ?');             args.push(params.action); }
  if (params.entityType) { where.push('t.entity_type = ?');        args.push(params.entityType); }
  if (params.entityId)   { where.push('t.entity_id = ?');          args.push(params.entityId); }
  if (params.q) {
    where.push("(t.action LIKE ? ESCAPE '|' OR t.entity_id LIKE ? ESCAPE '|' OR t.reason LIKE ? ESCAPE '|' OR t.to_status LIKE ? ESCAPE '|')");
    const like = likeContains(params.q);
    args.push(like, like, like, like);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (params.page - 1) * params.page_size;

  // We join the actor name AFTER the union. The union shape always exposes
  // actor_employee_id so this LEFT JOIN is uniform.
  const dataSql = `
    SELECT
      t.id, t.source_table, t.occurred_at, t.action,
      t.entity_type, t.entity_id, t.entity_label,
      t.actor_employee_id, t.actor_role_code,
      COALESCE(e.EMM_NAME, t.actor_employee_id) AS actor_name,
      t.from_status, t.to_status, t.reason AS notes
    FROM (${inner}) t
    LEFT JOIN cmms_emp_mst e ON e.EMM_ID = t.actor_employee_id
    ${whereSql}
    ORDER BY t.occurred_at DESC, t.id DESC
    LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) AS n FROM (${inner}) t ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql,  [...args, params.page_size, offset]),
    pool.query(countSql, args),
  ]);
  return { rows, total: Number(countRows[0].n) || 0 };
}

/**
 * Detail fetch — we don't know which underlying table the id came from, so
 * we scan all three. The `subSource` hint (when provided by the caller from
 * the source_table column of the list row) makes the lookup O(1).
 */
async function findStatusTransitionById(id, subSource) {
  if (subSource === 'job_card') {
    const [rows] = await pool.query(
      `SELECT 'job_card' AS source_table, jch.history_id AS id,
              jch.transitioned_at AS occurred_at,
              CONCAT('JC_', jch.to_status) AS action,
              'job_card' AS entity_type, jch.jc_section_no AS entity_id,
              jch.transitioned_by AS actor_employee_id, NULL AS actor_role_code,
              COALESCE(e.EMM_NAME, jch.transitioned_by) AS actor_name,
              jch.from_status, jch.to_status, jch.reason AS notes
         FROM job_card_status_history jch
         LEFT JOIN cmms_emp_mst e ON e.EMM_ID = jch.transitioned_by
        WHERE jch.history_id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }
  if (subSource === 'schedule') {
    const [rows] = await pool.query(
      `SELECT 'schedule' AS source_table, ssh.id AS id,
              ssh.created_at AS occurred_at,
              CONCAT('SCHEDULE_', ssh.to_status) AS action,
              'schedule' AS entity_type, CAST(ssh.schedule_id AS CHAR) AS entity_id,
              ssh.actor_employee_id, NULL AS actor_role_code,
              COALESCE(e.EMM_NAME, ssh.actor_employee_id) AS actor_name,
              ssh.from_status, ssh.to_status, ssh.reason AS notes
         FROM schedule_status_history ssh
         LEFT JOIN cmms_emp_mst e ON e.EMM_ID = ssh.actor_employee_id
        WHERE ssh.id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }
  // Default: job_request (most common — 91 of 109 rows at first run).
  const [rows] = await pool.query(
    `SELECT 'job_request' AS source_table, jrh.history_id AS id,
            jrh.transitioned_at AS occurred_at,
            CONCAT('JR_', jrh.to_status) AS action,
            'job_request' AS entity_type, CAST(jrh.jr_no AS CHAR) AS entity_id,
            jrh.transitioned_by AS actor_employee_id, NULL AS actor_role_code,
            COALESCE(e.EMM_NAME, jrh.transitioned_by) AS actor_name,
            jrh.from_status, jrh.to_status, jrh.reason AS notes
       FROM job_request_status_history jrh
       LEFT JOIN cmms_emp_mst e ON e.EMM_ID = jrh.transitioned_by
      WHERE jrh.history_id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}


// ───────────────────────────────────────────────────────────────────────
//  FILTER LOOKUPS  —  distinct action + entity_type for the dropdowns
// ───────────────────────────────────────────────────────────────────────
// Cheap GROUP BY queries with a top-K limit. Cached briefly by the service
// (15 min) since the universe of action/entity codes is bounded.

async function distinctAuditFilters() {
  const [[actions], [entityTypes]] = await Promise.all([
    pool.query(
      `SELECT action AS value, COUNT(*) AS n
         FROM audit_log GROUP BY action
        ORDER BY n DESC, action ASC LIMIT 200`,
    ),
    pool.query(
      `SELECT entity_type AS value, COUNT(*) AS n
         FROM audit_log GROUP BY entity_type
        ORDER BY n DESC, entity_type ASC LIMIT 50`,
    ),
  ]);
  return { actions, entityTypes };
}

async function distinctIdentityFilters() {
  const [[actions]] = await Promise.all([
    pool.query(
      `SELECT action AS value, COUNT(*) AS n
         FROM user_role_history GROUP BY action
        ORDER BY n DESC, action ASC LIMIT 50`,
    ),
  ]);
  // entityType is always 'user' for this source.
  return { actions, entityTypes: [{ value: 'user', n: undefined }] };
}

async function distinctTransitionsFilters() {
  // Build the same union once and bucket on to_status / entity_type.
  const [[actions], [entityTypes]] = await Promise.all([
    pool.query(
      `SELECT t.action AS value, COUNT(*) AS n FROM (${transitionsUnionSql()}) t
        GROUP BY t.action ORDER BY n DESC, t.action ASC LIMIT 100`,
    ),
    pool.query(
      `SELECT t.entity_type AS value, COUNT(*) AS n FROM (${transitionsUnionSql()}) t
        GROUP BY t.entity_type ORDER BY n DESC, t.entity_type ASC LIMIT 50`,
    ),
  ]);
  return { actions, entityTypes };
}


module.exports = {
  HARD_ROW_CAP,
  // Source 1
  listAuditLog,
  findAuditLogById,
  distinctAuditFilters,
  // Source 2
  listIdentityHistory,
  findIdentityHistoryById,
  distinctIdentityFilters,
  // Source 3
  listStatusTransitions,
  findStatusTransitionById,
  distinctTransitionsFilters,
};
