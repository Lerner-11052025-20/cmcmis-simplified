// ============================================================================
// src/modules/pdf/pdf.service.js  —  PDF assembly + eligibility checks
// ----------------------------------------------------------------------------
// PHASE 11 — PDF Generation
//
// Two-phase pattern (avoids the "headers already sent" race):
//
//   1. prepare*() ─ load the payload, run RBAC row-scope + eligibility
//                    checks. May throw notFound / conflict. NO bytes are
//                    written to the response.
//                    Returns { payload, filename, render(stream, meta) }.
//   2. The controller, having received a clean prepare result, sets the
//      PDF response headers and then calls render(res, meta) — that's the
//      single moment bytes start flowing. By construction no error past
//      this point can leak as JSON.
//
// CONSTRAINTS
//   • Read-only. Zero DB writes during PDF generation.
//   • Certificate (#1) eligibility: status ∈ { COMPLETED, VERIFIED_CLOSED }
//     — anything else throws 409 conflict.
//   • Row-level scope for JR #3: Normal Users see only their own JRs;
//     foreign IDs collapse to 404 (do not leak existence).
// ============================================================================

'use strict';

const repo = require('./pdf.repo');
const { errors } = require('../../middleware/errorHandler');

const { renderJobCardCertificate } = require('./templates/jobCardCertificate');
const { renderJobCardDetails }     = require('./templates/jobCardDetails');
const { renderJobRequestDetails }  = require('./templates/jobRequestDetails');
const { renderTmeCalibrationJrf }   = require('./templates/tmeCalibrationJrf/tmeCalibrationJrf');
const { renderTmeRepairJrf }        = require('./templates/tmeRepairJrf/tmeRepairJrf');
const { renderFpeCalibrationJrf }   = require('./templates/fpeCalibrationJrf/fpeCalibrationJrf');
const { renderFpeRepairJrf }        = require('./templates/fpeRepairJrf/fpeRepairJrf');
const { renderTmeCalibrationJobClosingForm } = require('./templates/tmeCalibrationJobClosingForm/tmeCalibrationJobClosingForm');
const { renderTmeRepairJobClosingForm } = require('./templates/tmeRepairJobClosingForm/tmeRepairJobClosingForm');
const { renderFpeCalibrationJobClosingForm } = require('./templates/fpeCalibrationJobClosingForm/fpeCalibrationJobClosingForm');

// Certificate is reserved for "this work is done" states only.
const CERT_ELIGIBLE = new Set(['COMPLETED', 'VERIFIED_CLOSED']);

// ── Code helpers ───────────────────────────────────────────────────────

function jcCode(payload) {
  const yr  = payload.jc_recd_date ? new Date(payload.jc_recd_date).getUTCFullYear() : '0000';
  const num = String(payload.jc_no || '').padStart(4, '0');
  return `JC-${yr}-${num}`;
}

function jrCode(payload) {
  const yr  = payload.submitted_at_legacy ? new Date(payload.submitted_at_legacy).getUTCFullYear()
            : payload.created_at         ? new Date(payload.created_at).getUTCFullYear()
            : '0000';
  return `JR-${yr}-${String(payload.jr_no || '').padStart(4, '0')}`;
}


// ── PDF #1 — JC Certificate ────────────────────────────────────────────

/**
 * Prepare a Job Card Certificate render. Throws notFound or conflict.
 * On success returns a closure that streams PDF bytes into the given Writable.
 *
 * @param {string} sectionJobNo
 * @param {Object} actor   { employee_id, name, role, permissions }
 * @returns {Promise<{ filename: string, render: (stream: Writable) => void }>}
 */
async function prepareJobCardCertificate(sectionJobNo, actor) {
  const payload = await repo.loadJobCardFull(sectionJobNo);
  if (!payload) throw errors.notFound(`Job Card not found: ${sectionJobNo}`);

  if (!CERT_ELIGIBLE.has(payload.status)) {
    throw errors.conflict(
      `Certificate is available only for COMPLETED or VERIFIED_CLOSED job cards (current: ${payload.status})`,
      { current_status: payload.status, eligible: [...CERT_ELIGIBLE] },
    );
  }

  const isTmeCalibration = (payload.job_category || payload.jr_job_category) === 'TME'
    && (payload.work_type || payload.jr_job_type) === 'CALIBRATION';
  const isTmeRepair = (payload.job_category || payload.jr_job_category) === 'TME'
    && (payload.work_type || payload.jr_job_type) === 'REPAIR';
  const category = String(payload.job_category || payload.jr_job_category || '').replace('&', '');
  const type = payload.work_type || payload.jr_job_type;
  const isFpeCalibration = category === 'FPE' && type === 'CALIBRATION';
  const filename = isTmeCalibration
    ? `${jcCode(payload)}_TME_Calibration_JobClosingForm.pdf`
    : isTmeRepair
      ? `${jcCode(payload)}_TME_Repair_JobClosingForm.pdf`
      : isFpeCalibration
        ? `${jcCode(payload)}_FPE_Calibration_JobClosingForm.pdf`
        : `${jcCode(payload)}_certificate.pdf`;
  return {
    filename,
    render: (stream) => {
      if (isTmeCalibration) {
        renderTmeCalibrationJobClosingForm(payload, stream, { generated_by: actor });
        return;
      }
      if (isTmeRepair) {
        renderTmeRepairJobClosingForm(payload, stream, { generated_by: actor });
        return;
      }
      if (isFpeCalibration) {
        renderFpeCalibrationJobClosingForm(payload, stream, { generated_by: actor });
        return;
      }
      renderJobCardCertificate(payload, stream, { generated_by: actor });
    },
  };
}


// ── PDF #2 — JC Details ────────────────────────────────────────────────

async function prepareJobCardDetails(sectionJobNo, actor) {
  const payload = await repo.loadJobCardFull(sectionJobNo);
  if (!payload) throw errors.notFound(`Job Card not found: ${sectionJobNo}`);

  const filename = `${jcCode(payload)}_details.pdf`;
  return {
    filename,
    render: (stream) => renderJobCardDetails(payload, stream, { generated_by: actor }),
  };
}


// ── PDF #3 — JR Details ────────────────────────────────────────────────

/**
 * @param {number} jrNo
 * @param {Object} actor
 * @param {{ canReadAll: boolean, ownerEmployeeId: string }} rowScope
 */
async function prepareJobRequestDetails(jrNo, actor, rowScope) {
  const payload = await repo.loadJobRequestFull(jrNo);
  if (!payload) throw errors.notFound(`Job Request not found: ${jrNo}`);

  // Row-level scope: collapse foreign-id access to 404 (don't leak existence).
  if (rowScope && !rowScope.canReadAll
      && payload.submitted_by_employee_id !== rowScope.ownerEmployeeId) {
    throw errors.notFound(`Job Request not found: ${jrNo}`);
  }

  const isTmeCalibration = payload.job_category === 'TME' && payload.job_type === 'CALIBRATION';
  const isTmeRepair = payload.job_category === 'TME' && payload.job_type === 'REPAIR';
  const isFpeCalibration = payload.job_category === 'FPE' && payload.job_type === 'CALIBRATION';
  const isFpeRepair = payload.job_category === 'FPE' && payload.job_type === 'REPAIR';
  const filename = isTmeCalibration
    ? `${jrCode(payload)}_TME_Calibration_JRF.pdf`
    : isTmeRepair
      ? `${jrCode(payload)}_TME_Repair_JRF.pdf`
      : isFpeCalibration
        ? `${jrCode(payload)}_FPE_Calibration_JRF.pdf`
        : isFpeRepair
          ? `${jrCode(payload)}_FPE_Repair_JRF.pdf`
          : `${jrCode(payload)}_details.pdf`;
  return {
    filename,
    render: (stream) => {
      if (isTmeCalibration) {
        renderTmeCalibrationJrf(payload, stream, { generated_by: actor });
        return;
      }
      if (isTmeRepair) {
        renderTmeRepairJrf(payload, stream, { generated_by: actor });
        return;
      }
      if (isFpeCalibration) {
        renderFpeCalibrationJrf(payload, stream, { generated_by: actor });
        return;
      }
      if (isFpeRepair) {
        renderFpeRepairJrf(payload, stream, { generated_by: actor });
        return;
      }
      renderJobRequestDetails(payload, stream, { generated_by: actor });
    },
  };
}


module.exports = {
  prepareJobCardCertificate,
  prepareJobCardDetails,
  prepareJobRequestDetails,
  // exported for tests:
  CERT_ELIGIBLE,
};
