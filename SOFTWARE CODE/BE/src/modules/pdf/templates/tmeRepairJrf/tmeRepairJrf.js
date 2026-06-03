// ============================================================================
// src/modules/pdf/templates/tmeRepairJrf/tmeRepairJrf.js
// ----------------------------------------------------------------------------
// Dedicated Job Request Form PDF for ONLY T&ME Repair job requests.
// Uses the shared TME JRF renderer with repair-specific labels from
// reports PDFs/latex/T&ME_Repair_JRF.tex.
// ============================================================================

'use strict';

const { renderTmeJrf } = require('../tmeCalibrationJrf/tmeCalibrationJrf');

function renderTmeRepairJrf(payload, stream) {
  renderTmeJrf(payload, stream, {
    kind: 'repair',
    title: 'JOB REQUEST OF T&ME FOR REPAIRS',
    instructionTitle: 'Instruction for User:',
    instructions: [
      'Please fill up a separate Job Card for each Equipment.',
    ],
    receiptText: 'The equipment is received back from Maintenance Laboratory',
  });
}

module.exports = {
  renderTmeRepairJrf,
};
