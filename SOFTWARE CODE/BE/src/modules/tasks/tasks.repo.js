// ============================================================================
// src/modules/tasks/tasks.repo.js  —  DAL for legacy tasks master
// ----------------------------------------------------------------------------
// Encapsulates parameterised SQL queries to `cmms_task_mst` table.
// ============================================================================

'use strict';

const pool = require('../../config/db');

/**
 * Fetch a paginated list of tasks with search filtering.
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.pageSize
 * @param {string} [params.q]
 * @param {string} [params.type]
 * @returns {Promise<{ items: Array, total: number }>}
 */
async function findAndCount({ page, pageSize, q, type }) {
  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;
  const searchLike = q ? `%${q}%` : null;
  const typeLike = type ? `%${type}%` : null;

  let querySql = `
    SELECT TSK_ID AS id, TSK_NAME AS name, TSK_TYPE AS type, TSK_DESC AS ` + "`desc`" + `, TSK_EST_HOUR AS est_hour, TSK_STATE AS is_active,
           TSK_CREATED_BY AS created_by, TSK_CREATED_ON AS created_on,
           TSK_UPDATED_BY AS updated_by, TSK_UPDATED_ON AS updated_on
      FROM cmms_task_mst
  `;
  let countSql = `
    SELECT COUNT(*) AS total
      FROM cmms_task_mst
  `;

  const whereClauses = [];
  const args = [];

  if (searchLike) {
    whereClauses.push('(TSK_NAME LIKE ? OR TSK_DESC LIKE ?)');
    args.push(searchLike, searchLike);
  }

  if (typeLike) {
    whereClauses.push('TSK_TYPE LIKE ?');
    args.push(typeLike);
  }

  if (whereClauses.length > 0) {
    const whereStr = ` WHERE ${whereClauses.join(' AND ')}`;
    querySql += whereStr;
    countSql += whereStr;
  }

  querySql += ' ORDER BY TSK_NAME ASC LIMIT ? OFFSET ?';
  const queryArgs = [...args, limit, offset];

  const [[{ total }]] = await pool.query(countSql, args);
  const [items] = await pool.query(querySql, queryArgs);

  return { items, total };
}

/**
 * Fetch a single task by its primary key ID.
 * @param {number} id
 * @returns {Promise<Object | null>}
 */
async function findById(id) {
  const [rows] = await pool.query(
    `SELECT TSK_ID AS id, TSK_NAME AS name, TSK_TYPE AS type, TSK_DESC AS ` + "`desc`" + `, TSK_EST_HOUR AS est_hour, TSK_STATE AS is_active,
            TSK_CREATED_BY AS created_by, TSK_CREATED_ON AS created_on,
            TSK_UPDATED_BY AS updated_by, TSK_UPDATED_ON AS updated_on
       FROM cmms_task_mst
      WHERE TSK_ID = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Check if a task with the same name and type already exists.
 * @param {string} name
 * @param {string} type
 * @param {number} [excludeId]
 * @returns {Promise<boolean>}
 */
async function existsByNameAndType(name, type, excludeId = null) {
  let sql = 'SELECT 1 FROM cmms_task_mst WHERE LOWER(TSK_NAME) = LOWER(?) AND LOWER(TSK_TYPE) = LOWER(?)';
  const args = [name.trim(), type.trim()];

  if (excludeId !== null) {
    sql += ' AND TSK_ID != ?';
    args.push(excludeId);
  }

  const [rows] = await pool.query(sql + ' LIMIT 1', args);
  return rows.length > 0;
}

/**
 * Insert a new task row, dynamically resolving the next sequential ID.
 * @param {Object} payload
 * @param {string} payload.name
 * @param {string} payload.type
 * @param {string|null} [payload.desc]
 * @param {number|null} [payload.est_hour]
 * @param {number} payload.is_active
 * @param {string} payload.employee_id
 * @returns {Promise<Object>}
 */
async function insert({ name, type, desc, est_hour, is_active, employee_id }) {
  // Safe transactional next key resolution
  const [[{ nextId }]] = await pool.query('SELECT COALESCE(MAX(TSK_ID), 0) + 1 AS nextId FROM cmms_task_mst');

  await pool.query(
    `INSERT INTO cmms_task_mst (TSK_ID, TSK_EMP_ID, TSK_NAME, TSK_TYPE, TSK_DESC, TSK_EST_HOUR, TSK_STATE, TSK_CREATED_BY, TSK_CREATED_ON, TSK_UPDATED_BY, TSK_UPDATED_ON)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6), ?, NOW(6))`,
    [nextId, employee_id, name.trim(), type.trim(), desc || null, est_hour || null, is_active, employee_id, employee_id]
  );

  return { id: nextId, name: name.trim(), type: type.trim(), desc, est_hour, is_active };
}

/**
 * Update an existing task row.
 * @param {number} id
 * @param {Object} payload
 * @param {string} [payload.name]
 * @param {string} [payload.type]
 * @param {string|null} [payload.desc]
 * @param {number|null} [payload.est_hour]
 * @param {number} [payload.is_active]
 * @param {string} payload.employee_id
 * @returns {Promise<boolean>}
 */
async function update(id, { name, type, desc, est_hour, is_active, employee_id }) {
  const fields = [];
  const args = [];

  if (name !== undefined) {
    fields.push('TSK_NAME = ?');
    args.push(name.trim());
  }

  if (type !== undefined) {
    fields.push('TSK_TYPE = ?');
    args.push(type.trim());
  }

  if (desc !== undefined) {
    fields.push('TSK_DESC = ?');
    args.push(desc || null);
  }

  if (est_hour !== undefined) {
    fields.push('TSK_EST_HOUR = ?');
    args.push(est_hour || null);
  }

  if (is_active !== undefined) {
    fields.push('TSK_STATE = ?');
    args.push(is_active);
  }

  if (fields.length === 0) return false;

  fields.push('TSK_UPDATED_BY = ?');
  args.push(employee_id);

  fields.push('TSK_UPDATED_ON = NOW(6)');

  args.push(id);

  const [result] = await pool.query(
    `UPDATE cmms_task_mst
        SET ${fields.join(', ')}
      WHERE TSK_ID = ?`,
    args
  );

  return result.affectedRows > 0;
}

/**
 * Delete a task row permanently.
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function remove(id) {
  const [result] = await pool.query(
    `DELETE FROM cmms_task_mst
      WHERE TSK_ID = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  findAndCount,
  findById,
  existsByNameAndType,
  insert,
  update,
  delete: remove,
};
