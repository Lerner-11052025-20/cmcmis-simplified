'use strict';

const pool = require('../../config/db');

function normalizeEquipmentCode(row) {
  if (!row) return null;
  return `EQ-${String(row.eqm_type || '').toUpperCase().slice(0, 3)}-${String(row.eqm_id).padStart(4, '0')}`;
}

async function findEquipmentByCode(code) {
  const raw = String(code || '').trim();
  if (!raw) return null;

  const [rows] = await pool.query(
    `SELECT
       e.EQM_TYPE AS eqm_type,
       e.EQM_ID AS eqm_id,
       e.EQM_NAME AS equipment_name,
       e.EQM_MODELNO AS equipment_model_no,
       e.EQM_SRNO AS equipment_serial_no,
       m.CMM_CONT_NAME AS equipment_make,
       COALESCE(s.section_name, sm.SM_NAME, sm.SM_SHORTNAME, e.EQM_DIV_ABBR) AS equipment_division,
       p.PROD_NAME AS equipment_category
     FROM cmms_eqip_mst e
     LEFT JOIN cmms_cont_mst m ON m.CMM_CONT_ID = e.EQM_MFRID
     LEFT JOIN cmms_product_mst p ON p.PROD_ID = e.EQM_INST_TYPE
     LEFT JOIN sections s ON s.section_id = e.EQM_SECTION_ID
     LEFT JOIN cmms_section_mst sm ON sm.SM_ID = e.EQM_DIVID
     WHERE CONCAT(e.EQM_TYPE, '-', e.EQM_ID) = ?
        OR CONCAT('EQ-', UPPER(LEFT(e.EQM_TYPE, 3)), '-', LPAD(e.EQM_ID, 4, '0')) = ?
        OR CAST(e.EQM_ID AS CHAR) = ?
     ORDER BY e.EQM_TYPE ASC, e.EQM_ID ASC
     LIMIT 1`,
    [raw, raw, raw],
  );
  const item = rows[0] || null;
  return item ? { ...item, equipment_code: normalizeEquipmentCode(item) } : null;
}

async function listTaskMaster({ q, limit }) {
  const args = [];
  const where = [`TSK_TYPE = 'Calibration'`, `TSK_STATE IN (0, 1)`];
  if (q) {
    where.push(`(TSK_NAME LIKE ? OR TSK_DESC LIKE ?)`);
    args.push(`%${q}%`, `%${q}%`);
  }
  args.push(Math.min(Math.max(Number(limit) || 2000, 1), 5000));

  const [rows] = await pool.query(
    `SELECT
       TSK_ID AS id,
       TSK_NAME AS name,
       TSK_TYPE AS type,
       TSK_DESC AS description
     FROM cmms_task_mst
     WHERE ${where.join(' AND ')}
     ORDER BY TSK_NAME ASC
     LIMIT ?`,
    args,
  );
  return rows;
}

async function listChecklists({ q }) {
  const args = [];
  const where = [];
  if (q) {
    where.push(`(
      cm.checklist_name LIKE ?
      OR cm.equipment_code LIKE ?
      OR cm.equipment_name LIKE ?
      OR cm.equipment_model_no LIKE ?
    )`);
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT
       cm.*,
       COALESCE(tc.task_count, 0) AS task_count
     FROM checklists_master cm
     LEFT JOIN (
       SELECT checklist_id, COUNT(*) AS task_count
       FROM checklist_master_tasks
       GROUP BY checklist_id
     ) tc ON tc.checklist_id = cm.id
     ${whereSql}
     ORDER BY cm.updated_at DESC, cm.id DESC`,
    args,
  );
  return rows;
}

async function getChecklist(id) {
  const [rows] = await pool.query(
    `SELECT cm.*
     FROM checklists_master cm
     WHERE cm.id = ?
     LIMIT 1`,
    [id],
  );
  const checklist = rows[0] || null;
  if (!checklist) return null;
  const [tasks] = await pool.query(
    `SELECT id, task_id, task_text, task_type, is_custom, order_index
     FROM checklist_master_tasks
     WHERE checklist_id = ?
     ORDER BY order_index ASC, id ASC`,
    [id],
  );
  return { ...checklist, tasks };
}

async function nextChecklistCode(conn) {
  const [[row]] = await conn.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(checklist_code, 4) AS UNSIGNED)), 0) + 1 AS next_no
     FROM checklists_master
     WHERE checklist_code LIKE 'CL-%'
     FOR UPDATE`,
  );
  return `CL-${String(row.next_no).padStart(3, '0')}`;
}

async function insertChecklist({ checklistName, equipment, tasks, actor }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const checklistCode = await nextChecklistCode(conn);
    const [result] = await conn.query(
      `INSERT INTO checklists_master (
        checklist_code, checklist_name, equipment_type, equipment_id, equipment_code,
        equipment_name, equipment_model_no, equipment_serial_no, equipment_make,
        equipment_division, equipment_category, created_by_employee_id, updated_by_employee_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        checklistCode,
        checklistName,
        equipment.eqm_type,
        equipment.eqm_id,
        equipment.equipment_code,
        equipment.equipment_name,
        equipment.equipment_model_no,
        equipment.equipment_serial_no,
        equipment.equipment_make,
        equipment.equipment_division,
        equipment.equipment_category,
        actor.employeeId,
        actor.employeeId,
      ],
    );
    const checklistId = result.insertId;
    await replaceTasks(conn, checklistId, tasks);
    await conn.commit();
    return getChecklist(checklistId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateChecklist(id, { checklistName, equipment, tasks, isActive, actor }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE checklists_master
       SET checklist_name = ?,
           equipment_type = ?,
           equipment_id = ?,
           equipment_code = ?,
           equipment_name = ?,
           equipment_model_no = ?,
           equipment_serial_no = ?,
           equipment_make = ?,
           equipment_division = ?,
           equipment_category = ?,
           is_active = ?,
           updated_by_employee_id = ?
       WHERE id = ?`,
      [
        checklistName,
        equipment.eqm_type,
        equipment.eqm_id,
        equipment.equipment_code,
        equipment.equipment_name,
        equipment.equipment_model_no,
        equipment.equipment_serial_no,
        equipment.equipment_make,
        equipment.equipment_division,
        equipment.equipment_category,
        isActive ? 1 : 0,
        actor.employeeId,
        id,
      ],
    );
    await conn.query(`DELETE FROM checklist_master_tasks WHERE checklist_id = ?`, [id]);
    await replaceTasks(conn, id, tasks);
    await conn.commit();
    return getChecklist(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function replaceTasks(conn, checklistId, tasks) {
  if (!tasks.length) return;
  const values = tasks.map((task, index) => [
    checklistId,
    task.task_id || null,
    task.task_text,
    task.task_type || 'NABL',
    task.is_custom ? 1 : 0,
    index,
  ]);
  await conn.query(
    `INSERT INTO checklist_master_tasks
      (checklist_id, task_id, task_text, task_type, is_custom, order_index)
     VALUES ?`,
    [values],
  );
}

async function deleteChecklist(id) {
  const [result] = await pool.query(`DELETE FROM checklists_master WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

async function listChecklistsForEquipment(equipmentType, equipmentId) {
  const [rows] = await pool.query(
    `SELECT
       cm.*,
       COUNT(cmt.id) AS task_count
     FROM checklists_master cm
     LEFT JOIN checklist_master_tasks cmt ON cmt.checklist_id = cm.id
     WHERE cm.equipment_type = ?
       AND cm.equipment_id = ?
       AND cm.is_active = 1
     GROUP BY cm.id
     ORDER BY cm.checklist_name ASC`,
    [equipmentType, equipmentId],
  );
  return rows;
}

async function applyChecklistToJobCard({ sectionJobNo, checklistId, actor }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [tasks] = await conn.query(
      `SELECT task_id, task_text, task_type, is_custom, order_index
       FROM checklist_master_tasks
       WHERE checklist_id = ?
       ORDER BY order_index ASC, id ASC`,
      [checklistId],
    );
    if (!tasks.length) {
      await conn.commit();
      return { inserted: 0 };
    }

    const [[mx]] = await conn.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_idx
       FROM jc_calibration_task_checklist
       WHERE jc_section_no = ?`,
      [sectionJobNo],
    );
    const rows = tasks.map((task, index) => [
      sectionJobNo,
      checklistId,
      task.task_id || null,
      task.task_text,
      task.task_type || null,
      task.is_custom ? 1 : 0,
      mx.next_idx + index,
      actor.employeeId,
    ]);
    await conn.query(
      `INSERT INTO jc_calibration_task_checklist
        (jc_section_no, checklist_id, task_id, task_text, task_type, is_custom, order_index, created_by_employee_id)
       VALUES ?`,
      [rows],
    );
    await conn.commit();
    return { inserted: rows.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  findEquipmentByCode,
  listTaskMaster,
  listChecklists,
  getChecklist,
  insertChecklist,
  updateChecklist,
  deleteChecklist,
  listChecklistsForEquipment,
  applyChecklistToJobCard,
};
