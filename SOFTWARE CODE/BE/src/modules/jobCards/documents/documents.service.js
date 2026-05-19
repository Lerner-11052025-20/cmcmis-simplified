// ============================================================================
// src/modules/jobCards/documents/documents.service.js
// ----------------------------------------------------------------------------
// Business logic for jc_documents. Owns the disk-side cleanup on soft-
// delete failure scenarios and emits the right audit rows.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const repo = require('./documents.repo');
const jcRepo = require('../jobCards.repo');
const jcService = require('../jobCards.service');
const { errors } = require('../../../middleware/errorHandler');
const {
  absolutePathFor, relativePathFor, MAX_FILES_PER_JC,
} = require('../../../utils/fileStorage');

// Doc-type whitelist for the upload form. Stored upper-case.
const VALID_DOC_TYPES = new Set([
  'CALIBRATION_CERT','INSPECTION_REPORT','PHOTO_BEFORE','PHOTO_AFTER',
  'VENDOR_INVOICE','REQUIRED','OTHER',
]);

// ── List active documents for a JC ──────────────────────────────────
async function listDocuments({ sectionJobNo }) {
  const rows = await repo.listForJc(sectionJobNo, { includeDeleted: false });
  return rows.map((r) => ({
    id:             r.id,
    filename:       r.filename,
    mimetype:       r.mimetype,
    size_bytes:     r.size_bytes,
    doc_type:       r.doc_type,
    uploaded_by_employee_id: r.uploaded_by_employee_id,
    uploaded_at:    r.uploaded_at ? dayjs(r.uploaded_at).toISOString() : null,
  }));
}

// ── Upload: called after multer has placed the file on disk ─────────
/**
 * @param {Object} args
 * @param {string} args.sectionJobNo
 * @param {Object} args.actor
 * @param {Object} args.file              The multer-decorated file object.
 * @param {string} args.docType
 * @returns {Promise<Object>}             The inserted row shape.
 */
async function uploadDocument({ sectionJobNo, actor, file, docType, ipAddress, userAgent }) {
  // Sanity — should never happen because multer rejects first, but
  // a guard here means a misconfigured route can't slip past.
  if (!file) throw errors.badRequest('No file in upload', { field: 'file' });

  const normalisedDocType = String(docType || 'OTHER').toUpperCase();
  if (!VALID_DOC_TYPES.has(normalisedDocType)) {
    // The file is already on disk; clean up before throwing.
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    throw errors.badRequest(`Invalid doc_type: ${docType}`, { field: 'doc_type' });
  }

  // Look up the JC for ownership + legacy gate.
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) {
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    throw errors.notFound(`Job card ${sectionJobNo} not found`);
  }
  if (jcService.isLegacyRow(jc)) {
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    throw errors.conflict('Legacy job cards are read-only.');
  }
  const own = jcService.isOwnEngineer(
    { assigned_engineer_employee_id: jc.assigned_engineer_employee_id }, actor,
  );
  const licSa = jcService.LIC_SA_ROLES.has(actor.role);
  if (!own && !licSa) {
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    throw errors.forbidden('Only the assigned engineer or LIC/SA can upload documents');
  }

  // Cap check (Q-7 hard 50, soft warn at 40).
  const activeCount = await repo.countActiveDocs(sectionJobNo);
  if (activeCount >= MAX_FILES_PER_JC) {
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    throw errors.badRequest(`This job card has reached the ${MAX_FILES_PER_JC}-document limit`, { field: 'file' });
  }

  // Insert metadata row pointing at the on-disk file.
  // storage_path is RELATIVE to the storage root — see fileStorage.js
  const relPath = relativePathFor(sectionJobNo, file.filename);
  const newId = await repo.insertDoc({
    sectionJobNo,
    filename:        file.originalname,
    storageFilename: file.filename,
    mimetype:        file.mimetype,
    sizeBytes:       file.size,
    storagePath:     relPath,
    docType:         normalisedDocType,
    uploadedByEmployeeId: actor.employeeId,
  });

  // Audit row.
  await jcRepo.writePhase9AuditLog(null /* one-shot, no txn needed */, {
    actorEmployeeId: actor.employeeId,
    actorRoleCode:   actor.role,
    action:          'JC_DOC_UPLOAD',
    sectionJobNo,
    ipAddress, userAgent,
    details: {
      doc_id:    newId,
      doc_type:  normalisedDocType,
      filename:  file.originalname,
      size_kb:   Math.round(file.size / 1024),
    },
  }).catch(() => { /* audit failure should not crash the upload */ });

  return {
    id:        newId,
    filename:  file.originalname,
    mimetype:  file.mimetype,
    size_bytes: file.size,
    doc_type:  normalisedDocType,
    uploaded_by_employee_id: actor.employeeId,
    uploaded_at: new Date().toISOString(),
    active_count: activeCount + 1,
    near_limit:   (activeCount + 1) >= 40,    // Q-7 soft warning at 40
  };
}

// ── Download a document by id (returns abs path + filename) ─────────
async function getDocumentForDownload({ sectionJobNo, docRowId }) {
  const doc = await repo.findById(docRowId);
  if (!doc || doc.jc_section_no !== sectionJobNo || doc.deleted_at != null) {
    throw errors.notFound('Document not found');
  }
  const abs = absolutePathFor(sectionJobNo, doc.storage_filename);
  return {
    abs,
    filename: doc.filename,
    mimetype: doc.mimetype,
    size:     doc.size_bytes,
  };
}

// ── Soft-delete a document (only LIC/SA OR original uploader) ───────
async function softDeleteDocument({ sectionJobNo, docRowId, actor, ipAddress, userAgent }) {
  const doc = await repo.findById(docRowId);
  if (!doc || doc.jc_section_no !== sectionJobNo || doc.deleted_at != null) {
    throw errors.notFound('Document not found');
  }
  const isUploader = doc.uploaded_by_employee_id === actor.employeeId;
  const licSa = jcService.LIC_SA_ROLES.has(actor.role);
  if (!isUploader && !licSa) {
    throw errors.forbidden('Only the uploader or LIC/SA can delete this document');
  }
  // Legacy-JC check.
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (jc && jcService.isLegacyRow(jc)) {
    throw errors.conflict('Legacy job cards are read-only.');
  }

  await repo.softDelete(docRowId, actor.employeeId);

  await jcRepo.writePhase9AuditLog(null, {
    actorEmployeeId: actor.employeeId,
    actorRoleCode:   actor.role,
    action:          'JC_DOC_DELETE',
    sectionJobNo,
    ipAddress, userAgent,
    details: { doc_id: docRowId, filename: doc.filename },
  }).catch(() => { /* audit failure should not crash the delete */ });

  return { id: docRowId, deleted: true };
}

module.exports = {
  listDocuments,
  uploadDocument,
  getDocumentForDownload,
  softDeleteDocument,
  VALID_DOC_TYPES,
};
