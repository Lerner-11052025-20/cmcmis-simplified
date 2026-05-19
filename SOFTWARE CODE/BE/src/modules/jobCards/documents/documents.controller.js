// ============================================================================
// src/modules/jobCards/documents/documents.controller.js
// ----------------------------------------------------------------------------
// HTTP handlers for the Documents sub-feature. Upload uses multer
// middleware that placed the file on disk BEFORE this handler runs.
// ============================================================================

'use strict';

const fs = require('fs');
const service = require('./documents.service');
const { translateMulterError } = require('../../../utils/fileStorage');

async function listDocuments(req, res, next) {
  try {
    const items = await service.listDocuments({ sectionJobNo: req.params.id });
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

/**
 * POST /job-cards/:id/documents
 * Multer middleware ran BEFORE this handler. If multer rejected the
 * upload (file too big / mimetype not allowed), `req.file` is undefined
 * and the multer error has been forwarded via next() through our wrapper.
 */
async function postUploadDocument(req, res, next) {
  try {
    const data = await service.uploadDocument({
      sectionJobNo: req.params.id,
      actor: {
        employeeId:  req.user.employeeId,
        role:        req.user.role,
        permissions: req.user.permissions,
      },
      file:    req.file,
      docType: req.body?.doc_type || 'OTHER',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.status(201).json({ data });
  } catch (e) { return next(e); }
}

async function getDownloadDocument(req, res, next) {
  try {
    const docRowId = parseInt(req.params.docId, 10);
    if (!Number.isFinite(docRowId) || docRowId <= 0) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid document id', details: null } });
    }
    const { abs, filename, mimetype } = await service.getDocumentForDownload({
      sectionJobNo: req.params.id,
      docRowId,
    });
    // Verify the file actually exists on disk; if not (e.g. someone
    // manually removed it), respond 404 cleanly instead of letting
    // res.sendFile send a server error.
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File missing from storage', details: null } });
    }
    res.setHeader('Content-Type', mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    return res.sendFile(abs);
  } catch (e) { return next(e); }
}

async function deleteDocument(req, res, next) {
  try {
    const docRowId = parseInt(req.params.docId, 10);
    if (!Number.isFinite(docRowId) || docRowId <= 0) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid document id', details: null } });
    }
    const data = await service.softDeleteDocument({
      sectionJobNo: req.params.id,
      docRowId,
      actor: {
        employeeId:  req.user.employeeId,
        role:        req.user.role,
        permissions: req.user.permissions,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.json({ data });
  } catch (e) { return next(e); }
}

/**
 * Multer error translator middleware — bridges multer's bespoke error
 * codes (LIMIT_FILE_SIZE, etc.) onto our AppError envelope.
 */
function multerErrorHandler(err, _req, _res, next) {
  if (!err) return next();
  return next(translateMulterError(err));
}

module.exports = {
  listDocuments,
  postUploadDocument,
  getDownloadDocument,
  deleteDocument,
  multerErrorHandler,
};
