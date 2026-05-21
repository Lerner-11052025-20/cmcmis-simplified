// ============================================================================
// src/modules/equipment/equipment.repo.js  —  DAL for cmms_eqip_mst + masters
// ----------------------------------------------------------------------------
// ONLY file in the equipment module that contains SQL. Service composes
// these functions; controller never queries directly. multipleStatements
// is false on the pool — every query uses `?` placeholders.
//
// TABLES TOUCHED (all read-only here EXCEPT the createEquipment INSERT
// which runs inside a service-owned transaction):
//   cmms_eqip_mst      — equipment master (PK: EQM_TYPE, EQM_ID)
//   cmms_cont_mst      — manufacturers (Make)
//   cmms_product_mst   — instrument types (Type)
//   sections           — Phase 3 new (section_code, equipment_category)
//   cmms_section_mst   — legacy divisions (SM_SHORTNAME — Division column)
//
// PHASE-5 K.6: NO ALTERs. We work with what exists.
// ============================================================================

'use strict';

const pool = require('../../config/db');

// Allow-list for ORDER BY — never interpolate user input into SQL.
const SORT_COLUMNS = {
  equipment_code: 'e.EQM_ID',
  name: 'e.EQM_NAME',
  next_cal_due_date: 'e.EQM_CAL_DUE_DATE',
};
const ORDER_DIRS = { asc: 'ASC', desc: 'DESC' };

// ────────────────────────────────────────────────────────────────────────
//  LIST
// ────────────────────────────────────────────────────────────────────────
/**
 * Paginated equipment list with master joins.
 *
 * @param {{
 *   page: number, page_size: number,
 *   q?: string, type_id?: number, eqm_type?: string, status?: string,
 *   sort: string, order: string,
 * }} params
 */
async function listEquipment(params) {
  const { page, page_size, q, type_id, eqm_type, status, sort, order } = params;

  // WHERE builder with bound parameters
  const where = [];
  const args = [];

  if (q) {
    where.push('(e.EQM_NAME LIKE ? OR e.EQM_MODELNO LIKE ? OR e.EQM_SRNO LIKE ? OR m.CMM_CONT_NAME LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like, like, like);
  }
  if (type_id) {
    where.push('e.EQM_INST_TYPE = ?');
    args.push(type_id);
  }
  if (eqm_type) {
    where.push('e.EQM_TYPE = ?');
    args.push(eqm_type);
  }
  if (status) {
    where.push('e.EQM_MVP_STATUS = ?');
    args.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Allow-list sort/order; if invalid (cannot happen after zod) fall back.
  const sortSql = SORT_COLUMNS[sort] || SORT_COLUMNS.equipment_code;
  const orderSql = ORDER_DIRS[order] || 'ASC';
  // Always tie-break by the full PK to make pagination deterministic.
  const tieBreak = ', e.EQM_TYPE ASC, e.EQM_ID ASC';

  const offset = (page - 1) * page_size;

  // Two queries, both narrow SELECTs — no SELECT *.
  const dataSql = `
    SELECT
      e.EQM_TYPE                        AS eqm_type,
      e.EQM_ID                          AS eqm_id,
      e.EQM_NAME                        AS name,
      p.PROD_NAME                       AS type_name,
      m.CMM_CONT_NAME                   AS make,
      e.EQM_MODELNO                     AS model_no,
      e.EQM_SRNO                        AS serial_no,
      e.EQM_CAL_DUE_DATE                AS next_cal_due_date,
      COALESCE(s.section_code, e.EQM_DIV_ABBR) AS division_code,
      COALESCE(s.section_name,  ls.SM_SHORTNAME, e.EQM_DIV_ABBR) AS location_name,
      e.EQM_MVP_STATUS                  AS status
    FROM cmms_eqip_mst e
    LEFT JOIN cmms_cont_mst    m  ON m.CMM_CONT_ID = e.EQM_MFRID
    LEFT JOIN cmms_product_mst p  ON p.PROD_ID     = e.EQM_INST_TYPE
    LEFT JOIN sections         s  ON s.section_id  = e.EQM_SECTION_ID
    LEFT JOIN cmms_section_mst ls ON ls.SM_ID      = e.EQM_DIVID
    ${whereSql}
    ORDER BY ${sortSql} ${orderSql}${tieBreak}
    LIMIT ? OFFSET ?`;

  const countSql = `
    SELECT COUNT(*) AS n
    FROM cmms_eqip_mst e
    LEFT JOIN cmms_cont_mst m ON m.CMM_CONT_ID = e.EQM_MFRID
    ${whereSql}`;

  // Run both queries in parallel — same pool, independent connections.
  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, [...args, page_size, offset]),
    pool.query(countSql, args),
  ]);

  return { rows, total: countRows[0].n };
}

// ────────────────────────────────────────────────────────────────────────
//  TYPES (helper for the FE Type dropdown)
// ────────────────────────────────────────────────────────────────────────
async function listEquipmentTypes() {
  const [rows] = await pool.query(
    `SELECT PROD_ID AS type_id, PROD_NAME AS name
       FROM cmms_product_mst
      WHERE PROD_STATE = 0
      ORDER BY PROD_NAME ASC
      LIMIT 1000`,
  );
  return rows;
}

// ────────────────────────────────────────────────────────────────────────
//  MAKES (helper for the FE Make dropdown — Section 2)
// ────────────────────────────────────────────────────────────────────────
async function listMakes() {
  const [rows] = await pool.query(
    `SELECT CMM_CONT_ID AS make_id, CMM_CONT_NAME AS name
       FROM cmms_cont_mst
      WHERE CMM_CONT_STATE_FLAG = 1
        AND CMM_CONT_TYPE IN ('MFR','BOTH','OEM')
      ORDER BY CMM_CONT_NAME ASC
      LIMIT 5000`,
  );
  return rows;
}

// ────────────────────────────────────────────────────────────────────────
//  DIVISIONS (helper for the FE Division dropdown — Section 5)
// ────────────────────────────────────────────────────────────────────────
async function listDivisions() {
  const [rows] = await pool.query(
    `SELECT SM_ID AS division_id, SM_SHORTNAME AS code, SM_NAME AS name
       FROM cmms_section_mst
      WHERE SM_STATE = 1
      ORDER BY SM_SHORTNAME ASC
      LIMIT 2000`,
  );
  return rows;
}

// ────────────────────────────────────────────────────────────────────────
//  Section lookup by equipment category — derives EQM_SECTION_ID from
//  the form's Job Category dropdown. Returns null if unknown.
// ────────────────────────────────────────────────────────────────────────
async function findSectionByCategory(category /* 'TME' or 'FPE' */) {
  const [rows] = await pool.query(
    `SELECT section_id FROM sections WHERE equipment_category = ? AND is_active = 1 LIMIT 1`,
    [category],
  );
  return rows[0]?.section_id ?? null;
}

// ────────────────────────────────────────────────────────────────────────
//  DUPLICATE SERIAL CHECK (BR-EQP-01)
//  cmms_eqip_mst.EQM_SRNO has no UNIQUE index, so we enforce in app code.
// ────────────────────────────────────────────────────────────────────────
async function findBySerialNo(serialNo) {
  const [rows] = await pool.query(
    `SELECT EQM_TYPE, EQM_ID FROM cmms_eqip_mst WHERE EQM_SRNO = ? LIMIT 1`,
    [serialNo],
  );
  return rows[0] || null;
}

// ────────────────────────────────────────────────────────────────────────
//  CREATE — runs inside a transaction the SERVICE owns.
//  Returns the next EQM_ID assigned for this EQM_TYPE.
// ────────────────────────────────────────────────────────────────────────
/**
 * Next EQM_ID for the chosen type. Pessimistic-lock pattern: SELECT FOR
 * UPDATE on the existing max so two concurrent inserts can't collide.
 */
async function nextEqmIdForType(conn, eqmType) {
  const [rows] = await conn.query(
    `SELECT COALESCE(MAX(EQM_ID), 0) + 1 AS next_id
       FROM cmms_eqip_mst
      WHERE EQM_TYPE = ?
      FOR UPDATE`,
    [eqmType],
  );
  return rows[0].next_id;
}

/**
 * INSERT the new equipment row. Must run inside the caller's transaction.
 * @returns {Promise<void>}
 */
async function insertEquipment(conn, payload) {
  await conn.query(
    `INSERT INTO cmms_eqip_mst (
       EQM_TYPE, EQM_ID,
       EQM_NAME, EQM_DIVID, EQM_INST_TYPE,
       EQM_MFRID, EQM_MFG_MODEL_NAME,
       EQM_SRNO, EQM_MODELNO, EQM_OPTIONNDESC,
       EQM_PONO, EQM_PODATE,
       EQM_EQIPCOST, EQM_COSTCURRENCY, EQM_WRNTY_EXPIRY_DATE,
       EQM_REMARKS,
       EQM_DIV_ABBR,
       EQM_SECTION_ID,
       EQM_MVP_STATUS, EQM_MVP_STATUS_AT,
       EQM_REGISTRATION_FLAG, EQM_STANDARD,
       EQM_CREATED_BY, EQM_CREATED_ON,
       EQM_UPDATED_BY, EQM_UPDATED_ON
     ) VALUES (
       ?, ?,
       ?, ?, ?,
       ?, ?,
       ?, ?, ?,
       ?, ?,
       ?, ?, ?,
       ?,
       ?,
       ?,
       ?, NOW(6),
       1, 0,
       ?, NOW(6),
       ?, NOW(6)
     )`,
    [
      payload.EQM_TYPE, payload.EQM_ID,
      payload.EQM_NAME, payload.EQM_DIVID, payload.EQM_INST_TYPE,
      payload.EQM_MFRID, payload.EQM_MFG_MODEL_NAME,
      payload.EQM_SRNO, payload.EQM_MODELNO, payload.EQM_OPTIONNDESC,
      payload.EQM_PONO, payload.EQM_PODATE,
      payload.EQM_EQIPCOST, payload.EQM_COSTCURRENCY, payload.EQM_WRNTY_EXPIRY_DATE,
      payload.EQM_REMARKS,
      payload.EQM_DIV_ABBR,
      payload.EQM_SECTION_ID,
      payload.EQM_MVP_STATUS,
      payload.EQM_CREATED_BY,
      payload.EQM_UPDATED_BY,
    ],
  );
}

// ────────────────────────────────────────────────────────────────────────
//  AUDIT LOG WRITER
//  The real audit_log schema has actor_employee_id / occurred_at / notes
//  (varchar 500) — no JSON column. We squeeze the Phase-6-parked data
//  into `notes` as a compact JSON string. If the serialised string would
//  exceed 500 chars we truncate complaint_description to fit (everything
//  else is short).
// ────────────────────────────────────────────────────────────────────────
function buildAuditNotes(details) {
  const compact = { ...details };
  if (typeof compact.complaint_description === 'string') {
    compact.complaint_description = compact.complaint_description.slice(0, 200);
  }
  let s = JSON.stringify(compact);
  if (s.length > 500) s = s.slice(0, 497) + '...';
  return s;
}

async function writeAuditLog(conn, { actorEmployeeId, actorRoleCode, eqmType, eqmId, ipAddress, userAgent, details }) {
  await conn.query(
    `INSERT INTO audit_log
       (action, actor_employee_id, actor_role_code, entity_type, entity_id, ip_address, user_agent, notes, occurred_at)
     VALUES
       (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
    [
      'EQUIPMENT_REGISTERED',
      actorEmployeeId,
      actorRoleCode || null,
      'equipment',
      `${eqmType}-${eqmId}`,
      ipAddress || null,
      userAgent || null,
      buildAuditNotes(details || {}),
    ],
  );
}

// ────────────────────────────────────────────────────────────────────────
//  PHASE 15  ·  BULK CALIBRATION DONE  (admin legacy-data migration helper)
// ────────────────────────────────────────────────────────────────────────
/**
 * For every equipment row whose EQM_CAL_DUE_DATE is strictly in the past
 * and whose status is neither CONDEMNED nor RETIRED:
 *   • Sets EQM_MVP_STATUS = 'ACTIVE'
 *   • Clears EQM_CAL_DUE_DATE to NULL (stops the red overdue indicator)
 *
 * A single audit_log row is written for the entire bulk operation
 * (not one per equipment — that would be 5 700+ rows for a legacy backlog).
 *
 * @param {import('mysql2/promise').PoolConnection} conn  Caller-owned txn.
 * @param {string} actorEmpId  SUPER_ADMIN employee_id for the audit row.
 * @returns {Promise<number>}  Count of rows actually updated.
 */
async function bulkMarkCalibrationDone(conn, actorEmpId) {
  // Step 1 — write ONE summary audit row BEFORE the UPDATE so the log
  // records what was intended even if the UPDATE somehow fails.
  await conn.query(
    `INSERT INTO audit_log
       (action, actor_employee_id, actor_role_code, entity_type, entity_id,
        ip_address, user_agent, notes, occurred_at)
     VALUES ('EQUIPMENT_BULK_CAL_DONE', ?, NULL, 'equipment', 'BULK',
             NULL, NULL, '{"reason":"Bulk calibration completed — legacy data migration"}',
             NOW(6))`,
    [actorEmpId],
  );

  // Step 2 — batch UPDATE: mark ACTIVE + clear the overdue date.
  const [result] = await conn.query(
    `UPDATE cmms_eqip_mst
        SET EQM_MVP_STATUS  = 'ACTIVE',
            EQM_CAL_DUE_DATE = NULL
      WHERE EQM_CAL_DUE_DATE  < NOW()
        AND EQM_MVP_STATUS NOT IN ('CONDEMNED', 'RETIRED')`,
  );
  return result.affectedRows;
}

module.exports = {
  listEquipment,
  listEquipmentTypes,
  listMakes,
  listDivisions,
  findSectionByCategory,
  findBySerialNo,
  nextEqmIdForType,
  insertEquipment,
  writeAuditLog,
  // Phase 15 addition:
  bulkMarkCalibrationDone,
  SORT_COLUMNS,
};
