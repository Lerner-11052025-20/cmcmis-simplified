// ============================================================================
// src/modules/projects/projects.repo.js  —  DAL for legacy projects master
// ----------------------------------------------------------------------------
// Encapsulates parameterised SQL queries to `cmms_proj_mst` table.
// ============================================================================

'use strict';

const pool = require('../../config/db');

/**
 * Fetch a paginated list of projects with search filtering.
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.pageSize
 * @param {string} [params.q]
 * @returns {Promise<{ items: Array, total: number }>}
 */
async function findAndCount({ page, pageSize, q }) {
  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;
  const searchLike = q ? `%${q}%` : null;

  let querySql = `
    SELECT PR_ID AS id, PR_NAME AS name, PR_STATE AS is_active,
           PR_CREATED_BY AS created_by, PR_CREATED_ON AS created_on,
           PR_UPDATED_BY AS updated_by, PR_UPDATED_ON AS updated_on
      FROM cmms_proj_mst
  `;
  let countSql = `
    SELECT COUNT(*) AS total
      FROM cmms_proj_mst
  `;

  const whereClauses = [];
  const args = [];

  if (searchLike) {
    whereClauses.push('PR_NAME LIKE ?');
    args.push(searchLike);
  }

  if (whereClauses.length > 0) {
    const whereStr = ` WHERE ${whereClauses.join(' AND ')}`;
    querySql += whereStr;
    countSql += whereStr;
  }

  querySql += ' ORDER BY PR_NAME ASC LIMIT ? OFFSET ?';
  const queryArgs = [...args, limit, offset];

  const [[{ total }]] = await pool.query(countSql, args);
  const [items] = await pool.query(querySql, queryArgs);

  return { items, total };
}

/**
 * Fetch a single project by its primary key ID.
 * @param {number} id
 * @returns {Promise<Object | null>}
 */
async function findById(id) {
  const [rows] = await pool.query(
    `SELECT PR_ID AS id, PR_NAME AS name, PR_STATE AS is_active,
            PR_CREATED_BY AS created_by, PR_CREATED_ON AS created_on,
            PR_UPDATED_BY AS updated_by, PR_UPDATED_ON AS updated_on
       FROM cmms_proj_mst
      WHERE PR_ID = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Check if a project with the same name already exists in the database.
 * @param {string} name
 * @param {number} [excludeId]
 * @returns {Promise<boolean>}
 */
async function existsByName(name, excludeId = null) {
  let sql = 'SELECT 1 FROM cmms_proj_mst WHERE LOWER(PR_NAME) = LOWER(?)';
  const args = [name.trim()];

  if (excludeId !== null) {
    sql += ' AND PR_ID != ?';
    args.push(excludeId);
  }

  const [rows] = await pool.query(sql + ' LIMIT 1', args);
  return rows.length > 0;
}

/**
 * Insert a new project row, dynamically assigning the next sequential ID.
 * @param {Object} payload
 * @param {string} payload.name
 * @param {number} payload.is_active
 * @param {string} payload.employee_id
 * @returns {Promise<Object>}
 */
async function insert({ name, is_active, employee_id }) {
  // Safe transactional next key resolution
  const [[{ nextId }]] = await pool.query('SELECT COALESCE(MAX(PR_ID), 0) + 1 AS nextId FROM cmms_proj_mst');

  await pool.query(
    `INSERT INTO cmms_proj_mst (PR_ID, PR_NAME, PR_STATE, PR_CREATED_BY, PR_CREATED_ON, PR_UPDATED_BY, PR_UPDATED_ON)
     VALUES (?, ?, ?, ?, NOW(6), ?, NOW(6))`,
    [nextId, name.trim(), is_active, employee_id, employee_id]
  );

  return { id: nextId, name: name.trim(), is_active };
}

/**
 * Update an existing project row.
 * @param {number} id
 * @param {Object} payload
 * @param {string} [payload.name]
 * @param {number} [payload.is_active]
 * @param {string} payload.employee_id
 * @returns {Promise<boolean>}
 */
async function update(id, { name, is_active, employee_id }) {
  const fields = [];
  const args = [];

  if (name !== undefined) {
    fields.push('PR_NAME = ?');
    args.push(name.trim());
  }

  if (is_active !== undefined) {
    fields.push('PR_STATE = ?');
    args.push(is_active);
  }

  if (fields.length === 0) return false;

  fields.push('PR_UPDATED_BY = ?');
  args.push(employee_id);

  fields.push('PR_UPDATED_ON = NOW(6)');

  args.push(id);

  const [result] = await pool.query(
    `UPDATE cmms_proj_mst
        SET ${fields.join(', ')}
      WHERE PR_ID = ?`,
    args
  );

  return result.affectedRows > 0;
}

/**
 * Delete a project row permanently.
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function remove(id) {
  const [result] = await pool.query(
    `DELETE FROM cmms_proj_mst
      WHERE PR_ID = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  findAndCount,
  findById,
  existsByName,
  insert,
  update,
  delete: remove,
};
