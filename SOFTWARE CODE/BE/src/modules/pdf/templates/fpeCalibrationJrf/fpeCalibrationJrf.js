// ============================================================================
// src/modules/pdf/templates/fpeCalibrationJrf/fpeCalibrationJrf.js
// ----------------------------------------------------------------------------
// Dedicated Job Request Form PDF for ONLY F&PE Calibration job requests.
// Uses the shared guarded JRF renderer with F&PE calibration-specific labels
// from reports PDFs/latex/F&PE_Calibration_JRF.tex.
// ============================================================================

'use strict';

const { renderTmeJrf } = require('../tmeCalibrationJrf/tmeCalibrationJrf');

function renderFpeCalibrationJrf(payload, stream) {
  renderTmeJrf(payload, stream, {
    kind: 'calibration',
    title: 'JOB REQUEST OF F&PE FOR CALIBRATION',
    equipmentLayout: 'fpe',
    equipmentSectionTitle: 'EQUIPMENT DETAILS',
    showAccessories: true,
    systemInformation: true,
    systemStatusValue: payload.remarks || payload.linked_job_status_display || '',
    instructionTitle: 'Instructions for User:',
    instructions: [
      "1. At the time of submission of equipment for calibration and receiving equipment after calibration, the user's representative shall demonstrate / ensure the equipment is in working condition.",
      '2. Equipment must accompany the operation and service manual(s) and accessory kit (if any).',
      '3. Please fill up a separate Job Card for each equipment.',
    ],
    receiptText: 'The Equipment is Received from Calibration Lab',
  });
}

module.exports = {
  renderFpeCalibrationJrf,
};
