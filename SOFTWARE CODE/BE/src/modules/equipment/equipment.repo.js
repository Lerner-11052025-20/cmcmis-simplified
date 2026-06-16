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
  model_no: 'e.EQM_MODELNO',
  make: 'm.CMM_CONT_NAME',
};
const ORDER_DIRS = { asc: 'ASC', desc: 'DESC' };

const FT_MIN_CHARS = 3;

function buildLikePrefix(q) {
  return q.replace(/[%_\\]/g, '\\$&') + '%';
}

function buildBooleanFtPattern(q) {
  const cleaned = q.replace(/[^\p{L}\p{N}\-.]+/gu, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(/\s+/)
    .filter((tok) => tok.length >= 2)
    .map((tok) => `${tok}*`)
    .join(' ');
}

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
  const { page, page_size, q, type_id, eqm_type, status, model_no, make, sort, order, category } = params;

  // WHERE builder with bound parameters
  const where = [];
  const args = [];

  const cleanQ = q ? String(q).trim() : '';

  if (cleanQ) {
    const ftPattern = cleanQ.length >= FT_MIN_CHARS ? buildBooleanFtPattern(cleanQ) : null;
    if (ftPattern) {
      where.push(`(
        MATCH (e.EQM_NAME, e.EQM_MODELNO, e.EQM_SRNO) AGAINST (? IN BOOLEAN MODE)
        OR m.CMM_CONT_NAME LIKE ?
        OR CAST(e.EQM_ID AS CHAR) LIKE ?
        OR CONCAT(e.EQM_TYPE, '-', e.EQM_ID) LIKE ?
        OR CONCAT('EQ-', UPPER(LEFT(e.EQM_TYPE, 3)), '-', LPAD(e.EQM_ID, 4, '0')) LIKE ?
      )`);
      const likePrefix = buildLikePrefix(cleanQ);
      args.push(ftPattern, likePrefix, likePrefix, likePrefix, likePrefix);
    } else {
      where.push(`(
        e.EQM_NAME LIKE ?
        OR m.CMM_CONT_NAME LIKE ?
        OR CAST(e.EQM_ID AS CHAR) LIKE ?
        OR CONCAT(e.EQM_TYPE, '-', e.EQM_ID) LIKE ?
        OR CONCAT('EQ-', UPPER(LEFT(e.EQM_TYPE, 3)), '-', LPAD(e.EQM_ID, 4, '0')) LIKE ?
      )`);
      const likePrefix = buildLikePrefix(cleanQ);
      args.push(likePrefix, likePrefix, likePrefix, likePrefix, likePrefix);
    }
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
  if (model_no) {
    where.push('e.EQM_MODELNO LIKE ?');
    args.push(`%${model_no}%`);
  }
  if (make) {
    where.push('m.CMM_CONT_NAME LIKE ?');
    args.push(`%${make}%`);
  }
  if (category) {
    where.push('e.category = ?');
    args.push(category);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Allow-list sort/order; if invalid (cannot happen after zod) fall back.
  const sortSql = SORT_COLUMNS[sort] || SORT_COLUMNS.equipment_code;
  const orderSql = ORDER_DIRS[order] || 'ASC';
  const searchRankSql = cleanQ
    ? `CASE
         WHEN CAST(e.EQM_ID AS CHAR) = ? THEN 0
         WHEN CONCAT('EQ-', UPPER(LEFT(e.EQM_TYPE, 3)), '-', LPAD(e.EQM_ID, 4, '0')) = ? THEN 1
         WHEN CONCAT(e.EQM_TYPE, '-', e.EQM_ID) = ? THEN 2
         ELSE 3
       END, `
    : '';
  const searchRankArgs = cleanQ ? [cleanQ, cleanQ, cleanQ] : [];
  // Always tie-break by the full PK to make pagination deterministic.
  const tieBreak = ', e.EQM_TYPE ASC, e.EQM_ID ASC';

  const offset = (page - 1) * page_size;

  // Two queries, both narrow SELECTs — no SELECT *.
  const dataSql = `
    SELECT
      e.EQM_TYPE                        AS eqm_type,
      e.EQM_ID                          AS eqm_id,
      e.category                        AS category,
      e.EQM_NAME                        AS name,
      p.PROD_NAME                       AS type_name,
      m.CMM_CONT_NAME                   AS make,
      e.EQM_MODELNO                     AS model_no,
      e.EQM_SRNO                        AS serial_no,
      e.EQM_CAL_DUE_DATE                AS next_cal_due_date,
      e.EQM_CAL_FREQ                    AS maintenance_frequency_months,
      COALESCE(s.section_code, e.EQM_DIV_ABBR) AS division_code,
      COALESCE(s.section_name,  ls.SM_SHORTNAME, e.EQM_DIV_ABBR) AS location_name,
      e.EQM_DIV_ABBR                    AS division_abbr,
      e.EQM_MVP_STATUS                  AS status
    FROM cmms_eqip_mst e
    LEFT JOIN cmms_cont_mst    m  ON m.CMM_CONT_ID = e.EQM_MFRID
    LEFT JOIN cmms_product_mst p  ON p.PROD_ID     = e.EQM_INST_TYPE
    LEFT JOIN sections         s  ON s.section_id  = e.EQM_SECTION_ID
    LEFT JOIN cmms_section_mst ls ON ls.SM_ID      = e.EQM_DIVID
    ${whereSql}
    ORDER BY ${searchRankSql}${sortSql} ${orderSql}${tieBreak}
    LIMIT ? OFFSET ?`;

  const countSql = `
    SELECT COUNT(*) AS n
    FROM cmms_eqip_mst e
    LEFT JOIN cmms_cont_mst m ON m.CMM_CONT_ID = e.EQM_MFRID
    ${whereSql}`;

  // Run both queries in parallel — same pool, independent connections.
  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, [...args, ...searchRankArgs, page_size, offset]),
    pool.query(countSql, args),
  ]);

  return { rows, total: countRows[0].n };
}

async function getEquipmentByCompositeId(eqmType, eqmId) {
  const [rows] = await pool.query(
    `SELECT
       e.EQM_TYPE AS eqm_type,
       e.EQM_ID AS eqm_id,
       e.category AS category,
       e.EQM_NAME AS name,
       e.EQM_INST_TYPE AS equipment_type_id,
       p.PROD_NAME AS type_name,
       e.EQM_MFRID AS make_id,
       m.CMM_CONT_NAME AS make,
       e.EQM_DIVID AS division_id,
       e.EQM_MFG_MODEL_NAME AS mfg_model_name,
       e.EQM_MODELNO AS model_no,
       e.EQM_SRNO AS serial_no,
       e.EQM_OPTIONNDESC AS options_description,
       e.EQM_PONO AS po_number,
       e.EQM_PODATE AS po_date,
       e.EQM_EQIPCOST AS cost,
       e.EQM_COSTCURRENCY AS currency,
       e.EQM_WRNTY_EXPIRY_DATE AS warranty_expiry_date,
       e.EQM_CAL_FREQ AS maintenance_frequency_months,
       e.EQM_CAL_DUE_DATE AS next_cal_due_date,
       e.EQM_REMARKS AS remarks,
       COALESCE(s.section_code, e.EQM_DIV_ABBR) AS division_code,
       COALESCE(s.section_name, ls.SM_NAME, ls.SM_SHORTNAME, e.EQM_DIV_ABBR) AS location_name,
       e.EQM_MVP_STATUS AS status,
       e.EQM_MVP_STATUS_AT AS status_at,
       e.EQM_CREATED_BY AS created_by,
       e.EQM_CREATED_ON AS created_on,
       e.EQM_UPDATED_BY AS updated_by,
       e.EQM_UPDATED_ON AS updated_on
     FROM cmms_eqip_mst e
     LEFT JOIN cmms_cont_mst    m  ON m.CMM_CONT_ID = e.EQM_MFRID
     LEFT JOIN cmms_product_mst p  ON p.PROD_ID     = e.EQM_INST_TYPE
     LEFT JOIN sections         s  ON s.section_id  = e.EQM_SECTION_ID
     LEFT JOIN cmms_section_mst ls ON ls.SM_ID      = e.EQM_DIVID
     WHERE e.EQM_TYPE = ?
       AND e.EQM_ID = ?
     LIMIT 1`,
    [eqmType, eqmId],
  );
  return rows[0] || null;
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
      ORDER BY SM_ID ASC
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

async function findBySerialNoExcept(serialNo, eqmType, eqmId) {
  const [rows] = await pool.query(
    `SELECT EQM_TYPE, EQM_ID
       FROM cmms_eqip_mst
      WHERE EQM_SRNO = ?
        AND NOT (EQM_TYPE = ? AND EQM_ID = ?)
      LIMIT 1`,
    [serialNo, eqmType, eqmId],
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
       EQM_TYPE, EQM_ID, category,
       EQM_NAME, EQM_DIVID, EQM_INST_TYPE,
       EQM_MFRID, EQM_MFG_MODEL_NAME,
       EQM_SRNO, EQM_MODELNO, EQM_OPTIONNDESC,
       EQM_PONO, EQM_PODATE,
       EQM_EQIPCOST, EQM_COSTCURRENCY, EQM_CAL_FREQ, EQM_WRNTY_EXPIRY_DATE,
       EQM_REMARKS,
       EQM_DIV_ABBR,
       EQM_SECTION_ID,
       EQM_MVP_STATUS, EQM_MVP_STATUS_AT,
       EQM_REGISTRATION_FLAG, EQM_STANDARD,
       EQM_CREATED_BY, EQM_CREATED_ON,
       EQM_UPDATED_BY, EQM_UPDATED_ON
     ) VALUES (
       ?, ?, ?,
       ?, ?, ?,
       ?, ?,
       ?, ?, ?,
       ?, ?,
       ?, ?, ?, ?,
       ?,
       ?,
       ?,
       ?, NOW(6),
       1, 0,
       ?, NOW(6),
       ?, NOW(6)
     )`,
    [
      payload.EQM_TYPE, payload.EQM_ID, payload.category,
      payload.EQM_NAME, payload.EQM_DIVID, payload.EQM_INST_TYPE,
      payload.EQM_MFRID, payload.EQM_MFG_MODEL_NAME,
      payload.EQM_SRNO, payload.EQM_MODELNO, payload.EQM_OPTIONNDESC,
      payload.EQM_PONO, payload.EQM_PODATE,
      payload.EQM_EQIPCOST, payload.EQM_COSTCURRENCY, payload.EQM_CAL_FREQ, payload.EQM_WRNTY_EXPIRY_DATE,
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
//  ACCESSORY PERSISTENCE
// ────────────────────────────────────────────────────────────────────────
async function insertEquipmentAccessory(conn, payload) {
  await conn.query(
    `INSERT INTO cmms_eqipinst_identification
       (EMD_EQIP_TYPE, EQM_ID, EII_ID, EII_TYPE, EII_NAME, EII_MODELNO, EII_SRNO, EII_INUSE, EII_CALREQ, EII_REMARKS)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, NULL)`,
    [
      String(payload.eqm_type || '').slice(0, 15),
      payload.eqm_id,
      payload.eii_id,
      String(payload.eii_type || '').slice(0, 50),
      String(payload.eii_name || '').slice(0, 50),
      String(payload.eii_modelno || '').slice(0, 50),
      String(payload.eii_srno || '').slice(0, 50),
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

async function verifyEquipment(conn, eqmType, eqmId, actorEmpId) {
  const [result] = await conn.query(
    `UPDATE cmms_eqip_mst
        SET EQM_MVP_STATUS = 'ACTIVE',
            EQM_MVP_STATUS_AT = NOW(6),
            EQM_VERIFIED_BY = ?,
            EQM_VERIFIED_ON = NOW(6),
            EQM_UPDATED_BY = ?,
            EQM_UPDATED_ON = NOW(6)
      WHERE EQM_TYPE = ?
        AND EQM_ID = ?
        AND EQM_MVP_STATUS = 'PENDING_VERIFICATION'`,
    [actorEmpId, actorEmpId, eqmType, eqmId],
  );
  return result.affectedRows;
}

async function updateEquipmentDetails(conn, eqmType, eqmId, payload) {
  const [result] = await conn.query(
    `UPDATE cmms_eqip_mst
        SET category = ?,
            EQM_NAME = ?,
            EQM_DIVID = ?,
            EQM_INST_TYPE = ?,
            EQM_MFRID = ?,
            EQM_MFG_MODEL_NAME = ?,
            EQM_SRNO = ?,
            EQM_MODELNO = ?,
            EQM_OPTIONNDESC = ?,
            EQM_PONO = ?,
            EQM_PODATE = ?,
            EQM_EQIPCOST = ?,
            EQM_COSTCURRENCY = ?,
            EQM_CAL_FREQ = ?,
            EQM_WRNTY_EXPIRY_DATE = ?,
            EQM_DIV_ABBR = ?,
            EQM_SECTION_ID = ?,
            EQM_UPDATED_BY = ?,
            EQM_UPDATED_ON = NOW(6)
      WHERE EQM_TYPE = ?
        AND EQM_ID = ?
        AND EQM_MVP_STATUS = 'PENDING_VERIFICATION'`,
    [
      payload.category,
      payload.EQM_NAME,
      payload.EQM_DIVID,
      payload.EQM_INST_TYPE,
      payload.EQM_MFRID,
      payload.EQM_MFG_MODEL_NAME,
      payload.EQM_SRNO,
      payload.EQM_MODELNO,
      payload.EQM_OPTIONNDESC,
      payload.EQM_PONO,
      payload.EQM_PODATE,
      payload.EQM_EQIPCOST,
      payload.EQM_COSTCURRENCY,
      payload.EQM_CAL_FREQ,
      payload.EQM_WRNTY_EXPIRY_DATE,
      payload.EQM_DIV_ABBR,
      payload.EQM_SECTION_ID,
      payload.EQM_UPDATED_BY,
      eqmType,
      eqmId,
    ],
  );
  return result.affectedRows;
}

async function listProjects() {
  const [rows] = await pool.query(
    `SELECT PR_ID AS project_id, PR_NAME AS name
       FROM cmms_proj_mst
      WHERE PR_STATE = 1
      ORDER BY PR_NAME ASC
      LIMIT 2000`,
  );
  return rows;
}

async function findManufacturerByName(conn, name) {
  const [rows] = await conn.query(
    `SELECT CMM_CONT_ID AS make_id FROM cmms_cont_mst WHERE LOWER(CMM_CONT_NAME) = LOWER(?) LIMIT 1`,
    [name.trim()],
  );
  return rows[0]?.make_id || null;
}

async function insertManufacturer(conn, { name, employeeId }) {
  const [result] = await conn.query(
    `INSERT INTO cmms_cont_mst (
       CMM_CONT_NAME, CMM_CONT_TYPE, CMM_CONT_NABL, CMM_CONT_STATE_FLAG,
       CMM_CONT_CREATED_BY, CMM_CONT_CREATED_ON, CMM_CONT_UPDATED_BY, CMM_CONT_UPDATED_ON
     ) VALUES (
       ?, 'MFR', 0, 1, ?, NOW(6), ?, NOW(6)
     )`,
    [name.trim(), employeeId, employeeId],
  );
  return result.insertId;
}

async function deleteEquipmentAccessories(conn, eqmType, eqmId) {
  await conn.query(
    `DELETE FROM cmms_eqipinst_identification WHERE EMD_EQIP_TYPE = ? AND EQM_ID = ?`,
    [eqmType, eqmId],
  );
}

async function deleteEquipment(conn, eqmType, eqmId) {
  const [result] = await conn.query(
    `DELETE FROM cmms_eqip_mst WHERE EQM_TYPE = ? AND EQM_ID = ?`,
    [eqmType, eqmId],
  );
  return result.affectedRows;
}

async function getEquipmentAccessories(eqmType, eqmId) {
  const [rows] = await pool.query(
    `SELECT
       EII_ID      AS id,
       EII_TYPE    AS type,
       EII_NAME    AS name,
       EII_MODELNO AS model_no,
       EII_SRNO    AS serial_no,
       EII_INUSE   AS in_use,
       EII_CALREQ  AS calibration_required,
       EII_REMARKS AS remarks
     FROM cmms_eqipinst_identification
     WHERE EMD_EQIP_TYPE = ?
       AND EQM_ID = ?
     ORDER BY EII_ID ASC`,
    [eqmType, eqmId],
  );
  return rows;
}

async function getFpeRepairHistory(eqmType, eqmId) {
  const [rows] = await pool.query(
    `SELECT
       jc.JM_SectionJobNo AS section_job_no,
       jc.JM_JobCardNO AS jc_no,
       jc.JM_PARENT_JR_NO AS jr_no,
       jc.JM_JCRecdDate AS received_date,
       jc.JM_JobEndDate AS completed_at,
       jc.JM_CREATED_ON AS created_at,
       jc.JM_MVP_STATUS AS status,
       jc.repair_job_received_date,
       jc.repair_job_start_planned_date,
       jc.repair_job_complete_date,
       jc.repair_type,
       jc.repair_status,
       jc.repair_fault_category,
       jc.repair_faulty_section,
       jc.repair_fault_description,
       jc.repair_action_taken_description,
       jc.repair_fault_analysis_description,
       jc.repair_fault_analysis_action_taken,
       jc.repair_fault_analysis_sections,
       jc.repair_fault_analysis_category,
       jc.repair_not_repairable_reason,
       jc.repair_remarks,
       jc.repair_attended_by_employee_id,
       emp_att.EMM_NAME AS repair_attended_by_name,
       jr.JR_JOBREQUESTNO AS job_request_no,
       jr.JR_JOBREQUESTDATE AS reported_date,
       jr.JR_SUBMITTEDBYID AS reported_by_employee_id,
       emp_req.EMM_NAME AS reported_by_name,
       COALESCE(sp.spare_parts_used, '') AS spare_parts_used,
       sp.total_spare_cost
     FROM cmms_jobcard_mst jc
     LEFT JOIN cmms_jobrequest_mst jr
            ON jr.JR_SECTIONJOB_NO = jc.JM_SectionJobNo
            OR jr.JR_JOBREQUESTNO = jc.JM_PARENT_JR_NO
     LEFT JOIN cmms_emp_mst emp_req ON emp_req.EMM_ID = jr.JR_SUBMITTEDBYID
     LEFT JOIN cmms_emp_mst emp_att ON emp_att.EMM_ID = jc.repair_attended_by_employee_id
     LEFT JOIN (
       SELECT
         jc_section_no,
         GROUP_CONCAT(
           NULLIF(
             TRIM(CONCAT_WS(' ', part_description, part_no, CASE WHEN quantity IS NULL THEN NULL ELSE CONCAT('x', quantity) END)),
             ''
           )
           ORDER BY sr_no ASC, id ASC
           SEPARATOR ', '
         ) AS spare_parts_used,
         SUM(cost) AS total_spare_cost
       FROM jc_spares_used
       GROUP BY jc_section_no
     ) sp ON sp.jc_section_no = jc.JM_SectionJobNo
     WHERE jc.JM_EQM_TYPE = ?
       AND jc.JM_EQM_ID = ?
       AND jc.JM_JOB_CATEGORY = 'FPE'
       AND jc.JM_JOB_TYPE = 'REPAIR'
     ORDER BY COALESCE(jc.repair_job_complete_date, jc.JM_JobEndDate, jc.JM_CREATED_ON) DESC,
              jc.JM_JobCardNO DESC
     LIMIT 20`,
    [eqmType, eqmId],
  );
  return rows;
}

async function getEquipmentForExport(startId, endId) {
  const [rows] = await pool.query(
    `SELECT
       e.EQM_TYPE                        AS eqm_type,
       e.EQM_ID                          AS eqm_id,
       e.EQM_NAME                        AS name,
       p.PROD_NAME                       AS type_name,
       m.CMM_CONT_NAME                   AS make,
       e.EQM_MODELNO                     AS model_no,
       e.EQM_SRNO                        AS serial_no,
       e.EQM_DIV_ABBR                    AS division_abbr,
       e.EQM_MVP_STATUS                  AS status
     FROM cmms_eqip_mst e
     LEFT JOIN cmms_cont_mst    m  ON m.CMM_CONT_ID = e.EQM_MFRID
     LEFT JOIN cmms_product_mst p  ON p.PROD_ID     = e.EQM_INST_TYPE
     WHERE e.EQM_ID >= ?
       AND e.EQM_ID <= ?
     ORDER BY e.EQM_TYPE ASC, e.EQM_ID ASC`,
    [startId, endId],
  );
  return rows;
}

module.exports = {
  listEquipment,
  getEquipmentByCompositeId,
  listEquipmentTypes,
  listMakes,
  listDivisions,
  listProjects,
  findSectionByCategory,
  findBySerialNo,
  findBySerialNoExcept,
  nextEqmIdForType,
  insertEquipment,
  writeAuditLog,
  insertEquipmentAccessory,
  findManufacturerByName,
  insertManufacturer,
  deleteEquipmentAccessories,
  deleteEquipment,
  getEquipmentAccessories,
  getFpeRepairHistory,
  // Phase 15 addition:
  bulkMarkCalibrationDone,
  verifyEquipment,
  updateEquipmentDetails,
  getEquipmentForExport,
  SORT_COLUMNS,
};
