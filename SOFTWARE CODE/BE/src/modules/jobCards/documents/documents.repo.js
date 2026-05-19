// ============================================================================
// src/modules/jobCards/documents/documents.repo.js
// ----------------------------------------------------------------------------
// DAL for jc_documents. ONLY SQL here.
// ============================================================================

'use strict';

const pool = require('../../../config/db');

async function listForJc(sectionJobNo, { includeDeleted = false } = {}) {
  const where = ['jc_section_no = ?'];
  const args  = [sectionJobNo];
  if (!includeDeleted) where.push('deleted_at IS NULL');
  const [rows] = await pool.query(
    `SELECT id, jc_section_no, filename, storage_filename, mimetype,
            size_bytes, storage_path, doc_type,
            uploaded_by_employee_id, uploaded_at,
            deleted_at, deleted_by_employee_id
       FROM jc_documents
      WHERE ${where.join(' AND ')}
      ORDER BY uploaded_at DESC, id DESC`,
    args,
  );
  return rows;
}

async function findById(docRowId) {
  const [rows] = await pool.query(
    `SELECT id, jc_section_no, filename, storage_filename, mimetype,
            size_bytes, storage_path, doc_type,
            uploaded_by_employee_id, uploaded_at,
            deleted_at, deleted_by_employee_id
       FROM jc_documents
      WHERE id = ?
      LIMIT 1`,
    [docRowId],
  );
  return rows[0] || null;
}

async function insertDoc({
  sectionJobNo, filename, storageFilename, mimetype, sizeBytes,
  storagePath, docType, uploadedByEmployeeId,
}) {
  const [r] = await pool.query(
    `INSERT INTO jc_documents
       (jc_section_no, filename, storage_filename, mimetype, size_bytes,
        storage_path, doc_type, uploaded_by_employee_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [sectionJobNo, filename, storageFilename, mimetype, sizeBytes,
     storagePath, docType, uploadedByEmployeeId],
  );
  return r.insertId;
}

async function softDelete(docRowId, byEmployeeId) {
  await pool.query(
    `UPDATE jc_documents
        SET deleted_at = NOW(6),
            deleted_by_employee_id = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [byEmployeeId, docRowId],
  );
}

// Active doc count for a JC — used by the 50-cap check and the "approaching
// limit" soft warning at 40 (Q-7).
async function countActiveDocs(sectionJobNo) {
  const [[r]] = await pool.query(
    `SELECT COUNT(*) AS n
       FROM jc_documents
      WHERE jc_section_no = ? AND deleted_at IS NULL`,
    [sectionJobNo],
  );
  return Number(r.n || 0);
}

module.exports = { listForJc, findById, insertDoc, softDelete, countActiveDocs };
