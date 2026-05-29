// ============================================================================
// src/modules/jobCards/documents/documents.routes.js
// ----------------------------------------------------------------------------
// Mounted at /job-cards/:id/documents (via parent jobCards.routes.js).
// Multer disk-storage runs BEFORE our handler — file lands on disk, then
// the handler writes the metadata row.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../../middleware/authenticate');
const authorize = require('../../../middleware/authorize');
const { upload } = require('../../../utils/fileStorage');
const ctrl = require('./documents.controller');

const router = express.Router({ mergeParams: true });

// GET /:id/documents — list (anyone with read-detail).
router.get('/',
  authenticate,
  authorize('job_card:read-detail'),
  ctrl.listDocuments,
);

// POST /:id/documents — multipart/form-data upload, field name "file".
// Multer middleware places the file on disk and decorates req.file BEFORE
// our handler runs. If multer fails (size / mimetype), our error
// middleware translates the multer error into a friendly 400.
router.post('/',
  authenticate,
  authorize('job_card:update-tasks'),
  upload.single('file'),
  ctrl.multerErrorHandler,           // catches multer-specific errors
  ctrl.postUploadDocument,
);

// GET /:id/documents/:docId — stream download.
router.get('/:docId',
  authenticate,
  authorize('job_card:read-detail'),
  ctrl.getDownloadDocument,
);

// DELETE /:id/documents/:docId — soft-delete (uploader OR LIC/SA).
router.delete('/:docId',
  authenticate,
  authorize('job_card:update-tasks'),
  ctrl.deleteDocument,
);

module.exports = router;
