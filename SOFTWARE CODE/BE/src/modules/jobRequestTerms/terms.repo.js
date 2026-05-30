// ============================================================================
// src/modules/jobRequestTerms/terms.repo.js  —  Data-access layer for terms
// ----------------------------------------------------------------------------
// Owns all direct SQL queries to `job_request_terms`. Imports the shared pool
// from src/config/db and exports clean promise-based query functions.
// ============================================================================

'use strict';

const pool = require('../../config/db');

/**
 * Fetch all terms currently active (is_active = 1), sorted by index_no ASC.
 * @param {string} [category]
 * @returns {Promise<Array<{ id: number, index_no: number, text: string, is_active: number, category: string }>>}
 */
async function findActive(category = 'JR') {
  const [rows] = await pool.query(
    `SELECT id, index_no, text, is_active, category
       FROM job_request_terms
      WHERE is_active = 1 AND category = ?
      ORDER BY index_no ASC`,
    [category]
  );
  return rows;
}

/**
 * Fetch all terms (active and inactive) for admin CRUD view, sorted by index_no ASC.
 * @param {string} [category]
 * @returns {Promise<Array<{ id: number, index_no: number, text: string, is_active: number, category: string }>>}
 */
async function findAll(category = 'JR') {
  const [rows] = await pool.query(
    `SELECT id, index_no, text, is_active, category
       FROM job_request_terms
      WHERE category = ?
      ORDER BY index_no ASC`,
    [category]
  );
  return rows;
}

/**
 * Fetch a single term by ID.
 * @param {number} id
 * @returns {Promise<Object | null>}
 */
async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, index_no, text, is_active, category
       FROM job_request_terms
      WHERE id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Insert a new term.
 * @param {Object} payload
 * @param {number} payload.index_no
 * @param {string} payload.text
 * @param {number} payload.is_active
 * @param {string} payload.category
 * @returns {Promise<{ id: number, index_no: number, text: string, is_active: number, category: string }>}
 */
async function insert({ index_no, text, is_active, category }) {
  const [result] = await pool.query(
    `INSERT INTO job_request_terms (index_no, text, is_active, category)
     VALUES (?, ?, ?, ?)`,
    [index_no, text, is_active, category]
  );
  return { id: result.insertId, index_no, text, is_active, category };
}

/**
 * Update an existing term.
 * @param {number} id
 * @param {Object} payload
 * @param {number} payload.index_no
 * @param {string} payload.text
 * @param {number} payload.is_active
 * @param {string} payload.category
 * @returns {Promise<boolean>}  true if rows updated, false otherwise
 */
async function update(id, { index_no, text, is_active, category }) {
  const [result] = await pool.query(
    `UPDATE job_request_terms
        SET index_no = ?,
            text = ?,
            is_active = ?,
            category = ?
      WHERE id = ?`,
    [index_no, text, is_active, category, id]
  );
  return result.affectedRows > 0;
}

/**
 * Delete a term.
 * @param {number} id
 * @returns {Promise<boolean>}  true if rows deleted, false otherwise
 */
async function remove(id) {
  const [result] = await pool.query(
    `DELETE FROM job_request_terms
      WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  findActive,
  findAll,
  findById,
  insert,
  update,
  delete: remove,
};
