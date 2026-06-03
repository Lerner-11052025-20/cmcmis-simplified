// ============================================================================
// src/modules/pdf/pdf.controller.js  —  HTTP handlers for 3 PDF endpoints
// ----------------------------------------------------------------------------
// PHASE 11 — PDF Generation
//
// Two-phase flow (see pdf.service.js for rationale):
//   1. await service.prepare*()  → may throw 404 / 409 → JSON envelope.
//   2. Set PDF response headers, then call the returned render(stream).
//      PDFKit pipes synchronously into res from that point.
//
// Headers set BEFORE the first body byte:
//   Content-Type:        application/pdf
//   Content-Disposition: attachment; filename="<canonical>.pdf"
//   X-Content-Type-Options: nosniff   ← defence-in-depth
//   Cache-Control:       no-store     ← every PDF is fresh from DB
// ============================================================================

'use strict';

const service = require('./pdf.service');

function actorFromReq(req) {
  return {
    employee_id: req.user?.employeeId,
    name:        req.user?.fullName || req.user?.name || req.user?.employeeId || '',
    role:        req.user?.role || '',
    permissions: Array.isArray(req.user?.permissions) ? req.user.permissions : [],
  };
}

function preparePdfHeaders(res, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
}


// ── PDF #1 — JC Certificate ────────────────────────────────────────────
async function jobCardCertificate(req, res, next) {
  try {
    const { filename, render } = await service.prepareJobCardCertificate(
      req.params.id, actorFromReq(req),
    );
    preparePdfHeaders(res, filename);
    render(res);
  } catch (e) { next(e); }
}

// ── PDF #2 — JC Details ────────────────────────────────────────────────
async function jobCardDetails(req, res, next) {
  try {
    const { filename, render } = await service.prepareJobCardDetails(
      req.params.id, actorFromReq(req),
    );
    preparePdfHeaders(res, filename);
    render(res);
  } catch (e) { next(e); }
}

// ── PDF #3 — JR Details ────────────────────────────────────────────────
async function jobCardNablCertificate(req, res, next) {
  try {
    const { filename, render } = await service.prepareTmeCalibrationCertificate(
      req.params.id, actorFromReq(req), 'nabl',
    );
    preparePdfHeaders(res, filename);
    render(res);
  } catch (e) { next(e); }
}

async function jobCardNonNablCertificate(req, res, next) {
  try {
    const { filename, render } = await service.prepareTmeCalibrationCertificate(
      req.params.id, actorFromReq(req), 'non-nabl',
    );
    preparePdfHeaders(res, filename);
    render(res);
  } catch (e) { next(e); }
}

async function jobCardCombinedCertificate(req, res, next) {
  try {
    const { filename, render } = await service.prepareTmeCalibrationCertificate(
      req.params.id, actorFromReq(req), 'certificate',
    );
    preparePdfHeaders(res, filename);
    render(res);
  } catch (e) { next(e); }
}

async function jobRequestDetails(req, res, next) {
  try {
    // Normal Users (no job_request:read-all) → row-level scope to own JRs.
    const perms = req.user?.permissions || [];
    const rowScope = {
      canReadAll: perms.includes('job_request:read-all'),
      ownerEmployeeId: req.user?.employeeId,
    };
    const { filename, render } = await service.prepareJobRequestDetails(
      req.params.id, actorFromReq(req), rowScope,
    );
    preparePdfHeaders(res, filename);
    render(res);
  } catch (e) { next(e); }
}


module.exports = {
  jobCardCertificate,
  jobCardDetails,
  jobCardNablCertificate,
  jobCardNonNablCertificate,
  jobCardCombinedCertificate,
  jobRequestDetails,
};
