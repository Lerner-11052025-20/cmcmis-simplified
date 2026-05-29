// ============================================================================
// src/lib/api/pdf.js  —  PDF download HTTP wrappers
// ----------------------------------------------------------------------------
// PHASE 11 — PDF Generation
//
// Three thin axios wrappers. Each fires a GET with `responseType: 'blob'`,
// extracts the filename from Content-Disposition, and triggers a browser
// download via the canonical anchor-click pattern (same as the Phase-10
// reports / analytics download helpers).
//
// ERROR PROPAGATION
//   Axios throws on non-2xx. The caller catches and surfaces the error
//   via sonner toast. For the JSON-encoded error responses (404/409/403),
//   axios' default response handler tries to parse JSON — but since we
//   requested `blob`, the body is a Blob. The helpers below detect this
//   and re-read the Blob as text so the caller gets a parsed JSON error.
// ============================================================================

import { api } from '../api-client.js';

/** Trigger a browser download given a Blob + filename. */
function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Pull a sensible filename out of Content-Disposition, else fallback. */
function filenameFromHeaders(headers, fallback) {
  const cd = headers?.['content-disposition'] || '';
  const m  = cd.match(/filename="([^"]+)"/);
  return (m && m[1]) || fallback;
}

/**
 * Helper that does the blob fetch + error-blob unwrap.
 * On any non-2xx response, axios throws; if the error's response body
 * is a Blob (because of responseType:'blob'), we read it as JSON so the
 * UI can show the human-readable message and code.
 */
async function fetchPdfBlob(url, fallbackFilename) {
  try {
    const r = await api.get(url, { responseType: 'blob' });
    const filename = filenameFromHeaders(r.headers, fallbackFilename);
    triggerBlobDownload(r.data, filename);
    return { filename, bytes: r.data.size || 0 };
  } catch (err) {
    // Axios put the Blob in err.response.data. Read it as text + JSON-parse.
    const body = err?.response?.data;
    if (body instanceof Blob) {
      try {
        const text = await body.text();
        const j = JSON.parse(text);
        // Re-throw with the parsed envelope attached so the caller can show
        // it cleanly. We keep the original error chain (response.status etc.)
        // by mutating in place.
        err.response.data = j;
      } catch { /* leave as-is */ }
    }
    throw err;
  }
}


// ── PDF #1 — Job Card Certificate ──────────────────────────────────────
/**
 * @param {string} sectionJobNo  e.g. "J00024219"
 * @returns {Promise<{filename:string, bytes:number}>}
 */
export function downloadJobCardCertificate(sectionJobNo) {
  return fetchPdfBlob(
    `/job-cards/${encodeURIComponent(sectionJobNo)}/certificate.pdf`,
    `${sectionJobNo}_certificate.pdf`,
  );
}

// ── PDF #2 — Job Card Full Details ─────────────────────────────────────
export function downloadJobCardDetails(sectionJobNo) {
  return fetchPdfBlob(
    `/job-cards/${encodeURIComponent(sectionJobNo)}/details.pdf`,
    `${sectionJobNo}_details.pdf`,
  );
}

// ── PDF #3 — Job Request Details ───────────────────────────────────────
export function downloadJobRequestDetails(jrNo) {
  return fetchPdfBlob(
    `/job-requests/${encodeURIComponent(jrNo)}/details.pdf`,
    `${jrNo}_details.pdf`,
  );
}


// ── Status helpers ─────────────────────────────────────────────────────

/** Certificate is only available for finished work. */
export const CERT_ELIGIBLE_STATUSES = Object.freeze(['COMPLETED', 'VERIFIED_CLOSED']);
export function isCertificateEligible(status) {
  return CERT_ELIGIBLE_STATUSES.includes(status);
}
