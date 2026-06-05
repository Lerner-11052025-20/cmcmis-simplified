'use strict';

const pool = require('../../config/db');

function compactNotes(details) {
  let s = JSON.stringify(details || {});
  if (s.length > 500) s = s.slice(0, 497) + '...';
  return s;
}

async function findEquipment(eqmType, eqmId) {
  const [rows] = await pool.query(
    `SELECT
       e.EQM_TYPE AS eqm_type,
       e.EQM_ID AS eqm_id,
       e.EQM_NAME AS equipment_name,
       e.EQM_DIVID AS current_division_id,
       sm.SM_SHORTNAME AS current_division_code,
       sm.SM_NAME AS current_division_name
     FROM cmms_eqip_mst e
     LEFT JOIN cmms_section_mst sm ON sm.SM_ID = e.EQM_DIVID
     WHERE e.EQM_TYPE = ?
       AND e.EQM_ID = ?
     LIMIT 1`,
    [eqmType, eqmId],
  );
  return rows[0] || null;
}

async function findDivision(divisionId) {
  const [rows] = await pool.query(
    `SELECT SM_ID AS id, SM_SHORTNAME AS code, SM_NAME AS name
       FROM cmms_section_mst
      WHERE SM_ID = ?
      LIMIT 1`,
    [divisionId],
  );
  return rows[0] || null;
}

async function findSsoEmployee(employeeId) {
  const [rows] = await pool.query(
    `SELECT
       sso_user_id,
       employee_id,
       full_name,
       designation,
       email,
       lab_telephone,
       telephone,
       egd_name
     FROM employee_sso_directory
     WHERE employee_id = ?
       AND is_active = 1
     LIMIT 1`,
    [employeeId],
  );
  return rows[0] || null;
}

async function findHeadEmployee(employeeId) {
  if (!employeeId) return null;
  const [rows] = await pool.query(
    `SELECT employee_id, full_name, designation
       FROM employee_sso_directory
      WHERE employee_id = ?
      LIMIT 1`,
    [employeeId],
  );
  return rows[0] || { employee_id: employeeId, full_name: null, designation: null };
}

async function listHeadsForEmployee(employeeId) {
  const [rows] = await pool.query(
    `SELECT
       h.id,
       h.employee_id,
       h.sec_head_employee_id,
       sec.full_name AS sec_head_name,
       sec.designation AS sec_head_designation,
       h.div_head_employee_id,
       divh.full_name AS div_head_name,
       divh.designation AS div_head_designation,
       h.group_head_employee_id,
       grph.full_name AS group_head_name,
       grph.designation AS group_head_designation,
       h.entity_head_employee_id,
       enth.full_name AS entity_head_name,
       enth.designation AS entity_head_designation,
       h.centre_head_employee_id,
       cenh.full_name AS centre_head_name,
       cenh.designation AS centre_head_designation,
       h.update_date
     FROM employee_sso_heads h
     LEFT JOIN employee_sso_directory sec  ON sec.employee_id = h.sec_head_employee_id
     LEFT JOIN employee_sso_directory divh ON divh.employee_id = h.div_head_employee_id
     LEFT JOIN employee_sso_directory grph ON grph.employee_id = h.group_head_employee_id
     LEFT JOIN employee_sso_directory enth ON enth.employee_id = h.entity_head_employee_id
     LEFT JOIN employee_sso_directory cenh ON cenh.employee_id = h.centre_head_employee_id
     WHERE h.employee_id = ?
     ORDER BY h.update_date DESC, h.id DESC
     LIMIT 50`,
    [employeeId],
  );
  return rows;
}

async function insertRequest(conn, payload) {
  const [result] = await conn.query(
    `INSERT INTO master_data_correction_requests (
       status,
       eqm_type, eqm_id, equipment_name,
       current_division_id, current_division_code, current_division_name,
       proposed_division_id, proposed_division_code, proposed_division_name,
       submitted_by_employee_id, submitted_by_name, submitted_by_designation,
       submitted_by_email, submitted_by_lab_phone, submitted_by_room_phone,
       submitted_by_egd_name, submitted_by_subsystem,
       sec_head_employee_id, sec_head_name, sec_head_designation,
       div_head_employee_id, div_head_name, div_head_designation,
       group_head_employee_id, group_head_name, group_head_designation,
       entity_head_employee_id, entity_head_name, entity_head_designation,
       centre_head_employee_id, centre_head_name, centre_head_designation,
       reason, raw_payload
     ) VALUES (
       'SUBMITTED',
       ?, ?, ?,
       ?, ?, ?,
       ?, ?, ?,
       ?, ?, ?,
       ?, ?, ?,
       ?, ?,
       ?, ?, ?,
       ?, ?, ?,
       ?, ?, ?,
       ?, ?, ?,
       ?, ?, ?,
       ?, ?
     )`,
    [
      payload.eqm_type, payload.eqm_id, payload.equipment_name,
      payload.current_division_id, payload.current_division_code, payload.current_division_name,
      payload.proposed_division_id, payload.proposed_division_code, payload.proposed_division_name,
      payload.submitted_by_employee_id, payload.submitted_by_name, payload.submitted_by_designation,
      payload.submitted_by_email, payload.submitted_by_lab_phone, payload.submitted_by_room_phone,
      payload.submitted_by_egd_name, payload.submitted_by_subsystem,
      payload.sec_head_employee_id, payload.sec_head_name, payload.sec_head_designation,
      payload.div_head_employee_id, payload.div_head_name, payload.div_head_designation,
      payload.group_head_employee_id, payload.group_head_name, payload.group_head_designation,
      payload.entity_head_employee_id, payload.entity_head_name, payload.entity_head_designation,
      payload.centre_head_employee_id, payload.centre_head_name, payload.centre_head_designation,
      payload.reason, JSON.stringify(payload.raw_payload || {}),
    ],
  );
  return result.insertId;
}

async function listRequests(params) {
  const where = [];
  const args = [];
  if (params.status) {
    where.push('status = ?');
    args.push(params.status);
  }
  if (params.q) {
    const q = `%${String(params.q).replace(/[%_\\]/g, '\\$&')}%`;
    where.push(`(
      CAST(request_id AS CHAR) LIKE ?
      OR equipment_name LIKE ?
      OR CAST(eqm_id AS CHAR) LIKE ?
      OR submitted_by_employee_id LIKE ?
      OR submitted_by_name LIKE ?
    )`);
    args.push(q, q, q, q, q);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (params.page - 1) * params.page_size;
  const [[rows], [countRows]] = await Promise.all([
    pool.query(
      `SELECT *
         FROM master_data_correction_requests
        ${whereSql}
        ORDER BY created_at DESC, request_id DESC
        LIMIT ? OFFSET ?`,
      [...args, params.page_size, offset],
    ),
    pool.query(
      `SELECT COUNT(*) AS n
         FROM master_data_correction_requests
        ${whereSql}`,
      args,
    ),
  ]);
  return { rows, total: countRows[0].n };
}

async function findRequestForUpdate(conn, requestId) {
  const [rows] = await conn.query(
    `SELECT *
       FROM master_data_correction_requests
      WHERE request_id = ?
      FOR UPDATE`,
    [requestId],
  );
  return rows[0] || null;
}

async function markApproved(conn, requestId, actor, notes) {
  await conn.query(
    `UPDATE master_data_correction_requests
        SET status = 'APPROVED',
            review_notes = ?,
            reviewed_by_employee_id = ?,
            reviewed_by_role = ?,
            reviewed_at = NOW(6)
      WHERE request_id = ?`,
    [notes || null, actor.employeeId, actor.role, requestId],
  );
}

async function markRejected(conn, requestId, actor, notes) {
  await conn.query(
    `UPDATE master_data_correction_requests
        SET status = 'REJECTED',
            review_notes = ?,
            reviewed_by_employee_id = ?,
            reviewed_by_role = ?,
            reviewed_at = NOW(6)
      WHERE request_id = ?`,
    [notes || null, actor.employeeId, actor.role, requestId],
  );
}

async function updateEquipmentDivision(conn, row, actor) {
  await conn.query(
    `UPDATE cmms_eqip_mst
        SET EQM_DIVID = ?,
            EQM_DIV_ABBR = ?,
            EQM_UPDATED_BY = ?,
            EQM_UPDATED_ON = NOW(6)
      WHERE EQM_TYPE = ?
        AND EQM_ID = ?`,
    [
      row.proposed_division_id,
      row.proposed_division_code,
      actor.employeeId,
      row.eqm_type,
      row.eqm_id,
    ],
  );
}

async function writeAuditLog(conn, { actor, action, requestId, ipAddress, userAgent, details }) {
  await conn.query(
    `INSERT INTO audit_log
       (action, actor_employee_id, actor_role_code, entity_type, entity_id, ip_address, user_agent, notes, occurred_at)
     VALUES (?, ?, ?, 'master_data_correction', ?, ?, ?, ?, NOW(6))`,
    [
      action,
      actor.employeeId,
      actor.role || null,
      String(requestId),
      ipAddress || null,
      userAgent || null,
      compactNotes(details),
    ],
  );
}

module.exports = {
  pool,
  findEquipment,
  findDivision,
  findSsoEmployee,
  findHeadEmployee,
  listHeadsForEmployee,
  insertRequest,
  listRequests,
  findRequestForUpdate,
  markApproved,
  markRejected,
  updateEquipmentDivision,
  writeAuditLog,
};
