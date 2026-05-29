// ============================================================================
// src/utils/fileStorage.js  —  Multer disk-storage configuration
// ----------------------------------------------------------------------------
// PURPOSE
//   Central wiring for multer disk storage used by the Documents sub-
//   module of Phase 9. Files land under
//     <project-root>/storage/job-cards/<section_job_no>/<storage_filename>
//
//   Each storage_filename is a UUIDv4 + extension to avoid collisions
//   when two engineers upload "report.pdf" for the same JC.
//
// SECURITY contract (decision D-9.8)
//   • Max file size: 10 MB per upload (multer limits)
//   • Max files per request: 1 (we expose one POST per file)
//   • Mimetype allow-list (PDF, JPEG, PNG, DOCX, XLSX) enforced in
//     fileFilter; multer rejects everything else BEFORE the file
//     touches the disk.
//   • Storage filename is server-generated (UUID) — never derived from
//     the client-provided filename. Defeats path-traversal attacks like
//     "../../../etc/passwd".
//   • The destination directory is created on demand with mode 0o755;
//     parent paths above the storage root are never traversed.
//
// S3 / cloud migration path
//   Slice 2 swaps this single file for an S3-backed multer-s3 adapter.
//   The documents.service.js layer above never touches disk paths
//   directly — only the `storage_path` field on jc_documents row.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const { errors } = require('../middleware/errorHandler');

// ── Storage root ─────────────────────────────────────────────────────
// Absolute path. `process.cwd()` is the BE folder during normal `npm start`,
// but we resolve via __dirname for robustness across `node --watch` and
// programmatic launches.
const STORAGE_ROOT = path.resolve(__dirname, '..', '..', 'storage');
const JC_ROOT = path.join(STORAGE_ROOT, 'job-cards');

// Create storage root once at module load. Idempotent — mkdir with
// recursive:true is a no-op if the dir exists.
try {
  fs.mkdirSync(JC_ROOT, { recursive: true, mode: 0o755 });
} catch (e) {
  // Surface boot-time failure clearly — if we can't write to disk, the
  // Documents sub-module will silently fail every upload otherwise.
  // eslint-disable-next-line no-console
  console.error('[fileStorage] FATAL: cannot create storage root', JC_ROOT, e.message);
  throw e;
}

// ── Constants exposed for upstream gates ────────────────────────────
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;     // 10 MB
const MAX_FILES_PER_JC    = 50;                   // soft-warning at 40, hard cap at 50

// Allow-list — mimetype must match exactly. We don't trust file
// extension alone (clients can rename "evil.exe" → "evil.pdf").
const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',        // .xlsx
]);

// Extension allow-list as a sanity belt-and-braces check.
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx']);

// ── Multer storage engine ───────────────────────────────────────────
/**
 * Routes a per-request storage decision:
 *   - destination = storage/job-cards/<jc_section_no>/
 *   - filename    = <uuidv4><ext>
 *
 * `req.params.id` is the section_job_no from the URL. The route guard
 * upstream confirms the caller can write to this JC; we trust it here.
 */
const storage = multer.diskStorage({
  destination(req, _file, cb) {
    // Sanitise jc_section_no defensively — even though the route param
    // validator has already vetted it, we belt-and-braces against any
    // future route that forgets that. Pattern: J########.
    const id = String(req.params.id || '');
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(id)) {
      return cb(new Error('Invalid job card id for storage path'));
    }
    const dir = path.join(JC_ROOT, id);
    fs.mkdir(dir, { recursive: true, mode: 0o755 }, (err) => {
      if (err) return cb(err);
      return cb(null, dir);
    });
  },
  filename(_req, file, cb) {
    // Keep the original extension (multer parses it from originalname),
    // discard everything else. Filename = uuidv4 + ext.
    const ext = path.extname(file.originalname).toLowerCase();
    return cb(null, `${uuidv4()}${ext}`);
  },
});

// ── Multer file filter ──────────────────────────────────────────────
/**
 * Reject anything not on the mimetype OR extension allow-list. Multer
 * calls this BEFORE writing the file, so a rejection means zero bytes
 * hit the disk.
 */
function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_MIMETYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    // Use a sentinel Error message that the upload controller maps to a
    // 400 with code=DOC_TYPE_NOT_ALLOWED.
    return cb(new Error('DOC_TYPE_NOT_ALLOWED'));
  }
  return cb(null, true);
}

// ── Composed multer instance ────────────────────────────────────────
// `single('file')` — one file per request under the form field "file".
// The route mounts this as middleware: `upload.single('file')`.
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

// ── Path helpers ────────────────────────────────────────────────────

/**
 * Compute the absolute on-disk path for a given JC + storage_filename.
 * Used by the download endpoint to stream the file safely.
 *
 * @param {string} sectionJobNo
 * @param {string} storageFilename
 * @returns {string}
 */
function absolutePathFor(sectionJobNo, storageFilename) {
  // Defensive double-check: the storage_filename must look UUID-ish so a
  // malicious DB row can't escape the storage root via "../../etc/passwd".
  if (!/^[a-f0-9-]+(\.[a-z0-9]+)?$/i.test(storageFilename)) {
    throw new Error('Unsafe storage filename: ' + storageFilename);
  }
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(sectionJobNo)) {
    throw new Error('Unsafe section_job_no: ' + sectionJobNo);
  }
  const abs = path.join(JC_ROOT, sectionJobNo, storageFilename);
  // Final containment check — the resolved abs path MUST live under
  // JC_ROOT. If somehow path.join + the inputs produced an escape (e.g.
  // a symlinked dir), reject.
  if (!abs.startsWith(JC_ROOT + path.sep) && abs !== JC_ROOT) {
    throw new Error('Path escapes storage root');
  }
  return abs;
}

/**
 * Compute the relative storage_path stored in jc_documents.storage_path.
 * Stored without the absolute prefix so a future migration to a different
 * storage root is a one-line change.
 */
function relativePathFor(sectionJobNo, storageFilename) {
  return path.posix.join('job-cards', sectionJobNo, storageFilename);
}

/**
 * Translate multer errors into our standard AppError envelope.
 * Caller: documents.controller catches multer's err in `next` and calls
 * this to render the right 4xx.
 *
 * @param {Error} err
 * @returns {Error}
 */
function translateMulterError(err) {
  if (!err) return err;
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return errors.badRequest(
        `File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit`,
        { field: 'file' },
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return errors.badRequest('Only one file per upload', { field: 'file' });
    }
    return errors.badRequest('Upload failed: ' + err.message, { field: 'file' });
  }
  if (err.message === 'DOC_TYPE_NOT_ALLOWED') {
    const e = errors.badRequest(
      'File type not allowed. Accepted: PDF, JPEG, PNG, DOCX, XLSX.',
      { field: 'file' },
    );
    e.code = 'DOC_TYPE_NOT_ALLOWED';
    return e;
  }
  return err;
}

module.exports = {
  upload,                       // multer middleware factory
  absolutePathFor,
  relativePathFor,
  translateMulterError,
  STORAGE_ROOT,
  JC_ROOT,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_JC,
  ALLOWED_MIMETYPES,
  ALLOWED_EXTENSIONS,
};
