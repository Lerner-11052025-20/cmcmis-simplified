// ============================================================================
// src/modules/lookups/lookups.repo.js  —  DAL for FE-dropdown lookups
// ----------------------------------------------------------------------------
// Helper read-only queries used by the FE form to populate dropdowns +
// typeahead. Each query is narrow, indexed, and LIMITed to a sensible
// cap so a stray request can't pull the entire master.
// ============================================================================

'use strict';

const pool = require('../../config/db');
const { buildLaneWhere, isEngineerRole, normalizeLaneScopes } = require('../../utils/lanes');

/**
 * Divisions (sections-master) — Division dropdown on the JR form.
 * Source: cmms_section_mst (legacy). See SCHEMA_PHASE6.md decision P6-D11.
 */
async function listDivisions() {
  const [rows] = await pool.query(
    `SELECT SM_ID AS id, SM_SHORTNAME AS code, SM_NAME AS name
       FROM cmms_section_mst
      ORDER BY SM_SHORTNAME ASC
      LIMIT 2000`,
  );
  return rows;
}

/**
 * Projects master — feeds the Project dropdown on the JR form.
 * Source: cmms_proj_mst legacy master. PR_STATE = 1 means active.
 */
async function listProjects() {
  const [rows] = await pool.query(
    `SELECT PR_ID AS id, PR_NAME AS name
       FROM cmms_proj_mst
      WHERE PR_STATE = 1
      ORDER BY PR_NAME ASC
      LIMIT 1000`,
  );
  return rows;
}

/**
 * Equipment typeahead — feeds the "Equipment ID" search on the JR form.
 * The "id" field returned is the canonical composite string used as URL
 * slug + React key everywhere downstream.
 */
async function searchEquipment(q, limit = 20) {
  // Empty q? Return an empty list — the FE should not call this without a
  // query, but defending against the empty-string case avoids a full scan.
  if (!q || !String(q).trim()) return [];
  const like = `%${q}%`;
  const cap = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const [rows] = await pool.query(
    `SELECT
       e.EQM_TYPE                            AS eqm_type,
       e.EQM_ID                              AS eqm_id,
       e.EQM_NAME                            AS name,
       m.CMM_CONT_NAME                       AS make,
       e.EQM_MODELNO                         AS model_no,
       e.EQM_SRNO                            AS serial_no,
       p.PROD_NAME                           AS type_name
     FROM cmms_eqip_mst e
     LEFT JOIN cmms_cont_mst    m ON m.CMM_CONT_ID = e.EQM_MFRID
     LEFT JOIN cmms_product_mst p ON p.PROD_ID     = e.EQM_INST_TYPE
     WHERE e.EQM_NAME LIKE ?
        OR e.EQM_MODELNO LIKE ?
        OR CAST(e.EQM_ID AS CHAR) LIKE ?
        OR CONCAT(e.EQM_TYPE, '-', e.EQM_ID) LIKE ?
        OR CONCAT('EQ-', UPPER(LEFT(e.EQM_TYPE, 3)), '-', LPAD(e.EQM_ID, 4, '0')) LIKE ?
     ORDER BY
       CASE
         WHEN CAST(e.EQM_ID AS CHAR) = ? THEN 0
         WHEN CONCAT('EQ-', UPPER(LEFT(e.EQM_TYPE, 3)), '-', LPAD(e.EQM_ID, 4, '0')) = ? THEN 1
         WHEN CONCAT(e.EQM_TYPE, '-', e.EQM_ID) = ? THEN 2
         ELSE 3
       END,
       e.EQM_NAME ASC,
       e.EQM_ID ASC
     LIMIT ?`,
    [like, like, like, like, like, String(q).trim(), String(q).trim(), String(q).trim(), cap],
  );

  return rows.map((r) => ({
    id:               `${r.eqm_type}-${r.eqm_id}`,
    eqm_type:         r.eqm_type,
    eqm_id:           r.eqm_id,
    name:             r.name,
    make:             r.make || null,
    model_no:         r.model_no || null,
    serial_no:        r.serial_no || null,
    type:             r.type_name || null,
  }));
}

/**
 * Accessories linked to one equipment row.
 * Source: cmms_eqipinst_identification, keyed by EMD_EQIP_TYPE + EQM_ID.
 */
async function listEquipmentAccessories(eqmType, eqmId) {
  if (!eqmType || !eqmId) return [];
  const [rows] = await pool.query(
    `SELECT
       EII_ID      AS id,
       EII_TYPE    AS type,
       EII_NAME    AS name,
       EII_MODELNO AS model_no,
       EII_SRNO    AS serial_no,
       EII_INUSE   AS in_use,
       EII_CALREQ  AS calibration_required
     FROM cmms_eqipinst_identification
     WHERE EMD_EQIP_TYPE = ?
       AND EQM_ID = ?
     ORDER BY EII_ID ASC
     LIMIT 100`,
    [eqmType, Number(eqmId)],
  );

  return rows.map((r) => ({
    id: r.id,
    type: r.type || null,
    name: r.name || '',
    model_no: r.model_no || null,
    serial_no: r.serial_no || '',
    in_use: Number(r.in_use || 0),
    calibration_required: Number(r.calibration_required || 0),
  }));
}

// ============================================================================
//                          PHASE 7 SLICE 2  ·  ENGINEERS LOOKUP
// ============================================================================
//  Feeds the "Assign to Engineer" dropdown on the Convert modal. Each row
//  carries an `active_card_count` so the LIC can load-balance — least
//  loaded engineer surfaces at the top.
// ============================================================================

/**
 * List every ACTIVE Lab Engineer (system-wide, per D-7.2.8), with a
 * scalar `active_card_count` derived from cmms_jobcard_mst.
 *
 * The workload predicate uses the new (idx_jc_engineer_status) index added
 * by migration 201 — `JM_ASSIGNED_ENGINEER` is the leading column, so the
 * COUNT(*) per row is an index-range scan, not a table scan.
 *
 * The result is sorted by active_card_count ASC, then by name — so the
 * dropdown defaults to the least-loaded engineer.
 *
 * @returns {Promise<Array<{
 *   id: number, employee_id: string, full_name: string,
 *   division_id: number | null, division_code: string | null,
 *   active_card_count: number
 * }>>}
 */
async function listEngineersWithWorkload(actor = null) {
  // Why a correlated subquery instead of LEFT JOIN + GROUP BY?
  // GROUP BY would force the planner to widen the user_roles + roles join
  // and aggregate over all (user, JC) pairs even for engineers with no
  // active cards. The correlated subquery short-circuits per row and uses
  // the engineer-status index directly. With only a few hundred engineers
  // this is the cheaper plan.
  const where = [
    `r.role_code IN (
      'LAB_ENGINEER',
      'TME_REPAIR_LAB_ENG',
      'TME_CAL_LAB_ENG',
      'FPE_REPAIR_LAB_ENG',
      'FPE_CAL_LAB_ENG'
    )`,
    'u.is_active = 1',
    'u.is_locked = 0',
  ];
  const args = [];
  if (Array.isArray(actor?.laneScopes) && actor.laneScopes.length > 0) {
    const lane = buildLaneWhere('uls.lane_code', actor.laneScopes);
    where.push(lane.sql);
    args.push(...lane.args);
  }

  const [rows] = await pool.query(
    `SELECT
       u.user_id                                          AS id,
       u.employee_id                                      AS employee_id,
       r.role_code                                        AS role,
       GROUP_CONCAT(DISTINCT uls.lane_code ORDER BY uls.lane_code) AS lane_scopes,
       COALESCE(e.EMM_NAME, u.employee_id)                AS full_name,
       e.EMM_DEPT                                         AS division_id,
       sm.SM_SHORTNAME                                    AS division_code,
       (
         SELECT COUNT(*)
           FROM cmms_jobcard_mst jc
          WHERE jc.JM_ASSIGNED_ENGINEER = u.employee_id
            AND jc.JM_MVP_STATUS IN ('ASSIGNED', 'IN_PROGRESS')
       )                                                   AS active_card_count
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.user_id
     JOIN roles      r  ON r.role_id  = ur.role_id
     LEFT JOIN user_lane_scopes uls ON uls.user_id = u.user_id
     LEFT JOIN cmms_emp_mst    e   ON e.EMM_ID  = u.employee_id
     LEFT JOIN cmms_section_mst sm ON sm.SM_ID = e.EMM_DEPT
     WHERE ${where.join(' AND ')}
     GROUP BY u.user_id, u.employee_id, r.role_code, e.EMM_NAME, e.EMM_DEPT, sm.SM_SHORTNAME
     ORDER BY active_card_count ASC, full_name ASC
     LIMIT 500`,
    args,
  );
  return rows.map((r) => ({ ...r, lane_scopes: normalizeLaneScopes(r.role, r.lane_scopes) }));
}

/**
 * Look up a single engineer by employee_id with the canonical fields the
 * Convert service needs to validate "is this a real, active, LAB_ENGINEER?".
 * Returns null if not found OR if the candidate is inactive / locked /
 * holding a different role. The service throws 400 on null.
 *
 * @param {string} employeeId
 * @returns {Promise<Object | null>}
 */
async function findEngineerByEmployeeId(employeeId) {
  const [rows] = await pool.query(
    `SELECT
       u.user_id                                AS id,
       u.employee_id                            AS employee_id,
       u.is_active                              AS is_active,
       u.is_locked                              AS is_locked,
       r.role_code                              AS role,
       GROUP_CONCAT(DISTINCT uls.lane_code ORDER BY uls.lane_code) AS lane_scopes,
       COALESCE(e.EMM_NAME, u.employee_id)      AS full_name
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.user_id
     JOIN roles      r  ON r.role_id  = ur.role_id
     LEFT JOIN user_lane_scopes uls ON uls.user_id = u.user_id
     LEFT JOIN cmms_emp_mst e ON e.EMM_ID = u.employee_id
     WHERE u.employee_id = ?
     GROUP BY u.user_id, u.employee_id, u.is_active, u.is_locked, r.role_code, e.EMM_NAME
     LIMIT 1`,
    [employeeId],
  );
  const row = rows[0];
  if (!row) return null;
  if (!isEngineerRole(row.role)) return null;
  if (!row.is_active || row.is_locked) return null;
  return { ...row, laneScopes: normalizeLaneScopes(row.role, row.lane_scopes) };
}

// ============================================================================
//                          PHASE 9  ·  TASK LIBRARY LOOKUP
// ============================================================================

/**
 * List active library tasks, optionally filtered by category.
 * Drives the dropdown in the Task Checklist tab (image 15).
 *
 * @param {'CALIBRATION'|'INSPECTION'|'MAINTENANCE'|null} category
 */
async function listTaskLibrary(category) {
  if (category === 'CALIBRATION') {
    const [rows] = await pool.query(
      `SELECT TSK_ID AS id, 'CALIBRATION' AS category, TSK_NAME AS task_text, TSK_ID AS display_order
         FROM cmms_task_mst
        WHERE TSK_TYPE = 'Calibration'
        ORDER BY TSK_NAME ASC`,
    );
    return rows;
  }
  if (category) {
    const [rows] = await pool.query(
      `SELECT id, category, task_text, display_order
         FROM task_library
        WHERE is_active = 1 AND category = ?
        ORDER BY display_order ASC, id ASC`,
      [category],
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

async function listCalibrationPeople(actor = null) {
  const where = [
    `r.role_code IN (
      'LAB_ENGINEER',
      'LAB_IN_CHARGE',
      'SUPER_ADMIN',
      'TME_REPAIR_LAB_ENG',
      'TME_CAL_LAB_ENG',
      'FPE_REPAIR_LAB_ENG',
      'FPE_CAL_LAB_ENG',
      'TME_REPAIR_LAB_IN_CHARGE',
      'TME_CAL_LAB_IN_CHARGE',
      'FPE_REPAIR_LAB_IN_CHARGE',
      'FPE_CAL_LAB_IN_CHARGE'
    )`,
    'u.is_active = 1',
    'u.is_locked = 0',
  ];
  const args = [];
  if (Array.isArray(actor?.laneScopes) && actor.laneScopes.length > 0) {
    const lane = buildLaneWhere('uls.lane_code', actor.laneScopes);
    where.push(lane.sql);
    args.push(...lane.args);
  }

  const [rows] = await pool.query(
    `SELECT
       u.employee_id AS employee_id,
       COALESCE(e.EMM_NAME, u.employee_id) AS full_name,
       r.role_code AS role,
       GROUP_CONCAT(DISTINCT uls.lane_code ORDER BY uls.lane_code) AS lane_scopes
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.user_id
     JOIN roles r ON r.role_id = ur.role_id
     LEFT JOIN user_lane_scopes uls ON uls.user_id = u.user_id
     LEFT JOIN cmms_emp_mst e ON e.EMM_ID = u.employee_id
     WHERE ${where.join(' AND ')}
     GROUP BY u.employee_id, e.EMM_NAME, r.role_code
     ORDER BY full_name ASC, u.employee_id ASC
     LIMIT 1000`,
    args,
  );
  return rows.map((r) => ({ ...r, lane_scopes: normalizeLaneScopes(r.role, r.lane_scopes) }));
}

module.exports = {
  listDivisions,
  listProjects,
  searchEquipment,
  listEquipmentAccessories,
  // Phase 7 Slice 2 additions:
  listEngineersWithWorkload,
  findEngineerByEmployeeId,
  // Phase 9 additions:
  listTaskLibrary,
  listCalibrationPeople,
};
